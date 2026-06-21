export type SqlDialect = "postgresql";

export interface DatabaseSchema {
  version: 1;
  dialect: SqlDialect;
  defaultSchema: string;
  tables: TableDefinition[];
  foreignKeys: ForeignKeyDefinition[];
}

export interface TableDefinition {
  id: string;
  schemaName: string;
  name: string;
  displayName: string;
  columns: ColumnDefinition[];
  primaryKey: KeyConstraint | null;
  uniqueConstraints: KeyConstraint[];
}

export interface ColumnDefinition {
  id: string;
  tableId: string;
  name: string;
  displayName: string;
  ordinal: number;
  dataType: string;
  nullable: boolean;
  defaultExpression: string | null;
}

export interface KeyConstraint {
  id: string;
  name: string | null;
  columnIds: string[];
}

export interface ForeignKeyDefinition {
  id: string;
  name: string | null;
  sourceTableId: string;
  sourceColumnIds: string[];
  targetTableId: string;
  targetColumnIds: string[];
  onDelete: ReferentialAction | null;
  onUpdate: ReferentialAction | null;
}

export const REFERENTIAL_ACTIONS = [
  "NO ACTION",
  "RESTRICT",
  "CASCADE",
  "SET NULL",
  "SET DEFAULT"
] as const;

export type ReferentialAction = (typeof REFERENTIAL_ACTIONS)[number];
