export type MapCanvasHandle = {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  fitRoute: (coordinates: [number, number][]) => void;
  resetNorth: () => void;
};
