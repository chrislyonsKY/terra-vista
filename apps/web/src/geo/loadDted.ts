import type { TerrainData } from "../three/modules/TerrainModule";
import type { RasterInfo, LoadResult } from "./loader";

export async function loadDtedFile(file: File): Promise<LoadResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 3428 + 12) {
    throw new Error("File too small to be a valid DTED file");
  }

  const uhlSig = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  if (uhlSig !== "UHL") {
    throw new Error("Invalid DTED: missing UHL header signature");
  }

  const originLonStr = String.fromCharCode(...bytes.slice(4, 12));
  const originLatStr = String.fromCharCode(...bytes.slice(12, 20));

  const lonInterval = parseInt(String.fromCharCode(...bytes.slice(20, 24))) / 10;
  const latInterval = parseInt(String.fromCharCode(...bytes.slice(24, 28))) / 10;

  const numLonLines = parseInt(String.fromCharCode(...bytes.slice(47, 51)));
  const numLatPoints = parseInt(String.fromCharCode(...bytes.slice(51, 55)));

  if (!isFinite(numLonLines) || !isFinite(numLatPoints) || numLonLines <= 0 || numLatPoints <= 0) {
    throw new Error("Invalid DTED: could not parse grid dimensions");
  }

  const originLon = parseDtedCoord(originLonStr);
  const originLat = parseDtedCoord(originLatStr);

  const width = numLonLines;
  const height = numLatPoints;
  const elevations = new Float32Array(width * height);
  elevations.fill(-32767);

  const dsiStart = 80;
  const accStart = dsiStart + 648;
  const dataStart = accStart + 2700;

  const recordSize = 8 + numLatPoints * 2 + 4;

  for (let col = 0; col < numLonLines; col++) {
    const recordStart = dataStart + col * recordSize;
    if (recordStart + 8 + numLatPoints * 2 > bytes.length) break;

    for (let row = 0; row < numLatPoints; row++) {
      const byteOffset = recordStart + 8 + row * 2;
      const highByte = bytes[byteOffset];
      const lowByte = bytes[byteOffset + 1];
      let value = ((highByte & 0x7f) << 8) | lowByte;
      if (highByte & 0x80) value = -value;

      const outRow = numLatPoints - 1 - row;
      elevations[outRow * width + col] = value;
    }
  }

  const pixelSizeX = lonInterval / 3600;
  const pixelSizeY = latInterval / 3600;

  const level = file.name.match(/\.dt(\d)$/i)?.[1] ?? "?";

  const terrain: TerrainData = {
    elevations,
    width,
    height,
    noDataValue: -32767,
  };

  const info: RasterInfo = {
    width,
    height,
    bandCount: 1,
    bitsPerSample: [16],
    pixelSizeX,
    pixelSizeY,
    crs: "EPSG:4326",
    noDataValue: -32767,
    originX: originLon,
    originY: originLat + height * pixelSizeY,
    format: `DTED Level ${level}`,
  };

  return { terrain, info };
}

function parseDtedCoord(str: string): number {
  const cleaned = str.trim();
  const match = cleaned.match(/^(\d{2,3})(\d{2})(\d{2})\.?(\d*)([NSEW])$/i);
  if (!match) {
    const num = parseFloat(cleaned);
    return isFinite(num) ? num : 0;
  }

  const deg = parseInt(match[1]);
  const min = parseInt(match[2]);
  const sec = parseFloat(match[3] + (match[4] ? "." + match[4] : ""));
  const dir = match[5].toUpperCase();

  let result = deg + min / 60 + sec / 3600;
  if (dir === "S" || dir === "W") result = -result;
  return result;
}
