import type {
  DatabaseSchema,
  Diagnostic,
  ParseSqlResult
} from "../../../domain/schema";
import type { DiagramGraph } from "../../diagram/graph/model";
import {
  mergeAutoLayout,
  updateNodePosition,
  updateViewport,
  type AutoLayoutMergeMode
} from "../../diagram/layout/merge-layout";
import {
  createEmptyDiagramLayout,
  type DiagramLayout,
  type DiagramPosition,
  type DiagramViewport
} from "../../diagram/layout/model";

export type ParseStatus = "idle" | "valid" | "invalid";

export interface EditorState {
  sourceSql: string;
  parseStatus: ParseStatus;
  lastValidSchema: DatabaseSchema | null;
  diagnostics: Diagnostic[];
  lastParsedSql: string | null;
  layout: DiagramLayout;
}

export type EditorAction =
  | {
      type: "sourceChanged";
      sourceSql: string;
    }
  | {
      type: "sampleLoaded";
      sourceSql: string;
    }
  | {
      type: "parseSucceeded";
      sourceSql: string;
      schema: DatabaseSchema;
      diagnostics: Diagnostic[];
      layout: DiagramLayout;
    }
  | {
      type: "autoLayoutApplied";
      graph: DiagramGraph;
      positions: Record<string, DiagramPosition>;
      mode: AutoLayoutMergeMode;
    }
  | {
      type: "nodePositionChanged";
      nodeId: string;
      position: DiagramPosition;
    }
  | {
      type: "viewportChanged";
      viewport: DiagramViewport;
    }
  | {
      type: "projectRestored";
      state: EditorState;
    }
  | {
      type: "parseFailed";
      diagnostics: Diagnostic[];
    };

export function createEditorStateFromParseResult(
  sourceSql: string,
  result: ParseSqlResult,
  layout: DiagramLayout = createEmptyDiagramLayout()
): EditorState {
  if (result.ok) {
    return {
      sourceSql,
      parseStatus: "valid",
      lastValidSchema: result.schema,
      diagnostics: result.diagnostics,
      lastParsedSql: sourceSql,
      layout
    };
  }

  return {
    sourceSql,
    parseStatus: "invalid",
    lastValidSchema: null,
    diagnostics: result.diagnostics,
    lastParsedSql: null,
    layout
  };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction
): EditorState {
  switch (action.type) {
    case "sourceChanged":
      return {
        ...state,
        sourceSql: action.sourceSql,
        parseStatus: "idle",
        diagnostics: []
      };
    case "sampleLoaded":
      return {
        ...state,
        sourceSql: action.sourceSql,
        parseStatus: "idle",
        diagnostics: []
      };
    case "parseSucceeded":
      return {
        sourceSql: action.sourceSql,
        parseStatus: "valid",
        lastValidSchema: action.schema,
        diagnostics: action.diagnostics,
        lastParsedSql: action.sourceSql,
        layout: action.layout
      };
    case "autoLayoutApplied":
      return {
        ...state,
        layout: mergeAutoLayout({
          graph: action.graph,
          currentLayout: state.layout,
          autoPositions: action.positions,
          mode: action.mode
        })
      };
    case "nodePositionChanged":
      return {
        ...state,
        layout: updateNodePosition(state.layout, action.nodeId, action.position)
      };
    case "viewportChanged":
      return {
        ...state,
        layout: updateViewport(state.layout, action.viewport)
      };
    case "projectRestored":
      return action.state;
    case "parseFailed":
      return {
        ...state,
        parseStatus: "invalid",
        diagnostics: action.diagnostics
      };
    default:
      return exhaustiveAction(action);
  }
}

export function isDiagramStale(state: EditorState): boolean {
  return state.lastParsedSql !== state.sourceSql;
}

function exhaustiveAction(action: never): never {
  throw new Error(`Unhandled editor action: ${JSON.stringify(action)}`);
}
