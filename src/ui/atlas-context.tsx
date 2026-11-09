import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { availableYears, chooseFilters, reconcileYear } from '../core/coverage.ts';
import type { SharedFilters } from '../core/query.ts';
import { IDENTITY_CAMERA, readAtlasQuery, type Camera } from './atlas.ts';
import { useModel } from './model.tsx';

export interface MapFocus {
  geometryId: string;
  entityId: string | null;
  propertyId?: string;
}

export interface AtlasApi {
  filters: SharedFilters;
  setFilters: (filters: SharedFilters) => void;
  year: number;
  years: number[];
  setYear: (year: number) => void;
  layer: 'world' | 'greece';
  setLayer: (layer: 'world' | 'greece') => void;
  focus: MapFocus | null;
  setFocus: (focus: MapFocus | null) => void;
  dossierOpen: boolean;
  setDossierOpen: (open: boolean) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  cameraFor: (layer: 'world' | 'greece') => Camera;
  rememberCamera: (layer: 'world' | 'greece', camera: Camera) => void;
  active: boolean;
}

const AtlasContext = createContext<AtlasApi | null>(null);

export function useAtlas(): AtlasApi {
  const atlas = useContext(AtlasContext);
  if (!atlas) throw new Error('atlas missing');
  return atlas;
}

export function AtlasProvider({ children }: { children: ReactNode }) {
  const model = useModel();
  const workspace = model.workspace;
  const restored = useRef(readAtlasQuery(typeof location === 'undefined' ? '' : location.hash));
  const [workspaceId, setWorkspaceId] = useState('');
  const [filters, setFilters] = useState<SharedFilters>({ year: restored.current.year ?? 1900, basis: 'reported', sourceIds: [] });
  const [layer, setLayerState] = useState<'world' | 'greece'>(restored.current.layer ?? 'world');
  const [cameras, setCameras] = useState<Record<'world' | 'greece', Camera>>(() => ({
    world: restored.current.layer === 'greece' ? IDENTITY_CAMERA : restored.current.camera ?? IDENTITY_CAMERA,
    greece: restored.current.layer === 'greece' ? restored.current.camera ?? IDENTITY_CAMERA : IDENTITY_CAMERA,
  }));
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  if (workspace && workspace.id !== workspaceId) {
    const chosen = chooseFilters(workspace);
    setWorkspaceId(workspace.id);
    setFilters({ ...chosen, year: restored.current.year ?? chosen.year });
    setFocus(null);
    restored.current = { ...restored.current, year: undefined };
  }

  const years = workspace ? availableYears(workspace, filters) : [];
  const year = workspace ? reconcileYear(filters.year, years) : filters.year;
  if (workspace && year !== filters.year) setFilters({ ...filters, year });

  useEffect(() => {
    if (!workspace || model.section !== 'modules') return;
    const camera = cameras[layer];
    const params = new URLSearchParams();
    params.set('layer', layer);
    params.set('year', String(year));
    params.set('vx', String(Math.round(camera.x)));
    params.set('vy', String(Math.round(camera.y)));
    params.set('vk', camera.k.toFixed(2));
    const next = `#/workspace/${encodeURIComponent(workspace.id)}/modules?${params.toString()}`;
    if (decodeURIComponent(location.hash) !== decodeURIComponent(next)) history.replaceState(null, '', next);
  }, [workspace, model.section, layer, year, cameras]);

  const api: AtlasApi = {
    filters: { ...filters, year },
    setFilters,
    year,
    years: years.length > 0 ? years : [year],
    setYear(next) { setFilters(current => ({ ...current, year: next })); },
    layer,
    setLayer(next) {
      setLayerState(next);
      setFocus(null);
    },
    focus,
    setFocus,
    dossierOpen,
    setDossierOpen,
    filtersOpen,
    setFiltersOpen,
    cameraFor(id) { return cameras[id]; },
    rememberCamera(id, camera) {
      setCameras(current => {
        const previous = current[id];
        if (previous.x === camera.x && previous.y === camera.y && previous.k === camera.k) return current;
        return { ...current, [id]: camera };
      });
    },
    active: model.section === 'modules' && Boolean(workspace),
  };

  return <AtlasContext.Provider value={api}>{children}</AtlasContext.Provider>;
}
