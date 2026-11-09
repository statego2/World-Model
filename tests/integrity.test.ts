import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction } from '../src/core/actions.ts';
import { previewCsv } from '../src/core/import.ts';
import { rankEntities } from '../src/core/query.ts';
import { readTransfer } from '../src/core/transfer.ts';
import type { Fact } from '../src/core/types.ts';
import { createMemoryBackend } from '../src/storage/memory.ts';
import { fixture } from './support.ts';

const mapping = {
  delimiter: ',' as const,
  decimal: '.' as const,
  entityColumn: 'entityId',
  valueColumn: 'value',
  yearColumn: 'year',
  propertyId: 'property:population',
  sourceId: 'source:demo-macro',
};

function assumption(value: number, year: number, status: Fact['status'] = 'observed'): Fact {
  return {
    id: `fact:assume-${year}-${status}`,
    subjectKind: 'entity',
    subjectId: 'country:GRC',
    propertyId: 'property:population',
    value: status === 'missing' ? null : value,
    status,
    basis: 'assumption',
    evidenceIds: ['source:demo-macro'],
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`,
    createdAt: '2026-11-09T00:00:00Z',
  };
}

test('a reported import stays beside an assumption and reaches a reported rank', () => {
  const assumed = applyAction(fixture(), { type: 'RecordFact', fact: assumption(111, 2030) });
  assert.equal(assumed.ok, true);
  if (!assumed.ok) return;
  const same = previewCsv(assumed.value.workspace, 'entityId,value,year\ncountry:GRC,111,2030\n', mapping);
  const different = previewCsv(assumed.value.workspace, 'entityId,value,year\ncountry:GRC,112,2030\n', mapping);
  assert.equal(same.rows[0]?.disposition, 'ready');
  assert.equal(different.rows[0]?.disposition, 'ready');
  assert.equal(same.rows[0]?.fact?.basis, 'reported');
  const imported = applyAction(assumed.value.workspace, { type: 'CommitImport', facts: [same.rows[0]!.fact!] });
  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  const facts = imported.value.workspace.facts.filter(fact => fact.subjectId === 'country:GRC' && fact.validFrom === '2030-01-01');
  assert.deepEqual(facts.map(fact => fact.basis).sort(), ['assumption', 'reported']);
  const reported = rankEntities(imported.value.workspace, ['country:GRC'], 'property:population', { year: 2030, basis: 'reported', sourceIds: ['source:demo-macro'] });
  const hypothetical = rankEntities(imported.value.workspace, ['country:GRC'], 'property:population', { year: 2030, basis: 'assumption', sourceIds: ['source:demo-macro'] });
  assert.equal(reported.ok && reported.rows[0]?.status, 'value');
  assert.equal(hypothetical.ok && hypothetical.rows[0]?.status, 'value');
  if (reported.ok && hypothetical.ok) {
    assert.equal(reported.rows[0]?.values[0]?.value, 111);
    assert.equal(hypothetical.rows[0]?.values[0]?.value, 111);
  }
});

test('missing is not zero and one file cannot hide a conflicting row', () => {
  const missing = applyAction(fixture(), { type: 'RecordFact', fact: assumption(0, 2032, 'missing') });
  assert.equal(missing.ok, true);
  if (!missing.ok) return;
  const zero = previewCsv(missing.value.workspace, 'entityId,value,year\ncountry:GRC,0,2032\n', mapping);
  assert.equal(zero.rows[0]?.disposition, 'ready');
  assert.equal(zero.rows[0]?.fact?.supersedesId, undefined);
  const batch = previewCsv(fixture(), 'entityId,value,year\ncountry:GRC,1,2031\ncountry:GRC,2,2031\n', mapping);
  assert.equal(batch.rows.every(row => row.disposition === 'error'), true);
  const repeated = previewCsv(fixture(), 'entityId,value,year\ncountry:GRC,4,2031\ncountry:GRC,4,2031\n', mapping);
  assert.equal(repeated.rows.map(row => row.disposition).join(','), 'ready,duplicate');
});

test('a failed row in an import batch leaves the workspace untouched', () => {
  const start = fixture();
  const preview = previewCsv(start, 'entityId,value,year\ncountry:GRC,7,2034\n', mapping);
  const good = preview.rows[0]?.fact;
  assert.ok(good);
  const bad = { ...good, id: 'fact:bad-batch', propertyId: 'property:missing' };
  const failed = applyAction(start, { type: 'CommitImport', facts: [good!, bad] });
  assert.equal(failed.ok, false);
  assert.equal(start.facts.some(fact => fact.value === 7), false);
  assert.equal(start.revision, fixture().revision);
});

test('a malformed export envelope is rejected before any workspace is stored', async () => {
  const backend = createMemoryBackend();
  const repository = backend.openRepository();
  const loaded = await repository.loadDemo(fixture());
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const exported = await repository.exportSnapshot(loaded.value.id, '2026-11-09T00:00:00Z');
  assert.equal(exported.ok, true);
  if (!exported.ok) return;
  const cases = [
    { ...exported.value, history: [{}] },
    { ...exported.value, history: [[]] },
    { ...exported.value, actions: [{}] },
    { ...exported.value, history: [exported.value.history[0], exported.value.history[0]] },
    { ...exported.value, history: [{ ...(exported.value.history[0] as object), inverse: { type: 'NotAnAction' } }] },
  ];
  for (const payload of cases) {
    assert.equal(readTransfer(payload).ok, false);
    const restored = await repository.restore(payload, { id: 'workspace:bad-backup', label: 'Κακό' });
    assert.equal(restored.ok, false);
  }
  assert.equal((await repository.load('workspace:bad-backup')).ok, false);
  const original = await repository.load(loaded.value.id);
  assert.equal(original.ok, true);
  if (original.ok) assert.equal(original.value.revision, loaded.value.revision);

  let deep: unknown = { type: 'too-deep' };
  for (let index = 0; index < 12; index += 1) deep = { child: deep };
  const oversized = readTransfer({ ...exported.value, history: [deep] });
  assert.equal(oversized.ok, false);
  const untouched = await repository.load(loaded.value.id);
  assert.equal(untouched.ok && untouched.value.facts.length, loaded.value.facts.length);
});

test('an older workspace file without an envelope still opens', () => {
  const opened = readTransfer(fixture());
  assert.equal(opened.ok, true);
  if (opened.ok) {
    assert.equal(opened.value.history.length, 0);
    assert.equal(opened.value.workspace.id, 'workspace:demo');
  }
});
