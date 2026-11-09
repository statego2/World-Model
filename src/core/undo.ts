import { fail, ok, type Result } from './errors.ts';
import type { DomainAction } from './actions.ts';
import type { Workspace } from './types.ts';

export function inverseOf(before: Workspace, action: DomainAction): DomainAction | null {
  switch (action.type) {
    case 'DefineEntityType': {
      const existing = before.entityTypes.find(item => item.id === action.entityType.id);
      return existing
        ? { type: 'DefineEntityType', entityType: structuredClone(existing) }
        : { type: 'RevertCreation', kind: 'entityType', id: action.entityType.id };
    }
    case 'DefineRelationshipType': {
      const existing = before.relationshipTypes.find(item => item.id === action.relationshipType.id);
      return existing
        ? { type: 'DefineRelationshipType', relationshipType: structuredClone(existing) }
        : { type: 'RevertCreation', kind: 'relationshipType', id: action.relationshipType.id };
    }
    case 'DefineProperty': {
      const existing = before.properties.find(item => item.id === action.property.id);
      return existing
        ? { type: 'DefineProperty', property: structuredClone(existing) }
        : { type: 'RevertCreation', kind: 'property', id: action.property.id };
    }
    case 'CreateEntity':
      return { type: 'RevertCreation', kind: 'entity', id: action.entity.id };
    case 'RenameEntity': {
      const entity = before.entities.find(item => item.id === action.entityId);
      return entity ? { type: 'RenameEntity', entityId: entity.id, label: entity.label } : null;
    }
    case 'ArchiveEntity':
      return null;
    case 'DeprecateDefinition':
      return null;
    case 'CreateSource':
      return { type: 'RevertCreation', kind: 'source', id: action.source.id };
    case 'CreateRelationship':
      return { type: 'RevertCreation', kind: 'relationship', id: action.relationship.id };
    case 'RecordFact':
      return { type: 'RevertCreation', kind: 'fact', id: action.fact.id };
    case 'CorrectFact':
      return { type: 'RevertCreation', kind: 'fact', id: action.fact.id };
    case 'SaveView': {
      const existing = before.savedViews.find(item => item.id === action.view.id);
      return existing
        ? { type: 'SaveView', view: structuredClone(existing) }
        : { type: 'RevertCreation', kind: 'savedView', id: action.view.id };
    }
    case 'CommitImport':
      return null;
    case 'RevertCreation':
      return null;
    default:
      return null;
  }
}

export function revertBlock(workspace: Workspace, kind: RevertKind, id: string): Result<true> {
  const message = dependencyMessage(workspace, kind, id);
  return message ? fail('dependency', message) : ok(true);
}

export type RevertKind = 'entityType' | 'relationshipType' | 'property' | 'entity' | 'relationship' | 'fact' | 'source' | 'savedView';

function dependencyMessage(workspace: Workspace, kind: RevertKind, id: string): string | null {
  if (kind === 'entityType') {
    if (workspace.entities.some(item => item.typeId === id)) return 'Δεν αναιρείται: υπάρχουν οντότητες αυτού του τύπου. Μπορείς να αποσύρεις τον ορισμό.';
    if (workspace.relationshipTypes.some(item => item.fromTypeIds.includes(id) || item.toTypeIds.includes(id))) return 'Δεν αναιρείται: ο τύπος χρησιμοποιείται ως άκρο σχέσης. Μπορείς να αποσύρεις τον ορισμό.';
    if (workspace.properties.some(item => item.subjectKind === 'entity' && item.subjectTypeId === id)) return 'Δεν αναιρείται: ο τύπος έχει ιδιότητες. Μπορείς να αποσύρεις τον ορισμό.';
  }
  if (kind === 'relationshipType') {
    if (workspace.relationships.some(item => item.typeId === id)) return 'Δεν αναιρείται: υπάρχουν συνδέσεις αυτού του τύπου. Μπορείς να αποσύρεις τον ορισμό.';
    if (workspace.properties.some(item => item.subjectKind === 'relationship' && item.subjectTypeId === id)) return 'Δεν αναιρείται: ο τύπος σχέσης έχει ιδιότητες. Μπορείς να αποσύρεις τον ορισμό.';
  }
  if (kind === 'property' && workspace.facts.some(item => item.propertyId === id)) return 'Δεν αναιρείται: η ιδιότητα έχει γεγονότα. Μπορείς να αποσύρεις τον ορισμό.';
  if (kind === 'entity') {
    if (workspace.relationships.some(item => item.fromId === id || item.toId === id) || workspace.facts.some(item => item.subjectKind === 'entity' && item.subjectId === id)) {
      return 'Δεν αναιρείται: η οντότητα έχει σχέσεις ή γεγονότα. Μπορείς να την αρχειοθετήσεις.';
    }
  }
  if (kind === 'relationship' && workspace.facts.some(item => item.subjectKind === 'relationship' && item.subjectId === id)) return 'Δεν αναιρείται: η σύνδεση έχει γεγονότα.';
  if (kind === 'fact' && workspace.facts.some(item => item.supersedesId === id)) return 'Δεν αναιρείται: υπάρχει νεότερη διόρθωση αυτού του γεγονότος.';
  if (kind === 'source') {
    const used = [...workspace.relationships, ...workspace.facts].some(item => item.evidenceIds.includes(id));
    if (used) return 'Δεν αναιρείται: η πηγή στηρίζει υπάρχοντες ισχυρισμούς.';
  }
  return null;
}
