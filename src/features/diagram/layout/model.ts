export interface DiagramPosition {
  x: number;
  y: number;
}

export interface DiagramViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DiagramLayout {
  positions: Record<string, DiagramPosition>;
  viewport: DiagramViewport;
}

export const defaultDiagramViewport: DiagramViewport = {
  x: 0,
  y: 0,
  zoom: 1
};

export function createEmptyDiagramLayout(): DiagramLayout {
  return {
    positions: {},
    viewport: defaultDiagramViewport
  };
}
