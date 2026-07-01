"use client";

import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  type NodeTypes
} from "@xyflow/react";
import { useEffect, useMemo } from "react";
import type { DiagramGraph } from "../graph/model";
import type {
  DiagramLayout,
  DiagramPosition,
  DiagramViewport
} from "../layout/model";
import {
  defaultForeignKeyEdgeOptions,
  toReactFlowEdges,
  toReactFlowNodes
} from "../react-flow/to-react-flow-elements";
import type { ForeignKeyFlowEdge, TableFlowNode } from "../react-flow/types";
import { TableNode } from "./table-node";

const nodeTypes = {
  table: TableNode
} satisfies NodeTypes;

interface SchemaDiagramProps {
  graph: DiagramGraph;
  layout: DiagramLayout;
  onNodePositionChange: (nodeId: string, position: DiagramPosition) => void;
  onViewportChange: (viewport: DiagramViewport) => void;
}

export function SchemaDiagram({
  graph,
  layout,
  onNodePositionChange,
  onViewportChange
}: SchemaDiagramProps) {
  const initialNodes = useMemo(
    () => toReactFlowNodes(graph, layout),
    [graph, layout]
  );
  const [nodes, setNodes, onNodesChange] =
    useNodesState<TableFlowNode>(initialNodes);
  const edges = useMemo(() => toReactFlowEdges(graph), [graph]);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  return (
    <div
      className="schema-diagram"
      aria-label="Entity relationship diagram"
      data-testid="schema-diagram"
    >
      <ReactFlow<TableFlowNode, ForeignKeyFlowEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, node) =>
          onNodePositionChange(node.id, node.position)
        }
        viewport={layout.viewport}
        onViewportChange={onViewportChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultForeignKeyEdgeOptions}
        nodesConnectable={false}
        edgesReconnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd4dc" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
