"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import type { Diagnostic } from "../../../domain/schema";
import { layoutDiagramGraphWithElk } from "../../../adapters/layout/elk/elk-layout-engine";
import {
  loadLocalProject,
  removeLocalProject,
  saveLocalProject
} from "../../../adapters/persistence/local-storage/local-project-repository";
import { createProjectDocument } from "../../project/serialization/project-document";
import { parsePostgresSql } from "../../../adapters/parser/postgres";
import { SchemaDiagram } from "../../diagram/components/schema-diagram";
import { schemaToDiagramGraph } from "../../diagram/graph/schema-to-diagram-graph";
import {
  hasMissingPositions,
  pruneLayoutToGraph
} from "../../diagram/layout/merge-layout";
import type {
  DiagramPosition,
  DiagramViewport
} from "../../diagram/layout/model";
import { samplePostgresSql } from "../sample-sql";
import {
  createEditorStateFromParseResult,
  editorReducer,
  isDiagramStale,
  type EditorState
} from "../state/editor-state";

type LayoutStatus =
  | {
      kind: "idle";
    }
  | {
      kind: "running";
    }
  | {
      kind: "error";
      message: string;
    };

type PersistenceStatus =
  | "idle"
  | "loading"
  | "saving"
  | "saved"
  | "error";

