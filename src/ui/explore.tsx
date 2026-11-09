import { useState } from 'react';
import { chooseFilters } from '../core/coverage.ts';
import { neighborhood, NEIGHBORHOOD_EDGE_LIMIT, NEIGHBORHOOD_NODE_LIMIT, searchEntities } from '../core/neighborhood.ts';
import { rankEntities, readSubjectMetric, runSavedView, type PathQueryResult, type SharedFilters } from '../core/query.ts';
import { timeSeries } from '../core/series.ts';
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
      <GraphPanel workspace={workspace} filters={filters} />
      <ComparePanel workspace={workspace} filters={filters} />
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

function GraphPanel({ workspace, filters }: { workspace: Workspace; filters: SharedFilters }) {
  const [query, setQuery] = useState('');
  const [start, setStart] = useState('');
  const [hops, setHops] = useState<1 | 2>(2);
  const [direction, setDirection] = useState<'out' | 'in' | 'both'>('out');
  const [typeId, setTypeId] = useState('');
  const [selected, setSelected] = useState('');
  const matches = searchEntities(workspace, query);
  const result = start ? neighborhood(workspace, { startEntityId: start, hops, direction, relationshipTypeIds: typeId ? [typeId] : [], year: filters.year, basis: filters.basis, sourceIds: filters.sourceIds }) : null;
  const focus = workspace.entities.find(entity => entity.id === selected);
  const facts = focus ? workspace.facts.filter(fact => fact.subjectKind === 'entity' && fact.subjectId === focus.id && fact.basis === filters.basis) : [];
  return (
    <section className="panel" aria-label="Γειτονιά">
      <h2>Γειτονιά</h2>
      <p className="muted">Έως δύο βήματα. Όριο {NEIGHBORHOOD_NODE_LIMIT} κόμβοι και {NEIGHBORHOOD_EDGE_LIMIT} ακμές. Ο πίνακας είναι η προσβάσιμη προβολή.</p>
      <div className="form-grid">
        <label className="field"><span>Αναζήτηση οντότητας</span><input value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label className="field"><span>Βήματα</span>
          <select value={hops} onChange={event => setHops(Number(event.target.value) === 1 ? 1 : 2)}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </label>
        <label className="field"><span>Κατεύθυνση γειτονιάς</span>
          <select value={direction} onChange={event => setDirection(event.target.value as 'out' | 'in' | 'both')}>
            <option value="out">Προς τα έξω</option>
            <option value="in">Προς τα μέσα</option>
            <option value="both">Και οι δύο</option>
          </select>
        </label>
        <label className="field"><span>Τύπος ακμής</span>
          <select value={typeId} onChange={event => setTypeId(event.target.value)}>
            <option value="">Όλοι</option>
            {workspace.relationshipTypes.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </label>
      </div>
      {matches.length > 0 ? <ul className="plain-list">{matches.map(match => <li key={match.id}><button type="button" onClick={() => { setStart(match.id); setSelected(match.id); }}>{match.label}</button></li>)}</ul> : null}
      {result ? (
        <div className="table-wrap"><table data-testid="neighborhood-table">
          <thead><tr><th>Βήμα</th><th>Οντότητα</th><th>Ακμές</th></tr></thead>
          <tbody>
            {result.nodes.map(node => (
              <tr key={node.id}>
                <td>{node.hop}</td>
                <td><button type="button" onClick={() => setSelected(node.id)}>{entityLabel(workspace, node.id)}</button></td>
                <td>{result.edges.filter(edge => edge.fromId === node.id || edge.toId === node.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : null}
      {result?.truncated ? <p>Η γειτονιά κόπηκε στο δηλωμένο όριο.</p> : null}
      {result ? <p className="muted">{result.note}</p> : null}
      {focus ? (
        <div data-testid="graph-inspector">
          <h3>{focus.label}</h3>
          <p className="mono">{focus.id}</p>
          {facts.length === 0 ? <p>Χωρίς αριθμητικό fact σε αυτή τη βάση.</p> : facts.filter(fact => typeof fact.value === 'number').slice(0, 6).map(fact => {
            const reading = readSubjectMetric(workspace, 'entity', focus.id, fact.propertyId, filters);
            const property = workspace.properties.find(item => item.id === fact.propertyId);
            return <p key={fact.id}>{property?.label ?? fact.propertyId}: {reading.status === 'missing' ? 'χωρίς δεδομένα' : reading.status === 'conflict' ? 'σύγκρουση' : `${reading.values[0]?.value ?? fact.value} ${property?.unit ?? ''}`} · {fact.validFrom} → {fact.validTo ?? '…'} · {fact.evidenceIds.join(', ')}</p>;
          })}
        </div>
      ) : null}
    </section>
  );
}

function ComparePanel({ workspace, filters }: { workspace: Workspace; filters: SharedFilters }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [propertyId, setPropertyId] = useState(workspace.bindings.gdpProperty ?? '');
  const properties = workspace.properties.filter(property => property.valueType === 'number' && property.subjectKind === 'entity' && !property.deprecated);
  const series = picked.length >= 2 && propertyId ? timeSeries(workspace, picked, propertyId, { basis: filters.basis, sourceIds: filters.sourceIds }) : null;
  return (
    <section className="panel" aria-label="Σύγκριση και σειρά">
      <h2>Σύγκριση</h2>
      <p>Δύο έως πέντε οντότητες, ίδια ιδιότητα και πηγές. Ένα κενό έτος μένει κενό.</p>
      <label className="field"><span>Ιδιότητα σύγκρισης</span>
        <select value={propertyId} onChange={event => setPropertyId(event.target.value)}>
          {properties.map(property => <option key={property.id} value={property.id}>{property.label}</option>)}
        </select>
      </label>
      <ul className="plain-list">
        {workspace.entities.filter(entity => entity.typeId === workspace.bindings.countryType).map(entity => (
          <li key={entity.id}><label><input type="checkbox" checked={picked.includes(entity.id)} onChange={event => setPicked(current => event.target.checked ? (current.length >= 5 ? current : [...current, entity.id]) : current.filter(id => id !== entity.id))} />{entity.label}</label></li>
        ))}
      </ul>
      {series ? (
        <div className="table-wrap"><table data-testid="series-table">
          <thead><tr><th>Οντότητα</th>{series.years.map(year => <th key={year}>{year}</th>)}</tr></thead>
          <tbody>
            {series.rows.map(row => (
              <tr key={row.entityId}>
                <td>{entityLabel(workspace, row.entityId)}</td>
                {row.points.map(point => <td key={point.year}>{point.status === 'value' ? `${point.value} ${series.unit ?? ''}` : 'κενό'}</td>)}
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : null}
      {series ? <SeriesChart series={series} /> : null}
    </section>
  );
}

function SeriesChart({ series }: { series: ReturnType<typeof timeSeries> }) {
  const values = series.rows.flatMap(row => row.points.flatMap(point => point.value === null ? [] : [point.value]));
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 1;
  return (
    <svg className="map" viewBox="0 0 1000 220" role="img" aria-label="Σημεία σειράς χωρίς συμπλήρωση κενών">
      {series.rows.map((row, rowIndex) => row.points.map((point, index) => point.value === null ? null : (
        <circle key={`${row.entityId}-${point.year}`} cx={80 + index * (series.years.length > 1 ? 800 / (series.years.length - 1) : 0)} cy={190 - ((point.value - min) / (max - min || 1)) * 150} r={6 + rowIndex} fill={rowIndex === 0 ? '#e2b15a' : '#8fa888'} />
      )))}
    </svg>
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
