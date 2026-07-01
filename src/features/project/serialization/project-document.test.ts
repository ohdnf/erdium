import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCAL_PROJECT_ID,
  MAX_PROJECT_IMPORT_BYTES,
  MAX_SOURCE_SQL_CHARS,
  PROJECT_IMPORT_SIZE_LIMIT_MESSAGE,
  SOURCE_SQL_SIZE_LIMIT_MESSAGE,
  createProjectDocument,
  parseProjectDocument,
  validateProjectImportSize,
  validateSourceSqlLength
} from "./project-document";

describe("project document serialization", () => {
  it("creates a versioned local project document", () => {
    const document = createProjectDocument({
      sourceSql: "CREATE TABLE users (id BIGSERIAL PRIMARY KEY);",
      layout: {
        positions: {
          users: { x: 10, y: 20 }
        },
        viewport: { x: -5, y: -10, zoom: 0.9 }
      },
      schemaSnapshot: null
    });

    expect(document).toMatchObject({
      formatVersion: 1,
      projectId: DEFAULT_LOCAL_PROJECT_ID,
      dialect: "postgresql",
      sourceSql: "CREATE TABLE users (id BIGSERIAL PRIMARY KEY);",
      layout: {
        positions: {
          users: { x: 10, y: 20 }
        },
        viewport: { x: -5, y: -10, zoom: 0.9 }
      }
    });
    expect(typeof document.updatedAt).toBe("string");
  });

  it("validates a stored project document", () => {
    const result = parseProjectDocument({
      formatVersion: 1,
      projectId: "local-default",
      name: "Stored project",
      dialect: "postgresql",
      sourceSql: "CREATE TABLE users (id BIGSERIAL PRIMARY KEY);",
      layout: {
        positions: {
          users: { x: 10, y: 20 }
        },
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      updatedAt: "2026-07-01T00:00:00.000Z"
    });

    expect(result).toMatchObject({
      ok: true,
      document: {
        sourceSql: "CREATE TABLE users (id BIGSERIAL PRIMARY KEY);",
        layout: {
          positions: {
            users: { x: 10, y: 20 }
          },
          viewport: { x: 0, y: 0, zoom: 1 }
        }
      }
    });
  });

  it("rejects unsupported versions and malformed positions", () => {
    expect(parseProjectDocument({ formatVersion: 2 }).ok).toBe(false);
    expect(
      parseProjectDocument({
        formatVersion: 1,
        projectId: "local-default",
        name: "Stored project",
        dialect: "postgresql",
        sourceSql: "",
        layout: {
          positions: {
            users: { x: "10", y: 20 }
          },
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        updatedAt: "2026-07-01T00:00:00.000Z"
      }).ok
    ).toBe(false);
  });

  it("rejects project documents with oversized SQL source", () => {
    const result = parseProjectDocument({
      formatVersion: 1,
      projectId: "local-default",
      name: "Stored project",
      dialect: "postgresql",
      sourceSql: "x".repeat(MAX_SOURCE_SQL_CHARS + 1),
      layout: {
        positions: {},
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      updatedAt: "2026-07-01T00:00:00.000Z"
    });

    expect(result).toEqual({
      ok: false,
      message: SOURCE_SQL_SIZE_LIMIT_MESSAGE
    });
  });

  it("validates project import and SQL source size limits", () => {
    expect(validateProjectImportSize(MAX_PROJECT_IMPORT_BYTES)).toEqual({
      ok: true
    });
    expect(validateProjectImportSize(MAX_PROJECT_IMPORT_BYTES + 1)).toEqual({
      ok: false,
      message: PROJECT_IMPORT_SIZE_LIMIT_MESSAGE
    });
    expect(validateSourceSqlLength("x".repeat(MAX_SOURCE_SQL_CHARS))).toEqual({
      ok: true
    });
    expect(validateSourceSqlLength("x".repeat(MAX_SOURCE_SQL_CHARS + 1))).toEqual({
      ok: false,
      message: SOURCE_SQL_SIZE_LIMIT_MESSAGE
    });
  });
});
