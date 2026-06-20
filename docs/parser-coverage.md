# PostgreSQL Parser Coverage

- Status: Draft
- Version: 0.1
- Dialect: PostgreSQL only
- Scope: Phase 1 MVP

## 1. Purpose

This document defines the PostgreSQL DDL subset that the product claims to support. It is both a product boundary and a test plan.

A syntax feature is not considered supported merely because the selected parser library accepts it. Support requires:

1. A normalized representation in the application-owned schema model.
2. Correct relation and identifier resolution.
3. A fixture or focused automated test.
4. User-visible diagnostics for unsupported or malformed input.

## 2. Status legend

| Status | Meaning |
|---|---|
| Required | Must work before Phase 1 is complete |
| Best effort | Accept when the parser exposes sufficient data; not a release blocker until a fixture is added |
| Deferred | Intentionally excluded from Phase 1; should produce a warning or clear error when encountered |
| Ignored | Safe to omit without changing the diagram's required semantics |
| Unsupported | Outside the foreseeable parser scope unless a future product decision changes it |

## 3. Statement coverage

| Statement or feature | Status | Fixture | Expected behavior |
|---|---|---|---|
| Multiple statements separated by semicolons | Required | All fixtures | Collect all supported table and constraint definitions |
| `CREATE TABLE` | Required | All fixtures | Create one normalized table per statement |
| Schema-qualified table name | Required | `basic.sql`, `alter-table.sql` | Preserve display name and resolve canonical schema/table ID |
| Unqualified table name | Required | `foreign-key.sql` | Use configured default schema, initially `public` |
| `CREATE TABLE IF NOT EXISTS` | Best effort | Future | Treat as `CREATE TABLE` and retain no execution semantics |
| Temporary or unlogged table | Deferred | Future | Emit `UNSUPPORTED_STATEMENT` or feature warning |
| `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` | Required | `alter-table.sql` | Add a normalized foreign key after table collection |
| Other `ALTER TABLE` operations | Deferred | Future | Emit a warning or error without crashing |
| `CREATE INDEX` | Deferred | Future | Do not claim index coverage in Phase 1 |
| `CREATE TYPE`, enum, domain | Deferred | Future | May be ignored only when column type text remains displayable; otherwise warn |
| `DROP`, `TRUNCATE`, DML, queries | Unsupported | Future negative tests | Reject as outside the diagram-import contract |

## 4. Column coverage

| Column feature | Status | Fixture | Expected behavior |
|---|---|---|---|
| Column name | Required | All fixtures | Preserve display spelling and produce stable canonical ID |
| Built-in type text | Required | All fixtures | Retain a displayable PostgreSQL type string |
| Type modifiers such as `VARCHAR(255)` or `NUMERIC(12,2)` | Required | All fixtures | Preserve modifiers in type text |
| Array types | Best effort | Future | Preserve raw type text if parser AST supports it |
| Schema-qualified or custom type | Best effort | Future | Preserve display text; no semantic type resolution required |
| `NOT NULL` | Required | All fixtures | Set `nullable: false` |
| Omitted nullability | Required | All fixtures | Set `nullable: true`, except when PK semantics require non-null display |
| `DEFAULT` literal | Required | `basic.sql`, `foreign-key.sql` | Preserve displayable expression text |
| `DEFAULT` function call | Required | All fixtures | Preserve expressions such as `NOW()` |
| `GENERATED` or computed column | Deferred | Future | Warn or fail clearly |
| Identity clause | Best effort | Future | Preserve type/default information when possible |
| `SERIAL` and `BIGSERIAL` | Required | All fixtures | Treat as type text; do not execute sequence behavior |
| Column collation | Deferred | Future | Warn or ignore only if diagram semantics remain reliable |

## 5. Constraint coverage

