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

const GEOGRAPHIC_EPSG = new Set([
  4326, 4269, 4267, 4617, 4612, 4490, 4555, 4674, 4749, 4167, 4283, 4258,
  4019, 4148, 4272, 4324, 4152, 4759, 4979,
]);

const UTM_ZONES: Record<number, { zone: number; south: boolean }> = {};
for (let z = 1; z <= 60; z++) {
  UTM_ZONES[32600 + z] = { zone: z, south: false };
  UTM_ZONES[32700 + z] = { zone: z, south: true };
  UTM_ZONES[26900 + z] = { zone: z, south: false };
  if (z >= 1 && z <= 22) {
    UTM_ZONES[6300 + z] = { zone: z, south: false };
  }
}

function utmToLatLon(easting: number, northing: number, zone: number, south: boolean): [number, number] {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.081819191;
  const e2 = e * e;
  const ep2 = e2 / (1 - e2);

  const x = easting - 500000;
  const y = south ? northing - 10000000 : northing;

  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 = mu +
    (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) +
    (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) +
    (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);

  const sinPhi = Math.sin(phi1);
  const cosPhi = Math.cos(phi1);
  const tanPhi = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T1 = tanPhi * tanPhi;
  const C1 = ep2 * cosPhi * cosPhi;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi * sinPhi, 1.5);
  const D = x / (N1 * k0);

  const lat = phi1 -
    (N1 * tanPhi / R1) * (
      D * D / 2 -
      (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D / 24 +
      (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D * D * D * D * D * D / 720
    );

  const lon = (D -
    (1 + 2 * T1 + C1) * D * D * D / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D * D * D * D * D / 120
  ) / cosPhi;

  const lonDeg = lon * (180 / Math.PI) + (zone * 6 - 183);
  const latDeg = lat * (180 / Math.PI);
  return [latDeg, lonDeg];
}

function computeGeoBounds(info: RasterInfo): L.LatLngBoundsExpression | null {
  const x1 = info.originX;
  const y1 = info.originY;
  const x2 = info.originX + info.width * info.pixelSizeX;
  const y2 = info.originY - info.height * Math.abs(info.pixelSizeY);

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  const epsgNum = info.crs ? parseInt(info.crs.replace("EPSG:", ""), 10) : NaN;

  const isGeographic =
    (!isNaN(epsgNum) && GEOGRAPHIC_EPSG.has(epsgNum)) ||
    (minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90);

  if (isGeographic) {
    return [
      [minY, minX],
      [maxY, maxX],
    ];
  }

  if (!isNaN(epsgNum) && UTM_ZONES[epsgNum]) {
    const { zone, south } = UTM_ZONES[epsgNum];
    const [lat1, lon1] = utmToLatLon(minX, minY, zone, south);
    const [lat2, lon2] = utmToLatLon(maxX, maxY, zone, south);
    const [lat3, lon3] = utmToLatLon(minX, maxY, zone, south);
    const [lat4, lon4] = utmToLatLon(maxX, minY, zone, south);

    const allLats = [lat1, lat2, lat3, lat4];
    const allLons = [lon1, lon2, lon3, lon4];
    const geoMinLat = Math.min(...allLats);
    const geoMaxLat = Math.max(...allLats);
    const geoMinLon = Math.min(...allLons);
    const geoMaxLon = Math.max(...allLons);

    if (geoMinLat >= -90 && geoMaxLat <= 90 && geoMinLon >= -180 && geoMaxLon <= 180) {
      return [
        [geoMinLat, geoMinLon],
        [geoMaxLat, geoMaxLon],
      ];
    }
  }

  if (info.crs === null && minX >= 100000 && maxX <= 900000 && minY > 0 && maxY < 10000000) {
    return null;
  }

  return null;
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

  const initialBasemapRef = useRef(basemap);

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

    setTimeout(() => {
      map.invalidateSize();
      applyBasemap(map, initialBasemapRef.current);
    }, 50);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      basemapLayerRef.current = null;
    };
  }, [applyBasemap]);

  useEffect(() => {
    if (!mapRef.current || !basemapLayerRef.current) return;
    applyBasemap(mapRef.current, basemap);
  }, [basemap, applyBasemap]);

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    if (!info) return;

    const bounds = computeGeoBounds(info);

    if (!bounds) {
      const crsLabel = info.crs ?? "unknown";
      const icon = L.divIcon({
        className: "leaflet-projected-label",
        html: `<div class="footprint-label-projected">Projected CRS (${crsLabel}) — cannot reproject to map. Origin: ${info.originX.toFixed(1)}, ${info.originY.toFixed(1)}</div>`,
        iconSize: [400, 30],
        iconAnchor: [200, 15],
      });
      L.marker([38.5, -84.5], { icon }).addTo(layerGroupRef.current);
      return;
    }

    const latLngBounds = L.latLngBounds(bounds as L.LatLngExpression[]);

    L.rectangle(bounds, {
      color: "#007ac2",
      weight: 3,
      fillColor: "#007ac2",
      fillOpacity: 0.15,
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
        color: "#007ac2",
        weight: 2,
        fillColor: "#005a8e",
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

  return <div ref={containerRef} className="leaflet-container-wrapper" role="region" aria-label="Interactive location map" />;
}
