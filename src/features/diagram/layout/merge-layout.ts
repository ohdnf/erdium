import type { DiagramGraph } from "../graph/model";
import {
  createEmptyDiagramLayout,
  type DiagramLayout,
  type DiagramPosition,
  type DiagramViewport
} from "./model";

export type AutoLayoutMergeMode = "preserve-existing" | "replace-all";

export function mergeAutoLayout(input: {
  graph: DiagramGraph;
  currentLayout: DiagramLayout;
  autoPositions: Record<string, DiagramPosition>;
  mode: AutoLayoutMergeMode;
}): DiagramLayout {
  const positions: Record<string, DiagramPosition> = {};

  for (const node of input.graph.nodes) {
    const existingPosition = input.currentLayout.positions[node.id];
    const autoPosition = input.autoPositions[node.id];

    if (input.mode === "preserve-existing" && existingPosition) {
      positions[node.id] = existingPosition;
      continue;
    }

    positions[node.id] = autoPosition ?? existingPosition ?? { x: 0, y: 0 };
  }

  return {
    positions,
    viewport: input.currentLayout.viewport
  };
}

export function pruneLayoutToGraph(
  layout: DiagramLayout,
  graph: DiagramGraph
): DiagramLayout {
  const positions: Record<string, DiagramPosition> = {};

  for (const node of graph.nodes) {
    const existingPosition = layout.positions[node.id];

    if (existingPosition) {
      positions[node.id] = existingPosition;
    }
  }

  return {
    positions,
    viewport: layout.viewport
  };
}

export function hasMissingPositions(
  graph: DiagramGraph,
  layout: DiagramLayout
): boolean {
  return graph.nodes.some((node) => layout.positions[node.id] === undefined);
}

export function updateNodePosition(
  layout: DiagramLayout,
  nodeId: string,
  position: DiagramPosition
): DiagramLayout {
  return {
    ...layout,
    positions: {
      ...layout.positions,
      [nodeId]: position
    }
  };
}

export function updateViewport(
  layout: DiagramLayout,
  viewport: DiagramViewport
): DiagramLayout {
  return {
    ...layout,
    viewport
  };
}

export function ensureDiagramLayout(layout: DiagramLayout | null): DiagramLayout {
  return layout ?? createEmptyDiagramLayout();
}
