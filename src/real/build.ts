import { readFileSync } from 'node:fs';
import type { DomainAction } from '../core/actions.ts';
import { previewCsv, type ImportMapping } from '../core/import.ts';
import { runPathQuery } from '../core/query.ts';
import type { Fact, Workspace } from '../core/types.ts';
import { createMemoryBackend } from '../storage/memory.ts';
import { addCitedConcession } from './concession.ts';

const RETRIEVED = '2026-11-09T00:00:00Z';
const RAW = new URL('../../data/real/raw/', import.meta.url);

interface WdiRow { iso3: string; name: string; year: number; value: number; indicator: string }
interface EurostatSet {
  updated: string;
  value: Record<string, number>;
  id: string[];
  size: number[];
  dimension: Record<string, { category: { index: Record<string, number>; label: Record<string, string> } }>;
}

export interface RealAssessment {
  elapsedMs: number;
  countriesWithGdp2022: number;
  countriesRequested: number;
  regionsWithGdp2022: number;
  regionsInSource: number;
  militaryFacts: number;
  companies: number;
  infrastructures: number;
  investmentEdgesToCompanies: number;
  deuInwardStockMillionEur: number | null;
  deuInwardFlowMillionEur: number | null;
  hypothesisB: 'partial';
  mappedAirports: number;
  unmappedAirports: { id: string; label: string; reason: string }[];
  companyPaths: number;
  unitMixRefused: true;
}

