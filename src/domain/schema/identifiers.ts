export const DEFAULT_POSTGRES_SCHEMA = "public";

export interface PostgresIdentifierToken {
  text: string;
  quoted: boolean;
  displayName?: string;
}

export type PostgresIdentifierInput = string | PostgresIdentifierToken;

export interface NormalizedIdentifier {
  canonicalName: string;
  displayName: string;
  quoted: boolean;
}

export interface NormalizedTableIdentifier {
  schema: NormalizedIdentifier;
  table: NormalizedIdentifier;
}

export interface TableIdentifierInput {
  schema?: PostgresIdentifierInput;
  table: PostgresIdentifierInput;
  defaultSchema?: PostgresIdentifierInput;
}

export type KeyConstraintKind = "primary-key" | "unique";

export interface KeyConstraintIdInput {
  tableId: string;
  kind: KeyConstraintKind;
  name?: PostgresIdentifierInput | null;
  columnIds: readonly string[];
}

export interface ForeignKeyIdInput {
  name?: PostgresIdentifierInput | null;
  sourceTableId: string;
  sourceColumnIds: readonly string[];
  targetTableId: string;
  targetColumnIds: readonly string[];
}

export function normalizePostgresIdentifier(
  input: PostgresIdentifierInput
): NormalizedIdentifier {
  if (typeof input === "string") {
    return normalizeIdentifierText(input, isQuotedIdentifierToken(input));
  }

  const identifier = normalizeIdentifierText(input.text, input.quoted);

  return {
    ...identifier,
    displayName: input.displayName ?? identifier.displayName
  };
}

export function normalizeTableIdentifier(
  input: TableIdentifierInput
): NormalizedTableIdentifier {
  const defaultSchema = input.defaultSchema ?? DEFAULT_POSTGRES_SCHEMA;

  return {
    schema: normalizePostgresIdentifier(input.schema ?? defaultSchema),
    table: normalizePostgresIdentifier(input.table)
  };
}

export function createTableId(input: TableIdentifierInput): string {
  const identifier = normalizeTableIdentifier(input);

  return createStableId("table", [
    identifier.schema.canonicalName,
    identifier.table.canonicalName
  ]);
}

export function createColumnId(
  tableId: string,
  column: PostgresIdentifierInput
): string {
  const identifier = normalizePostgresIdentifier(column);

  return createStableId("column", [tableId, identifier.canonicalName]);
}

export function createKeyConstraintId(input: KeyConstraintIdInput): string {
  const nameParts = createConstraintNameParts(input.name);

  return createStableId("constraint", [
    input.tableId,
    input.kind,
    ...nameParts,
    ...input.columnIds
  ]);
}

export function createForeignKeyId(input: ForeignKeyIdInput): string {
  const nameParts = createConstraintNameParts(input.name);

  return createStableId("foreign-key", [
    input.sourceTableId,
    ...input.sourceColumnIds,
    input.targetTableId,
    ...input.targetColumnIds,
    ...nameParts
  ]);
}

export function createStableId(kind: string, parts: readonly string[]): string {
  return [encodeIdPart(kind), ...parts.map(encodeIdPart)].join("|");
}

function normalizeIdentifierText(
  text: string,
  quoted: boolean
): NormalizedIdentifier {
  if (!quoted) {
    return {
      canonicalName: text.toLowerCase(),
      displayName: text,
      quoted: false
    };
  }

  const unescaped = unescapeQuotedIdentifier(text);

  return {
    canonicalName: unescaped,
    displayName: unescaped,
    quoted: true
  };
}

function createConstraintNameParts(
  name: PostgresIdentifierInput | null | undefined
): string[] {
  if (name == null) {
    return ["anonymous"];
  }

  return ["named", normalizePostgresIdentifier(name).canonicalName];
}

function isQuotedIdentifierToken(text: string): boolean {
  return text.length >= 2 && text.startsWith("\"") && text.endsWith("\"");
}

function unescapeQuotedIdentifier(text: string): string {
  const content = isQuotedIdentifierToken(text) ? text.slice(1, -1) : text;

  return content.replaceAll("\"\"", "\"");
}

function encodeIdPart(part: string): string {
  return `${part.length}:${part}`;
}
