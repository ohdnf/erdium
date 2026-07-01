import {
  createColumnId,
  createForeignKeyId,
  createKeyConstraintId,
  createTableId,
  type ColumnDefinition,
  type DatabaseSchema,
  type KeyConstraint
} from "../../domain/schema";

const organizationsTableId = createTableId({ table: "organizations" });
const usersTableId = createTableId({ table: "users" });
const projectsTableId = createTableId({ table: "projects" });

const organizationsIdColumnId = createColumnId(organizationsTableId, "id");
const organizationsNameColumnId = createColumnId(organizationsTableId, "name");
const organizationsCreatedAtColumnId = createColumnId(
  organizationsTableId,
  "created_at"
);

const usersIdColumnId = createColumnId(usersTableId, "id");
const usersEmailColumnId = createColumnId(usersTableId, "email");
const usersDisplayNameColumnId = createColumnId(usersTableId, "display_name");

const projectsIdColumnId = createColumnId(projectsTableId, "id");
const projectsOrganizationIdColumnId = createColumnId(
  projectsTableId,
  "organization_id"
);
const projectsOwnerIdColumnId = createColumnId(projectsTableId, "owner_id");
const projectsNameColumnId = createColumnId(projectsTableId, "name");
const projectsCreatedAtColumnId = createColumnId(
  projectsTableId,
  "created_at"
);

export const hardCodedDiagramSql = `CREATE TABLE organizations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(80)
);

CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  owner_id BIGINT,
  name VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_projects_owner
    FOREIGN KEY (owner_id)
    REFERENCES users (id)
    ON DELETE SET NULL
);`;

export const hardCodedDiagramSchema: DatabaseSchema = {
  version: 1,
  dialect: "postgresql",
  defaultSchema: "public",
  tables: [
    {
      id: organizationsTableId,
      schemaName: "public",
      name: "organizations",
      displayName: "organizations",
      columns: [
        column({
          id: organizationsIdColumnId,
          tableId: organizationsTableId,
          name: "id",
          ordinal: 1,
          dataType: "BIGSERIAL",
          nullable: false
        }),
        column({
          id: organizationsNameColumnId,
          tableId: organizationsTableId,
          name: "name",
          ordinal: 2,
          dataType: "VARCHAR(120)",
          nullable: false
        }),
        column({
          id: organizationsCreatedAtColumnId,
          tableId: organizationsTableId,
          name: "created_at",
          ordinal: 3,
          dataType: "TIMESTAMPTZ",
          nullable: false,
          defaultExpression: "NOW()"
        })
      ],
      primaryKey: primaryKey(organizationsTableId, [organizationsIdColumnId]),
      uniqueConstraints: [
        unique(organizationsTableId, "uq_organizations_name", [
          organizationsNameColumnId
        ])
      ]
    },
    {
      id: usersTableId,
      schemaName: "public",
      name: "users",
      displayName: "users",
      columns: [
        column({
          id: usersIdColumnId,
          tableId: usersTableId,
          name: "id",
          ordinal: 1,
          dataType: "BIGSERIAL",
          nullable: false
        }),
        column({
          id: usersEmailColumnId,
          tableId: usersTableId,
          name: "email",
          ordinal: 2,
          dataType: "VARCHAR(255)",
          nullable: false
        }),
        column({
          id: usersDisplayNameColumnId,
          tableId: usersTableId,
          name: "display_name",
          ordinal: 3,
          dataType: "VARCHAR(80)",
          nullable: true
        })
      ],
      primaryKey: primaryKey(usersTableId, [usersIdColumnId]),
      uniqueConstraints: [
        unique(usersTableId, "uq_users_email", [usersEmailColumnId])
      ]
    },
    {
      id: projectsTableId,
      schemaName: "public",
      name: "projects",
      displayName: "projects",
      columns: [
        column({
          id: projectsIdColumnId,
          tableId: projectsTableId,
          name: "id",
          ordinal: 1,
          dataType: "BIGSERIAL",
          nullable: false
        }),
        column({
          id: projectsOrganizationIdColumnId,
          tableId: projectsTableId,
          name: "organization_id",
          ordinal: 2,
          dataType: "BIGINT",
          nullable: false
        }),
        column({
          id: projectsOwnerIdColumnId,
          tableId: projectsTableId,
          name: "owner_id",
          ordinal: 3,
          dataType: "BIGINT",
          nullable: true
        }),
        column({
          id: projectsNameColumnId,
          tableId: projectsTableId,
          name: "name",
          ordinal: 4,
          dataType: "VARCHAR(160)",
          nullable: false
        }),
        column({
          id: projectsCreatedAtColumnId,
          tableId: projectsTableId,
          name: "created_at",
          ordinal: 5,
          dataType: "TIMESTAMPTZ",
          nullable: false,
          defaultExpression: "NOW()"
        })
      ],
      primaryKey: primaryKey(projectsTableId, [projectsIdColumnId]),
      uniqueConstraints: []
    }
  ],
  foreignKeys: [
    {
      id: createForeignKeyId({
        sourceTableId: projectsTableId,
        sourceColumnIds: [projectsOrganizationIdColumnId],
        targetTableId: organizationsTableId,
        targetColumnIds: [organizationsIdColumnId]
      }),
      name: null,
      sourceTableId: projectsTableId,
      sourceColumnIds: [projectsOrganizationIdColumnId],
      targetTableId: organizationsTableId,
      targetColumnIds: [organizationsIdColumnId],
      onDelete: "CASCADE",
      onUpdate: null
    },
    {
      id: createForeignKeyId({
        name: "fk_projects_owner",
        sourceTableId: projectsTableId,
        sourceColumnIds: [projectsOwnerIdColumnId],
        targetTableId: usersTableId,
        targetColumnIds: [usersIdColumnId]
      }),
      name: "fk_projects_owner",
      sourceTableId: projectsTableId,
      sourceColumnIds: [projectsOwnerIdColumnId],
      targetTableId: usersTableId,
      targetColumnIds: [usersIdColumnId],
      onDelete: "SET NULL",
      onUpdate: null
    }
  ]
};

function column(input: {
  id: string;
  tableId: string;
  name: string;
  ordinal: number;
  dataType: string;
  nullable: boolean;
  defaultExpression?: string;
}): ColumnDefinition {
  return {
    id: input.id,
    tableId: input.tableId,
    name: input.name,
    displayName: input.name,
    ordinal: input.ordinal,
    dataType: input.dataType,
    nullable: input.nullable,
    defaultExpression: input.defaultExpression ?? null
  };
}

function primaryKey(tableId: string, columnIds: string[]): KeyConstraint {
  return {
    id: createKeyConstraintId({
      tableId,
      kind: "primary-key",
      columnIds
    }),
    name: null,
    columnIds
  };
}

function unique(
  tableId: string,
  name: string,
  columnIds: string[]
): KeyConstraint {
  return {
    id: createKeyConstraintId({
      tableId,
      kind: "unique",
      name,
      columnIds
    }),
    name,
    columnIds
  };
}
