import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createColumnId, createTableId } from "../../../domain/schema";
import { parsePostgresSql } from "./parse-postgres-sql";

const basicSql = readFileSync(
  resolve(process.cwd(), "fixtures/postgres/basic.sql"),
  "utf8"
);

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

  it("does not silently ignore inline references before foreign-key normalization", () => {
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: `
        CREATE TABLE app.organizations (id BIGSERIAL PRIMARY KEY);
        CREATE TABLE app.projects (
          id BIGSERIAL PRIMARY KEY,
          organization_id BIGINT REFERENCES app.organizations (id)
        );
      `
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "UNSUPPORTED_FEATURE",
        severity: "error",
        details: expect.objectContaining({
          feature: "REFERENCES"
        })
      })
    );
  });
});
