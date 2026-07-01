import {
  createProjectDocument,
  parseProjectDocument,
  type ProjectDocumentParseResult,
  type ProjectDocumentV1
} from "./project-document";
import type { DatabaseSchema } from "../../../domain/schema";
import type { DiagramLayout } from "../../diagram/layout/model";

const JSON_MIME_TYPE = "application/json;charset=utf-8";

export function createProjectExport(input: {
  sourceSql: string;
  layout: DiagramLayout;
  schemaSnapshot: DatabaseSchema | null;
}): {
  filename: string;
  mimeType: string;
  contents: string;
  document: ProjectDocumentV1;
} {
  const document = createProjectDocument(input);

  return {
    filename: createProjectFilename(document.updatedAt),
    mimeType: JSON_MIME_TYPE,
    contents: `${JSON.stringify(document, null, 2)}\n`,
    document
  };
}

export function parseProjectImportText(text: string): ProjectDocumentParseResult {
  try {
    return parseProjectDocument(JSON.parse(text) as unknown);
  } catch {
    return {
      ok: false,
      message: "Imported project JSON could not be parsed."
    };
  }
}

export function createProjectFilename(updatedAt: string): string {
  const safeTimestamp = updatedAt.replace(/[:.]/g, "-");

  return `erdium-project-${safeTimestamp}.json`;
}

export function createDiagramPngFilename(timestamp = new Date()): string {
  return `erdium-diagram-${timestamp.toISOString().replace(/[:.]/g, "-")}.png`;
}
