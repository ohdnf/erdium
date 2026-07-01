import { describe, expect, it } from "vitest";
import {
  createColumnId,
  createKeyConstraintId,
  createTableId,
  type DatabaseSchema,
  type Diagnostic
} from "../../../domain/schema";
import {
  createEditorStateFromParseResult,
  editorReducer,
  isDiagramStale
} from "./editor-state";

const accountsTableId = createTableId({ table: "accounts" });
const accountsIdColumnId = createColumnId(accountsTableId, "id");

const schema: DatabaseSchema = {
  version: 1,
  dialect: "postgresql",
  defaultSchema: "public",
  tables: [
    {
      id: accountsTableId,
      schemaName: "public",
      name: "accounts",
      displayName: "accounts",
      columns: [
        {
          id: accountsIdColumnId,
          tableId: accountsTableId,
          name: "id",
          displayName: "id",
          ordinal: 1,
          dataType: "BIGSERIAL",
          nullable: false,
          defaultExpression: null
        }
      ],
      primaryKey: {
        id: createKeyConstraintId({
          tableId: accountsTableId,
          kind: "primary-key",
          columnIds: [accountsIdColumnId]
        }),
        name: null,
        columnIds: [accountsIdColumnId]
      },
      uniqueConstraints: []
    }
  ],
  foreignKeys: []
};

const parseError: Diagnostic = {
  code: "SQL_PARSE_ERROR",
  severity: "error",
  message: "Expected statement.",
  range: {
    start: {
      line: 1,
      column: 8,
      offset: 7
    },
    end: {
      line: 1,
      column: 8,
      offset: 7
    }
  }
};

describe("editorReducer", () => {
  it("creates a valid initial state from a successful parse", () => {
    const state = createEditorStateFromParseResult("CREATE TABLE accounts (...);", {
      ok: true,
      schema,
      diagnostics: []
    });

    expect(state).toMatchObject({
      parseStatus: "valid",
      lastValidSchema: schema,
      diagnostics: [],
      lastParsedSql: "CREATE TABLE accounts (...);"
    });
    expect(isDiagramStale(state)).toBe(false);
  });

  it("marks the diagram stale when source SQL changes", () => {
    const initialState = createEditorStateFromParseResult("valid sql", {
      ok: true,
      schema,
      diagnostics: []
    });
    const state = editorReducer(initialState, {
      type: "sourceChanged",
      sourceSql: "valid sql\n-- edited"
    });

    expect(state.parseStatus).toBe("idle");
    expect(state.lastValidSchema).toBe(schema);
    expect(state.lastParsedSql).toBe("valid sql");
    expect(isDiagramStale(state)).toBe(true);
  });

  it("preserves the last valid schema when parsing fails", () => {
    const initialState = createEditorStateFromParseResult("valid sql", {
      ok: true,
      schema,
      diagnostics: []
    });
    const editedState = editorReducer(initialState, {
      type: "sourceChanged",
      sourceSql: "INVALID"
    });
    const failedState = editorReducer(editedState, {
      type: "parseFailed",
      diagnostics: [parseError]
    });

    expect(failedState.parseStatus).toBe("invalid");
    expect(failedState.sourceSql).toBe("INVALID");
    expect(failedState.lastValidSchema).toBe(schema);
    expect(failedState.lastParsedSql).toBe("valid sql");
    expect(failedState.diagnostics).toEqual([parseError]);
    expect(isDiagramStale(failedState)).toBe(true);
  });

  it("commits a new last valid schema after a successful parse", () => {
    const initialState = createEditorStateFromParseResult("valid sql", {
      ok: true,
      schema,
      diagnostics: []
    });
    const parsedState = editorReducer(initialState, {
      type: "parseSucceeded",
      sourceSql: "CREATE TABLE accounts (id BIGSERIAL PRIMARY KEY);",
      schema,
      diagnostics: []
    });

    expect(parsedState.parseStatus).toBe("valid");
    expect(parsedState.lastValidSchema).toBe(schema);
    expect(parsedState.lastParsedSql).toBe(
      "CREATE TABLE accounts (id BIGSERIAL PRIMARY KEY);"
    );
    expect(isDiagramStale(parsedState)).toBe(false);
  });
});
