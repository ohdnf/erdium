import type {
  DatabaseSchema,
  Diagnostic,
  ParseSqlResult
} from "../../../domain/schema";

export type ParseStatus = "idle" | "valid" | "invalid";

export interface EditorState {
  sourceSql: string;
  parseStatus: ParseStatus;
  lastValidSchema: DatabaseSchema | null;
  diagnostics: Diagnostic[];
  lastParsedSql: string | null;
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
    }
  | {
      type: "parseFailed";
      diagnostics: Diagnostic[];
    };

export function createEditorStateFromParseResult(
  sourceSql: string,
  result: ParseSqlResult
): EditorState {
  if (result.ok) {
    return {
      sourceSql,
      parseStatus: "valid",
      lastValidSchema: result.schema,
      diagnostics: result.diagnostics,
      lastParsedSql: sourceSql
    };
  }

  return {
    sourceSql,
    parseStatus: "invalid",
    lastValidSchema: null,
    diagnostics: result.diagnostics,
    lastParsedSql: null
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
        lastParsedSql: action.sourceSql
      };
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
