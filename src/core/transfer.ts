import { fail, ok, type Result } from './errors.ts';
import { isStableId } from './ids.ts';
import { ENVELOPE_PARSE_LIMITS } from './limits.ts';
import { checkDocumentLimits, parseWorkspace } from './parse.ts';
import type { Workspace } from './types.ts';

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const ACTION_TYPES = new Set([
  'DefineEntityType', 'DefineRelationshipType', 'DefineProperty', 'CreateEntity', 'RenameEntity', 'ArchiveEntity',
  'DeprecateDefinition', 'CreateSource', 'CreateRelationship', 'RecordFact', 'CorrectFact', 'SaveView', 'SetBinding', 'ClearBinding', 'CommitImport', 'CommitRecords', 'RevertCreation',
]);

export interface TransferAction {
  key: string;
  workspaceId: string;
  actionId: string;
  fingerprint: string;
  revision: number;
  changedIds: string[];
  at: string;
  actor: string;
}

export interface TransferChange {
  workspaceId: string;
  actionId: string;
  actor: string;
  at: string;
  revision: number;
  actionType: string;
  summary: string;
  changedIds: string[];
  action: { type: string };
  inverse: { type: string } | null;
}

export interface ExportEnvelope {
  formatVersion: 1;
  kind: 'world-model-export';
  exportedAt: string;
  workspace: Workspace;
  history: TransferChange[];
  actions: TransferAction[];
}

export function readTransfer(payload: unknown): Result<{ workspace: Workspace; history: TransferChange[]; actions: TransferAction[]; exportedAt: string | null }> {
  const limited = checkDocumentLimits(payload, ENVELOPE_PARSE_LIMITS);
  if (!limited.ok) return limited;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fail('malformed', 'Το αρχείο δεν είναι αντικείμενο.');
  const record = payload as Record<string, unknown>;
  if ('formatVersion' in record && record.formatVersion !== 1) return fail('unsupported_version', 'Άγνωστη formatVersion. Ο χώρος δεν άλλαξε.');
  if (record.kind === 'world-model-export') {
    const parsed = parseWorkspace(record.workspace);
    if (!parsed.ok) return parsed;
    if (!Array.isArray(record.history) || !Array.isArray(record.actions)) return fail('malformed', 'Το αντίγραφο δεν έχει ιστορικό.');
    const history = record.history.map((item, index) => parseChange(item, parsed.value, index));
    const actions = record.actions.map((item, index) => parseStoredAction(item, parsed.value, index));
    const problem = [...history, ...actions].find(item => !item.ok);
    if (problem && !problem.ok) return problem;
    const changes = history.map(item => (item.ok ? item.value : null)).filter((item): item is TransferChange => item !== null);
    const stored = actions.map(item => (item.ok ? item.value : null)).filter((item): item is TransferAction => item !== null);
    if (new Set(changes.map(item => item.revision)).size !== changes.length) return fail('malformed', 'Το ιστορικό έχει διπλή αναθεώρηση.');
    if (new Set(changes.map(item => item.actionId)).size !== changes.length) return fail('malformed', 'Το ιστορικό έχει διπλό action ID.');
    if (new Set(stored.map(item => item.actionId)).size !== stored.length) return fail('malformed', 'Οι ενέργειες έχουν διπλό action ID.');
    if (parsed.value.revision === 0 && (changes.length > 0 || stored.length > 0)) return fail('malformed', 'Κενός χώρος δεν έχει ιστορικό.');
    if (changes.some(item => item.revision > parsed.value.revision)) return fail('malformed', 'Το ιστορικό ξεπερνά την αναθεώρηση του χώρου.');
    return ok({ workspace: parsed.value, history: changes, actions: stored, exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : null });
  }
  const parsed = parseWorkspace(payload);
  if (!parsed.ok) return parsed;
  return ok({ workspace: parsed.value, history: [], actions: [], exportedAt: null });
}

function parseChange(value: unknown, workspace: Workspace, index: number): Result<TransferChange> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('malformed', `Η εγγραφή ιστορικού ${index + 1} δεν είναι αντικείμενο.`);
  const row = value as Record<string, unknown>;
  const action = actionShape(row.action);
  const inverse = row.inverse === null ? null : actionShape(row.inverse);
  if (!action.ok) return fail('malformed', `Η ενέργεια στο ιστορικό ${index + 1} δεν διαβάζεται.`);
  if (inverse && !inverse.ok) return fail('malformed', `Η αντίστροφη ενέργεια στο ιστορικό ${index + 1} δεν διαβάζεται.`);
  if (!isStableId(String(row.workspaceId ?? '')) || row.workspaceId !== workspace.id) return fail('malformed', `Το ιστορικό ${index + 1} δεν ανήκει σε αυτόν τον χώρο.`);
  if (!isStableId(String(row.actionId ?? ''))) return fail('malformed', `Μη έγκυρο action ID στο ιστορικό ${index + 1}.`);
  if (typeof row.actor !== 'string' || row.actor.trim().length === 0 || row.actor.length > 200) return fail('malformed', `Μη έγκυρος χρήστης στο ιστορικό ${index + 1}.`);
  if (typeof row.at !== 'string' || !DATETIME.test(row.at)) return fail('malformed', `Μη έγκυρος χρόνος στο ιστορικό ${index + 1}.`);
  if (!Number.isInteger(row.revision) || Number(row.revision) < 1) return fail('malformed', `Μη έγκυρη αναθεώρηση στο ιστορικό ${index + 1}.`);
  if (row.actionType !== action.value.type) return fail('malformed', `Ο τύπος ενέργειας δεν συμφωνεί στο ιστορικό ${index + 1}.`);
  if (typeof row.summary !== 'string' || !Array.isArray(row.changedIds) || row.changedIds.some(id => typeof id !== 'string')) return fail('malformed', `Ελλιπής σύνοψη στο ιστορικό ${index + 1}.`);
  return ok({
    workspaceId: workspace.id,
    actionId: String(row.actionId),
    actor: row.actor,
    at: row.at,
    revision: Number(row.revision),
    actionType: action.value.type,
    summary: row.summary,
    changedIds: row.changedIds as string[],
    action: action.value,
    inverse: inverse && inverse.ok ? inverse.value : null,
  });
}

