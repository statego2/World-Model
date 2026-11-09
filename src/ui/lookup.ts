import type { Workspace } from '../core/types.ts';

export function entityLabel(workspace: Workspace, id: string): string {
  return workspace.entities.find(entity => entity.id === id)?.label ?? id;
}

export function typeName(workspace: Workspace, id: string): string {
  return workspace.entityTypes.find(type => type.id === id)?.label
    ?? workspace.relationshipTypes.find(type => type.id === id)?.label
    ?? workspace.properties.find(property => property.id === id)?.label
    ?? id;
}
