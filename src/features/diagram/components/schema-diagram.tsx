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
}

export function SchemaDiagram({ graph }: SchemaDiagramProps) {
  const initialNodes = useMemo(() => toReactFlowNodes(graph), [graph]);
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
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultForeignKeyEdgeOptions}
        nodesConnectable={false}
        edgesReconnectable={false}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd4dc" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
