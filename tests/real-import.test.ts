import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { applyAction } from '../src/core/actions.ts';
import { previewCsv } from '../src/core/import.ts';
import { compareEntities, rankEntities } from '../src/core/query.ts';
import { buildRealWorkspace } from '../src/real/build.ts';

test('real imports stay separate from the demo and match the retrieved files', async () => {
  const { workspace, assessment } = await buildRealWorkspace();
  assert.equal(workspace.dataMode, 'real');
  assert.equal(workspace.sources.every(source => source.isDemo === false), true);
  assert.equal(workspace.sources.some(source => source.id.startsWith('source:demo')), false);
  const gdp = JSON.parse(readFileSync(new URL('../data/real/raw/wdi-ny.gdp.mktp.cd-2022-2023.json', import.meta.url), 'utf8')) as { iso3: string; year: number; value: number }[];
  for (const row of gdp) {
    const fact = workspace.facts.find(item => item.subjectId === `country:${row.iso3}` && item.propertyId === 'property:gdp_usd' && item.validFrom === `${row.year}-01-01`);
    assert.equal(fact?.value, row.value);
    assert.deepEqual(fact?.evidenceIds, ['source:wdi-gdp']);
  }
  const regional = workspace.facts.filter(fact => fact.propertyId === 'property:regional_gdp_eur');
  assert.equal(regional.length, 13);
  assert.equal(assessment.countriesWithGdp2022, assessment.countriesRequested);
  assert.equal(assessment.regionsWithGdp2022, assessment.regionsInSource);
  assert.equal(assessment.militaryFacts, 0);
  assert.equal(assessment.companies, 0);
  assert.equal(assessment.infrastructures, 0);
  assert.equal(assessment.investmentEdgesToCompanies, 0);
  assert.equal(assessment.hypothesisB, 'unproven');
  assert.equal(assessment.elapsedMs < 5000, true);

  const rawFdi = JSON.parse(readFileSync(new URL('../data/real/raw/eurostat-bop_fdi6_geo-el-de-2022.json', import.meta.url), 'utf8')) as { value: Record<string, number> };
  assert.equal(typeof assessment.deuInwardStockMillionEur, 'number');
  assert.ok(Object.values(rawFdi.value).includes(assessment.deuInwardStockMillionEur as number));
  assert.ok(Object.values(rawFdi.value).includes(assessment.deuInwardFlowMillionEur as number));
  const stock = workspace.facts.find(fact => fact.id === 'fact:fdi-stock-deu-grc-2022');
  const flow = workspace.facts.find(fact => fact.id === 'fact:fdi-flow-deu-grc-2022');
  assert.notEqual(stock?.propertyId, flow?.propertyId);
  assert.equal(workspace.properties.find(item => item.id === stock?.propertyId)?.unit, 'million EUR');
  assert.equal(workspace.properties.find(item => item.id === 'property:gdp_usd')?.unit, 'USD');

  const blank = previewCsv(workspace, 'entityId,value,year\ncountry:GRC,,2024\n', { delimiter: ',', decimal: '.', entityColumn: 'entityId', valueColumn: 'value', yearColumn: 'year', propertyId: 'property:gdp_usd', sourceId: 'source:wdi-gdp' });
  assert.equal(blank.rows[0]?.disposition, 'error');
  const unknown = previewCsv(workspace, 'entityId,value,year\ncountry:ZZZ,1,2022\n', { delimiter: ',', decimal: '.', entityColumn: 'entityId', valueColumn: 'value', yearColumn: 'year', propertyId: 'property:gdp_usd', sourceId: 'source:wdi-gdp' });
  assert.equal(unknown.rows[0]?.disposition, 'unresolved');
  const again = previewCsv(workspace, ['entityId,value,year', ...gdp.map(row => `country:${row.iso3},${JSON.stringify(row.value)},${row.year}`)].join('\n'), { delimiter: ',', decimal: '.', entityColumn: 'entityId', valueColumn: 'value', yearColumn: 'year', propertyId: 'property:gdp_usd', sourceId: 'source:wdi-gdp' });
  assert.equal(again.rows.every(row => row.disposition === 'duplicate'), true);

  const demoLeak = applyAction(workspace, { type: 'CreateSource', source: { id: 'source:fake-demo', label: 'Διαρροή', locator: 'https://example.invalid/demo', retrievedAt: '2026-11-09T00:00:00Z', licenseNote: 'demo', verificationStatus: 'candidate', isDemo: true } });
  assert.equal(demoLeak.ok, false);

  const ranked = rankEntities(workspace, workspace.entities.filter(entity => entity.typeId === 'type:region').map(entity => entity.id), 'property:regional_gdp_eur', { year: 2022, basis: 'reported', sourceIds: ['source:eurostat-gdp'] });
  assert.equal(ranked.ok, true);
  if (!ranked.ok) return;
  const top = ranked.rows.find(row => row.rank === 1);
  const max = Math.max(...regional.map(fact => fact.value as number));
  assert.equal(top?.values[0]?.value, max);
  const countryOnRegionalScale = compareEntities(workspace, ['country:GRC', 'country:DEU'], 'property:regional_gdp_eur', { year: 2022, basis: 'reported', sourceIds: ['source:eurostat-gdp'] });
  assert.equal(countryOnRegionalScale.ok, true);
  if (countryOnRegionalScale.ok) assert.equal(countryOnRegionalScale.rows.every(row => row.status === 'missing'), true);
});
