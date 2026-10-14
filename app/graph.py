"""FalkorDB connection helpers for the Meridian Pay backend.

Rules followed from the product spec:
- the falkordb client is always constructed inside try/except because
  an outage raises at connect time
- org knowledge and per-user memory live in separate FalkorDB graphs,
  the app layer resolves scope and Cypher never touches two graphs
- every Python HTTP call in this backend sends a neutral User-Agent header
"""

import os

from falkordb import FalkorDB

FALLBACK_MESSAGE = (
    "I can't answer this. "
    "The relationships required for the answer don't exist in the fallback."
)

# Neutral User-Agent sent on every Python HTTP call (avoids Cloudflare 403s).
USER_AGENT = "MeridianPay/1.0 (+local)"

FALKORDB_HOST = os.getenv("FALKORDB_HOST", "localhost")
FALKORDB_PORT = int(os.getenv("FALKORDB_PORT", "6379"))
ORG_GRAPH = os.getenv("ORG_GRAPH", "org")


def user_graph_name(user_id: str) -> str:
    return f"user_{user_id}"


def get_db():
    """Construct a FalkorDB client. Always call inside try/except."""
    return FalkorDB(host=FALKORDB_HOST, port=FALKORDB_PORT)


def get_graph(graph_name: str):
    """Select one graph by name. One graph per call, never cross-graph Cypher."""
    return get_db().select_graph(graph_name)
