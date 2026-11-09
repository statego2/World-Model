import { useEffect, useRef, useState } from 'react';
import { IDENTITY_CAMERA, type Camera } from './atlas.ts';

export interface MapFeature {
  id: string;
  polygons: number[][][];
}

interface Bounds { minLon: number; maxLon: number; minLat: number; maxLat: number }

export const CHOROPLETH = ['#3d4a32', '#6a7848', '#a08a45', '#d4a24a', '#f2c36a'];

export function GeoMap({ features, idAttribute, values, bounds, label, selectedId, initialCamera, focusZoom, onViewport, onSelect, onHover }: {
  features: MapFeature[];
  idAttribute: 'data-iso' | 'data-nuts';
  values: Record<string, number | 'none'>;
  bounds: Bounds;
  label: string;
  selectedId?: string | null;
  initialCamera?: Camera;
  focusZoom?: number;
  onViewport?: (camera: Camera) => void;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null, point?: { x: number; y: number }) => void;
}) {
  const [camera, setCamera] = useState(initialCamera ?? IDENTITY_CAMERA);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const onViewportRef = useRef(onViewport);
  onViewportRef.current = onViewport;
  useEffect(() => {
    if (!selectedId) return;
    const feature = features.find(item => item.id === selectedId);
    if (!feature) return;
    const next = focusCamera(feature, bounds, focusZoom ?? 5);
    setCamera(next);
    onViewportRef.current?.(next);
    // The zoom target depends on the selection, not on later pans.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  const numbers = Object.values(values).filter((value): value is number => typeof value === 'number');
  const min = numbers.length > 0 ? Math.min(...numbers) : 0;
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  const publish = (next: Camera) => {
    setCamera(next);
    onViewportRef.current?.(next);
  };
  return (
    <svg
      className="map"
      viewBox="0 0 1000 520"
      role="group"
      aria-label={label}
      onWheel={event => {
        event.preventDefault();
        const next = event.deltaY < 0 ? camera.k * 1.12 : camera.k / 1.12;
        publish({ ...camera, k: Math.min(8, Math.max(1, next)) });
      }}
      onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY, cx: camera.x, cy: camera.y }; }}
      onPointerMove={event => {
        if (!drag.current) return;
        const next = { ...cameraRef.current, x: drag.current.cx + event.clientX - drag.current.x, y: drag.current.cy + event.clientY - drag.current.y, k: cameraRef.current.k };
        cameraRef.current = next;
        setCamera(next);
      }}
      onPointerUp={() => {
        if (!drag.current) return;
        drag.current = null;
        onViewportRef.current?.(cameraRef.current);
      }}
      onPointerLeave={() => { onHover?.(null); }}
    >
      <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.k})`}>
        {features.map(feature => {
          const value = values[feature.id] ?? 'none';
          const valued = value !== 'none';
          const zero = value === 0;
          const klass = valued ? classOf(value, min, max) : -1;
          return (
            <path
              key={feature.id}
              {...{ [idAttribute]: feature.id }}
              data-value={value}
              data-scale={valued ? scaleOf(value, min, max) : 'none'}
              data-class={valued ? String(klass) : 'none'}
              data-zero={zero ? 'true' : 'false'}
              tabIndex={0}
              role="button"
              aria-pressed={selectedId === feature.id}
              aria-label={feature.id}
              className={`${zero ? 'zero' : valued ? 'valued' : 'nodata'}${selectedId === feature.id ? ' selected' : ''}`}
              style={valued && !zero ? { fill: CHOROPLETH[klass] ?? CHOROPLETH[4] } : undefined}
              onClick={() => onSelect?.(feature.id)}
              onMouseEnter={event => onHover?.(feature.id, { x: event.clientX, y: event.clientY })}
              onMouseLeave={() => onHover?.(null)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect?.(feature.id);
                }
              }}
              d={feature.polygons.map(ring => ring.map((point, index) => {
                const [x, y] = project(point[0] ?? 0, point[1] ?? 0, bounds);
                return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
              }).join(' ') + ' Z').join(' ')}
            />
          );
        })}
      </g>
    </svg>
  );
}

export function focusCamera(feature: MapFeature, bounds: Bounds, maxZoom = 5): Camera {
  let best = ringBox(feature.polygons[0] ?? []);
  for (const ring of feature.polygons) {
    const next = ringBox(ring);
    if (next.area > best.area) best = next;
  }
  const [x0, y0] = project(best.minLon, best.maxLat, bounds);
  const [x1, y1] = project(best.maxLon, best.minLat, bounds);
  const width = Math.max(12, Math.abs(x1 - x0));
  const height = Math.max(12, Math.abs(y1 - y0));
  if (maxZoom <= 1) return IDENTITY_CAMERA;
  const k = Math.min(maxZoom, Math.max(1, Math.min((1000 * 0.42) / width, (520 * 0.42) / height)));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { x: 500 - cx * k, y: 260 - cy * k, k };
}

function ringBox(ring: number[][]): { minLon: number; maxLon: number; minLat: number; maxLat: number; area: number } {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const point of ring) {
    const lon = point[0] ?? 0;
    const lat = point[1] ?? 0;
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  if (!Number.isFinite(minLon)) return { minLon: 0, maxLon: 0, minLat: 0, maxLat: 0, area: 0 };
  return { minLon, maxLon, minLat, maxLat, area: (maxLon - minLon) * (maxLat - minLat) };
}

function classOf(value: number, min: number, max: number): number {
  const span = logSpan(min, max);
  if (!span) return 4;
  return Math.min(4, Math.floor(((Math.log10(Math.max(value, 1)) - span.lo) / (span.hi - span.lo)) * 5));
}

function scaleOf(value: number, min: number, max: number): string {
  const span = logSpan(min, max);
  if (!span) return '1';
  return ((Math.log10(Math.max(value, 1)) - span.lo) / (span.hi - span.lo)).toFixed(3);
}

function logSpan(min: number, max: number): { lo: number; hi: number } | null {
  const lo = Math.log10(Math.max(min, 1));
  const hi = Math.log10(Math.max(max, 1));
  if (hi === lo) return null;
  return { lo, hi };
}

export function boundsOf(features: MapFeature[], fallback: Bounds): Bounds {
  let minLon = Infinity; let maxLon = -Infinity; let minLat = Infinity; let maxLat = -Infinity;
  for (const feature of features) for (const ring of feature.polygons) for (const point of ring) {
    const lon = point[0] ?? 0; const lat = point[1] ?? 0;
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  if (!Number.isFinite(minLon)) return fallback;
  const padLon = (maxLon - minLon) * 0.04 || 1;
  const padLat = (maxLat - minLat) * 0.04 || 1;
  return { minLon: minLon - padLon, maxLon: maxLon + padLon, minLat: minLat - padLat, maxLat: maxLat + padLat };
}

function project(lon: number, lat: number, bounds: Bounds): [number, number] {
  const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 1000;
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 520;
  return [x, y];
}
