import { useRef, useState } from 'react';
import worldGeometry from '../../data/geometries/world-countries.json' with { type: 'json' };
import regionGeometry from '../../data/geometries/greek-regions.json' with { type: 'json' };
import regionLinks from '../../data/geometries/region-links.json' with { type: 'json' };
import { readSubjectMetric, runSavedView, type SharedFilters } from '../core/query.ts';
import type { Workspace } from '../core/types.ts';
import { layerAvailability, layerStatusLabel, type LayerAvailability } from './atlas.ts';
import { useAtlas } from './atlas-context.tsx';
import { formatMeasure } from './format.ts';
import { boundsOf, CHOROPLETH, GeoMap, type MapFeature } from './map.tsx';
import { entityLabel } from './lookup.ts';
import { useModel } from './model.tsx';

const WORLD_FEATURES = worldGeometry.features as MapFeature[];
const REGION_FEATURES = regionGeometry.features as MapFeature[];

export function Modules() {
  const model = useModel();
  const atlas = useAtlas();
  const workspace = model.workspace;
  const frame = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ text: string; x: number; y: number } | null>(null);
  if (!workspace) return null;
  const filters = atlas.filters;
  const world = metricValues(workspace, WORLD_FEATURES.map(feature => feature.id), countries(workspace).map(entity => entity.id), workspace.bindings.gdpProperty, filters, isoOf);
  const regions = metricValues(workspace, REGION_FEATURES.map(feature => feature.id), REGION_FEATURES.map(feature => linkedEntity(workspace, feature.id)).filter((id): id is string => Boolean(id)), workspace.bindings.regionalGvaProperty, filters, (space, entityId) => geometryOf(space, entityId));
  const place = (id: string | null, point: { x: number; y: number } | undefined, text: string) => {
    if (!id || !point || !frame.current) {
      setHover(null);
      return;
    }
    const rect = frame.current.getBoundingClientRect();
    setHover({
      text,
      x: Math.min(rect.width - 220, Math.max(8, point.x - rect.left + 14)),
      y: Math.min(rect.height - 46, Math.max(8, point.y - rect.top + 14)),
    });
  };
  return (
    <div className="atlas" ref={frame} data-layer={atlas.layer}>
      {atlas.layer === 'world' ? (
        <World workspace={workspace} filters={filters} values={world.values} unit={world.unit} onHover={place} />
      ) : (
        <Greece workspace={workspace} values={regions.values} unit={regions.unit} onHover={place} />
      )}
      <div className="map-hud left">
        <div className="layer-registry" role="toolbar" aria-label="Επίπεδα">
          <LayerButton id="world" label="Χώρες" availability={world.availability} />
          <LayerButton id="greece" label="Περιφέρειες" availability={regions.availability} />
        </div>
      </div>
      {hover ? <div className="tooltip" style={{ left: hover.x, top: hover.y }}>{hover.text}</div> : null}
      <Legend min={atlas.layer === 'world' ? world.min : regions.min} max={atlas.layer === 'world' ? world.max : regions.max} unit={atlas.layer === 'world' ? world.unit : regions.unit} />
    </div>
  );
}

function LayerButton({ id, label, availability }: { id: 'world' | 'greece'; label: string; availability: LayerAvailability }) {
  const atlas = useAtlas();
  const enabled = atlas.layer === id;
  return (
    <button
      type="button"
      className={enabled ? 'layer-btn on' : 'layer-btn'}
      aria-pressed={enabled}
      data-availability={availability}
      onClick={() => atlas.setLayer(id)}
    >
      <span>{label}</span>
      <small>{layerStatusLabel(availability, enabled)}</small>
    </button>
  );
}

function Legend({ min, max, unit }: { min: number | null; max: number | null; unit: string }) {
  return (
    <div className="map-hud bottom">
      <div className="hud-card legend-card">
        <div className="legend" aria-label="Υπόμνημα">
          {CHOROPLETH.map(color => <i key={color} style={{ background: color }} />)}
          <i className="swatch-zero" title="μηδέν" />
          <i className="swatch-empty" title="κενό" />
        </div>
        <p className="muted legend-caption">{min === null ? 'Χωρίς μετρήσεις σε αυτό το έτος' : `Λογαριθμική κλίμακα · ${formatMeasure(min, unit)} – ${formatMeasure(max ?? min, unit)}`}</p>
        <p className="muted">Χωρίς δεδομένα δεν σημαίνει μηδέν.</p>
      </div>
    </div>
  );
}

