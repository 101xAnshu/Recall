"""FastAPI backend for Meridian Pay (product spec section 5).

Every endpoint degrades to the fallback message when FalkorDB is
unreachable. Unknown entities return honest 404 errors, never guesses.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import app.graph as graph_mod
from app import agent as agent_loop
from app import tools
from app.graph import FALLBACK_MESSAGE, ORG_GRAPH, get_db


@asynccontextmanager
async def lifespan(app):
    try:
        os.remove(graph_mod.OUTAGE_FILE)
    except OSError:
        pass
    yield


app = FastAPI(title="Meridian Pay backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FALLBACK = {"error": FALLBACK_MESSAGE}
APP_USER = os.getenv("APP_USER_ID", "anshu")


class AskRequest(BaseModel):
    question: str
    user_id: str = "anshu"


class RememberRequest(BaseModel):
    user_id: str
    text: str
    salience: float = 0.8


class SupersedeRequest(BaseModel):
    user_id: str
    fact_id: str
    new_text: str


class ForgetRequest(BaseModel):
    user_id: str
    fact_id: str


class ProposeRequest(BaseModel):
    goal: str
    user_id: str = "anshu"


class ApproveRequest(BaseModel):
    action_id: str
    thread_id: str = ""
    by: str = APP_USER


class RejectRequest(BaseModel):
    action_id: str
    thread_id: str = ""
    by: str = APP_USER
    reason: str = ""


class EvalRequest(BaseModel):
    limit: int | None = None
    mock: bool = False
    judge: bool = True


class ExecuteRequest(BaseModel):
    action_id: str


def _outage():
    return FALLBACK


@app.get("/health")
def health():
    """Report FalkorDB reachability. Drives the status pill and kill-switch demo."""
    try:
        get_db().select_graph(ORG_GRAPH).query("RETURN 1")
        return {"falkordb": "ok"}
    except Exception:
        return {"falkordb": "down"}


@app.get("/")
def root():
    return {"service": "meridian-pay", "docs": "/docs"}


@app.post("/ask")
def ask(req: AskRequest):
    """Main agent endpoint: scope, retrieve, draft, or pause for approval."""
    try:
        out = agent_loop.run_ask(req.question, req.user_id)
    except Exception:
        return _outage()
    if "error" in out:
        return _outage()
    return out


@app.get("/blast-radius")
def blast_radius(service: str = "Ledger"):
    try:
        return tools.blast_radius(service)
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception:
        return _outage()


@app.get("/who-knows")
def who_knows(topic: str = "payout-retry"):
    try:
        return tools.who_knows(topic)
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception:
        return _outage()


@app.post("/memory/remember")
def remember(req: RememberRequest):
    try:
        return tools.curate_memory(req.user_id, req.text, req.salience)
    except Exception:
        return _outage()


@app.post("/memory/supersede")
def supersede(req: SupersedeRequest):
    try:
        return tools.supersede_memory(req.user_id, req.fact_id, req.new_text)
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception:
        return _outage()


@app.post("/memory/forget")
def forget(req: ForgetRequest):
    try:
        return tools.forget_with_receipt(req.user_id, req.fact_id)
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception:
        return _outage()


@app.get("/memory")
def memory(user_id: str = "anshu"):
    try:
        return tools.recall_memory(user_id)
    except Exception:
        return _outage()


@app.post("/actions/propose")
def propose(req: ProposeRequest):
    """Draft a plan via the agent loop. The loop pauses, nothing executes."""
    try:
        out = agent_loop.run_ask(req.goal, req.user_id)
    except Exception:
        return _outage()
    if "error" in out:
        return _outage()
    pending = out.get("pending_action", {})
    return {"action_id": pending.get("action_id"),
            "plan": pending.get("plan"),
            "thread_id": out.get("thread_id")}


@app.post("/actions/approve")
def approve(req: ApproveRequest):
    try:
        if req.thread_id:
            out = agent_loop.resume_action(
                req.thread_id,
                {"decision": "approved", "by": req.by,
                 "action_id": req.action_id})
        else:
            out = tools.approve_action(req.action_id, req.by)
            out["audit"] = tools.audit_trail()["entries"]
        return {"action_id": out["action_id"], "status": out.get("status", "")}
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception:
        return _outage()


@app.post("/actions/reject")
def reject(req: RejectRequest):
    try:
        if req.thread_id:
            out = agent_loop.resume_action(
                req.thread_id,
                {"decision": "rejected", "by": req.by,
                 "reason": req.reason, "action_id": req.action_id})
        else:
            out = tools.reject_action(req.action_id, req.by, req.reason)
            out["audit"] = tools.audit_trail()["entries"]
        return {"action_id": out["action_id"], "status": out.get("status", "")}
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception:
        return _outage()


@app.get("/audit")
def audit():
    try:
        return tools.audit_trail()
    except Exception:
        return _outage()


@app.post("/actions/execute")
def execute(req: ExecuteRequest):
    """Run the executor against the graph proposal. Takes only an id;
    goal, plan, and status are read from FalkorDB at execution time."""
    try:
        out = tools.execute_action(req.action_id)
        return {"action_id": out["action_id"], "status": out["status"],
                "plan": out["plan"],
                "picked_up_at": out.get("picked_up_at", "")}
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception:
        return _outage()


@app.post("/eval/run")
def eval_run(req: EvalRequest):
    try:
        import importlib.util
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(root, "eval", "run.py")
        spec = importlib.util.spec_from_file_location("eval_run_mod", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod.run_benchmark(limit=req.limit, mock=req.mock,
                                 judge=req.judge)
    except Exception as exc:
        if "GROQ_API_KEY" in str(exc):
            return {"error": str(exc)}
        return _outage()


@app.get("/services")
def services():
    try:
        return tools.list_services()
    except Exception:
        return _outage()


@app.get("/memory/history")
def memory_history(user_id: str = "anshu"):
    try:
        return tools.memory_history(user_id)
    except Exception:
        return _outage()


@app.post("/admin/disconnect")
def admin_disconnect():
    """Demo kill-switch: simulate a FalkorDB outage without stopping it."""
    graph_mod.SIMULATED_OUTAGE = True
    try:
        open(graph_mod.OUTAGE_FILE, "w").close()
    except OSError:
        pass
    return {"falkordb": "down", "simulated": True}


@app.post("/admin/reconnect")
def admin_reconnect():
    """Demo kill-switch: restore FalkorDB connectivity."""
    graph_mod.SIMULATED_OUTAGE = False
    try:
        os.remove(graph_mod.OUTAGE_FILE)
    except OSError:
        pass
    try:
        get_db().select_graph(ORG_GRAPH).query("RETURN 1")
        return {"falkordb": "ok", "simulated": False}
    except Exception:
        return {"falkordb": "down", "simulated": False}
