import { useEffect, useRef, useCallback } from "react";

export interface UrlState {
  exaggeration?: number;
  colorRamp?: string;
  wireframe?: boolean;
  basemap?: string;
  cam?: [number, number, number];
  target?: [number, number, number];
}

export function parseUrlState(): UrlState {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};

  const params = new URLSearchParams(hash);
  const state: UrlState = {};

  const exag = params.get("exag");
  if (exag) {
    const v = parseFloat(exag);
    if (isFinite(v) && v >= 0.1 && v <= 5) state.exaggeration = v;
  }

  const ramp = params.get("ramp");
  if (ramp) state.colorRamp = ramp;

  const wire = params.get("wire");
  if (wire !== null) state.wireframe = wire === "1";

  const basemap = params.get("basemap");
  if (basemap) state.basemap = basemap;

  const cam = params.get("cam");
  if (cam) {
    const parts = cam.split(",").map(Number);
    if (parts.length === 3 && parts.every(isFinite)) {
      state.cam = parts as [number, number, number];
    }
  }

  const target = params.get("target");
  if (target) {
    const parts = target.split(",").map(Number);
    if (parts.length === 3 && parts.every(isFinite)) {
      state.target = parts as [number, number, number];
    }
  }

  return state;
}

export function useUrlStateSync(
  state: UrlState,
  getCameraState: () => { position: [number, number, number]; target: [number, number, number] } | null
) {
  const lastHashRef = useRef("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildHash = useCallback(() => {
    const params = new URLSearchParams();

    if (state.exaggeration !== undefined) {
      params.set("exag", state.exaggeration.toFixed(1));
    }
    if (state.colorRamp) params.set("ramp", state.colorRamp);
    if (state.wireframe !== undefined) params.set("wire", state.wireframe ? "1" : "0");
    if (state.basemap) params.set("basemap", state.basemap);

    const camState = getCameraState();
    if (camState) {
      const p = camState.position;
      const t = camState.target;
      params.set("cam", `${p[0].toFixed(1)},${p[1].toFixed(1)},${p[2].toFixed(1)}`);
      params.set("target", `${t[0].toFixed(1)},${t[1].toFixed(1)},${t[2].toFixed(1)}`);
    }

    return params.toString();
  }, [state, getCameraState]);

  useEffect(() => {
    const newHash = buildHash();
    if (newHash !== lastHashRef.current) {
      lastHashRef.current = newHash;
      window.history.replaceState(null, "", `#${newHash}`);
    }
  }, [buildHash]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const newHash = buildHash();
      if (newHash !== lastHashRef.current) {
        lastHashRef.current = newHash;
        window.history.replaceState(null, "", `#${newHash}`);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [buildHash]);
}
