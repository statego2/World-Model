// Portable domain contracts. UI, repository and action engine are implemented in M1+.
export type ID = string;
export type Basis = 'reported' | 'assumption';
export type Confidence = 'high' | 'medium' | 'low';
export type Value = string | number | boolean | null;
export interface EntityType { id: ID; label: string; description: string; deprecated?: boolean }
export interface RelationshipType {
  id: ID; label: string; description: string;
  fromTypeIds: ID[]; toTypeIds: ID[]; directed: true; deprecated?: boolean;
}
export interface PropertyDefinition {
  id: ID; label: string; subjectKind: 'entity' | 'relationship'; subjectTypeId: ID;
  valueType: 'string' | 'number' | 'boolean' | 'date';
  unit?: string; measureKind?: 'stock' | 'flow' | 'ratio' | 'count';
  frequency?: 'annual'; nonnegative?: boolean; deprecated?: boolean;
}
export interface Entity { id: ID; typeId: ID; label: string; archived?: boolean }
export interface EvidenceClaim {
  basis: Basis; evidenceIds: ID[]; validFrom: string; validTo: string | null;
  confidence?: Confidence;
}
export interface Relationship extends EvidenceClaim {
  id: ID; typeId: ID; fromId: ID; toId: ID;
}
export interface Fact extends EvidenceClaim {
  id: ID; subjectKind: 'entity' | 'relationship'; subjectId: ID;
  propertyId: ID; value: Value;
  status: 'observed' | 'estimated' | 'provisional' | 'missing';
  createdAt: string; supersedesId?: ID;
}
export interface Source {
  id: ID; label: string; locator: string; retrievedAt: string;
  licenseNote: string; verificationStatus: 'candidate' | 'verified' | 'blocked'; isDemo: boolean;
}
export interface PathQuery {
  startEntityId: ID;
  steps: { relationshipTypeId: ID; direction: 'out' | 'in' }[];
  year: number; basis: Basis; sourceIds: ID[]; limit: number;
}
export interface SavedView { id: ID; label: string; query: PathQuery }
export interface Workspace {
  formatVersion: 1; id: ID; label: string; dataMode: 'demo' | 'real';
  ontologyVersion: number; revision: number;
  entityTypes: EntityType[]; relationshipTypes: RelationshipType[];
  properties: PropertyDefinition[]; entities: Entity[]; relationships: Relationship[];
  facts: Fact[]; sources: Source[]; savedViews: SavedView[];
  // Explicit semantic roles -> definition IDs. Specialized modules validate required bindings.
  bindings: Record<string, ID>;
  // History envelope is intentionally introduced with export/restore in M2.
}
