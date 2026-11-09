import { useMemo, useState, type KeyboardEvent } from 'react';
import type { PropertyDefinition, Workspace } from '../core/types.ts';
import { Field, SelectInput, Submit, TextInput } from './components.tsx';
import { BASIS_OPTIONS, SOURCE_STATUS, STATUS_OPTIONS } from './copy.ts';
import { entityLabel } from './lookup.ts';
import { useModel } from './model.tsx';

export function Entities() {
  const model = useModel();
  const workspace = model.workspace;
  const [query, setQuery] = useState('');
  const [typeId, setTypeId] = useState('');
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  if (!workspace) return null;
  const types = workspace.entityTypes.filter(type => !type.deprecated);
  const rows = workspace.entities.filter(entity => {
    const haystack = `${entity.label} ${entity.id}`.toLocaleLowerCase('el');
    return haystack.includes(query.trim().toLocaleLowerCase('el'));
  });
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Οντότητες</h1>
        <p>Κάθε γραμμή είναι σταθερή ταυτότητα. Το όνομα αλλάζει, το ID όχι.</p>
      </header>
      <form className="panel form-grid" onSubmit={event => {
        event.preventDefault();
        void model.commit({ type: 'CreateEntity', entity: { id, typeId, label } }).then(saved => {
          if (saved) { setId(''); setLabel(''); model.setSelection({ kind: 'entity', id }); }
        });
      }}>
        <Field label="Τύπος οντότητας">
          <SelectInput value={typeId} onChange={setTypeId}>
            <option value="">Επίλεξε τύπο</option>
            {types.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
          </SelectInput>
        </Field>
        <Field label="ID οντότητας" hint="π.χ. supplier:alpha"><TextInput value={id} onChange={setId} /></Field>
        <Field label="Όνομα οντότητας"><TextInput value={label} onChange={setLabel} /></Field>
        <Submit busy={model.busy}>Προσθήκη οντότητας</Submit>
      </form>
      <section className="panel">
        <Field label="Αναζήτηση"><TextInput value={query} onChange={setQuery} placeholder="Όνομα ή ID" /></Field>
        {rows.length === 0 ? <p className="muted">Καμία οντότητα ακόμη.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Όνομα</th><th>Τύπος</th><th>ID</th></tr></thead>
            <tbody>
              {rows.map(entity => (
                <tr key={entity.id} tabIndex={0} aria-selected={model.selection?.id === entity.id} onClick={() => model.setSelection({ kind: 'entity', id: entity.id })} onKeyDown={event => activate(event, () => model.setSelection({ kind: 'entity', id: entity.id }))}>
                  <td>{entity.label}{entity.archived ? ' · αρχείο' : ''}</td>
                  <td>{workspace.entityTypes.find(type => type.id === entity.typeId)?.label ?? entity.typeId}</td>
                  <td className="mono">{entity.id}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}

export function Relationships() {
  const model = useModel();
  const workspace = model.workspace;
  const [typeId, setTypeId] = useState('');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [basis, setBasis] = useState<'reported' | 'assumption'>('reported');
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [validFrom, setValidFrom] = useState('2024-01-01');
  const [validTo, setValidTo] = useState('');
  const [id, setId] = useState('edge:');
  if (!workspace) return null;
  const types = workspace.relationshipTypes.filter(type => !type.deprecated);
  const active = workspace.entities.filter(entity => !entity.archived);
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Σχέσεις</h1>
        <p>Η σύνδεση αποθηκεύεται μόνο με άκρα, χρόνο και πηγή. Μια γραμμή στο χαρτί δεν αρκεί.</p>
      </header>
      <form className="panel" onSubmit={event => {
        event.preventDefault();
        const submittedId = id;
        void model.commit({
          type: 'CreateRelationship',
          relationship: { id, typeId, fromId, toId, basis, evidenceIds, validFrom, validTo: validTo || null },
        }).then(saved => {
          if (!saved) return;
          setId(current => current === submittedId ? 'edge:' : current);
          model.setSelection({ kind: 'relationship', id: submittedId });
        });
      }}>
        <div className="form-grid">
          <Field label="ID σύνδεσης"><TextInput value={id} onChange={setId} /></Field>
          <Field label="Τύπος σχέσης">
            <SelectInput value={typeId} onChange={setTypeId}>
              <option value="">Επίλεξε σχέση</option>
              {types.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Από οντότητα">
            <SelectInput value={fromId} onChange={setFromId}>
              <option value="">Επίλεξε</option>
              {active.map(entity => <option key={entity.id} value={entity.id}>{entity.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Προς οντότητα">
            <SelectInput value={toId} onChange={setToId}>
              <option value="">Επίλεξε</option>
              {active.map(entity => <option key={entity.id} value={entity.id}>{entity.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Βάση">
            <SelectInput value={basis} onChange={value => setBasis(value as 'reported' | 'assumption')}>
              {BASIS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Ισχύς από"><input type="date" value={validFrom} onChange={event => setValidFrom(event.target.value)} /></Field>
          <Field label="Ισχύς έως" hint="Κενό σημαίνει ανοιχτό τέλος."><input type="date" value={validTo} onChange={event => setValidTo(event.target.value)} /></Field>
        </div>
        <EvidenceBox workspace={workspace} selected={evidenceIds} onChange={setEvidenceIds} />
        <p className="hint">{endpointHint(workspace, typeId)}</p>
        <Submit busy={model.busy}>Προσθήκη σύνδεσης</Submit>
      </form>
      <section className="panel">
        {workspace.relationships.length === 0 ? <p className="muted">Καμία σύνδεση ακόμη.</p> : (
          <table>
            <thead><tr><th>Σχέση</th><th>Από</th><th>Προς</th></tr></thead>
            <tbody>
              {workspace.relationships.map(relationship => (
                <tr key={relationship.id} tabIndex={0} aria-selected={model.selection?.id === relationship.id} onClick={() => model.setSelection({ kind: 'relationship', id: relationship.id })} onKeyDown={event => activate(event, () => model.setSelection({ kind: 'relationship', id: relationship.id }))}>
                  <td>{workspace.relationshipTypes.find(type => type.id === relationship.typeId)?.label ?? relationship.typeId}</td>
                  <td>{entityLabel(workspace, relationship.fromId)}</td>
                  <td>{entityLabel(workspace, relationship.toId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export function Facts() {
  const model = useModel();
  const workspace = model.workspace;
  const [subject, setSubject] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'observed' | 'estimated' | 'provisional' | 'missing'>('observed');
  const [basis, setBasis] = useState<'reported' | 'assumption'>('reported');
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [validFrom, setValidFrom] = useState('2024-01-01');
  const [validTo, setValidTo] = useState('');
  const [year, setYear] = useState('2024');
  const [id, setId] = useState('fact:');
  const [problem, setProblem] = useState('');
  const options = useMemo(() => workspace ? subjectOptions(workspace) : [], [workspace]);
  if (!workspace) return null;
  const selected = options.find(option => option.key === subject);
  const properties = workspace.properties.filter(property => selected && !property.deprecated && property.subjectKind === selected.kind && property.subjectTypeId === selected.typeId);
  const property = properties.find(item => item.id === propertyId);
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Γεγονότα</h1>
        <p>Η μονάδα έρχεται από τον ορισμό. Το κενό δεν γίνεται μηδέν.</p>
      </header>
      <form className="panel" onSubmit={event => {
        event.preventDefault();
        if (!selected) return;
        const annual = property?.frequency === 'annual';
        const period = annual
          ? { validFrom: `${year}-01-01`, validTo: `${year}-12-31` }
          : { validFrom, validTo: validTo || null };
        const parsed = status === 'missing' ? null : readValue(property, value);
        if (parsed === undefined) {
          setProblem('Συμπλήρωσε υποκείμενο, ιδιότητα και τιμή πριν την καταγραφή.');
          return;
        }
        setProblem('');
        void model.commit({
          type: 'RecordFact',
          fact: {
            id, subjectKind: selected.kind, subjectId: selected.id, propertyId, value: parsed, status, basis, evidenceIds,
            ...period, createdAt: new Date().toISOString(),
          },
        }).then(saved => { if (saved) setId('fact:'); });
      }}>
        <div className="form-grid">
          <Field label="ID γεγονότος"><TextInput value={id} onChange={setId} /></Field>
          <Field label="Υποκείμενο">
            <SelectInput value={subject} onChange={next => { setSubject(next); setPropertyId(''); }}>
              <option value="">Επίλεξε</option>
              {options.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Ιδιότητα">
            <SelectInput value={propertyId} onChange={setPropertyId}>
              <option value="">Επίλεξε</option>
              {properties.map(item => <option key={item.id} value={item.id}>{item.label}{item.unit ? ` (${item.unit})` : ''}</option>)}
            </SelectInput>
          </Field>
          <Field label="Κατάσταση">
            <SelectInput value={status} onChange={next => setStatus(next as typeof status)}>
              {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Βάση">
            <SelectInput value={basis} onChange={next => setBasis(next as typeof basis)}>
              {BASIS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </Field>
          {status !== 'missing' ? <ValueField property={property} value={value} onChange={setValue} /> : <p className="hint">Η τιμή μένει κενή.</p>}
          {property?.frequency === 'annual' ? (
            <Field label="Έτος"><input type="number" min={1900} max={2100} value={year} onChange={event => setYear(event.target.value)} /></Field>
          ) : (
            <>
              <Field label="Ισχύς από"><input type="date" value={validFrom} onChange={event => setValidFrom(event.target.value)} /></Field>
              <Field label="Ισχύς έως" hint="Κενό σημαίνει ανοιχτό τέλος."><input type="date" value={validTo} onChange={event => setValidTo(event.target.value)} /></Field>
            </>
          )}
        </div>
        <EvidenceBox workspace={workspace} selected={evidenceIds} onChange={setEvidenceIds} />
        {problem ? <p className="banner bad" role="alert">{problem}</p> : null}
        <Submit busy={model.busy}>Καταγραφή γεγονότος</Submit>
      </form>
      <section className="panel">
        {workspace.facts.length === 0 ? <p className="muted">Κανένα γεγονός ακόμη.</p> : (
          <table>
            <thead><tr><th>Υποκείμενο</th><th>Ιδιότητα</th><th>Τιμή</th><th>Περίοδος</th></tr></thead>
            <tbody>
              {workspace.facts.map(fact => {
                const definition = workspace.properties.find(item => item.id === fact.propertyId);
                return (
                  <tr key={fact.id}>
                    <td>{fact.subjectKind === 'entity' ? entityLabel(workspace, fact.subjectId) : fact.subjectId}</td>
                    <td>{definition?.label ?? fact.propertyId}</td>
                    <td>{fact.value === null ? 'ελλιπές' : String(fact.value)}{definition?.unit ? ` ${definition.unit}` : ''}</td>
                    <td>{fact.validFrom} → {fact.validTo ?? '…'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export function Sources() {
  const model = useModel();
  const workspace = model.workspace;
  const [id, setId] = useState('source:');
  const [label, setLabel] = useState('');
  const [locator, setLocator] = useState('');
  const [licenseNote, setLicenseNote] = useState('');
  const [retrievedAt, setRetrievedAt] = useState('2026-11-09');
  const [verificationStatus, setVerificationStatus] = useState<'candidate' | 'verified' | 'blocked'>('candidate');
  if (!workspace) return null;
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Πηγές</h1>
        <p>{workspace.dataMode === 'demo' ? 'Σε χώρο demo κάθε πηγή μένει συνθετική.' : 'Σε πραγματικό χώρο μια πηγή δεν μπορεί να δηλωθεί ως demo.'}</p>
      </header>
      <form className="panel form-grid" onSubmit={event => {
        event.preventDefault();
        void model.commit({
          type: 'CreateSource',
          source: {
            id, label, locator, licenseNote, retrievedAt: `${retrievedAt}T00:00:00Z`,
            verificationStatus, isDemo: workspace.dataMode === 'demo',
          },
        }).then(saved => { if (saved) { setId('source:'); setLabel(''); setLocator(''); setLicenseNote(''); model.setSelection({ kind: 'source', id }); } });
      }}>
        <Field label="ID πηγής"><TextInput value={id} onChange={setId} placeholder="source:note" /></Field>
        <Field label="Όνομα πηγής"><TextInput value={label} onChange={setLabel} /></Field>
        <Field label="Εντοπιστής" hint="URL ή τοπική παραπομπή."><TextInput value={locator} onChange={setLocator} /></Field>
        <Field label="Άδεια ή σημείωση"><TextInput value={licenseNote} onChange={setLicenseNote} /></Field>
        <Field label="Ημερομηνία ανάκτησης"><input type="date" value={retrievedAt} onChange={event => setRetrievedAt(event.target.value)} /></Field>
        <Field label="Κατάσταση ελέγχου">
          <SelectInput value={verificationStatus} onChange={value => setVerificationStatus(value as typeof verificationStatus)}>
            {SOURCE_STATUS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
        </Field>
        <Submit busy={model.busy}>Προσθήκη πηγής</Submit>
      </form>
      <section className="panel">
        {workspace.sources.length === 0 ? <p className="muted">Καμία πηγή ακόμη. Χωρίς πηγή δεν γράφεται ισχυρισμός.</p> : (
          <ul className="plain-list">
            {workspace.sources.map(source => (
              <li key={source.id}>
                <button type="button" className="linkish" onClick={() => model.setSelection({ kind: 'source', id: source.id })}>{source.label}</button>
                <small>{source.verificationStatus} · {source.isDemo ? 'demo' : 'πραγματική'}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EvidenceBox({ workspace, selected, onChange }: { workspace: Workspace; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <fieldset className="checks">
      <legend>Τεκμήρια</legend>
      {workspace.sources.length === 0 ? <p className="muted">Πρώτα κατέγραψε μια πηγή.</p> : workspace.sources.map(source => (
        <label key={source.id}>
          <input type="checkbox" checked={selected.includes(source.id)} onChange={event => onChange(event.target.checked ? [...selected, source.id] : selected.filter(id => id !== source.id))} />
          {source.label}{source.verificationStatus === 'blocked' ? ' (αποκλεισμένη)' : ''}
        </label>
      ))}
    </fieldset>
  );
}

function ValueField({ property, value, onChange }: { property: PropertyDefinition | undefined; value: string; onChange: (value: string) => void }) {
  if (!property || property.valueType === 'string') return <Field label="Τιμή"><TextInput value={value} onChange={onChange} /></Field>;
  if (property.valueType === 'number') {
    const hint = [property.unit, property.nonnegative ? 'Μη αρνητικός αριθμός.' : ''].filter(Boolean).join(' · ');
    return <Field label="Τιμή" hint={hint || undefined}><TextInput value={value} onChange={onChange} /></Field>;
  }
  if (property.valueType === 'boolean') {
    return (
      <Field label="Τιμή">
        <SelectInput value={value} onChange={onChange}>
          <option value="">Επίλεξε</option>
          <option value="true">Ναι</option>
          <option value="false">Όχι</option>
        </SelectInput>
      </Field>
    );
  }
  return <Field label="Τιμή"><input type="date" value={value} onChange={event => onChange(event.target.value)} /></Field>;
}

function readValue(property: PropertyDefinition | undefined, value: string): string | number | boolean | null | undefined {
  if (!property) return undefined;
  if (property.valueType === 'number') {
    if (value.trim() === '') return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (property.valueType === 'boolean') return value === 'true' ? true : value === 'false' ? false : undefined;
  if (value.trim().length === 0) return undefined;
  return value;
}

function subjectOptions(workspace: Workspace) {
  return [
    ...workspace.entities.filter(entity => !entity.archived).map(entity => ({
      key: `entity|${entity.id}`, kind: 'entity' as const, id: entity.id, typeId: entity.typeId, label: entity.label,
    })),
    ...workspace.relationships.map(relationship => ({
      key: `relationship|${relationship.id}`, kind: 'relationship' as const, id: relationship.id, typeId: relationship.typeId,
      label: `${entityLabel(workspace, relationship.fromId)} → ${entityLabel(workspace, relationship.toId)}`,
    })),
  ];
}

function endpointHint(workspace: Workspace, typeId: string): string {
  const type = workspace.relationshipTypes.find(item => item.id === typeId);
  if (!type) return 'Διάλεξε τύπο για να δεις ποια άκρα επιτρέπονται.';
  const from = type.fromTypeIds.map(id => workspace.entityTypes.find(item => item.id === id)?.label ?? id).join(', ');
  const to = type.toTypeIds.map(id => workspace.entityTypes.find(item => item.id === id)?.label ?? id).join(', ');
  return `Επιτρεπτά άκρα: ${from} → ${to}. Ακατάλληλος συνδυασμός απορρίπτεται πριν την αποθήκευση.`;
}

function activate(event: KeyboardEvent, run: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    run();
  }
}
