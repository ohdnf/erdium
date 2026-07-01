import { describe, expect, it } from "vitest";
import type { DiagramGraph } from "../graph/model";
import {
  hasMissingPositions,
  mergeAutoLayout,
  pruneLayoutToGraph,
  updateNodePosition,
  updateViewport
} from "./merge-layout";
import type { DiagramLayout } from "./model";

const graph: DiagramGraph = {
  nodes: [
    {
      id: "table:users",
      tableId: "table:users",
      schemaName: "public",
      tableName: "users",
      displayName: "users",
      columns: []
    },
    {
      id: "table:projects",
      tableId: "table:projects",
      schemaName: "public",
      tableName: "projects",
      displayName: "projects",
      columns: []
    }
  ],
  edges: []
};

const layout: DiagramLayout = {
  positions: {
    "table:users": { x: 10, y: 20 },
    "table:deleted": { x: 999, y: 999 }
  },
  viewport: { x: -100, y: -50, zoom: 0.8 }
};

describe("diagram layout merge", () => {
  it("preserves existing positions and fills new nodes from auto layout", () => {
    const merged = mergeAutoLayout({
      graph,
      currentLayout: layout,
      autoPositions: {
        "table:users": { x: 100, y: 200 },
        "table:projects": { x: 400, y: 200 }
      },
      mode: "preserve-existing"
    });

    expect(merged.positions).toEqual({
      "table:users": { x: 10, y: 20 },
      "table:projects": { x: 400, y: 200 }
    });
    expect(merged.viewport).toEqual(layout.viewport);
  });

  it("replaces all node positions when explicitly requested", () => {
    const merged = mergeAutoLayout({
      graph,
      currentLayout: layout,
      autoPositions: {
        "table:users": { x: 100, y: 200 },
        "table:projects": { x: 400, y: 200 }
      },
      mode: "replace-all"
    });

    expect(merged.positions).toEqual({
      "table:users": { x: 100, y: 200 },
      "table:projects": { x: 400, y: 200 }
    });
  });

  it("prunes positions for deleted nodes", () => {
    expect(pruneLayoutToGraph(layout, graph).positions).toEqual({
      "table:users": { x: 10, y: 20 }
    });
  });

  it("detects missing node positions", () => {
    expect(hasMissingPositions(graph, layout)).toBe(true);
    expect(
      hasMissingPositions(graph, {
        ...layout,
        positions: {
          "table:users": { x: 10, y: 20 },
          "table:projects": { x: 300, y: 20 }
        }
      })
    ).toBe(false);
  });

  it("updates a single node position and viewport immutably", () => {
    const withNodePosition = updateNodePosition(layout, "table:projects", {
      x: 30,
      y: 40
    });
    const withViewport = updateViewport(withNodePosition, {
      x: -25,
      y: -30,
      zoom: 1.2
    });

    expect(withNodePosition.positions["table:projects"]).toEqual({
      x: 30,
      y: 40
    });
    expect(layout.positions["table:projects"]).toBeUndefined();
    expect(withViewport.viewport).toEqual({ x: -25, y: -30, zoom: 1.2 });
  });
});
