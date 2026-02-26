import { useMemo } from "react";
import type { TerrainData } from "../three/modules/TerrainModule";

interface ProfilePoint {
  x: number;
  y: number;
  z: number;
}

interface ProfileToolProps {
  terrainData: TerrainData;
  startPoint: ProfilePoint;
  endPoint: ProfilePoint;
  terrainBounds: { sizeX: number; sizeZ: number };
  onClear: () => void;
}

interface ProfileSample {
  distance: number;
  elevation: number;
}

function sampleElevation(td: TerrainData, normX: number, normZ: number): number {
  const gx = Math.max(0, Math.min(1, normX)) * (td.width - 1);
  const gy = Math.max(0, Math.min(1, normZ)) * (td.height - 1);
  const ix = Math.max(0, Math.min(td.width - 1, Math.floor(gx)));
  const iy = Math.max(0, Math.min(td.height - 1, Math.floor(gy)));
  const v = td.elevations[iy * td.width + ix];
  if (td.noDataValue !== null && v === td.noDataValue) return NaN;
  if (!isFinite(v)) return NaN;
  return v;
}

export function ProfileTool({ terrainData, startPoint, endPoint, terrainBounds, onClear }: ProfileToolProps) {
  const { samples, stats } = useMemo(() => {
    const numSamples = 200;
    const samples: ProfileSample[] = [];

    const dx = endPoint.x - startPoint.x;
    const dz = endPoint.z - startPoint.z;
    const totalDist3D = Math.sqrt(dx * dx + dz * dz);

    const halfX = terrainBounds.sizeX / 2;
    const halfZ = terrainBounds.sizeZ / 2;

    let minElev = Infinity;
    let maxElev = -Infinity;
    let totalAscent = 0;
    let totalDescent = 0;
    let prevElev: number | null = null;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const wx = startPoint.x + dx * t;
      const wz = startPoint.z + dz * t;

      const normX = (wx + halfX) / terrainBounds.sizeX;
      const normZ = (wz + halfZ) / terrainBounds.sizeZ;

      const elev = sampleElevation(terrainData, normX, normZ);
      const dist = t * totalDist3D;

      if (!isNaN(elev)) {
        samples.push({ distance: dist, elevation: elev });
        if (elev < minElev) minElev = elev;
        if (elev > maxElev) maxElev = elev;
        if (prevElev !== null) {
          const diff = elev - prevElev;
          if (diff > 0) totalAscent += diff;
          else totalDescent += Math.abs(diff);
        }
        prevElev = elev;
      }
    }

    return {
      samples,
      stats: {
        startElev: samples.length > 0 ? samples[0].elevation : 0,
        endElev: samples.length > 0 ? samples[samples.length - 1].elevation : 0,
        minElev: isFinite(minElev) ? minElev : 0,
        maxElev: isFinite(maxElev) ? maxElev : 0,
        totalAscent,
        totalDescent,
        distance: totalDist3D,
      },
    };
  }, [terrainData, startPoint, endPoint, terrainBounds]);

  const svgW = 600;
  const svgH = 120;
  const padL = 50;
  const padR = 10;
  const padT = 10;
  const padB = 25;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const elevRange = stats.maxElev - stats.minElev || 1;
  const distMax = stats.distance || 1;

  const pathD = samples
    .map((s, i) => {
      const x = padL + (s.distance / distMax) * plotW;
      const y = padT + plotH - ((s.elevation - stats.minElev) / elevRange) * plotH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const fillD =
    pathD +
    ` L${(padL + plotW).toFixed(1)},${(padT + plotH).toFixed(1)} L${padL},${(padT + plotH).toFixed(1)} Z`;

  return (
    <div className="profile-panel">
      <div className="profile-header">
        <span className="profile-title">Elevation Profile</span>
        <div className="profile-stats">
          <span>Start: {stats.startElev.toFixed(1)}m</span>
          <span>End: {stats.endElev.toFixed(1)}m</span>
          <span>Min: {stats.minElev.toFixed(1)}m</span>
          <span>Max: {stats.maxElev.toFixed(1)}m</span>
          <span>Ascent: +{stats.totalAscent.toFixed(1)}m</span>
          <span>Descent: -{stats.totalDescent.toFixed(1)}m</span>
        </div>
        <button className="profile-clear-btn" onClick={onClear} aria-label="Clear elevation profile">Clear</button>
      </div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="profile-svg"
        preserveAspectRatio="none"
        role="img"
        aria-label="Elevation profile cross-section graph"
      >
        <rect x={padL} y={padT} width={plotW} height={plotH} fill="rgba(255,255,255,0.05)" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + plotH - t * plotH;
          const elev = stats.minElev + t * elevRange;
          return (
            <g key={t}>
              <line
                x1={padL}
                y1={y}
                x2={padL + plotW}
                y2={y}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.5"
              />
              <text
                x={padL - 4}
                y={y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.6)"
                fontSize="8"
                fontFamily="monospace"
              >
                {elev.toFixed(0)}
              </text>
            </g>
          );
        })}
        <path d={fillD} fill="rgba(0,122,194,0.2)" />
        <path d={pathD} fill="none" stroke="#007ac2" strokeWidth="1.5" />
        <text
          x={padL + plotW / 2}
          y={svgH - 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="8"
          fontFamily="monospace"
        >
          Distance ({distMax.toFixed(0)} units)
        </text>
      </svg>
    </div>
  );
}
