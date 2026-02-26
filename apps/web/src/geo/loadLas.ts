import type { TerrainData } from "../three/modules/TerrainModule";
import type { RasterInfo, LoadResult } from "./loader";

interface LasHeader {
  versionMinor: number;
  pointDataRecordFormat: number;
  pointDataRecordLength: number;
  numberOfPoints: number;
  offsetToPointData: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  isLaz: boolean;
}

function parseLasHeader(view: DataView): LasHeader {
  const sig = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (sig !== "LASF") {
    throw new Error("Not a valid LAS/LAZ file (missing LASF signature)");
  }

  const versionMajor = view.getUint8(24);
  const versionMinor = view.getUint8(25);
  if (versionMajor !== 1 || versionMinor > 4) {
    throw new Error(`Unsupported LAS version ${versionMajor}.${versionMinor}`);
  }

  const offsetToPointData = view.getUint32(96, true);
  const pointDataRecordFormat = view.getUint8(104);
  const pointDataRecordLength = view.getUint16(105, true);

  let numberOfPoints: number;
  if (versionMinor >= 4) {
    numberOfPoints = Number(view.getBigUint64(247, true));
  } else {
    numberOfPoints = view.getUint32(107, true);
  }

  const scaleX = view.getFloat64(131, true);
  const scaleY = view.getFloat64(139, true);
  const scaleZ = view.getFloat64(147, true);
  const offsetX = view.getFloat64(155, true);
  const offsetY = view.getFloat64(163, true);
  const offsetZ = view.getFloat64(171, true);
  const maxX = view.getFloat64(179, true);
  const minX = view.getFloat64(187, true);
  const maxY = view.getFloat64(195, true);
  const minY = view.getFloat64(203, true);
  const maxZ = view.getFloat64(211, true);
  const minZ = view.getFloat64(219, true);

  const numVLRs = view.getUint32(100, true);
  let isLaz = false;
  let vlrOffset = 227;
  if (versionMinor >= 3) vlrOffset = 235;
  if (versionMinor >= 4) vlrOffset = 375;

  for (let i = 0; i < numVLRs && vlrOffset < offsetToPointData; i++) {
    if (vlrOffset + 54 > view.byteLength) break;
    const userId = String.fromCharCode(
      ...Array.from({ length: 16 }, (_, j) => view.getUint8(vlrOffset + 2 + j))
    ).replace(/\0/g, "");
    const recordId = view.getUint16(vlrOffset + 18, true);
    const recordLength = view.getUint16(vlrOffset + 20, true);

    if (userId === "laszip encoded" || recordId === 22204) {
      isLaz = true;
    }
    vlrOffset += 54 + recordLength;
  }

  return {
    versionMinor, pointDataRecordFormat, pointDataRecordLength, numberOfPoints, offsetToPointData,
    scaleX, scaleY, scaleZ, offsetX, offsetY, offsetZ,
    minX, maxX, minY, maxY, minZ, maxZ, isLaz,
  };
}

function extractPointsUncompressed(buffer: ArrayBuffer, header: LasHeader): { xs: Float64Array; ys: Float64Array; zs: Float64Array } {
  const view = new DataView(buffer);
  const maxPoints = Math.min(header.numberOfPoints, 10_000_000);
  const stride = header.numberOfPoints > maxPoints ? Math.ceil(header.numberOfPoints / maxPoints) : 1;
  const count = Math.ceil(header.numberOfPoints / stride);

  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  const zs = new Float64Array(count);

  let outIdx = 0;
  for (let i = 0; i < header.numberOfPoints && outIdx < count; i += stride) {
    const off = header.offsetToPointData + i * header.pointDataRecordLength;
    if (off + 12 > buffer.byteLength) break;

    const rawX = view.getInt32(off, true);
    const rawY = view.getInt32(off + 4, true);
    const rawZ = view.getInt32(off + 8, true);

    xs[outIdx] = rawX * header.scaleX + header.offsetX;
    ys[outIdx] = rawY * header.scaleY + header.offsetY;
    zs[outIdx] = rawZ * header.scaleZ + header.offsetZ;
    outIdx++;
  }

  return {
    xs: xs.subarray(0, outIdx),
    ys: ys.subarray(0, outIdx),
    zs: zs.subarray(0, outIdx),
  };
}

async function initLazPerf(): Promise<any> {
  const mod = await import("laz-perf");
  const factory = mod.createLazPerf || mod.create || mod.default || (mod.LazPerf && mod.LazPerf.create);
  if (typeof factory !== "function") {
    throw new Error("Could not find laz-perf factory function");
  }
  const lp = await factory({
    locateFile: (file: string) => {
      if (file.endsWith(".wasm")) {
        return "/laz-perf.wasm";
      }
      return file;
    },
  });
  return lp;
}

