-- Purpose:
--   Schema-qualified identifiers and foreign keys introduced through
--   ALTER TABLE ... ADD CONSTRAINT.
--
-- Expected normalized summary:
--   - 3 tables in schema "billing"
--   - 12 columns
--   - 3 primary keys
--   - 1 table-level unique constraint
--   - 2 foreign keys added through ALTER TABLE

CREATE TABLE billing.accounts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billing.invoices (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    number VARCHAR(40) NOT NULL,
    issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT uq_invoices_account_number UNIQUE (account_id, number)
);

CREATE TABLE billing.invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL
);

ALTER TABLE billing.invoices
    ADD CONSTRAINT fk_invoices_account
    FOREIGN KEY (account_id)
    REFERENCES billing.accounts (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE billing.invoice_items
    ADD CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id)
    REFERENCES billing.invoices (id)
    ON DELETE CASCADE;
