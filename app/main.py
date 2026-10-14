"""FastAPI entrypoint for the Meridian Pay backend."""

from fastapi import FastAPI

from app.graph import ORG_GRAPH, get_db

app = FastAPI(title="Meridian Pay backend")


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
