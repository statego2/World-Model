import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction } from '../src/core/actions.ts';
import { clearQueryCache, compareEntities, queryCacheStats, rankEntities, runPathQuery, runSavedView } from '../src/core/query.ts';
import type { Workspace } from '../src/core/types.ts';
import { fixture } from './support.ts';

test('the saved investor path reaches the documented Greek region', () => {
  const workspace = fixture();
  const result = runSavedView(workspace, 'view:capital-to-regions');
  assert.equal(result.paths.length, 1);
  assert.deepEqual(result.paths[0]?.entityIds, ['country:DEU', 'company:EXAMPLE', 'infra:TERMINAL', 'region:ATT']);
  assert.equal(result.truncated, false);
  assert.equal(result.workspaceRevision, workspace.revision);
  assert.match(result.note, /αιτιότητα/);
});

test('a new company and infrastructure appear in the same saved query', () => {
  clearQueryCache();
  let workspace = fixture();
  const query = structuredClone(workspace.savedViews[0]!.query);
  const before = runPathQuery(workspace, query);
  assert.equal(queryCacheStats().misses, 1);
  runPathQuery(workspace, query);
  assert.equal(queryCacheStats().hits, 1);
  workspace = must(workspace, { type: 'CreateEntity', entity: { id: 'company:SECOND', typeId: 'type:company', label: 'Δεύτερη — DEMO' } });
  workspace = must(workspace, { type: 'CreateEntity', entity: { id: 'infra:SECOND', typeId: 'type:infrastructure', label: 'Δεύτερη υποδομή — DEMO' } });
  workspace = must(workspace, { type: 'CreateRelationship', relationship: edge('edge:second-invest', 'reltype:invests_in', 'country:DEU', 'company:SECOND') });
  workspace = must(workspace, { type: 'CreateRelationship', relationship: edge('edge:second-operates', 'reltype:operates', 'company:SECOND', 'infra:SECOND') });
  workspace = must(workspace, { type: 'CreateRelationship', relationship: edge('edge:second-location', 'reltype:located_in', 'infra:SECOND', 'region:CENTRAL') });
  const after = runPathQuery(workspace, query);
  assert.equal(queryCacheStats().misses, 2);
  assert.equal(after.workspaceRevision, before.workspaceRevision + 5);
  const labels = after.paths.map(path => path.entityIds.join('>'));
  assert.ok(labels.some(path => path === 'country:DEU>company:EXAMPLE>infra:TERMINAL>region:ATT'));
  assert.ok(labels.some(path => path === 'country:DEU>company:SECOND>infra:SECOND>region:CENTRAL'));
  assert.equal(workspace.savedViews[0]?.query.startEntityId, query.startEntityId);
});

test('assumption and expired edges stay out of a reported path', () => {
  const workspace = fixture();
  workspace.entities.push({ id: 'company:SHADOW', typeId: 'type:company', label: 'Υπόθεση' });
  workspace.relationships.push({ ...edge('edge:assume', 'reltype:invests_in', 'country:DEU', 'company:SHADOW'), basis: 'assumption' });
  workspace.relationships.find(item => item.id === 'edge:investment')!.validTo = '2020-12-31';
  workspace.revision += 1;
  const result = runPathQuery(workspace, workspace.savedViews[0]!.query);
  assert.equal(result.paths.length, 0);
  assert.ok(result.excludedCount > 0);
  assert.equal(result.paths.some(path => path.entityIds.includes('company:SHADOW')), false);
});

