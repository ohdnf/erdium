import {
  locationOf,
  parse,
  toSql,
  type ColumnConstraint,
  type CreateColumnDef,
  type CreateTableStatement,
  type DataTypeDef,
  type Name,
  type PGNode,
  type QName,
  type Statement,
  type TableConstraint
} from "pgsql-ast-parser";
import {
  createColumnId,
  createKeyConstraintId,
  createTableId,
  DEFAULT_POSTGRES_SCHEMA,
  normalizePostgresIdentifier,
  normalizeTableIdentifier,
  type Diagnostic,
  type DiagnosticCode,
  type DiagnosticDetailValue,
  type KeyConstraint,
  type ParseSqlInput,
  type ParseSqlResult,
  type SourcePosition,
  type SourceRange,
  type TableDefinition,
  type ColumnDefinition
} from "../../../domain/schema";

interface NormalizationContext {
  sql: string;
  defaultSchema: string;
  diagnostics: Diagnostic[];
}

interface MutableColumnDefinition extends ColumnDefinition {
  nullable: boolean;
}

export function parsePostgresSql(input: ParseSqlInput): ParseSqlResult {
  if (input.dialect !== "postgresql") {
    return {
      ok: false,
      diagnostics: [
        diagnostic("UNSUPPORTED_STATEMENT", "error", "Only PostgreSQL SQL is supported.", null, {
          dialect: input.dialect
        })
      ]
    };
  }

  const defaultSchema = input.defaultSchema ?? DEFAULT_POSTGRES_SCHEMA;
  let statements: Statement[];

  try {
    statements = parse(input.sql, { locationTracking: true });
  } catch (error: unknown) {
    return {
      ok: false,
      diagnostics: [parseErrorDiagnostic(input.sql, error)]
    };
  }

  const context: NormalizationContext = {
    sql: input.sql,
    defaultSchema,
    diagnostics: []
  };
  const tableIds = new Set<string>();
  const tables: TableDefinition[] = [];

  for (const statement of statements) {
    if (statement.type !== "create table") {
      context.diagnostics.push(
        diagnostic(
          "UNSUPPORTED_STATEMENT",
          "error",
          `Unsupported PostgreSQL statement: ${statement.type}.`,
          rangeFromNode(input.sql, statement),
          { statementType: statement.type }
        )
      );
      continue;
    }

    const table = normalizeCreateTable(statement, context);

    if (!table) {
      continue;
    }

    if (tableIds.has(table.id)) {
      context.diagnostics.push(
        diagnostic("DUPLICATE_TABLE", "error", `Duplicate table: ${table.displayName}.`, rangeFromNode(input.sql, statement), {
          tableId: table.id,
          table: table.displayName
        })
      );
      continue;
    }

    tableIds.add(table.id);
    tables.push(table);
  }

  if (hasErrors(context.diagnostics)) {
    return {
      ok: false,
      diagnostics: context.diagnostics
    };
  }

  return {
    ok: true,
    schema: {
      version: 1,
      dialect: "postgresql",
      defaultSchema,
      tables,
      foreignKeys: []
    },
    diagnostics: context.diagnostics
  };
}

function normalizeCreateTable(
  statement: CreateTableStatement,
  context: NormalizationContext
): TableDefinition | null {
  if (statement.temporary || statement.unlogged || statement.inherits?.length) {
    context.diagnostics.push(
      diagnostic(
        "UNSUPPORTED_FEATURE",
        "error",
        "Temporary, unlogged, and inherited tables are not supported yet.",
        rangeFromNode(context.sql, statement),
        { statementType: statement.type }
      )
    );
    return null;
  }

  const tableIdentifier = normalizeTableIdentifier({
    schema: statement.name.schema,
    table: statement.name.name,
    defaultSchema: context.defaultSchema
  });
  const tableId = createTableId({
    schema: tableIdentifier.schema.canonicalName,
    table: tableIdentifier.table.canonicalName
  });
  const displayName = displayTableName(statement.name, context.defaultSchema);
  const columns = normalizeColumns(statement, tableId, context);
  const keyConstraints = collectKeyConstraints(statement, tableId, columns, context);

  applyPrimaryKeyNullability(columns, keyConstraints.primaryKey);

  return {
    id: tableId,
    schemaName: tableIdentifier.schema.canonicalName,
    name: tableIdentifier.table.canonicalName,
    displayName,
    columns,
    primaryKey: keyConstraints.primaryKey,
    uniqueConstraints: keyConstraints.uniqueConstraints
  };
}

