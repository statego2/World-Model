import { failures, ok, type DomainError, type Result } from './errors.ts';
import { isStableId } from './ids.ts';
import { DEFAULT_PARSE_LIMITS, type ParseLimits } from './limits.ts';
import type {
  Entity, EntityType, Fact, PropertyDefinition, Relationship, RelationshipType, SavedView, Source, Workspace,
} from './types.ts';
import { validateWorkspace } from './validate.mjs';

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function parseWorkspace(input: unknown, limits: ParseLimits = DEFAULT_PARSE_LIMITS): Result<Workspace> {
  const measured = measure(input, limits);
  if (!measured.ok) return measured;
  const shaped = shapeWorkspace(input, limits);
  if (!shaped.ok) return shaped;
  const semantic = validateWorkspace(shaped.value);
  if (semantic.length > 0) {
    return failures(semantic.slice(0, 40).map(message => ({ code: 'validation', message })));
  }
  return ok(shaped.value);
}

function measure(input: unknown, limits: ParseLimits): Result<true> {
  const errors: DomainError[] = [];
  const seen = new WeakSet<object>();
  let bytes = 0;
  let nodes = 0;
  const visit = (value: unknown, depth: number): void => {
    if (errors.length > 0) return;
    nodes += 1;
    if (nodes > limits.maxCollection * 20) {
      errors.push({ code: 'limit', message: 'Το έγγραφο έχει πάρα πολλούς κόμβους.' });
      return;
    }
    if (depth > limits.maxDepth) {
      errors.push({ code: 'limit', message: `Το βάθος ξεπερνά το όριο ${limits.maxDepth}.` });
      return;
    }
    if (value === null || typeof value === 'boolean') {
      bytes += 4;
      return;
    }
    if (typeof value === 'number') {
      bytes += 16;
      return;
    }
    if (typeof value === 'string') {
      bytes += value.length;
      if (value.length > limits.maxString) errors.push({ code: 'limit', message: `Κείμενο μεγαλύτερο από ${limits.maxString} χαρακτήρες.` });
      return;
    }
    if (typeof value !== 'object') {
      errors.push({ code: 'malformed', message: 'Μη υποστηριζόμενος τύπος τιμής.' });
      return;
    }
    if (seen.has(value)) {
      errors.push({ code: 'malformed', message: 'Κυκλική αναφορά στο έγγραφο.' });
      return;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      bytes += 2;
      if (value.length > limits.maxCollection) {
        errors.push({ code: 'limit', message: `Λίστα μεγαλύτερη από ${limits.maxCollection} εγγραφές.` });
        return;
      }
      for (const item of value) visit(item, depth + 1);
      return;
    }
    const keys = Object.keys(value);
    const cap = Math.max(limits.maxObjectKeys, limits.maxBindings);
    if (keys.length > cap) {
      errors.push({ code: 'limit', message: `Αντικείμενο με περισσότερα από ${cap} πεδία.` });
      return;
    }
    for (const key of keys) {
      bytes += key.length;
      visit((value as Record<string, unknown>)[key], depth + 1);
    }
  };
  visit(input, 0);
  if (bytes > limits.maxBytes) errors.push({ code: 'limit', message: `Το έγγραφο ξεπερνά τα ${limits.maxBytes} bytes.` });
  return errors.length > 0 ? failures(errors.slice(0, 40)) : ok(true);
}

class Shape {
  readonly errors: DomainError[] = [];

  fail(code: DomainError['code'], message: string, path?: string): void {
    if (this.errors.length < 40) this.errors.push({ code, message, ...(path ? { path } : {}) });
  }

