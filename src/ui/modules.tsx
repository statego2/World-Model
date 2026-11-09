import { useState } from 'react';
import worldGeometry from '../../data/geometries/world-countries.json' with { type: 'json' };
import regionGeometry from '../../data/geometries/greek-regions.json' with { type: 'json' };
import regionLinks from '../../data/geometries/region-links.json' with { type: 'json' };
import { availableYears, chooseFilters } from '../core/coverage.ts';
import { compareEntities, rankEntities, readSubjectMetric, runSavedView, type SharedFilters } from '../core/query.ts';
import type { Workspace } from '../core/types.ts';
import { boundsOf, GeoMap, type MapFeature } from './map.tsx';
import { entityLabel } from './lookup.ts';
import { useModel } from './model.tsx';

type ModuleId = 'world' | 'military' | 'capital' | 'greece';

export function Modules() {
  const [moduleId, setModuleId] = useState<ModuleId>('world');
  const model = useModel();
  const workspace = model.workspace;
  const [workspaceId, setWorkspaceId] = useState(workspace?.id ?? '');
  const [filters, setFilters] = useState<SharedFilters>(() => workspace ? chooseFilters(workspace) : { year: 1900, basis: 'reported', sourceIds: [] });
  if (!workspace) return null;
  if (workspace.id !== workspaceId) {
    setWorkspaceId(workspace.id);
    setFilters(chooseFilters(workspace));
  }
  const years = availableYears(workspace, filters);
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Εφαρμογές</h1>
        <p>{workspace.dataMode === 'real' ? 'Τέσσερις προβολές του ίδιου μοντέλου. Το έτος και οι πηγές είναι κοινά και φαίνονται.' : 'Τέσσερις προβολές του ίδιου μοντέλου. Τα νούμερα του demo είναι συνθετικά.'}</p>
      </header>
      <form className="panel filter-bar" aria-label="Κοινά φίλτρα">
        <label className="field"><span>Έτος</span>
          <select value={String(filters.year)} onChange={event => setFilters({ ...filters, year: Number(event.target.value) })}>
            {(years.length > 0 ? years : [filters.year]).map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="field"><span>Βάση</span>
          <select value={filters.basis} onChange={event => setFilters({ ...filters, basis: event.target.value as SharedFilters['basis'] })}>
            <option value="reported">Τεκμηριωμένο</option>
            <option value="assumption">Υπόθεση</option>
          </select>
        </label>
        <fieldset className="checks">
          <legend>Πηγές</legend>
          {workspace.sources.filter(source => workspace.facts.some(fact => fact.evidenceIds.includes(source.id))).map(source => (
            <label key={source.id}>
              <input type="checkbox" checked={filters.sourceIds.includes(source.id)} onChange={event => {
                const sourceIds = event.target.checked ? [...filters.sourceIds, source.id] : filters.sourceIds.filter(id => id !== source.id);
                setFilters({ ...filters, sourceIds });
              }} />
              {source.label}
            </label>
          ))}
        </fieldset>
      </form>
      <BindingEditor workspace={workspace} />
      <div className="module-tabs" role="tablist" aria-label="Εφαρμογές">
        <Tab id="world" current={moduleId} onSelect={setModuleId} label="Παγκόσμιος χάρτης" />
        <Tab id="military" current={moduleId} onSelect={setModuleId} label="Ελλάδα–Τουρκία" />
        <Tab id="capital" current={moduleId} onSelect={setModuleId} label="Κεφάλαια" />
        <Tab id="greece" current={moduleId} onSelect={setModuleId} label="Ελληνική οικονομία" />
      </div>
      {moduleId === 'world' ? <World workspace={workspace} filters={filters} /> : null}
      {moduleId === 'military' ? <Military workspace={workspace} filters={filters} /> : null}
      {moduleId === 'capital' ? <Capital workspace={workspace} filters={filters} /> : null}
      {moduleId === 'greece' ? <Greece workspace={workspace} filters={filters} /> : null}
    </div>
  );
}

