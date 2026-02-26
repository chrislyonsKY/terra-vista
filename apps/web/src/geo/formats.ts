export type FormatId =
  | "geotiff"
  | "cog"
  | "erdas"
  | "netcdf"
  | "xyz"
  | "usgsdem"
  | "dted"
  | "las"
  | "jp2"
  | "worldfile"
  | "gpkg"
  | "ecw"
  | "mrsid"
  | "esrigrid"
  | "hdf"
  | "unknown";

export interface FormatInfo {
  id: FormatId;
  name: string;
  extensions: string[];
  supported: boolean;
  description: string;
}

export const FORMATS: FormatInfo[] = [
  { id: "geotiff", name: "GeoTIFF", extensions: [".tif", ".tiff"], supported: true, description: "Industry standard georeferenced raster" },
  { id: "cog", name: "Cloud Optimized GeoTIFF", extensions: [".cog"], supported: true, description: "Streamable GeoTIFF for cloud hosting" },
  { id: "erdas", name: "ERDAS Imagine", extensions: [".img"], supported: true, description: "Remote sensing raster format" },
  { id: "xyz", name: "ASCII XYZ", extensions: [".xyz"], supported: true, description: "Simple text elevation grid (X Y Z)" },
  { id: "usgsdem", name: "USGS DEM", extensions: [".dem"], supported: true, description: "USGS digital elevation model" },
  { id: "dted", name: "DTED", extensions: [".dt0", ".dt1", ".dt2"], supported: true, description: "Digital Terrain Elevation Data" },
  { id: "netcdf", name: "NetCDF", extensions: [".nc"], supported: true, description: "Scientific multidimensional arrays" },
  { id: "worldfile", name: "Image + World File", extensions: [".jpg", ".jpeg", ".png", ".bmp", ".gif"], supported: true, description: "Standard image with georeferencing sidecar" },
  { id: "las", name: "LAS/LAZ", extensions: [".las", ".laz"], supported: true, description: "LiDAR point cloud (gridded to DEM)" },
  { id: "jp2", name: "JPEG 2000", extensions: [".jp2", ".jpx"], supported: false, description: "Lossless compression with geospatial metadata" },
  { id: "gpkg", name: "GeoPackage", extensions: [".gpkg"], supported: false, description: "SQLite-based vector/raster container" },
  { id: "ecw", name: "ECW", extensions: [".ecw"], supported: false, description: "Enhanced Compression Wavelet (proprietary)" },
  { id: "mrsid", name: "MrSID", extensions: [".sid"], supported: false, description: "LizardTech multi-resolution (proprietary)" },
  { id: "hdf", name: "HDF", extensions: [".hdf", ".hdf5", ".he5", ".h5"], supported: false, description: "Hierarchical Data Format (NASA)" },
];

export const ALL_EXTENSIONS = FORMATS.flatMap((f) => f.extensions);

export const ACCEPT_STRING = ALL_EXTENSIONS.join(",");

export function detectFormat(fileName: string): FormatInfo {
  const lower = fileName.toLowerCase();
  for (const fmt of FORMATS) {
    for (const ext of fmt.extensions) {
      if (lower.endsWith(ext)) return fmt;
    }
  }
  return { id: "unknown", name: "Unknown", extensions: [], supported: false, description: "Unrecognized format" };
}
