import { useState, useRef, useCallback } from "react";
import { ALL_EXTENSIONS, ACCEPT_STRING, detectFormat } from "../geo/formats";

interface FileUploadProps {
  onFileSelected: (file: File, companionFile?: File) => void;
  disabled: boolean;
}

const WORLD_FILE_EXTS = [".jgw", ".pgw", ".bpw", ".gfw", ".tfw", ".wld"];

export function FileUpload({ onFileSelected, disabled }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAcceptedFile = useCallback((name: string): boolean => {
    const lower = name.toLowerCase();
    return ALL_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
      WORLD_FILE_EXTS.some((ext) => lower.endsWith(ext));
  }, []);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      if (disabled) return;
      const fileArr = Array.from(files);

      const mainFile = fileArr.find((f) => {
        const lower = f.name.toLowerCase();
        return !WORLD_FILE_EXTS.some((ext) => lower.endsWith(ext));
      });

      const worldFile = fileArr.find((f) => {
        const lower = f.name.toLowerCase();
        return WORLD_FILE_EXTS.some((ext) => lower.endsWith(ext));
      });

      if (mainFile) {
        onFileSelected(mainFile, worldFile);
      }
    },
    [onFileSelected, disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((f) => isAcceptedFile(f.name));
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles, disabled, isAcceptedFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div
      className={`file-upload ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      role="button"
      tabIndex={0}
      aria-label="Upload a raster elevation file. Drop a file here or press Enter to browse."
    >
      <span className="file-upload-label" aria-hidden="true">
        Drop a raster file here or click to browse
      </span>
      <span className="file-upload-hint" aria-hidden="true">
        GeoTIFF, DEM, DTED, XYZ, NetCDF, LAS, IMG, and more
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleChange}
        disabled={disabled}
        multiple
        aria-label="Choose raster elevation file"
      />
    </div>
  );
}