function parseStoredAction(value: unknown, workspace: Workspace, index: number): Result<TransferAction> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('malformed', `Η αποθηκευμένη ενέργεια ${index + 1} δεν είναι αντικείμενο.`);
  const row = value as Record<string, unknown>;
  if (typeof row.key !== 'string' || row.key.length === 0) return fail('malformed', `Λείπει το κλειδί της ενέργειας ${index + 1}.`);
  if (!isStableId(String(row.workspaceId ?? '')) || row.workspaceId !== workspace.id) return fail('malformed', `Η ενέργεια ${index + 1} δεν ανήκει σε αυτόν τον χώρο.`);
  if (!isStableId(String(row.actionId ?? ''))) return fail('malformed', `Μη έγκυρο action ID στην ενέργεια ${index + 1}.`);
  if (typeof row.fingerprint !== 'string' || row.fingerprint.length === 0) return fail('malformed', `Λείπει το αποτύπωμα της ενέργειας ${index + 1}.`);
  if (!Number.isInteger(row.revision) || Number(row.revision) < 1) return fail('malformed', `Μη έγκυρη αναθεώρηση στην ενέργεια ${index + 1}.`);
  if (typeof row.actor !== 'string' || row.actor.trim().length === 0) return fail('malformed', `Μη έγκυρος χρήστης στην ενέργεια ${index + 1}.`);
  if (typeof row.at !== 'string' || !DATETIME.test(row.at)) return fail('malformed', `Μη έγκυρος χρόνος στην ενέργεια ${index + 1}.`);
  if (!Array.isArray(row.changedIds) || row.changedIds.some(id => typeof id !== 'string')) return fail('malformed', `Ελλιπείς αλλαγές στην ενέργεια ${index + 1}.`);
  return ok({
    key: row.key,
    workspaceId: workspace.id,
    actionId: String(row.actionId),
    fingerprint: row.fingerprint,
    revision: Number(row.revision),
    changedIds: row.changedIds as string[],
    at: row.at,
    actor: row.actor,
  });
}

function actionShape(value: unknown): Result<{ type: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('malformed', 'Η ενέργεια δεν είναι αντικείμενο.');
  const row = value as Record<string, unknown>;
  if (typeof row.type !== 'string' || !ACTION_TYPES.has(row.type)) return fail('malformed', 'Άγνωστος τύπος ενέργειας.');
  const idOf = (key: string): boolean => {
    const child = row[key];
    return Boolean(child && typeof child === 'object' && !Array.isArray(child) && typeof (child as { id?: unknown }).id === 'string');
  };
  const valid = row.type === 'DefineEntityType' ? idOf('entityType')
    : row.type === 'DefineRelationshipType' ? idOf('relationshipType')
    : row.type === 'DefineProperty' ? idOf('property')
    : row.type === 'CreateEntity' ? idOf('entity')
    : row.type === 'RenameEntity' ? typeof row.entityId === 'string' && typeof row.label === 'string'
    : row.type === 'ArchiveEntity' ? typeof row.entityId === 'string'
    : row.type === 'DeprecateDefinition' ? typeof row.kind === 'string' && typeof row.id === 'string'
    : row.type === 'CreateSource' ? idOf('source')
    : row.type === 'CreateRelationship' ? idOf('relationship')
    : row.type === 'RecordFact' || row.type === 'CorrectFact' ? idOf('fact')
    : row.type === 'SaveView' ? idOf('view')
    : row.type === 'SetBinding' ? typeof row.role === 'string' && typeof row.definitionId === 'string'
    : row.type === 'ClearBinding' ? typeof row.role === 'string'
    : row.type === 'CommitImport' ? Array.isArray(row.facts)
    : row.type === 'CommitRecords' ? Array.isArray(row.entities) && Array.isArray(row.relationships)
    : row.type === 'RevertCreation' ? typeof row.kind === 'string' && typeof row.id === 'string'
    : false;
  return valid ? ok(row as { type: string }) : fail('malformed', 'Η ενέργεια δεν έχει τα υποχρεωτικά πεδία.');
}
