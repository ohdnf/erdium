import {
  locationOf,
  parse,
  toSql,
  type AlterTableStatement,
  type ColumnConstraint,
  type ColumnConstraintReference,
  type ConstraintAction,
  type CreateColumnDef,
  type CreateTableStatement,
  type DataTypeDef,
  type Name,
  type PGNode,
  type QName,
  type Statement,
  type TableConstraint,
  type TableConstraintForeignKey
} from "pgsql-ast-parser";
import {
  createColumnId,
  createForeignKeyId,
  createKeyConstraintId,
  createTableId,
  DEFAULT_POSTGRES_SCHEMA,
  normalizePostgresIdentifier,
  normalizeTableIdentifier,
  type Diagnostic,
  type DiagnosticCode,
  type DiagnosticDetailValue,
  type ForeignKeyDefinition,
  type KeyConstraint,
  type ParseSqlInput,
  type ParseSqlResult,
  type ReferentialAction,
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

interface NormalizedCreateTable {
  table: TableDefinition;
  foreignKeys: UnresolvedForeignKey[];
}

interface TableNameLike {
  schema?: string;
  name: string;
}

interface NormalizedTableName {
  id: string;
  schemaName: string;
  name: string;
  displayName: string;
}

interface UnresolvedForeignKey {
  name: Name | null;
  sourceTableId: string;
  sourceColumnNames: readonly Name[];
  targetTable: QName;
  targetColumnNames: readonly Name[];
  onDelete: ConstraintAction | undefined;
  onUpdate: ConstraintAction | undefined;
  node: PGNode;
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
  const tablesById = new Map<string, TableDefinition>();
  const tables: TableDefinition[] = [];
  const unresolvedForeignKeys: UnresolvedForeignKey[] = [];
  const alterTableStatements: AlterTableStatement[] = [];

  for (const statement of statements) {
    if (statement.type === "alter table") {
      alterTableStatements.push(statement);
      continue;
    }

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

    const normalized = normalizeCreateTable(statement, context);

    if (!normalized) {
      continue;
    }

    const { table, foreignKeys } = normalized;

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
    tablesById.set(table.id, table);
    tables.push(table);
    unresolvedForeignKeys.push(...foreignKeys);
  }

  unresolvedForeignKeys.push(...collectAlterTableForeignKeys(alterTableStatements, tablesById, context));
  const foreignKeys = resolveForeignKeys(unresolvedForeignKeys, tablesById, context);

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
      foreignKeys
    },
    diagnostics: context.diagnostics
  };
}