| Constraint feature | Status | Fixture | Expected behavior |
|---|---|---|---|
| Inline `PRIMARY KEY` | Required | All fixtures | Create a single-column primary-key constraint |
| Table-level `PRIMARY KEY` | Required | `basic.sql`, `foreign-key.sql` | Resolve referenced columns in declared order |
| Composite primary key | Required | `basic.sql`, `foreign-key.sql` | Preserve ordered column IDs |
| Inline `UNIQUE` | Required | `basic.sql`, `foreign-key.sql` | Create an anonymous single-column unique constraint |
| Table-level named `UNIQUE` | Required | `basic.sql`, `alter-table.sql` | Preserve optional name and ordered columns |
| Inline `REFERENCES` | Required | `foreign-key.sql` | Create a foreign key from the current column |
| Table-level `FOREIGN KEY` | Required | `foreign-key.sql` | Resolve source and target columns |
| Composite foreign key | Required | `foreign-key.sql` | Preserve one relation with ordered source and target arrays |
| Named foreign-key constraint | Required | `foreign-key.sql`, `alter-table.sql` | Preserve constraint name |
| Anonymous foreign-key constraint | Required | `foreign-key.sql` | Generate deterministic internal ID and keep name `null` |
| `ON DELETE` action | Required | `foreign-key.sql`, `alter-table.sql` | Normalize supported referential action |
| `ON UPDATE` action | Required | `alter-table.sql` | Normalize supported referential action |
| `MATCH` clause | Deferred | Future | Warn or retain as unsupported metadata |
| Deferrable constraint options | Deferred | Future | Warn; do not imply runtime enforcement behavior |
| `CHECK` constraint | Deferred | Future | Warn or ignore only with an explicit diagnostic |
| Exclusion constraint | Unsupported | Future | Reject or warn clearly |

## 6. Identifier coverage

### Required behavior

- Unquoted PostgreSQL identifiers canonicalize to lowercase.
- Quoted identifiers preserve case and escaped content.
- Display names preserve the source spelling needed by the user.
- Unqualified tables receive the configured default schema.
- Table and column IDs are deterministic.
- Relation resolution uses canonical IDs, not display strings.
- IDs must not collide when identifiers contain separator characters.

### Coverage status

| Identifier case | Status | Fixture | Notes |
|---|---|---|---|
| Simple unquoted identifier | Required | All fixtures | Core release requirement |
| Schema-qualified unquoted identifier | Required | `basic.sql`, `alter-table.sql` | Core release requirement |
| Quoted identifier | Best effort until dedicated fixture is added | Future | Architecture must support it from the start |
| Escaped quote inside quoted identifier | Deferred | Future | Add only with a precise parser test |
| Explicit `public` schema versus implicit default | Required | Focused unit test | Must resolve to the same canonical table ID |

## 7. Referential actions

The normalized model supports:

```text
NO ACTION
RESTRICT
CASCADE
SET NULL
SET DEFAULT
```

Parser-specific casing or token forms must normalize into the closed union above.

When no action is specified, store `null` rather than inventing an explicit value. The UI may explain PostgreSQL defaults separately in a later feature.

## 8. Collection and resolution algorithm

The adapter should use a multi-pass approach.

### Pass 1: Collect table declarations

- Register table identifiers.
- Collect columns in source order.
- Collect inline and table-level primary and unique constraints.
- Collect unresolved foreign-key declarations.

### Pass 2: Apply supported `ALTER TABLE` constraints

- Resolve the target table of each `ALTER TABLE` statement.
- Add unresolved foreign-key declarations to the relevant source table.

### Pass 3: Resolve relationships

- Resolve source column IDs.
- Resolve referenced table IDs.
- Resolve target column IDs.
- Validate source and target column counts.
- Generate deterministic relation IDs.

This design permits forward references and keeps parser statement order from leaking into the domain model.

## 9. Diagnostic codes

The initial diagnostic union should contain at least the following codes.

