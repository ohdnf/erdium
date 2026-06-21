import type { DatabaseSchema, SqlDialect } from "./model";

export type DiagnosticCode =
  | "SQL_PARSE_ERROR"
  | "UNSUPPORTED_STATEMENT"
  | "UNSUPPORTED_FEATURE"
  | "DUPLICATE_TABLE"
  | "DUPLICATE_COLUMN"
  | "UNKNOWN_ALTER_TABLE_TARGET"
  | "UNKNOWN_CONSTRAINT_COLUMN"
  | "UNRESOLVED_REFERENCE_TABLE"
  | "UNRESOLVED_REFERENCE_COLUMN"
  | "FOREIGN_KEY_COLUMN_COUNT_MISMATCH"
  | "DUPLICATE_CONSTRAINT"
  | "NORMALIZATION_ERROR";

export type DiagnosticSeverity = "warning" | "error";

export interface SourcePosition {
  line: number;
  column: number;
  offset: number | null;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export type DiagnosticDetailValue = string | number | boolean | null;

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  range: SourceRange | null;
  details?: Record<string, DiagnosticDetailValue>;
}

export interface ParseSqlInput {
  dialect: SqlDialect;
  sql: string;
  defaultSchema?: string;
}

export type ParseSqlResult =
  | {
      ok: true;
      schema: DatabaseSchema;
      diagnostics: Diagnostic[];
    }
  | {
      ok: false;
      diagnostics: Diagnostic[];
    };