function World({ workspace, filters }: { workspace: Workspace; filters: SharedFilters }) {
  const features = worldGeometry.features as MapFeature[];
  const propertyId = workspace.bindings.gdpProperty;
  const ranked = propertyId ? rankEntities(workspace, countries(workspace).map(entity => entity.id), propertyId, filters) : null;
  const valueByIso: Record<string, number | 'none'> = {};
  for (const feature of features) valueByIso[feature.id] = 'none';
  if (ranked && ranked.ok) {
    for (const row of ranked.rows) {
      const iso = isoOf(workspace, row.entityId);
      if (!iso) continue;
      valueByIso[iso] = row.status === 'value' ? row.values[0]?.value ?? 'none' : 'none';
    }
  }
  return (
    <section className="panel" aria-label="Παγκόσμιος χάρτης">
      <h2>Χώρες και ΑΕΠ</h2>
      <p>Χωρίς δεδομένα δεν σημαίνει μηδέν. Οι υπόλοιπες χώρες μένουν χωρίς μέτρηση.</p>
      <GeoMap features={features} idAttribute="data-iso" values={valueByIso} bounds={{ minLon: -180, maxLon: 180, minLat: -56, maxLat: 84 }} label={`Παγκόσμιος χάρτης, έτος ${filters.year}`} />
      {ranked && ranked.ok ? <MetricTable workspace={workspace} rows={ranked.rows.map(row => ({ id: row.entityId, label: entityLabel(workspace, row.entityId), status: row.status, value: row.values[0]?.value, unit: row.unit, rank: row.rank, factId: row.values[0]?.factId }))} /> : null}
    </section>
  );
}

function Military({ workspace, filters }: { workspace: Workspace; filters: SharedFilters }) {
  const propertyId = workspace.bindings.defenseSpendingProperty;
  const compared = propertyId ? compareEntities(workspace, ['country:GRC', 'country:TUR'], propertyId, filters) : null;
  return (
    <section className="panel" aria-label="Ελλάδα–Τουρκία">
      <h2>{propertyId ? `Ελλάδα και Τουρκία, ${filters.year}` : 'Ελλάδα και Τουρκία'}</h2>
      <p>Σύγκριση της ίδιας συνθετικής δαπάνης, του ίδιου έτους και της ίδιας πηγής. Δεν προκύπτει νικητής.</p>
      {compared && compared.ok ? compared.rows.map(row => (
        <p key={row.entityId} data-testid={`milex-${row.entityId}`}>
          {entityLabel(workspace, row.entityId)}: {row.status === 'value' ? `${row.values[0]?.value} ${row.unit ?? ''}` : row.status === 'conflict' ? 'σύγκρουση, χωρίς επιλογή νικητή' : 'χωρίς δεδομένα'}
        </p>
      )) : <p>Λείπει το binding της αμυντικής δαπάνης.</p>}
    </section>
  );
}

