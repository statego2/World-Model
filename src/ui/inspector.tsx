import { useState } from 'react';
import type { Fact, Workspace } from '../core/types.ts';
import { useAtlas } from './atlas-context.tsx';
import { formatMeasure } from './format.ts';
import { entityLabel, typeName } from './lookup.ts';
import { useModel, type Selection } from './model.tsx';
import { MapSidePanel } from './modules.tsx';

export function Inspector() {
  const model = useModel();
  const atlas = useAtlas();
  const workspace = model.workspace;
  if (!workspace) return null;
  const selected = resolve(workspace, model.selection);
  const mapIdle = model.section === 'modules' && !atlas.focus && !atlas.dossierOpen && !atlas.filtersOpen;
  return (
    <aside className={mapIdle ? 'inspector idle' : 'inspector'} aria-label="Λεπτομέρειες">
      {model.section === 'modules' ? <MapSidePanel /> : (
        <>
          <p className="eyebrow">Επιθεώρηση</p>
          {!selected ? <p>Επίλεξε μια γραμμή για να δεις ταυτότητα, σχέσεις και τεκμήρια.</p> : <Detail workspace={workspace} selection={selected} />}
        </>
      )}
      <details className="history">
        <summary>Ιστορικό ({model.history.length})</summary>
        {model.history.length === 0 ? <p className="muted">Καμία αποθηκευμένη ενέργεια.</p> : (
          <ol>
            {[...model.history].reverse().map(change => (
              <li key={change.actionId}>
                <span>Αναθ. {change.revision}</span> {change.summary}
                {change.inverse && change.revision === model.history.at(-1)?.revision ? (
                  <button className="quiet" type="button" disabled={model.busy} onClick={() => void model.commit(change.inverse!)}>Αναίρεση</button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </details>
    </aside>
  );
}

function Detail({ workspace, selection }: { workspace: Workspace; selection: Selection }) {
  if (selection.kind === 'entity') return <EntityDetail key={selection.id} workspace={workspace} id={selection.id} />;
  if (selection.kind === 'relationship') return <RelationshipDetail workspace={workspace} id={selection.id} />;
  if (selection.kind === 'source') {
    const source = workspace.sources.find(item => item.id === selection.id);
    if (!source) return <p>Η πηγή δεν υπάρχει.</p>;
    return (
      <>
        <h2>{source.label}</h2>
        <dl>
          <dt>Εντοπιστής</dt><dd>{source.locator}</dd>
          <dt>Άδεια</dt><dd>{source.licenseNote}</dd>
          <dt>Κατάσταση</dt><dd>{source.verificationStatus}</dd>
          <dt>Λήψη</dt><dd>{source.retrievedAt}</dd>
        </dl>
      </>
    );
  }
  const label = typeName(workspace, selection.id);
  return (
    <>
      <h2>{label}</h2>
      <p className="mono">{selection.id}</p>
      {selection.kind === 'property' ? <Deprecate kind="property" id={selection.id} /> : null}
      {selection.kind === 'entityType' ? <Deprecate kind="entityType" id={selection.id} /> : null}
      {selection.kind === 'relationshipType' ? <Deprecate kind="relationshipType" id={selection.id} /> : null}
    </>
  );
}

function EntityDetail({ workspace, id }: { workspace: Workspace; id: string }) {
  const model = useModel();
  const entity = workspace.entities.find(item => item.id === id);
  const [label, setLabel] = useState(entity?.label ?? '');
  if (!entity) return <p>Η οντότητα δεν υπάρχει.</p>;
  const facts = workspace.facts.filter(fact => fact.subjectKind === 'entity' && fact.subjectId === entity.id);
  const edges = workspace.relationships.filter(relationship => relationship.fromId === entity.id || relationship.toId === entity.id);
  return (
    <>
      <h2>{entity.label}</h2>
      <p className="mono">{entity.id}</p>
      <p>{typeName(workspace, entity.typeId)}{entity.archived ? ' · αρχειοθετημένη' : ''}</p>
      <form className="rename" onSubmit={event => { event.preventDefault(); void model.commit({ type: 'RenameEntity', entityId: entity.id, label }); }}>
        <label className="field"><span>Νέο όνομα</span><input value={label} onChange={event => setLabel(event.target.value)} /></label>
        <button className="quiet" type="submit" disabled={model.busy}>Μετονομασία</button>
      </form>
      {!entity.archived ? <button className="quiet danger" type="button" disabled={model.busy} onClick={() => void model.commit({ type: 'ArchiveEntity', entityId: entity.id })}>Αρχειοθέτηση</button> : null}
      <h3>Γεγονότα</h3>
      {facts.length === 0 ? <p className="muted">Κανένα γεγονός.</p> : (
        <ul className="plain-list">
          {facts.map(fact => <FactCorrection key={fact.id} workspace={workspace} factId={fact.id} />)}
        </ul>
      )}
      <h3>Σχέσεις</h3>
      {edges.length === 0 ? <p className="muted">Καμία σύνδεση.</p> : (
        <ul className="plain-list">
          {edges.map(edge => <li key={edge.id}>{entityLabel(workspace, edge.fromId)} → {entityLabel(workspace, edge.toId)}</li>)}
        </ul>
      )}
    </>
  );
}

function RelationshipDetail({ workspace, id }: { workspace: Workspace; id: string }) {
  const relationship = workspace.relationships.find(item => item.id === id);
  if (!relationship) return <p>Η σύνδεση δεν υπάρχει.</p>;
  const sources = relationship.evidenceIds.map(evidenceId => workspace.sources.find(source => source.id === evidenceId)?.label ?? evidenceId);
  return (
    <>
      <h2>{typeName(workspace, relationship.typeId)}</h2>
      <p>{entityLabel(workspace, relationship.fromId)} → {entityLabel(workspace, relationship.toId)}</p>
      <dl>
        <dt>Ισχύς</dt><dd>{relationship.validFrom} → {relationship.validTo ?? 'ανοιχτό'}</dd>
        <dt>Βάση</dt><dd>{relationship.basis === 'assumption' ? 'Υπόθεση' : 'Τεκμηριωμένο'}</dd>
        <dt>Πηγές</dt><dd>{sources.join(', ')}</dd>
      </dl>
    </>
  );
}

function FactCorrection({ workspace, factId }: { workspace: Workspace; factId: string }) {
  const model = useModel();
  const fact = workspace.facts.find(item => item.id === factId);
  const [value, setValue] = useState('');
  if (!fact) return null;
  const property = workspace.properties.find(item => item.id === fact.propertyId);
  const superseded = workspace.facts.some(item => item.supersedesId === fact.id);
  return (
    <li>
      <div>{property?.label ?? fact.propertyId}: {fact.value === null ? 'ελλιπές' : typeof fact.value === 'number' ? formatMeasure(fact.value, property?.unit) : String(fact.value)}</div>
      {superseded ? <small>Υπάρχει νεότερη διόρθωση.</small> : (
        <form onSubmit={event => {
          event.preventDefault();
          const next = correctedValue(fact, property?.valueType, value);
          if (next === undefined) return;
          const suffix = fact.id.replaceAll(':', '.').slice(0, 60);
          void model.commit({
            type: 'CorrectFact',
            fact: { ...structuredClone(fact), id: `fact:fix-${workspace.revision}-${suffix}`, value: next, supersedesId: fact.id, createdAt: new Date().toISOString() },
          });
        }}>
          <label className="field"><span>Νέα τιμή</span><input value={value} onChange={event => setValue(event.target.value)} /></label>
          <button className="quiet" type="submit" disabled={model.busy}>Διόρθωση</button>
        </form>
      )}
    </li>
  );
}

function correctedValue(fact: Fact, valueType: string | undefined, value: string): Fact['value'] | undefined {
  if (fact.status === 'missing') return null;
  if (valueType === 'number') {
    if (value.trim() === '') return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (valueType === 'boolean') return value === 'true' ? true : value === 'false' ? false : undefined;
  if (value.trim() === '') return undefined;
  return value;
}

function Deprecate({ kind, id }: { kind: 'entityType' | 'relationshipType' | 'property'; id: string }) {
  const model = useModel();
  return <button className="quiet danger" type="button" disabled={model.busy} onClick={() => void model.commit({ type: 'DeprecateDefinition', kind, id })}>Απόσυρση ορισμού</button>;
}

function resolve(workspace: Workspace, selection: Selection | null): Selection | null {
  if (!selection) return null;
  const exists = selection.kind === 'entity' ? workspace.entities.some(item => item.id === selection.id)
    : selection.kind === 'relationship' ? workspace.relationships.some(item => item.id === selection.id)
      : selection.kind === 'source' ? workspace.sources.some(item => item.id === selection.id)
        : selection.kind === 'entityType' ? workspace.entityTypes.some(item => item.id === selection.id)
          : selection.kind === 'relationshipType' ? workspace.relationshipTypes.some(item => item.id === selection.id)
            : workspace.properties.some(item => item.id === selection.id);
  return exists ? selection : null;
}
