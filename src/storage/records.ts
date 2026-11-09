import type { DomainAction } from '../core/actions.ts';

export interface StoredAction {
  key: string;
  workspaceId: string;
  actionId: string;
  fingerprint: string;
  revision: number;
  changedIds: string[];
  at: string;
  actor: string;
}

export interface ChangeRecord {
  workspaceId: string;
  actionId: string;
  actor: string;
  at: string;
  revision: number;
  actionType: string;
  summary: string;
  changedIds: string[];
  action: DomainAction;
  inverse: DomainAction | null;
}

export function actionKey(workspaceId: string, actionId: string): string {
  return `${workspaceId}\u0000${actionId}`;
}
