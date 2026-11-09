import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction } from '../src/core/actions.ts';
import { chooseFilters } from '../src/core/coverage.ts';
import { rankEntities } from '../src/core/query.ts';
import { buildRealWorkspace } from '../src/real/build.ts';
import { emptyWorkspace } from '../src/core/workspace.ts';
import { fixture } from './support.ts';

test('shared filters follow the data and do not mix a second source', async () => {
  const demo = chooseFilters(fixture());
  assert.equal(demo.year, 2023);
  assert.equal(demo.basis, 'reported');
  assert.equal(demo.sourceIds.includes('source:demo-macro'), true);

  const empty = chooseFilters(emptyWorkspace({ id: 'workspace:empty', label: 'Κενό', dataMode: 'real' }));
  assert.deepEqual(empty.sourceIds, []);

  const { workspace } = await buildRealWorkspace();
  const real = chooseFilters(workspace);
  assert.equal(real.year, 2022);
  assert.equal(real.sourceIds.includes('source:wdi-gdp'), true);
  assert.equal(real.sourceIds.includes('source:demo-macro'), false);
  const gdp = rankEntities(workspace, ['country:GRC'], 'property:gdp_usd', real);
  assert.equal(gdp.ok && gdp.rows[0]?.values[0]?.value, 217990189600.69);

  const sourced = applyAction(workspace, { type: 'CreateSource', source: { id: 'source:second-gdp', label: 'Δεύτερη πηγή', locator: 'https://example.invalid/second', retrievedAt: '2026-11-09T00:00:00Z', licenseNote: 'Έλεγχος σύγκρουσης', verificationStatus: 'verified', isDemo: false } });
  assert.equal(sourced.ok, true);
  if (!sourced.ok) return;
  const duplicated = applyAction(sourced.value.workspace, { type: 'RecordFact', fact: { id: 'fact:second-gdp', subjectKind: 'entity', subjectId: 'country:GRC', propertyId: 'property:gdp_usd', value: 1, status: 'observed', basis: 'reported', evidenceIds: ['source:second-gdp'], validFrom: '2022-01-01', validTo: '2022-12-31', createdAt: '2026-11-09T00:00:00Z' } });
  assert.equal(duplicated.ok, true);
  if (!duplicated.ok) return;
  const mixed = rankEntities(duplicated.value.workspace, ['country:GRC'], 'property:gdp_usd', { ...real, sourceIds: ['source:wdi-gdp', 'source:second-gdp'] });
  const onlyFirst = rankEntities(duplicated.value.workspace, ['country:GRC'], 'property:gdp_usd', { ...real, sourceIds: ['source:wdi-gdp'] });
  assert.equal(mixed.ok && mixed.rows[0]?.status, 'conflict');
  assert.equal(onlyFirst.ok && onlyFirst.rows[0]?.values[0]?.value, 217990189600.69);
});
