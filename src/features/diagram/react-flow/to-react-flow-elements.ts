import { MarkerType, type DefaultEdgeOptions } from "@xyflow/react";
import type { DiagramGraph } from "../graph/model";
import type { ForeignKeyFlowEdge, TableFlowNode } from "./types";

export const defaultForeignKeyEdgeOptions = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
    color: "#43616d"
  },
  style: {
    stroke: "#43616d",
    strokeWidth: 2
  }
} satisfies DefaultEdgeOptions;

export function toReactFlowNodes(graph: DiagramGraph): TableFlowNode[] {
  return graph.nodes.map((node, index) => ({
    id: node.id,
    type: "table",
    data: { diagramNode: node },
    position: positionForIndex(index),
    connectable: false
  }));
}

export function toReactFlowEdges(graph: DiagramGraph): ForeignKeyFlowEdge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    type: "smoothstep",
    source: edge.sourceTableId,
    target: edge.targetTableId,
    label: edge.label ?? relationLabel(edge),
    data: { diagramEdge: edge }
  }));
}

function positionForIndex(index: number): { x: number; y: number } {
  const fixedPositions = [
    { x: 0, y: 0 },
    { x: 430, y: 0 },
    { x: 215, y: 300 }
  ];

  return (
    fixedPositions[index] ?? {
      x: (index % 3) * 430,
      y: Math.floor(index / 3) * 300
    }
  );
}

function relationLabel(edge: DiagramGraph["edges"][number]): string {
  return `${edge.sourceColumnIds.length} column FK`;
}
