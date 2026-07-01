import type { ReferentialAction } from "../../../domain/schema";

export interface DiagramGraph {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface DiagramNode {
  id: string;
  tableId: string;
  schemaName: string;
  tableName: string;
  displayName: string;
  columns: DiagramColumn[];
  width?: number;
  height?: number;
}

export interface DiagramColumn {
  id: string;
  columnId: string;
  displayName: string;
  dataType: string;
  nullable: boolean;
  defaultExpression: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
}

export interface DiagramEdge {
  id: string;
  foreignKeyId: string;
  sourceTableId: string;
  sourceColumnIds: string[];
  targetTableId: string;
  targetColumnIds: string[];
  label: string | null;
  onDelete: ReferentialAction | null;
  onUpdate: ReferentialAction | null;
}