| Code | Severity | Meaning |
|---|---|---|
| `SQL_PARSE_ERROR` | Error | The parser library could not parse the SQL |
| `UNSUPPORTED_STATEMENT` | Warning or error | A statement is outside declared coverage |
| `UNSUPPORTED_FEATURE` | Warning or error | A statement is known, but a contained feature is unsupported |
| `DUPLICATE_TABLE` | Error | Two declarations normalize to the same table ID |
| `DUPLICATE_COLUMN` | Error | Two columns normalize to the same column ID within a table |
| `UNKNOWN_ALTER_TABLE_TARGET` | Error | An `ALTER TABLE` target cannot be resolved |
| `UNKNOWN_CONSTRAINT_COLUMN` | Error | A key constraint references an unknown source column |
| `UNRESOLVED_REFERENCE_TABLE` | Error | A foreign key references an unknown table |
| `UNRESOLVED_REFERENCE_COLUMN` | Error | A foreign key references an unknown target column |
| `FOREIGN_KEY_COLUMN_COUNT_MISMATCH` | Error | Source and target foreign-key arrays differ in length |
| `DUPLICATE_CONSTRAINT` | Error | Constraint identity collides within the same scope |
| `NORMALIZATION_ERROR` | Error | The AST was parsed but cannot be safely normalized |

Diagnostics should include source range information when the parser library provides it. Lack of a range must not prevent a useful message.

## 10. Unsupported-input policy

- A syntax error produces `SQL_PARSE_ERROR` and no new committed schema.
- An unsupported statement that may change schema semantics produces an error.
- A safely ignorable construct may produce a warning and a valid schema.
- The UI preserves the last valid diagram whenever an error occurs.
- The application must not silently discard a primary key, foreign key, table, or column.

## 11. Fixture contracts

Fixtures are executable specifications. Their comments describe intent but are not a substitute for assertions.

### `fixtures/postgres/basic.sql`

Expected normalized summary:

- 2 schema-qualified tables in schema `app`
- 10 columns total
- 2 primary-key constraints
- 1 composite primary key
- 2 unique constraints, including one composite unique constraint
- 0 foreign keys
- Literal and function-call defaults retained

Required assertions include:

- `app.users.id` is a single-column primary key.
- `app.users.email` is not nullable and is unique.
- `app.api_keys` has ordered primary-key columns `user_id`, `key_id`.
- The unique constraint on `app.api_keys` keeps `user_id`, `label` order.

### `fixtures/postgres/foreign-key.sql`

Expected normalized summary:

- 6 tables in the default schema
- 22 columns total
- 6 primary-key constraints
- 3 composite primary keys
- 5 foreign keys
- Inline, table-level, named, anonymous, and composite relations represented

Required assertions include:

- `projects.organization_id` references `organizations.id` through an inline anonymous constraint.
- `projects.owner_id` references `users.id` and preserves `ON DELETE SET NULL`.
- `project_members` has separate named FKs to `projects` and `users`.
- `localized_labels(tenant_id, locale_code)` references `locales(tenant_id, code)` as one ordered composite relation.

### `fixtures/postgres/alter-table.sql`

Expected normalized summary:

- 3 schema-qualified tables in schema `billing`
- 12 columns total
- 3 primary-key constraints
- 1 table-level unique constraint
- 2 foreign keys added through `ALTER TABLE`

Required assertions include:

- `billing.invoices.account_id` references `billing.accounts.id`.
- The invoice relation preserves `ON DELETE RESTRICT` and `ON UPDATE CASCADE`.
- `billing.invoice_items.invoice_id` references `billing.invoices.id` with `ON DELETE CASCADE`.

## 12. Tests still required before Phase 1 release

The three initial fixtures do not cover every required failure path. Add focused fixtures or inline test SQL for:

- Invalid SQL with line and column diagnostics
- Duplicate table after normalization
- Duplicate column
- Unknown `ALTER TABLE` target
- Unknown source constraint column
- Unknown referenced table
- Unknown referenced column
- Composite FK column-count mismatch
- Explicit `public.table` resolving identically to unqualified `table`
- Quoted identifiers before claiming full quoted-identifier support
- Comments and varied formatting producing equivalent schemas
- Forward-referenced table definitions

## 13. Adding coverage

When adding a supported feature:

1. Update this matrix.
2. Add or extend a fixture.
3. Add semantic assertions against `DatabaseSchema`.
4. Add an error-path test when malformed input is possible.
5. Update user-facing supported-syntax documentation.
6. Avoid snapshot-only tests for behavior that deserves named assertions.
