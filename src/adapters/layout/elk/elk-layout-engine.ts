import ELK, { type ElkNode } from "elkjs/lib/elk.bundled";
import type { DiagramGraph, DiagramNode } from "../../../features/diagram/graph/model";
import type { DiagramPosition } from "../../../features/diagram/layout/model";

const TABLE_NODE_WIDTH = 304;
const TABLE_HEADER_HEIGHT = 48;
const TABLE_COLUMN_HEIGHT = 40;
const TABLE_VERTICAL_PADDING = 2;

export type ElkLayoutResult =
  | {
      ok: true;
      positions: Record<string, DiagramPosition>;
    }
  | {
      ok: false;
      message: string;
    };

const elk = new ELK({
  defaultLayoutOptions: {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.spacing.nodeNode": "80",
    "elk.layered.spacing.nodeNodeBetweenLayers": "120"
  }
});

export async function layoutDiagramGraphWithElk(
  graph: DiagramGraph
): Promise<ElkLayoutResult> {
  try {
    const result = await elk.layout(toElkGraph(graph));
    const positions: Record<string, DiagramPosition> = {};

    for (const child of result.children ?? []) {
      if (
        typeof child.x !== "number" ||
        typeof child.y !== "number" ||
        !Number.isFinite(child.x) ||
        !Number.isFinite(child.y)
      ) {
        return {
          ok: false,
          message: "Layout did not return finite node positions."
        };
      }

      positions[child.id] = {
        x: child.x,
        y: child.y
      };
    }

    if (Object.keys(positions).length !== graph.nodes.length) {
      return {
        ok: false,
        message: "Layout did not return a position for every table."
      };
    }

    return {
      ok: true,
      positions
    };
  } catch {
    return {
      ok: false,
      message: "Automatic layout failed."
    };
  }
}

function toElkGraph(graph: DiagramGraph): ElkNode {
  return {
    id: "root",
    children: graph.nodes.map(toElkNode),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.sourceTableId],
      targets: [edge.targetTableId]
    }))
  };
}

function toElkNode(node: DiagramNode): ElkNode {
  return {
    id: node.id,
    width: node.width ?? TABLE_NODE_WIDTH,
    height: node.height ?? estimateTableHeight(node)
  };
}

function estimateTableHeight(node: DiagramNode): number {
  return (
    TABLE_HEADER_HEIGHT +
    node.columns.length * TABLE_COLUMN_HEIGHT +
    TABLE_VERTICAL_PADDING
  );
}
