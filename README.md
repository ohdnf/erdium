# Erdium

Erdium is a browser-first SQL-to-ERD editor for PostgreSQL DDL. Paste or write supported PostgreSQL schema SQL, parse it locally, inspect the generated ERD, arrange tables, and export the result without creating an account.

Phase 1 is local-first:

- SQL is parsed in the browser.
- SQL is never executed.
- SQL is not sent to a server or external service.
- Project state is stored in browser local storage.
- JSON import/export and PNG export run from browser APIs.

## Features

- PostgreSQL DDL editor with explicit **Parse** action
- Sample SQL loader
- User-visible diagnostics with line and column when available
- Last valid diagram preservation after invalid SQL
- Canonical schema model for tables, columns, primary keys, unique constraints, and foreign keys
- ERD rendering with PK, FK, UQ, NN, and DEF column markers
- Foreign-key edges, including composite foreign keys as one logical relationship
- Automatic layout through ELK.js
- Table drag, pan, zoom, fit view, and manual re-layout
- Local persistence of SQL, table positions, and viewport
- Local project reset
- Versioned JSON project export/import
- Diagram PNG export

## Supported SQL

Erdium Phase 1 supports the PostgreSQL DDL subset documented in [`docs/parser-coverage.md`](docs/parser-coverage.md).

Supported release fixtures cover:

- `CREATE TABLE`
- Multiple statements separated by semicolons
- Schema-qualified and unqualified table names
- Inline and table-level primary keys
- Composite primary keys
- Inline and table-level unique constraints
- Inline foreign keys
- Table-level foreign keys
- Composite foreign keys
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
- `ON DELETE` and `ON UPDATE` referential actions
- `NOT NULL`
- `DEFAULT` literals and function calls
- PostgreSQL type text such as `BIGSERIAL`, `TEXT`, `UUID`, `TIMESTAMPTZ`, `VARCHAR(255)`, and `NUMERIC(12,2)`

Not included in Phase 1:

- SQL execution
- Direct database connections
- Authentication or cloud project storage
- Collaboration or public sharing links
- AI analysis or SQL generation
- Multiple SQL dialects
- Broad PostgreSQL DDL coverage such as `CREATE INDEX`, `CREATE TYPE`, `DROP`, DML, generated columns, or full quoted-identifier certification

Unsupported or malformed input should produce diagnostics instead of silently changing the diagram. Errors block committing a new schema and preserve the last valid diagram.

## Architecture

The main data flow is:

```text
PostgreSQL SQL
  -> parser library AST
  -> PostgreSQL parser adapter
  -> DatabaseSchema
  -> diagram graph
  -> layout adapter
  -> React Flow nodes and edges
```

Key boundaries:

- `DatabaseSchema` is the application-owned canonical model.
- Parser-library AST types stay inside `src/adapters/parser/postgres`.
- React Flow types stay inside diagram presentation adapters.
- ELK.js stays behind `src/adapters/layout/elk`.
- Browser local storage stays behind `src/adapters/persistence/local-storage`.
- JSON import/export uses a versioned project document and validates untrusted input.

See [`docs/architecture.md`](docs/architecture.md) for the full architecture notes.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Open <http://localhost:3000>.

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

The E2E script builds the app before running Playwright.

## Test Fixtures

PostgreSQL fixture files live in [`fixtures/postgres`](fixtures/postgres):

- `basic.sql`
- `foreign-key.sql`
- `alter-table.sql`
- `performance-50-tables.sql`

The 50-table performance fixture verifies that parsing, normalization, and graph mapping stay within the Phase 1 target for a medium reference schema.

## Local Limits

To keep the browser-only workflow responsive, SQL source is limited to 256 KiB for parsing and restored project documents. Project JSON imports are limited to 1 MiB. Oversized inputs show a local error and keep the last valid diagram unchanged.

## Deployment

Production deploys are driven by normal GitHub Releases. When a non-prerelease
release is published, `.github/workflows/release-deploy.yml` checks out the
published tag, runs linting, type checking, unit tests, end-to-end tests, and
then deploys prebuilt production output to Vercel.

The app targets Vercel as a static Next.js deployment target. [`vercel.json`](vercel.json) pins the Vercel build commands used by the release workflow:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build"
}
```

Configure these GitHub repository settings before publishing a release:

- Secret `VERCEL_TOKEN`
- Variable `VERCEL_ORG_ID`: `team_gvUsy2MjtWatSu8FKoHK3NPY`
- Variable `VERCEL_PROJECT_ID`: `prj_EKNqEdvA2azwRgJgBBeXIy8ZuMtz`

The workflow uses the GitHub Release tag as the deployment source. It does not
derive the tag from `package.json`. Prereleases do not deploy production.

For manual fallback deployments, use an authenticated Vercel account:

```bash
pnpm dlx vercel
pnpm dlx vercel --prod
```

## Codex Workflow

This repository uses small milestone PRs. The expected loop is:

1. Read `AGENTS.md` and the relevant docs.
2. Make the smallest coherent change for the milestone.
3. Add or update tests for behavior changes.
4. Run affected checks.
5. Open a focused PR.
6. Address review findings.
7. Merge, delete the work branch, and sync `main`.

See [`docs/codex-workflow.md`](docs/codex-workflow.md) for the detailed workflow.
