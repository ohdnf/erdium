import { describe, expect, it } from "vitest";
import {
  createDiagramPngFilename,
  createProjectExport,
  createProjectFilename,
  parseProjectImportText
} from "./project-export";

const layout = {
  positions: {
    users: { x: 10, y: 20 }
  },
  viewport: { x: 0, y: 0, zoom: 1 }
};

describe("project import/export helpers", () => {
  it("serializes a versioned project document as formatted JSON", () => {
    const exportedProject = createProjectExport({
      sourceSql: "CREATE TABLE users (id BIGSERIAL PRIMARY KEY);",
      layout,
      schemaSnapshot: null
    });

    expect(exportedProject.mimeType).toBe("application/json;charset=utf-8");
    expect(exportedProject.filename).toMatch(/^erdium-project-.+\.json$/);
    expect(exportedProject.contents).toContain('"formatVersion": 1');
    expect(exportedProject.contents.endsWith("\n")).toBe(true);
  });

  it("parses imported project JSON through the shared project document validator", () => {
    const result = parseProjectImportText(
      JSON.stringify({
        formatVersion: 1,
        projectId: "local-default",
        name: "Imported project",
        dialect: "postgresql",
        sourceSql: "CREATE TABLE users (id BIGSERIAL PRIMARY KEY);",
        layout,
        updatedAt: "2026-07-01T00:00:00.000Z"
      })
    );

    expect(result).toMatchObject({
      ok: true,
      document: {
        sourceSql: "CREATE TABLE users (id BIGSERIAL PRIMARY KEY);"
      }
    });
  });

  it("rejects malformed JSON and creates deterministic filenames", () => {
    expect(parseProjectImportText("{").ok).toBe(false);
    expect(createProjectFilename("2026-07-01T00:00:00.000Z")).toBe(
      "erdium-project-2026-07-01T00-00-00-000Z.json"
    );
    expect(
      createDiagramPngFilename(new Date("2026-07-01T00:00:00.000Z"))
    ).toBe("erdium-diagram-2026-07-01T00-00-00-000Z.png");
  });
});
