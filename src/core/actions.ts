import { fail, ok, type Result } from './errors.ts';
import { isStableId } from './ids.ts';
import { parseWorkspace } from './parse.ts';
import { revertBlock, type RevertKind } from './undo.ts';
import type {
  Entity, EntityType, Fact, PropertyDefinition, Relationship, RelationshipType, SavedView, Source, Workspace,
} from './types.ts';

export type DomainAction =
  | { type: 'DefineEntityType'; entityType: EntityType }
  | { type: 'DefineRelationshipType'; relationshipType: RelationshipType }
  | { type: 'DefineProperty'; property: PropertyDefinition }
  | { type: 'CreateEntity'; entity: Entity }
  | { type: 'RenameEntity'; entityId: string; label: string }
  | { type: 'ArchiveEntity'; entityId: string }
  | { type: 'DeprecateDefinition'; kind: 'entityType' | 'relationshipType' | 'property'; id: string }
  | { type: 'CreateSource'; source: Source }
  | { type: 'CreateRelationship'; relationship: Relationship }
  | { type: 'RecordFact'; fact: Fact }
  | { type: 'CorrectFact'; fact: Fact }
  | { type: 'SaveView'; view: SavedView }
  | { type: 'SetBinding'; role: string; definitionId: string }
  | { type: 'ClearBinding'; role: string }
  | { type: 'CommitImport'; facts: Fact[] }
  | { type: 'CommitRecords'; entities: Entity[]; relationships: Relationship[] }
  | { type: 'RevertCreation'; kind: RevertKind; id: string };

export interface AppliedAction {
  workspace: Workspace;
  changedIds: string[];
  summary: string;
}

export interface ActionEnvelope {
  workspaceId: string;
  expectedRevision: number;
  actionId: string;
  actor: string;
  at: string;
  action: DomainAction;
}

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

interface Mutation {
  changedIds: string[];
  summary: string;
  ontologyChanged: boolean;
}

export function applyAction(workspace: Workspace, action: DomainAction): Result<AppliedAction> {
  const draft = structuredClone(workspace);
  const mutated = mutate(draft, action);
  if (!mutated.ok) return mutated;
  const parsed = parseWorkspace(draft);
  if (!parsed.ok) return parsed;
  const next = parsed.value;
  next.revision = workspace.revision + 1;
  if (mutated.value.ontologyChanged) next.ontologyVersion = workspace.ontologyVersion + 1;
  return ok({ workspace: next, changedIds: mutated.value.changedIds, summary: mutated.value.summary });
}

export function fingerprintAction(action: DomainAction): string {
  return stableStringify(action);
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function parseEnvelope(input: ActionEnvelope): Result<ActionEnvelope> {
  if (!input || typeof input !== 'object') return fail('malformed', 'Η ενέργεια δεν είναι έγκυρη.');
  if (!isStableId(input.workspaceId)) return fail('malformed', 'Μη έγκυρο ID χώρου.');
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) return fail('malformed', 'Μη έγκυρη αναμενόμενη αναθεώρηση.');
  if (!isStableId(input.actionId)) return fail('malformed', 'Μη έγκυρο action ID.');
  if (typeof input.actor !== 'string' || input.actor.trim().length === 0 || input.actor.length > 200) return fail('malformed', 'Μη έγκυρος χρήστης ενέργειας.');
  if (typeof input.at !== 'string' || !DATETIME.test(input.at)) return fail('malformed', 'Μη έγκυρος χρόνος ενέργειας.');
  if (!input.action || typeof input.action !== 'object' || typeof input.action.type !== 'string') return fail('malformed', 'Λείπει η ενέργεια.');
  return ok(input);
}

function mutate(draft: Workspace, action: DomainAction): Result<Mutation> {
  switch (action.type) {
    case 'DefineEntityType':
      return defineEntityType(draft, action.entityType);
    case 'DefineRelationshipType':
      return defineRelationshipType(draft, action.relationshipType);
    case 'DefineProperty':
      return defineProperty(draft, action.property);
    case 'CreateEntity':
      return createEntity(draft, action.entity);
    case 'RenameEntity':
      return renameEntity(draft, action.entityId, action.label);
    case 'ArchiveEntity':
      return archiveEntity(draft, action.entityId);
    case 'DeprecateDefinition':
      return deprecateDefinition(draft, action.kind, action.id);
    case 'CreateSource':
      return createSource(draft, action.source);
    case 'CreateRelationship':
      return createRelationship(draft, action.relationship);
    case 'RecordFact':
      return recordFact(draft, action.fact, false);
    case 'CorrectFact':
      return recordFact(draft, action.fact, true);
    case 'SaveView':
      return saveView(draft, action.view);
    case 'SetBinding':
      return setBinding(draft, action.role, action.definitionId);
    case 'ClearBinding':
      return clearBinding(draft, action.role);
    case 'CommitImport':
      return commitImport(draft, action.facts);
    case 'CommitRecords':
      return commitRecords(draft, action.entities, action.relationships);
    case 'RevertCreation':
      return revertCreation(draft, action.kind, action.id);
    default:
      return fail('malformed', 'Άγνωστος τύπος ενέργειας.');
  }
}

