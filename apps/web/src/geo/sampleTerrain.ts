import type { TerrainData } from "../three/modules/TerrainModule";
import type { RasterInfo } from "./loader";

function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fractalNoise(x: number, y: number, octaves: number): number {
  let val = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / max;
}

export function generateSampleTerrain(): { terrain: TerrainData; info: RasterInfo } {
  const width = 256;
  const height = 256;
  const elevations = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;

      let elev = 0;

      elev += Math.sin(nx * Math.PI * 2) * 40;
      elev += Math.sin(ny * Math.PI * 3) * 30;
      elev += Math.sin((nx + ny) * Math.PI * 4) * 25;

      const ridgeDist = Math.abs(ny - nx - 0.1);
      elev += Math.max(0, 1 - ridgeDist * 4) * 120;

      const ridge2Dist = Math.abs(ny - 0.7 * nx - 0.3);
      elev += Math.max(0, 1 - ridge2Dist * 5) * 80;

      elev += fractalNoise(nx * 8, ny * 8, 6) * 100;
      elev += fractalNoise(nx * 16 + 100, ny * 16 + 100, 4) * 40;

      const valleyX = 0.6;
      const valleyDist = Math.abs(nx - valleyX);
      elev -= Math.max(0, 1 - valleyDist * 6) * Math.sin(ny * Math.PI * 2) * 50;

      elev += 500;

      elevations[y * width + x] = elev;
    }
  }

  const pixelSizeX = 0.001;
  const pixelSizeY = -0.001;
  const originX = -83.5;
  const originY = 37.5 + height * Math.abs(pixelSizeY);

  const terrain: TerrainData = { elevations, width, height, noDataValue: null };
  const info: RasterInfo = {
    width,
    height,
    bandCount: 1,
    bitsPerSample: [32],
    pixelSizeX,
    pixelSizeY,
    crs: "EPSG:4326",
    noDataValue: null,
    originX,
    originY,
    format: "Synthetic Sample",
  };

  return { terrain, info };
}
