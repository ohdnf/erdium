# Product Requirements Document: SQL-to-ERD

- Status: Draft
- Version: 0.1
- Product phase: Phase 1 MVP
- Working title: SQL-to-ERD
- Primary platform: Desktop web browser

## 1. Product summary

SQL-to-ERD is a browser-based developer tool that converts PostgreSQL DDL into an interactive entity-relationship diagram.

A user pastes or writes SQL, explicitly requests parsing, and receives a diagram containing tables, columns, primary keys, unique constraints, and foreign-key relationships. The user can rearrange the diagram and export the result without creating an account.

The Phase 1 MVP is local-first. SQL parsing, diagram generation, and project persistence occur in the browser. User SQL is not executed and is not sent to a server.

## 2. Problem statement

Existing ERD tools can interrupt a schema-design workflow through rigid UI interactions, advertising, account requirements, or manual table-by-table editing. Developers who already have DDL should not need to recreate the same structure through a visual form.

The product should reduce the path from SQL to a usable diagram to one direct workflow:

```text
Paste PostgreSQL DDL -> Parse -> Inspect and arrange ERD -> Save or export
```

## 3. Product objectives

### User objectives

- Produce an ERD from existing PostgreSQL DDL with minimal setup.
- Understand tables and relationships at a glance.
- Retain work after a browser refresh.
- Export a portable project representation and an image.
- Receive useful feedback when SQL cannot be parsed.

### Engineering and portfolio objectives

- Demonstrate a well-defined TypeScript domain model.
- Separate parser, schema, graph, layout, and UI concerns.
- Demonstrate an agent-assisted workflow with tests and explicit constraints.
- Establish extension points for authentication, cloud persistence, database import, and AI analysis without implementing them prematurely.

## 4. Target users

### Primary persona: Backend developer

A developer who can read or write SQL and wants a fast visualization of a schema without manually creating each entity.

Primary needs:

- Accurate PK and FK representation
- Fast iteration
- Predictable diagram interaction
- No account requirement
- Clear SQL support boundaries

### Future persona: Database-design beginner

A developer with limited schema-design experience who needs explanations and review suggestions. This persona becomes a primary target only after deterministic diagram generation is reliable and the AI analysis phase begins.

## 5. Jobs to be done

- When I already have DDL, I want to visualize it immediately so I can review relationships and discuss the schema.
- When I edit DDL, I want to regenerate the diagram without losing every manual layout adjustment.
- When the SQL is invalid or unsupported, I want a specific diagnostic so I can correct it.
- When I leave and return, I want my latest local work restored.
- When I need to share or archive work, I want to export the project or diagram.

## 6. Scope decisions

### Included in Phase 1

- PostgreSQL DDL input
- Manual Parse action
- Sample SQL loading
- Canonical schema normalization
- Table and column rendering
- Primary key, foreign key, unique, nullable, and default metadata
- Foreign-key edges
- Automatic initial layout
- Drag, pan, zoom, and fit-view interactions
- Local browser persistence
- JSON project import and export
- PNG diagram export
- User-visible parser diagnostics
- Public Vercel deployment

### Explicitly excluded from Phase 1

- Authentication
- Cloud project storage
- Direct database connection
- Credential storage
- Multi-user collaboration
- Public sharing links
- AI analysis or generation
- SQL execution
- Multiple SQL dialects
- Mobile-first editing
- Payments
- Version history

## 7. Primary user flow

1. The user opens the application.
2. The application restores the most recent local project when available.
3. The user writes or pastes PostgreSQL DDL, or loads a sample.
4. The user selects **Parse**.
5. The application parses the SQL in the browser.
6. On success, the application converts the result into the canonical schema model.
7. The application maps the schema to a graph and applies an initial layout to newly introduced tables.
8. The application renders the interactive ERD.
9. The user moves tables, pans, zooms, or fits the diagram.
10. The application saves SQL and layout changes locally.
11. The user can export the project as JSON or the diagram as PNG.

## 8. Error flow

1. The user edits previously valid SQL.
2. The user selects **Parse**.
3. The parser returns one or more errors.
4. The application displays diagnostics with line and column when available.
5. The SQL editor retains the user's current input.
6. The diagram retains the last successfully parsed schema and layout.
7. The application makes it clear that the visible diagram represents the last valid parse.