function defineEntityType(draft: Workspace, entityType: EntityType): Result<Mutation> {
  if (!isStableId(entityType.id)) return fail('malformed', 'Μη έγκυρο ID τύπου.');
  const label = entityType.label.trim();
  if (!label) return fail('validation', 'Το όνομα δεν μπορεί να είναι κενό.');
  const existing = draft.entityTypes.find(item => item.id === entityType.id);
  if (!existing) {
    if (entityType.deprecated) return fail('validation', 'Νέος τύπος δεν δημιουργείται ήδη αποσυρμένος.');
    if (idUsed(draft, entityType.id)) return fail('validation', 'Το ID χρησιμοποιείται ήδη.');
    draft.entityTypes.push({ id: entityType.id, label, description: entityType.description });
    return changed(entityType.id, `Ορισμός τύπου «${label}»`, true);
  }
  if (entityType.deprecated !== undefined && entityType.deprecated !== (existing.deprecated === true)) {
    return fail('meaning_change', 'Η απόσυρση ορισμού γίνεται με ξεχωριστή ενέργεια.');
  }
  if (existing.label === label && existing.description === entityType.description) return fail('no_change', 'Δεν υπάρχει αλλαγή.');
  existing.label = label;
  existing.description = entityType.description;
  return changed(entityType.id, `Μετονομασία τύπου «${label}»`, true);
}

function defineRelationshipType(draft: Workspace, relationshipType: RelationshipType): Result<Mutation> {
  if (!isStableId(relationshipType.id)) return fail('malformed', 'Μη έγκυρο ID σχέσης.');
  const label = relationshipType.label.trim();
  const description = relationshipType.description.trim();
  if (!label) return fail('validation', 'Το όνομα δεν μπορεί να είναι κενό.');
  if (!description) return fail('validation', 'Η σχέση χρειάζεται σαφές νόημα.');
  if (relationshipType.directed !== true) return fail('validation', 'Οι σχέσεις του v1 είναι κατευθυνόμενες.');
  const existing = draft.relationshipTypes.find(item => item.id === relationshipType.id);
  if (!existing) {
    if (relationshipType.deprecated) return fail('validation', 'Νέα σχέση δεν δημιουργείται ήδη αποσυρμένη.');
    if (idUsed(draft, relationshipType.id)) return fail('validation', 'Το ID χρησιμοποιείται ήδη.');
    if (!knownTypes(draft, relationshipType.fromTypeIds) || !knownTypes(draft, relationshipType.toTypeIds)) {
      return fail('validation', 'Τα άκρα πρέπει να είναι υπάρχοντες τύποι οντοτήτων.');
    }
    draft.relationshipTypes.push({
      id: relationshipType.id, label, description,
      fromTypeIds: [...relationshipType.fromTypeIds],
      toTypeIds: [...relationshipType.toTypeIds],
      directed: true,
    });
    return changed(relationshipType.id, `Ορισμός σχέσης «${label}»`, true);
  }
  if (relationshipType.deprecated !== undefined && relationshipType.deprecated !== (existing.deprecated === true)) {
    return fail('meaning_change', 'Η απόσυρση ορισμού γίνεται με ξεχωριστή ενέργεια.');
  }
  if (!sameSet(existing.fromTypeIds, relationshipType.fromTypeIds) || !sameSet(existing.toTypeIds, relationshipType.toTypeIds)) {
    return fail('meaning_change', 'Τα άκρα μιας σχέσης δεν αλλάζουν. Δημιούργησε νέο τύπο σχέσης.');
  }
  if (existing.label === label && existing.description === description) return fail('no_change', 'Δεν υπάρχει αλλαγή.');
  existing.label = label;
  existing.description = description;
  return changed(relationshipType.id, `Ενημέρωση σχέσης «${label}»`, true);
}

