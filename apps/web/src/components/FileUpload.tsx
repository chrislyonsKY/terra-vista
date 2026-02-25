import { useState, useRef, useCallback } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled: boolean;
}

export function FileUpload({ onFileSelected, disabled }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".tif") || file.name.endsWith(".tiff"))) {
        onFileSelected(file);
      }
    },
    [onFileSelected, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
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
    >
      <span className="file-upload-label">
        Drop a GeoTIFF here or click to browse
      </span>
      <span className="file-upload-hint">.tif / .tiff files supported</span>
      <input
        ref={inputRef}
        type="file"
        accept=".tif,.tiff"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
