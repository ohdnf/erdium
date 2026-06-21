import { describe, expect, it } from "vitest";
import {
  REFERENTIAL_ACTIONS,
  type DatabaseSchema,
  type KeyConstraint,
  type ReferentialAction
} from "./model";

describe("schema model", () => {
  it("preserves declared column order for composite keys", () => {
    const primaryKey: KeyConstraint = {
      id: "constraint|17:app.api_keys-pk",
      name: "pk_api_keys",
      columnIds: ["column|7:user_id", "column|6:key_id"]
    };

    expect(primaryKey.columnIds).toEqual([
      "column|7:user_id",
      "column|6:key_id"
    ]);
  });

  it("exposes the documented referential action union", () => {
    const action: ReferentialAction = "SET DEFAULT";

    expect(action).toBe("SET DEFAULT");
    expect(REFERENTIAL_ACTIONS).toEqual([
      "NO ACTION",
      "RESTRICT",
      "CASCADE",
      "SET NULL",
      "SET DEFAULT"
    ]);
  });

  it("keeps the schema serializable", () => {
    const schema: DatabaseSchema = {
      version: 1,
      dialect: "postgresql",
      defaultSchema: "public",
      tables: [],
      foreignKeys: []
    };

    expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
  });
});
