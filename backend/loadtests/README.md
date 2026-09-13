# Rule-evaluation load test (ТЗ 3.5.3)

Target: p99 <= 500ms at 200 RPS on the record-create path that fires the
Rules Engine.

## What it measures

`POST /apps/{app_id}/entities/{entity_id}/records` on an entity with one
active `record.created` rule. The request latency covers
`RecordService.create_record()` plus enqueueing the rule-evaluation
batch task (`RuleService.evaluate_rules_for_event`) — actual rule
execution happens asynchronously in the sandbox worker afterwards, so
this measures exactly what a real client's request waits on, which is
what the ТЗ target is sized against.

## Setup

```bash
pip install -e ".[load]"
python loadtests/seed.py --host https://<api-host>/api/v1 \
    --email <admin-email> --password '<password>'
```

`seed.py` creates its own disposable app/entity/field/rule (named
`loadtest-<random>`) — it never touches existing data, and is safe to
run against any environment including production. It prints the
env vars the second command needs.

## Running

```bash
export LOCUST_HOST=https://<api-host>/api/v1
export LOCUST_APP_ID=...
export LOCUST_ENTITY_ID=...
export LOCUST_TOKEN=...

locust -f loadtests/locustfile.py --headless \
    -u 200 -r 20 --run-time 5m --host "$LOCUST_HOST" --csv=results
```

200 simulated users each pace themselves to ~1 request/second
(`constant_pacing(1)`), so total throughput is ~200 RPS regardless of
response latency. Read `results_stats.csv` (or the console summary) for
p95/p99 against the ТЗ target.

For an interactive run with a live chart, drop `--headless` and open
http://localhost:8089.

## Before running against a shared/production environment

This generates 200 sustained requests/second for the run's duration —
confirm with whoever owns the target environment before pointing it at
anything with real traffic, and prefer a staging environment or an
off-peak window. Clean up the disposable app afterwards (`DELETE
/apps/{app_id}` or via the UI) if it isn't left for the next run.
