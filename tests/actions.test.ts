import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction, type DomainAction } from '../src/core/actions.ts';
import type { Workspace } from '../src/core/types.ts';
import { emptyWorkspace } from '../src/core/workspace.ts';
import { fixture, supplierActions } from './support.ts';

test('a user-defined supplier model is accepted without a new component or enum', () => {
  let workspace = emptyWorkspace({ id: 'workspace:supplier', label: 'Προμηθευτές', dataMode: 'real' });
  for (const action of supplierActions()) {
    const applied = applyAction(workspace, action);
    assert.equal(applied.ok, true, applied.ok ? '' : applied.errors.map(error => error.message).join('\n'));
    if (applied.ok) workspace = applied.value.workspace;
  }
  assert.equal(workspace.revision, supplierActions().length);
  assert.equal(workspace.ontologyVersion, 5);
  assert.equal(workspace.entities.find(entity => entity.id === 'supplier:alpha')?.label, 'Άλφα');
  assert.equal(workspace.facts[0]?.value, 120);
  assert.equal(workspace.facts[0]?.propertyId, 'property:capacity');
});

test('illegal endpoints, units and blocked evidence do not change the model', () => {
  let workspace = emptyWorkspace({ id: 'workspace:reject', label: 'Έλεγχοι', dataMode: 'real' });
  workspace = must(workspace, supplierActions()[0]!);
  workspace = must(workspace, supplierActions()[1]!);
  const wrongEdge = applyAction(workspace, {
    type: 'CreateRelationship',
    relationship: {
      id: 'edge:bad', typeId: 'reltype:missing', fromId: 'supplier:alpha', toId: 'infra:berth',
      basis: 'reported', evidenceIds: ['source:note'], validFrom: '2024-01-01', validTo: null,
    },
  });
  assert.equal(wrongEdge.ok, false);
  assert.equal(workspace.revision, 2);

  let modeled = emptyWorkspace({ id: 'workspace:meaning', label: 'Νόημα', dataMode: 'real' });
  for (const action of supplierActions()) modeled = must(modeled, action);
  const before = structuredClone(modeled);
  const renamedUnit = applyAction(modeled, {
    type: 'DefineProperty',
    property: { ...modeled.properties[0]!, unit: 'kW' },
  });
  assert.equal(renamedUnit.ok, false);
  if (!renamedUnit.ok) assert.equal(renamedUnit.errors[0]?.code, 'meaning_change');
  assert.deepEqual(modeled, before);

  const blocked = applyAction(modeled, {
    type: 'CreateSource',
    source: {
      id: 'source:blocked', label: 'Αποκλεισμένη', locator: 'note:blocked', retrievedAt: '2026-11-09T00:00:00Z',
      licenseNote: 'δεν χρησιμοποιείται', verificationStatus: 'blocked', isDemo: false,
    },
  });
  assert.equal(blocked.ok, true);
  if (!blocked.ok) return;
  const rejected = applyAction(blocked.value.workspace, {
    type: 'RecordFact',
    fact: {
      ...blocked.value.workspace.facts[0]!,
      id: 'fact:blocked',
      evidenceIds: ['source:blocked'],
      createdAt: '2026-11-09T00:00:01Z',
    },
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.errors[0]!.message, /αποκλεισμένη/);
});

test('corrections keep the previous fact and reject a second branch', () => {
  const workspace = fixture();
  const original = workspace.facts[0]!;
  const once = applyAction(workspace, {
    type: 'CorrectFact',
    fact: { ...structuredClone(original), id: 'fact:correction', value: 42, supersedesId: original.id, createdAt: '2026-11-10T00:00:00Z' },
  });
  assert.equal(once.ok, true);
  if (!once.ok) return;
  assert.equal(once.value.workspace.facts.find(fact => fact.id === original.id)?.value, original.value);
  const branch = applyAction(once.value.workspace, {
    type: 'CorrectFact',
    fact: { ...structuredClone(original), id: 'fact:correction-2', value: 43, supersedesId: original.id, createdAt: '2026-11-10T00:00:02Z' },
  });
  assert.equal(branch.ok, false);
});

test('demo evidence cannot be committed into a real workspace', () => {
  const workspace = emptyWorkspace({ id: 'workspace:real', label: 'Πραγματικό', dataMode: 'real' });
  const applied = applyAction(workspace, {
    type: 'CreateSource',
    source: {
      id: 'source:demo-leak', label: 'Διαρροή', locator: 'https://example.invalid/demo', retrievedAt: '2026-11-09T00:00:00Z',
      licenseNote: 'demo', verificationStatus: 'candidate', isDemo: true,
    },
  });
  assert.equal(applied.ok, false);
});

function must(workspace: Workspace, action: DomainAction): Workspace {
  const applied = applyAction(workspace, action);
  assert.equal(applied.ok, true, applied.ok ? '' : applied.errors.map(error => `${error.code}: ${error.message}`).join('\n'));
  if (!applied.ok) throw new Error('unreachable');
  return applied.value.workspace;
}
