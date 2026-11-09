import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateWorkspace } from '../src/core/validate.mjs';
const original = JSON.parse(readFileSync(new URL('../data/fixtures/workspace.demo.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(original);
const valid = w => assert.deepEqual(validateWorkspace(w), []);
const invalid = (w, phrase) => assert.ok(validateWorkspace(w).some(x => x.includes(phrase)), validateWorkspace(w).join('\n'));

test('synthetic workspace has coherent references and metric semantics', () => valid(fresh()));
test('unknown format cannot be treated as supported', () => {
  const w = fresh(); w.formatVersion = 99; invalid(w, 'formatVersion');
});
test('new entity type, property and relation require no validator enum change', () => {
  const w = fresh();
  w.entityTypes.push({ id:'type:supplier', label:'Προμηθευτής', description:'User-defined type' });
  w.properties.push({ id:'property:capacity', label:'Capacity', subjectKind:'entity', subjectTypeId:'type:supplier', valueType:'number', unit:'MW', nonnegative:true });
  w.relationshipTypes.push({ id:'reltype:supplies', label:'Προμηθεύει', description:'User-defined relation', fromTypeIds:['type:supplier'], toTypeIds:['type:infrastructure'], directed:true });
  w.entities.push({ id:'supplier:custom', typeId:'type:supplier', label:'Custom supplier' });
  w.relationships.push({ id:'edge:custom-supply', typeId:'reltype:supplies', fromId:'supplier:custom', toId:'infra:TERMINAL', basis:'reported', evidenceIds:['source:demo-links'], validFrom:'2023-01-01', validTo:null });
  w.facts.push({ id:'fact:capacity', subjectKind:'entity', subjectId:'supplier:custom', propertyId:'property:capacity', value:300, status:'observed', basis:'reported', evidenceIds:['source:demo-links'], validFrom:'2023-01-01', validTo:null, createdAt:'2026-11-09T00:00:00Z' });
  valid(w);
  assert.deepEqual(JSON.parse(JSON.stringify(w)), w); // Portable snapshot, not an IndexedDB test.
});
test('relationship must match its declared endpoint types', () => {
  const w = fresh(); w.relationships[0].fromId = 'region:ATT'; invalid(w, 'endpoint type');
});
test('unresolved entity reference is rejected', () => {
  const w = fresh(); w.relationships[0].toId = 'company:unknown'; invalid(w, 'unresolved');
});
test('evidence is required on claims', () => {
  const w = fresh(); w.facts[0].evidenceIds = []; invalid(w, 'evidence');
});
test('demo evidence cannot silently enter real workspace', () => {
  const w = fresh(); w.dataMode = 'real'; invalid(w, 'demo/real mismatch');
});
test('property owner prevents country metrics on a company', () => {
  const w = fresh(); w.facts[0].subjectId = 'company:EXAMPLE'; invalid(w, 'subject/property');
});
test('missing value stays distinct from numeric zero', () => {
  const w = fresh(); const missing = w.facts.find(f => f.status === 'missing');
  assert.equal(missing.value, null); missing.value = 0; invalid(w, 'missing requires null');
  missing.status = 'observed'; valid(w);
});
test('numbers must be finite and match primitive type', () => {
  const w = fresh(); w.facts[0].value = '123'; invalid(w, 'value type');
  w.facts[0].value = Infinity; invalid(w, 'value type');
});
test('annual metric must cover the declared whole calendar year', () => {
  const w = fresh(); w.facts[0].validTo = '2023-03-31'; invalid(w, 'annual period');
});
test('edge metrics cannot extend beyond the relationship validity', () => {
  const w = fresh(); w.relationships.find(r => r.id === 'edge:capital-DEU-GRC').validTo = '2022-12-31';
  invalid(w, 'outside relationship validity');
});
test('invalid calendar date and reversed validity are rejected', () => {
  const w = fresh(); w.relationships[0].validFrom = '2023-02-30'; invalid(w, 'invalid period');
  w.relationships[0].validFrom = '2024-01-01'; w.relationships[0].validTo = '2023-12-31'; invalid(w, 'reversed period');
});
test('FDI flow may be negative while population cannot', () => {
  const w = fresh(); assert.ok(w.facts.some(f => f.propertyId === 'property:fdi_flow' && f.value < 0)); valid(w);
  w.facts.find(f => f.propertyId === 'property:population').value = -1; invalid(w, 'negative value');
});
test('correction preserves same key/source and rejects changed units/property', () => {
  const w = fresh(); const old = w.facts[0];
  const correction = { ...structuredClone(old), id:'fact:correction', value:42, supersedesId:old.id, createdAt:'2026-11-10T00:00:00Z' };
  w.facts.push(correction); valid(w);
  correction.evidenceIds = ['source:demo-links']; invalid(w, 'invalid supersedes');
});
test('branched corrections are rejected instead of silently choosing a winner', () => {
  const w = fresh(); const old = w.facts[0];
  for (const n of [1,2]) w.facts.push({ ...structuredClone(old), id:'fact:correction:'+n, value:n, supersedesId:old.id, createdAt:'2026-11-10T00:00:00Z' });
  invalid(w, 'branched correction');
});
test('correction cycle is rejected and validator terminates', () => {
  const w = fresh(); const old = w.facts[0];
  const correction = { ...structuredClone(old), id:'fact:correction', value:42, supersedesId:old.id };
  old.supersedesId = correction.id; w.facts.push(correction); invalid(w, 'correction cycle');
});
test('duplicate identity and stale query bindings are rejected', () => {
  const w = fresh(); w.entities.push(structuredClone(w.entities[0])); invalid(w, 'duplicate id');
  const q = fresh(); q.savedViews[0].query.steps[0].relationshipTypeId='reltype:unknown'; invalid(q, 'invalid query step');
});
test('metric units, meaning and query limits are explicit', () => {
  const w = fresh(); delete w.properties[0].unit; invalid(w, 'metric semantics');
  const q = fresh(); q.savedViews[0].query.limit = 1001; invalid(q, 'query bounds');
});
test('malformed document reports errors without interpreting it as a workspace', () => {
  invalid(null, 'object'); invalid({ formatVersion:1 }, 'entities must be an array');
});
