# Codex-Assisted Development Workflow

- Status: Draft
- Version: 0.1

## 1. Purpose

This document defines how Codex is used in this repository. The goal is not to maximize generated code volume. The goal is to make each agent-assisted change small, testable, reviewable, and traceable to a product or architecture requirement.

Codex is treated as an implementation collaborator operating under repository constraints. The human remains responsible for scope, architecture, acceptance, and release decisions.

## 2. Responsibilities

### Human responsibilities

- Select and prioritize the task.
- Define acceptance criteria and non-goals.
- Resolve product ambiguity.
- Approve architecture and dependency choices.
- Review generated changes.
- Validate user experience and release readiness.
- Reject changes that pass tests but violate intent.

### Codex responsibilities

- Read the relevant instructions and existing code before editing.
- Propose a bounded implementation plan.
- Make the smallest coherent change.
- Add or update tests with behavior changes.
- Run the checks it claims to have run.
- Report changed files, results, assumptions, and risks.
- Stop at the requested scope boundary.

## 3. Repository instruction set

Before every task, Codex should inspect:

1. `AGENTS.md`
2. The task description
3. Relevant sections of `docs/prd.md`
4. Relevant sections of `docs/architecture.md`
5. `docs/parser-coverage.md` for parser work
6. Existing tests and neighboring modules

For broad tasks, first ask Codex to identify the applicable requirements by document section or requirement ID.

## 4. One task, one reviewable outcome

Prefer tasks that can be described as one observable outcome.

Good examples:

- Define and test stable PostgreSQL identifier utilities.
- Add the canonical `DatabaseSchema` TypeScript model.
- Normalize `basic.sql` into the expected schema.
- Map a hard-coded schema into vendor-neutral diagram nodes and edges.
- Persist and restore `ProjectDocumentV1` through local storage.

Poor examples:

- Build the whole application.
- Implement parser, UI, authentication, and AI.
- Refactor everything to clean architecture.
- Add every PostgreSQL feature.

A task should usually change one vertical slice or one architectural boundary. Split work when review requires understanding unrelated concerns at once.

## 5. Task template

Use this template in an issue, planning note, or Codex prompt.

```md
# Task

## Outcome
Describe the single user-visible or architectural result.

## Context
Link the relevant PRD, architecture, and parser-coverage sections.

## In scope
- Concrete item
- Concrete item

## Out of scope
- Explicit exclusion
- Explicit exclusion

## Acceptance criteria
- [ ] Observable behavior
- [ ] Test expectation
- [ ] Documentation expectation

## Constraints
- Existing interfaces that must remain stable
- Dependencies that may or may not be added
- Privacy, security, and performance boundaries

## Verification
- `pnpm typecheck`
- `pnpm test -- <target>`
- Other relevant commands
```

## 6. Recommended Codex prompt structure

```text
Read AGENTS.md and the relevant docs before editing.

Implement: <single outcome>.

In scope:
- ...

Out of scope:
- ...

Acceptance criteria:
- ...

Before editing, inspect the existing modules and tests and give a concise plan.
After implementation, run the relevant checks and report:
1. changed files,
2. behavior implemented,
3. commands and results,
4. assumptions or remaining risks.
Do not make unrelated refactors or commits.
```

When the task is a spike, explicitly state that production integration is out of scope.

## 7. Standard task lifecycle

### Step 1: Frame the outcome

The human writes the task with acceptance criteria and exclusions. Avoid implementation prescriptions unless they protect an architecture boundary.

### Step 2: Inspect

Codex inspects:

- Relevant instructions
- Current module layout
- Existing types and tests
- Package scripts
- Similar patterns in the repository

Codex should not edit based only on the prompt when local conventions already exist.

### Step 3: Plan

Codex proposes a short plan containing:

- Files or modules likely to change
- Tests to add or update
- Any uncertainty or dependency decision

The plan should be revised before implementation if it crosses an out-of-scope boundary.

