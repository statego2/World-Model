import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvCell, importKey, previewCsv } from '../src/core/import.ts';
import { createMemoryBackend } from '../src/storage/memory.ts';
import { envelope, fixture } from './support.ts';

const csv = 'entityId,value,year\ncountry:GRC,11000000,2024\ncountry:MISSING,1,2024\n';
const mapping = {
  delimiter: ',' as const,
  decimal: '.' as const,
  entityColumn: 'entityId',
  valueColumn: 'value',
  yearColumn: 'year',
  propertyId: 'property:population',
  sourceId: 'source:demo-macro',
};

test('csv preview keeps unknown ids unresolved and commits a measurement once', async () => {
  const backend = createMemoryBackend();
  const repository = backend.openRepository();
  const loaded = await repository.loadDemo(fixture());
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const preview = previewCsv(loaded.value, csv, mapping);
  assert.equal(preview.error, undefined);
  assert.equal(preview.rows.find(row => row.entityId === 'country:MISSING')?.disposition, 'unresolved');
  assert.equal(preview.rows.find(row => row.entityId === 'country:GRC')?.disposition, 'ready');
  const facts = preview.rows.flatMap(row => row.disposition === 'ready' && row.fact ? [row.fact] : []);
  const key = await importKey(loaded.value.id, csv, mapping);
  const committed = await repository.commit(envelope(loaded.value.id, loaded.value.revision, { type: 'CommitImport', facts }, key));
  assert.equal(committed.ok, true, committed.ok ? '' : committed.errors.map(error => error.message).join('\n'));
  if (!committed.ok) return;
  assert.equal(committed.value.workspace.facts.some(fact => fact.subjectId === 'country:GRC' && fact.value === 11000000), true);
  const again = await repository.commit(envelope(loaded.value.id, committed.value.revision, { type: 'CommitImport', facts }, key));
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.value.replayed, true);
  assert.equal(again.value.workspace.facts.filter(fact => fact.value === 11000000).length, 1);

  const changed = 'entityId,value,year\ncountry:GRC,12000000,2024\n';
  const conflict = previewCsv(again.value.workspace, changed, mapping);
  assert.equal(conflict.rows[0]?.disposition, 'conflict');
  assert.equal(again.value.workspace.facts.some(fact => fact.value === 12000000), false);
});

test('a failed import does not change the snapshot and unknown versions are refused', async () => {
  const backend = createMemoryBackend();
  const repository = backend.openRepository();
  const loaded = await repository.loadDemo(fixture());
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const preview = previewCsv(loaded.value, csv, mapping);
  const facts = preview.rows.flatMap(row => row.fact && row.disposition === 'ready' ? [row.fact] : []);
  backend.hooks.failNextCommit = true;
  const failed = await repository.commit(envelope(loaded.value.id, loaded.value.revision, { type: 'CommitImport', facts }, 'act:import-failed'));
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.equal(failed.errors[0]?.code, 'storage_failure');
  const current = await repository.load(loaded.value.id);
  assert.equal(current.ok, true);
  if (!current.ok) return;
  assert.equal(current.value.revision, loaded.value.revision);
  assert.equal(current.value.facts.some(fact => fact.value === 11000000), false);

  const exported = await repository.exportSnapshot(current.value.id, '2026-11-09T00:00:00Z');
  assert.equal(exported.ok, true);
  if (!exported.ok) return;
  const rejected = await repository.restore({ ...exported.value, formatVersion: 99 }, { id: 'workspace:rejected', label: 'Όχι' });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.errors[0]?.code, 'unsupported_version');
  assert.equal((await repository.load('workspace:rejected')).ok, false);

  const restored = await repository.restore(exported.value, { id: 'workspace:restored', label: 'Αντίγραφο' });
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.equal(restored.value.id, 'workspace:restored');
  assert.deepEqual(restored.value.entities.map(entity => entity.id), current.value.entities.map(entity => entity.id));
  assert.deepEqual(restored.value.facts.map(fact => [fact.id, fact.value]), current.value.facts.map(fact => [fact.id, fact.value]));
  assert.deepEqual(restored.value.sources.map(source => source.id), current.value.sources.map(source => source.id));
  assert.equal((await repository.history(restored.value.id)).length, (await repository.history(current.value.id)).length);
  const original = await repository.load(current.value.id);
  assert.equal(original.ok, true);
  if (original.ok) assert.equal(original.value.revision, current.value.revision);
});

