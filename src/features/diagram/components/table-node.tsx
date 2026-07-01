"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TableFlowNode } from "../react-flow/types";

export function TableNode({ data, isConnectable }: NodeProps<TableFlowNode>) {
  const { diagramNode } = data;

  return (
    <article
      className="erd-table-node"
      aria-label={`Table ${diagramNode.displayName}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <header className="erd-table-header">
        <h3>{diagramNode.displayName}</h3>
        <span>{diagramNode.columns.length} columns</span>
      </header>
      <ul className="erd-column-list">
        {diagramNode.columns.map((column) => (
          <li className="erd-column-row" key={column.id}>
            <span className="erd-column-main">
              <span className="erd-column-name">{column.displayName}</span>
              <span className="erd-column-type">{column.dataType}</span>
            </span>
            <span
              className="erd-column-badges"
              aria-label={columnMetadata(column)}
            >
              {column.isPrimaryKey ? <span>PK</span> : null}
              {column.isForeignKey ? <span>FK</span> : null}
              {column.isUnique ? <span>UQ</span> : null}
              {!column.nullable ? <span>NN</span> : null}
              {column.defaultExpression ? <span>DEF</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </article>
  );
}

function columnMetadata(
  column: TableFlowNode["data"]["diagramNode"]["columns"][number]
): string {
  const metadata = [
    column.isPrimaryKey ? "primary key" : null,
    column.isForeignKey ? "foreign key" : null,
    column.isUnique ? "unique" : null,
    !column.nullable ? "not null" : null,
    column.defaultExpression ? `default ${column.defaultExpression}` : null
  ].filter((item): item is string => item !== null);

  return metadata.length > 0 ? metadata.join(", ") : "nullable column";
}