### Step 4: Implement

Implementation rules:

- Prefer pure functions at transformation boundaries.
- Keep vendor-specific types in adapters.
- Do not add speculative abstractions.
- Do not expand SQL coverage without fixtures.
- Do not add future-phase features.
- Preserve existing public behavior unless the task changes it.

### Step 5: Verify narrowly

Run the fastest relevant checks while iterating. Examples:

```text
pnpm test -- identifiers
pnpm test -- postgres-parser
pnpm typecheck
```

Use actual repository script syntax once it exists.

### Step 6: Verify broadly

Before completion, run all checks affected by the task. Shared-domain, parser, persistence, or build changes generally require:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run Playwright when the user flow or browser integration changes.

### Step 7: Review the diff

The human reviews for:

- Product correctness
- Architecture compliance
- Unnecessary complexity
- Error states
- Test quality
- Accessibility
- Security and privacy
- Documentation drift

Passing tests do not replace review.

### Step 8: Record the result

The completion summary should state:

- What changed
- Why it changed
- Files changed
- Checks run and results
- Known limitations
- Suggested next task

## 8. Test-first guidance

Use test-first or fixture-first development for deterministic transformations.

Preferred order for parser work:

1. Add or select a SQL fixture.
2. Write named assertions for the expected `DatabaseSchema` result.
3. Confirm the test fails for the intended reason.
4. Implement the smallest adapter behavior.
5. Add malformed-input coverage.
6. Update parser coverage documentation.

Preferred order for UI work:

1. Define the state or use-case contract.
2. Add pure mapping tests.
3. Build the smallest component.
4. Add a focused interaction test.
5. Add or update a Playwright critical path when warranted.

Do not create brittle snapshots of entire vendor ASTs or pixel-perfect layout output.

## 9. Parser-library spike workflow

The exact PostgreSQL parser package is intentionally undecided. Evaluate candidates in an isolated spike before production integration.

### Spike questions

- Does it run in the browser or through a browser-compatible WebAssembly build?
- Does it expose `CREATE TABLE` and `ALTER TABLE` details required by the fixtures?
- Does it provide source locations for diagnostics?
- What is the client bundle and initialization cost?
- Does it parse quoted and schema-qualified identifiers reliably?
- Is its license compatible with a public repository and deployed application?
- Is maintenance activity acceptable?
- Can its AST be isolated behind a small adapter?

### Spike deliverable

```md
# Parser spike result

## Candidates evaluated
- Candidate A
- Candidate B

## Fixture results
| Fixture | Candidate A | Candidate B |
|---|---|---|

## Browser and bundle observations
...

## Recommendation
...

## Risks
...
```

A spike should not spread candidate AST types through production modules.

## 10. Dependency policy

Before asking Codex to add a dependency, state why the standard platform or current dependencies are insufficient.

A dependency change should include:

- Purpose
- Runtime versus development classification
- Browser/server boundary
- Bundle or operational impact when relevant
- License check for production dependencies
- Removal or replacement plan if it is an experimental spike

Do not ask Codex to perform broad dependency upgrades while implementing an unrelated feature.

## 11. Change-size heuristics

Split a task when one or more are true:

- It changes more than one architectural boundary.
- It combines domain behavior and broad visual redesign.
- It adds a dependency and rewrites existing modules.
- It requires unrelated migrations.
- Review cannot explain the change in one paragraph.
- Failure would be difficult to revert independently.

These are heuristics, not numeric limits. A coherent scaffold task may touch several files; an unclear five-line semantic change may still deserve its own task.

## 12. Review checklist

### Product

- Does the change satisfy the stated user outcome?
- Does it introduce unrequested behavior?
- Are empty, loading, success, warning, and error states addressed where relevant?

### Architecture

- Does domain code remain independent of vendors and frameworks?
- Are source, schema, graph, and layout kept separate?
- Are IDs deterministic and stable?
- Is persisted data versioned?

