import { fail, ok, type Result } from './errors.ts';
import { parseWorkspace } from './parse.ts';
import type { Workspace } from './types.ts';

export interface ExportEnvelope {
  formatVersion: 1;
  kind: 'world-model-export';
  exportedAt: string;
  workspace: Workspace;
  history: unknown[];
  actions: unknown[];
}

export function readTransfer(payload: unknown): Result<{ workspace: Workspace; history: unknown[]; actions: unknown[]; exportedAt: string | null }> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fail('malformed', 'Το αρχείο δεν είναι αντικείμενο.');
  const record = payload as Record<string, unknown>;
  if ('formatVersion' in record && record.formatVersion !== 1) return fail('unsupported_version', 'Άγνωστη formatVersion. Ο χώρος δεν άλλαξε.');
  if (record.kind === 'world-model-export') {
    const parsed = parseWorkspace(record.workspace);
    if (!parsed.ok) return parsed;
    if (!Array.isArray(record.history) || !Array.isArray(record.actions)) return fail('malformed', 'Το αντίγραφο δεν έχει ιστορικό.');
    if (record.history.some(item => !item || typeof item !== 'object')) return fail('malformed', 'Το ιστορικό δεν διαβάζεται.');
    return ok({ workspace: parsed.value, history: record.history, actions: record.actions, exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : null });
  }
  const parsed = parseWorkspace(payload);
  if (!parsed.ok) return parsed;
  return ok({ workspace: parsed.value, history: [], actions: [], exportedAt: null });
}
