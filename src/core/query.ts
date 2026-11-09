import { stableStringify } from './actions.ts';
import type { Basis, Fact, PathQuery, Relationship, Workspace } from './types.ts';

export const QUERY_VERSION = 1;
export const CAUSATION_NOTE = 'Η διαδρομή συνδέει τεκμηριωμένους ισχυρισμούς. Δεν αποδεικνύει αιτιότητα, ιδιοκτησία ή έλεγχο.';

export interface SharedFilters {
  year: number;
  basis: Basis;
  sourceIds: string[];
}

export interface QueryMeta {
  matchedIds: string[];
  sourceIds: string[];
  excludedCount: number;
  missingCount: number;
  conflictCount: number;
  queryVersion: 1;
  workspaceRevision: number;
  truncated: boolean;
  note: string;
}

export interface PathHit {
  entityIds: string[];
  relationshipIds: string[];
  sourceIds: string[];
}

export interface PathQueryResult extends QueryMeta {
  paths: PathHit[];
}

export interface MetricReading {
  entityId: string;
  status: 'value' | 'missing' | 'conflict';
  values: { factId: string; value: number }[];
  unit: string | null;
}

export interface RankRow extends MetricReading {
  rank: number | null;
}

interface CacheEntry { revision: number; value: unknown }
const cache = new Map<string, CacheEntry>();
let hits = 0;
let misses = 0;

export function queryCacheStats(): { hits: number; misses: number; size: number } {
  return { hits, misses, size: cache.size };
}

export function clearQueryCache(): void {
  cache.clear();
  hits = 0;
  misses = 0;
}

export function runPathQuery(workspace: Workspace, query: PathQuery): PathQueryResult {
  return remember(workspace, `path:${stableStringify(query)}`, () => computePath(workspace, query));
}

export function runSavedView(workspace: Workspace, viewId: string): PathQueryResult {
  const view = workspace.savedViews.find(item => item.id === viewId);
  if (!view) {
    return emptyPath(workspace, 0, 0, 0);
  }
  return runPathQuery(workspace, view.query);
}

export function compareEntities(workspace: Workspace, entityIds: string[], propertyId: string, filters: SharedFilters): { ok: true; rows: MetricReading[]; meta: QueryMeta } | { ok: false; message: string } {
  if (entityIds.length < 2 || entityIds.length > 5) return { ok: false, message: 'Η σύγκριση δέχεται 2 έως 5 οντότητες.' };
  const property = workspace.properties.find(item => item.id === propertyId);
  if (!property || property.valueType !== 'number') return { ok: false, message: 'Η σύγκριση χρειάζεται μία αριθμητική ιδιότητα.' };
  const rows = entityIds.map(entityId => readMetric(workspace, entityId, propertyId, filters));
  return { ok: true, rows, meta: metaFrom(workspace, rows, filters.sourceIds) };
}

export function rankEntities(workspace: Workspace, coveredIds: string[], propertyId: string, filters: SharedFilters): { ok: true; rows: RankRow[]; meta: QueryMeta } | { ok: false; message: string } {
  const property = workspace.properties.find(item => item.id === propertyId);
  if (!property || property.valueType !== 'number' || !property.unit) return { ok: false, message: 'Η κατάταξη χρειάζεται αριθμητική ιδιότητα με μονάδα.' };
  const readings = coveredIds.map(entityId => readMetric(workspace, entityId, propertyId, filters));
  const ranked = readings
    .filter(row => row.status === 'value')
    .sort((a, b) => (b.values[0]?.value ?? 0) - (a.values[0]?.value ?? 0));
  let rank = 0;
  let previous: number | null = null;
  const rankOf = new Map<string, number>();
  for (const row of ranked) {
    const value = row.values[0]?.value ?? 0;
    if (previous === null || value !== previous) rank += 1;
    previous = value;
    rankOf.set(row.entityId, rank);
  }
  const rows: RankRow[] = readings.map(row => ({ ...row, rank: row.status === 'value' ? rankOf.get(row.entityId) ?? null : null }));
  return { ok: true, rows, meta: metaFrom(workspace, readings, filters.sourceIds) };
}