function normalizeCreateTable(
  statement: CreateTableStatement,
  context: NormalizationContext
): NormalizedCreateTable | null {
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

  const tableName = normalizedTableName(statement.name, context.defaultSchema);
  const columns = normalizeColumns(statement, tableName.id, context);
  const keyConstraints = collectKeyConstraints(statement, tableName.id, columns, context);
  const foreignKeys = collectCreateTableForeignKeys(statement, tableName.id, context);

  applyPrimaryKeyNullability(columns, keyConstraints.primaryKey);

  return {
    table: {
      id: tableName.id,
      schemaName: tableName.schemaName,
      name: tableName.name,
      displayName: tableName.displayName,
      columns,
      primaryKey: keyConstraints.primaryKey,
      uniqueConstraints: keyConstraints.uniqueConstraints
    },
    foreignKeys
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

function collectCreateTableForeignKeys(
  statement: CreateTableStatement,
  sourceTableId: string,
  context: NormalizationContext
): UnresolvedForeignKey[] {
  const foreignKeys: UnresolvedForeignKey[] = [];

  for (const column of statement.columns) {
    if (column.kind !== "column") {
      continue;
    }

    for (const constraint of column.constraints ?? []) {
      if (constraint.type !== "reference") {
        continue;
      }

      foreignKeys.push(
        createUnresolvedForeignKey({
          constraint,
          sourceTableId,
          sourceColumnNames: [column.name],
          context
        })
      );
    }
  }

  for (const constraint of statement.constraints ?? []) {
    if (constraint.type !== "foreign key") {
      continue;
    }

    foreignKeys.push(
      createUnresolvedForeignKey({
        constraint,
        sourceTableId,
        sourceColumnNames: constraint.localColumns,
        context
      })
    );
  }

  return foreignKeys;
}

function collectAlterTableForeignKeys(
  statements: readonly AlterTableStatement[],
  tablesById: ReadonlyMap<string, TableDefinition>,
  context: NormalizationContext
): UnresolvedForeignKey[] {
  const foreignKeys: UnresolvedForeignKey[] = [];

  for (const statement of statements) {
    const sourceTableName = normalizedTableName(statement.table, context.defaultSchema);

    if (!tablesById.has(sourceTableName.id)) {
      context.diagnostics.push(
        diagnostic(
          "UNKNOWN_ALTER_TABLE_TARGET",
          "error",
          `ALTER TABLE target does not exist: ${sourceTableName.displayName}.`,
          rangeFromNode(context.sql, statement.table),
          { tableId: sourceTableName.id, table: sourceTableName.displayName }
        )
      );
      continue;
    }

    for (const change of statement.changes) {
      if (change.type !== "add constraint") {
        context.diagnostics.push(
          diagnostic(
            "UNSUPPORTED_FEATURE",
            "error",
            `Unsupported ALTER TABLE change: ${change.type}.`,
            rangeFromNode(context.sql, change),
            { feature: `ALTER TABLE ${change.type.toUpperCase()}` }
          )
        );
        continue;
      }

      if (change.constraint.type !== "foreign key") {
        context.diagnostics.push(
          diagnostic(
            "UNSUPPORTED_FEATURE",
            "error",
            `Unsupported ALTER TABLE ADD CONSTRAINT type: ${change.constraint.type}.`,
            rangeFromNode(context.sql, change.constraint),
            { feature: `ALTER TABLE ADD CONSTRAINT ${change.constraint.type.toUpperCase()}` }
          )
        );
        continue;
      }

      foreignKeys.push(
        createUnresolvedForeignKey({
          constraint: change.constraint,
          sourceTableId: sourceTableName.id,
          sourceColumnNames: change.constraint.localColumns,
          context
        })
      );
    }
  }

  return foreignKeys;
}

function createUnresolvedForeignKey(input: {
  constraint: ColumnConstraintReference | TableConstraintForeignKey;
  sourceTableId: string;
  sourceColumnNames: readonly Name[];
  context: NormalizationContext;
}): UnresolvedForeignKey {
  reportUnsupportedForeignKeyOptions(input.constraint, input.context);

  return {
    name: input.constraint.constraintName ?? null,
    sourceTableId: input.sourceTableId,
    sourceColumnNames: input.sourceColumnNames,
    targetTable: input.constraint.foreignTable,
    targetColumnNames: input.constraint.foreignColumns,
    onDelete: input.constraint.onDelete,
    onUpdate: input.constraint.onUpdate,
    node: input.constraint
  };
}

function resolveForeignKeys(
  unresolvedForeignKeys: readonly UnresolvedForeignKey[],
  tablesById: ReadonlyMap<string, TableDefinition>,
  context: NormalizationContext
): ForeignKeyDefinition[] {
  const foreignKeys: ForeignKeyDefinition[] = [];
  const foreignKeyIds = new Set<string>();

  for (const unresolved of unresolvedForeignKeys) {
    const sourceTable = tablesById.get(unresolved.sourceTableId);

    if (!sourceTable) {
      context.diagnostics.push(
        diagnostic("NORMALIZATION_ERROR", "error", "Foreign key source table was not collected.", rangeFromNode(context.sql, unresolved.node), {
          tableId: unresolved.sourceTableId
        })
      );
      continue;
    }

    if (unresolved.targetColumnNames.length === 0) {
      context.diagnostics.push(
        diagnostic(
          "UNSUPPORTED_FEATURE",
          "error",
          "Foreign keys must specify referenced columns explicitly.",
          rangeFromNode(context.sql, unresolved.node),
          { feature: "REFERENCES_WITHOUT_COLUMNS" }
        )
      );
      continue;
    }

    if (unresolved.sourceColumnNames.length !== unresolved.targetColumnNames.length) {
      context.diagnostics.push(
        diagnostic(
          "FOREIGN_KEY_COLUMN_COUNT_MISMATCH",
          "error",
          "Foreign key source and target column counts differ.",
          rangeFromNode(context.sql, unresolved.node),
          {
            sourceColumnCount: unresolved.sourceColumnNames.length,
            targetColumnCount: unresolved.targetColumnNames.length
          }
        )
      );
      continue;
    }

    const sourceColumnIds = resolveSourceColumnIds(unresolved, sourceTable, context);
    const targetTableName = normalizedTableName(unresolved.targetTable, context.defaultSchema);
    const targetTable = tablesById.get(targetTableName.id);

    if (!targetTable) {
      context.diagnostics.push(
        diagnostic(
          "UNRESOLVED_REFERENCE_TABLE",
          "error",
          `Foreign key references unknown table: ${targetTableName.displayName}.`,
          rangeFromNode(context.sql, unresolved.targetTable),
          { tableId: targetTableName.id, table: targetTableName.displayName }
        )
      );
      continue;
    }

    const targetColumnIds = resolveTargetColumnIds(unresolved, targetTable, context);

    if (sourceColumnIds.length !== unresolved.sourceColumnNames.length || targetColumnIds.length !== unresolved.targetColumnNames.length) {
      continue;
    }

    const foreignKey: ForeignKeyDefinition = {
      id: createForeignKeyId({
        name: unresolved.name?.name ?? null,
        sourceTableId: sourceTable.id,
        sourceColumnIds,
        targetTableId: targetTable.id,
        targetColumnIds
      }),
      name: unresolved.name?.name ?? null,
      sourceTableId: sourceTable.id,
      sourceColumnIds,
      targetTableId: targetTable.id,
      targetColumnIds,
      onDelete: normalizeReferentialAction(unresolved.onDelete),
      onUpdate: normalizeReferentialAction(unresolved.onUpdate)
    };

    if (foreignKeyIds.has(foreignKey.id)) {
      context.diagnostics.push(
        diagnostic("DUPLICATE_CONSTRAINT", "error", "Duplicate foreign-key constraint.", rangeFromNode(context.sql, unresolved.node), {
          constraintId: foreignKey.id
        })
      );
      continue;
    }

    foreignKeyIds.add(foreignKey.id);
    foreignKeys.push(foreignKey);
  }

  return foreignKeys;
}

function resolveSourceColumnIds(
  foreignKey: UnresolvedForeignKey,
  sourceTable: TableDefinition,
  context: NormalizationContext
): string[] {
  const columnIds: string[] = [];

  for (const columnName of foreignKey.sourceColumnNames) {
    const columnId = createColumnId(sourceTable.id, columnName.name);

    if (!sourceTable.columns.some((column) => column.id === columnId)) {
      context.diagnostics.push(
        diagnostic(
          "UNKNOWN_CONSTRAINT_COLUMN",
          "error",
          `Foreign key references unknown source column: ${columnName.name}.`,
          rangeFromNode(context.sql, columnName),
          { tableId: sourceTable.id, column: columnName.name }
        )
      );
      continue;
    }

    columnIds.push(columnId);
  }

  return columnIds;
}

function resolveTargetColumnIds(
  foreignKey: UnresolvedForeignKey,
  targetTable: TableDefinition,
  context: NormalizationContext
): string[] {
  const columnIds: string[] = [];

  for (const columnName of foreignKey.targetColumnNames) {
    const columnId = createColumnId(targetTable.id, columnName.name);

    if (!targetTable.columns.some((column) => column.id === columnId)) {
      context.diagnostics.push(
        diagnostic(
          "UNRESOLVED_REFERENCE_COLUMN",
          "error",
          `Foreign key references unknown target column: ${columnName.name}.`,
          rangeFromNode(context.sql, columnName),
          { tableId: targetTable.id, column: columnName.name }
        )
      );
      continue;
    }

    columnIds.push(columnId);
  }

  return columnIds;
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

function reportUnsupportedForeignKeyOptions(
  constraint: ColumnConstraintReference | TableConstraintForeignKey,
  context: NormalizationContext
): void {
  if (constraint.match) {
    context.diagnostics.push(
      diagnostic("UNSUPPORTED_FEATURE", "error", "Foreign-key MATCH clauses are not supported yet.", rangeFromNode(context.sql, constraint), {
        feature: "MATCH"
      })
    );
  }
}

function normalizeReferentialAction(action: ConstraintAction | undefined): ReferentialAction | null {
  if (!action) {
    return null;
  }

  switch (action) {
    case "cascade":
      return "CASCADE";
    case "no action":
      return "NO ACTION";
    case "restrict":
      return "RESTRICT";
    case "set default":
      return "SET DEFAULT";
    case "set null":
      return "SET NULL";
  }
}

function normalizedTableName(name: TableNameLike, defaultSchema: string): NormalizedTableName {
  const tableIdentifier = normalizeTableIdentifier({
    schema: name.schema,
    table: name.name,
    defaultSchema
  });

  return {
    id: createTableId({
      schema: tableIdentifier.schema.canonicalName,
      table: tableIdentifier.table.canonicalName
    }),
    schemaName: tableIdentifier.schema.canonicalName,
    name: tableIdentifier.table.canonicalName,
    displayName: displayTableName(name, defaultSchema)
  };
}

function displayTableName(name: TableNameLike, defaultSchema: string): string {
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
