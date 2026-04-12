-- Nords development database initialization
-- Note: The database itself is created by docker-compose POSTGRES_DB env var.
-- This file is for extensions, roles, and other setup that runs after DB creation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
