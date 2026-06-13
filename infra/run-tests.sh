#!/usr/bin/env bash
# Run the full backend test suite in a disposable Docker stack.
# Works on any host with Docker — no local Python/Postgres needed.
#
#   ./run-tests.sh                 # whole suite
#   ./run-tests.sh tests/test_rules.py -k steps   # forwarded to pytest
#
# (Extra pytest args are appended by overriding the backend-test command.)
set -u
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.test.yml"

# Forward any args to pytest inside the container (e.g. ./run-tests.sh tests/test_rules.py).
export PYTEST_ARGS="$*"

code=0
$COMPOSE up --build --abort-on-container-exit --exit-code-from backend-test || code=$?

# Always tear down (removes the tmpfs DB + containers).
$COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true

exit "$code"
