-- One-time DB initialization (runs only on first postgres container start)
-- Alembic migrations create all actual tables.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure app_user has necessary privileges
-- (User is already created by POSTGRES_USER env var)
GRANT CONNECT ON DATABASE nocode TO app_user;
