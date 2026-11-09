import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseWorkspace } from '../src/core/parse.ts';
import { emptyWorkspace } from '../src/core/workspace.ts';
import { fixture } from './support.ts';

test('synthetic fixture passes the strict parser', () => {
  const parsed = parseWorkspace(fixture());
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.entities.length, 10);
    assert.equal(parsed.value.facts.length, 65);
  }
});

test('unknown fields are rejected before they become a workspace', () => {
  const workspace = fixture();
  const dirty = { ...workspace, note: 'smuggled' };
  const parsed = parseWorkspace(dirty);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.errors[0]?.code, 'unknown_field');
  const entity = structuredClone(workspace);
  (entity.entities[0] as { nickname?: string }).nickname = 'alias';
  const nested = parseWorkspace(entity);
  assert.equal(nested.ok, false);
  if (!nested.ok) assert.ok(nested.errors.some(error => error.code === 'unknown_field' && error.path?.includes('nickname')));
});

test('depth, string and collection limits stop oversized documents', () => {
  let nested: unknown = { id: 'type:deep' };
  for (let index = 0; index < 12; index += 1) nested = { child: nested };
  const deep = parseWorkspace(nested, { ...limits(), maxDepth: 4 });
  assert.equal(deep.ok, false);
  if (!deep.ok) assert.equal(deep.errors[0]?.code, 'limit');

  const workspace = emptyWorkspace({ id: 'workspace:limits', label: 'Όρια', dataMode: 'real' });
  workspace.label = 'α'.repeat(80);
  const long = parseWorkspace(workspace, { ...limits(), maxString: 20 });
  assert.equal(long.ok, false);
  if (!long.ok) assert.equal(long.errors[0]?.code, 'limit');

  const bulky = emptyWorkspace({ id: 'workspace:bulk', label: 'Όγκος', dataMode: 'real' });
  bulky.entityTypes = Array.from({ length: 5 }, (_, index) => ({ id: `type:t${index}`, label: `Τύπος ${index}`, description: '' }));
  const tooMany = parseWorkspace(bulky, { ...limits(), maxCollection: 2 });
  assert.equal(tooMany.ok, false);
  if (!tooMany.ok) assert.equal(tooMany.errors[0]?.code, 'limit');
});

test('malformed documents and unstable ids do not become workspaces', () => {
  const broken = parseWorkspace(null);
  assert.equal(broken.ok, false);
  if (!broken.ok) assert.equal(broken.errors[0]?.code, 'malformed');
  const workspace = emptyWorkspace({ id: 'not an id', label: 'Λάθος', dataMode: 'real' });
  const parsed = parseWorkspace(workspace);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.errors.some(error => error.code === 'malformed'), true);
});

test('an empty real workspace is a valid strict document', () => {
  const parsed = parseWorkspace(emptyWorkspace({ id: 'workspace:empty', label: 'Κενό', dataMode: 'real' }));
  assert.equal(parsed.ok, true);
});

function limits() {
  return { maxBytes: 10_000, maxDepth: 8, maxCollection: 100, maxString: 4000, maxObjectKeys: 64, maxBindings: 20 };
}