  record(value: unknown, path: string): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.fail('malformed', 'Αναμενόταν αντικείμενο.', path);
      return null;
    }
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (FORBIDDEN_KEYS.has(key)) this.fail('malformed', `Μη επιτρεπτό πεδίο ${key}.`, `${path}.${key}`);
    }
    return record;
  }

  unknown(record: Record<string, unknown>, allowed: readonly string[], path: string): void {
    const okKeys = new Set(allowed);
    for (const key of Object.keys(record)) {
      if (!okKeys.has(key)) this.fail('unknown_field', `Άγνωστο πεδίο ${key}.`, path ? `${path}.${key}` : key);
    }
  }

  string(record: Record<string, unknown>, key: string, path: string, mode: 'text' | 'id' | 'any'): string | null {
    const value = record[key];
    const at = `${path}.${key}`;
    if (typeof value !== 'string') {
      this.fail('malformed', `Το πεδίο ${key} πρέπει να είναι κείμενο.`, at);
      return null;
    }
    if (mode !== 'any' && value.trim().length === 0) {
      this.fail('malformed', `Το πεδίο ${key} δεν μπορεί να είναι κενό.`, at);
      return null;
    }
    if (mode === 'id' && !isStableId(value)) {
      this.fail('malformed', `Μη έγκυρο σταθερό ID στο ${key}.`, at);
      return null;
    }
    return value;
  }

  optionalBoolean(record: Record<string, unknown>, key: string, path: string): boolean | undefined {
    if (!(key in record)) return undefined;
    const value = record[key];
    if (typeof value !== 'boolean') {
      this.fail('malformed', `Το πεδίο ${key} πρέπει να είναι boolean.`, `${path}.${key}`);
      return undefined;
    }
    return value;
  }

  stringList(value: unknown, path: string): string[] | null {
    if (!Array.isArray(value)) {
      this.fail('malformed', 'Αναμενόταν λίστα.', path);
      return null;
    }
    const ids: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string' || !isStableId(item)) {
        this.fail('malformed', 'Μη έγκυρη αναφορά σε λίστα.', path);
        return null;
      }
      ids.push(item);
    }
    return ids;
  }
}

function shapeWorkspace(input: unknown, limits: ParseLimits): Result<Workspace> {
  const shape = new Shape();
  const root = shape.record(input, 'workspace');
  if (!root) return failures(shape.errors);
  shape.unknown(root, [
    'formatVersion', 'id', 'label', 'dataMode', 'ontologyVersion', 'revision',
    'entityTypes', 'relationshipTypes', 'properties', 'entities', 'relationships',
    'facts', 'sources', 'savedViews', 'bindings',
  ], '');
  if (root.formatVersion !== 1) shape.fail('unsupported_version', 'Μη υποστηριζόμενη formatVersion.', 'formatVersion');
  const id = shape.string(root, 'id', 'workspace', 'id');
  const label = shape.string(root, 'label', 'workspace', 'text');
  const dataMode = root.dataMode === 'demo' || root.dataMode === 'real' ? root.dataMode : null;
  if (!dataMode) shape.fail('malformed', 'Μη έγκυρο dataMode.', 'dataMode');
  if (!Number.isInteger(root.ontologyVersion)) shape.fail('malformed', 'Μη έγκυρη ontologyVersion.', 'ontologyVersion');
  if (!Number.isInteger(root.revision)) shape.fail('malformed', 'Μη έγκυρη revision.', 'revision');
  const entityTypes = collection(shape, root.entityTypes, 'entityTypes', shapeEntityType);
  const relationshipTypes = collection(shape, root.relationshipTypes, 'relationshipTypes', shapeRelationshipType);
  const properties = collection(shape, root.properties, 'properties', shapeProperty);
  const entities = collection(shape, root.entities, 'entities', shapeEntity);
  const relationships = collection(shape, root.relationships, 'relationships', shapeRelationship);
  const facts = collection(shape, root.facts, 'facts', shapeFact);
  const sources = collection(shape, root.sources, 'sources', shapeSource);
  const savedViews = collection(shape, root.savedViews, 'savedViews', shapeView);
  const bindings = shapeBindings(shape, root.bindings, limits);
  if (shape.errors.length > 0 || !id || !label || !dataMode || !entityTypes || !relationshipTypes || !properties || !entities || !relationships || !facts || !sources || !savedViews || !bindings) {
    return failures(shape.errors.length > 0 ? shape.errors : [{ code: 'malformed', message: 'Ελλιπές workspace.' }]);
  }
  const workspace: Workspace = {
    formatVersion: 1,
    id,
    label,
    dataMode,
    ontologyVersion: root.ontologyVersion as number,
    revision: root.revision as number,
    entityTypes,
    relationshipTypes,
    properties,
    entities,
    relationships,
    facts,
    sources,
    savedViews,
    bindings,
  };
  return ok(workspace);
}

function collection<T>(shape: Shape, value: unknown, path: string, read: (shape: Shape, value: unknown, path: string) => T | null): T[] | null {
  if (!Array.isArray(value)) {
    shape.fail('malformed', 'Αναμενόταν λίστα.', path);
    return null;
  }
  const rows: T[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const row = read(shape, value[index], `${path}.${index}`);
    if (row) rows.push(row);
  }
  return shape.errors.length > 0 ? null : rows;
}

