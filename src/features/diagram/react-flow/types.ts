import type { Edge, Node } from "@xyflow/react";
import type { DiagramEdge, DiagramNode } from "../graph/model";

export interface TableFlowNodeData extends Record<string, unknown> {
  diagramNode: DiagramNode;
}

export interface ForeignKeyFlowEdgeData extends Record<string, unknown> {
  diagramEdge: DiagramEdge;
}

export type TableFlowNode = Node<TableFlowNodeData, "table">;
export type ForeignKeyFlowEdge = Edge<ForeignKeyFlowEdgeData, "smoothstep">;