function normalizeColumns(
  statement: CreateTableStatement,
  tableId: string,
  context: NormalizationContext
): MutableColumnDefinition[] {
  const columns: MutableColumnDefinition[] = [];
  const columnIds = new Set<string>();

  for (const [index, column] of statement.columns.entries()) {
    if (column.kind !== "column") {
      context.diagnostics.push(
        diagnostic(
          "UNSUPPORTED_FEATURE",
          "error",
          "CREATE TABLE LIKE columns are not supported yet.",
          rangeFromNode(context.sql, column),
          { feature: "LIKE" }
        )
      );
      continue;
    }

    const normalizedName = normalizePostgresIdentifier(column.name.name);
    const columnId = createColumnId(tableId, normalizedName.canonicalName);

    if (columnIds.has(columnId)) {
      context.diagnostics.push(
        diagnostic("DUPLICATE_COLUMN", "error", `Duplicate column: ${normalizedName.displayName}.`, rangeFromNode(context.sql, column), {
          columnId,
          column: normalizedName.displayName,
          tableId
        })
      );
      continue;
    }

    reportUnsupportedColumnFeatures(column, context);
    columnIds.add(columnId);
    columns.push({
      id: columnId,
      tableId,
      name: normalizedName.canonicalName,
      displayName: normalizedName.displayName,
      ordinal: index + 1,
      dataType: displayDataType(column.dataType, context),
      nullable: columnNullable(column),
      defaultExpression: defaultExpression(column, context)
    });
  }

  return columns;
}

function collectKeyConstraints(
  statement: CreateTableStatement,
  tableId: string,
  columns: readonly ColumnDefinition[],
  context: NormalizationContext
): {
  primaryKey: KeyConstraint | null;
  uniqueConstraints: KeyConstraint[];
} {
  let primaryKey: KeyConstraint | null = null;
  const uniqueConstraints: KeyConstraint[] = [];
  const constraintIds = new Set<string>();

  for (const column of statement.columns) {
    if (column.kind !== "column") {
      continue;
    }

    for (const constraint of column.constraints ?? []) {
      if (constraint.type === "primary key") {
        const key = createKeyConstraint(tableId, "primary-key", constraint.constraintName, [column.name], columns, context);
        primaryKey = acceptPrimaryKey(primaryKey, key, constraint, context);
      }

      if (constraint.type === "unique") {
        acceptUniqueConstraint(
          uniqueConstraints,
          constraintIds,
          createKeyConstraint(tableId, "unique", constraint.constraintName, [column.name], columns, context),
          constraint,
          context
        );
      }
    }
  }

  for (const constraint of statement.constraints ?? []) {
    if (constraint.type === "primary key") {
      const key = createKeyConstraint(tableId, "primary-key", constraint.constraintName, constraint.columns, columns, context);
      primaryKey = acceptPrimaryKey(primaryKey, key, constraint, context);
      continue;
    }

    if (constraint.type === "unique") {
      acceptUniqueConstraint(
        uniqueConstraints,
        constraintIds,
        createKeyConstraint(tableId, "unique", constraint.constraintName, constraint.columns, columns, context),
        constraint,
        context
      );
      continue;
    }

    reportUnsupportedTableConstraint(constraint, context);
  }

  return { primaryKey, uniqueConstraints };
}