function computePath(workspace: Workspace, query: PathQuery): PathQueryResult {
  if (query.sourceIds.length === 0 || query.steps.length === 0) return emptyPath(workspace, 0, 0, 0);
  const filters: SharedFilters = { year: query.year, basis: query.basis, sourceIds: query.sourceIds };
  const paths: PathHit[] = [];
  let excludedCount = 0;
  let budget = 5000;
  const walk = (entityId: string, stepIndex: number, entities: string[], edges: string[], seen: Set<string>): void => {
    if (budget <= 0) return;
    budget -= 1;
    if (paths.length > query.limit) return;
    if (stepIndex === query.steps.length) {
      paths.push({ entityIds: [...entities], relationshipIds: [...edges], sourceIds: [...query.sourceIds] });
      return;
    }
    const step = query.steps[stepIndex];
    if (!step) return;
    for (const relationship of workspace.relationships) {
      if (relationship.typeId !== step.relationshipTypeId) continue;
      const next = step.direction === 'out' ? relationship.toId : relationship.fromId;
      const origin = step.direction === 'out' ? relationship.fromId : relationship.toId;
      if (origin !== entityId) continue;
      if (!edgeMatches(relationship, filters)) {
        excludedCount += 1;
        continue;
      }
      if (seen.has(next)) {
        excludedCount += 1;
        continue;
      }
      seen.add(next);
      entities.push(next);
      edges.push(relationship.id);
      walk(next, stepIndex + 1, entities, edges, seen);
      entities.pop();
      edges.pop();
      seen.delete(next);
    }
  };
  if (workspace.entities.some(entity => entity.id === query.startEntityId)) {
    walk(query.startEntityId, 0, [query.startEntityId], [], new Set([query.startEntityId]));
  }
  const truncated = paths.length > query.limit || budget <= 0;
  const kept = paths.slice(0, query.limit);
  const matched = [...new Set(kept.flatMap(path => [...path.entityIds, ...path.relationshipIds]))];
  return {
    paths: kept,
    matchedIds: matched,
    sourceIds: [...query.sourceIds],
    excludedCount,
    missingCount: kept.length === 0 ? 1 : 0,
    conflictCount: 0,
    queryVersion: QUERY_VERSION,
    workspaceRevision: workspace.revision,
    truncated,
    note: CAUSATION_NOTE,
  };
}

function edgeMatches(relationship: Relationship, filters: SharedFilters): boolean {
  if (relationship.basis !== filters.basis) return false;
  if (!coversYear(relationship.validFrom, relationship.validTo, filters.year)) return false;
  return relationship.evidenceIds.some(id => filters.sourceIds.includes(id));
}

function coversYear(validFrom: string, validTo: string | null, year: number): boolean {
  return validFrom <= `${year}-12-31` && (validTo === null || validTo >= `${year}-01-01`);
}

export function readSubjectMetric(workspace: Workspace, subjectKind: 'entity' | 'relationship', subjectId: string, propertyId: string, filters: SharedFilters): MetricReading {
  const property = workspace.properties.find(item => item.id === propertyId);
  const unit = property?.unit ?? null;
  const superseded = new Set(workspace.facts.flatMap(fact => fact.supersedesId ? [fact.supersedesId] : []));
  const matches = workspace.facts.filter(fact => (
    fact.subjectKind === subjectKind
    && fact.subjectId === subjectId
    && fact.propertyId === propertyId
    && fact.basis === filters.basis
    && !superseded.has(fact.id)
    && fact.status !== 'missing'
    && typeof fact.value === 'number'
    && coversYear(fact.validFrom, fact.validTo, filters.year)
    && fact.evidenceIds.some(id => filters.sourceIds.includes(id))
    && (!property || property.frequency !== 'annual' || (fact.validFrom === `${filters.year}-01-01` && fact.validTo === `${filters.year}-12-31`))
  ));
  if (matches.length === 0) return { entityId: subjectId, status: 'missing', values: [], unit };
  if (matches.length > 1) return { entityId: subjectId, status: 'conflict', values: matches.map(fact => ({ factId: fact.id, value: fact.value as number })), unit };
  const fact = matches[0] as Fact;
  return { entityId: subjectId, status: 'value', values: [{ factId: fact.id, value: fact.value as number }], unit };
}

function readMetric(workspace: Workspace, entityId: string, propertyId: string, filters: SharedFilters): MetricReading {
  return readSubjectMetric(workspace, 'entity', entityId, propertyId, filters);
}

function metaFrom(workspace: Workspace, rows: MetricReading[], sourceIds: string[]): QueryMeta {
  return {
    matchedIds: rows.filter(row => row.status === 'value').map(row => row.entityId),
    sourceIds: [...sourceIds],
    excludedCount: 0,
    missingCount: rows.filter(row => row.status === 'missing').length,
    conflictCount: rows.filter(row => row.status === 'conflict').length,
    queryVersion: QUERY_VERSION,
    workspaceRevision: workspace.revision,
    truncated: false,
    note: CAUSATION_NOTE,
  };
}

function emptyPath(workspace: Workspace, excludedCount: number, missingCount: number, conflictCount: number): PathQueryResult {
  return {
    paths: [],
    matchedIds: [],
    sourceIds: [],
    excludedCount,
    missingCount,
    conflictCount,
    queryVersion: QUERY_VERSION,
    workspaceRevision: workspace.revision,
    truncated: false,
    note: CAUSATION_NOTE,
  };
}

function remember<T>(workspace: Workspace, key: string, compute: () => T): T {
  const id = `${workspace.id}:${workspace.revision}:${key}`;
  const found = cache.get(id);
  if (found && found.revision === workspace.revision) {
    hits += 1;
    return structuredClone(found.value) as T;
  }
  misses += 1;
  const value = compute();
  cache.set(id, { revision: workspace.revision, value: structuredClone(value) });
  return structuredClone(value) as T;
}
