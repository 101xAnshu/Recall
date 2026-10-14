"""Live Groq path verification (needs GROQ_API_KEY in the environment).

This script is NOT run without a key. It exercises the app's real
answer-drafting path (scope -> retrieve -> draft via app.agent.run_ask)
exactly once, reports whether Groq or the template produced the answer,
and exits nonzero when Groq did not.

Run: GROQ_API_KEY=<key> .venv/bin/python scripts/verify_groq.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.agent as agent_mod

QUESTION = "Why did INC-231 happen?"


def main():
    if not os.getenv("GROQ_API_KEY"):
        print("GROQ_API_KEY is not set in the environment")
        return 2
    seen = {}
    original = agent_mod._llm_draft

    def spy(question, evidence):
        result = original(question, evidence)
        seen["groq_answer"] = result is not None
        return result

    agent_mod._llm_draft = spy
    try:
        out = agent_mod.run_ask(QUESTION, "anshu")
    finally:
        agent_mod._llm_draft = original
    if "error" in out:
        print("agent loop failed: " + str(out["error"])[:200])
        return 1
    answer = out.get("answer", "")
    print("model: " + agent_mod.PRIMARY_MODEL)
    if not seen.get("groq_answer"):
        print("source: template fallback (Groq call failed or empty)")
        return 1
    print("source: groq")
    print("answer excerpt: " + answer[:200])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
