import type { Basis, Workspace } from './types.ts';

export const NEIGHBORHOOD_NODE_LIMIT = 200;
export const NEIGHBORHOOD_EDGE_LIMIT = 500;
export const NEIGHBORHOOD_NOTE = 'Η γειτονιά συνδέει τεκμηριωμένες σχέσεις έως δύο βήματα. Δεν αποδεικνύει αιτιότητα, ιδιοκτησία ή έλεγχο.';

export interface NeighborhoodQuery {
  startEntityId: string;
  hops: 1 | 2;
  direction: 'out' | 'in' | 'both';
  relationshipTypeIds: string[];
  year: number;
  basis: Basis;
  sourceIds: string[];
}

export interface NeighborhoodNode { id: string; hop: number }
export interface NeighborhoodEdge { id: string; fromId: string; toId: string; hop: number }

export interface NeighborhoodResult {
  nodes: NeighborhoodNode[];
  edges: NeighborhoodEdge[];
  truncated: boolean;
  note: string;
}

export function searchEntities(workspace: Workspace, query: string, limit = 20): { id: string; label: string }[] {
  const needle = query.trim().toLocaleLowerCase('el');
  if (!needle) return [];
  return workspace.entities
    .filter(entity => !entity.archived && (entity.label.toLocaleLowerCase('el').includes(needle) || entity.id.toLocaleLowerCase('el').includes(needle)))
    .slice(0, limit)
    .map(entity => ({ id: entity.id, label: entity.label }));
}

export function neighborhood(workspace: Workspace, query: NeighborhoodQuery, limits: { nodes: number; edges: number } = { nodes: NEIGHBORHOOD_NODE_LIMIT, edges: NEIGHBORHOOD_EDGE_LIMIT }): NeighborhoodResult {
  const nodes: NeighborhoodNode[] = [];
  const edges: NeighborhoodEdge[] = [];
  const seen = new Set<string>();
  let truncated = false;
  if (!workspace.entities.some(entity => entity.id === query.startEntityId)) {
    return { nodes, edges, truncated, note: NEIGHBORHOOD_NOTE };
  }
  const queue: { id: string; hop: number }[] = [{ id: query.startEntityId, hop: 0 }];
  seen.add(query.startEntityId);
  nodes.push({ id: query.startEntityId, hop: 0 });
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.hop >= query.hops) continue;
    for (const relationship of workspace.relationships) {
      if (!edgeVisible(relationship, query)) continue;
      const forward = relationship.fromId === current.id;
      const backward = relationship.toId === current.id;
      const allowed = query.direction === 'both' ? forward || backward : query.direction === 'out' ? forward : backward;
      if (!allowed || edges.some(edge => edge.id === relationship.id)) continue;
      if (edges.length >= limits.edges) { truncated = true; return { nodes, edges, truncated, note: NEIGHBORHOOD_NOTE }; }
      edges.push({ id: relationship.id, fromId: relationship.fromId, toId: relationship.toId, hop: current.hop + 1 });
      const next = forward ? relationship.toId : relationship.fromId;
      if (seen.has(next)) continue;
      if (nodes.length >= limits.nodes) { truncated = true; return { nodes, edges, truncated, note: NEIGHBORHOOD_NOTE }; }
      seen.add(next);
      nodes.push({ id: next, hop: current.hop + 1 });
      queue.push({ id: next, hop: current.hop + 1 });
    }
  }
  return { nodes, edges, truncated, note: NEIGHBORHOOD_NOTE };
}

function edgeVisible(relationship: Workspace['relationships'][number], query: NeighborhoodQuery): boolean {
  if (query.relationshipTypeIds.length > 0 && !query.relationshipTypeIds.includes(relationship.typeId)) return false;
  if (relationship.basis !== query.basis) return false;
  if (!(relationship.validFrom <= `${query.year}-12-31` && (relationship.validTo === null || relationship.validTo >= `${query.year}-01-01`))) return false;
  return relationship.evidenceIds.some(id => query.sourceIds.includes(id));
}
