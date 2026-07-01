import { toPng } from "html-to-image";

export type ExportDiagramPngResult =
  | {
      ok: true;
      dataUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

export async function exportDiagramElementToPng(
  element: HTMLElement
): Promise<ExportDiagramPngResult> {
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: "#eef2f6",
      cacheBust: true,
      pixelRatio: 2,
      filter: shouldIncludeInPng
    });

    return {
      ok: true,
      dataUrl
    };
  } catch {
    return {
      ok: false,
      message: "Diagram PNG export failed."
    };
  }
}

function shouldIncludeInPng(node: HTMLElement): boolean {
  return !node.classList?.contains("react-flow__controls");
}
