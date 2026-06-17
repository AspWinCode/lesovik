# Deploy Guide

Server: `root@155.212.164.251`  
Project: `/opt/lesovik/repo/`  
Compose file: `infra/docker-compose.server.yml`

## Quick deploy (after `git push`)

```bash
ssh root@155.212.164.251
cd /opt/lesovik/repo

# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart services
docker compose -f infra/docker-compose.server.yml --env-file infra/.env up -d --build

# 3. Apply new migrations
docker exec lesovik-backend python -m alembic -c alembic.ini upgrade head

# 4. Run seed (idempotent — safe to run every time)
docker exec lesovik-backend python -m app.seeds.run
```

## Check status

```bash
# Container health
docker compose -f infra/docker-compose.server.yml ps

# Backend logs (last 50 lines)
docker logs lesovik-backend --tail 50

# Worker logs
docker logs lesovik-worker --tail 50

# Current migration version
docker exec lesovik-backend python -m alembic -c alembic.ini current
```

## First-time setup on a new server

```bash
git clone <repo-url> /opt/lesovik/repo
cd /opt/lesovik/repo/infra

# Copy and fill in env file
cp .env.example .env
nano .env   # set POSTGRES_PASSWORD, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, SEED_ADMIN_PASSWORD etc.

# Start everything
docker compose -f docker-compose.server.yml --env-file .env up -d

# Run migrations
docker exec lesovik-backend python -m alembic -c alembic.ini upgrade head

# Seed roles + platform_admin
docker exec lesovik-backend python -m app.seeds.run
```

## Services

| Service           | Port (host)  | Description                        |
|-------------------|--------------|------------------------------------|
| lesovik-frontend  | 8090         | Nginx serving React SPA            |
| lesovik-backend   | 127.0.0.1:8001 | FastAPI (Gunicorn, internal only) |
| lesovik-postgres  | internal     | PostgreSQL 16                      |
| lesovik-redis     | internal     | Redis 7 (broker + cache)           |
| lesovik-minio     | internal     | Object storage                     |
| lesovik-worker    | internal     | Celery worker                      |

Frontend is the public entry point at `http://155.212.164.251:8090`.

## Rollback

```bash
# Revert to previous commit
git log --oneline -5     # find target hash
git checkout <hash>
docker compose -f infra/docker-compose.server.yml --env-file infra/.env up -d --build

# Downgrade migration (if needed)
docker exec lesovik-backend python -m alembic -c alembic.ini downgrade -1
```

## Env variables (infra/.env)

| Variable               | Description                        |
|------------------------|------------------------------------|
| `POSTGRES_PASSWORD`    | DB password                        |
| `JWT_PRIVATE_KEY`      | RS256 private key (PEM)            |
| `JWT_PUBLIC_KEY`       | RS256 public key (PEM)             |
| `SEED_ADMIN_EMAIL`     | Platform admin email               |
| `SEED_ADMIN_NAME`      | Platform admin display name        |
| `SEED_ADMIN_PASSWORD`  | Platform admin password            |
| `CORS_ORIGINS`         | Allowed frontend origin(s)         |
| `S3_ACCESS_KEY_ID`     | MinIO access key                   |
| `S3_SECRET_ACCESS_KEY` | MinIO secret key                   |
