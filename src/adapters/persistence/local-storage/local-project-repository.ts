import {
  parseProjectDocument,
  type ProjectDocumentV1
} from "../../../features/project/serialization/project-document";

const LOCAL_PROJECT_STORAGE_KEY = "erdium.project.v1.local-default";

export type LoadLocalProjectResult =
  | {
      ok: true;
      document: ProjectDocumentV1 | null;
    }
  | {
      ok: false;
      message: string;
    };

export type SaveLocalProjectResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

export function loadLocalProject(): LoadLocalProjectResult {
  try {
    const storedValue = window.localStorage.getItem(LOCAL_PROJECT_STORAGE_KEY);

    if (!storedValue) {
      return {
        ok: true,
        document: null
      };
    }

    const parsedJson: unknown = JSON.parse(storedValue);
    const parsedDocument = parseProjectDocument(parsedJson);

    if (!parsedDocument.ok) {
      return {
        ok: false,
        message: parsedDocument.message
      };
    }

    return {
      ok: true,
      document: parsedDocument.document
    };
  } catch {
    return {
      ok: false,
      message: "Stored project could not be read."
    };
  }
}

export function saveLocalProject(
  document: ProjectDocumentV1
): SaveLocalProjectResult {
  try {
    window.localStorage.setItem(
      LOCAL_PROJECT_STORAGE_KEY,
      JSON.stringify(document)
    );

    return {
      ok: true
    };
  } catch {
    return {
      ok: false,
      message: "Project could not be saved locally."
    };
  }
}

export function removeLocalProject(): SaveLocalProjectResult {
  try {
    window.localStorage.removeItem(LOCAL_PROJECT_STORAGE_KEY);

    return {
      ok: true
    };
  } catch {
    return {
      ok: false,
      message: "Stored project could not be removed."
    };
  }
}

export function getLocalProjectStorageKey(): string {
  return LOCAL_PROJECT_STORAGE_KEY;
}
