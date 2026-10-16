"""MCP server exposing the FalkorDB tools. Transport only.

Every tool delegates to app.tools unchanged. ValueError (unknown
entities, refused transitions) is serialized in-band so the client can
re-raise it and endpoint semantics stay identical.
"""

from mcp.server.fastmcp import FastMCP

from app import tools

mcp = FastMCP("meridian-pay")


def _out(fn):
    try:
        return fn()
    except ValueError as exc:
        return {"__error__": str(exc), "__type__": "ValueError"}


@mcp.tool()
def trace_why(incident_id: str = "INC-231") -> dict:
    return _out(lambda: tools.trace_why(incident_id))


@mcp.tool()
def blast_radius(service: str = "Ledger") -> dict:
    return _out(lambda: tools.blast_radius(service))


@mcp.tool()
def who_knows(topic: str = "payout-retry") -> dict:
    return _out(lambda: tools.who_knows(topic))


@mcp.tool()
def list_services() -> dict:
    return _out(tools.list_services)


@mcp.tool()
def recall_messages(topic: str = "payout-retry", limit: int = 15) -> dict:
    return _out(lambda: tools.recall_messages(topic, limit))


@mcp.tool()
def recall_memory(user_id: str) -> dict:
    return _out(lambda: tools.recall_memory(user_id))


@mcp.tool()
def memory_history(user_id: str) -> dict:
    return _out(lambda: tools.memory_history(user_id))


@mcp.tool()
def curate_memory(user_id: str, text: str, salience: float = 0.8) -> dict:
    return _out(lambda: tools.curate_memory(user_id, text, salience))


@mcp.tool()
def supersede_memory(user_id: str, fact_id: str, new_text: str) -> dict:
    return _out(lambda: tools.supersede_memory(user_id, fact_id, new_text))


@mcp.tool()
def forget_with_receipt(user_id: str, fact_id: str) -> dict:
    return _out(lambda: tools.forget_with_receipt(user_id, fact_id))


@mcp.tool()
def propose_action(goal: str, plan: list, proposer: str = "anshu") -> dict:
    return _out(lambda: tools.propose_action(goal, plan, proposer))


@mcp.tool()
def approve_action(action_id: str, approver: str) -> dict:
    return _out(lambda: tools.approve_action(action_id, approver))


@mcp.tool()
def reject_action(action_id: str, approver: str, reason: str = "") -> dict:
    return _out(lambda: tools.reject_action(action_id, approver, reason))


@mcp.tool()
def audit_trail(limit: int = 20) -> dict:
    return _out(lambda: tools.audit_trail(limit))


@mcp.tool()
def get_action(action_id: str) -> dict:
    return _out(lambda: tools.get_action(action_id))


@mcp.tool()
def execute_action(action_id: str) -> dict:
    return _out(lambda: tools.execute_action(action_id))


@mcp.tool()
def recall_procedure(topic: str = "", limit: int = 5) -> dict:
    return _out(lambda: tools.recall_procedure(topic or None, limit))


if __name__ == "__main__":
    mcp.run()
