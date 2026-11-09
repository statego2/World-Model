import { useState } from 'react';
import type { Workspace } from '../core/types.ts';
import { Field, SelectInput, Submit, TextInput } from './components.tsx';
import { VALUE_TYPES } from './copy.ts';
import { useModel } from './model.tsx';

export function Ontology() {
  const model = useModel();
  const workspace = model.workspace;
  if (!workspace) return null;
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Οντολογία</h1>
        <p>Οι ορισμοί φτιάχνουν τις φόρμες. Νέος τύπος δεν χρειάζεται νέο component.</p>
      </header>
      <EntityTypes workspace={workspace} />
      <RelationshipTypes workspace={workspace} />
      <Properties workspace={workspace} />
    </div>
  );
}

function EntityTypes({ workspace }: { workspace: Workspace }) {
  const model = useModel();
  const [id, setId] = useState('type:');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  return (
    <section className="panel">
      <h2>Τύποι οντοτήτων</h2>
      <DefinitionList rows={workspace.entityTypes} onSelect={row => model.setSelection({ kind: 'entityType', id: row })} />
      <form className="form-grid" onSubmit={event => {
        event.preventDefault();
        const submitted = { id, label, description };
        void model.commit({ type: 'DefineEntityType', entityType: submitted }).then(saved => {
          if (!saved) return;
          setId(current => current === submitted.id ? 'type:' : current);
          setLabel(current => current === submitted.label ? '' : current);
          setDescription(current => current === submitted.description ? '' : current);
        });
      }}>
        <Field label="ID τύπου" hint="π.χ. type:supplier"><TextInput value={id} onChange={setId} /></Field>
        <Field label="Όνομα τύπου"><TextInput value={label} onChange={setLabel} placeholder="Προμηθευτής" /></Field>
        <Field label="Περιγραφή"><TextInput value={description} onChange={setDescription} /></Field>
        <Submit busy={model.busy}>Προσθήκη τύπου</Submit>
      </form>
    </section>
  );
}

function RelationshipTypes({ workspace }: { workspace: Workspace }) {
  const model = useModel();
  const [id, setId] = useState('reltype:');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [fromTypeIds, setFromTypeIds] = useState<string[]>([]);
  const [toTypeIds, setToTypeIds] = useState<string[]>([]);
  const types = workspace.entityTypes.filter(type => !type.deprecated);
  return (
    <section className="panel">
      <h2>Τύποι σχέσεων</h2>
      <ul className="plain-list">
        {workspace.relationshipTypes.map(type => (
          <li key={type.id}>
            <button type="button" className="linkish" onClick={() => model.setSelection({ kind: 'relationshipType', id: type.id })}>
              {type.label}{type.deprecated ? ' · αποσυρμένος' : ''}
            </button>
            <small>{type.fromTypeIds.map(item => labelOf(workspace, item)).join(', ')} → {type.toTypeIds.map(item => labelOf(workspace, item)).join(', ')}</small>
          </li>
        ))}
      </ul>
      <form onSubmit={event => {
        event.preventDefault();
        const submitted = { id, label, description, fromTypeIds, toTypeIds };
        void model.commit({
          type: 'DefineRelationshipType',
          relationshipType: { ...submitted, directed: true },
        }).then(saved => {
          if (!saved) return;
          setId(current => current === submitted.id ? 'reltype:' : current);
          setLabel(current => current === submitted.label ? '' : current);
          setDescription(current => current === submitted.description ? '' : current);
          setFromTypeIds(current => sameIds(current, submitted.fromTypeIds) ? [] : current);
          setToTypeIds(current => sameIds(current, submitted.toTypeIds) ? [] : current);
        });
      }}>
        <div className="form-grid">
          <Field label="ID σχέσης"><TextInput value={id} onChange={setId} placeholder="reltype:supplies_to" /></Field>
          <Field label="Όνομα σχέσης"><TextInput value={label} onChange={setLabel} placeholder="Προμηθεύει" /></Field>
          <Field label="Νόημα" hint="Τι ακριβώς σημαίνει η ακμή, όχι ένα γενικό «σχετίζεται»."><TextInput value={description} onChange={setDescription} /></Field>
        </div>
        <TypeChecks legend="Από τύπους" types={types} selected={fromTypeIds} onChange={setFromTypeIds} />
        <TypeChecks legend="Προς τύπους" types={types} selected={toTypeIds} onChange={setToTypeIds} />
        <Submit busy={model.busy}>Προσθήκη σχέσης</Submit>
      </form>
    </section>
  );
}

