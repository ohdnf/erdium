import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createColumnId,
  createTableId,
  type DatabaseSchema,
  type ForeignKeyDefinition,
  type TableDefinition
} from "../../../domain/schema";
import { parsePostgresSql } from "./parse-postgres-sql";

const basicSql = readFileSync(
  resolve(process.cwd(), "fixtures/postgres/basic.sql"),
  "utf8"
);
const foreignKeySql = readFileSync(
  resolve(process.cwd(), "fixtures/postgres/foreign-key.sql"),
  "utf8"
);
const alterTableSql = readFileSync(
  resolve(process.cwd(), "fixtures/postgres/alter-table.sql"),
  "utf8"
);

function expectOkSchema(sql: string): DatabaseSchema {
  const result = parsePostgresSql({
    dialect: "postgresql",
    sql
  });

  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected SQL to parse successfully: ${result.diagnostics.map((item) => item.code).join(", ")}`);
  }

  return result.schema;
}

function expectDiagnosticCode(sql: string, code: string): void {
  const result = parsePostgresSql({
    dialect: "postgresql",
    sql
  });

  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error("Expected SQL normalization to fail.");
  }

  expect(result.diagnostics.some((item) => item.code === code)).toBe(true);
}

function tableByName(
  schema: DatabaseSchema,
  name: string,
  schemaName = "public"
): TableDefinition {
  const table = schema.tables.find((item) => item.name === name && item.schemaName === schemaName);

  expect(table).toBeDefined();

  if (!table) {
    throw new Error(`Expected table ${schemaName}.${name} to exist.`);
  }

  return table;
}

function foreignKeyByName(
  schema: DatabaseSchema,
  name: string
): ForeignKeyDefinition {
  const foreignKey = schema.foreignKeys.find((item) => item.name === name);

  expect(foreignKey).toBeDefined();

  if (!foreignKey) {
    throw new Error(`Expected foreign key ${name} to exist.`);
  }

  return foreignKey;
}

function foreignKeyBySourceColumn(
  schema: DatabaseSchema,
  sourceTable: TableDefinition,
  sourceColumnName: string
): ForeignKeyDefinition {
  const sourceColumnId = createColumnId(sourceTable.id, sourceColumnName);
  const foreignKey = schema.foreignKeys.find((item) => item.sourceColumnIds.includes(sourceColumnId));

  expect(foreignKey).toBeDefined();

  if (!foreignKey) {
    throw new Error(`Expected foreign key from ${sourceTable.displayName}.${sourceColumnName} to exist.`);
  }

  return foreignKey;
}

describe("parsePostgresSql", () => {
  it("normalizes basic.sql into the canonical schema model", () => {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: basicSql
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.schema).toMatchObject({
      version: 1,
      dialect: "postgresql",
      defaultSchema: "public",
      foreignKeys: []
    });
    expect(result.schema.tables).toHaveLength(2);
    expect(result.schema.tables.flatMap((table) => table.columns)).toHaveLength(10);

    const users = result.schema.tables.find((table) => table.name === "users");
    const apiKeys = result.schema.tables.find((table) => table.name === "api_keys");

    expect(users).toBeDefined();
    expect(apiKeys).toBeDefined();
    expect(users).toMatchObject({
      id: createTableId({ schema: "app", table: "users" }),
      schemaName: "app",
      displayName: "app.users"
    });
    expect(apiKeys).toMatchObject({
      id: createTableId({ schema: "app", table: "api_keys" }),
      schemaName: "app",
      displayName: "app.api_keys"
    });
  });

  it("normalizes inline primary key, unique, nullability, types, and defaults", () => {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: basicSql
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const users = result.schema.tables.find((table) => table.name === "users");

    expect(users).toBeDefined();

    if (!users) {
      return;
    }

    const idColumnId = createColumnId(users.id, "id");
    const emailColumnId = createColumnId(users.id, "email");
    const statusColumn = users.columns.find((column) => column.name === "status");
    const createdAtColumn = users.columns.find((column) => column.name === "created_at");
    const idColumn = users.columns.find((column) => column.name === "id");
    const emailColumn = users.columns.find((column) => column.name === "email");

    expect(users.primaryKey?.columnIds).toEqual([idColumnId]);
    expect(idColumn).toMatchObject({
      id: idColumnId,
      ordinal: 1,
      dataType: "BIGSERIAL",
      nullable: false
    });
    expect(emailColumn).toMatchObject({
      id: emailColumnId,
      ordinal: 2,
      dataType: "VARCHAR(255)",
      nullable: false
    });
    expect(users.uniqueConstraints).toHaveLength(1);
    expect(users.uniqueConstraints[0]?.columnIds).toEqual([emailColumnId]);
    expect(statusColumn?.defaultExpression).toBe("'active'");
    expect(createdAtColumn?.defaultExpression).toBe("NOW()");
  });

  it("preserves ordered table-level composite primary and unique keys", () => {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: basicSql
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const apiKeys = result.schema.tables.find((table) => table.name === "api_keys");

    expect(apiKeys).toBeDefined();

    if (!apiKeys) {
      return;
    }

    expect(apiKeys.primaryKey).toMatchObject({
      name: "pk_api_keys",
      columnIds: [
        createColumnId(apiKeys.id, "user_id"),
        createColumnId(apiKeys.id, "key_id")
      ]
    });
    expect(apiKeys.uniqueConstraints).toHaveLength(1);
    expect(apiKeys.uniqueConstraints[0]).toMatchObject({
      name: "uq_api_keys_user_label",
      columnIds: [
        createColumnId(apiKeys.id, "user_id"),
        createColumnId(apiKeys.id, "label")
      ]
    });
  });

  it("normalizes foreign-key.sql into tables and foreign keys", () => {
    const schema = expectOkSchema(foreignKeySql);

    expect(schema.tables).toHaveLength(6);
    expect(schema.tables.flatMap((table) => table.columns)).toHaveLength(22);
    expect(schema.tables.filter((table) => table.primaryKey !== null)).toHaveLength(6);
    expect(schema.tables.filter((table) => (table.primaryKey?.columnIds.length ?? 0) > 1)).toHaveLength(3);
    expect(schema.foreignKeys).toHaveLength(5);
  });

  it("normalizes inline, named, and composite foreign keys", () => {
    const schema = expectOkSchema(foreignKeySql);
    const organizations = tableByName(schema, "organizations");
    const users = tableByName(schema, "users");
    const projects = tableByName(schema, "projects");
    const projectMembers = tableByName(schema, "project_members");
    const locales = tableByName(schema, "locales");
    const localizedLabels = tableByName(schema, "localized_labels");

    expect(foreignKeyBySourceColumn(schema, projects, "organization_id")).toMatchObject({
      name: null,
      sourceTableId: projects.id,
      sourceColumnIds: [createColumnId(projects.id, "organization_id")],
      targetTableId: organizations.id,
      targetColumnIds: [createColumnId(organizations.id, "id")],
      onDelete: "CASCADE",
      onUpdate: null
    });
    expect(foreignKeyByName(schema, "fk_projects_owner")).toMatchObject({
      sourceTableId: projects.id,
      sourceColumnIds: [createColumnId(projects.id, "owner_id")],
      targetTableId: users.id,
      targetColumnIds: [createColumnId(users.id, "id")],
      onDelete: "SET NULL",
      onUpdate: null
    });
    expect(foreignKeyByName(schema, "fk_project_members_project")).toMatchObject({
      sourceTableId: projectMembers.id,
      targetTableId: projects.id,
      onDelete: "CASCADE"
    });
    expect(foreignKeyByName(schema, "fk_project_members_user")).toMatchObject({
      sourceTableId: projectMembers.id,
      targetTableId: users.id,
      onDelete: "CASCADE"
    });
    expect(foreignKeyByName(schema, "fk_localized_labels_locale")).toMatchObject({
      sourceTableId: localizedLabels.id,
      sourceColumnIds: [
        createColumnId(localizedLabels.id, "tenant_id"),
        createColumnId(localizedLabels.id, "locale_code")
      ],
      targetTableId: locales.id,
      targetColumnIds: [
        createColumnId(locales.id, "tenant_id"),
        createColumnId(locales.id, "code")
      ],
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    });
  });

  it("normalizes alter-table.sql foreign keys after table collection", () => {
    const schema = expectOkSchema(alterTableSql);
    const accounts = tableByName(schema, "accounts", "billing");
    const invoices = tableByName(schema, "invoices", "billing");
    const invoiceItems = tableByName(schema, "invoice_items", "billing");

    expect(schema.tables).toHaveLength(3);
    expect(schema.tables.flatMap((table) => table.columns)).toHaveLength(12);
    expect(invoices.uniqueConstraints).toHaveLength(1);
    expect(schema.foreignKeys).toHaveLength(2);
    expect(foreignKeyByName(schema, "fk_invoices_account")).toMatchObject({
      sourceTableId: invoices.id,
      sourceColumnIds: [createColumnId(invoices.id, "account_id")],
      targetTableId: accounts.id,
      targetColumnIds: [createColumnId(accounts.id, "id")],
      onDelete: "RESTRICT",
      onUpdate: "CASCADE"
    });
    expect(foreignKeyByName(schema, "fk_invoice_items_invoice")).toMatchObject({
      sourceTableId: invoiceItems.id,
      sourceColumnIds: [createColumnId(invoiceItems.id, "invoice_id")],
      targetTableId: invoices.id,
      targetColumnIds: [createColumnId(invoices.id, "id")],
      onDelete: "CASCADE",
      onUpdate: null
    });
  });

  it("resolves foreign keys when the referenced table appears later", () => {
    const schema = expectOkSchema(`
      CREATE TABLE child (
        parent_id BIGINT REFERENCES parent (id)
      );
      CREATE TABLE parent (
        id BIGINT PRIMARY KEY
      );
    `);
    const child = tableByName(schema, "child");
    const parent = tableByName(schema, "parent");

    expect(schema.foreignKeys).toHaveLength(1);
    expect(schema.foreignKeys[0]).toMatchObject({
      sourceTableId: child.id,
      sourceColumnIds: [createColumnId(child.id, "parent_id")],
      targetTableId: parent.id,
      targetColumnIds: [createColumnId(parent.id, "id")]
    });
  });

  it("returns a SQL_PARSE_ERROR diagnostic for invalid SQL", () => {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: "CREATE TABLE app.users (id BIGSERIAL PRIMARY KEY, );"
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.diagnostics[0]).toMatchObject({
      code: "SQL_PARSE_ERROR",
      severity: "error"
    });
    expect(result.diagnostics[0]?.range?.start).toMatchObject({
      line: 1,
      column: 51
    });
  });

  it("rejects duplicate table declarations after normalization", () => {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: `
        CREATE TABLE app.users (id BIGSERIAL PRIMARY KEY);
        CREATE TABLE app.users (id BIGSERIAL PRIMARY KEY);
      `
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.diagnostics.some((item) => item.code === "DUPLICATE_TABLE")).toBe(true);
  });

  it("rejects duplicate columns after normalization", () => {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: "CREATE TABLE app.users (id BIGSERIAL PRIMARY KEY, ID TEXT);"
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.diagnostics.some((item) => item.code === "DUPLICATE_COLUMN")).toBe(true);
  });

  it("reports an unknown ALTER TABLE target", () => {
    expectDiagnosticCode(
      `
        CREATE TABLE accounts (id BIGSERIAL PRIMARY KEY);
        ALTER TABLE invoices
          ADD CONSTRAINT fk_invoices_account
          FOREIGN KEY (account_id)
          REFERENCES accounts (id);
      `,
      "UNKNOWN_ALTER_TABLE_TARGET"
    );
  });

  it("reports an unknown foreign-key source column", () => {
    expectDiagnosticCode(
      `
        CREATE TABLE parents (id BIGSERIAL PRIMARY KEY);
        CREATE TABLE children (
          id BIGSERIAL PRIMARY KEY,
          parent_id BIGINT,
          CONSTRAINT fk_children_parent
            FOREIGN KEY (missing_parent_id)
            REFERENCES parents (id)
        );
      `,
      "UNKNOWN_CONSTRAINT_COLUMN"
    );
  });

  it("reports an unknown referenced table", () => {
    expectDiagnosticCode(
      `
        CREATE TABLE children (
          id BIGSERIAL PRIMARY KEY,
          parent_id BIGINT REFERENCES parents (id)
        );
      `,
      "UNRESOLVED_REFERENCE_TABLE"
    );
  });

  it("reports an unknown referenced column", () => {
    expectDiagnosticCode(
      `
        CREATE TABLE parents (id BIGSERIAL PRIMARY KEY);
        CREATE TABLE children (
          id BIGSERIAL PRIMARY KEY,
          parent_id BIGINT REFERENCES parents (missing_id)
        );
      `,
      "UNRESOLVED_REFERENCE_COLUMN"
    );
  });

  it("reports a composite foreign-key column-count mismatch", () => {
    expectDiagnosticCode(
      `
        CREATE TABLE parents (
          tenant_id BIGINT NOT NULL,
          id BIGINT NOT NULL,
          PRIMARY KEY (tenant_id, id)
        );
        CREATE TABLE children (
          tenant_id BIGINT NOT NULL,
          parent_id BIGINT NOT NULL,
          CONSTRAINT fk_children_parent
            FOREIGN KEY (tenant_id, parent_id)
            REFERENCES parents (id)
        );
      `,
      "FOREIGN_KEY_COLUMN_COUNT_MISMATCH"
    );
  });

  it("reports unsupported non-foreign-key ALTER TABLE changes", () => {
    expectDiagnosticCode(
      `
        CREATE TABLE users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT
        );
        ALTER TABLE users
          ADD CONSTRAINT uq_users_email UNIQUE (email);
      `,
      "UNSUPPORTED_FEATURE"
    );
  });
});
