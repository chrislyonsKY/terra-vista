import type { TerrainData } from "../three/modules/TerrainModule";
import type { RasterInfo, LoadResult } from "./loader";

export async function loadImageWithWorldFile(
  imageFile: File,
  worldFileContent?: string
): Promise<LoadResult> {
  const bitmap = await createImageBitmap(imageFile);
  const width = bitmap.width;
  const height = bitmap.height;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create canvas context");

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const elevations = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    elevations[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  let originX = 0;
  let originY = 0;
  let pixelSizeX = 1;
  let pixelSizeY = 1;

  if (worldFileContent) {
    const lines = worldFileContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length >= 6) {
      pixelSizeX = Math.abs(parseFloat(lines[0])) || 1;
      pixelSizeY = Math.abs(parseFloat(lines[3])) || 1;
      originX = parseFloat(lines[4]) || 0;
      originY = parseFloat(lines[5]) || 0;
    }
  }

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
    bitsPerSample: [8],
    pixelSizeX,
    pixelSizeY,
    crs: null,
    noDataValue: null,
    originX,
    originY,
    format: worldFileContent ? "Image + World File" : "Image (grayscale)",
  };

  return { terrain, info };
}
