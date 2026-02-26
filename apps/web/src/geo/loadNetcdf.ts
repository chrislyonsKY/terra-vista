import type { TerrainData } from "../three/modules/TerrainModule";
import type { RasterInfo, LoadResult } from "./loader";

export async function loadNetcdfFile(file: File): Promise<LoadResult> {
  const { NetCDFReader } = await import("netcdfjs");
  const buffer = await file.arrayBuffer();
  const reader = new NetCDFReader(buffer);

  const variables = reader.variables.map((v: { name: string }) => v.name);

  const elevVarNames = ["elevation", "dem", "z", "Band1", "height", "alt", "topo", "data"];
  let elevVar: string | null = null;

  for (const name of elevVarNames) {
    if (variables.includes(name)) {
      elevVar = name;
      break;
    }
  }

  if (!elevVar) {
    for (const v of reader.variables) {
      if ((v as unknown as { dimensions: unknown[] }).dimensions.length === 2) {
        elevVar = (v as { name: string }).name;
        break;
      }
    }
  }

  if (!elevVar) {
    throw new Error(`No elevation variable found. Available: ${variables.join(", ")}`);
  }

  const rawData = reader.getDataVariable(elevVar);
  if (!rawData || rawData.length === 0) {
    throw new Error(`Variable '${elevVar}' contains no data`);
  }

  const varMeta = reader.variables.find((v: { name: string }) => v.name === elevVar);
  const dims = (varMeta as unknown as { dimensions: unknown[] })?.dimensions ?? [];

  let width = 0;
  let height = 0;

  if (dims.length >= 2) {
    const dim0 = reader.dimensions.find((d: { name: string }) => d.name === dims[0]);
    const dim1 = reader.dimensions.find((d: { name: string }) => d.name === dims[1]);
    height = (dim0 as { size: number })?.size ?? 0;
    width = (dim1 as { size: number })?.size ?? 0;
  }

  if (width === 0 || height === 0) {
    const side = Math.ceil(Math.sqrt(rawData.length));
    width = side;
    height = Math.ceil(rawData.length / side);
  }

  const elevations = new Float32Array(width * height);
  for (let i = 0; i < Math.min(rawData.length, elevations.length); i++) {
    elevations[i] = Number(rawData[i]);
  }

  let originX = 0;
  let originY = 0;
  let pixelSizeX = 1;
  let pixelSizeY = 1;

  const lonNames = ["lon", "longitude", "x", "X"];
  const latNames = ["lat", "latitude", "y", "Y"];

  for (const name of lonNames) {
    if (variables.includes(name)) {
      const lonData = reader.getDataVariable(name);
      if (lonData && lonData.length >= 2) {
        originX = Number(lonData[0]);
        pixelSizeX = Math.abs(Number(lonData[1]) - Number(lonData[0]));
      }
      break;
    }
  }

  for (const name of latNames) {
    if (variables.includes(name)) {
      const latData = reader.getDataVariable(name);
      if (latData && latData.length >= 2) {
        originY = Number(latData[0]);
        pixelSizeY = Math.abs(Number(latData[1]) - Number(latData[0]));
        if (Number(latData[0]) < Number(latData[latData.length - 1])) {
          originY = Number(latData[latData.length - 1]);
        }
      }
      break;
    }
  }

  let noDataValue: number | null = null;
  const fillAttr = (varMeta as { attributes?: { name: string; value: unknown }[] })?.attributes?.find(
    (a) => a.name === "_FillValue" || a.name === "missing_value"
  );
  if (fillAttr) {
    noDataValue = Number(fillAttr.value);
  }

  const terrain: TerrainData = {
    elevations,
    width,
    height,
    noDataValue,
  };

  const info: RasterInfo = {
    width,
    height,
    bandCount: 1,
    bitsPerSample: [32],
    pixelSizeX,
    pixelSizeY,
    crs: null,
    noDataValue,
    originX,
    originY,
    format: `NetCDF (${elevVar})`,
  };

  return { terrain, info };
}
