import type { Workspace } from './types.ts';

export function emptyWorkspace(input: { id: string; label: string; dataMode: 'demo' | 'real' }): Workspace {
  return {
    formatVersion: 1,
    id: input.id,
    label: input.label,
    dataMode: input.dataMode,
    ontologyVersion: 1,
    revision: 0,
    entityTypes: [],
    relationshipTypes: [],
    properties: [],
    entities: [],
    relationships: [],
    facts: [],
    sources: [],
    savedViews: [],
    bindings: {},
  };
}
