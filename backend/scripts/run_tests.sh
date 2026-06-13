#!/bin/sh
# Self-contained backend test runner used by infra/docker-compose.test.yml.
# Generates an ephemeral RS256 keypair (config requires PEM JWT keys), applies
# migrations against the disposable test DB, then runs pytest. Any extra args
# are forwarded to pytest (e.g. `... tests/test_rules.py -k steps`).
set -e

# Ephemeral RS256 keypair — never persisted, regenerated each run.
python - <<'PY'
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
priv = key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()
pub = key.public_key().public_bytes(
    serialization.Encoding.PEM,
    serialization.PublicFormat.SubjectPublicKeyInfo,
).decode()
open("/tmp/jwt_priv.pem", "w").write(priv)
open("/tmp/jwt_pub.pem", "w").write(pub)
PY
JWT_PRIVATE_KEY="$(cat /tmp/jwt_priv.pem)"
JWT_PUBLIC_KEY="$(cat /tmp/jwt_pub.pem)"
export JWT_PRIVATE_KEY JWT_PUBLIC_KEY

echo "→ alembic upgrade head"
alembic upgrade head

echo "→ pytest $*"
exec pytest "$@"
