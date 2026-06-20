# AGENTS.md

## Project summary

This repository contains a browser-first SQL-to-ERD editor. The Phase 1 MVP accepts PostgreSQL DDL, converts it into a canonical schema model, and renders an interactive ERD.

The MVP is intentionally local-first:

- No authentication.
- No cloud database.
- No direct database connection.
- No AI feature exposed to end users.
- SQL is parsed, never executed.
- SQL remains in the browser unless a later phase explicitly introduces a server boundary.

Read these documents before making changes:

1. `docs/prd.md`
2. `docs/architecture.md`
3. `docs/parser-coverage.md`
4. `docs/codex-workflow.md`

## Instruction precedence

When instructions conflict, follow this order:

1. The explicit task or user request.
2. The nearest applicable `AGENTS.md`.
3. `docs/prd.md` for product scope and acceptance criteria.
4. `docs/architecture.md` for technical boundaries.
5. Existing tests and established repository conventions.

Do not silently resolve a material conflict. State the conflict in the task summary and choose the smallest reversible implementation.

## Proposed stack

Use the stack below unless an explicit task changes it:

- Next.js App Router
- React
- TypeScript with strict mode enabled
- `pnpm`
- `@xyflow/react` for the interactive diagram
- ELK.js behind a layout adapter
- Vitest for unit and fixture tests
- Playwright for end-to-end tests
- Vercel for deployment

Do not pin or upgrade dependency versions unless the task requires it.

## Required package scripts

The repository should expose these scripts once the application is scaffolded:

```text
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

Run the narrowest relevant checks during implementation. Before declaring a task complete, run every check affected by the change. Run the full set when the task changes architecture, shared domain types, parser behavior, persistence, or build configuration.

## Architecture invariants

These rules are mandatory.

### 1. Keep a canonical schema model

All inputs must be normalized into the application-owned `DatabaseSchema` model.

```text
PostgreSQL SQL
  -> parser library AST
  -> PostgreSQL parser adapter
  -> DatabaseSchema
  -> diagram graph
  -> React Flow nodes and edges
```

Do not expose parser-library AST types outside the parser adapter.

Do not make domain or application modules import React Flow, ELK, Next.js, browser storage, or parser-library types.

### 2. Keep source, schema, and layout separate

Treat these as different concerns:

- Source: the SQL text supplied by the user.
- Schema: the normalized database structure derived from SQL.
- Layout: node positions, collapsed state, and viewport.

A parse operation must not overwrite user-adjusted positions for tables whose stable identifiers still exist.

### 3. Use stable identifiers

Never use array indexes as table, column, relation, React, or layout keys.

Identifiers must be deterministic from normalized PostgreSQL identifiers. Preserve original display names separately from canonical IDs.

### 4. Preserve the last valid diagram

If new SQL contains an error:

- Show actionable diagnostics.
- Keep the current SQL text.
- Do not replace the last successfully rendered diagram.
- Do not crash the page.

Warnings may accompany a valid schema. Errors block committing a new schema.

### 5. Keep vendor code behind adapters

The following dependencies must remain replaceable:

- PostgreSQL parser library
- ELK.js
- React Flow serialization details
- Browser persistence implementation

Wrap vendor-specific behavior in small adapters. Do not introduce an abstraction without a real boundary described in `docs/architecture.md`.

## MVP scope guardrails

Implement only Phase 1 unless the task explicitly targets a later phase.

Do not add the following opportunistically:

- Authentication or user accounts
- Server-side project persistence
- Direct PostgreSQL connections
- Credential storage
- Collaboration or sharing permissions
- AI schema analysis
- Natural-language-to-SQL generation
- Billing
- Real-time synchronization
- Support for multiple SQL dialects

Future phases are documented to protect extension points, not to authorize premature implementation.

## SQL and security rules

- Never execute user-provided SQL.
- Never send SQL to an external service in Phase 1.
- Never log full SQL input in production telemetry.
- Do not add analytics, remote error reporting, or third-party scripts without an explicit task.
- Treat imported JSON as untrusted input and validate its shape and format version.
- Escape or render identifier text as plain text; never inject SQL-derived strings as HTML.
- Browser storage keys and exported documents must include a format version.

## Parser implementation rules

- Treat `fixtures/postgres/*.sql` as executable specifications.
- Do not change a fixture merely to make a failing implementation pass. Change it only when the intended product behavior changes, and update `docs/parser-coverage.md` in the same task.
- Support composite primary keys and composite foreign keys in the domain model even if a UI iteration displays them minimally.
- Store PostgreSQL data types and default expressions losslessly enough for display. Do not invent semantic normalization unless it is covered by tests.
- Resolve foreign-key targets after all statements have been collected so forward references can work.
- Emit diagnostics for unresolved tables, unresolved columns, duplicate entities, malformed constraints, and unsupported statements as defined in `docs/parser-coverage.md`.
- Comments and formatting must not affect the normalized result.

## React and Next.js rules

- Keep `app/page.tsx` as a thin route entry where practical.
- Put interactive editor state inside explicit Client Components.
- Do not mark broad subtrees with `"use client"` when a smaller boundary is sufficient.
- Keep derived state derived; do not mirror it in `useEffect` without necessity.
- Prefer pure transformation functions for parser-to-domain and domain-to-graph mapping.
- Keep React Flow node and edge construction outside presentational node components.
- Avoid global state libraries until local reducer/context state is demonstrably insufficient.
- Do not add a UI component library unless the task explicitly calls for one.
- Accessibility is part of completion: interactive controls need labels, keyboard focus, and visible error text.

## TypeScript rules

- Keep strict type checking enabled.
- Do not use `any` to bypass design work. Use `unknown` at untrusted boundaries and narrow it.
- Prefer discriminated unions for diagnostics and state transitions.
- Export types only from intentional module entry points.
- Avoid boolean parameters when an explicit options object or union is clearer.
- Add exhaustive checks for closed unions.
- Keep domain types serializable unless a document states otherwise.

## Testing rules

Every behavior change requires a test at the lowest useful level.

- Pure domain transformations: unit tests.
- SQL support: fixture tests.
- Persistence format and migrations: unit tests.
- User-critical flows: Playwright tests.
- Layout output: test stable properties, not exact pixel coordinates, unless the algorithm contract requires exact coordinates.

Minimum regression cases include:

- Inline primary key
- Table-level and composite primary key
- Inline foreign key
- Table-level and composite foreign key
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
- Schema-qualified identifiers
- `NOT NULL`, `UNIQUE`, and `DEFAULT`
- Invalid SQL preserving the previous diagram
- Local persistence round trip

## Change discipline

- Make the smallest coherent change that satisfies the task.
- Inspect existing code and tests before editing.
- Do not perform unrelated refactors.
- Do not rename public modules, domain fields, storage keys, or exported document fields without a migration plan.
- Prefer a sequence of reviewable changes over one broad rewrite.
- Update relevant documentation in the same change when behavior, scope, commands, or architecture changes.
- Do not create commits, tags, releases, or pull requests unless explicitly requested.

## Completion report

At the end of a Codex task, report:

1. What changed.
2. Which files changed.
3. Which checks were run and their results.
4. Any assumptions or unresolved risks.
5. The next smallest recommended task, if relevant.

Do not claim a command passed unless it was actually run successfully.
