"""Sync MCP client for the FalkorDB tool server. Transport only.

Same function names and signatures as the tools the agent used to call
directly. Server-side ValueError is re-raised so callers see identical
semantics. The server subprocess and session live as long as the process.
"""

import asyncio
import json
import os
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXPECTED = [
    "trace_why", "blast_radius", "who_knows", "list_services",
    "recall_messages", "recall_memory", "memory_history", "curate_memory",
    "supersede_memory", "forget_with_receipt", "propose_action",
    "approve_action", "reject_action", "audit_trail", "get_action",
    "execute_action", "recall_procedure",
]


def _raise_if_error(payload):
    if isinstance(payload, dict) and payload.get("__type__") == "ValueError":
        raise ValueError(payload.get("__error__", "tool failed"))
    return payload


class _Mcp:
    def __init__(self):
        from mcp.client.stdio import StdioServerParameters, stdio_client
        from mcp.client.session import ClientSession
        self._stdio_client = stdio_client
        self._ClientSession = ClientSession
        self._loop = asyncio.new_event_loop()
        self._ready = threading.Event()
        self._failed = []
        env = dict(os.environ)
        env["PYTHONPATH"] = ROOT + os.pathsep + env.get("PYTHONPATH", "")
        self._params = StdioServerParameters(
            command=sys.executable,
            args=["-m", "app.mcp_server"],
            cwd=ROOT,
            env=env,
        )
        self._holder = threading.Thread(target=self._serve, daemon=True)
        self._holder.start()
        if not self._ready.wait(timeout=60):
            raise RuntimeError("MCP tool server did not start in time")
        if self._failed:
            raise RuntimeError(f"MCP tool server failed: {self._failed[0]}")

    def _serve(self):
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(self._lifespan())
        except Exception as exc:  # noqa: BLE001 - reported to waiter
            self._failed.append(str(exc))
            self._ready.set()

    async def _lifespan(self):
        try:
            async with self._stdio_client(self._params) as (read, write):
                async with self._ClientSession(read, write) as session:
                    await session.initialize()
                    names = {t.name for t in (await session.list_tools()).tools}
                    missing = [n for n in EXPECTED if n not in names]
                    if missing:
                        raise RuntimeError(f"MCP tools missing: {missing}")
                    self._session = session
                    self._guard = asyncio.Lock()
                    self._ready.set()
                    await asyncio.Future()  # hold the session open
        finally:
            self._ready.set()

    def call(self, name, args):
        fut = asyncio.run_coroutine_threadsafe(self._call(name, args), self._loop)
        return fut.result(timeout=120)

    async def _call(self, name, args):
        async with self._guard:
            result = await self._session.call_tool(name, args or {})
        payload = getattr(result, "structuredContent", None)
        if payload is None:
            texts = [c.text for c in result.content
                     if getattr(c, "text", None)]
            payload = json.loads(texts[0]) if texts else {}
        return _raise_if_error(payload)


_instance = None
_instance_lock = threading.Lock()


def _client():
    global _instance
    if _instance is None:
        with _instance_lock:
            if _instance is None:
                _instance = _Mcp()
    return _instance


def trace_why(incident_id="INC-231"):
    return _client().call("trace_why", {"incident_id": incident_id})


def blast_radius(service="Ledger"):
    return _client().call("blast_radius", {"service": service})


def who_knows(topic="payout-retry"):
    return _client().call("who_knows", {"topic": topic})


def list_services():
    return _client().call("list_services", {})


def recall_messages(topic="payout-retry", limit=15):
    return _client().call("recall_messages", {"topic": topic, "limit": limit})


def recall_memory(user_id):
    return _client().call("recall_memory", {"user_id": user_id})


def memory_history(user_id):
    return _client().call("memory_history", {"user_id": user_id})


def curate_memory(user_id, text, salience=0.8):
    return _client().call("curate_memory",
                          {"user_id": user_id, "text": text,
                           "salience": salience})


def supersede_memory(user_id, fact_id, new_text):
    return _client().call("supersede_memory",
                          {"user_id": user_id, "fact_id": fact_id,
                           "new_text": new_text})


def forget_with_receipt(user_id, fact_id):
    return _client().call("forget_with_receipt",
                          {"user_id": user_id, "fact_id": fact_id})


def propose_action(goal, plan, proposer="anshu"):
    return _client().call("propose_action",
                          {"goal": goal, "plan": plan,
                           "proposer": proposer})


def approve_action(action_id, approver):
    return _client().call("approve_action",
                          {"action_id": action_id, "approver": approver})


def reject_action(action_id, approver, reason=""):
    return _client().call("reject_action",
                          {"action_id": action_id, "approver": approver,
                           "reason": reason})


def audit_trail(limit=20):
    return _client().call("audit_trail", {"limit": limit})


def get_action(action_id):
    return _client().call("get_action", {"action_id": action_id})


def execute_action(action_id):
    return _client().call("execute_action", {"action_id": action_id})


def recall_procedure(topic=None, limit=5):
    return _client().call("recall_procedure",
                          {"topic": topic or "", "limit": limit})
