import { readFile } from "node:fs/promises";
import { fromArrayBuffer } from "geotiff";
import type { GeoTiffMetadata } from "@mapqc/shared";

export interface GeoTiffData {
  metadata: GeoTiffMetadata;
  elevations: Float32Array;
}

export async function loadGeoTiff(filePath: string): Promise<GeoTiffData> {
  const buffer = await readFile(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const bandCount = image.getSamplesPerPixel();
  const bitsPerSample = image.getBitsPerSample() as number[];
  const sampleFormat = (image.getSampleFormat?.() as number[]) ?? [1];
  const fileDirectory = image.fileDirectory;
  const noDataValue = fileDirectory.GDAL_NODATA != null
    ? parseFloat(fileDirectory.GDAL_NODATA)
    : null;

  const bbox = image.getBoundingBox();
  const origin: [number, number] = [bbox[0], bbox[3]];
  const pixelSizeX = (bbox[2] - bbox[0]) / width;
  const pixelSizeY = (bbox[3] - bbox[1]) / height;

  const geoKeys = image.geoKeys ?? {};
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

  const metadata: GeoTiffMetadata = {
    width,
    height,
    bandCount,
    bitsPerSample,
    sampleFormat,
    noDataValue,
    origin,
    pixelSize: { x: pixelSizeX, y: pixelSizeY },
    extent: { minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3] },
    crs,
  };

  return { metadata, elevations };
}
