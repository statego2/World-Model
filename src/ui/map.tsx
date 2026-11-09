export interface MapFeature {
  id: string;
  polygons: number[][][];
}

interface Bounds { minLon: number; maxLon: number; minLat: number; maxLat: number }

export function GeoMap({ features, idAttribute, values, bounds, label }: {
  features: MapFeature[];
  idAttribute: 'data-iso' | 'data-nuts';
  values: Record<string, number | 'none'>;
  bounds: Bounds;
  label: string;
}) {
  return (
    <svg className="map" viewBox="0 0 1000 520" role="img" aria-label={label}>
      {features.map(feature => (
        <path
          key={feature.id}
          {...{ [idAttribute]: feature.id }}
          data-value={values[feature.id] ?? 'none'}
          className={values[feature.id] === undefined || values[feature.id] === 'none' ? 'nodata' : 'valued'}
          d={feature.polygons.map(ring => ring.map((point, index) => {
            const [x, y] = project(point[0] ?? 0, point[1] ?? 0, bounds);
            return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
          }).join(' ') + ' Z').join(' ')}
        />
      ))}
    </svg>
  );
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
