import { request, ApiKeyManager } from "@esri/arcgis-rest-request";
import { searchItems } from "@esri/arcgis-rest-portal";
import type { TerrainData } from "../three/modules/TerrainModule";
import type { RasterInfo, LoadResult } from "./loader";

const ARCGIS_KEY = import.meta.env.VITE_ARCGIS_API_KEY as string;

export interface ArcGISSearchResult {
  id: string;
  title: string;
  snippet: string;
  type: string;
  url: string;
  extent: [[number, number], [number, number]] | null;
  owner: string;
  thumbnail: string | null;
}

export async function searchElevationData(
  query: string
): Promise<ArcGISSearchResult[]> {
  const authentication = ARCGIS_KEY
    ? ApiKeyManager.fromKey(ARCGIS_KEY)
    : undefined;

  const typeFilter = 'type:"Image Service" OR type:"Map Service"';
  const tagFilter =
    "elevation OR DEM OR terrain OR hillshade OR lidar OR DTM OR DSM";
  const fullQuery = `${query} (${tagFilter}) (${typeFilter})`;

  const response = await searchItems({
    q: fullQuery,
    num: 12,
    sortField: "num-views" as any,
    sortOrder: "desc",
    authentication,
  });

  return response.results.map((item: any) => ({
    id: item.id,
    title: item.title,
    snippet: item.snippet || "",
    type: item.type,
    url: item.url || "",
    extent:
      item.extent && item.extent.length === 2
        ? (item.extent as [[number, number], [number, number]])
        : null,
    owner: item.owner,
    thumbnail: item.thumbnail
      ? `https://www.arcgis.com/sharing/rest/content/items/${item.id}/info/${item.thumbnail}`
      : null,
  }));
}

function getAuthentication(): ApiKeyManager | undefined {
  return ARCGIS_KEY ? ApiKeyManager.fromKey(ARCGIS_KEY) : undefined;
}

export async function loadElevationFromService(
  serviceUrl: string,
  itemExtent: [[number, number], [number, number]] | null,
  itemTitle: string,
  itemType: string
): Promise<LoadResult> {
  const authentication = getAuthentication();
  const cleanUrl = serviceUrl.replace(/\/+$/, "");

  let serviceInfo: any;
  try {
    serviceInfo = await request(cleanUrl, {
      params: { f: "json" },
      authentication,
    });
  } catch {
    throw new Error(
      "Cannot access service. It may require authentication or be unavailable."
    );
  }

  const extent =
    serviceInfo.fullExtent || serviceInfo.extent || serviceInfo.initialExtent;
  const serviceSR =
    extent?.spatialReference?.latestWkid ||
    extent?.spatialReference?.wkid ||
    4326;

  let geoBbox: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };

  if (itemExtent) {
    geoBbox = {
      xmin: itemExtent[0][0],
      ymin: itemExtent[0][1],
      xmax: itemExtent[1][0],
      ymax: itemExtent[1][1],
    };
  } else if (extent) {
    if (serviceSR === 4326 || serviceSR === 4269) {
      geoBbox = {
        xmin: extent.xmin,
        ymin: extent.ymin,
        xmax: extent.xmax,
        ymax: extent.ymax,
      };
    } else {
      throw new Error(
        `Service uses projected CRS (WKID ${serviceSR}) and has no geographic extent. Cannot determine bounds.`
      );
    }
  } else {
    throw new Error("Service has no extent information.");
  }

  const size = 512;

  if (itemType === "Image Service") {
    return await loadFromImageService(
      cleanUrl,
      geoBbox,
      size,
      itemTitle,
      authentication
    );
  } else if (itemType === "Map Service") {
    return await loadFromMapService(
      cleanUrl,
      geoBbox,
      size,
      itemTitle,
      authentication
    );
  } else {
    throw new Error(`Unsupported service type: ${itemType}`);
  }
}

async function loadFromImageService(
  url: string,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  size: number,
  title: string,
  authentication?: ApiKeyManager
): Promise<LoadResult> {
  const bboxStr = `${bbox.xmin},${bbox.ymin},${bbox.xmax},${bbox.ymax}`;
  const exportUrl = `${url}/exportImage`;

  const params: Record<string, string> = {
    bbox: bboxStr,
    bboxSR: "4326",
    imageSR: "4326",
    size: `${size},${size}`,
    format: "tiff",
    pixelType: "F32",
    noDataInterpretation: "esriNoDataMatchAny",
    interpolation: "RSP_BilinearInterpolation",
    f: "json",
  };

  let response: any;
  try {
    response = await request(exportUrl, { params, authentication });
  } catch {
    params.format = "jpgpng";
    delete params.pixelType;
    try {
      response = await request(exportUrl, { params, authentication });
    } catch {
      throw new Error(
        "Could not export image from service. The service may not support image export."
      );
    }
  }

  if (!response.href) {
    throw new Error("Service did not return an image URL.");
  }

  return await downloadAndParse(response.href, bbox, title, "ArcGIS Image Service");
}

