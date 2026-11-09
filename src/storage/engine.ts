import { fingerprintAction, parseEnvelope, applyAction, type ActionEnvelope } from '../core/actions.ts';
import { fail, ok, type Result } from '../core/errors.ts';
import { isStableId } from '../core/ids.ts';
import { parseWorkspace } from '../core/parse.ts';
import { readTransfer, type ExportEnvelope } from '../core/transfer.ts';
import type { Workspace } from '../core/types.ts';
import { inverseOf } from '../core/undo.ts';
import { emptyWorkspace } from '../core/workspace.ts';
import { actionKey, type ChangeRecord, type StoredAction } from './records.ts';
import type { CommitSuccess, WorkspaceSummary } from './repository.ts';

export interface WorkspaceStore {
  getWorkspace(id: string): Promise<Workspace | undefined>;
  putWorkspace(workspace: Workspace): Promise<void>;
  getAction(key: string): Promise<StoredAction | undefined>;
  putAction(record: StoredAction): Promise<void>;
  appendChange(record: ChangeRecord): Promise<void>;
  listWorkspaces(): Promise<Workspace[]>;
  listChanges(workspaceId: string): Promise<ChangeRecord[]>;
  listActions(workspaceId: string): Promise<StoredAction[]>;
}

export async function commitEnvelope(store: WorkspaceStore, envelope: ActionEnvelope): Promise<Result<CommitSuccess>> {
  const parsed = parseEnvelope(envelope);
  if (!parsed.ok) return parsed;
  const current = await store.getWorkspace(envelope.workspaceId);
  if (!current) return fail('not_found', 'Ο χώρος δεν υπάρχει.');
  const key = actionKey(envelope.workspaceId, envelope.actionId);
  const prior = await store.getAction(key);
  const fingerprint = fingerprintAction(envelope.action);
  if (prior) {
    if (prior.fingerprint !== fingerprint) {
      return fail('idempotency_mismatch', 'Το ίδιο action ID χρησιμοποιήθηκε για διαφορετική ενέργεια.');
    }
    const latest = await store.getWorkspace(envelope.workspaceId);
    return ok({
      workspace: latest ?? current,
      revision: (latest ?? current).revision,
      changedIds: prior.changedIds,
      replayed: true,
      actionRevision: prior.revision,
    });
  }
  if (current.revision !== envelope.expectedRevision) {
    return fail('conflict', 'Ο χώρος άλλαξε από άλλη καρτέλα. Οι αλλαγές δεν αποθηκεύτηκαν. Φόρτωσε ξανά την τρέχουσα αναθεώρηση.');
  }
  const applied = applyAction(current, envelope.action);
  if (!applied.ok) return applied;
  const next = applied.value.workspace;
  await store.putWorkspace(next);
  await store.putAction({
    key,
    workspaceId: envelope.workspaceId,
    actionId: envelope.actionId,
    fingerprint,
    revision: next.revision,
    changedIds: applied.value.changedIds,
    at: envelope.at,
    actor: envelope.actor,
  });
  await store.appendChange({
    workspaceId: envelope.workspaceId,
    actionId: envelope.actionId,
    actor: envelope.actor,
    at: envelope.at,
    revision: next.revision,
    actionType: envelope.action.type,
    summary: applied.value.summary,
    changedIds: applied.value.changedIds,
    action: structuredClone(envelope.action),
    inverse: inverseOf(current, envelope.action),
  });
  return ok({
    workspace: next,
    revision: next.revision,
    changedIds: applied.value.changedIds,
    replayed: false,
    actionRevision: next.revision,
  });
}

export async function createEmptyWorkspace(store: WorkspaceStore, input: { id: string; label: string; dataMode: 'demo' | 'real' }): Promise<Result<Workspace>> {
  const parsed = parseWorkspace(emptyWorkspace(input));
  if (!parsed.ok) return parsed;
  const existing = await store.getWorkspace(parsed.value.id);
  if (existing) return fail('conflict', 'Υπάρχει ήδη χώρος με αυτό το ID.');
  await store.putWorkspace(parsed.value);
  return ok(parsed.value);
}

export async function loadDemoWorkspace(store: WorkspaceStore, payload: unknown): Promise<Result<Workspace>> {
  const parsed = parseWorkspace(payload);
  if (!parsed.ok) return parsed;
  if (parsed.value.dataMode !== 'demo') return fail('validation', 'Η φόρτωση demo δέχεται μόνο συνθετικό χώρο.');
  const existing = await store.getWorkspace(parsed.value.id);
  if (existing) return ok(existing);
  await store.putWorkspace(parsed.value);
  return ok(parsed.value);
}

export async function exportFromStore(store: WorkspaceStore, id: string, exportedAt: string): Promise<Result<ExportEnvelope>> {
  const workspace = await store.getWorkspace(id);
  if (!workspace) return fail('not_found', 'Ο χώρος δεν υπάρχει.');
  const [history, actions] = await Promise.all([store.listChanges(id), store.listActions(id)]);
  return ok({
    formatVersion: 1,
    kind: 'world-model-export',
    exportedAt,
    workspace,
    history: history.map(change => portableRecord(change)),
    actions: actions.map(action => portableRecord(action)),
  });
}

export async function restoreToStore(store: WorkspaceStore, payload: unknown, input: { id: string; label: string }): Promise<Result<Workspace>> {
  const read = readTransfer(payload);
  if (!read.ok) return read;
  if (!isStableId(input.id)) return fail('malformed', 'Μη έγκυρο ID νέου χώρου.');
  if (await store.getWorkspace(input.id)) return fail('conflict', 'Υπάρχει ήδη χώρος με αυτό το ID.');
  const relabeled = parseWorkspace({ ...read.value.workspace, id: input.id, label: input.label.trim() || read.value.workspace.label });
  if (!relabeled.ok) return relabeled;
  await store.putWorkspace(relabeled.value);
  for (const action of read.value.actions) {
    await store.putAction({ ...portableRecord(action), workspaceId: input.id, key: actionKey(input.id, action.actionId) });
  }
  for (const change of read.value.history) {
    await store.appendChange({ ...portableRecord(change as ChangeRecord), workspaceId: input.id });
  }
  return ok(relabeled.value);
}

export function summarize(workspaces: Workspace[]): WorkspaceSummary[] {
  return workspaces
    .map(workspace => ({
      id: workspace.id,
      label: workspace.label,
      dataMode: workspace.dataMode,
      revision: workspace.revision,
      ontologyVersion: workspace.ontologyVersion,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'el'));
}

function portableRecord<T extends object>(record: T): T {
  const copy = { ...record } as T & { seq?: number };
  delete copy.seq;
  return copy;
}

export function storageFailure(error: unknown): Result<never> {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  if (name === 'QuotaExceededError') {
    return fail('storage_full', 'Ο χώρος αποθήκευσης του browser γέμισε. Τίποτα δεν άλλαξε.');
  }
  return fail('storage_failure', 'Η συναλλαγή απέτυχε. Η προηγούμενη αναθεώρηση έμεινε ως είχε.');
}
