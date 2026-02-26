import type { TerrainData } from "../three/modules/TerrainModule";
import type { RasterInfo, LoadResult } from "./loader";

export async function loadXyzFile(file: File): Promise<LoadResult> {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("/"));

  const points: { x: number; y: number; z: number }[] = [];

  for (const line of lines) {
    const parts = line.split(/[\s,;]+/);
    if (parts.length < 3) continue;
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    const z = parseFloat(parts[2]);
    if (isFinite(x) && isFinite(y) && isFinite(z)) {
      points.push({ x, y, z });
    }
  }

  if (points.length === 0) {
    throw new Error("No valid XYZ points found in file");
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const uniqueX = new Set(points.map((p) => p.x));
  const uniqueY = new Set(points.map((p) => p.y));

  let width: number;
  let height: number;

  if (uniqueX.size > 1 && uniqueY.size > 1) {
    width = uniqueX.size;
    height = uniqueY.size;
  } else {
    const side = Math.ceil(Math.sqrt(points.length));
    width = side;
    height = Math.ceil(points.length / side);
  }

  const elevations = new Float32Array(width * height);
  elevations.fill(0);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  for (const p of points) {
    const ix = Math.min(Math.floor(((p.x - minX) / rangeX) * (width - 1)), width - 1);
    const iy = Math.min(Math.floor(((p.y - minY) / rangeY) * (height - 1)), height - 1);
    elevations[iy * width + ix] = p.z;
  }

  const pixelSizeX = rangeX / (width - 1 || 1);
  const pixelSizeY = rangeY / (height - 1 || 1);

  const terrain: TerrainData = {
    elevations,
    width,
    height,
    noDataValue: null,
  };

  const info: RasterInfo = {
    width,
    height,
    bandCount: 1,
    bitsPerSample: [32],
    pixelSizeX,
    pixelSizeY,
    crs: null,
    noDataValue: null,
    originX: minX,
    originY: maxY,
    format: "ASCII XYZ",
  };

  return { terrain, info };
}