function defineProperty(draft: Workspace, property: PropertyDefinition): Result<Mutation> {
  if (!isStableId(property.id)) return fail('malformed', 'Μη έγκυρο ID ιδιότητας.');
  const label = property.label.trim();
  if (!label) return fail('validation', 'Το όνομα δεν μπορεί να είναι κενό.');
  const existing = draft.properties.find(item => item.id === property.id);
  if (!existing) {
    if (property.deprecated) return fail('validation', 'Νέα ιδιότητα δεν δημιουργείται ήδη αποσυρμένη.');
    if (idUsed(draft, property.id)) return fail('validation', 'Το ID χρησιμοποιείται ήδη.');
    const owner = property.subjectKind === 'entity'
      ? draft.entityTypes.some(item => item.id === property.subjectTypeId && !item.deprecated)
      : draft.relationshipTypes.some(item => item.id === property.subjectTypeId && !item.deprecated);
    if (!owner) return fail('validation', 'Η ιδιότητα πρέπει να ανήκει σε ενεργό τύπο.');
    draft.properties.push({ ...structuredClone(property), label });
    return changed(property.id, `Ορισμός ιδιότητας «${label}»`, true);
  }
  if (property.deprecated !== undefined && property.deprecated !== (existing.deprecated === true)) {
    return fail('meaning_change', 'Η απόσυρση ορισμού γίνεται με ξεχωριστή ενέργεια.');
  }
  if (signature(existing) !== signature({ ...property, label })) {
    return fail('meaning_change', 'Μονάδα, τύπος ή ιδιοκτήτης μιας ιδιότητας δεν αλλάζουν. Δημιούργησε νέα ιδιότητα.');
  }
  if (existing.label === label) return fail('no_change', 'Δεν υπάρχει αλλαγή.');
  existing.label = label;
  return changed(property.id, `Μετονομασία ιδιότητας «${label}»`, true);
}

function createEntity(draft: Workspace, entity: Entity): Result<Mutation> {
  if (!isStableId(entity.id)) return fail('malformed', 'Μη έγκυρο ID οντότητας.');
  const label = entity.label.trim();
  if (!label) return fail('validation', 'Το όνομα δεν μπορεί να είναι κενό.');
  if (entity.archived) return fail('validation', 'Η αρχειοθέτηση γίνεται με ξεχωριστή ενέργεια.');
  const type = draft.entityTypes.find(item => item.id === entity.typeId);
  if (!type) return fail('validation', 'Ο τύπος οντότητας δεν υπάρχει.');
  if (type.deprecated) return fail('validation', 'Ο τύπος έχει αποσυρθεί και δεν δέχεται νέες οντότητες.');
  if (idUsed(draft, entity.id)) return fail('validation', 'Το ID χρησιμοποιείται ήδη.');
  draft.entities.push({ id: entity.id, typeId: entity.typeId, label });
  return changed(entity.id, `Οντότητα «${label}»`, false);
}

function renameEntity(draft: Workspace, entityId: string, label: string): Result<Mutation> {
  const entity = draft.entities.find(item => item.id === entityId);
  if (!entity) return fail('not_found', 'Η οντότητα δεν υπάρχει.');
  const next = label.trim();
  if (!next) return fail('validation', 'Το όνομα δεν μπορεί να είναι κενό.');
  if (entity.label === next) return fail('no_change', 'Δεν υπάρχει αλλαγή.');
  entity.label = next;
  return changed(entity.id, `Μετονομασία σε «${next}»`, false);
}

function archiveEntity(draft: Workspace, entityId: string): Result<Mutation> {
  const entity = draft.entities.find(item => item.id === entityId);
  if (!entity) return fail('not_found', 'Η οντότητα δεν υπάρχει.');
  if (entity.archived) return fail('no_change', 'Η οντότητα είναι ήδη αρχειοθετημένη.');
  entity.archived = true;
  return changed(entity.id, `Αρχειοθέτηση «${entity.label}»`, false);
}

function deprecateDefinition(draft: Workspace, kind: 'entityType' | 'relationshipType' | 'property', id: string): Result<Mutation> {
  const list = kind === 'entityType' ? draft.entityTypes : kind === 'relationshipType' ? draft.relationshipTypes : draft.properties;
  const found = list.find(item => item.id === id);
  if (!found) return fail('not_found', 'Ο ορισμός δεν υπάρχει.');
  if (found.deprecated) return fail('no_change', 'Ο ορισμός είναι ήδη αποσυρμένος.');
  found.deprecated = true;
  return changed(id, `Απόσυρση «${found.label}»`, true);
}

