import assert from 'node:assert/strict';
import { test } from 'node:test';
import { neighborhood, searchEntities } from '../src/core/neighborhood.ts';
import { timeSeries } from '../src/core/series.ts';
import { applyAction } from '../src/core/actions.ts';
import { fixture } from './support.ts';

const filters = { year: 2023, basis: 'reported' as const, sourceIds: ['source:demo-links'] };

test('search and a two-step neighborhood stay inside the declared limit', () => {
  const workspace = fixture();
  assert.equal(searchEntities(workspace, 'γερμαν')[0]?.id, 'country:DEU');
  assert.equal(searchEntities(workspace, '').length, 0);
  const one = neighborhood(workspace, { startEntityId: 'country:DEU', hops: 1, direction: 'out', relationshipTypeIds: [], ...filters });
  assert.equal(one.nodes.some(node => node.id === 'company:EXAMPLE'), true);
  assert.equal(one.nodes.some(node => node.id === 'infra:TERMINAL'), false);
  const two = neighborhood(workspace, { startEntityId: 'country:DEU', hops: 2, direction: 'out', relationshipTypeIds: [], ...filters });
  assert.equal(two.nodes.some(node => node.id === 'infra:TERMINAL'), true);
  assert.equal(two.nodes.some(node => node.id === 'region:ATT'), true);
  const typed = neighborhood(workspace, { startEntityId: 'country:DEU', hops: 2, direction: 'out', relationshipTypeIds: ['reltype:invests_in'], ...filters });
  assert.deepEqual(typed.nodes.map(node => node.id), ['country:DEU', 'company:EXAMPLE']);
  const capped = neighborhood(workspace, { startEntityId: 'country:DEU', hops: 2, direction: 'both', relationshipTypeIds: [], ...filters }, { nodes: 2, edges: 500 });
  assert.equal(capped.truncated, true);
  assert.equal(capped.nodes.length <= 2, true);
  const wide = structuredClone(workspace);
  wide.relationships.push(...Array.from({ length: 600 }, (_, index) => ({ id: `edge:wide-${index}`, typeId: 'reltype:invests_in', fromId: 'country:DEU', toId: `company:WIDE${index}`, basis: 'reported' as const, evidenceIds: ['source:demo-links'], validFrom: '2022-01-01', validTo: null })));
  const started = Date.now();
  const limited = neighborhood(wide, { startEntityId: 'country:DEU', hops: 1, direction: 'out', relationshipTypeIds: [], ...filters });
  const elapsed = Date.now() - started;
  assert.equal(limited.truncated, true);
  assert.equal(limited.nodes.length <= 200, true);
  assert.equal(limited.edges.length <= 500, true);
  assert.equal(elapsed < 1000, true);
});

test('a time series keeps a missing year empty', () => {
  let workspace = fixture();
  const added = applyAction(workspace, { type: 'RecordFact', fact: { id: 'fact:gap-2024', subjectKind: 'entity', subjectId: 'country:GRC', propertyId: 'property:gdp_usd', value: 10, status: 'observed', basis: 'reported', evidenceIds: ['source:demo-macro'], validFrom: '2024-01-01', validTo: '2024-12-31', createdAt: '2026-11-09T00:00:00Z' } });
  assert.equal(added.ok, true);
  if (!added.ok) return;
  workspace = added.value.workspace;
  const series = timeSeries(workspace, ['country:GRC', 'country:DEU'], 'property:gdp_usd', { basis: 'reported', sourceIds: ['source:demo-macro'] });
  assert.deepEqual(series.years, [2022, 2023, 2024]);
  const greece = series.rows[0]?.points ?? [];
  assert.equal(greece.find(point => point.year === 2024)?.value, 10);
  assert.equal(series.rows[1]?.points.find(point => point.year === 2024)?.status, 'missing');
  assert.equal(series.rows[1]?.points.find(point => point.year === 2024)?.value, null);
});
