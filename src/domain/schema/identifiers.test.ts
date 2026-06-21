import { describe, expect, it } from "vitest";
import {
  createColumnId,
  createForeignKeyId,
  createKeyConstraintId,
  createStableId,
  createTableId,
  normalizePostgresIdentifier,
  normalizeTableIdentifier
} from "./identifiers";

describe("PostgreSQL identifier normalization", () => {
  it("canonicalizes unquoted identifiers to lowercase", () => {
    expect(normalizePostgresIdentifier("Users")).toEqual({
      canonicalName: "users",
      displayName: "Users",
      quoted: false
    });
  });

  it("preserves quoted identifiers after unescaping doubled quotes", () => {
    expect(normalizePostgresIdentifier("\"User\"\"Profiles\"")).toEqual({
      canonicalName: "User\"Profiles",
      displayName: "User\"Profiles",
      quoted: true
    });
  });

  it("uses public as the default schema for unqualified tables", () => {
    const implicitPublicId = createTableId({ table: "users" });
    const explicitPublicId = createTableId({
      schema: "public",
      table: "users"
    });

    expect(implicitPublicId).toBe(explicitPublicId);
    expect(normalizeTableIdentifier({ table: "users" }).schema).toMatchObject({
      canonicalName: "public",
      displayName: "public"
    });
  });

  it("does not collide when identifier parts contain separators or prefixes", () => {
    const idWithDot = createStableId("table", ["app.users", "id"]);
    const idWithSplitParts = createStableId("table", ["app", "users.id"]);
    const idWithPrefixText = createStableId("table", ["3:app", "users"]);

    expect(new Set([idWithDot, idWithSplitParts, idWithPrefixText]).size).toBe(
      3
    );
  });

  it("scopes column IDs by table ID", () => {
    const usersId = createColumnId(createTableId({ table: "users" }), "id");
    const projectsId = createColumnId(
      createTableId({ table: "projects" }),
      "id"
    );

    expect(usersId).not.toBe(projectsId);
  });
});

describe("constraint and relation IDs", () => {
  it("uses normalized constraint names when present", () => {
    const tableId = createTableId({ schema: "app", table: "api_keys" });
    const userId = createColumnId(tableId, "user_id");
    const keyId = createColumnId(tableId, "key_id");

    expect(
      createKeyConstraintId({
        tableId,
        kind: "primary-key",
        name: "PK_API_KEYS",
        columnIds: [userId, keyId]
      })
    ).toBe(
      createKeyConstraintId({
        tableId,
        kind: "primary-key",
        name: "pk_api_keys",
        columnIds: [userId, keyId]
      })
    );
  });

  it("keeps anonymous relation IDs deterministic from relation context", () => {
    const sourceTableId = createTableId({ table: "projects" });
    const targetTableId = createTableId({ table: "organizations" });
    const sourceColumnId = createColumnId(sourceTableId, "organization_id");
    const targetColumnId = createColumnId(targetTableId, "id");

    const relationInput = {
      sourceTableId,
      sourceColumnIds: [sourceColumnId],
      targetTableId,
      targetColumnIds: [targetColumnId]
    };

    expect(createForeignKeyId(relationInput)).toBe(
      createForeignKeyId(relationInput)
    );
  });
});
