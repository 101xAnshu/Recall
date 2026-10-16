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

# Demo kill-switch: when True the app behaves as if FalkorDB is
# unreachable, so the outage coda records without stopping the container.
SIMULATED_OUTAGE = False

# File twin of the flag above. The MCP tool server runs in its own
# process with its own module state, so the outage signal must live
# somewhere both processes read on every call.
OUTAGE_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".outage")


def user_graph_name(user_id: str) -> str:
    return f"user_{user_id}"


def get_db():
    """Construct a FalkorDB client. Always call inside try/except."""
    if SIMULATED_OUTAGE or os.path.exists(OUTAGE_FILE):
        raise ConnectionError("simulated outage (demo kill-switch)")
    return FalkorDB(host=FALKORDB_HOST, port=FALKORDB_PORT)
