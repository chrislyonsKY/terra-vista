import { fromArrayBuffer } from "geotiff";
import type { TerrainData } from "../three/modules/TerrainModule";

export interface GeoTiffInfo {
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
}

export interface LoadResult {
  terrain: TerrainData;
  info: GeoTiffInfo;
}

export async function loadGeoTiffFromFile(file: File): Promise<LoadResult> {
  const buffer = await file.arrayBuffer();
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();

  const rawBits = image.getBitsPerSample();
  const bitsPerSample = Array.isArray(rawBits)
    ? (rawBits as number[])
    : [rawBits as number];

  const tiepoint = image.getTiePoints();
  const fileDir = image.getFileDirectory();
  const modelScale = fileDir.ModelPixelScale;

  let originX = 0;
  let originY = 0;
  let pixelSizeX = 1;
  let pixelSizeY = 1;

  if (tiepoint && tiepoint.length > 0) {
    originX = tiepoint[0].x;
    originY = tiepoint[0].y;
  }

  if (modelScale && modelScale.length >= 2) {
    pixelSizeX = modelScale[0];
    pixelSizeY = modelScale[1];
  }

  const noData = image.getGDALNoData();
  const noDataValue = noData !== null && noData !== undefined ? noData : null;

  const geoKeys = image.getGeoKeys();
  let crs: string | null = null;
  if (geoKeys.ProjectedCSTypeGeoKey) {
    crs = `EPSG:${geoKeys.ProjectedCSTypeGeoKey}`;
  } else if (geoKeys.GeographicTypeGeoKey) {
    crs = `EPSG:${geoKeys.GeographicTypeGeoKey}`;
  }

  const rasters = await image.readRasters();
  const firstBand = rasters[0] as ArrayLike<number>;
  const elevations = new Float32Array(firstBand.length);
  for (let i = 0; i < firstBand.length; i++) {
    elevations[i] = firstBand[i];
  }

  const terrain: TerrainData = {
    elevations,
    width,
    height,
    noDataValue,
  };

  const info: GeoTiffInfo = {
    width,
    height,
    bandCount: samplesPerPixel,
    bitsPerSample,
    pixelSizeX,
    pixelSizeY,
    crs,
    noDataValue,
    originX,
    originY,
  };

  return { terrain, info };
}
