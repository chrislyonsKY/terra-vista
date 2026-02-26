declare module "esri-leaflet" {
  import * as L from "leaflet";

  export function basemapLayer(
    key: string,
    options?: Record<string, unknown>
  ): L.TileLayer;

  export function tiledMapLayer(
    options?: Record<string, unknown>
  ): L.TileLayer;
}
