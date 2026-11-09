import type { ActionEnvelope } from '../core/actions.ts';
import type { Result } from '../core/errors.ts';
import type { ExportEnvelope } from '../core/transfer.ts';
import type { Workspace } from '../core/types.ts';
import type { ChangeRecord } from './records.ts';

export interface WorkspaceSummary {
  id: string;
  label: string;
  dataMode: 'demo' | 'real';
  revision: number;
  ontologyVersion: number;
}

export interface CommitSuccess {
  workspace: Workspace;
  revision: number;
  changedIds: string[];
  replayed: boolean;
  /** Revision produced by the original action. Equal to `revision` unless a later action already advanced the workspace. */
  actionRevision: number;
}

export interface WorkspaceRepository {
  list(): Promise<WorkspaceSummary[]>;
  load(id: string): Promise<Result<Workspace>>;
  history(id: string): Promise<ChangeRecord[]>;
  createEmpty(input: { id: string; label: string; dataMode: 'demo' | 'real' }): Promise<Result<Workspace>>;
  loadDemo(payload: unknown): Promise<Result<Workspace>>;
  commit(envelope: ActionEnvelope): Promise<Result<CommitSuccess>>;
  exportSnapshot(id: string, exportedAt?: string): Promise<Result<ExportEnvelope>>;
  restore(payload: unknown, input: { id: string; label: string }): Promise<Result<Workspace>>;
}