function Capital({ workspace, filters }: { workspace: Workspace; filters: SharedFilters }) {
  const path = runSavedView(workspace, 'view:capital-to-regions');
  const view = workspace.savedViews.find(item => item.id === 'view:capital-to-regions');
  const edgeType = workspace.bindings.capitalType;
  const edges = workspace.relationships.filter(item => item.typeId === edgeType);
  const unmapped = workspace.entities.filter(entity => entity.typeId === 'type:infrastructure' && !workspace.relationships.some(edge => edge.typeId === 'reltype:located_in' && edge.fromId === entity.id));
  return (
    <section className="panel" aria-label="Κεφάλαια">
      <h2>Διμερείς ροές</h2>
      <p>Το απόθεμα και η ροή μένουν χωριστά. Το άθροισμα μιας χώρας δεν μοιράζεται σε εταιρείες και δεν αποδεικνύει ιδιοκτησία.</p>
      {edges.map(edge => (
        <article key={edge.id}>
          <h3>{entityLabel(workspace, edge.fromId)} → {entityLabel(workspace, edge.toId)}</h3>
          <p>Απόθεμα: {metricText(workspace, 'relationship', edge.id, workspace.bindings.fdiStockProperty, filters)}</p>
          <p>Ροή: {metricText(workspace, 'relationship', edge.id, workspace.bindings.fdiFlowProperty, filters)}</p>
        </article>
      ))}
      <h3>Σύνδεση με περιφέρεια</h3>
      {view ? <p>Έτος διαδρομής: {view.query.year}. Δεν εξηγεί το απόθεμα ή τη ροή άλλης χρονιάς.</p> : null}
      <ul className="plain-list">
        {path.paths.map(item => <li key={item.entityIds.join('>')} data-testid="capital-path">{item.entityIds.map(id => entityLabel(workspace, id)).join(' → ')}</li>)}
      </ul>
      {unmapped.length > 0 ? <p data-testid="unmapped-airports">Χωρίς αντιστοίχιση NUTS 2: {unmapped.map(entity => entity.label).join(', ')}.</p> : null}
      <p>{path.note}</p>
    </section>
  );
}

function Greece({ workspace, filters }: { workspace: Workspace; filters: SharedFilters }) {
  const features = regionGeometry.features as MapFeature[];
  const propertyId = workspace.bindings.regionalGvaProperty;
  const values: Record<string, number | 'none'> = {};
  for (const feature of features) {
    const entityId = linkedEntity(workspace, feature.id);
    const reading = entityId && propertyId ? rankEntities(workspace, [entityId], propertyId, filters) : null;
    const row = reading && reading.ok ? reading.rows[0] : undefined;
    values[feature.id] = row?.status === 'value' ? row.values[0]?.value ?? 'none' : 'none';
  }
  const regions = workspace.entities.filter(entity => entity.typeId === workspace.bindings.regionType);
  return (
    <section className="panel" aria-label="Ελληνική οικονομία">
      <h2>Περιφέρειες</h2>
      <p>Ο χάρτης δείχνει όρια NUTS, όχι τη χώρα ως ένα πολύγωνο. Συνθετική περιφέρεια χωρίς ρητή γεωμετρία δεν ζωγραφίζεται αλλού.</p>
      <GeoMap features={features} idAttribute="data-nuts" values={values} bounds={boundsOf(features, { minLon: 19, maxLon: 30, minLat: 34, maxLat: 42 })} label="Χάρτης ελληνικών περιφερειών" />
      <ul className="plain-list">
        {regions.map(region => {
          const link = regionLinks.links.find(item => item.entityId === region.id);
          return <li key={region.id}>{region.label}: {link ? `γεωμετρία ${link.geometryId}` : 'χωρίς γεωμετρία'}</li>;
        })}
      </ul>
    </section>
  );
}

const BINDING_LABELS: [string, string][] = [
  ['countryType', 'Τύπος χώρας'],
  ['regionType', 'Τύπος περιφέρειας'],
  ['gdpProperty', 'ΑΕΠ'],
  ['populationProperty', 'Πληθυσμός'],
  ['defenseSpendingProperty', 'Αμυντική δαπάνη'],
  ['regionalGvaProperty', 'Περιφερειακό ΑΕΠ'],
  ['capitalType', 'Τύπος κεφαλαιακής σχέσης'],
  ['fdiStockProperty', 'Απόθεμα FDI'],
  ['fdiFlowProperty', 'Ροή FDI'],
];

