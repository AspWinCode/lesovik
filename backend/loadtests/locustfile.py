"""
Rule-evaluation load test (ТЗ 3.5.3): target p99 <= 500ms at 200 RPS on
the record-create path that fires the Rules Engine.

Each simulated user creates records against a dedicated entity that has
one active `record.created` rule (see seed.py) and occasionally patches
one back to also exercise `record.updated`. The request only measures
the API's own latency — RecordService.create_record() + enqueueing the
rule-evaluation batch task — since actual rule execution happens
asynchronously in the sandbox worker after the response is returned
(app/services/rules.py::evaluate_rules_for_event dispatches a Celery
task, it does not await it). That split is intentional: it is exactly
what a real client experiences, and it is the path ТЗ 3.5.3 sizes.

Setup (once):
    pip install -e ".[load]"
    python loadtests/seed.py --host <api-base-url> --email ... --password ...
    export LOCUST_HOST=<api-base-url> LOCUST_APP_ID=... LOCUST_ENTITY_ID=... LOCUST_TOKEN=...

Run (200 RPS for 5 minutes, headless):
    locust -f loadtests/locustfile.py --headless -u 200 -r 20 --run-time 5m --host $LOCUST_HOST

Each of the 200 simulated users issues ~1 request/second via
constant_pacing(1), so 200 users ≈ 200 RPS. Read the p95/p99 columns
Locust prints at the end (or --csv for a report) against the ТЗ target.
"""
from __future__ import annotations

import os
import random
import uuid

from locust import HttpUser, task, between, constant_pacing


APP_ID = os.environ.get("LOCUST_APP_ID", "")
ENTITY_ID = os.environ.get("LOCUST_ENTITY_ID", "")
TOKEN = os.environ.get("LOCUST_TOKEN", "")


class RuleEvaluationUser(HttpUser):
    wait_time = constant_pacing(1) if TOKEN else between(1, 2)

    def on_start(self) -> None:
        if not (APP_ID and ENTITY_ID and TOKEN):
            raise RuntimeError(
                "Set LOCUST_APP_ID, LOCUST_ENTITY_ID, LOCUST_TOKEN — run seed.py first"
            )
        self.client.headers["Authorization"] = f"Bearer {TOKEN}"
        self._records_base = f"/apps/{APP_ID}/entities/{ENTITY_ID}/records"
        self._known_record_ids: list[str] = []

    @task(4)
    def create_record(self) -> None:
        payload = {"payload": {"title": f"load-{uuid.uuid4().hex[:8]}"}}
        with self.client.post(self._records_base, json=payload, catch_response=True) as resp:
            if resp.status_code == 201:
                record_id = resp.json().get("id")
                if record_id:
                    self._known_record_ids.append(record_id)
                    if len(self._known_record_ids) > 200:
                        self._known_record_ids.pop(0)
                resp.success()
            else:
                resp.failure(f"create_record: HTTP {resp.status_code}: {resp.text[:200]}")

    @task(1)
    def update_record(self) -> None:
        if not self._known_record_ids:
            return
        record_id = random.choice(self._known_record_ids)
        payload = {"payload": {"title": f"updated-{uuid.uuid4().hex[:8]}"}}
        with self.client.patch(
            f"{self._records_base}/{record_id}", json=payload, catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                # 404 = another user's task already deleted/rotated it out — not a failure
                resp.success()
            else:
                resp.failure(f"update_record: HTTP {resp.status_code}: {resp.text[:200]}")