Warnings do not block rendering when the resulting schema remains reliable. Errors block committing a new schema.

## 9. Functional requirements

### FR-001: SQL input

The application shall provide a multiline SQL editor that accepts PostgreSQL DDL as plain text.

Acceptance criteria:

- The editor supports paste, select, undo, redo, and keyboard input through native browser behavior.
- The initial implementation may use a controlled `textarea`.
- The SQL text remains editable after parse errors.
- SQL-derived text is rendered as plain text, not HTML.

### FR-002: Sample SQL

The application shall provide at least one sample schema that can replace the editor content after explicit user action.

Acceptance criteria:

- The user is warned before replacing non-empty unsaved editor content, or replacement is undoable.
- The sample is valid according to the supported coverage document.

### FR-003: Explicit parsing

The application shall parse SQL when the user invokes the Parse action.

Acceptance criteria:

- Parsing is not triggered on every keystroke in the initial MVP.
- The UI exposes pending, success, and error states.
- Duplicate Parse actions do not corrupt state.
- SQL is not executed or sent to a remote service.

### FR-004: Schema extraction

The application shall normalize supported statements into an application-owned `DatabaseSchema` model.

Acceptance criteria:

- Tables have stable IDs.
- Columns have stable IDs scoped to their table.
- Composite primary and foreign keys are represented as ordered column ID arrays.
- Parser-library AST values do not escape the parser adapter.
- The behavior matches `docs/parser-coverage.md`.

### FR-005: Table rendering

The application shall render one diagram node per table.

Acceptance criteria:

- Each node displays the schema-qualified table name when applicable.
- Each node lists column names and PostgreSQL type text.
- Primary-key, foreign-key, unique, and nullable status are visually distinguishable.
- Long names do not make controls unusable.

### FR-006: Relationship rendering

The application shall render supported foreign keys as graph edges.

Acceptance criteria:

- Each edge connects the source table to the referenced table.
- Composite foreign keys remain one logical relation.
- Named constraints expose the constraint name through a label, tooltip, or details panel.
- `ON DELETE` and `ON UPDATE` actions are retained in the model even if the first UI displays them only in details.

### FR-007: Diagram interaction

The application shall support moving and navigating the ERD.

Acceptance criteria:

- A user can drag table nodes.
- A user can pan and zoom.
- A user can fit all visible nodes into the viewport.
- User-adjusted positions persist locally.
- Re-parsing preserves positions for tables with unchanged stable IDs.

### FR-008: Automatic layout

The application shall provide automatic node layout.

Acceptance criteria:

- Initial successful parsing lays out all tables.
- Re-parsing lays out new tables without unnecessarily resetting existing positions.
- A separate explicit action can re-layout the whole diagram.
- Layout failure produces a diagnostic or fallback rather than a page crash.

### FR-009: Diagnostics

The application shall display actionable parser and normalization diagnostics.

Acceptance criteria:

- Each diagnostic has severity, code, message, and optional source range.
- Errors are visually distinct from warnings.
- At least the first error is visible without opening developer tools.
- The previous valid diagram is preserved after an error.

### FR-010: Local persistence

The application shall persist the current local project in browser storage.

Acceptance criteria:

- SQL text, diagram positions, and viewport are restored after refresh.
- Stored data includes a format version.
- Corrupt or unsupported data does not crash the application.
- A user can reset local data through an explicit action.

### FR-011: JSON import and export

The application shall export and import a versioned project document.

Acceptance criteria:

- The export includes SQL source and layout data.
- A schema snapshot may be included as a derived cache but is not the sole source of truth.
- Imported data is validated before use.
- Unsupported versions produce a clear error.
- Import does not silently replace current work without confirmation or an undo path.

### FR-012: PNG export

The application shall export the current diagram as a PNG image.

Acceptance criteria:

- The export contains the visible table nodes and relationship edges.
- The result is usable without the editor controls.
- Export failure is reported to the user.

## 10. Non-functional requirements

### NFR-001: Privacy

- Phase 1 SQL must remain in the browser.
- Full SQL must not be logged to production telemetry.
- No analytics or third-party tracking is required for MVP completion.

### NFR-002: Safety

- User SQL is parsed but never executed.
- Imported JSON is treated as untrusted input.
- SQL-derived names are escaped and displayed as text.

### NFR-003: Reliability

