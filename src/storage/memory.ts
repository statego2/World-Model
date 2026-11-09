import { fail, ok } from '../core/errors.ts';
import type { Workspace } from '../core/types.ts';
import { commitEnvelope, createEmptyWorkspace, exportFromStore, loadDemoWorkspace, restoreToStore, storageFailure, summarize, type WorkspaceStore } from './engine.ts';
import type { ChangeRecord, StoredAction } from './records.ts';
import type { WorkspaceRepository } from './repository.ts';

interface MemoryState {
  workspaces: Map<string, Workspace>;
  actions: Map<string, StoredAction>;
  changes: ChangeRecord[];
}

export interface MemoryHooks {
  failNextCommit: boolean;
}

export interface MemoryBackend {
  hooks: MemoryHooks;
  close(): void;
  openRepository(): WorkspaceRepository;
}

export function createMemoryBackend(): MemoryBackend {
  const state: MemoryState = { workspaces: new Map(), actions: new Map(), changes: [] };
  const hooks: MemoryHooks = { failNextCommit: false };
  let tail = Promise.resolve();
  const transact = <T,>(fn: (store: WorkspaceStore) => Promise<T>): Promise<T> => {
    const run = tail.then(async () => {
      const draft: MemoryState = {
        workspaces: new Map([...state.workspaces].map(([id, workspace]) => [id, structuredClone(workspace)])),
        actions: new Map([...state.actions].map(([key, action]) => [key, structuredClone(action)])),
        changes: structuredClone(state.changes),
      };
      let dirty = false;
      const store: WorkspaceStore = {
        async getWorkspace(id) {
          const found = draft.workspaces.get(id);
          return found ? structuredClone(found) : undefined;
        },
        async putWorkspace(workspace) {
          dirty = true;
          draft.workspaces.set(workspace.id, structuredClone(workspace));
        },
        async getAction(key) {
          const found = draft.actions.get(key);
          return found ? structuredClone(found) : undefined;
        },
        async putAction(record) {
          dirty = true;
          draft.actions.set(record.key, structuredClone(record));
        },
        async appendChange(record) {
          dirty = true;
          draft.changes.push(structuredClone(record));
        },
        async listWorkspaces() {
          return [...draft.workspaces.values()].map(workspace => structuredClone(workspace));
        },
        async listChanges(workspaceId) {
          return draft.changes.filter(change => change.workspaceId === workspaceId).map(change => structuredClone(change));
        },
        async listActions(workspaceId) {
          return [...draft.actions.values()].filter(action => action.workspaceId === workspaceId).map(action => structuredClone(action));
        },
      };
      const result = await fn(store);
      if (dirty && hooks.failNextCommit) {
        hooks.failNextCommit = false;
        throw Object.assign(new Error('injected-storage-failure'), { name: 'InjectedStorageFailure' });
      }
      if (dirty) {
        state.workspaces = draft.workspaces;
        state.actions = draft.actions;
        state.changes = draft.changes;
      }
      return result;
    });
    tail = run.then(() => undefined, () => undefined);
    return run;
  };
  const backend: MemoryBackend = {
    hooks,
    close() {},
    openRepository: () => repositoryFrom(transact),
  };
  return backend;
}

export function createMemoryRepository(): WorkspaceRepository {
  return createMemoryBackend().openRepository();
}

function repositoryFrom(transact: <T>(fn: (store: WorkspaceStore) => Promise<T>) => Promise<T>): WorkspaceRepository {
  return {
    async list() {
      const workspaces = await transact(store => store.listWorkspaces());
      return summarize(workspaces);
    },
    async load(id) {
      const workspace = await transact(store => store.getWorkspace(id));
      return workspace ? ok(workspace) : fail('not_found', 'Ο χώρος δεν υπάρχει.');
    },
    async history(id) {
      const changes = await transact(store => store.listChanges(id));
      return changes.sort((a, b) => a.revision - b.revision);
    },
    createEmpty(input) {
      return guard(() => transact(store => createEmptyWorkspace(store, input)));
    },
    loadDemo(payload) {
      return guard(() => transact(store => loadDemoWorkspace(store, payload)));
    },
    commit(envelope) {
      return guard(() => transact(store => commitEnvelope(store, envelope)));
    },
    exportSnapshot(id, exportedAt = new Date().toISOString()) {
      return guard(() => transact(store => exportFromStore(store, id, exportedAt)));
    },
    restore(payload, input) {
      return guard(() => transact(store => restoreToStore(store, payload, input)));
    },
  };
}

async function guard<T>(run: () => Promise<ResultLike<T>>): Promise<ResultLike<T>> {
  try {
    return await run();
  } catch (error) {
    return storageFailure(error);
  }
}

type ResultLike<T> = Awaited<ReturnType<typeof ok<T>> | ReturnType<typeof fail>>;
