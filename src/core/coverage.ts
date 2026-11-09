import type { SharedFilters } from './query.ts';
import type { Workspace } from './types.ts';

const ROLE_PROPERTIES = ['gdpProperty', 'populationProperty', 'defenseSpendingProperty', 'regionalGvaProperty', 'fdiStockProperty', 'fdiFlowProperty'];

export function chooseFilters(workspace: Workspace): SharedFilters {
  const sourceIds = [...new Set(workspace.facts.flatMap(fact => fact.evidenceIds))].filter(id => workspace.sources.some(source => source.id === id));
  const watched = watchedProperties(workspace);
  const counts = new Map<number, number>();
  for (const fact of workspace.facts) {
    if (fact.basis !== 'reported' || fact.status === 'missing' || typeof fact.value !== 'number') continue;
    if (!watched.includes(fact.propertyId)) continue;
    if (!fact.evidenceIds.some(id => sourceIds.includes(id))) continue;
    const year = Number(fact.validFrom.slice(0, 4));
    if (!Number.isInteger(year)) continue;
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  const year = [...counts.entries()].sort((left, right) => right[1] - left[1] || right[0] - left[0])[0]?.[0] ?? 1900;
  return { year, basis: 'reported', sourceIds };
}

export function availableYears(workspace: Workspace, filters: SharedFilters): number[] {
  const years = new Set<number>();
  for (const fact of workspace.facts) {
    if (fact.basis !== filters.basis || fact.status === 'missing' || typeof fact.value !== 'number') continue;
    if (!fact.evidenceIds.some(id => filters.sourceIds.includes(id))) continue;
    const year = Number(fact.validFrom.slice(0, 4));
    if (Number.isInteger(year)) years.add(year);
  }
  return [...years].sort((left, right) => right - left);
}

function watchedProperties(workspace: Workspace): string[] {
  const bound = ROLE_PROPERTIES.map(role => workspace.bindings[role]).filter((id): id is string => typeof id === 'string' && workspace.properties.some(property => property.id === id && property.valueType === 'number'));
  if (bound.length > 0) return bound;
  return workspace.properties.filter(property => property.valueType === 'number' && !property.deprecated).map(property => property.id);
}
