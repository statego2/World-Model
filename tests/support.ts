import { readFileSync } from 'node:fs';
import type { ActionEnvelope, DomainAction } from '../src/core/actions.ts';
import type { Workspace } from '../src/core/types.ts';

export function supplierActions(): DomainAction[] {
  return [
    { type: 'DefineEntityType', entityType: { id: 'type:infrastructure', label: 'Υποδομή', description: 'Φυσική εγκατάσταση' } },
    { type: 'DefineEntityType', entityType: { id: 'type:supplier', label: 'Προμηθευτής', description: 'Παρέχει δυναμικότητα σε υποδομή' } },
    { type: 'DefineProperty', property: { id: 'property:capacity', label: 'Δυναμικότητα', subjectKind: 'entity', subjectTypeId: 'type:supplier', valueType: 'number', unit: 'MW', nonnegative: true } },
    { type: 'DefineRelationshipType', relationshipType: { id: 'reltype:supplies_to', label: 'Προμηθεύει', description: 'Παροχή δυναμικότητας, όχι ιδιοκτησία', fromTypeIds: ['type:supplier'], toTypeIds: ['type:infrastructure'], directed: true } },
    { type: 'CreateSource', source: { id: 'source:note', label: 'Σημείωση πεδίου', locator: 'notebook:alpha', retrievedAt: '2026-11-09T00:00:00Z', licenseNote: 'Προσωπική σημείωση', verificationStatus: 'candidate', isDemo: false } },
    { type: 'CreateEntity', entity: { id: 'supplier:alpha', typeId: 'type:supplier', label: 'Άλφα' } },
    { type: 'CreateEntity', entity: { id: 'infra:berth', typeId: 'type:infrastructure', label: 'Προβλήτα' } },
    { type: 'CreateRelationship', relationship: { id: 'edge:alpha-berth', typeId: 'reltype:supplies_to', fromId: 'supplier:alpha', toId: 'infra:berth', basis: 'reported', evidenceIds: ['source:note'], validFrom: '2024-01-01', validTo: null } },
    { type: 'RecordFact', fact: { id: 'fact:alpha-capacity', subjectKind: 'entity', subjectId: 'supplier:alpha', propertyId: 'property:capacity', value: 120, status: 'observed', basis: 'reported', evidenceIds: ['source:note'], validFrom: '2024-01-01', validTo: null, createdAt: '2026-11-09T00:00:00Z' } },
  ];
}

export function fixture(): Workspace {
  return JSON.parse(readFileSync(new URL('../data/fixtures/workspace.demo.json', import.meta.url), 'utf8')) as Workspace;
}

let sequence = 0;

export function envelope(workspaceId: string, revision: number, action: DomainAction, actionId?: string): ActionEnvelope {
  sequence += 1;
  return {
    workspaceId,
    expectedRevision: revision,
    actionId: actionId ?? `act:test-${sequence}`,
    actor: 'tester',
    at: '2026-11-09T12:00:00.000Z',
    action,
  };
}
