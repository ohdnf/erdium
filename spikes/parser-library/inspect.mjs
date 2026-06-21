import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { locationOf, parse as parsePgsqlAst } from "pgsql-ast-parser";
import { parse as parsePgsql } from "pgsql-parser";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");

const inputs = [
  fixtureInput("basic.sql"),
  fixtureInput("foreign-key.sql"),
  fixtureInput("alter-table.sql"),
  {
    name: "quoted identifier probe",
    sql: `CREATE TABLE "App"."User.Profile" (
    "ID" BIGSERIAL PRIMARY KEY,
    "display""name" TEXT NOT NULL UNIQUE
);`
  }
];

const candidates = [
  {
    name: "pgsql-ast-parser",
    inspect: inspectPgsqlAstParser
  },
  {
    name: "pgsql-parser",
    inspect: inspectPgsqlParser
  }
];

for (const candidate of candidates) {
  console.log(`\n# ${candidate.name}`);

  for (const input of inputs) {
    const result = await candidate.inspect(input.sql);
    printResult(input.name, result);
  }
}

function fixtureInput(name) {
  return {
    name,
    sql: readFileSync(resolve(repoRoot, "fixtures/postgres", name), "utf8")
  };
}

function inspectPgsqlAstParser(sql) {
  try {
    const ast = parsePgsqlAst(sql, { locationTracking: true });
    const text = JSON.stringify(ast);

    return {
      ok: true,
      statementCount: Array.isArray(ast) ? ast.length : null,
      topLevelKinds: toArray(ast).map(topLevelKind),
      featureHints: featureHints(text),
      location: summarizePgsqlAstLocation(ast),
      sample: summarizeSample(ast)
    };
  } catch (error) {
    return failure(error);
  }
}

async function inspectPgsqlParser(sql) {
  try {
    const ast = await parsePgsql(sql);
    const normalizedAst = normalizePgsqlParserRoot(ast);
    const text = JSON.stringify(normalizedAst);
    const rawStatements = extractRawStatements(normalizedAst);

    return {
      ok: true,
      statementCount: rawStatements.length || null,
      topLevelKinds: rawStatements.length
        ? rawStatements.map(topLevelKind)
        : toArray(normalizedAst).map(topLevelKind),
      featureHints: featureHints(text),
      location: summarizeLocationKeys(normalizedAst),
      sample: summarizeSample(rawStatements.length ? rawStatements : normalizedAst)
    };
  } catch (error) {
    return failure(error);
  }
}

function normalizePgsqlParserRoot(ast) {
  if (Array.isArray(ast)) {
    return ast;
  }

  if (ast && typeof ast === "object" && Array.isArray(ast.stmts)) {
    return ast.stmts;
  }

  return ast;
}

function extractRawStatements(ast) {
  const statements = toArray(ast);

  if (statements.every((statement) => hasOwn(statement, "RawStmt"))) {
    return statements.map((statement) => statement.RawStmt);
  }

  return statements;
}

function featureHints(text) {
  return {
    createTable:
      /create\s*table/i.test(text) ||
      text.includes("CreateStmt") ||
      text.includes('"create table"'),
    alterTable:
      /alter\s*table/i.test(text) ||
      text.includes("AlterTableStmt") ||
      text.includes('"alter table"'),
    foreignKey:
      /foreign\s*key/i.test(text) ||
      text.includes("CONSTR_FOREIGN") ||
      text.includes('"foreign key"') ||
      text.includes('"references"'),
    referentialAction:
      /cascade|restrict|set null|set default|no action/i.test(text) ||
      text.includes("fk_del_action") ||
      text.includes("fk_upd_action"),
    schemaQualified:
      text.includes("schemaname") ||
      text.includes('"schema"') ||
      text.includes('"App"') ||
      text.includes('"app"') ||
      text.includes('"billing"'),
    quotedIdentifier:
      text.includes("User.Profile") || text.includes('display"name'),
    defaultExpression:
      text.includes("NOW") ||
      text.includes("now") ||
      text.includes("CURRENT_DATE") ||
      text.includes("current_date")
  };
}

function summarizePgsqlAstLocation(ast) {
  try {
    const first = toArray(ast)[0];
    const location = first ? locationOf(first) : null;

    return location
      ? {
          supported: true,
          sample: location
        }
      : {
          supported: false,
          sample: null
        };
  } catch (error) {
    return {
      supported: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function summarizeLocationKeys(ast) {
  const keys = new Map();

  visit(ast, (value, key) => {
    if (
      key === "location" ||
      key === "stmt_location" ||
      key === "stmt_len" ||
      key === "locationTrack"
    ) {
      keys.set(key, value);
    }
  });

  return {
    supported: keys.size > 0,
    sample: Object.fromEntries([...keys.entries()].slice(0, 5))
  };
}

function summarizeSample(ast) {
  return toArray(ast).slice(0, 3).map((item) => summarizeNode(item));
}

function summarizeNode(node) {
  if (!node || typeof node !== "object") {
    return node;
  }

  const summary = {};

  for (const key of [
    "type",
    "name",
    "schema",
    "table",
    "columns",
    "constraints",
    "RawStmt",
    "stmt",
    "stmt_location",
    "stmt_len"
  ]) {
    if (hasOwn(node, key)) {
      summary[key] = summarizeValue(node[key]);
    }
  }

  if (Object.keys(summary).length > 0) {
    return summary;
  }

  return {
    keys: Object.keys(node).slice(0, 12)
  };
}

function summarizeValue(value) {
  if (Array.isArray(value)) {
    return {
      arrayLength: value.length,
      first: value.length ? summarizeNode(value[0]) : null
    };
  }

  if (value && typeof value === "object") {
    return summarizeNode(value);
  }

  return value;
}

function topLevelKind(node) {
  if (!node || typeof node !== "object") {
    return typeof node;
  }

  if (typeof node.type === "string") {
    return node.type;
  }

  if (hasOwn(node, "stmt")) {
    return `stmt:${topLevelKind(node.stmt)}`;
  }

  return Object.keys(node)[0] ?? "object";
}

function printResult(inputName, result) {
  console.log(`\n## ${inputName}`);
  console.log(JSON.stringify(result, null, 2));
}

function failure(error) {
  return {
    ok: false,
    errorName: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error)
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : [value];
}

function visit(value, visitor, key = null) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visit(item, visitor, key);
    }

    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [childKey, childValue] of Object.entries(value)) {
    visitor(childValue, childKey);
    visit(childValue, visitor, childKey);
  }
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
