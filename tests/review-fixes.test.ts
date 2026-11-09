import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction } from '../src/core/actions.ts';
import { reconcileYear } from '../src/core/coverage.ts';
import { previewCsv } from '../src/core/import.ts';
import { readTransfer } from '../src/core/transfer.ts';
import { inverseOf } from '../src/core/undo.ts';
import { createMemoryBackend } from '../src/storage/memory.ts';
import { envelope, fixture } from './support.ts';

test('a twenty-row import remains inside a restorable backup', async () => {
  const backend = createMemoryBackend();
  const repository = backend.openRepository();
  const loaded = await repository.loadDemo(fixture());
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const csv = ['entityId,value,year', ...Array.from({ length: 20 }, (_, index) => `country:GRC,${1000 + index},${2040 + index}`)].join('\n');
  const preview = previewCsv(loaded.value, csv, { delimiter: ',', decimal: '.', entityColumn: 'entityId', valueColumn: 'value', yearColumn: 'year', propertyId: 'property:population', sourceId: 'source:demo-macro' });
  const facts = preview.rows.flatMap(row => row.fact && row.disposition === 'ready' ? [row.fact] : []);
  assert.equal(facts.length, 20);
  const committed = await repository.commit(envelope(loaded.value.id, loaded.value.revision, { type: 'CommitImport', facts }, 'act:wide-import'));
  assert.equal(committed.ok, true);
  if (!committed.ok) return;
  const exported = await repository.exportSnapshot(committed.value.workspace.id, '2026-11-09T00:00:00Z');
  assert.equal(exported.ok, true);
  if (!exported.ok) return;
  const restored = readTransfer(JSON.parse(JSON.stringify(exported.value)));
  assert.equal(restored.ok, true, restored.ok ? '' : restored.errors.map(error => error.message).join('\n'));
});

test('updating only the filter mode is saved and undone', () => {
  const before = fixture();
  const view = before.savedViews[0];
  assert.ok(view);
  const action = { type: 'SaveView' as const, view: { ...view, filterMode: 'inherit' as const } };
  const updated = applyAction(before, action);
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assert.equal(updated.value.workspace.savedViews[0]?.filterMode, 'inherit');
  const inverse = inverseOf(before, action);
  assert.equal(inverse?.type, 'SaveView');
  if (!inverse) return;
  const undone = applyAction(updated.value.workspace, inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.value.workspace.savedViews[0]?.filterMode, undefined);
});

test('rebinding a type rejects properties that belong to the previous type', () => {
  const rejected = applyAction(fixture(), { type: 'SetBinding', role: 'countryType', definitionId: 'type:region' });
  assert.equal(rejected.ok, false);
  assert.equal(reconcileYear(2023, [2024]), 2024);
  assert.equal(reconcileYear(2023, [2022, 2023]), 2023);
});