async function loadFromMapService(
  url: string,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  size: number,
  title: string,
  authentication?: ApiKeyManager
): Promise<LoadResult> {
  const bboxStr = `${bbox.xmin},${bbox.ymin},${bbox.xmax},${bbox.ymax}`;
  const exportUrl = `${url}/export`;

  const params: Record<string, string> = {
    bbox: bboxStr,
    bboxSR: "4326",
    imageSR: "4326",
    size: `${size},${size}`,
    format: "png",
    transparent: "false",
    dpi: "96",
    f: "json",
  };

  let response: any;
  try {
    response = await request(exportUrl, { params, authentication });
  } catch {
    throw new Error(
      "Could not export map from service. The service may not support map export."
    );
  }

  if (!response.href) {
    throw new Error("Service did not return an image URL.");
  }

  return await downloadAndParse(response.href, bbox, title, "ArcGIS Map Service");
}

async function downloadAndParse(
  imageUrl: string,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  title: string,
  formatLabel: string
): Promise<LoadResult> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(
      `Failed to download exported image: ${imageResponse.status}`
    );
  }

  const contentType = imageResponse.headers.get("content-type") || "";
  const arrayBuf = await imageResponse.arrayBuffer();

  if (contentType.includes("tiff") || imageUrl.includes(".tif")) {
    return await parseTiffElevation(arrayBuf, bbox, formatLabel);
  } else {
    return await parseImageAsElevation(arrayBuf, bbox, formatLabel);
  }
}

async function parseTiffElevation(
  buffer: ArrayBuffer,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  formatLabel: string
): Promise<LoadResult> {
  const { fromArrayBuffer } = await import("geotiff");
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const rasters = await image.readRasters();
  const band = rasters[0] as ArrayLike<number>;
  const elevations = new Float32Array(band.length);
  for (let i = 0; i < band.length; i++) {
    elevations[i] = band[i];
  }

  const pixelSizeX = (bbox.xmax - bbox.xmin) / width;
  const pixelSizeY = (bbox.ymax - bbox.ymin) / height;

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
    originX: bbox.xmin,
    originY: bbox.ymax,
    format: formatLabel,
  };

  return { terrain, info };
}

async function parseImageAsElevation(
  buffer: ArrayBuffer,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  formatLabel: string
): Promise<LoadResult> {
  const blob = new Blob([buffer]);
  const bitmapUrl = URL.createObjectURL(blob);

  return new Promise<LoadResult>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const width = img.width;
      const height = img.height;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(bitmapUrl);
        reject(new Error("Cannot create canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      const elevations = new Float32Array(width * height);

      for (let i = 0; i < width * height; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        elevations[i] = (r + g + b) / 3;
      }

      let minGray = Infinity;
      let maxGray = -Infinity;
      const sampleSize = Math.min(elevations.length, 5000);
      for (let i = 0; i < sampleSize; i++) {
        if (elevations[i] < minGray) minGray = elevations[i];
        if (elevations[i] > maxGray) maxGray = elevations[i];
      }
      const grayRange = maxGray - minGray || 1;
      const elevScale = (bbox.ymax - bbox.ymin) * 100;
      for (let i = 0; i < elevations.length; i++) {
        elevations[i] =
          ((elevations[i] - minGray) / grayRange) * elevScale;
      }

      URL.revokeObjectURL(bitmapUrl);

      const pixelSizeX = (bbox.xmax - bbox.xmin) / width;
      const pixelSizeY = (bbox.ymax - bbox.ymin) / height;

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
        crs: "EPSG:4326",
        noDataValue: null,
        originX: bbox.xmin,
        originY: bbox.ymax,
        format: `${formatLabel} (RGB)`,
      };

      resolve({ terrain, info });
    };
    img.onerror = () => {
      URL.revokeObjectURL(bitmapUrl);
      reject(new Error("Failed to decode exported image"));
    };
    img.src = bitmapUrl;
  });
}
