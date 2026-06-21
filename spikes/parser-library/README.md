# Parser Library Spike

This folder is an isolated Milestone 3 workspace for comparing PostgreSQL parser candidates.

It is intentionally separate from the root Erdium application:

- The root `package.json` must not depend on parser candidates during this spike.
- Production code under `src/` must not import candidate parser packages.
- The script prints observations for documentation; it does not implement the production parser adapter.

## Commands

```bash
pnpm --dir spikes/parser-library install
pnpm --dir spikes/parser-library run inspect
```

If the user-level npm cache has permission problems, use a temporary cache for npm metadata commands:

```bash
npm_config_cache=/tmp/erdium-npm-cache npm view pgsql-ast-parser version
```

## Interpreting Output

For each candidate and SQL input, inspect:

- whether parsing succeeds,
- top-level statement kinds,
- presence of `CREATE TABLE` and `ALTER TABLE`,
- evidence of foreign-key/reference details,
- evidence of schema-qualified or quoted identifiers,
- source-location support.

Use the output to update `docs/parser-spike.md`. Do not copy full vendor AST snapshots into the docs.