- Invalid SQL must not crash the application.
- Persistence and import failures must leave the user with a recoverable state.
- The production build must pass before release.

### NFR-004: Performance

Performance is validated against a repository-owned reference fixture containing approximately 50 tables.

Targets on a typical modern desktop browser:

- Parse, normalize, map, and render within approximately two seconds for the reference fixture.
- Diagram interactions remain responsive after rendering.
- Heavy parse or layout work is not performed on every keystroke.

These are engineering targets, not contractual guarantees. Profile before introducing workers or complex optimization.

### NFR-005: Accessibility

- All buttons have accessible names.
- The SQL editor has an associated label.
- Diagnostics are available as text and are not conveyed by color alone.
- Keyboard focus is visible.
- Core actions are usable without precise pointer interaction.

### NFR-006: Compatibility

- Prioritize current desktop versions of Chromium, Firefox, and Safari.
- Mobile layout may be viewable but mobile-first editing is not a Phase 1 requirement.

### NFR-007: Maintainability

- Strict TypeScript is enabled.
- Core transformations are pure where practical.
- Vendor-specific types are isolated behind adapters.
- Parser behavior is described by fixtures and tests.
- Storage and export formats are versioned.

## 11. Success criteria for Phase 1

The MVP is complete when all of the following are true:

1. Supported PostgreSQL fixtures parse into the expected schema model.
2. Tables, columns, primary keys, unique constraints, and foreign keys render correctly.
3. Foreign-key edges connect the correct tables and preserve ordered column mappings.
4. Users can drag nodes, pan, zoom, fit view, and request automatic layout.
5. Invalid SQL displays diagnostics and preserves the last valid diagram.
6. Refresh restores SQL and layout from local storage.
7. JSON import/export and PNG export work through the UI.
8. Unit, fixture, and critical Playwright tests pass.
9. `pnpm build`, linting, and type checking pass.
10. A public Vercel deployment is available.
11. The README documents supported syntax, limitations, architecture, local setup, and the Codex-assisted workflow.

## 12. Product validation measures

No production analytics are required for the MVP. Validate through repeatable tasks:

- A new user can load a sample and see an ERD without documentation.
- A user can paste a supported multi-table schema and obtain a diagram in under one minute.
- A user can identify why a deliberately invalid fixture failed.
- A user can refresh the browser without losing the latest project.
- A user can export and re-import a project without losing SQL or node positions.

## 13. Roadmap after Phase 1

### Phase 2: Authentication and cloud persistence

- Optional sign-in
- Cloud project CRUD
- Ownership and authorization
- Migration of the current local project into an account
- Conflict-safe save behavior

Authentication is not a prerequisite for trying the editor. It becomes relevant when users choose cloud persistence.

### Phase 3: PostgreSQL schema import

- Server-side, read-only PostgreSQL connection test
- Metadata extraction through approved catalog queries
- Conversion into the same `DatabaseSchema` model
- Manual re-sync
- No arbitrary user SQL execution
- No persistent credential storage by default

### Phase 4: AI schema analysis

- Deterministic rules first
- AI-generated explanations and recommendations second
- Structured findings with category, severity, evidence, recommendation, and confidence
- Explicit user consent before schema metadata is sent to an AI provider
- No database credentials sent to a model
- Human approval required before applying suggested changes

## 14. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| PostgreSQL grammar complexity expands scope | MVP never finishes | Maintain an explicit parser coverage matrix and reject unsupported syntax clearly |
| Parser library couples the whole application to its AST | Future changes become expensive | Normalize through a repository-owned adapter and canonical model |
| Re-parsing destroys manual layout | Poor usability | Use deterministic stable IDs and merge positions by table ID |
| Diagram libraries leak into domain logic | Hard-to-test code | Keep graph mapping and vendor adapters separate from domain modules |
| Local storage becomes a dead end | Phase 2 rewrite | Use a versioned project document and repository boundary |
| AI roadmap distracts from deterministic correctness | Unreliable core product | Do not begin Phase 4 before parser and schema fixtures are stable |

## 15. Non-blocking open decisions

These decisions are intentionally postponed:

- Public product name and branding
- Exact PostgreSQL parser package after the parser spike
- Rich SQL editor package after the first vertical slice
- Authentication provider
- Cloud database and ORM
- AI provider and model
- Pricing or usage limits