export function MapSidePanel() {
  const atlas = useAtlas();
  const model = useModel();
  const workspace = model.workspace;
  if (!workspace) return null;
  return (
    <>
      <p className="eyebrow">Επιθεώρηση</p>
      <div className="side-tools">
        <button type="button" className="quiet" aria-expanded={atlas.dossierOpen} onClick={() => atlas.setDossierOpen(!atlas.dossierOpen)}>Στοιχεία και διαδρομές</button>
        <button type="button" className="quiet" aria-expanded={atlas.filtersOpen} onClick={() => atlas.setFiltersOpen(!atlas.filtersOpen)}>Φίλτρα και ρόλοι</button>
      </div>
      {atlas.focus ? (
        <Selection workspace={workspace} filters={atlas.filters} geometryId={atlas.focus.geometryId} entityId={atlas.focus.entityId} propertyId={atlas.focus.propertyId} onClear={() => atlas.setFocus(null)} />
      ) : <p>Επίλεξε χώρα ή περιφέρεια στον χάρτη.</p>}
      {atlas.dossierOpen ? (
        <>
          <DefenseNote workspace={workspace} filters={atlas.filters} />
          <Capital workspace={workspace} filters={atlas.filters} />
          <RegionNotes workspace={workspace} />
        </>
      ) : null}
      {atlas.filtersOpen ? (
        <div className="side-block" role="group" aria-label="Κοινά φίλτρα">
          <label className="field"><span>Βάση</span>
            <select value={atlas.filters.basis} onChange={event => atlas.setFilters({ ...atlas.filters, basis: event.target.value as SharedFilters['basis'] })}>
              <option value="reported">Τεκμηριωμένο</option>
              <option value="assumption">Υπόθεση</option>
            </select>
          </label>
          <fieldset className="checks">
            <legend>Πηγές</legend>
            {workspace.sources.filter(source => workspace.facts.some(fact => fact.evidenceIds.includes(source.id))).map(source => (
              <label key={source.id}>
                <input type="checkbox" checked={atlas.filters.sourceIds.includes(source.id)} onChange={event => {
                  const sourceIds = event.target.checked ? [...atlas.filters.sourceIds, source.id] : atlas.filters.sourceIds.filter(id => id !== source.id);
                  atlas.setFilters({ ...atlas.filters, sourceIds });
                }} />
                {source.label}
              </label>
            ))}
          </fieldset>
          <BindingEditor workspace={workspace} />
        </div>
      ) : null}
    </>
  );
}

function DefenseNote({ workspace, filters }: { workspace: Workspace; filters: SharedFilters }) {
  const propertyId = workspace.bindings.defenseSpendingProperty;
  const compared = propertyId ? comparePair(workspace, propertyId, filters) : null;
  if (!compared) return <p>Λείπει το binding της αμυντικής δαπάνης.</p>;
  return (
    <div className="side-block">
      {compared.map(row => (
        <p key={row.entityId} data-testid={`milex-${row.entityId}`}>
          {entityLabel(workspace, row.entityId)}: {row.text}
        </p>
      ))}
      <p>Δεν προκύπτει νικητής.</p>
    </div>
  );
}

function comparePair(workspace: Workspace, propertyId: string, filters: SharedFilters): { entityId: string; text: string }[] | null {
  const rows = ['country:GRC', 'country:TUR'].map(entityId => {
    const reading = readSubjectMetric(workspace, 'entity', entityId, propertyId, filters);
    const text = reading.status === 'value' ? formatMeasure(reading.values[0]?.value ?? 0, reading.unit) : reading.status === 'conflict' ? 'σύγκρουση' : 'χωρίς δεδομένα';
    return { entityId, text, status: reading.status };
  });
  if (rows.every(row => row.status === 'missing')) return rows;
  return rows;
}

