-- Purpose:
--   Basic PostgreSQL table, column, primary-key, unique, nullability,
--   default-expression, type-modifier, and schema-qualified-name coverage.
--
-- Expected normalized summary:
--   - 2 tables in schema "app"
--   - 10 columns
--   - 2 primary keys, including 1 composite primary key
--   - 2 unique constraints, including 1 composite unique constraint
--   - 0 foreign keys

CREATE TABLE app.users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(80),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE app.api_keys (
    user_id BIGINT NOT NULL,
    key_id UUID NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_api_keys PRIMARY KEY (user_id, key_id),
    CONSTRAINT uq_api_keys_user_label UNIQUE (user_id, label)
);