function shapeEntityType(shape: Shape, value: unknown, path: string): EntityType | null {
  const row = shape.record(value, path);
  if (!row) return null;
  shape.unknown(row, ['id', 'label', 'description', 'deprecated'], path);
  const id = shape.string(row, 'id', path, 'id');
  const label = shape.string(row, 'label', path, 'text');
  const description = shape.string(row, 'description', path, 'any');
  const deprecated = shape.optionalBoolean(row, 'deprecated', path);
  if (!id || label === null || description === null) return null;
  return { id, label, description, ...(deprecated === undefined ? {} : { deprecated }) };
}

function shapeRelationshipType(shape: Shape, value: unknown, path: string): RelationshipType | null {
  const row = shape.record(value, path);
  if (!row) return null;
  shape.unknown(row, ['id', 'label', 'description', 'fromTypeIds', 'toTypeIds', 'directed', 'deprecated'], path);
  const id = shape.string(row, 'id', path, 'id');
  const label = shape.string(row, 'label', path, 'text');
  const description = shape.string(row, 'description', path, 'any');
  const fromTypeIds = shape.stringList(row.fromTypeIds, `${path}.fromTypeIds`);
  const toTypeIds = shape.stringList(row.toTypeIds, `${path}.toTypeIds`);
  const deprecated = shape.optionalBoolean(row, 'deprecated', path);
  if (row.directed !== true) shape.fail('malformed', 'Οι σχέσεις του v1 είναι κατευθυνόμενες.', `${path}.directed`);
  if (!id || label === null || description === null || !fromTypeIds || !toTypeIds) return null;
  return { id, label, description, fromTypeIds, toTypeIds, directed: true as const, ...(deprecated === undefined ? {} : { deprecated }) };
}

function shapeProperty(shape: Shape, value: unknown, path: string): PropertyDefinition | null {
  const row = shape.record(value, path);
  if (!row) return null;
  shape.unknown(row, ['id', 'label', 'subjectKind', 'subjectTypeId', 'valueType', 'unit', 'measureKind', 'frequency', 'nonnegative', 'deprecated'], path);
  const id = shape.string(row, 'id', path, 'id');
  const label = shape.string(row, 'label', path, 'text');
  const subjectKind = row.subjectKind === 'entity' || row.subjectKind === 'relationship' ? row.subjectKind : null;
  if (!subjectKind) shape.fail('malformed', 'Μη έγκυρο subjectKind.', `${path}.subjectKind`);
  const subjectTypeId = shape.string(row, 'subjectTypeId', path, 'id');
  const valueType = row.valueType === 'string' || row.valueType === 'number' || row.valueType === 'boolean' || row.valueType === 'date' ? row.valueType : null;
  if (!valueType) shape.fail('malformed', 'Μη έγκυρος πρωτογενής τύπος.', `${path}.valueType`);
  let unit: string | undefined;
  if ('unit' in row) {
    if (typeof row.unit !== 'string' || row.unit.trim().length === 0) shape.fail('malformed', 'Μη έγκυρη μονάδα.', `${path}.unit`);
    else unit = row.unit;
  }
  let measureKind: 'stock' | 'flow' | 'ratio' | 'count' | undefined;
  if ('measureKind' in row) {
    if (row.measureKind === 'stock' || row.measureKind === 'flow' || row.measureKind === 'ratio' || row.measureKind === 'count') measureKind = row.measureKind;
    else shape.fail('malformed', 'Μη έγκυρο measureKind.', `${path}.measureKind`);
  }
  let frequency: 'annual' | undefined;
  if ('frequency' in row) {
    if (row.frequency === 'annual') frequency = 'annual';
    else shape.fail('malformed', 'Μη έγκυρη συχνότητα.', `${path}.frequency`);
  }
  const nonnegative = shape.optionalBoolean(row, 'nonnegative', path);
  const deprecated = shape.optionalBoolean(row, 'deprecated', path);
  if (!id || label === null || !subjectKind || !subjectTypeId || !valueType) return null;
  return {
    id, label, subjectKind, subjectTypeId, valueType,
    ...(unit === undefined ? {} : { unit }),
    ...(measureKind === undefined ? {} : { measureKind }),
    ...(frequency === undefined ? {} : { frequency }),
    ...(nonnegative === undefined ? {} : { nonnegative }),
    ...(deprecated === undefined ? {} : { deprecated }),
  };
}