### Parser

- Is behavior represented in a fixture or focused test?
- Are composite keys preserved in order?
- Are unsupported semantics diagnosed rather than silently discarded?
- Does a parse failure preserve the previous valid diagram?

### TypeScript

- Is strict typing preserved?
- Are untrusted values treated as `unknown` and narrowed?
- Are unions exhaustive?
- Was `any` introduced without justification?

### UI and accessibility

- Do controls have labels?
- Is keyboard focus visible?
- Are errors available as text?
- Does derived state avoid unnecessary synchronization effects?

### Security and privacy

- Is SQL still never executed?
- Is schema content kept local in Phase 1?
- Is imported data validated?
- Was remote telemetry or a third-party script added?

### Verification

- Do tests exercise behavior rather than implementation details?
- Were relevant commands actually run?
- Does the completion report match the observed diff?

## 13. Recovery when Codex goes off scope

Do not continue layering fixes on an over-broad change.

Use this recovery sequence:

1. Stop the current implementation.
2. Restate the required outcome and exclusions.
3. Identify unrelated changed files.
4. Revert or discard unrelated edits.
5. Divide the remaining work into smaller tasks.
6. Re-run the narrow tests before proceeding.

For a high-risk change, begin again from a clean branch or worktree rather than salvaging an opaque diff.

## 14. Suggested initial task sequence

### Task 1: Application scaffold

Outcome:

- Create the Next.js TypeScript application.
- Configure `pnpm`, linting, strict type checking, Vitest, and Playwright.
- Expose the required scripts.
- Render a minimal accessible page.

Out of scope:

- Parser package
- React Flow
- ELK
- Persistence

### Task 2: Canonical schema model

Outcome:

- Add domain types, identifier utilities, diagnostics, and focused tests.

Out of scope:

- Parser AST integration
- UI

### Task 3: PostgreSQL parser spike

Outcome:

- Compare parser candidates against the three fixtures and document a recommendation.

Out of scope:

- Production adapter
- UI integration

### Task 4: Basic parser adapter

Outcome:

- Normalize `fixtures/postgres/basic.sql` into the canonical model.

Out of scope:

- Foreign keys
- React Flow

### Task 5: Foreign-key normalization

Outcome:

- Support the required inline, table-level, composite, and `ALTER TABLE` foreign keys.

### Task 6: Hard-coded diagram vertical slice

Outcome:

- Render a reviewed `DatabaseSchema` value through graph mapping and React Flow.

Out of scope:

- Parser-to-UI connection
- Persistence

### Task 7: Editor-to-diagram integration

Outcome:

- Parse editor SQL on explicit action and render the last valid schema with diagnostics.

### Task 8: Layout and persistence

Outcome:

- Add ELK layout, position merge behavior, local storage, and restoration.

### Task 9: Import and export

Outcome:

- Add validated JSON import/export and PNG export.

### Task 10: Release hardening

Outcome:

- Complete Playwright critical paths, performance fixture, README, and Vercel deployment configuration.

## 15. Example first prompt

```text
Read AGENTS.md, docs/prd.md, docs/architecture.md, and docs/codex-workflow.md.

Implement Task 1: the application scaffold.

In scope:
- Next.js App Router with TypeScript strict mode
- pnpm
- lint, typecheck, Vitest, Playwright, build, and dev scripts
- a minimal accessible page identifying the project as SQL-to-ERD

Out of scope:
- SQL parser dependencies
- React Flow or ELK
- local storage
- authentication, database connections, or AI

Acceptance criteria:
- pnpm lint passes
- pnpm typecheck passes
- pnpm test passes with at least one basic test
- pnpm build passes
- Playwright is configured with one smoke test
- README setup commands match the actual scripts

Inspect the repository before editing and provide a concise plan. Make the smallest coherent change, do not commit, and report files changed and commands run.
```
