"""
One-shot setup for the rule-evaluation load test (ТЗ 3.5.3: p99 <= 500ms
at 200 RPS). Creates a dedicated throwaway app + entity + one active
`record.created` rule (a single set_field action, same cost class as a
typical validation/autofill rule) and prints the IDs locustfile.py needs.

Safe to run against any environment (dev/staging/prod) — it only touches
its own newly created app, named with a random suffix so repeat runs
never collide with real data. Nothing here generates load; it just seeds
the fixture the load test then hits.

Usage:
    python loadtests/seed.py --host https://your-host/api/v1 \
        --email admin@example.com --password '...'

Prints a line like:
    LOCUST_APP_ID=... LOCUST_ENTITY_ID=... LOCUST_TOKEN=...
Export those (or pass --email/--password again) before running locust.
"""
from __future__ import annotations

import argparse
import secrets
import sys

import httpx


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--host", required=True, help="e.g. http://localhost:8000/api/v1")
    p.add_argument("--email", required=True)
    p.add_argument("--password", required=True)
    args = p.parse_args()

    client = httpx.Client(base_url=args.host, timeout=30)

    login = client.post("/auth/login", json={"email": args.email, "password": args.password})
    login.raise_for_status()
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    suffix = secrets.token_hex(4)
    app_resp = client.post(
        "/apps",
        json={
            "slug": f"loadtest-{suffix}",
            "name": f"Load Test {suffix}",
            "description": "Disposable app for Locust rule-evaluation load test — safe to delete",
        },
        headers=headers,
    )
    app_resp.raise_for_status()
    app_id = app_resp.json()["id"]

    entity_resp = client.post(
        f"/apps/{app_id}/entities",
        json={"slug": "ticket", "display_name": "Ticket"},
        headers=headers,
    )
    entity_resp.raise_for_status()
    entity_id = entity_resp.json()["id"]

    field_resp = client.post(
        f"/apps/{app_id}/entities/{entity_id}/fields",
        json={"name": "title", "display_name": "Title", "field_type": "text"},
        headers=headers,
    )
    field_resp.raise_for_status()

    # One representative rule: fires on every record.created, does a
    # single set_field write — the same cost class as a typical
    # validation/autofill/status-default rule in ТЗ 3.5.1's examples.
    rule_resp = client.post(
        f"/apps/{app_id}/rules",
        json={
            "entity_id": entity_id,
            "name": "Load test: default status",
            "trigger": {"event": "record.created"},
            "actions": [
                {"type": "set_field", "field": "status", "value": {"type": "literal", "value": "new"}}
            ],
        },
        headers=headers,
    )
    rule_resp.raise_for_status()
    rule_id = rule_resp.json()["id"]
    activate = client.patch(
        f"/apps/{app_id}/rules/{rule_id}", json={"is_active": True}, headers=headers
    )
    activate.raise_for_status()

    print(f"LOCUST_APP_ID={app_id} LOCUST_ENTITY_ID={entity_id} LOCUST_TOKEN={token}")
    print(
        f"\nRun with:\n"
        f"  export LOCUST_HOST={args.host}\n"
        f"  export LOCUST_APP_ID={app_id}\n"
        f"  export LOCUST_ENTITY_ID={entity_id}\n"
        f"  export LOCUST_TOKEN={token}\n"
        f"  locust -f loadtests/locustfile.py --headless -u 200 -r 20 --run-time 5m --host {args.host}\n",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