function shapeEntity(shape: Shape, value: unknown, path: string): Entity | null {
  const row = shape.record(value, path);
  if (!row) return null;
  shape.unknown(row, ['id', 'typeId', 'label', 'archived'], path);
  const id = shape.string(row, 'id', path, 'id');
  const typeId = shape.string(row, 'typeId', path, 'id');
  const label = shape.string(row, 'label', path, 'text');
  const archived = shape.optionalBoolean(row, 'archived', path);
  if (!id || !typeId || label === null) return null;
  return { id, typeId, label, ...(archived === undefined ? {} : { archived }) };
}

function shapeRelationship(shape: Shape, value: unknown, path: string): Relationship | null {
  const row = shape.record(value, path);
  if (!row) return null;
  shape.unknown(row, ['id', 'typeId', 'fromId', 'toId', 'basis', 'evidenceIds', 'validFrom', 'validTo'], path);
  const id = shape.string(row, 'id', path, 'id');
  const typeId = shape.string(row, 'typeId', path, 'id');
  const fromId = shape.string(row, 'fromId', path, 'id');
  const toId = shape.string(row, 'toId', path, 'id');
  const basis = row.basis === 'reported' || row.basis === 'assumption' ? row.basis : null;
  if (!basis) shape.fail('malformed', 'Μη έγκυρη βάση.', `${path}.basis`);
  const evidenceIds = shape.stringList(row.evidenceIds, `${path}.evidenceIds`);
  const validFrom = shape.string(row, 'validFrom', path, 'text');
  if (!('validTo' in row) || !(row.validTo === null || typeof row.validTo === 'string')) shape.fail('malformed', 'Μη έγκυρο validTo.', `${path}.validTo`);
  if (!id || !typeId || !fromId || !toId || !basis || !evidenceIds || !validFrom) return null;
  return { id, typeId, fromId, toId, basis, evidenceIds, validFrom, validTo: row.validTo as string | null };
}

function shapeFact(shape: Shape, value: unknown, path: string): Fact | null {
  const row = shape.record(value, path);
  if (!row) return null;
  shape.unknown(row, ['id', 'subjectKind', 'subjectId', 'propertyId', 'value', 'status', 'basis', 'evidenceIds', 'validFrom', 'validTo', 'createdAt', 'supersedesId'], path);
  const id = shape.string(row, 'id', path, 'id');
  const subjectKind = row.subjectKind === 'entity' || row.subjectKind === 'relationship' ? row.subjectKind : null;
  if (!subjectKind) shape.fail('malformed', 'Μη έγκυρο subjectKind γεγονότος.', `${path}.subjectKind`);
  const subjectId = shape.string(row, 'subjectId', path, 'id');
  const propertyId = shape.string(row, 'propertyId', path, 'id');
  if (!('value' in row) || !isValue(row.value)) shape.fail('malformed', 'Μη έγκυρη τιμή γεγονότος.', `${path}.value`);
  const status = row.status === 'observed' || row.status === 'estimated' || row.status === 'provisional' || row.status === 'missing' ? row.status : null;
  if (!status) shape.fail('malformed', 'Μη έγκυρη κατάσταση γεγονότος.', `${path}.status`);
  const basis = row.basis === 'reported' || row.basis === 'assumption' ? row.basis : null;
  if (!basis) shape.fail('malformed', 'Μη έγκυρη βάση γεγονότος.', `${path}.basis`);
  const evidenceIds = shape.stringList(row.evidenceIds, `${path}.evidenceIds`);
  const validFrom = shape.string(row, 'validFrom', path, 'text');
  if (!('validTo' in row) || !(row.validTo === null || typeof row.validTo === 'string')) shape.fail('malformed', 'Μη έγκυρο validTo.', `${path}.validTo`);
  const createdAt = shape.string(row, 'createdAt', path, 'text');
  let supersedesId: string | undefined;
  if ('supersedesId' in row) {
    const next = shape.string(row, 'supersedesId', path, 'id');
    if (next) supersedesId = next;
  }
  if (!id || !subjectKind || !subjectId || !propertyId || !status || !basis || !evidenceIds || !validFrom || !createdAt || !('value' in row) || !isValue(row.value)) return null;
  return {
    id, subjectKind, subjectId, propertyId, value: row.value, status, basis, evidenceIds, validFrom,
    validTo: row.validTo as string | null, createdAt, ...(supersedesId === undefined ? {} : { supersedesId }),
  };
}

