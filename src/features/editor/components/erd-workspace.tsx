"use client";

import { useMemo, useReducer } from "react";
import type { Diagnostic } from "../../../domain/schema";
import { parsePostgresSql } from "../../../adapters/parser/postgres";
import { SchemaDiagram } from "../../diagram/components/schema-diagram";
import { schemaToDiagramGraph } from "../../diagram/graph/schema-to-diagram-graph";
import { samplePostgresSql } from "../sample-sql";
import {
  createEditorStateFromParseResult,
  editorReducer,
  isDiagramStale,
  type EditorState
} from "../state/editor-state";

export function ErdWorkspace() {
  const [state, dispatch] = useReducer(
    editorReducer,
    samplePostgresSql,
    createInitialEditorState
  );
  const graph = useMemo(
    () =>
      state.lastValidSchema
        ? schemaToDiagramGraph(state.lastValidSchema)
        : null,
    [state.lastValidSchema]
  );
  const stale = isDiagramStale(state);

  function parseCurrentSql() {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: state.sourceSql
    });

    if (result.ok) {
      dispatch({
        type: "parseSucceeded",
        sourceSql: state.sourceSql,
        schema: result.schema,
        diagnostics: result.diagnostics
      });
      return;
    }

    dispatch({
      type: "parseFailed",
      diagnostics: result.diagnostics
    });
  }

  function loadSampleSql() {
    const shouldConfirm =
      state.sourceSql.trim().length > 0 &&
      state.sourceSql !== samplePostgresSql;

    if (
      shouldConfirm &&
      !window.confirm("Replace the current SQL with the sample schema?")
    ) {
      return;
    }

    dispatch({
      type: "sampleLoaded",
      sourceSql: samplePostgresSql
    });
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">
            Visualize PostgreSQL DDL as an interactive ERD.
          </p>
          <h1>Erdium</h1>
        </div>
        <nav aria-label="Workspace actions" className="toolbar">
          <button
            type="button"
            onClick={parseCurrentSql}
            disabled={state.sourceSql.trim().length === 0}
          >
            Parse
          </button>
          <button type="button" onClick={loadSampleSql}>
            Load sample
          </button>
          <button type="button" disabled>
            Import
          </button>
          <button type="button" disabled>
            Export
          </button>
        </nav>
      </header>

      <div className="workspace-grid">
        <section className="panel sql-panel" aria-labelledby="sql-source-title">
          <div className="panel-heading">
            <h2 id="sql-source-title">SQL source</h2>
            <span>PostgreSQL</span>
          </div>
          <label className="visually-hidden" htmlFor="sql-source">
            SQL source
          </label>
          <textarea
            id="sql-source"
            spellCheck={false}
            value={state.sourceSql}
            onChange={(event) =>
              dispatch({
                type: "sourceChanged",
                sourceSql: event.currentTarget.value
              })
            }
          />
          <WorkspaceStatus state={state} stale={stale} />
          {state.diagnostics.length > 0 ? (
            <ParseDiagnostics diagnostics={state.diagnostics} />
          ) : null}
        </section>

        <section
          className="panel diagram-panel"
          aria-labelledby="diagram-title"
        >
          <div className="panel-heading">
            <h2 id="diagram-title">Diagram</h2>
            <span>{diagramSummary(state)}</span>
          </div>
          <div
            className="diagram-surface"
            aria-label="Erdium diagram canvas"
          >
            {graph ? (
              <SchemaDiagram graph={graph} />
            ) : (
              <div className="diagram-empty" role="status">
                No valid diagram yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function createInitialEditorState(sourceSql: string): EditorState {
  return createEditorStateFromParseResult(
    sourceSql,
    parsePostgresSql({
      dialect: "postgresql",
      sql: sourceSql
    })
  );
}

function WorkspaceStatus({
  state,
  stale
}: {
  state: EditorState;
  stale: boolean;
}) {
  return (
    <div
      className={`parse-status parse-status--${state.parseStatus}`}
      role={state.parseStatus === "invalid" ? "alert" : "status"}
      aria-live="polite"
    >
      {statusText(state, stale)}
    </div>
  );
}

function ParseDiagnostics({ diagnostics }: { diagnostics: Diagnostic[] }) {
  return (
    <section
      className="diagnostics"
      aria-labelledby="parse-diagnostics-title"
    >
      <h3 id="parse-diagnostics-title">Diagnostics</h3>
      <ul>
        {diagnostics.map((diagnostic, index) => (
          <li
            className={`diagnostic diagnostic--${diagnostic.severity}`}
            key={`${diagnostic.code}-${index}`}
          >
            <span className="diagnostic-code">{diagnostic.code}</span>
            <span>{diagnostic.message}</span>
            {diagnostic.range ? (
              <span className="diagnostic-location">
                line {diagnostic.range.start.line}, column{" "}
                {diagnostic.range.start.column}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function statusText(state: EditorState, stale: boolean): string {
  if (state.parseStatus === "invalid") {
    return state.lastValidSchema
      ? "Parse failed. The diagram is showing the last valid schema."
      : "Parse failed. No valid schema is available yet.";
  }

  if (stale && state.lastValidSchema) {
    return "SQL changed since the last successful parse.";
  }

  if (state.parseStatus === "valid" && state.lastValidSchema) {
    return `Parsed ${state.lastValidSchema.tables.length} tables and ${state.lastValidSchema.foreignKeys.length} relationships.`;
  }

  return "Ready to parse.";
}

function diagramSummary(state: EditorState): string {
  if (!state.lastValidSchema) {
    return "No schema";
  }

  return `${state.lastValidSchema.tables.length} tables / ${state.lastValidSchema.foreignKeys.length} relationships`;
}
