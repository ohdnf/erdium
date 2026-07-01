import type { DatabaseSchema, TableDefinition } from "../../../domain/schema";
import type { DiagramColumn, DiagramGraph, DiagramNode } from "./model";

export function schemaToDiagramGraph(schema: DatabaseSchema): DiagramGraph {
  const foreignKeySourceColumnIds = new Set(
    schema.foreignKeys.flatMap((foreignKey) => foreignKey.sourceColumnIds)
  );

  return {
    nodes: schema.tables.map((table) =>
      tableToDiagramNode(table, foreignKeySourceColumnIds)
    ),
    edges: schema.foreignKeys.map((foreignKey) => ({
      id: foreignKey.id,
      foreignKeyId: foreignKey.id,
      sourceTableId: foreignKey.sourceTableId,
      sourceColumnIds: foreignKey.sourceColumnIds,
      targetTableId: foreignKey.targetTableId,
      targetColumnIds: foreignKey.targetColumnIds,
      label: foreignKey.name,
      onDelete: foreignKey.onDelete,
      onUpdate: foreignKey.onUpdate
    }))
  };
}

function tableToDiagramNode(
  table: TableDefinition,
  foreignKeySourceColumnIds: ReadonlySet<string>
): DiagramNode {
  const primaryKeyColumnIds = new Set(table.primaryKey?.columnIds ?? []);
  const uniqueColumnIds = new Set(
    table.uniqueConstraints.flatMap((constraint) => constraint.columnIds)
  );

  return {
    id: table.id,
    tableId: table.id,
    schemaName: table.schemaName,
    tableName: table.name,
    displayName: table.displayName,
    columns: table.columns.map((column): DiagramColumn => ({
      id: column.id,
      columnId: column.id,
      displayName: column.displayName,
      dataType: column.dataType,
      nullable: column.nullable,
      defaultExpression: column.defaultExpression,
      isPrimaryKey: primaryKeyColumnIds.has(column.id),
      isForeignKey: foreignKeySourceColumnIds.has(column.id),
      isUnique: uniqueColumnIds.has(column.id)
    }))
  };
}
