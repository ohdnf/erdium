import type { DatabaseSchema } from "../../../domain/schema";
import type {
  DiagramLayout,
  DiagramPosition,
  DiagramViewport
} from "../../diagram/layout/model";

export const PROJECT_DOCUMENT_FORMAT_VERSION = 1;
export const DEFAULT_LOCAL_PROJECT_ID = "local-default";

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