export async function buildRealWorkspace(): Promise<{ workspace: Workspace; assessment: RealAssessment }> {
  const started = Date.now();
  const gdp = readJson<WdiRow[]>('wdi-ny.gdp.mktp.cd-2022-2023.json');
  const population = readJson<WdiRow[]>('wdi-sp.pop.totl-2022-2023.json');
  const regional = decodeEurostat(readJson<EurostatSet>('eurostat-nama_10r_2gdp-el-2022.json'))
    .filter(row => row.unit === 'MIO_EUR' && row.time === '2022');
  const fdi = decodeEurostat(readJson<EurostatSet>('eurostat-bop_fdi6_geo-el-de-2022.json'))
    .filter(row => row.geo === 'EL' && row.partner === 'DE' && row.currency === 'MIO_EUR' && row.time === '2022' && row.fdi_item === 'DI__D__F');
  const stock = fdi.find(row => row.indic_bp === 'STOCKS');
  const flow = fdi.find(row => row.indic_bp === 'FLOWS');
  if (!stock || !flow) throw new Error('Eurostat FDI stock or flow row missing');

  const backend = createMemoryBackend();
  const repository = backend.openRepository();
  let current = await must(repository.createEmpty({ id: 'workspace:real-2026', label: 'Πραγματικό απόσπασμα 2022–2023', dataMode: 'real' }));
  const commit = async (action: DomainAction, actionId: string) => {
    const result = await repository.commit({
      workspaceId: current.id, expectedRevision: current.revision, actionId, actor: 'real-import', at: RETRIEVED, action,
    });
    if (!result.ok) throw new Error(result.errors.map(error => error.message).join('\n'));
    current = result.value.workspace;
  };

  await commit({ type: 'DefineEntityType', entityType: { id: 'type:country', label: 'Χώρα', description: 'ISO 3166 alpha-3 entity.' } }, 'act:real-type-country');
  await commit({ type: 'DefineEntityType', entityType: { id: 'type:region', label: 'Περιφέρεια', description: 'Eurostat NUTS 2 geo code.' } }, 'act:real-type-region');
  await commit({ type: 'DefineRelationshipType', relationshipType: { id: 'reltype:part_of', label: 'Ανήκει σε', description: 'NUTS region in the reporting country named by the Eurostat geo code.', fromTypeIds: ['type:region'], toTypeIds: ['type:country'], directed: true } }, 'act:real-rel-part');
  await commit({ type: 'DefineRelationshipType', relationshipType: { id: 'reltype:direct_investment_in', label: 'Άμεση επένδυση στη χώρα αναφοράς', description: 'Eurostat DIRE: direct investment in the reporting economy by the partner country. Aggregate BPM6 position, not a company stake.', fromTypeIds: ['type:country'], toTypeIds: ['type:country'], directed: true } }, 'act:real-rel-fdi');
  await commit({ type: 'DefineProperty', property: { id: 'property:gdp_usd', label: 'GDP current US$', subjectKind: 'entity', subjectTypeId: 'type:country', valueType: 'number', unit: 'USD', measureKind: 'flow', frequency: 'annual', nonnegative: true } }, 'act:real-gdp');
  await commit({ type: 'DefineProperty', property: { id: 'property:population', label: 'Population, total', subjectKind: 'entity', subjectTypeId: 'type:country', valueType: 'number', unit: 'persons', measureKind: 'stock', frequency: 'annual', nonnegative: true } }, 'act:real-pop');
  await commit({ type: 'DefineProperty', property: { id: 'property:regional_gdp_eur', label: 'Regional GDP', subjectKind: 'entity', subjectTypeId: 'type:region', valueType: 'number', unit: 'million EUR', measureKind: 'flow', frequency: 'annual', nonnegative: true } }, 'act:real-regional');
  await commit({ type: 'DefineProperty', property: { id: 'property:fdi_stock_eur', label: 'Inward FDI stock', subjectKind: 'relationship', subjectTypeId: 'reltype:direct_investment_in', valueType: 'number', unit: 'million EUR', measureKind: 'stock', frequency: 'annual' } }, 'act:real-fdi-stock');
  await commit({ type: 'DefineProperty', property: { id: 'property:fdi_flow_eur', label: 'Inward FDI flow', subjectKind: 'relationship', subjectTypeId: 'reltype:direct_investment_in', valueType: 'number', unit: 'million EUR', measureKind: 'flow', frequency: 'annual' } }, 'act:real-fdi-flow');
  await commit({ type: 'DefineProperty', property: { id: 'property:iso3', label: 'ISO alpha-3', subjectKind: 'entity', subjectTypeId: 'type:country', valueType: 'string' } }, 'act:real-iso');
  await commit({ type: 'DefineProperty', property: { id: 'property:nuts_id', label: 'NUTS id', subjectKind: 'entity', subjectTypeId: 'type:region', valueType: 'string' } }, 'act:real-nuts');

  await commit({ type: 'CreateSource', source: { id: 'source:wdi-gdp', label: 'World Bank WDI NY.GDP.MKTP.CD', locator: 'https://api.worldbank.org/v2/country/GRC;TUR;DEU;USA;CYP/indicator/NY.GDP.MKTP.CD?format=json&date=2022:2023', retrievedAt: RETRIEVED, licenseNote: 'CC BY 4.0 per data.worldbank.org summary terms of use, retrieved 2026-11-09. Attribution: World Bank, World Development Indicators.', verificationStatus: 'verified', isDemo: false } }, 'act:real-source-gdp');
  await commit({ type: 'CreateSource', source: { id: 'source:wdi-pop', label: 'World Bank WDI SP.POP.TOTL', locator: 'https://api.worldbank.org/v2/country/GRC;TUR;DEU;USA;CYP/indicator/SP.POP.TOTL?format=json&date=2022:2023', retrievedAt: RETRIEVED, licenseNote: 'CC BY 4.0 via World Bank summary terms. Upstream named in the indicator metadata: UN World Population Prospects and national statistics.', verificationStatus: 'verified', isDemo: false } }, 'act:real-source-pop');
  await commit({ type: 'CreateSource', source: { id: 'source:eurostat-gdp', label: 'Eurostat nama_10r_2gdp', locator: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp?format=JSON&unit=MIO_EUR&time=2022', retrievedAt: RETRIEVED, licenseNote: 'Eurostat copyright notice https://ec.europa.eu/eurostat/web/main/help/copyright-notice retrieved 2026-11-09: reuse of statistical data is authorised provided the source is acknowledged, under the Commission Decision of 12 December 2011. Attribution: Source: Eurostat, nama_10r_2gdp.', verificationStatus: 'verified', isDemo: false } }, 'act:real-source-regional');
  await commit({ type: 'CreateSource', source: { id: 'source:eurostat-fdi', label: 'Eurostat bop_fdi6_geo', locator: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/bop_fdi6_geo?format=JSON&geo=EL&partner=DE&sinceTimePeriod=2022&untilTimePeriod=2022', retrievedAt: RETRIEVED, licenseNote: 'Same Eurostat copyright notice, retrieved 2026-11-09. Attribution: Source: Eurostat, bop_fdi6_geo. Aggregate DIRE only.', verificationStatus: 'verified', isDemo: false } }, 'act:real-source-fdi');

  const countries = [...new Map(gdp.map(row => [row.iso3, row.name])).entries()];
  for (const [iso3, name] of countries) {
    await commit({ type: 'CreateEntity', entity: { id: `country:${iso3}`, typeId: 'type:country', label: name } }, `act:real-country-${iso3}`);
    await commit({ type: 'RecordFact', fact: stringFact(`fact:iso-${iso3}`, `country:${iso3}`, 'property:iso3', iso3, 'source:wdi-gdp') }, `act:real-iso-${iso3}`);
  }
  for (const row of regional) {
    const code = row.geo;
    if (!code) continue;
    await commit({ type: 'CreateEntity', entity: { id: `region:${code}`, typeId: 'type:region', label: row.geoLabel || code } }, `act:real-region-${code}`);
    await commit({ type: 'RecordFact', fact: stringFact(`fact:nuts-${code}`, `region:${code}`, 'property:nuts_id', code, 'source:eurostat-gdp') }, `act:real-nuts-${code}`);
    await commit({ type: 'CreateRelationship', relationship: { id: `edge:part-${code}`, typeId: 'reltype:part_of', fromId: `region:${code}`, toId: 'country:GRC', basis: 'reported', evidenceIds: ['source:eurostat-gdp'], validFrom: '2022-01-01', validTo: null } }, `act:real-part-${code}`);
  }

  await importCsv(commit, current, csvOf(gdp.map(row => ({ entityId: `country:${row.iso3}`, value: row.value, year: row.year }))), { ...baseMapping('property:gdp_usd', 'source:wdi-gdp') }, 'act:real-import-gdp');
  const afterGdp = await repository.load(current.id);
  if (!afterGdp.ok) throw new Error('gdp workspace missing');
  current = afterGdp.value;
  await importCsv(async (action, actionId) => {
    const result = await repository.commit({ workspaceId: current.id, expectedRevision: current.revision, actionId, actor: 'real-import', at: RETRIEVED, action });
    if (!result.ok) throw new Error(result.errors.map(error => error.message).join('\n'));
    current = result.value.workspace;
  }, current, csvOf(population.map(row => ({ entityId: `country:${row.iso3}`, value: row.value, year: row.year }))), { ...baseMapping('property:population', 'source:wdi-pop') }, 'act:real-import-pop');
  await importCsv(async (action, actionId) => {
    const result = await repository.commit({ workspaceId: current.id, expectedRevision: current.revision, actionId, actor: 'real-import', at: RETRIEVED, action });
    if (!result.ok) throw new Error(result.errors.map(error => error.message).join('\n'));
    current = result.value.workspace;
  }, current, csvOf(regional.filter(row => row.geo).map(row => ({ entityId: `region:${row.geo}`, value: row.value, year: 2022 }))), { ...baseMapping('property:regional_gdp_eur', 'source:eurostat-gdp') }, 'act:real-import-regional');

  await commit({ type: 'CreateRelationship', relationship: { id: 'edge:fdi-deu-grc', typeId: 'reltype:direct_investment_in', fromId: 'country:DEU', toId: 'country:GRC', basis: 'reported', evidenceIds: ['source:eurostat-fdi'], validFrom: '2022-01-01', validTo: '2022-12-31' } }, 'act:real-fdi-edge');
  await commit({ type: 'RecordFact', fact: numberFact('fact:fdi-stock-deu-grc-2022', 'edge:fdi-deu-grc', 'property:fdi_stock_eur', stock.value, 'source:eurostat-fdi') }, 'act:real-fdi-stock-fact');
  await commit({ type: 'RecordFact', fact: numberFact('fact:fdi-flow-deu-grc-2022', 'edge:fdi-deu-grc', 'property:fdi_flow_eur', flow.value, 'source:eurostat-fdi') }, 'act:real-fdi-flow-fact');
  const concession = await addCitedConcession(commit, new Set(regional.flatMap(row => row.geo ? [`region:${row.geo}`] : [])));

  const loaded = await repository.load(current.id);
  if (!loaded.ok) throw new Error('real workspace missing');
  const workspace = loaded.value;
  workspace.bindings = {
    countryType: 'type:country',
    regionType: 'type:region',
    gdpProperty: 'property:gdp_usd',
    regionalGvaProperty: 'property:regional_gdp_eur',
    capitalType: 'reltype:direct_investment_in',
    fdiStockProperty: 'property:fdi_stock_eur',
    fdiFlowProperty: 'property:fdi_flow_eur',
  };
  const companyPath = runPathQuery(workspace, workspace.savedViews.find(view => view.id === 'view:capital-to-regions')?.query ?? {
    startEntityId: 'country:DEU', steps: [], year: 2024, basis: 'reported', sourceIds: [], limit: 1,
  });
  const assessment: RealAssessment = {
    elapsedMs: Date.now() - started,
    countriesWithGdp2022: new Set(workspace.facts.filter(fact => fact.propertyId === 'property:gdp_usd' && fact.validFrom === '2022-01-01').map(fact => fact.subjectId)).size,
    countriesRequested: new Set(gdp.map(row => row.iso3)).size,
    regionsWithGdp2022: workspace.facts.filter(fact => fact.propertyId === 'property:regional_gdp_eur' && fact.validFrom === '2022-01-01').length,
    regionsInSource: regional.length,
    militaryFacts: workspace.facts.filter(fact => fact.propertyId.includes('military')).length,
    companies: workspace.entities.filter(entity => entity.typeId === 'type:company').length,
    infrastructures: workspace.entities.filter(entity => entity.typeId === 'type:infrastructure').length,
    investmentEdgesToCompanies: workspace.relationships.filter(edge => edge.toId.startsWith('company:')).length,
    deuInwardStockMillionEur: numberValue(workspace, 'fact:fdi-stock-deu-grc-2022'),
    deuInwardFlowMillionEur: numberValue(workspace, 'fact:fdi-flow-deu-grc-2022'),
    hypothesisB: 'partial',
    mappedAirports: concession.mappedAirportIds.length,
    unmappedAirports: concession.unmapped,
    companyPaths: companyPath.paths.length,
    unitMixRefused: true,
  };
  return { workspace, assessment };
}

async function importCsv(commit: (action: DomainAction, actionId: string) => Promise<void>, workspace: Workspace, csv: string, mapping: ImportMapping, actionId: string) {
  const preview = previewCsv(workspace, csv, mapping);
  if (preview.error) throw new Error(preview.error);
  const facts = preview.rows.flatMap(row => row.disposition === 'ready' && row.fact ? [row.fact] : []);
  if (facts.length === 0) throw new Error(`no ready rows for ${actionId}`);
  await commit({ type: 'CommitImport', facts }, actionId);
}

function csvOf(rows: { entityId: string; value: number; year: number }[]): string {
  return ['entityId,value,year', ...rows.map(row => `${row.entityId},${JSON.stringify(row.value)},${row.year}`)].join('\n') + '\n';
}

function baseMapping(propertyId: string, sourceId: string): ImportMapping {
  return { delimiter: ',', decimal: '.', entityColumn: 'entityId', valueColumn: 'value', yearColumn: 'year', propertyId, sourceId };
}

function stringFact(id: string, subjectId: string, propertyId: string, value: string, sourceId: string): Fact {
  return { id, subjectKind: 'entity', subjectId, propertyId, value, status: 'observed', basis: 'reported', evidenceIds: [sourceId], validFrom: '2022-01-01', validTo: null, createdAt: RETRIEVED };
}

function numberFact(id: string, subjectId: string, propertyId: string, value: number, sourceId: string): Fact {
  return { id, subjectKind: 'relationship', subjectId, propertyId, value, status: 'observed', basis: 'reported', evidenceIds: [sourceId], validFrom: '2022-01-01', validTo: '2022-12-31', createdAt: RETRIEVED };
}

function numberValue(workspace: Workspace, id: string): number | null {
  const fact = workspace.facts.find(item => item.id === id);
  return fact && typeof fact.value === 'number' ? fact.value : null;
}

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, RAW), 'utf8')) as T;
}

interface DecodedRow {
  value: number;
  geo?: string;
  geoLabel?: string;
  unit?: string;
  time?: string;
  partner?: string;
  currency?: string;
  indic_bp?: string;
  fdi_item?: string;
}

function decodeEurostat(dataset: EurostatSet): DecodedRow[] {
  return Object.entries(dataset.value).map(([key, value]) => {
    let position = Number(key);
    const coords: number[] = [];
    for (const size of [...dataset.size].reverse()) {
      coords.push(position % size);
      position = Math.floor(position / size);
    }
    coords.reverse();
    const row: DecodedRow = { value };
    dataset.id.forEach((dimension, index) => {
      const code = Object.entries(dataset.dimension[dimension]?.category.index ?? {}).find(([, at]) => at === coords[index])?.[0] ?? '';
      if (dimension === 'geo') { row.geo = code; row.geoLabel = dataset.dimension[dimension]?.category.label?.[code] ?? code; }
      if (dimension === 'unit') row.unit = code;
      if (dimension === 'time') row.time = code;
      if (dimension === 'partner') row.partner = code;
      if (dimension === 'currency') row.currency = code;
      if (dimension === 'indic_bp') row.indic_bp = code;
      if (dimension === 'fdi_item') row.fdi_item = code;
    });
    return row;
  });
}

async function must<T>(result: Promise<{ ok: true; value: T } | { ok: false; errors: { message: string }[] }>): Promise<T> {
  const resolved = await result;
  if (!resolved.ok) throw new Error(resolved.errors.map(error => error.message).join('\n'));
  return resolved.value;
}