function shapeSource(shape: Shape, value: unknown, path: string): Source | null {
  const row = shape.record(value, path);
  if (!row) return null;
  shape.unknown(row, ['id', 'label', 'locator', 'retrievedAt', 'licenseNote', 'verificationStatus', 'isDemo'], path);
  const id = shape.string(row, 'id', path, 'id');
  const label = shape.string(row, 'label', path, 'text');
  const locator = shape.string(row, 'locator', path, 'text');
  const retrievedAt = shape.string(row, 'retrievedAt', path, 'text');
  const licenseNote = shape.string(row, 'licenseNote', path, 'text');
  const verificationStatus = row.verificationStatus === 'candidate' || row.verificationStatus === 'verified' || row.verificationStatus === 'blocked' ? row.verificationStatus : null;
  if (!verificationStatus) shape.fail('malformed', 'Μη έγκυρη κατάσταση πηγής.', `${path}.verificationStatus`);
  if (typeof row.isDemo !== 'boolean') shape.fail('malformed', 'Το isDemo πρέπει να είναι boolean.', `${path}.isDemo`);
  if (!id || label === null || !locator || !retrievedAt || licenseNote === null || !verificationStatus || typeof row.isDemo !== 'boolean') return null;
  return { id, label, locator, retrievedAt, licenseNote, verificationStatus, isDemo: row.isDemo };
}

function shapeView(shape: Shape, value: unknown, path: string): SavedView | null {
  const row = shape.record(value, path);
  if (!row) return null;
  shape.unknown(row, ['id', 'label', 'query'], path);
  const id = shape.string(row, 'id', path, 'id');
  const label = shape.string(row, 'label', path, 'text');
  const queryRecord = shape.record(row.query, `${path}.query`);
  if (!id || label === null || !queryRecord) return null;
  shape.unknown(queryRecord, ['startEntityId', 'steps', 'year', 'basis', 'sourceIds', 'limit'], `${path}.query`);
  const startEntityId = shape.string(queryRecord, 'startEntityId', `${path}.query`, 'id');
  const basis = queryRecord.basis === 'reported' || queryRecord.basis === 'assumption' ? queryRecord.basis : null;
  if (!basis) shape.fail('malformed', 'Μη έγκυρη βάση ερωτήματος.', `${path}.query.basis`);
  const sourceIds = shape.stringList(queryRecord.sourceIds, `${path}.query.sourceIds`);
  if (!Array.isArray(queryRecord.steps)) shape.fail('malformed', 'Τα βήματα του ερωτήματος πρέπει να είναι λίστα.', `${path}.query.steps`);
  const steps: { relationshipTypeId: string; direction: 'out' | 'in' }[] = [];
  if (Array.isArray(queryRecord.steps)) {
    for (let index = 0; index < queryRecord.steps.length; index += 1) {
      const stepPath = `${path}.query.steps.${index}`;
      const step = shape.record(queryRecord.steps[index], stepPath);
      if (!step) continue;
      shape.unknown(step, ['relationshipTypeId', 'direction'], stepPath);
      const relationshipTypeId = shape.string(step, 'relationshipTypeId', stepPath, 'id');
      const direction = step.direction === 'out' || step.direction === 'in' ? step.direction : null;
      if (!direction) shape.fail('malformed', 'Μη έγκυρη κατεύθυνση βήματος.', `${stepPath}.direction`);
      if (relationshipTypeId && direction) steps.push({ relationshipTypeId, direction });
    }
  }
  if (!startEntityId || !basis || !sourceIds) return null;
  return { id, label, query: { startEntityId, steps, year: queryRecord.year as number, basis, sourceIds, limit: queryRecord.limit as number } };
}

function shapeBindings(shape: Shape, value: unknown, limits: ParseLimits): Record<string, string> | null {
  const record = shape.record(value, 'bindings');
  if (!record) return null;
  const keys = Object.keys(record);
  if (keys.length > limits.maxBindings) {
    shape.fail('limit', `Περισσότερα από ${limits.maxBindings} bindings.`, 'bindings');
    return null;
  }
  const bindings: Record<string, string> = {};
  for (const key of keys) {
    if (key.trim().length === 0 || FORBIDDEN_KEYS.has(key)) {
      shape.fail('malformed', 'Μη έγκυρο όνομα binding.', `bindings.${key}`);
      continue;
    }
    const bound = record[key];
    if (typeof bound !== 'string' || !isStableId(bound)) shape.fail('malformed', 'Μη έγκυρη αναφορά binding.', `bindings.${key}`);
    else bindings[key] = bound;
  }
  return shape.errors.length > 0 ? null : bindings;
}

function isValue(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
}