async function extractPointsLaz(buffer: ArrayBuffer, header: LasHeader): Promise<{ xs: Float64Array; ys: Float64Array; zs: Float64Array }> {
  const lp = await initLazPerf();

  const fileData = new Uint8Array(buffer);
  const dataPtr = lp._malloc(fileData.byteLength);
  lp.HEAPU8.set(fileData, dataPtr);

  const laszip = new lp.LASZip();
  laszip.open(dataPtr, fileData.byteLength);

  const pointCount = laszip.getCount();
  const pointLength = laszip.getPointLength();

  const maxPoints = Math.min(pointCount, 10_000_000);
  const skipStride = pointCount > maxPoints ? Math.ceil(pointCount / maxPoints) : 1;
  const outputCount = Math.ceil(pointCount / skipStride);

  const xs = new Float64Array(outputCount);
  const ys = new Float64Array(outputCount);
  const zs = new Float64Array(outputCount);

  const pointPtr = lp._malloc(pointLength);
  const pointView = new DataView(lp.HEAPU8.buffer, pointPtr, pointLength);

  let outIdx = 0;
  for (let i = 0; i < pointCount; i++) {
    laszip.getPoint(pointPtr);

    if (i % skipStride === 0 && outIdx < outputCount) {
      const rawX = pointView.getInt32(0, true);
      const rawY = pointView.getInt32(4, true);
      const rawZ = pointView.getInt32(8, true);

      xs[outIdx] = rawX * header.scaleX + header.offsetX;
      ys[outIdx] = rawY * header.scaleY + header.offsetY;
      zs[outIdx] = rawZ * header.scaleZ + header.offsetZ;
      outIdx++;
    }
  }

  laszip.delete();
  lp._free(pointPtr);
  lp._free(dataPtr);

  return {
    xs: xs.subarray(0, outIdx),
    ys: ys.subarray(0, outIdx),
    zs: zs.subarray(0, outIdx),
  };
}

function pointsToGrid(
  xs: Float64Array,
  ys: Float64Array,
  zs: Float64Array,
  gridSize: number
): { elevations: Float32Array; width: number; height: number; minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < minX) minX = xs[i];
    if (xs[i] > maxX) maxX = xs[i];
    if (ys[i] < minY) minY = ys[i];
    if (ys[i] > maxY) maxY = ys[i];
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const aspect = rangeX / rangeY;

  let width: number, height: number;
  if (aspect >= 1) {
    width = gridSize;
    height = Math.max(1, Math.round(gridSize / aspect));
  } else {
    height = gridSize;
    width = Math.max(1, Math.round(gridSize * aspect));
  }

  const counts = new Float32Array(width * height);
  const sums = new Float32Array(width * height);

  for (let i = 0; i < xs.length; i++) {
    const gx = Math.min(width - 1, Math.max(0, Math.floor(((xs[i] - minX) / rangeX) * (width - 1))));
    const gy = Math.min(height - 1, Math.max(0, Math.floor(((ys[i] - minY) / rangeY) * (height - 1))));
    const idx = gy * width + gx;
    sums[idx] += zs[i];
    counts[idx]++;
  }

  const elevations = new Float32Array(width * height);
  for (let i = 0; i < elevations.length; i++) {
    elevations[i] = counts[i] > 0 ? sums[i] / counts[i] : NaN;
  }

  let passes = 0;
  while (passes < 3) {
    let filled = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!isNaN(elevations[idx])) continue;
        let sum = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nv = elevations[ny * width + nx];
              if (!isNaN(nv)) { sum += nv; cnt++; }
            }
          }
        }
        if (cnt > 0) { elevations[idx] = sum / cnt; filled = true; }
      }
    }
    if (!filled) break;
    passes++;
  }

  let globalAvg = 0, globalCnt = 0;
  for (let i = 0; i < elevations.length; i++) {
    if (!isNaN(elevations[i])) { globalAvg += elevations[i]; globalCnt++; }
  }
  if (globalCnt > 0) globalAvg /= globalCnt;
  for (let i = 0; i < elevations.length; i++) {
    if (isNaN(elevations[i])) elevations[i] = globalAvg;
  }

  return { elevations, width, height, minX, maxX, minY, maxY };
}

export async function loadLasFile(file: File): Promise<LoadResult> {
  const buffer = await file.arrayBuffer();
  const header = parseLasHeader(new DataView(buffer));

  if (header.numberOfPoints === 0) {
    throw new Error("LAS/LAZ file contains no points");
  }

  let points: { xs: Float64Array; ys: Float64Array; zs: Float64Array };

  if (header.isLaz) {
    points = await extractPointsLaz(buffer, header);
  } else {
    points = extractPointsUncompressed(buffer, header);
  }

  const { xs, ys, zs } = points;
  const gridRes = Math.min(512, Math.ceil(Math.sqrt(xs.length / 2)));
  const grid = pointsToGrid(xs, ys, zs, Math.max(64, gridRes));

  const pixelSizeX = (grid.maxX - grid.minX) / (grid.width - 1 || 1);
  const pixelSizeY = (grid.maxY - grid.minY) / (grid.height - 1 || 1);

  const isGeographic =
    grid.minX >= -180 && grid.maxX <= 180 && grid.minY >= -90 && grid.maxY <= 90;

  const formatLabel = header.isLaz ? "LAZ" : "LAS";

  const terrain: TerrainData = {
    elevations: grid.elevations,
    width: grid.width,
    height: grid.height,
    noDataValue: null,
  };

  const info: RasterInfo = {
    width: grid.width,
    height: grid.height,
    bandCount: 1,
    bitsPerSample: [64],
    pixelSizeX,
    pixelSizeY,
    crs: isGeographic ? "EPSG:4326" : null,
    noDataValue: null,
    originX: grid.minX,
    originY: grid.maxY,
    format: `${formatLabel} 1.${header.versionMinor} (${header.numberOfPoints.toLocaleString()} pts, PDRF ${header.pointDataRecordFormat} → ${grid.width}x${grid.height} grid)`,
  };

  return { terrain, info };
}
