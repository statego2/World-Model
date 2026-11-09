export interface Camera {
  x: number;
  y: number;
  k: number;
}

export const IDENTITY_CAMERA: Camera = { x: 0, y: 0, k: 1 };

export type LayerAvailability = 'ready' | 'empty' | 'unsupported';

export function layerAvailability(bindingPresent: boolean, valued: number): LayerAvailability {
  if (!bindingPresent) return 'unsupported';
  return valued > 0 ? 'ready' : 'empty';
}

export function layerStatusLabel(availability: LayerAvailability, enabled: boolean): string {
  if (availability === 'unsupported') return 'χωρίς ρόλο';
  if (availability === 'empty') return 'χωρίς δεδομένα';
  return enabled ? 'ενεργό' : 'διαθέσιμο';
}

export function readAtlasQuery(hash: string): { layer?: 'world' | 'greece'; year?: number; camera?: Camera } {
  const query = hash.split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  const layerRaw = params.get('layer');
  const layer = layerRaw === 'world' || layerRaw === 'greece' ? layerRaw : undefined;
  const yearRaw = params.get('year');
  const year = yearRaw !== null && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined;
  const x = numberIn(params.get('vx'), -4000, 4000);
  const y = numberIn(params.get('vy'), -4000, 4000);
  const k = numberIn(params.get('vk'), 1, 8);
  const camera = x !== undefined && y !== undefined && k !== undefined ? { x, y, k } : undefined;
  return { layer, year, camera };
}

function numberIn(value: string | null, min: number, max: number): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}
