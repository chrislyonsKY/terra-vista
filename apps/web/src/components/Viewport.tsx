import { useEffect, useRef } from "react";
import { ThreeApp } from "../three/ThreeApp";
import { GridModule } from "../three/modules/GridModule";
import { LightingModule } from "../three/modules/LightingModule";
import { TerrainModule } from "../three/modules/TerrainModule";
import type { TerrainData } from "../three/modules/TerrainModule";
import type { Extent } from "@mapqc/shared";

interface ViewportProps {
  terrainData: {
    elevations: Float32Array;
    width: number;
    height: number;
    extent: Extent;
    noDataValue: number | null;
  } | null;
}

export function Viewport({ terrainData }: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<ThreeApp | null>(null);
  const terrainModuleRef = useRef<TerrainModule | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new ThreeApp(containerRef.current);
    app.addModule(new LightingModule());
    app.addModule(new GridModule());

    const terrain = new TerrainModule();
    app.addModule(terrain);
    terrainModuleRef.current = terrain;

    app.start();
    appRef.current = app;

    return () => {
      app.dispose();
      appRef.current = null;
      terrainModuleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!terrainData || !terrainModuleRef.current || !appRef.current) return;

    const td: TerrainData = {
      elevations: terrainData.elevations,
      width: terrainData.width,
      height: terrainData.height,
      extent: terrainData.extent,
      noDataValue: terrainData.noDataValue,
    };

    terrainModuleRef.current.loadTerrain(td);

    appRef.current.fitToExtent(
      terrainData.extent.minX,
      terrainData.extent.minY,
      terrainData.extent.maxX,
      terrainData.extent.maxY,
      1
    );
  }, [terrainData]);

  return <div ref={containerRef} className="viewport" />;
}