function createKeyConstraint(
  tableId: string,
  kind: "primary-key" | "unique",
  name: Name | undefined,
  constraintColumns: readonly Name[],
  columns: readonly ColumnDefinition[],
  context: NormalizationContext
): KeyConstraint {
  const columnIds = constraintColumns.map((constraintColumn) => {
    const columnId = createColumnId(tableId, constraintColumn.name);

    if (!columns.some((column) => column.id === columnId)) {
      context.diagnostics.push(
        diagnostic(
          "UNKNOWN_CONSTRAINT_COLUMN",
          "error",
          `Constraint references unknown column: ${constraintColumn.name}.`,
          rangeFromNode(context.sql, constraintColumn),
          { tableId, column: constraintColumn.name }
        )
      );
    }

    return columnId;
  });

  return {
    id: createKeyConstraintId({
      tableId,
      kind,
      name: name?.name ?? null,
      columnIds
    }),
    name: name?.name ?? null,
    columnIds
  };
}

function acceptPrimaryKey(
  existingPrimaryKey: KeyConstraint | null,
  primaryKey: KeyConstraint,
  node: PGNode,
  context: NormalizationContext
): KeyConstraint | null {
  if (existingPrimaryKey) {
    context.diagnostics.push(
      diagnostic("DUPLICATE_CONSTRAINT", "error", "Multiple primary keys are not supported for one table.", rangeFromNode(context.sql, node), {
        constraintId: primaryKey.id
      })
    );
    return existingPrimaryKey;
  }

  return primaryKey;
}

function acceptUniqueConstraint(
  constraints: KeyConstraint[],
  constraintIds: Set<string>,
  constraint: KeyConstraint,
  node: PGNode,
  context: NormalizationContext
): void {
  if (constraintIds.has(constraint.id)) {
    context.diagnostics.push(
      diagnostic("DUPLICATE_CONSTRAINT", "error", "Duplicate unique constraint.", rangeFromNode(context.sql, node), {
        constraintId: constraint.id
      })
    );
    return;
  }

  constraintIds.add(constraint.id);
  constraints.push(constraint);
}

function applyPrimaryKeyNullability(
  columns: MutableColumnDefinition[],
  primaryKey: KeyConstraint | null
): void {
  if (!primaryKey) {
    return;
  }

  const primaryKeyColumnIds = new Set(primaryKey.columnIds);

  for (const column of columns) {
    if (primaryKeyColumnIds.has(column.id)) {
      column.nullable = false;
    }
  }
}

function reportUnsupportedColumnFeatures(
  column: CreateColumnDef,
  context: NormalizationContext
): void {
  if (column.collate) {
    context.diagnostics.push(
      diagnostic("UNSUPPORTED_FEATURE", "error", "Column collation is not supported yet.", rangeFromNode(context.sql, column.collate), {
        feature: "COLLATE"
      })
    );
  }

  for (const constraint of column.constraints ?? []) {
    if (constraint.type === "reference") {
      context.diagnostics.push(
        diagnostic("UNSUPPORTED_FEATURE", "error", "Inline foreign keys are handled in Milestone 5.", rangeFromNode(context.sql, constraint), {
          feature: "REFERENCES"
        })
      );
    }

    if (constraint.type === "check") {
      context.diagnostics.push(
        diagnostic("UNSUPPORTED_FEATURE", "error", "CHECK constraints are not supported yet.", rangeFromNode(context.sql, constraint), {
          feature: "CHECK"
        })
      );
    }

    if (constraint.type === "add generated") {
      context.diagnostics.push(
        diagnostic("UNSUPPORTED_FEATURE", "error", "Generated columns are not supported yet.", rangeFromNode(context.sql, constraint), {
          feature: "GENERATED"
        })
      );
    }
  }
}

function reportUnsupportedTableConstraint(
  constraint: TableConstraint,
  context: NormalizationContext
): void {
  if (constraint.type === "foreign key") {
    context.diagnostics.push(
      diagnostic("UNSUPPORTED_FEATURE", "error", "Foreign keys are handled in Milestone 5.", rangeFromNode(context.sql, constraint), {
        feature: "FOREIGN KEY"
      })
    );
    return;
  }

  if (constraint.type === "check") {
    context.diagnostics.push(
      diagnostic("UNSUPPORTED_FEATURE", "error", "CHECK constraints are not supported yet.", rangeFromNode(context.sql, constraint), {
        feature: "CHECK"
      })
    );
  }
}