test('cycles terminate and the result limit is declared', () => {
  const workspace = fixture();
  workspace.relationshipTypes.push({
    id: 'reltype:loop', label: 'Κύκλος', description: 'Δοκιμή τερματισμού', fromTypeIds: ['type:company'], toTypeIds: ['type:company'], directed: true,
  });
  workspace.entities.push({ id: 'company:B', typeId: 'type:company', label: 'Β' });
  workspace.relationships.push(edge('edge:ab', 'reltype:loop', 'company:EXAMPLE', 'company:B'));
  workspace.relationships.push(edge('edge:ba', 'reltype:loop', 'company:B', 'company:EXAMPLE'));
  const query = {
    startEntityId: 'company:EXAMPLE',
    steps: [
      { relationshipTypeId: 'reltype:loop', direction: 'out' as const },
      { relationshipTypeId: 'reltype:loop', direction: 'out' as const },
    ],
    year: 2023, basis: 'reported' as const, sourceIds: ['source:demo-links'], limit: 10,
  };
  const cycled = runPathQuery(workspace, query);
  assert.equal(cycled.paths.length, 0);
  assert.equal(cycled.paths.some(path => new Set(path.entityIds).size !== path.entityIds.length), false);

  const open = fixture();
  const many = runPathQuery(open, { ...open.savedViews[0]!.query, limit: 1 });
  open.entities.push({ id: 'company:SECOND', typeId: 'type:company', label: 'Δεύτερη' });
  open.entities.push({ id: 'infra:SECOND', typeId: 'type:infrastructure', label: 'Άλλη' });
  open.relationships.push(edge('edge:i2', 'reltype:invests_in', 'country:DEU', 'company:SECOND'));
  open.relationships.push(edge('edge:o2', 'reltype:operates', 'company:SECOND', 'infra:SECOND'));
  open.relationships.push(edge('edge:l2', 'reltype:located_in', 'infra:SECOND', 'region:ATT'));
  open.revision += 1;
  const truncated = runPathQuery(open, { ...open.savedViews[0]!.query, limit: 1 });
  assert.equal(truncated.paths.length, 1);
  assert.equal(truncated.truncated, true);
  assert.equal(many.paths.length, 1);
});

test('rank and compare keep units, years and conflicts apart', () => {
  const workspace = fixture();
  const filters = { year: 2023, basis: 'reported' as const, sourceIds: ['source:demo-macro'] };
  const ranked = rankEntities(workspace, ['country:GRC', 'country:TUR', 'sector:ENERGY'], 'property:military_spending', filters);
  assert.equal(ranked.ok, true);
  if (!ranked.ok) return;
  const greece = ranked.rows.find(row => row.entityId === 'country:GRC');
  const turkey = ranked.rows.find(row => row.entityId === 'country:TUR');
  const states = ranked.rows.find(row => row.entityId === 'sector:ENERGY');
  assert.equal(greece?.status, 'value');
  assert.equal(turkey?.status, 'value');
  assert.equal(states?.status, 'missing');
  assert.equal(states?.rank, null);
  assert.equal(greece?.unit, turkey?.unit);
  assert.notEqual(greece?.values[0]?.value, 0);

  const conflicted = structuredClone(workspace);
  const sample = conflicted.facts.find(fact => fact.subjectId === 'country:GRC' && fact.propertyId === 'property:military_spending' && fact.validFrom === '2023-01-01');
  conflicted.facts.push({ ...structuredClone(sample!), id: 'fact:conflict-milex', value: 1 });
  const compared = compareEntities(conflicted, ['country:GRC', 'country:TUR'], 'property:military_spending', filters);
  assert.equal(compared.ok, true);
  if (!compared.ok) return;
  assert.equal(compared.rows.find(row => row.entityId === 'country:GRC')?.status, 'conflict');
  assert.equal(compared.meta.conflictCount, 1);
  assert.ok((compared.rows.find(row => row.entityId === 'country:GRC')?.values.length ?? 0) > 1);
});

function edge(id: string, typeId: string, fromId: string, toId: string) {
  return {
    id, typeId, fromId, toId, basis: 'reported' as const, evidenceIds: ['source:demo-links'], validFrom: '2022-01-01', validTo: null,
  };
}

function must(workspace: Workspace, action: Parameters<typeof applyAction>[1]): Workspace {
  const applied = applyAction(workspace, action);
  assert.equal(applied.ok, true, applied.ok ? '' : applied.errors.map(error => error.message).join('\n'));
  if (!applied.ok) throw new Error('unreachable');
  return applied.value.workspace;
}