export function ErdWorkspace() {
  const [state, dispatch] = useReducer(
    editorReducer,
    samplePostgresSql,
    createInitialEditorState
  );
  const [layoutStatus, setLayoutStatus] = useState<LayoutStatus>({
    kind: "idle"
  });
  const [persistenceStatus, setPersistenceStatus] =
    useState<PersistenceStatus>("loading");
  const [storageReady, setStorageReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const graph = useMemo(
    () =>
      state.lastValidSchema
        ? schemaToDiagramGraph(state.lastValidSchema)
        : null,
    [state.lastValidSchema]
  );
  const stale = isDiagramStale(state);
  const needsAutoLayout = graph ? hasMissingPositions(graph, state.layout) : false;

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      const loadResult = loadLocalProject();

      if (cancelled) {
        return;
      }

      if (!loadResult.ok) {
        setStorageMessage(loadResult.message);
        setPersistenceStatus("error");
        setStorageReady(true);
        return;
      }

      if (loadResult.document) {
        const parseResult = parsePostgresSql({
          dialect: "postgresql",
          sql: loadResult.document.sourceSql
        });

        dispatch({
          type: "projectRestored",
          state: createEditorStateFromParseResult(
            loadResult.document.sourceSql,
            parseResult,
            loadResult.document.layout
          )
        });
      }

      setPersistenceStatus("idle");
      setStorageReady(true);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!graph || !needsAutoLayout) {
      return;
    }

    let cancelled = false;

    async function runInitialLayout() {
      if (!graph) {
        return;
      }

      setLayoutStatus({ kind: "running" });
      const layoutResult = await layoutDiagramGraphWithElk(graph);

      if (cancelled) {
        return;
      }

      if (!layoutResult.ok) {
        setLayoutStatus({
          kind: "error",
          message: layoutResult.message
        });
        return;
      }

      dispatch({
        type: "autoLayoutApplied",
        graph,
        positions: layoutResult.positions,
        mode: "preserve-existing"
      });
      setLayoutStatus({ kind: "idle" });
    }

    void runInitialLayout();

    return () => {
      cancelled = true;
    };
  }, [graph, needsAutoLayout]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPersistenceStatus("saving");
      const saveResult = saveLocalProject(
        createProjectDocument({
          sourceSql: state.sourceSql,
          layout: state.layout,
          schemaSnapshot: state.lastValidSchema
        })
      );

      if (saveResult.ok) {
        setStorageMessage(null);
        setPersistenceStatus("saved");
        return;
      }

      setStorageMessage(saveResult.message);
      setPersistenceStatus("error");
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.sourceSql, state.layout, state.lastValidSchema, storageReady]);

  function parseCurrentSql() {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: state.sourceSql
    });

    if (result.ok) {
      const nextGraph = schemaToDiagramGraph(result.schema);

      dispatch({
        type: "parseSucceeded",
        sourceSql: state.sourceSql,
        schema: result.schema,
        diagnostics: result.diagnostics,
        layout: pruneLayoutToGraph(state.layout, nextGraph)
      });
      return;
    }

    dispatch({
      type: "parseFailed",
      diagnostics: result.diagnostics
    });
  }

  async function relayoutAllTables() {
    if (!graph) {
      return;
    }

    setLayoutStatus({ kind: "running" });
    const layoutResult = await layoutDiagramGraphWithElk(graph);

    if (!layoutResult.ok) {
      setLayoutStatus({
        kind: "error",
        message: layoutResult.message
      });
      return;
    }

    dispatch({
      type: "autoLayoutApplied",
      graph,
      positions: layoutResult.positions,
      mode: "replace-all"
    });
    setLayoutStatus({ kind: "idle" });
  }

  function updateNodePosition(nodeId: string, position: DiagramPosition) {
    dispatch({
      type: "nodePositionChanged",
      nodeId,
      position
    });
  }

  function updateDiagramViewport(viewport: DiagramViewport) {
    dispatch({
      type: "viewportChanged",
      viewport
    });
  }

  function resetLocalProject() {
    if (!window.confirm("Reset local SQL and diagram layout?")) {
      return;
    }

    const removeResult = removeLocalProject();
    const parseResult = parsePostgresSql({
      dialect: "postgresql",
      sql: samplePostgresSql
    });

    dispatch({
      type: "projectRestored",
      state: createEditorStateFromParseResult(samplePostgresSql, parseResult)
    });

    if (removeResult.ok) {
      setStorageMessage(null);
      setPersistenceStatus("idle");
      return;
    }

    setStorageMessage(removeResult.message);
    setPersistenceStatus("error");
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
          <button
            type="button"
            onClick={relayoutAllTables}
            disabled={!graph || layoutStatus.kind === "running"}
          >
            Re-layout
          </button>
          <button type="button" onClick={resetLocalProject}>
            Reset local
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
          <ProjectStatus
            layoutStatus={layoutStatus}
            persistenceStatus={persistenceStatus}
            storageMessage={storageMessage}
          />
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
              <SchemaDiagram
                graph={graph}
                layout={state.layout}
                onNodePositionChange={updateNodePosition}
                onViewportChange={updateDiagramViewport}
              />
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

function ProjectStatus({
  layoutStatus,
  persistenceStatus,
  storageMessage
}: {
  layoutStatus: LayoutStatus;
  persistenceStatus: PersistenceStatus;
  storageMessage: string | null;
}) {
  const errorMessage =
    storageMessage ??
    (layoutStatus.kind === "error" ? layoutStatus.message : null);

  if (errorMessage) {
    return (
      <div className="project-status project-status--error" role="alert">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="project-status" role="status">
      {projectStatusText(layoutStatus, persistenceStatus)}
    </div>
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

  if (state.lastValidSchema) {
    return `Parsed ${state.lastValidSchema.tables.length} tables and ${state.lastValidSchema.foreignKeys.length} relationships.`;
  }

  return "Ready to parse.";
}

function projectStatusText(
  layoutStatus: LayoutStatus,
  persistenceStatus: PersistenceStatus
): string {
  if (layoutStatus.kind === "running") {
    return "Applying automatic layout.";
  }

  if (persistenceStatus === "loading") {
    return "Loading local project.";
  }

  if (persistenceStatus === "saving") {
    return "Saving local project.";
  }

  if (persistenceStatus === "saved") {
    return "Local project saved.";
  }

  return "Local project ready.";
}

function diagramSummary(state: EditorState): string {
  if (!state.lastValidSchema) {
    return "No schema";
  }

  return `${state.lastValidSchema.tables.length} tables / ${state.lastValidSchema.foreignKeys.length} relationships`;
}
