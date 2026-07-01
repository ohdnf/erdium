import { describe, expect, it } from "vitest";
import {
  createColumnId,
  createForeignKeyId,
  createKeyConstraintId,
  createTableId,
  type DatabaseSchema
} from "../../../domain/schema";
import { schemaToDiagramGraph } from "./schema-to-diagram-graph";

const parentTableId = createTableId({ table: "parents" });
const childTableId = createTableId({ table: "children" });
const parentIdColumnId = createColumnId(parentTableId, "id");
const parentCodeColumnId = createColumnId(parentTableId, "code");
const childIdColumnId = createColumnId(childTableId, "id");
const childParentIdColumnId = createColumnId(childTableId, "parent_id");
const childParentCodeColumnId = createColumnId(childTableId, "parent_code");

const schema: DatabaseSchema = {
  version: 1,
  dialect: "postgresql",
  defaultSchema: "public",
  tables: [
    {
      id: parentTableId,
      schemaName: "public",
      name: "parents",
      displayName: "parents",
      columns: [
        {
          id: parentIdColumnId,
          tableId: parentTableId,
          name: "id",
          displayName: "id",
          ordinal: 1,
          dataType: "BIGSERIAL",
          nullable: false,
          defaultExpression: null
        },
        {
          id: parentCodeColumnId,
          tableId: parentTableId,
          name: "code",
          displayName: "code",
          ordinal: 2,
          dataType: "TEXT",
          nullable: false,
          defaultExpression: "'primary'"
        }
      ],
      primaryKey: {
        id: createKeyConstraintId({
          tableId: parentTableId,
          kind: "primary-key",
          columnIds: [parentIdColumnId]
        }),
        name: null,
        columnIds: [parentIdColumnId]
      },
      uniqueConstraints: [
        {
          id: createKeyConstraintId({
            tableId: parentTableId,
            kind: "unique",
            name: "uq_parents_code",
            columnIds: [parentCodeColumnId]
          }),
          name: "uq_parents_code",
          columnIds: [parentCodeColumnId]
        }
      ]
    },
    {
      id: childTableId,
      schemaName: "public",
      name: "children",
      displayName: "children",
      columns: [
        {
          id: childIdColumnId,
          tableId: childTableId,
          name: "id",
          displayName: "id",
          ordinal: 1,
          dataType: "BIGSERIAL",
          nullable: false,
          defaultExpression: null
        },
        {
          id: childParentIdColumnId,
          tableId: childTableId,
          name: "parent_id",
          displayName: "parent_id",
          ordinal: 2,
          dataType: "BIGINT",
          nullable: false,
          defaultExpression: null
        },
        {
          id: childParentCodeColumnId,
          tableId: childTableId,
          name: "parent_code",
          displayName: "parent_code",
          ordinal: 3,
          dataType: "TEXT",
          nullable: true,
          defaultExpression: null
        }
      ],
      primaryKey: {
        id: createKeyConstraintId({
          tableId: childTableId,
          kind: "primary-key",
          columnIds: [childIdColumnId]
        }),
        name: null,
        columnIds: [childIdColumnId]
      },
      uniqueConstraints: []
    }
  ],
  foreignKeys: [
    {
      id: createForeignKeyId({
        name: "fk_children_parent",
        sourceTableId: childTableId,
        sourceColumnIds: [childParentIdColumnId, childParentCodeColumnId],
        targetTableId: parentTableId,
        targetColumnIds: [parentIdColumnId, parentCodeColumnId]
      }),
      name: "fk_children_parent",
      sourceTableId: childTableId,
      sourceColumnIds: [childParentIdColumnId, childParentCodeColumnId],
      targetTableId: parentTableId,
      targetColumnIds: [parentIdColumnId, parentCodeColumnId],
      onDelete: "CASCADE",
      onUpdate: null
    }
  ]
};

describe("schemaToDiagramGraph", () => {
  it("maps one diagram node per table", () => {
    const graph = schemaToDiagramGraph(schema);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.map((node) => node.tableId)).toEqual([
      parentTableId,
      childTableId
    ]);
  });

  it("maps one logical edge per foreign key", () => {
    const graph = schemaToDiagramGraph(schema);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      foreignKeyId: schema.foreignKeys[0]?.id,
      sourceTableId: childTableId,
      sourceColumnIds: [childParentIdColumnId, childParentCodeColumnId],
      targetTableId: parentTableId,
      targetColumnIds: [parentIdColumnId, parentCodeColumnId],
      label: "fk_children_parent",
      onDelete: "CASCADE"
    });
  });

  it("derives column metadata needed for table rendering", () => {
    const graph = schemaToDiagramGraph(schema);
    const parentNode = graph.nodes.find((node) => node.id === parentTableId);
    const childNode = graph.nodes.find((node) => node.id === childTableId);

    expect(
      parentNode?.columns.find((column) => column.displayName === "id")
    ).toMatchObject({
      isPrimaryKey: true,
      isForeignKey: false,
      isUnique: false,
      nullable: false
    });
    expect(
      parentNode?.columns.find((column) => column.displayName === "code")
    ).toMatchObject({
      isPrimaryKey: false,
      isUnique: true,
      defaultExpression: "'primary'"
    });
    expect(
      childNode?.columns.find((column) => column.displayName === "parent_id")
    ).toMatchObject({
      isForeignKey: true,
      nullable: false
    });
  });
});
