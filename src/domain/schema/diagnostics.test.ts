import { describe, expect, it } from "vitest";
import type { Diagnostic, ParseSqlResult } from "./diagnostics";
import type { DatabaseSchema } from "./model";

const emptySchema: DatabaseSchema = {
  version: 1,
  dialect: "postgresql",
  defaultSchema: "public",
  tables: [],
  foreignKeys: []
};

describe("schema diagnostics", () => {
  it("supports successful parse results with warnings", () => {
    const warning: Diagnostic = {
      code: "UNSUPPORTED_FEATURE",
      severity: "warning",
      message: "CHECK constraints are not rendered in the diagram yet.",
      range: null,
      details: {
        statement: "CHECK",
        ignored: true
      }
    };
    const result: ParseSqlResult = {
      ok: true,
      schema: emptySchema,
      diagnostics: [warning]
    };

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
  });

  it("supports failed parse results with source ranges", () => {
    const result: ParseSqlResult = {
      ok: false,
      diagnostics: [
        {
          code: "SQL_PARSE_ERROR",
          severity: "error",
          message: "Expected table name.",
          range: {
            start: { line: 1, column: 14, offset: 13 },
            end: { line: 1, column: 15, offset: 14 }
          }
        }
      ]
    };

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.range?.start.line).toBe(1);
  });

  it("keeps diagnostic details JSON-serializable", () => {
    const diagnostic: Diagnostic = {
      code: "DUPLICATE_TABLE",
      severity: "error",
      message: "Table already exists in the normalized schema.",
      range: null,
      details: {
        tableId: "table|6:public|5:users",
        statementIndex: 2,
        recoverable: false,
        constraintName: null
      }
    };

    expect(JSON.parse(JSON.stringify(diagnostic))).toEqual(diagnostic);
  });
});
