import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createIndexedDbRepository } from '../src/storage/indexeddb.ts';
import { envelope, supplierActions } from './support.ts';

test('IndexedDB keeps the supplier model across repository instances', async () => {
  const name = `world-model-${crypto.randomUUID()}`;
  const first = createIndexedDbRepository({ name });
  const created = await first.createEmpty({ id: 'workspace:supplier', label: 'Προμηθευτές', dataMode: 'real' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  let revision = 0;
  let actionNumber = 0;
  for (const action of supplierActions()) {
    actionNumber += 1;
    const committed = await first.commit(envelope(created.value.id, revision, action, `act:db-${actionNumber}`));
    assert.equal(committed.ok, true, committed.ok ? '' : committed.errors.map(error => error.message).join('\n'));
    if (!committed.ok) return;
    revision = committed.value.revision;
  }
  first.close();

  const reloaded = createIndexedDbRepository({ name });
  const loaded = await reloaded.load(created.value.id);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.equal(loaded.value.revision, supplierActions().length);
  assert.equal(loaded.value.facts[0]?.value, 120);
  assert.equal((await reloaded.history(created.value.id)).length, supplierActions().length);
  reloaded.close();
});

test('a second IndexedDB tab gets a conflict and the failed write rolls back', async () => {
  const name = `world-model-${crypto.randomUUID()}`;
  const hooks = { failNextCommit: false };
  const writer = createIndexedDbRepository({ name, hooks });
  const reader = createIndexedDbRepository({ name });
  const created = await writer.createEmpty({ id: 'workspace:tabs', label: 'Καρτέλες', dataMode: 'real' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const stale = await reader.load(created.value.id);
  assert.equal(stale.ok, true);
  const committed = await writer.commit(envelope(created.value.id, 0, supplierActions()[0]!, 'act:tab-a'));
  assert.equal(committed.ok, true);
  const conflict = await reader.commit(envelope(created.value.id, 0, supplierActions()[1]!, 'act:tab-b'));
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert.equal(conflict.errors[0]?.code, 'conflict');

  hooks.failNextCommit = true;
  const rolled = await writer.commit(envelope(created.value.id, 1, supplierActions()[1]!, 'act:tab-fail'));
  assert.equal(rolled.ok, false);
  if (!rolled.ok) assert.equal(rolled.errors[0]?.code, 'storage_failure');
  const loaded = await reader.load(created.value.id);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.equal(loaded.value.revision, 1);
  assert.equal(loaded.value.entityTypes.length, 1);
  assert.equal((await reader.history(created.value.id)).length, 1);

  const replay = await writer.commit(envelope(created.value.id, 1, supplierActions()[0]!, 'act:tab-a'));
  assert.equal(replay.ok, true);
  if (replay.ok) {
    assert.equal(replay.value.replayed, true);
    assert.equal(replay.value.workspace.revision, 1);
  }
  writer.close();
  reader.close();
});

test('IndexedDB restore keeps history when the original workspace is still stored', async () => {
  const name = `world-model-${crypto.randomUUID()}`;
  const repository = createIndexedDbRepository({ name });
  const created = await repository.createEmpty({ id: 'workspace:origin', label: 'Αρχικό', dataMode: 'real' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const committed = await repository.commit(envelope(created.value.id, 0, supplierActions()[0]!, 'act:restore-source'));
  assert.equal(committed.ok, true);
  const exported = await repository.exportSnapshot(created.value.id, '2026-11-09T00:00:00Z');
  assert.equal(exported.ok, true);
  if (!exported.ok) return;
  const firstChange = exported.value.history[0];
  assert.equal(Boolean(firstChange && typeof firstChange === 'object' && 'seq' in firstChange), false);
  const restored = await repository.restore(exported.value, { id: 'workspace:copy', label: 'Αντίγραφο' });
  assert.equal(restored.ok, true, restored.ok ? '' : restored.errors.map(error => error.message).join('\n'));
  if (!restored.ok) return;
  assert.equal((await repository.history(restored.value.id)).length, 1);
  assert.equal((await repository.history(created.value.id)).length, 1);
  repository.close();
});
