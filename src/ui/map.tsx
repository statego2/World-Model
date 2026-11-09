export interface MapFeature {
  id: string;
  polygons: number[][][];
}

interface Bounds { minLon: number; maxLon: number; minLat: number; maxLat: number }

export function GeoMap({ features, idAttribute, values, bounds, label, selectedId, onSelect }: {
  features: MapFeature[];
  idAttribute: 'data-iso' | 'data-nuts';
  values: Record<string, number | 'none'>;
  bounds: Bounds;
  label: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const numbers = Object.values(values).filter((value): value is number => typeof value === 'number');
  const min = numbers.length > 0 ? Math.min(...numbers) : 0;
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return (
    <svg className="map" viewBox="0 0 1000 520" role="group" aria-label={label}>
      {features.map(feature => {
        const value = values[feature.id] ?? 'none';
        const valued = value !== 'none';
        return (
          <path
            key={feature.id}
            {...{ [idAttribute]: feature.id }}
            data-value={value}
            data-scale={valued ? scaleOf(value, min, max) : 'none'}
            tabIndex={0}
            role="button"
            aria-pressed={selectedId === feature.id}
            aria-label={feature.id}
            className={`${valued ? 'valued' : 'nodata'}${selectedId === feature.id ? ' selected' : ''}`}
            style={valued ? { fill: shade(value, min, max) } : undefined}
            onClick={() => onSelect?.(feature.id)}
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
    </svg>
  );
}

function scaleOf(value: number, min: number, max: number): string {
  if (max === min) return '1';
  return ((value - min) / (max - min)).toFixed(3);
}

function shade(value: number, min: number, max: number): string {
  const ratio = max === min ? 1 : (value - min) / (max - min);
  return `hsl(38 62% ${Math.round(26 + ratio * 46)}%)`;
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
