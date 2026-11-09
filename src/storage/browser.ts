import { createIndexedDbRepository } from './indexeddb.ts';

export const repository = createIndexedDbRepository({ name: 'world-model' });