function columnNullable(column: CreateColumnDef): boolean {
  for (const constraint of column.constraints ?? []) {
    if (constraint.type === "not null" || constraint.type === "primary key") {
      return false;
    }
  }

  return true;
}

function defaultExpression(
  column: CreateColumnDef,
  context: NormalizationContext
): string | null {
  const constraint = column.constraints?.find((item): item is Extract<ColumnConstraint, { type: "default" }> => item.type === "default");

  if (!constraint) {
    return null;
  }

  return sourceSlice(context.sql, constraint.default) ?? toSql.expr(constraint.default).trim();
}

function displayDataType(dataType: DataTypeDef, context: NormalizationContext): string {
  return sourceSliceWithBalancedParentheses(context.sql, dataType) ?? toSql.dataType(dataType).trim();
}

function displayTableName(name: QName, defaultSchema: string): string {
  const table = normalizePostgresIdentifier(name.name).displayName;

  if (!name.schema) {
    return table;
  }

  const schema = normalizePostgresIdentifier(name.schema ?? defaultSchema).displayName;

  return `${schema}.${table}`;
}

function sourceSlice(sql: string, node: PGNode): string | null {
  const location = safeLocationOf(node);

  if (!location) {
    return null;
  }

  return sql.slice(location.start, location.end).trim();
}

function sourceSliceWithBalancedParentheses(sql: string, node: PGNode): string | null {
  const location = safeLocationOf(node);

  if (!location) {
    return null;
  }

  let end = location.end;
  let value = sql.slice(location.start, end).trim();

  while (openParenthesisCount(value) > closeParenthesisCount(value) && end < sql.length) {
    end += 1;
    value = sql.slice(location.start, end).trim();
  }

  return value;
}

function openParenthesisCount(value: string): number {
  return [...value].filter((character) => character === "(").length;
}

function closeParenthesisCount(value: string): number {
  return [...value].filter((character) => character === ")").length;
}

function rangeFromNode(sql: string, node: PGNode): SourceRange | null {
  const location = safeLocationOf(node);

  if (!location) {
    return null;
  }

  return {
    start: positionAtOffset(sql, location.start),
    end: positionAtOffset(sql, location.end)
  };
}

function safeLocationOf(node: PGNode): { start: number; end: number } | null {
  try {
    const location = locationOf(node);

    if (Number.isInteger(location.start) && Number.isInteger(location.end)) {
      return location;
    }
  } catch {
    return null;
  }

  return null;
}

function parseErrorDiagnostic(sql: string, error: unknown): Diagnostic {
  const range = parseErrorRange(sql, error);
  const message = error instanceof Error ? error.message : "SQL parse error.";

  return diagnostic("SQL_PARSE_ERROR", "error", message, range);
}

function parseErrorRange(sql: string, error: unknown): SourceRange | null {
  if (!isRecord(error)) {
    return null;
  }

  const token = isRecord(error.token) ? error.token : null;
  const tokenLocation = token && isRecord(token._location) ? token._location : null;
  const start =
    numberValue(tokenLocation?.start) ??
    numberValue(token?.offset) ??
    numberValue(error.offset);
  const end = numberValue(tokenLocation?.end) ?? (start == null ? null : start + 1);

  if (start == null || end == null) {
    return null;
  }

  return {
    start: positionAtOffset(sql, start),
    end: positionAtOffset(sql, end)
  };
}

function positionAtOffset(sql: string, offset: number): SourcePosition {
  let line = 1;
  let column = 1;
  const boundedOffset = Math.max(0, Math.min(offset, sql.length));

  for (let index = 0; index < boundedOffset; index += 1) {
    if (sql[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column, offset: boundedOffset };
}

function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((item) => item.severity === "error");
}

function diagnostic(
  code: DiagnosticCode,
  severity: "warning" | "error",
  message: string,
  range: SourceRange | null,
  details?: Record<string, DiagnosticDetailValue>
): Diagnostic {
  if (!details) {
    return { code, severity, message, range };
  }

  return { code, severity, message, range, details };
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