function createSource(draft: Workspace, source: Source): Result<Mutation> {
  if (!isStableId(source.id)) return fail('malformed', 'Μη έγκυρο ID πηγής.');
  const label = source.label.trim();
  if (!label) return fail('validation', 'Το όνομα δεν μπορεί να είναι κενό.');
  if (idUsed(draft, source.id)) return fail('validation', 'Το ID χρησιμοποιείται ήδη.');
  draft.sources.push({ ...structuredClone(source), label });
  return changed(source.id, `Πηγή «${label}»`, false);
}

function createRelationship(draft: Workspace, relationship: Relationship): Result<Mutation> {
  if (!isStableId(relationship.id)) return fail('malformed', 'Μη έγκυρο ID σύνδεσης.');
  if (idUsed(draft, relationship.id)) return fail('validation', 'Το ID χρησιμοποιείται ήδη.');
  if (relationship.fromId === relationship.toId) return fail('validation', 'Μια σύνδεση δεν ενώνει μια οντότητα με τον εαυτό της.');
  const type = draft.relationshipTypes.find(item => item.id === relationship.typeId);
  if (!type || type.deprecated) return fail('validation', 'Ο τύπος σχέσης δεν είναι διαθέσιμος.');
  const from = draft.entities.find(item => item.id === relationship.fromId);
  const to = draft.entities.find(item => item.id === relationship.toId);
  if (!from || !to) return fail('validation', 'Τα άκρα της σύνδεσης πρέπει να υπάρχουν.');
  if (from.archived || to.archived) return fail('validation', 'Αρχειοθετημένη οντότητα δεν μπαίνει σε νέα σύνδεση.');
  if (!type.fromTypeIds.includes(from.typeId) || !type.toTypeIds.includes(to.typeId)) {
    return fail('validation', 'Τα άκρα δεν επιτρέπονται από τον τύπο σχέσης.');
  }
  const blocked = blockedEvidence(draft, relationship.evidenceIds);
  if (blocked) return blocked;
  if (!validConfidence(relationship.confidence)) return fail('malformed', 'Μη έγκυρη εμπιστοσύνη.');
  draft.relationships.push(structuredClone(relationship));
  return changed(relationship.id, `Σύνδεση ${from.label} → ${to.label}`, false);
}

function recordFact(draft: Workspace, fact: Fact, correction: boolean): Result<Mutation> {
  if (!isStableId(fact.id)) return fail('malformed', 'Μη έγκυρο ID γεγονότος.');
  if (idUsed(draft, fact.id)) return fail('validation', 'Το ID χρησιμοποιείται ήδη.');
  if (correction && !fact.supersedesId) return fail('validation', 'Η διόρθωση πρέπει να δείχνει το προηγούμενο γεγονός.');
  if (!correction && fact.supersedesId) return fail('validation', 'Νέο γεγονός δεν αντικαθιστά άλλο. Χρησιμοποίησε διόρθωση.');
  const property = draft.properties.find(item => item.id === fact.propertyId);
  if (!property || property.deprecated) return fail('validation', 'Η ιδιότητα δεν είναι διαθέσιμη.');
  if (fact.subjectKind === 'entity') {
    const entity = draft.entities.find(item => item.id === fact.subjectId);
    if (!entity) return fail('validation', 'Η οντότητα του γεγονότος δεν υπάρχει.');
    if (entity.archived) return fail('validation', 'Αρχειοθετημένη οντότητα δεν δέχεται νέο γεγονός.');
    if (property.subjectKind !== 'entity' || property.subjectTypeId !== entity.typeId) return fail('validation', 'Η ιδιότητα δεν ανήκει στον τύπο της οντότητας.');
  } else {
    const relationship = draft.relationships.find(item => item.id === fact.subjectId);
    if (!relationship) return fail('validation', 'Η σύνδεση του γεγονότος δεν υπάρχει.');
    if (property.subjectKind !== 'relationship' || property.subjectTypeId !== relationship.typeId) return fail('validation', 'Η ιδιότητα δεν ανήκει στον τύπο της σύνδεσης.');
  }
  const blocked = blockedEvidence(draft, fact.evidenceIds);
  if (blocked) return blocked;
  if (!validConfidence(fact.confidence)) return fail('malformed', 'Μη έγκυρη εμπιστοσύνη.');
  draft.facts.push(structuredClone(fact));
  return changed(fact.id, correction ? 'Διόρθωση γεγονότος' : 'Καταγραφή γεγονότος', false);
}

