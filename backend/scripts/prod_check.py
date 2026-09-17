"""Verifies production mode: static frontend served at / and API under /api."""
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("FAMILY_CALENDAR_DB", "sqlite:///./prod_check.db")
sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def main() -> None:
    with TestClient(app) as client:
        members = client.get("/api/members")
        print("prod /api/members:", members.status_code, str(members.json())[:90])

        chat = client.post(
            "/api/ai/chat", json={"message": "Pipo lavora il 9 settembre?"}
        )
        print("prod AI:", chat.status_code, chat.json().get("reply", chat.text)[:80])

        index = client.get("/")
        print("static /:", index.status_code, index.text[:60].replace("\n", " "))

    if os.path.exists("prod_check.db"):
        os.remove("prod_check.db")


if __name__ == "__main__":
    main()
