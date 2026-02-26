import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoTiffInfo } from "../geo/loadGeoTiff";

interface LeafletMapProps {
  info: GeoTiffInfo | null;
}

function computeGeoBounds(info: GeoTiffInfo): L.LatLngBoundsExpression | null {
  const x1 = info.originX;
  const y1 = info.originY;
  const x2 = info.originX + info.width * info.pixelSizeX;
  const y2 = info.originY - info.height * info.pixelSizeY;

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

export function LeafletMap({ info }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const labelRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [38.5, -84.5],
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    L.control.attribution({ position: "bottomright", prefix: false })
      .addAttribution('&copy; <a href="https://openstreetmap.org">OSM</a>')
      .addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      rectRef.current = null;
      labelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !info) return;

    if (rectRef.current) {
      rectRef.current.remove();
      rectRef.current = null;
    }
    if (labelRef.current) {
      labelRef.current.remove();
      labelRef.current = null;
    }

    const bounds = computeGeoBounds(info);

    if (!bounds) {
      const icon = L.divIcon({
        className: "projected-crs-label",
        html: `<div style="background:rgba(20,20,20,0.85);color:#a3a3a3;padding:6px 10px;border-radius:6px;font-size:11px;white-space:nowrap;backdrop-filter:blur(4px)">Projected CRS (${info.crs ?? "unknown"}) — map preview unavailable</div>`,
        iconSize: [300, 30],
        iconAnchor: [150, 15],
      });
      labelRef.current = L.marker([38.5, -84.5], { icon }).addTo(mapRef.current);
      return;
    }

    rectRef.current = L.rectangle(bounds, {
      color: "#10b981",
      weight: 2,
      fillColor: "#10b981",
      fillOpacity: 0.15,
      dashArray: "6 3",
    }).addTo(mapRef.current);

    mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  }, [info]);

  return <div ref={containerRef} className="leaflet-container-wrapper" />;
}