function saveView(draft: Workspace, view: SavedView): Result<Mutation> {
  if (!isStableId(view.id)) return fail('malformed', 'Μη έγκυρο ID προβολής.');
  const label = view.label.trim();
  if (!label) return fail('validation', 'Το όνομα δεν μπορεί να είναι κενό.');
  const next = { ...structuredClone(view), label };
  const existing = draft.savedViews.find(item => item.id === view.id);
  if (!existing) {
    if (idUsed(draft, view.id)) return fail('validation', 'Το ID χρησιμοποιείται ήδη.');
    draft.savedViews.push(next);
    return changed(view.id, `Προβολή «${label}»`, false);
  }
  if (existing.label === label && stableStringify(existing.query) === stableStringify(next.query)) return fail('no_change', 'Δεν υπάρχει αλλαγή.');
  existing.label = label;
  existing.query = next.query;
  return changed(view.id, `Ενημέρωση προβολής «${label}»`, false);
}

const BINDING_ROLES: Record<string, 'entityType' | 'relationshipType' | 'entityProperty' | 'relationshipProperty'> = {
  countryType: 'entityType',
  regionType: 'entityType',
  gdpProperty: 'entityProperty',
  populationProperty: 'entityProperty',
  defenseSpendingProperty: 'entityProperty',
  regionalGvaProperty: 'entityProperty',
  capitalType: 'relationshipType',
  fdiStockProperty: 'relationshipProperty',
  fdiFlowProperty: 'relationshipProperty',
};

function setBinding(draft: Workspace, role: string, definitionId: string): Result<Mutation> {
  const kind = BINDING_ROLES[role];
  if (!kind || !isStableId(definitionId)) return fail('validation', 'Ο ρόλος ή ο ορισμός δεν είναι έγκυρος.');
  if (kind === 'entityType' && !draft.entityTypes.some(item => item.id === definitionId && !item.deprecated)) return fail('validation', 'Ο ρόλος θέλει τύπο οντότητας.');
  if (kind === 'relationshipType' && !draft.relationshipTypes.some(item => item.id === definitionId && !item.deprecated)) return fail('validation', 'Ο ρόλος θέλει τύπο σχέσης.');
  if (kind === 'entityProperty' || kind === 'relationshipProperty') {
    const property = draft.properties.find(item => item.id === definitionId && !item.deprecated);
    if (!property || property.valueType !== 'number') return fail('validation', 'Ο ρόλος θέλει αριθμητική ιδιότητα.');
    if (kind === 'entityProperty' && property.subjectKind !== 'entity') return fail('validation', 'Η ιδιότητα δεν ανήκει σε οντότητα.');
    if (kind === 'relationshipProperty' && property.subjectKind !== 'relationship') return fail('validation', 'Η ιδιότητα δεν ανήκει σε σχέση.');
    const expected = role === 'regionalGvaProperty' ? draft.bindings.regionType : role === 'fdiStockProperty' || role === 'fdiFlowProperty' ? draft.bindings.capitalType : draft.bindings.countryType;
    if (expected && property.subjectTypeId !== expected) return fail('validation', 'Η ιδιότητα δεν ανήκει στον ήδη συνδεδεμένο τύπο.');
  }
  if (draft.bindings[role] === definitionId) return fail('no_change', 'Ο ρόλος δείχνει ήδη αυτόν τον ορισμό.');
  draft.bindings[role] = definitionId;
  return changed(role, `Σύνδεση ρόλου ${role}`, false);
}

function clearBinding(draft: Workspace, role: string): Result<Mutation> {
  if (!BINDING_ROLES[role] || !(role in draft.bindings)) return fail('no_change', 'Ο ρόλος δεν είναι συνδεδεμένος.');
  delete draft.bindings[role];
  return changed(role, `Αφαίρεση ρόλου ${role}`, false);
}

