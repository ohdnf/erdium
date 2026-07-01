import type { DatabaseSchema } from "../../../domain/schema";
import type {
  DiagramLayout,
  DiagramPosition,
  DiagramViewport
} from "../../diagram/layout/model";

export const PROJECT_DOCUMENT_FORMAT_VERSION = 1;
export const DEFAULT_LOCAL_PROJECT_ID = "local-default";
export const MAX_PROJECT_IMPORT_BYTES = 1_048_576;
export const MAX_SOURCE_SQL_CHARS = 262_144;
export const PROJECT_IMPORT_SIZE_LIMIT_MESSAGE =
  "Project JSON import must be 1 MiB or smaller.";
export const SOURCE_SQL_SIZE_LIMIT_MESSAGE =
  "SQL source must be 256 KiB or smaller.";

export interface ProjectDocumentV1 {
  formatVersion: 1;
  projectId: string;
  name: string;
  dialect: "postgresql";
  sourceSql: string;
  layout: DiagramLayout;
  schemaSnapshot?: DatabaseSchema;
  updatedAt: string;
}

export type ProjectDocumentParseResult =
  | {
      ok: true;
      document: ProjectDocumentV1;
    }
  | {
      ok: false;
      message: string;
    };

export type ProjectLimitValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

export function createProjectDocument(input: {
  sourceSql: string;
  layout: DiagramLayout;
  schemaSnapshot: DatabaseSchema | null;
}): ProjectDocumentV1 {
  return {
    formatVersion: PROJECT_DOCUMENT_FORMAT_VERSION,
    projectId: DEFAULT_LOCAL_PROJECT_ID,
    name: "Untitled Erdium project",
    dialect: "postgresql",
    sourceSql: input.sourceSql,
    layout: input.layout,
    ...(input.schemaSnapshot ? { schemaSnapshot: input.schemaSnapshot } : {}),
    updatedAt: new Date().toISOString()
  };
}

export function parseProjectDocument(
  value: unknown
): ProjectDocumentParseResult {
  if (!isRecord(value)) {
    return invalidProject("Project document must be an object.");
  }

  if (value.formatVersion !== PROJECT_DOCUMENT_FORMAT_VERSION) {
    return invalidProject("Unsupported project document version.");
  }

  if (value.dialect !== "postgresql") {
    return invalidProject("Unsupported project dialect.");
  }

  if (
    typeof value.projectId !== "string" ||
    typeof value.name !== "string" ||
    typeof value.sourceSql !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return invalidProject("Project document metadata is invalid.");
  }

  const sourceSizeValidation = validateSourceSqlLength(value.sourceSql);

  if (!sourceSizeValidation.ok) {
    return invalidProject(sourceSizeValidation.message);
  }

  const layout = parseDiagramLayout(value.layout);

  if (!layout) {
    return invalidProject("Project layout is invalid.");
  }

  return {
    ok: true,
    document: {
      formatVersion: PROJECT_DOCUMENT_FORMAT_VERSION,
      projectId: value.projectId,
      name: value.name,
      dialect: "postgresql",
      sourceSql: value.sourceSql,
      layout,
      ...(isDatabaseSchemaSnapshot(value.schemaSnapshot)
        ? { schemaSnapshot: value.schemaSnapshot }
        : {}),
      updatedAt: value.updatedAt
    }
  };
}

export function validateProjectImportSize(
  sizeBytes: number
): ProjectLimitValidationResult {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return {
      ok: false,
      message: "Project JSON import size is invalid."
    };
  }

  if (sizeBytes > MAX_PROJECT_IMPORT_BYTES) {
    return {
      ok: false,
      message: PROJECT_IMPORT_SIZE_LIMIT_MESSAGE
    };
  }

  return { ok: true };
}

export function validateSourceSqlLength(
  sourceSql: string
): ProjectLimitValidationResult {
  if (sourceSql.length > MAX_SOURCE_SQL_CHARS) {
    return {
      ok: false,
      message: SOURCE_SQL_SIZE_LIMIT_MESSAGE
    };
  }

  return { ok: true };
}

function parseDiagramLayout(value: unknown): DiagramLayout | null {
  if (!isRecord(value) || !isRecord(value.positions)) {
    return null;
  }

  const viewport = parseViewport(value.viewport);

  if (!viewport) {
    return null;
  }

  const positions: Record<string, DiagramPosition> = {};

  for (const [nodeId, position] of Object.entries(value.positions)) {
    const parsedPosition = parsePosition(position);

    if (!parsedPosition) {
      return null;
    }

    positions[nodeId] = parsedPosition;
  }

  return {
    positions,
    viewport
  };
}

function parseViewport(value: unknown): DiagramViewport | null {
  if (!isRecord(value)) {
    return null;
  }

  const position = parsePosition(value);

  if (!position || typeof value.zoom !== "number" || !Number.isFinite(value.zoom)) {
    return null;
  }

  return {
    ...position,
    zoom: value.zoom
  };
}

function parsePosition(value: unknown): DiagramPosition | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.x !== "number" ||
    typeof value.y !== "number" ||
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y)
  ) {
    return null;
  }

  return {
    x: value.x,
    y: value.y
  };
}

function isDatabaseSchemaSnapshot(value: unknown): value is DatabaseSchema {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    value.dialect === "postgresql" &&
    typeof value.defaultSchema === "string" &&
    Array.isArray(value.tables) &&
    Array.isArray(value.foreignKeys)
  );
}

function invalidProject(message: string): ProjectDocumentParseResult {
  return {
    ok: false,
    message
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
