import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as esriLeaflet from "esri-leaflet";
import type { RasterInfo } from "../geo/loader";

interface LeafletMapProps {
  info: RasterInfo | null;
  fileName?: string;
  basemap: string;
}

const ARCGIS_KEY = import.meta.env.VITE_ARCGIS_API_KEY as string;

const VALID_ESRI_BASEMAPS = new Set([
  "Streets", "Topographic", "Oceans", "NationalGeographic", "Physical",
  "Gray", "DarkGray", "Imagery", "ShadedRelief", "Terrain", "USATopo",
]);

function computeGeoBounds(info: RasterInfo): L.LatLngBoundsExpression | null {
  const x1 = info.originX;
  const y1 = info.originY;
  const x2 = info.originX + info.width * info.pixelSizeX;
  const y2 = info.originY - info.height * Math.abs(info.pixelSizeY);

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  const isGeographic =
    info.crs === "EPSG:4326" ||
    info.crs === "EPSG:4269" ||
    (minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90);

  if (!isGeographic) return null;

  return [
    [minY, minX],
    [maxY, maxX],
  ];
}

function createBasemapLayer(basemapId: string): L.TileLayer {
  if (basemapId === "osm") {
    return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>',
    });
  }

  if (!VALID_ESRI_BASEMAPS.has(basemapId)) {
    return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>',
    });
  }

  const esriOptions: Record<string, unknown> = { maxZoom: 18 };
  if (ARCGIS_KEY) {
    esriOptions.token = ARCGIS_KEY;
  }
  return esriLeaflet.basemapLayer(basemapId, esriOptions) as unknown as L.TileLayer;
}

export function LeafletMap({ info, fileName, basemap }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const basemapLayerRef = useRef<L.TileLayer | null>(null);

  const applyBasemap = useCallback((map: L.Map, basemapId: string) => {
    if (basemapLayerRef.current) {
      map.removeLayer(basemapLayerRef.current);
    }
    try {
      const layer = createBasemapLayer(basemapId);
      layer.addTo(map);
      basemapLayerRef.current = layer;
    } catch {
      const fallback = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 });
      fallback.addTo(map);
      basemapLayerRef.current = fallback;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [38.5, -84.5],
      zoom: 6,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    applyBasemap(map, basemap);

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      basemapLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    applyBasemap(mapRef.current, basemap);
  }, [basemap, applyBasemap]);

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    if (!info) return;

    const bounds = computeGeoBounds(info);

    if (!bounds) {
      const icon = L.divIcon({
        className: "leaflet-projected-label",
        html: `<div class="footprint-label-projected">Projected CRS (${info.crs ?? "unknown"}) — map preview unavailable</div>`,
        iconSize: [300, 30],
        iconAnchor: [150, 15],
      });
      L.marker([38.5, -84.5], { icon }).addTo(layerGroupRef.current);
      return;
    }

    const latLngBounds = L.latLngBounds(bounds as L.LatLngExpression[]);

    L.rectangle(bounds, {
      color: "#10b981",
      weight: 3,
      fillColor: "#10b981",
      fillOpacity: 0.2,
      dashArray: undefined,
    }).addTo(layerGroupRef.current);

    const corners = [
      latLngBounds.getSouthWest(),
      latLngBounds.getSouthEast(),
      latLngBounds.getNorthWest(),
      latLngBounds.getNorthEast(),
    ];
    for (const corner of corners) {
      L.circleMarker(corner, {
        radius: 4,
        color: "#10b981",
        weight: 2,
        fillColor: "#0d9668",
        fillOpacity: 1,
      }).addTo(layerGroupRef.current);
    }

    const displayName = fileName
      ? (fileName.length > 30 ? fileName.slice(0, 27) + "..." : fileName)
      : "Raster footprint";
    const center = latLngBounds.getCenter();
    const labelIcon = L.divIcon({
      className: "leaflet-footprint-label",
      html: `<div class="footprint-name-tag">${displayName}</div>`,
      iconSize: [200, 24],
      iconAnchor: [100, 12],
    });
    L.marker(center, { icon: labelIcon, interactive: false }).addTo(layerGroupRef.current);

    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [info, fileName]);

  return <div ref={containerRef} className="leaflet-container-wrapper" />;
}
