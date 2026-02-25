import {
  type GeoTiffMetadata,
  type QaResult,
  QaCheckId,
  QaSeverity,
} from "../types.js";

const VALID_BIT_DEPTHS = [8, 16, 32, 64];
const MAX_PIXEL_SIZE = 10000;

export function checkPixelSize(meta: GeoTiffMetadata): QaResult {
  const { x, y } = meta.pixelSize;
  const absX = Math.abs(x);
  const absY = Math.abs(y);

  if (absX <= 0 || absY <= 0) {
    return {
      checkId: QaCheckId.PIXEL_SIZE,
      severity: QaSeverity.ERROR,
      passed: false,
      message: "Pixel size must be positive and non-zero",
      details: { pixelSizeX: x, pixelSizeY: y },
    };
  }

  if (absX > MAX_PIXEL_SIZE || absY > MAX_PIXEL_SIZE) {
    return {
      checkId: QaCheckId.PIXEL_SIZE,
      severity: QaSeverity.WARNING,
      passed: false,
      message: `Pixel size exceeds expected range (>${MAX_PIXEL_SIZE})`,
      details: { pixelSizeX: x, pixelSizeY: y, max: MAX_PIXEL_SIZE },
    };
  }

  return {
    checkId: QaCheckId.PIXEL_SIZE,
    severity: QaSeverity.INFO,
    passed: true,
    message: `Pixel size OK: ${absX} x ${absY}`,
    details: { pixelSizeX: x, pixelSizeY: y },
  };
}

export function checkExtent(meta: GeoTiffMetadata): QaResult {
  const { minX, minY, maxX, maxY } = meta.extent;

  if (minX >= maxX || minY >= maxY) {
    return {
      checkId: QaCheckId.EXTENT,
      severity: QaSeverity.ERROR,
      passed: false,
      message: "Extent coordinates are not properly ordered (min >= max)",
      details: { minX, minY, maxX, maxY },
    };
  }

  const width = maxX - minX;
  const height = maxY - minY;

  if (width === 0 || height === 0) {
    return {
      checkId: QaCheckId.EXTENT,
      severity: QaSeverity.ERROR,
      passed: false,
      message: "Extent has zero area",
      details: { width, height },
    };
  }

  return {
    checkId: QaCheckId.EXTENT,
    severity: QaSeverity.INFO,
    passed: true,
    message: `Extent OK: ${width.toFixed(2)} x ${height.toFixed(2)}`,
    details: { minX, minY, maxX, maxY, width, height },
  };
}

export function checkBandCount(meta: GeoTiffMetadata): QaResult {
  if (meta.bandCount < 1) {
    return {
      checkId: QaCheckId.BAND_COUNT,
      severity: QaSeverity.ERROR,
      passed: false,
      message: "File contains no bands",
      details: { bandCount: meta.bandCount },
    };
  }

  return {
    checkId: QaCheckId.BAND_COUNT,
    severity: QaSeverity.INFO,
    passed: true,
    message: `Band count: ${meta.bandCount}`,
    details: { bandCount: meta.bandCount },
  };
}

export function checkNoData(meta: GeoTiffMetadata): QaResult {
  if (meta.noDataValue === null || meta.noDataValue === undefined) {
    return {
      checkId: QaCheckId.NODATA,
      severity: QaSeverity.WARNING,
      passed: false,
      message: "No nodata value defined — may cause rendering artifacts",
      details: { noDataValue: null },
    };
  }

  return {
    checkId: QaCheckId.NODATA,
    severity: QaSeverity.INFO,
    passed: true,
    message: `NoData value: ${meta.noDataValue}`,
    details: { noDataValue: meta.noDataValue },
  };
}

export function checkBitDepth(meta: GeoTiffMetadata): QaResult {
  const invalidBands = meta.bitsPerSample.filter(
    (b) => !VALID_BIT_DEPTHS.includes(b)
  );

  if (invalidBands.length > 0) {
    return {
      checkId: QaCheckId.BIT_DEPTH,
      severity: QaSeverity.WARNING,
      passed: false,
      message: `Non-standard bit depth detected: ${invalidBands.join(", ")}`,
      details: {
        bitsPerSample: meta.bitsPerSample,
        invalidBands,
        validBitDepths: VALID_BIT_DEPTHS,
      },
    };
  }

  return {
    checkId: QaCheckId.BIT_DEPTH,
    severity: QaSeverity.INFO,
    passed: true,
    message: `Bit depth OK: ${meta.bitsPerSample.join(", ")} bits`,
    details: { bitsPerSample: meta.bitsPerSample },
  };
}

export function checkCrs(meta: GeoTiffMetadata): QaResult {
  if (!meta.crs) {
    return {
      checkId: QaCheckId.CRS,
      severity: QaSeverity.WARNING,
      passed: false,
      message: "No CRS information found in file",
      details: { crs: null },
    };
  }

  return {
    checkId: QaCheckId.CRS,
    severity: QaSeverity.INFO,
    passed: true,
    message: `CRS: ${meta.crs}`,
    details: { crs: meta.crs },
  };
}

export function runAllChecks(meta: GeoTiffMetadata): QaResult[] {
  return [
    checkPixelSize(meta),
    checkExtent(meta),
    checkBandCount(meta),
    checkNoData(meta),
    checkBitDepth(meta),
    checkCrs(meta),
  ];
}
