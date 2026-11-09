import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryBackend } from '../src/storage/memory.ts';
import { envelope, fixture, supplierActions } from './support.ts';

test('memory repository stores the supplier model, replays an action id, and rejects a stale revision', async () => {
  const backend = createMemoryBackend();
  const first = backend.openRepository();
  const second = backend.openRepository();
  const created = await first.createEmpty({ id: 'workspace:supplier', label: 'Προμηθευτές', dataMode: 'real' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  let revision = created.value.revision;
  let actionNumber = 0;
  for (const action of supplierActions()) {
    actionNumber += 1;
    const committed = await first.commit(envelope(created.value.id, revision, action, `act:supplier-${actionNumber}`));
    assert.equal(committed.ok, true, committed.ok ? '' : committed.errors.map(error => error.message).join('\n'));
    if (!committed.ok) return;
    revision = committed.value.revision;
  }
  const replay = await first.commit(envelope(created.value.id, 0, supplierActions()[0]!, 'act:supplier-1'));
  assert.equal(replay.ok, true);
  if (!replay.ok) return;
  assert.equal(replay.value.replayed, true);
  assert.equal(replay.value.workspace.revision, revision);
  assert.equal(replay.value.workspace.entityTypes.filter(type => type.id === 'type:infrastructure').length, 1);

  const mismatch = await first.commit(envelope(created.value.id, revision, supplierActions()[1]!, 'act:supplier-1'));
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.equal(mismatch.errors[0]?.code, 'idempotency_mismatch');

  const stale = await second.commit(envelope(created.value.id, 0, {
    type: 'DefineEntityType',
    entityType: { id: 'type:port', label: 'Λιμάνι', description: 'Άλλο άκρο' },
  }, 'act:stale-tab'));
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.errors[0]?.code, 'conflict');
  const reloaded = await second.load(created.value.id);
  assert.equal(reloaded.ok, true);
  if (!reloaded.ok) return;
  assert.equal(reloaded.value.revision, revision);
  assert.equal(reloaded.value.entities.length, 2);
  const history = await first.history(created.value.id);
  assert.equal(history.length, supplierActions().length);
  assert.deepEqual(history.map(change => change.revision), history.map((_, index) => index + 1));
});

test('a failed transaction does not publish the next revision', async () => {
  const backend = createMemoryBackend();
  const repository = backend.openRepository();
  const created = await repository.createEmpty({ id: 'workspace:atomic', label: 'Ατομικό', dataMode: 'real' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  backend.hooks.failNextCommit = true;
  const failed = await repository.commit(envelope(created.value.id, 0, supplierActions()[0]!, 'act:boom'));
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.equal(failed.errors[0]?.code, 'storage_failure');
  const loaded = await repository.load(created.value.id);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.equal(loaded.value.revision, 0);
  assert.equal(loaded.value.entityTypes.length, 0);
  assert.equal((await repository.history(created.value.id)).length, 0);
});

test('demo payload is not written into an existing real workspace', async () => {
  const repository = createMemoryBackend().openRepository();
  const created = await repository.createEmpty({ id: 'workspace:real', label: 'Πραγματικό', dataMode: 'real' });
  assert.equal(created.ok, true);
  const demo = await repository.loadDemo(fixture());
  assert.equal(demo.ok, true);
  if (!demo.ok || !created.ok) return;
  assert.equal(demo.value.id, 'workspace:demo');
  assert.notEqual(demo.value.id, created.value.id);
  const again = await repository.loadDemo(fixture());
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.value.revision, demo.value.revision);
});

test('invalid action leaves revision unchanged', async () => {
  const repository = createMemoryBackend().openRepository();
  const created = await repository.createEmpty({ id: 'workspace:invalid', label: 'Άκυρο', dataMode: 'real' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const committed = await repository.commit(envelope(created.value.id, 0, {
    type: 'CreateEntity',
    entity: { id: 'supplier:missing-type', typeId: 'type:supplier', label: 'Χωρίς τύπο' },
  }));
  assert.equal(committed.ok, false);
  const loaded = await repository.load(created.value.id);
  assert.equal(loaded.ok, true);
  if (loaded.ok) assert.equal(loaded.value.revision, 0);
});
