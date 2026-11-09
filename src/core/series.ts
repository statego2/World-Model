import { readSubjectMetric, type SharedFilters } from './query.ts';
import type { Workspace } from './types.ts';

export interface SeriesPoint { year: number; status: 'value' | 'missing' | 'conflict'; value: number | null; factId: string | null }
export interface SeriesRow { entityId: string; points: SeriesPoint[] }

/** Years are only those present on at least one selected entity. A gap stays missing. */
export function timeSeries(workspace: Workspace, entityIds: string[], propertyId: string, filters: Omit<SharedFilters, 'year'>): { years: number[]; rows: SeriesRow[]; unit: string | null } {
  const property = workspace.properties.find(item => item.id === propertyId);
  const years = new Set<number>();
  for (const fact of workspace.facts) {
    if (!entityIds.includes(fact.subjectId) || fact.propertyId !== propertyId || fact.subjectKind !== 'entity') continue;
    if (fact.basis !== filters.basis || fact.status === 'missing' || typeof fact.value !== 'number') continue;
    if (!fact.evidenceIds.some(id => filters.sourceIds.includes(id))) continue;
    const year = Number(fact.validFrom.slice(0, 4));
    if (Number.isInteger(year)) years.add(year);
  }
  const ordered = [...years].sort((left, right) => left - right);
  const rows = entityIds.map(entityId => ({
    entityId,
    points: ordered.map(year => {
      const reading = readSubjectMetric(workspace, 'entity', entityId, propertyId, { ...filters, year });
      if (reading.status === 'value') return { year, status: 'value' as const, value: reading.values[0]?.value ?? null, factId: reading.values[0]?.factId ?? null };
      return { year, status: reading.status, value: null, factId: null };
    }),
  }));
  return { years: ordered, rows, unit: property?.unit ?? null };
}
