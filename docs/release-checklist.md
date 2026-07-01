# Phase 1 Release Checklist

- Status: Release hardening audit
- Last updated: 2026-07-01

## PRD Success Criteria

| Criterion | Status | Evidence |
|---|---|---|
| Supported PostgreSQL fixtures parse successfully | Done | `pnpm test`; `fixtures/postgres/basic.sql`, `foreign-key.sql`, `alter-table.sql`, and `performance-50-tables.sql` |
| Tables, columns, primary keys, unique constraints, and foreign keys render | Done | `pnpm test`; `pnpm test:e2e`; diagram graph and browser assertions |
| Foreign-key edges connect source and target tables correctly | Done | Parser adapter tests, graph mapper tests, and Playwright diagram checks |
| Drag, pan, zoom, fit view, and automatic layout are available | Done | React Flow workspace plus Playwright critical paths |
| Invalid SQL diagnostics preserve the previous valid diagram | Done | Editor reducer tests and Playwright invalid-SQL flow |
| Refresh restores SQL and layout | Done | Project document validation, localStorage adapter, and Playwright refresh flow |
| JSON import/export and PNG export are available from the UI | Done | Serialization tests and Playwright download/import/export flows |
| Unit, fixture, and Playwright tests pass | Done | `pnpm test`; `pnpm test:e2e` |
| Build, lint, and typecheck pass | Done | `pnpm lint`; `pnpm typecheck`; `pnpm build` |
| Public Vercel deployment is available | Pending external deployment | `vercel.json` is configured; production deploy requires an authenticated Vercel project |
| README documents syntax, limitations, architecture, setup, and Codex workflow | Done | `README.md` |

## Release Commands

Run before merging the release-hardening PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Vercel Deployment

The repository includes `vercel.json` with the install and build commands used by the release:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build"
}
```

Production deployment requires a Vercel account linked to this repository:

```bash
pnpm dlx vercel
pnpm dlx vercel --prod
```

Record the production URL here after deployment:

```text
Production URL: pending
```
