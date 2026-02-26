import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { ThreeApp } from "../three/ThreeApp";
import { GridModule } from "../three/modules/GridModule";
import { LightingModule } from "../three/modules/LightingModule";
import { TerrainModule } from "../three/modules/TerrainModule";
import type { TerrainData, ColorRampName } from "../three/modules/TerrainModule";

interface ViewportProps {
  terrainData: TerrainData | null;
  exaggeration: number;
  colorRamp: ColorRampName;
  wireframe: boolean;
  onElevationRange?: (min: number, max: number) => void;
}

export interface ViewportHandle {
  captureScreenshot: () => string | null;
}

export const Viewport = forwardRef<ViewportHandle, ViewportProps>(function Viewport(
  { terrainData, exaggeration, colorRamp, wireframe, onElevationRange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<ThreeApp | null>(null);
  const terrainRef = useRef<TerrainModule | null>(null);

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => appRef.current?.captureScreenshot() ?? null,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new ThreeApp(containerRef.current);
    app.addModule(new LightingModule());
    app.addModule(new GridModule());

    const terrain = new TerrainModule();
    app.addModule(terrain);
    terrainRef.current = terrain;

    app.start();
    appRef.current = app;

    return () => {
      app.dispose();
      appRef.current = null;
      terrainRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!terrainData || !terrainRef.current || !appRef.current) return;

    terrainRef.current.loadTerrain(terrainData);

    const { min, max } = terrainRef.current.getElevationRange();
    onElevationRange?.(min, max);

    appRef.current.resetCamera();
  }, [terrainData, onElevationRange]);

  useEffect(() => {
    terrainRef.current?.setExaggeration(exaggeration);
  }, [exaggeration]);

  useEffect(() => {
    terrainRef.current?.setColorRamp(colorRamp);
  }, [colorRamp]);

  useEffect(() => {
    terrainRef.current?.setWireframe(wireframe);
  }, [wireframe]);

  const handleReset = useCallback(() => {
    appRef.current?.resetCamera();
  }, []);

  return (
    <div ref={containerRef} className="viewport">
      <button className="reset-camera-btn" onClick={handleReset} title="Reset camera">
        Reset View
      </button>
    </div>
  );
});
