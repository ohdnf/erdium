-- Purpose:
--   Inline, table-level, named, anonymous, and composite foreign-key coverage.
--
-- Expected normalized summary:
--   - 6 tables in the default schema
--   - 22 columns
--   - 6 primary keys, including 3 composite primary keys
--   - 5 foreign keys

CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(80)
);

CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    owner_id BIGINT,
    name VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_projects_owner
        FOREIGN KEY (owner_id)
        REFERENCES users (id)
        ON DELETE SET NULL
);

CREATE TABLE project_members (
    project_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_project_members PRIMARY KEY (project_id, user_id),
    CONSTRAINT fk_project_members_project
        FOREIGN KEY (project_id)
        REFERENCES projects (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_project_members_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE TABLE locales (
    tenant_id BIGINT NOT NULL,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(80) NOT NULL,
    CONSTRAINT pk_locales PRIMARY KEY (tenant_id, code)
);

CREATE TABLE localized_labels (
    tenant_id BIGINT NOT NULL,
    locale_code VARCHAR(10) NOT NULL,
    label_key VARCHAR(120) NOT NULL,
    value TEXT NOT NULL,
    CONSTRAINT pk_localized_labels
        PRIMARY KEY (tenant_id, locale_code, label_key),
    CONSTRAINT fk_localized_labels_locale
        FOREIGN KEY (tenant_id, locale_code)
        REFERENCES locales (tenant_id, code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);