test('undo removes a fresh entity and blocks when a fact depends on it', async () => {
  const repository = createMemoryBackend().openRepository();
  const created = await repository.createEmpty({ id: 'workspace:undo', label: 'Αναίρεση', dataMode: 'real' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const defined = await repository.commit(envelope(created.value.id, 0, {
    type: 'DefineEntityType', entityType: { id: 'type:supplier', label: 'Προμηθευτής', description: 'Δοκιμή' },
  }, 'act:undo-type'));
  assert.equal(defined.ok, true);
  if (!defined.ok) return;
  const entity = await repository.commit(envelope(created.value.id, defined.value.revision, {
    type: 'CreateEntity', entity: { id: 'supplier:alpha', typeId: 'type:supplier', label: 'Άλφα' },
  }, 'act:undo-entity'));
  assert.equal(entity.ok, true);
  if (!entity.ok) return;
  const history = await repository.history(created.value.id);
  const inverse = history.at(-1)?.inverse;
  assert.equal(inverse?.type, 'RevertCreation');
  if (!inverse) return;
  const undone = await repository.commit(envelope(created.value.id, entity.value.revision, inverse, 'act:undo-now'));
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.value.workspace.entities.length, 0);

  const again = await repository.commit(envelope(created.value.id, undone.value.revision, {
    type: 'CreateEntity', entity: { id: 'supplier:alpha', typeId: 'type:supplier', label: 'Άλφα' },
  }, 'act:undo-entity-2'));
  assert.equal(again.ok, true);
  if (!again.ok) return;
  const source = await repository.commit(envelope(created.value.id, again.value.revision, {
    type: 'CreateSource',
    source: { id: 'source:note', label: 'Σημείωση', locator: 'note:1', retrievedAt: '2026-11-09T00:00:00Z', licenseNote: 'ιδία', verificationStatus: 'candidate', isDemo: false },
  }, 'act:undo-source'));
  assert.equal(source.ok, true);
  if (!source.ok) return;
  const property = await repository.commit(envelope(created.value.id, source.value.revision, {
    type: 'DefineProperty',
    property: { id: 'property:capacity', label: 'Δυναμικότητα', subjectKind: 'entity', subjectTypeId: 'type:supplier', valueType: 'number', unit: 'MW', nonnegative: true },
  }, 'act:undo-property'));
  assert.equal(property.ok, true);
  if (!property.ok) return;
  const fact = await repository.commit(envelope(created.value.id, property.value.revision, {
    type: 'RecordFact',
    fact: { id: 'fact:alpha', subjectKind: 'entity', subjectId: 'supplier:alpha', propertyId: 'property:capacity', value: 10, status: 'observed', basis: 'reported', evidenceIds: ['source:note'], validFrom: '2024-01-01', validTo: null, createdAt: '2026-11-09T00:00:00Z' },
  }, 'act:undo-fact'));
  assert.equal(fact.ok, true);
  const blocked = await repository.commit(envelope(created.value.id, fact.ok ? fact.value.revision : 0, { type: 'RevertCreation', kind: 'entity', id: 'supplier:alpha' }, 'act:undo-blocked'));
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.errors[0]?.code, 'dependency');
  const kept = await repository.load(created.value.id);
  assert.equal(kept.ok, true);
  if (kept.ok) assert.equal(kept.value.entities[0]?.label, 'Άλφα');
});

test('csv cells neutralize spreadsheet formulas', () => {
  assert.equal(csvCell('=1+1'), `"'=1+1"`);
  assert.equal(csvCell('Άλφα'), '"Άλφα"');
});

test('an empty measurement stays missing and fact ids keep property and source apart', () => {
  const workspace = fixture();
  const blank = previewCsv(workspace, 'entityId,value,year\ncountry:GRC,,2024\n', mapping);
  assert.equal(blank.rows[0]?.disposition, 'error');
  assert.equal(blank.rows[0]?.fact, undefined);
  const population = previewCsv(workspace, csv, mapping);
  const gdp = previewCsv(workspace, csv, { ...mapping, propertyId: 'property:gdp_usd' });
  assert.notEqual(population.rows[0]?.fact?.id, gdp.rows[0]?.fact?.id);
  assert.equal(population.rows[0]?.fact?.propertyId, 'property:population');
  assert.equal(gdp.rows[0]?.fact?.propertyId, 'property:gdp_usd');
});
