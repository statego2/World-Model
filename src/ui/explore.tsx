import { useState } from 'react';
import { chooseFilters } from '../core/coverage.ts';
import { rankEntities, runSavedView, type PathQueryResult, type SharedFilters } from '../core/query.ts';
import type { Workspace } from '../core/types.ts';
import { entityLabel } from './lookup.ts';
import { useModel } from './model.tsx';

export function Explore() {
  const model = useModel();
  const workspace = model.workspace;
  const [result, setResult] = useState<PathQueryResult | null>(null);
  const [filters, setFilters] = useState<SharedFilters>(() => workspace ? chooseFilters(workspace) : { year: 1900, basis: 'reported', sourceIds: [] });
  if (!workspace) return null;
  const countries = workspace.entities.filter(entity => entity.typeId === workspace.bindings.countryType);
  const ranked = countries.length > 0 && workspace.bindings.defenseSpendingProperty
    ? rankEntities(workspace, countries.map(entity => entity.id), workspace.bindings.defenseSpendingProperty, filters)
    : null;
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Εξερεύνηση</h1>
        <p>Η αποθηκευμένη προβολή ξανατρέχει στα τρέχοντα δεδομένα. Νέα εταιρεία εμφανίζεται χωρίς αλλαγή του ερωτήματος.</p>
      </header>
      <section className="panel">
        <h2>Κοινά φίλτρα</h2>
        <div className="form-grid">
          <label className="field"><span>Έτος</span><input type="number" value={filters.year} onChange={event => setFilters({ ...filters, year: Number(event.target.value) })} /></label>
          <label className="field"><span>Βάση</span>
            <select value={filters.basis} onChange={event => setFilters({ ...filters, basis: event.target.value as SharedFilters['basis'] })}>
              <option value="reported">Τεκμηριωμένο</option>
              <option value="assumption">Υπόθεση</option>
            </select>
          </label>
          <label className="field"><span>Πηγή κατάταξης</span>
            <select value={filters.sourceIds[0] ?? ''} onChange={event => setFilters({ ...filters, sourceIds: event.target.value ? [event.target.value] : [] })}>
              {workspace.sources.map(source => <option key={source.id} value={source.id}>{source.label}</option>)}
            </select>
          </label>
        </div>
        {ranked && ranked.ok ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Κατάταξη</th><th>Χώρα</th><th>Αμυντικές δαπάνες</th></tr></thead>
            <tbody>
              {ranked.rows.map(row => (
                <tr key={row.entityId}>
                  <td>{row.rank ?? '—'}</td>
                  <td>{entityLabel(workspace, row.entityId)}</td>
                  <td>{row.status === 'missing' ? 'χωρίς δεδομένα' : row.status === 'conflict' ? 'σύγκρουση πηγών' : `${row.values[0]?.value} ${row.unit ?? ''}`}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : null}
      </section>
      <QueryBuilder workspace={workspace} />
      {workspace.savedViews.map(view => (
        <section className="panel" key={view.id}>
          <h2>{view.label}</h2>
          <p className="muted">{view.filterMode === 'inherit' ? 'Κληρονομεί τα τρέχοντα φίλτρα.' : `Σταθερές παράμετροι: έτος ${view.query.year}.`} {view.query.basis === 'assumption' ? 'Υπόθεση' : 'Τεκμηριωμένο'} · {view.query.steps.length} βήματα</p>
          <button className="primary" type="button" onClick={() => setResult(runSavedView(workspace, view.id, filters))}>Εκτέλεση</button>
        </section>
      ))}
      {result ? <PathTable workspace={workspace} result={result} /> : null}
    </div>
  );
}

function QueryBuilder({ workspace }: { workspace: Workspace }) {
  const model = useModel();
  const [id, setId] = useState('view:custom');
  const [label, setLabel] = useState('Δική μου διαδρομή');
  const [startEntityId, setStart] = useState('');
  const [steps, setSteps] = useState([{ relationshipTypeId: '', direction: 'out' as 'out' | 'in' }, { relationshipTypeId: '', direction: 'out' as 'out' | 'in' }, { relationshipTypeId: '', direction: 'out' as 'out' | 'in' }, { relationshipTypeId: '', direction: 'out' as 'out' | 'in' }]);
  const [year, setYear] = useState(2023);
  const [basis, setBasis] = useState<'reported' | 'assumption'>('reported');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [limit, setLimit] = useState(20);
  const [filterMode, setFilterMode] = useState<'fixed' | 'inherit'>('fixed');
  return (
    <form className="panel" aria-label="Νέο ερώτημα" onSubmit={event => {
      event.preventDefault();
      const querySteps = steps.filter(step => step.relationshipTypeId);
      if (!startEntityId || querySteps.length === 0 || sourceIds.length === 0) return;
      void model.commit({ type: 'SaveView', view: { id, label, filterMode, query: { startEntityId, steps: querySteps, year, basis, sourceIds, limit } } });
    }}>
      <h2>Νέο ερώτημα</h2>
      <div className="form-grid">
        <label className="field"><span>ID προβολής</span><input value={id} onChange={event => setId(event.target.value)} /></label>
        <label className="field"><span>Όνομα</span><input value={label} onChange={event => setLabel(event.target.value)} /></label>
        <label className="field"><span>Αφετηρία</span>
          <select value={startEntityId} onChange={event => setStart(event.target.value)}>
            <option value="">Επίλεξε</option>
            {workspace.entities.map(entity => <option key={entity.id} value={entity.id}>{entity.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Έτος</span><input type="number" value={year} onChange={event => setYear(Number(event.target.value))} /></label>
        <label className="field"><span>Βάση ερωτήματος</span>
          <select value={basis} onChange={event => setBasis(event.target.value as 'reported' | 'assumption')}>
            <option value="reported">Τεκμηριωμένο</option>
            <option value="assumption">Υπόθεση</option>
          </select>
        </label>
        <label className="field"><span>Όριο</span><input type="number" min={1} max={1000} value={limit} onChange={event => setLimit(Number(event.target.value))} /></label>
        <label className="field"><span>Φίλτρα</span>
          <select value={filterMode} onChange={event => setFilterMode(event.target.value as 'fixed' | 'inherit')}>
            <option value="fixed">Σταθερές παράμετροι</option>
            <option value="inherit">Κληρονομεί τα τρέχοντα</option>
          </select>
        </label>
      </div>
      {steps.map((step, index) => (
        <div className="form-grid" key={index}>
          <label className="field"><span>Βήμα {index + 1}</span>
            <select aria-label={`Τύπος βήματος ${index + 1}`} value={step.relationshipTypeId} onChange={event => setSteps(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, relationshipTypeId: event.target.value } : item))}>
              <option value="">Κανένα</option>
              {workspace.relationshipTypes.filter(type => !type.deprecated).map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Κατεύθυνση</span>
            <select aria-label={`Κατεύθυνση βήματος ${index + 1}`} value={step.direction} onChange={event => setSteps(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, direction: event.target.value as 'out' | 'in' } : item))}>
              <option value="out">Προς τα έξω</option>
              <option value="in">Προς τα μέσα</option>
            </select>
          </label>
        </div>
      ))}
      <fieldset className="checks">
        <legend>Πηγές ερωτήματος</legend>
        {workspace.sources.map(source => (
          <label key={source.id}><input type="checkbox" checked={sourceIds.includes(source.id)} onChange={event => setSourceIds(current => event.target.checked ? [...current, source.id] : current.filter(id => id !== source.id))} />{source.label}</label>
        ))}
      </fieldset>
      <button className="primary" type="submit">Αποθήκευση προβολής</button>
    </form>
  );
}

function PathTable({ workspace, result }: { workspace: Workspace; result: PathQueryResult }) {
  return (
    <section className="panel" data-testid="path-results">
      <h2>Διαδρομές</h2>
      <p>{result.note}</p>
      {result.truncated ? <p>Τα αποτελέσματα κόπηκαν στο όριο. Ο πίνακας δείχνει μόνο το δηλωμένο πλήθος.</p> : null}
      {result.paths.length === 0 ? <p>Καμία τεκμηριωμένη διαδρομή για αυτά τα φίλτρα.</p> : (
        <ul className="plain-list">
          {result.paths.map(path => (
            <li key={path.entityIds.join('>')}>{path.entityIds.map(id => entityLabel(workspace, id)).join(' → ')}</li>
          ))}
        </ul>
      )}
      <p className="muted">Εξαιρέθηκαν {result.excludedCount} ακμές εκτός ισχύος, βάσης ή πηγής. Αναθεώρηση αποτελέσματος {result.workspaceRevision}.</p>
    </section>
  );
}
