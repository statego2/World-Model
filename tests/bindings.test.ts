import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction } from '../src/core/actions.ts';
import { runSavedView } from '../src/core/query.ts';
import { emptyWorkspace } from '../src/core/workspace.ts';

test('a binding rejects a property from another type and a saved view can inherit filters', () => {
  let workspace = emptyWorkspace({ id: 'workspace:bind', label: 'Ρόλοι', dataMode: 'real' });
  for (const entityType of [
    { id: 'type:country', label: 'Χώρα', description: 'Χώρα' },
    { id: 'type:company', label: 'Εταιρεία', description: 'Εταιρεία' },
  ]) {
    const step = applyAction(workspace, { type: 'DefineEntityType', entityType });
    assert.equal(step.ok, true);
    if (!step.ok) return;
    workspace = step.value.workspace;
  }
  const countryProperty = applyAction(workspace, { type: 'DefineProperty', property: { id: 'property:gdp', label: 'ΑΕΠ', subjectKind: 'entity', subjectTypeId: 'type:country', valueType: 'number', unit: 'USD' } });
  assert.equal(countryProperty.ok, true);
  if (!countryProperty.ok) return;
  const companyProperty = applyAction(countryProperty.value.workspace, { type: 'DefineProperty', property: { id: 'property:other', label: 'Άλλο', subjectKind: 'entity', subjectTypeId: 'type:company', valueType: 'number', unit: 'USD' } });
  assert.equal(companyProperty.ok, true);
  if (!companyProperty.ok) return;
  workspace = companyProperty.value.workspace;
  const country = applyAction(workspace, { type: 'SetBinding', role: 'countryType', definitionId: 'type:country' });
  assert.equal(country.ok, true);
  if (!country.ok) return;
  const rejected = applyAction(country.value.workspace, { type: 'SetBinding', role: 'gdpProperty', definitionId: 'property:other' });
  assert.equal(rejected.ok, false);
  const accepted = applyAction(country.value.workspace, { type: 'SetBinding', role: 'gdpProperty', definitionId: 'property:gdp' });
  assert.equal(accepted.ok, true);
  if (!accepted.ok) return;
  assert.equal(accepted.value.workspace.bindings.gdpProperty, 'property:gdp');

  const typed = applyAction(accepted.value.workspace, { type: 'DefineRelationshipType', relationshipType: { id: 'reltype:invests', label: 'Επενδύει', description: 'Σχέση', fromTypeIds: ['type:country'], toTypeIds: ['type:company'], directed: true } });
  assert.equal(typed.ok, true);
  if (!typed.ok) return;
  const sourced = applyAction(typed.value.workspace, { type: 'CreateSource', source: { id: 'source:real', label: 'Πηγή', locator: 'note:1', retrievedAt: '2026-11-09T00:00:00Z', licenseNote: 'σημείωση', verificationStatus: 'candidate', isDemo: false } });
  assert.equal(sourced.ok, true);
  if (!sourced.ok) return;
  const withView = applyAction(sourced.value.workspace, { type: 'CreateEntity', entity: { id: 'country:GRC', typeId: 'type:country', label: 'Ελλάδα' } });
  assert.equal(withView.ok, true);
  if (!withView.ok) return;
  const saved = applyAction(withView.value.workspace, {
    type: 'SaveView',
    view: { id: 'view:custom', label: 'Δική μου', filterMode: 'inherit', query: { startEntityId: 'country:GRC', steps: [{ relationshipTypeId: 'reltype:invests', direction: 'out' }], year: 1999, basis: 'assumption', sourceIds: ['source:real'], limit: 5 } },
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const inherited = runSavedView(saved.value.workspace, 'view:custom', { year: 2024, basis: 'reported', sourceIds: ['source:real'] });
  assert.equal(inherited.workspaceRevision, saved.value.workspace.revision);
  assert.deepEqual(inherited.sourceIds, ['source:real']);
});
