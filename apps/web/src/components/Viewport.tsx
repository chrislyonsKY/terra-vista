import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { ThreeApp } from "../three/ThreeApp";
import { GridModule } from "../three/modules/GridModule";
import { LightingModule } from "../three/modules/LightingModule";
import { TerrainModule } from "../three/modules/TerrainModule";
import type { TerrainData, ColorRampName } from "../three/modules/TerrainModule";

interface ProfilePoint {
  x: number;
  y: number;
  z: number;
}

interface ViewportProps {
  terrainData: TerrainData | null;
  exaggeration: number;
  colorRamp: ColorRampName;
  wireframe: boolean;
  onElevationRange?: (min: number, max: number) => void;
  profileMode?: boolean;
  onProfileClick?: (point: ProfilePoint) => void;
  skipCameraReset?: boolean;
  profileStart?: ProfilePoint | null;
  profileEnd?: ProfilePoint | null;
}

export interface ViewportHandle {
  captureScreenshot: () => string | null;
  resetCamera: () => void;
  getCameraState: () => { position: [number, number, number]; target: [number, number, number] } | null;
  setCameraState: (pos: [number, number, number], target: [number, number, number]) => void;
  getTerrainBounds: () => { sizeX: number; sizeZ: number } | null;
}

export const Viewport = forwardRef<ViewportHandle, ViewportProps>(function Viewport(
  { terrainData, exaggeration, colorRamp, wireframe, onElevationRange, profileMode, onProfileClick, skipCameraReset, profileStart, profileEnd },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<ThreeApp | null>(null);
  const terrainRef = useRef<TerrainModule | null>(null);
  const hasResetRef = useRef(false);
  const profileObjectsRef = useRef<THREE.Object3D[]>([]);

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => appRef.current?.captureScreenshot() ?? null,
    resetCamera: () => appRef.current?.resetCamera(),
    getCameraState: () => {
      const app = appRef.current;
      if (!app) return null;
      const cam = app.getCamera();
      const ctrl = app.getControls();
      return {
        position: [cam.position.x, cam.position.y, cam.position.z] as [number, number, number],
        target: [ctrl.target.x, ctrl.target.y, ctrl.target.z] as [number, number, number],
      };
    },
    setCameraState: (pos: [number, number, number], target: [number, number, number]) => {
      const app = appRef.current;
      if (!app) return;
      app.getCamera().position.set(pos[0], pos[1], pos[2]);
      app.getControls().target.set(target[0], target[1], target[2]);
      app.getControls().update();
    },
    getTerrainBounds: () => {
      return terrainRef.current?.getSceneBounds() ?? null;
    },
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

    if (skipCameraReset && !hasResetRef.current) {
      hasResetRef.current = true;
    } else {
      appRef.current.resetCamera();
    }
  }, [terrainData, onElevationRange, skipCameraReset]);

  useEffect(() => {
    terrainRef.current?.setExaggeration(exaggeration);
  }, [exaggeration]);

  useEffect(() => {
    terrainRef.current?.setColorRamp(colorRamp);
  }, [colorRamp]);

  useEffect(() => {
    terrainRef.current?.setWireframe(wireframe);
  }, [wireframe]);

  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    const scene = app.getScene();

    for (const obj of profileObjectsRef.current) {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else (obj.material as THREE.Material).dispose();
      }
    }
    profileObjectsRef.current = [];

    const markerColor = 0xff4444;
    const lineColor = 0xffcc00;
    const markerRadius = 2;

    if (profileStart) {
      const geo = new THREE.SphereGeometry(markerRadius, 16, 12);
      const mat = new THREE.MeshBasicMaterial({ color: markerColor, depthTest: false, transparent: true, opacity: 0.9 });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(profileStart.x, profileStart.y + markerRadius * 0.5, profileStart.z);
      sphere.renderOrder = 999;
      scene.add(sphere);
      profileObjectsRef.current.push(sphere);
    }

    if (profileEnd) {
      const geo = new THREE.SphereGeometry(markerRadius, 16, 12);
      const mat = new THREE.MeshBasicMaterial({ color: markerColor, depthTest: false, transparent: true, opacity: 0.9 });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(profileEnd.x, profileEnd.y + markerRadius * 0.5, profileEnd.z);
      sphere.renderOrder = 999;
      scene.add(sphere);
      profileObjectsRef.current.push(sphere);
    }

    if (profileStart && profileEnd) {
      const points = [];
      const numSegments = 100;
      const mesh = terrainRef.current?.getMesh();

      if (mesh) {
        const raycaster = new THREE.Raycaster();
        const downDir = new THREE.Vector3(0, -1, 0);

        for (let i = 0; i <= numSegments; i++) {
          const t = i / numSegments;
          const x = profileStart.x + (profileEnd.x - profileStart.x) * t;
          const z = profileStart.z + (profileEnd.z - profileStart.z) * t;
          const y = profileStart.y + (profileEnd.y - profileStart.y) * t;

          const origin = new THREE.Vector3(x, 5000, z);
          raycaster.set(origin, downDir);
          const hits = raycaster.intersectObject(mesh);
          if (hits.length > 0) {
            points.push(new THREE.Vector3(x, hits[0].point.y + 1.0, z));
          } else {
            points.push(new THREE.Vector3(x, y + 1.0, z));
          }
        }
      } else {
        points.push(
          new THREE.Vector3(profileStart.x, profileStart.y + 1.0, profileStart.z),
          new THREE.Vector3(profileEnd.x, profileEnd.y + 1.0, profileEnd.z)
        );
      }

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 2, depthTest: false, transparent: true, opacity: 0.95 });
      const line = new THREE.Line(lineGeo, lineMat);
      line.renderOrder = 998;
      scene.add(line);
      profileObjectsRef.current.push(line);
    }

    return () => {
      if (!appRef.current) return;
      const s = appRef.current.getScene();
      for (const obj of profileObjectsRef.current) {
        s.remove(obj);
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else (obj.material as THREE.Material).dispose();
        }
      }
      profileObjectsRef.current = [];
    };
  }, [profileStart, profileEnd]);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    appRef.current?.resetCamera();
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!profileMode || !onProfileClick || !appRef.current || !terrainRef.current) return;

      const app = appRef.current;
      const renderer = app.getRenderer();
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, app.getCamera());

      const meshObj = terrainRef.current.getMesh();
      if (!meshObj) return;

      const intersects = raycaster.intersectObject(meshObj);
      if (intersects.length > 0) {
        const pt = intersects[0].point;
        onProfileClick({ x: pt.x, y: pt.y, z: pt.z });
      }
    },
    [profileMode, onProfileClick]
  );

  return (
    <div
      ref={containerRef}
      className={`viewport ${profileMode ? "profile-active" : ""}`}
      onClick={handleCanvasClick}
      role="application"
      aria-label="3D Terrain Viewport"
      tabIndex={0}
    >
      <button className="reset-camera-btn" onClick={handleReset} title="Reset camera" aria-label="Reset camera to default view">
        Reset View
      </button>
      {profileMode && (
        <div className="profile-mode-indicator" role="status" aria-live="polite">Click two points on terrain for profile</div>
      )}
    </div>
  );
});
