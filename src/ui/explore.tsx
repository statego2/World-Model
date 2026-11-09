import { useState } from 'react';
import { rankEntities, runSavedView, type PathQueryResult, type SharedFilters } from '../core/query.ts';
import type { Workspace } from '../core/types.ts';
import { entityLabel } from './lookup.ts';
import { useModel } from './model.tsx';

export function Explore() {
  const model = useModel();
  const workspace = model.workspace;
  const [result, setResult] = useState<PathQueryResult | null>(null);
  const [filters, setFilters] = useState<SharedFilters>({ year: 2023, basis: 'reported', sourceIds: ['source:demo-macro'] });
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
      {workspace.savedViews.map(view => (
        <section className="panel" key={view.id}>
          <h2>{view.label}</h2>
          <p className="muted">Έτος {view.query.year} · {view.query.basis === 'assumption' ? 'υπόθεση' : 'τεκμηριωμένο'} · {view.query.steps.length} βήματα</p>
          <button className="primary" type="button" onClick={() => setResult(runSavedView(workspace, view.id))}>Εκτέλεση</button>
        </section>
      ))}
      {result ? <PathTable workspace={workspace} result={result} /> : null}
    </div>
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