function BindingEditor({ workspace }: { workspace: Workspace }) {
  const model = useModel();
  const [role, setRole] = useState('countryType');
  const [definitionId, setDefinitionId] = useState('');
  const options = bindingOptions(workspace, role);
  const missing = BINDING_LABELS.filter(([id]) => !workspace.bindings[id]).map(([, label]) => label);
  return (
    <form className="panel" aria-label="Ρόλοι εφαρμογών" onSubmit={event => {
      event.preventDefault();
      if (!definitionId) return;
      void model.commit({ type: 'SetBinding', role, definitionId });
    }}>
      <h2>Ρόλοι</h2>
      {missing.length > 0 ? <p>Λείπουν: {missing.join(', ')}.</p> : <p>Όλοι οι ρόλοι έχουν ορισμό.</p>}
      <div className="form-grid">
        <label className="field"><span>Ρόλος</span>
          <select value={role} onChange={event => { setRole(event.target.value); setDefinitionId(''); }}>
            {BINDING_LABELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="field"><span>Ορισμός</span>
          <select value={definitionId} onChange={event => setDefinitionId(event.target.value)}>
            <option value="">Επίλεξε</option>
            {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <button className="primary" type="submit">Σύνδεση ρόλου</button>
    </form>
  );
}

function bindingOptions(workspace: Workspace, role: string): { id: string; label: string }[] {
  if (role === 'countryType' || role === 'regionType') return workspace.entityTypes.filter(item => !item.deprecated).map(item => ({ id: item.id, label: item.label }));
  if (role === 'capitalType') return workspace.relationshipTypes.filter(item => !item.deprecated).map(item => ({ id: item.id, label: item.label }));
  const kind = role === 'fdiStockProperty' || role === 'fdiFlowProperty' ? 'relationship' : 'entity';
  return workspace.properties.filter(item => !item.deprecated && item.valueType === 'number' && item.subjectKind === kind).map(item => ({ id: item.id, label: item.label }));
}

function Tab({ id, current, onSelect, label }: { id: ModuleId; current: ModuleId; onSelect: (id: ModuleId) => void; label: string }) {
  return <button type="button" role="tab" aria-selected={current === id} onClick={() => onSelect(id)}>{label}</button>;
}

function MetricTable({ workspace, rows }: { workspace: Workspace; rows: { id: string; label: string; status: string; value?: number; unit: string | null; rank: number | null; factId?: string }[] }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Θέση</th><th>Οντότητα</th><th>Τιμή</th><th>Πηγή</th></tr></thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id}>
            <td>{row.rank ?? '—'}</td>
            <td>{row.label}</td>
            <td>{row.status === 'value' ? `${row.value} ${row.unit ?? ''}` : row.status === 'conflict' ? 'σύγκρουση' : 'χωρίς δεδομένα'}</td>
            <td>{row.factId ? sourceNames(workspace, row.factId) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

function linkedEntity(workspace: Workspace, geometryId: string): string | null {
  const present = regionLinks.links.filter(link => link.geometryId === geometryId && workspace.entities.some(entity => entity.id === link.entityId));
  return present.length === 1 ? present[0]?.entityId ?? null : null;
}

function countries(workspace: Workspace) {
  return workspace.entities.filter(entity => entity.typeId === workspace.bindings.countryType);
}

function isoOf(workspace: Workspace, entityId: string): string | null {
  const fact = workspace.facts.find(item => item.subjectId === entityId && item.propertyId === 'property:iso3' && typeof item.value === 'string');
  return typeof fact?.value === 'string' ? fact.value : null;
}

function metricText(workspace: Workspace, subjectKind: 'entity' | 'relationship', subjectId: string, propertyId: string | undefined, filters: SharedFilters): string {
  if (!propertyId) return 'χωρίς binding';
  const reading = readSubjectMetric(workspace, subjectKind, subjectId, propertyId, filters);
  if (reading.status === 'conflict') return 'σύγκρουση πηγών, χωρίς επιλογή νικητή';
  if (reading.status !== 'value') return 'χωρίς δεδομένα';
  const factId = reading.values[0]?.factId;
  return `${reading.values[0]?.value} ${reading.unit ?? ''} · ${factId ? sourceNames(workspace, factId) : ''}`.trim();
}

function sourceNames(workspace: Workspace, factId: string): string {
  const fact = workspace.facts.find(item => item.id === factId);
  if (!fact) return '—';
  return fact.evidenceIds.map(id => workspace.sources.find(source => source.id === id)?.label ?? id).join(', ');
}
