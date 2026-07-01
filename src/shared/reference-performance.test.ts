import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePostgresSql } from "../adapters/parser/postgres";
import { schemaToDiagramGraph } from "../features/diagram/graph/schema-to-diagram-graph";

const referenceSql = readFileSync(
  resolve(process.cwd(), "fixtures/postgres/performance-50-tables.sql"),
  "utf8"
);

describe("reference performance fixture", () => {
  it("parses, normalizes, and maps the 50-table fixture within the MVP target", () => {
    const startedAt = performance.now();
    const result = parsePostgresSql({
      dialect: "postgresql",
      sql: referenceSql
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(
        `Expected performance fixture to parse: ${result.diagnostics.map((diagnostic) => diagnostic.code).join(", ")}`
      );
    }

    const graph = schemaToDiagramGraph(result.schema);
    const elapsedMs = performance.now() - startedAt;

    expect(result.schema.tables).toHaveLength(50);
    expect(result.schema.foreignKeys).toHaveLength(49);
    expect(graph.nodes).toHaveLength(50);
    expect(graph.edges).toHaveLength(49);
    expect(elapsedMs).toBeLessThan(2000);
  });
});
