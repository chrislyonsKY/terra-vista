import type { TerrainData } from "../three/modules/TerrainModule";
import { detectFormat } from "./formats";

export interface RasterInfo {
  width: number;
  height: number;
  bandCount: number;
  bitsPerSample: number[];
  pixelSizeX: number;
  pixelSizeY: number;
  crs: string | null;
  noDataValue: number | null;
  originX: number;
  originY: number;
  format: string;
}

export interface LoadResult {
  terrain: TerrainData;
  info: RasterInfo;
}

export async function loadRasterFile(file: File, worldFileContent?: string): Promise<LoadResult> {
  const format = detectFormat(file.name);

  if (!format.supported) {
    throw new Error(
      `${format.name} (${file.name.split(".").pop()}) is a recognized GIS format but cannot be opened in the browser. ` +
      `${format.description}. Try converting to GeoTIFF using GDAL or QGIS.`
    );
  }

  switch (format.id) {
    case "geotiff":
    case "cog":
    case "erdas": {
      const { loadGeoTiffFromFile } = await import("./loadGeoTiff");
      return loadGeoTiffFromFile(file);
    }
    case "xyz": {
      const { loadXyzFile } = await import("./loadXyz");
      return loadXyzFile(file);
    }
    case "usgsdem": {
      const { loadUsgsDemFile } = await import("./loadUsgsDem");
      return loadUsgsDemFile(file);
    }
    case "dted": {
      const { loadDtedFile } = await import("./loadDted");
      return loadDtedFile(file);
    }
    case "netcdf": {
      const { loadNetcdfFile } = await import("./loadNetcdf");
      return loadNetcdfFile(file);
    }
    case "worldfile": {
      const { loadImageWithWorldFile } = await import("./loadWorldFile");
      return loadImageWithWorldFile(file, worldFileContent);
    }
    default:
      throw new Error(`Unsupported format: ${file.name}`);
  }
}