function Properties({ workspace }: { workspace: Workspace }) {
  const model = useModel();
  const [id, setId] = useState('property:');
  const [label, setLabel] = useState('');
  const [owner, setOwner] = useState('');
  const [valueType, setValueType] = useState('number');
  const [unit, setUnit] = useState('');
  const [nonnegative, setNonnegative] = useState(true);
  const owners = [
    ...workspace.entityTypes.filter(type => !type.deprecated).map(type => ({ value: `entity|${type.id}`, label: `Οντότητα · ${type.label}` })),
    ...workspace.relationshipTypes.filter(type => !type.deprecated).map(type => ({ value: `relationship|${type.id}`, label: `Σχέση · ${type.label}` })),
  ];
  return (
    <section className="panel">
      <h2>Ιδιότητες</h2>
      <ul className="plain-list">
        {workspace.properties.map(property => (
          <li key={property.id}>
            <button type="button" className="linkish" onClick={() => model.setSelection({ kind: 'property', id: property.id })}>{property.label}</button>
            <small>{property.valueType}{property.unit ? ` · ${property.unit}` : ''} · {labelOf(workspace, property.subjectTypeId)}</small>
          </li>
        ))}
      </ul>
      <form className="form-grid" onSubmit={event => {
        event.preventDefault();
        const [subjectKind, subjectTypeId] = owner.split('|');
        if (subjectKind !== 'entity' && subjectKind !== 'relationship') return;
        if (!subjectTypeId) return;
        void model.commit({
          type: 'DefineProperty',
          property: {
            id, label, subjectKind, subjectTypeId, valueType: valueType as 'string' | 'number' | 'boolean' | 'date',
            ...(valueType === 'number' && unit.trim() ? { unit: unit.trim() } : {}),
            ...(valueType === 'number' ? { nonnegative } : {}),
          },
        }).then(saved => {
          if (!saved) return;
          setId(current => current === id ? 'property:' : current);
          setLabel(current => current === label ? '' : current);
          setUnit(current => current === unit ? '' : current);
        });
      }}>
        <Field label="ID ιδιότητας"><TextInput value={id} onChange={setId} placeholder="property:capacity" /></Field>
        <Field label="Όνομα ιδιότητας"><TextInput value={label} onChange={setLabel} placeholder="Δυναμικότητα" /></Field>
        <Field label="Ιδιοκτήτης">
          <SelectInput value={owner} onChange={setOwner}>
            <option value="">Επίλεξε τύπο</option>
            {owners.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </SelectInput>
        </Field>
        <Field label="Τύπος τιμής">
          <SelectInput value={valueType} onChange={setValueType}>
            {VALUE_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </SelectInput>
        </Field>
        {valueType === 'number' ? <Field label="Μονάδα" hint="Προαιρετική. Αν δηλωθεί, μένει δεμένη με τον ορισμό."><TextInput value={unit} onChange={setUnit} placeholder="MW" /></Field> : null}
        {valueType === 'number' ? (
          <label className="check"><input type="checkbox" checked={nonnegative} onChange={event => setNonnegative(event.target.checked)} /> Μη αρνητικό</label>
        ) : null}
        <Submit busy={model.busy}>Προσθήκη ιδιότητας</Submit>
      </form>
    </section>
  );
}

function TypeChecks({ legend, types, selected, onChange }: { legend: string; types: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <fieldset className="checks">
      <legend>{legend}</legend>
      {types.length === 0 ? <p className="muted">Πρώτα πρόσθεσε έναν τύπο οντότητας.</p> : types.map(type => (
        <label key={type.id}>
          <input type="checkbox" checked={selected.includes(type.id)} onChange={event => {
            onChange(event.target.checked ? [...selected, type.id] : selected.filter(id => id !== type.id));
          }} />
          {type.label}
        </label>
      ))}
    </fieldset>
  );
}

function DefinitionList({ rows, onSelect }: { rows: { id: string; label: string; deprecated?: boolean }[]; onSelect: (id: string) => void }) {
  if (rows.length === 0) return <p className="muted">Δεν υπάρχουν ακόμη ορισμοί.</p>;
  return (
    <ul className="plain-list">
      {rows.map(row => (
        <li key={row.id}>
          <button type="button" className="linkish" onClick={() => onSelect(row.id)}>{row.label}{row.deprecated ? ' · αποσυρμένος' : ''}</button>
          <small>{row.id}</small>
        </li>
      ))}
    </ul>
  );
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function labelOf(workspace: Workspace, id: string): string {
  return workspace.entityTypes.find(type => type.id === id)?.label ?? id;
}
