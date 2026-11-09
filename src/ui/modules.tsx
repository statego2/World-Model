import { useState } from 'react';
import worldGeometry from '../../data/geometries/world-countries.json' with { type: 'json' };
import regionGeometry from '../../data/geometries/greek-regions.json' with { type: 'json' };
import regionLinks from '../../data/geometries/region-links.json' with { type: 'json' };
import { compareEntities, rankEntities, runSavedView, type SharedFilters } from '../core/query.ts';
import type { Workspace } from '../core/types.ts';
import { boundsOf, GeoMap, type MapFeature } from './map.tsx';
import { entityLabel } from './lookup.ts';
import { useModel } from './model.tsx';

type ModuleId = 'world' | 'military' | 'capital' | 'greece';

function moduleFilters(workspace: Workspace): SharedFilters {
  if (workspace.dataMode === 'demo') return { year: 2023, basis: 'reported', sourceIds: ['source:demo-macro'] };
  return { year: 2022, basis: 'reported', sourceIds: workspace.sources.filter(source => !source.isDemo).map(source => source.id) };
}

export function Modules() {
  const [moduleId, setModuleId] = useState<ModuleId>('world');
  const model = useModel();
  if (!model.workspace) return null;
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Εφαρμογές</h1>
        <p>{model.workspace.dataMode === 'real' ? 'Τέσσερις προβολές του ίδιου μοντέλου. Κάθε μέτρηση κρατά τη δική της πηγή και το δικό της έτος.' : 'Τέσσερις προβολές του ίδιου μοντέλου. Τα νούμερα του demo είναι συνθετικά.'}</p>
      </header>
      <div className="module-tabs" role="tablist" aria-label="Εφαρμογές">
        <Tab id="world" current={moduleId} onSelect={setModuleId} label="Παγκόσμιος χάρτης" />
        <Tab id="military" current={moduleId} onSelect={setModuleId} label="Ελλάδα–Τουρκία" />
        <Tab id="capital" current={moduleId} onSelect={setModuleId} label="Κεφάλαια" />
        <Tab id="greece" current={moduleId} onSelect={setModuleId} label="Ελληνική οικονομία" />
      </div>
      {moduleId === 'world' ? <World workspace={model.workspace} /> : null}
      {moduleId === 'military' ? <Military workspace={model.workspace} /> : null}
      {moduleId === 'capital' ? <Capital workspace={model.workspace} /> : null}
      {moduleId === 'greece' ? <Greece workspace={model.workspace} /> : null}
    </div>
  );
}

function World({ workspace }: { workspace: Workspace }) {
  const filters = moduleFilters(workspace);
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
      <GeoMap features={features} idAttribute="data-iso" values={valueByIso} bounds={{ minLon: -180, maxLon: 180, minLat: -56, maxLat: 84 }} label={workspace.dataMode === 'real' ? 'Παγκόσμιος χάρτης, ΑΕΠ 2022' : 'Παγκόσμιος χάρτης συνθετικών μετρήσεων'} />
      {ranked && ranked.ok ? <MetricTable rows={ranked.rows.map(row => ({ id: row.entityId, label: entityLabel(workspace, row.entityId), status: row.status, value: row.values[0]?.value, unit: row.unit, rank: row.rank }))} /> : null}
    </section>
  );
}

function Military({ workspace }: { workspace: Workspace }) {
  const filters = moduleFilters(workspace);
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

function Capital({ workspace }: { workspace: Workspace }) {
  const filters = moduleFilters(workspace);
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
          <p>Απόθεμα: {factText(workspace, edge.id, workspace.bindings.fdiStockProperty, filters.year)}</p>
          <p>Ροή: {factText(workspace, edge.id, workspace.bindings.fdiFlowProperty, filters.year)}</p>
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

function Greece({ workspace }: { workspace: Workspace }) {
  const filters = moduleFilters(workspace);
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

function Tab({ id, current, onSelect, label }: { id: ModuleId; current: ModuleId; onSelect: (id: ModuleId) => void; label: string }) {
  return <button type="button" role="tab" aria-selected={current === id} onClick={() => onSelect(id)}>{label}</button>;
}

function MetricTable({ rows }: { rows: { id: string; label: string; status: string; value?: number; unit: string | null; rank: number | null }[] }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Θέση</th><th>Οντότητα</th><th>Τιμή</th></tr></thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id}>
            <td>{row.rank ?? '—'}</td>
            <td>{row.label}</td>
            <td>{row.status === 'value' ? `${row.value} ${row.unit ?? ''}` : row.status === 'conflict' ? 'σύγκρουση' : 'χωρίς δεδομένα'}</td>
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

function factText(workspace: Workspace, edgeId: string, propertyId: string | undefined, year: number): string {
  if (!propertyId) return 'χωρίς binding';
  const fact = workspace.facts.find(item => item.subjectKind === 'relationship' && item.subjectId === edgeId && item.propertyId === propertyId && item.validFrom === `${year}-01-01` && !workspace.facts.some(newer => newer.supersedesId === item.id));
  if (!fact || fact.value === null) return 'χωρίς δεδομένα';
  const unit = workspace.properties.find(item => item.id === propertyId)?.unit ?? '';
  return `${fact.value} ${unit}`.trim();
}
