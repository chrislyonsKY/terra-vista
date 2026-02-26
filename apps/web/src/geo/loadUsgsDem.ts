import type { TerrainData } from "../three/modules/TerrainModule";
import type { RasterInfo, LoadResult } from "./loader";

export async function loadUsgsDemFile(file: File): Promise<LoadResult> {
  const text = await file.text();

  const typeA = text.substring(0, 1024);

  const name = typeA.substring(0, 40).trim();
  if (name.length === 0) {
    throw new Error("Invalid USGS DEM: could not read header");
  }

  const demLevel = parseInt(typeA.substring(144, 150).trim()) || 1;

  const patternCode = parseInt(typeA.substring(150, 156).trim()) || 1;
  const planimetricCode = parseInt(typeA.substring(156, 162).trim()) || 0;

  const swCornerStr = typeA.substring(546, 570);
  const neCornerStr = typeA.substring(570, 594);

  let originX = 0;
  let originY = 0;
  let maxX = 0;
  let maxY = 0;

  const coords = extractCorners(typeA);
  if (coords) {
    originX = coords.minX;
    originY = coords.maxY;
    maxX = coords.maxX;
    maxY = coords.maxY;
  }

  const resXStr = typeA.substring(816, 828).trim();
  const resYStr = typeA.substring(828, 840).trim();
  const resZStr = typeA.substring(840, 852).trim();

  const resX = parseFloat(resXStr) || 1;
  const resY = parseFloat(resYStr) || 1;

  const rowsStr = typeA.substring(853, 859).trim();
  const colsStr = typeA.substring(859, 865).trim();

  const numRows = parseInt(rowsStr) || 0;
  const numCols = parseInt(colsStr) || 0;

  if (numRows === 0 || numCols === 0) {
    return parseAsDemText(text, file.name);
  }

  const elevations = new Float32Array(numRows * numCols);
  elevations.fill(0);

  let pos = 1024;
  let idx = 0;
  const remaining = text.substring(pos);
  const values = remaining.match(/-?\d+\.?\d*/g) || [];

  for (const val of values) {
    if (idx >= elevations.length) break;
    elevations[idx] = parseFloat(val);
    idx++;
  }

  let crs: string | null = null;
  if (planimetricCode === 1) crs = "UTM";
  else if (planimetricCode === 0) crs = "EPSG:4326";

  const terrain: TerrainData = {
    elevations,
    width: numCols,
    height: numRows,
    noDataValue: -32767,
  };

  const info: RasterInfo = {
    width: numCols,
    height: numRows,
    bandCount: 1,
    bitsPerSample: [16],
    pixelSizeX: resX,
    pixelSizeY: resY,
    crs,
    noDataValue: -32767,
    originX,
    originY,
    format: `USGS DEM (Level ${demLevel})`,
  };

  return { terrain, info };
}

function extractCorners(header: string): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const cornerSection = header.substring(546, 738);
  const nums = cornerSection.match(/-?\d+\.?\d*[DEde]?[+-]?\d*/g);
  if (!nums || nums.length < 4) return null;

  const parsed = nums.map((n) => parseFloat(n.replace(/[Dd]/, "E")));
  if (parsed.some((v) => !isFinite(v))) return null;

  const xs = [parsed[0], parsed[2], parsed[4] ?? parsed[0], parsed[6] ?? parsed[2]];
  const ys = [parsed[1], parsed[3], parsed[5] ?? parsed[1], parsed[7] ?? parsed[3]];

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

async function parseAsDemText(text: string, fileName: string): Promise<LoadResult> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const allValues: number[] = [];
  for (const line of lines) {
    const nums = line.match(/-?\d+\.?\d*/g);
    if (nums) {
      for (const n of nums) {
        const v = parseFloat(n);
        if (isFinite(v)) allValues.push(v);
      }
    }
  }

  if (allValues.length === 0) {
    throw new Error("No elevation values found in DEM file");
  }

  const side = Math.ceil(Math.sqrt(allValues.length));
  const width = side;
  const height = Math.ceil(allValues.length / side);
  const elevations = new Float32Array(width * height);
  for (let i = 0; i < allValues.length; i++) {
    elevations[i] = allValues[i];
  }

  const terrain: TerrainData = { elevations, width, height, noDataValue: -32767 };
  const info: RasterInfo = {
    width,
    height,
    bandCount: 1,
    bitsPerSample: [16],
    pixelSizeX: 1,
    pixelSizeY: 1,
    crs: null,
    noDataValue: -32767,
    originX: 0,
    originY: 0,
    format: "USGS DEM (text)",
  };

  return { terrain, info };
}
