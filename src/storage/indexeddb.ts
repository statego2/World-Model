import Dexie, { type Table } from 'dexie';
import type { ActionEnvelope } from '../core/actions.ts';
import { fail, ok } from '../core/errors.ts';
import type { Workspace } from '../core/types.ts';
import { commitEnvelope, createEmptyWorkspace, exportFromStore, loadDemoWorkspace, restoreToStore, storageFailure, summarize, type WorkspaceStore } from './engine.ts';
import type { ChangeRecord, StoredAction } from './records.ts';
import type { WorkspaceRepository } from './repository.ts';

interface ChangeRow extends ChangeRecord {
  seq?: number;
}

class WorldModelDB extends Dexie {
  workspaces!: Table<Workspace, string>;
  actions!: Table<StoredAction, string>;
  changes!: Table<ChangeRow, number>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      workspaces: '&id',
      actions: '&key, workspaceId',
      changes: '++seq, workspaceId, revision',
    });
  }
}

export interface IndexedDbHooks {
  failNextCommit: boolean;
}

export function createIndexedDbRepository(options: { name: string; hooks?: IndexedDbHooks }): WorkspaceRepository & { close(): void } {
  const db = new WorldModelDB(options.name);
  const hooks = options.hooks ?? { failNextCommit: false };
  const transact = <T,>(fn: (store: WorkspaceStore) => Promise<T>): Promise<T> => db.transaction('rw', [db.workspaces, db.actions, db.changes], async () => {
    let dirty = false;
    const store: WorkspaceStore = {
      async getWorkspace(id) {
        return db.workspaces.get(id);
      },
      async putWorkspace(workspace) {
        dirty = true;
        await db.workspaces.put(structuredClone(workspace));
      },
      async getAction(key) {
        return db.actions.get(key);
      },
      async putAction(record) {
        dirty = true;
        await db.actions.put(structuredClone(record));
      },
      async appendChange(record) {
        dirty = true;
        await db.changes.add(structuredClone(record));
      },
      async listWorkspaces() {
        return db.workspaces.toArray();
      },
      async listChanges(workspaceId) {
        return db.changes.where('workspaceId').equals(workspaceId).toArray();
      },
      async listActions(workspaceId) {
        return db.actions.where('workspaceId').equals(workspaceId).toArray();
      },
    };
    const result = await fn(store);
    if (dirty && hooks.failNextCommit) {
      hooks.failNextCommit = false;
      throw Object.assign(new Error('injected-storage-failure'), { name: 'InjectedStorageFailure' });
    }
    return result;
  });

  return {
    async list() {
      return summarize(await transact(store => store.listWorkspaces()));
    },
    async load(id) {
      const workspace = await transact(store => store.getWorkspace(id));
      return workspace ? ok(workspace) : fail('not_found', 'Ο χώρος δεν υπάρχει.');
    },
    async history(id) {
      const changes = await transact(store => store.listChanges(id));
      return changes.sort((left, right) => left.revision - right.revision);
    },
    createEmpty(input) {
      return guard(() => transact(store => createEmptyWorkspace(store, input)));
    },
    loadDemo(payload) {
      return guard(() => transact(store => loadDemoWorkspace(store, payload)));
    },
    commit(envelope: ActionEnvelope) {
      return guard(() => transact(store => commitEnvelope(store, envelope)));
    },
    exportSnapshot(id, exportedAt = new Date().toISOString()) {
      return guard(() => transact(store => exportFromStore(store, id, exportedAt)));
    },
    restore(payload, input) {
      return guard(() => transact(store => restoreToStore(store, payload, input)));
    },
    close() {
      db.close();
    },
  };
}

async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    return storageFailure(error) as T;
  }
}
