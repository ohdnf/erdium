# Erdium

Erdium is a browser-first SQL-to-ERD editor for PostgreSQL DDL.

Phase 1 is local-first: SQL is parsed in the browser, never executed, and not sent to a server. Authentication, cloud persistence, direct database connections, and AI schema analysis are documented future extension points, not part of this scaffold.

## Local Development

```bash
pnpm install
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

## Current Scope

This milestone contains the Next.js App Router scaffold, strict TypeScript configuration, linting, Vitest, Playwright, and a minimal accessible Erdium workspace page.

Out of scope for this milestone:

- PostgreSQL parser dependencies
- React Flow or ELK diagram rendering
- Local storage persistence
- Authentication, database connections, or AI features

## Deployment Note

Vercel is a suitable deployment target for the MVP. The Hobby plan is usage-limited rather than a single-project-only plan, so check the current Vercel limits before release.
