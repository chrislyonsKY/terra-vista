import { fromArrayBuffer } from "geotiff";
import type { GeoTiffMetadata, Extent, PixelSize } from "@mapqc/shared";

export interface GeoTiffLoadResult {
  metadata: GeoTiffMetadata;
  elevations: Float32Array;
}

export async function loadGeoTiffFromFile(
  file: File
): Promise<GeoTiffLoadResult> {
  const buffer = await file.arrayBuffer();
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();
  const bitsPerSample = image.getBitsPerSample() as number[];
  const sampleFormat = (image.getSampleFormat?.() as number[]) ?? [1];

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

  const pixelSize: PixelSize = { x: pixelSizeX, y: pixelSizeY };
  const extent: Extent = {
    minX: originX,
    maxY: originY,
    maxX: originX + width * pixelSizeX,
    minY: originY - height * pixelSizeY,
  };

  const rasters = await image.readRasters();
  const firstBand = rasters[0] as ArrayLike<number>;
  const elevations = new Float32Array(firstBand.length);
  for (let i = 0; i < firstBand.length; i++) {
    elevations[i] = firstBand[i];
  }

  const metadata: GeoTiffMetadata = {
    width,
    height,
    bandCount: samplesPerPixel,
    bitsPerSample,
    sampleFormat,
    noDataValue,
    origin: [originX, originY],
    pixelSize,
    extent,
    crs,
  };

  return { metadata, elevations };
}