function World({ workspace, filters, values, unit, onHover }: {
  workspace: Workspace;
  filters: SharedFilters;
  values: Record<string, number | 'none'>;
  unit: string;
  onHover: (id: string | null, point: { x: number; y: number } | undefined, text: string) => void;
}) {
  const atlas = useAtlas();
  return (
    <section className="atlas-layer" aria-label="Παγκόσμιος χάρτης">
      <GeoMap
        key="world"
        features={WORLD_FEATURES}
        idAttribute="data-iso"
        values={values}
        bounds={{ minLon: -180, maxLon: 180, minLat: -56, maxLat: 84 }}
        label={`Παγκόσμιος χάρτης, έτος ${filters.year}`}
        selectedId={atlas.focus?.geometryId ?? null}
        focusZoom={4.5}
        initialCamera={atlas.cameraFor('world')}
        onViewport={camera => atlas.rememberCamera('world', camera)}
        onSelect={id => {
          const entity = countries(workspace).find(item => isoOf(workspace, item.id) === id);
          atlas.setFocus({ geometryId: id, entityId: entity?.id ?? null, propertyId: workspace.bindings.gdpProperty });
        }}
        onHover={(id, point) => {
          if (!id) { onHover(null, point, ''); return; }
          const entity = countries(workspace).find(item => isoOf(workspace, item.id) === id);
          const value = values[id];
          onHover(id, point, `${entity ? entityLabel(workspace, entity.id) : id}: ${typeof value === 'number' ? formatMeasure(value, unit) : 'χωρίς δεδομένα'}`);
        }}
      />
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
    <section className="side-block" aria-label="Κεφάλαια">
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

function Greece({ workspace, values, unit, onHover }: {
  workspace: Workspace;
  values: Record<string, number | 'none'>;
  unit: string;
  onHover: (id: string | null, point: { x: number; y: number } | undefined, text: string) => void;
}) {
  const atlas = useAtlas();
  return (
    <section className="atlas-layer" aria-label="Ελληνική οικονομία">
      <GeoMap
        key="greece"
        features={REGION_FEATURES}
        idAttribute="data-nuts"
        values={values}
        bounds={boundsOf(REGION_FEATURES, { minLon: 19, maxLon: 30, minLat: 34, maxLat: 42 })}
        label="Χάρτης ελληνικών περιφερειών"
        selectedId={atlas.focus?.geometryId ?? null}
        focusZoom={1}
        initialCamera={atlas.cameraFor('greece')}
        onViewport={camera => atlas.rememberCamera('greece', camera)}
        onSelect={id => atlas.setFocus({ geometryId: id, entityId: linkedEntity(workspace, id), propertyId: workspace.bindings.regionalGvaProperty })}
        onHover={(id, point) => onHover(id, point, id ? `${id}: ${typeof values[id] === 'number' ? formatMeasure(values[id] as number, unit) : 'χωρίς δεδομένα'}` : '')}
      />
    </section>
  );
}

function RegionNotes({ workspace }: { workspace: Workspace }) {
  const regions = workspace.entities.filter(entity => entity.typeId === workspace.bindings.regionType);
  return (
    <ul className="plain-list">
      {regions.map(region => {
        const link = regionLinks.links.find(item => item.entityId === region.id);
        return <li key={region.id}>{region.label}: {link ? `γεωμετρία ${link.geometryId}` : 'χωρίς γεωμετρία'}</li>;
      })}
    </ul>
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
    <form aria-label="Ρόλοι εφαρμογών" onSubmit={event => {
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

function linkedEntity(workspace: Workspace, geometryId: string): string | null {
  const present = regionLinks.links.filter(link => link.geometryId === geometryId && workspace.entities.some(entity => entity.id === link.entityId));
  return present.length === 1 ? present[0]?.entityId ?? null : null;
}

function geometryOf(workspace: Workspace, entityId: string): string | null {
  const present = regionLinks.links.filter(link => link.entityId === entityId && workspace.entities.some(entity => entity.id === entityId));
  return present.length === 1 ? present[0]?.geometryId ?? null : null;
}

function countries(workspace: Workspace) {
  return workspace.entities.filter(entity => entity.typeId === workspace.bindings.countryType);
}

function isoOf(workspace: Workspace, entityId: string): string | null {
  const fact = workspace.facts.find(item => item.subjectId === entityId && item.propertyId === 'property:iso3' && typeof item.value === 'string');
  return typeof fact?.value === 'string' ? fact.value : null;
}

function metricValues(
  workspace: Workspace,
  geometryIds: string[],
  entityIds: string[],
  propertyId: string | undefined,
  filters: SharedFilters,
  geometryFor: (workspace: Workspace, entityId: string) => string | null,
): { values: Record<string, number | 'none'>; min: number | null; max: number | null; unit: string; availability: LayerAvailability } {
  const values: Record<string, number | 'none'> = {};
  for (const id of geometryIds) values[id] = 'none';
  const unit = workspace.properties.find(item => item.id === propertyId)?.unit ?? '';
  if (!propertyId) return { values, min: null, max: null, unit, availability: 'unsupported' };
  const numbers: number[] = [];
  for (const entityId of entityIds) {
    const geometryId = geometryFor(workspace, entityId);
    if (!geometryId || !(geometryId in values)) continue;
    const reading = readSubjectMetric(workspace, 'entity', entityId, propertyId, filters);
    if (reading.status !== 'value') continue;
    const value = reading.values[0]?.value;
    if (typeof value !== 'number') continue;
    values[geometryId] = value;
    numbers.push(value);
  }
  return {
    values,
    min: numbers.length > 0 ? Math.min(...numbers) : null,
    max: numbers.length > 0 ? Math.max(...numbers) : null,
    unit,
    availability: layerAvailability(true, numbers.length),
  };
}

function metricText(workspace: Workspace, subjectKind: 'entity' | 'relationship', subjectId: string, propertyId: string | undefined, filters: SharedFilters): string {
  if (!propertyId) return 'χωρίς binding';
  const reading = readSubjectMetric(workspace, subjectKind, subjectId, propertyId, filters);
  if (reading.status === 'conflict') return 'σύγκρουση πηγών, χωρίς επιλογή νικητή';
  if (reading.status !== 'value') return 'χωρίς δεδομένα';
  const factId = reading.values[0]?.factId;
  return `${formatMeasure(reading.values[0]?.value ?? 0, reading.unit)} · ${factId ? sourceNames(workspace, factId) : ''}`.trim();
}

function Selection({ workspace, filters, geometryId, entityId, propertyId, onClear }: {
  workspace: Workspace;
  filters: SharedFilters;
  geometryId: string | null;
  entityId: string | null;
  propertyId?: string;
  onClear: () => void;
}) {
  if (!geometryId) return null;
  const property = propertyId ?? workspace.bindings.gdpProperty;
  const reading = entityId && property ? readSubjectMetric(workspace, 'entity', entityId, property, filters) : null;
  const factId = reading?.values[0]?.factId;
  const neighbors = entityId ? workspace.relationships.filter(edge => edge.fromId === entityId || edge.toId === entityId).slice(0, 8) : [];
  return (
    <section className="side-block" data-testid="map-inspector">
      <h2>{entityId ? entityLabel(workspace, entityId) : geometryId}</h2>
      <p className="metric">{!entityId ? 'Η γεωμετρία δεν έχει ρητή οντότητα.' : !reading || reading.status === 'missing' ? 'Χωρίς δεδομένα. Δεν σημαίνει μηδέν.' : reading.status === 'conflict' ? 'Σύγκρουση πηγών, χωρίς επιλογή νικητή.' : formatMeasure(reading.values[0]?.value ?? 0, reading.unit)}</p>
      {factId ? <p>Πηγή: {sourceNames(workspace, factId)}</p> : null}
      {neighbors.length > 0 ? (
        <ul className="plain-list">
          {neighbors.map(edge => {
            const inbound = edge.toId === entityId;
            const other = inbound ? edge.fromId : edge.toId;
            const type = workspace.relationshipTypes.find(item => item.id === edge.typeId);
            return <li key={edge.id}>{inbound ? '←' : '→'} {entityLabel(workspace, other)} · {type?.label ?? edge.typeId}</li>;
          })}
        </ul>
      ) : <p>Καμία καταγεγραμμένη γειτονιά σε ένα βήμα.</p>}
      <p className="muted">Η γειτονιά δείχνει καταγεγραμμένες σχέσεις, όχι αιτιότητα.</p>
      <button className="quiet" type="button" onClick={onClear}>Καθαρισμός επιλογής</button>
    </section>
  );
}

function sourceNames(workspace: Workspace, factId: string): string {
  const fact = workspace.facts.find(item => item.id === factId);
  if (!fact) return '—';
  return fact.evidenceIds.map(id => workspace.sources.find(source => source.id === id)?.label ?? id).join(', ');
}
