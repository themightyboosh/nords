-- Nords database initialization (Cloud SQL)
-- Extensions required by the app. Run once against new databases.
-- Note: Cloud SQL may require enabling these via the console first.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