function commitRecords(draft: Workspace, entities: Entity[], relationships: Relationship[]): Result<Mutation> {
  if (entities.length === 0 && relationships.length === 0) return fail('no_change', 'Δεν υπάρχουν γραμμές για καταγραφή.');
  const trial = structuredClone(draft);
  const changedIds: string[] = [];
  for (const entity of entities) {
    const recorded = createEntity(trial, entity);
    if (!recorded.ok) return recorded;
    changedIds.push(entity.id);
  }
  for (const relationship of relationships) {
    const recorded = createRelationship(trial, relationship);
    if (!recorded.ok) return recorded;
    changedIds.push(relationship.id);
  }
  draft.entities.splice(0, draft.entities.length, ...trial.entities);
  draft.relationships.splice(0, draft.relationships.length, ...trial.relationships);
  return ok({ changedIds, summary: `Εισαγωγή ${entities.length} οντοτήτων και ${relationships.length} συνδέσεων`, ontologyChanged: false });
}

function commitImport(draft: Workspace, facts: Fact[]): Result<Mutation> {
  if (facts.length === 0) return fail('no_change', 'Δεν υπάρχουν γραμμές για καταγραφή.');
  const trial = structuredClone(draft);
  const changedIds: string[] = [];
  for (const fact of facts) {
    const duplicate = trial.facts.find(item => item.subjectKind === fact.subjectKind && item.subjectId === fact.subjectId && item.propertyId === fact.propertyId && item.validFrom === fact.validFrom && item.validTo === fact.validTo && item.value === fact.value && item.basis === fact.basis && item.status === fact.status && sameSet(item.evidenceIds, fact.evidenceIds));
    if (duplicate) continue;
    const recorded = recordFact(trial, fact, Boolean(fact.supersedesId));
    if (!recorded.ok) return recorded;
    changedIds.push(fact.id);
  }
  if (changedIds.length === 0) return fail('no_change', 'Όλες οι γραμμές υπάρχουν ήδη.');
  draft.facts.splice(0, draft.facts.length, ...trial.facts);
  return ok({ changedIds, summary: `Εισαγωγή ${changedIds.length} γεγονότων`, ontologyChanged: false });
}

function revertCreation(draft: Workspace, kind: RevertKind, id: string): Result<Mutation> {
  const allowed = revertBlock(draft, kind, id);
  if (!allowed.ok) return allowed;
  const removed = removeRecord(draft, kind, id);
  if (!removed) return fail('not_found', 'Η εγγραφή για αναίρεση δεν υπάρχει.');
  return changed(id, `Αναίρεση δημιουργίας ${id}`, kind === 'entityType' || kind === 'relationshipType' || kind === 'property');
}

function removeRecord(draft: Workspace, kind: RevertKind, id: string): boolean {
  const lists = {
    entityType: draft.entityTypes,
    relationshipType: draft.relationshipTypes,
    property: draft.properties,
    entity: draft.entities,
    relationship: draft.relationships,
    fact: draft.facts,
    source: draft.sources,
    savedView: draft.savedViews,
  } as const;
  const list = lists[kind] as { id: string }[];
  const index = list.findIndex(item => item.id === id);
  if (index < 0) return false;
  list.splice(index, 1);
  return true;
}

function validConfidence(confidence: string | undefined): boolean {
  return confidence === undefined || confidence === 'high' || confidence === 'medium' || confidence === 'low';
}

function blockedEvidence(draft: Workspace, evidenceIds: string[]): Result<never> | null {
  for (const id of evidenceIds) {
    const source = draft.sources.find(item => item.id === id);
    if (source?.verificationStatus === 'blocked') {
      return fail('validation', `Η πηγή «${source.label}» είναι αποκλεισμένη και δεν στηρίζει νέο ισχυρισμό.`);
    }
  }
  return null;
}

function knownTypes(draft: Workspace, ids: string[]): boolean {
  return ids.length > 0 && ids.every(id => draft.entityTypes.some(item => item.id === id && !item.deprecated));
}

function idUsed(draft: Workspace, id: string): boolean {
  const lists = [draft.entityTypes, draft.relationshipTypes, draft.properties, draft.entities, draft.relationships, draft.facts, draft.sources, draft.savedViews];
  return lists.some(list => list.some(item => item.id === id));
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((item, index) => item === b[index]);
}

function signature(property: PropertyDefinition): string {
  return stableStringify({
    subjectKind: property.subjectKind,
    subjectTypeId: property.subjectTypeId,
    valueType: property.valueType,
    unit: property.unit ?? null,
    measureKind: property.measureKind ?? null,
    frequency: property.frequency ?? null,
    nonnegative: property.nonnegative ?? null,
  });
}

function changed(id: string, summary: string, ontologyChanged: boolean): Result<Mutation> {
  return ok({ changedIds: [id], summary, ontologyChanged });
}
