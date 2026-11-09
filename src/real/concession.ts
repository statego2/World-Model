import { readFileSync } from 'node:fs';
import type { DomainAction } from '../core/actions.ts';
import type { Confidence, Fact, Relationship } from '../core/types.ts';

const RETRIEVED = '2026-11-09T00:00:00Z';
const RAW = new URL('../../data/real/raw/', import.meta.url);

interface LocationClaim {
  regionId: string;
  nuts2: string;
  nuts2Name: string;
  nuts3: string;
  nuts3Name: string;
  decisionToken: string;
  nutsToken: string;
  quotation: string;
  confidence: Confidence;
}

interface AirportRow {
  id: string;
  label: string;
  group: 'A' | 'B';
  listToken: string;
  location?: LocationClaim;
  unmappedReason?: string;
  quotation?: string;
}

interface ConcessionDossier {
  sourceId: string;
  label: string;
  locator: string;
  retrievedAt: string;
  licenseNote: string;
  legalName: { quotation: string; value: string; confidence: Confidence };
  seat: { quotation: string; address: string; countryId: string; validFrom: string; confidence: Confidence };
  signedOn: { quotation: string; value: string; validFrom: string; confidence: Confidence };
  term: { quotation: string; distinction: string; value: string; confidence: Confidence };
  controlQuotation: string;
  concessionQuotation: string;
  companies: { id: string; label: string; role: string; group?: 'A' | 'B' }[];
  equity: {
    validFrom: string;
    validTo: string;
    confidence: Confidence;
    agreementQuotation: string;
    quotation: string;
    holders: { fromId: string; percent: number }[];
  };
  airports: AirportRow[];
}

interface NutsDossier {
  sourceId: string;
  label: string;
  locator: string;
  retrievedAt: string;
  licenseNote: string;
  appliesFrom: string;
  rows: { code: string; level: number; name: string; parent?: string }[];
}

export interface ConcessionReport {
  mappedAirportIds: string[];
  unmapped: { id: string; label: string; reason: string }[];
}

export function placeNamesMatch(decisionToken: string, nutsToken: string): boolean {
  const left = stem(decisionToken);
  const right = stem(nutsToken);
  if (left.length < 2 || right.length < 2) return false;
  if (left.includes(right) || right.includes(left)) return true;
  let shared = 0;
  while (shared < left.length && shared < right.length && left[shared] === right[shared]) shared += 1;
  return shared >= 4;
}

export async function addCitedConcession(
  commit: (action: DomainAction, actionId: string) => Promise<void>,
  regionIds: ReadonlySet<string>,
): Promise<ConcessionReport> {
  const hcc = readJson<ConcessionDossier>('hcc-626-2016.json');
  const nuts = readJson<NutsDossier>('nuts-2024-el-excerpt.json');
  const nutsByCode = new Map(nuts.rows.map(row => [row.code, row]));
  if (!hcc.controlQuotation.includes('αποκλειστικού ελέγχου') || !hcc.concessionQuotation.includes('Εταιρία Α')) throw new Error('concession wording missing');
  requireText(hcc.legalName.quotation, hcc.legalName.value, 'legal name');
  requireText(hcc.seat.quotation, hcc.seat.address, 'seat');
  if (!hcc.seat.quotation.includes('Γερμανία')) throw new Error('seat quotation does not name Germany');
  if (!hcc.signedOn.quotation.includes('14.12.2015') || hcc.signedOn.value !== '2015-12-14') throw new Error('signature date is not the quoted 14.12.2015');
  if (!hcc.term.quotation.includes('40') || !hcc.term.distinction.includes('διαφέρει') || /\b20\d\d\b/.test(hcc.term.value)) {
    throw new Error('concession term must keep the undated 40-year clock');
  }

  await commit({ type: 'DefineEntityType', entityType: { id: 'type:company', label: 'Εταιρεία', description: 'Επωνυμία όπως την καταγράφει η πηγή.' } }, 'act:real-type-company');
  await commit({ type: 'DefineEntityType', entityType: { id: 'type:infrastructure', label: 'Υποδομή', description: 'Ονοματισμένη υποδομή, εδώ αεροδρόμιο της απόφασης.' } }, 'act:real-type-infra');
  await commit({ type: 'DefineRelationshipType', relationshipType: { id: 'reltype:based_in', label: 'Έδρα', description: 'Η πηγή δηλώνει τη διεύθυνση έδρας της εταιρείας στη χώρα. Δεν δηλώνει έλεγχο της χώρας.', fromTypeIds: ['type:company'], toTypeIds: ['type:country'], directed: true } }, 'act:real-rel-seat');
  await commit({ type: 'DefineRelationshipType', relationshipType: { id: 'reltype:exclusive_control', label: 'Αποκλειστικός έλεγχος μέσω παραχώρησης', description: 'Εύρημα της Επιτροπής Ανταγωνισμού: αποκλειστικός έλεγχος μέσω των συμβάσεων παραχώρησης. Δεν είναι ποσοστό μετοχών ούτε ιδιοκτησία του ακινήτου.', fromTypeIds: ['type:company'], toTypeIds: ['type:infrastructure'], directed: true } }, 'act:real-rel-control');
  await commit({ type: 'DefineRelationshipType', relationshipType: { id: 'reltype:concession_operator', label: 'Υπογράφουσα παραχωρησιούχος', description: 'Η απόφαση ονομάζει την Εταιρία Α υπογράφουσα της Ομάδας Α και την Εταιρία Β της Ομάδας Β. Είναι η σύμβαση διαχείρισης και λειτουργίας, όχι τίτλος κυριότητας.', fromTypeIds: ['type:company'], toTypeIds: ['type:infrastructure'], directed: true } }, 'act:real-rel-concession');
  await commit({ type: 'DefineRelationshipType', relationshipType: { id: 'reltype:equity_share', label: 'Μετοχική σύνθεση', description: 'Ποσοστό που καταγράφει η απόφαση για τις συμβάσεις μετόχων του 2016. Δεν επιβεβαιώνεται για επόμενα έτη.', fromTypeIds: ['type:company'], toTypeIds: ['type:company'], directed: true } }, 'act:real-rel-equity');
  await commit({ type: 'DefineRelationshipType', relationshipType: { id: 'reltype:located_in', label: 'Βρίσκεται στην περιφέρεια', description: 'Το τοπωνύμιο της απόφασης ταυτίζεται με όνομα NUTS του κανονισμού 2023/674. Δεν είναι χωρική μέτρηση σημείου.', fromTypeIds: ['type:infrastructure'], toTypeIds: ['type:region'], directed: true } }, 'act:real-rel-located');
  await commit({ type: 'DefineProperty', property: { id: 'property:legal_name', label: 'Επωνυμία', subjectKind: 'entity', subjectTypeId: 'type:company', valueType: 'string' } }, 'act:real-prop-name');
  await commit({ type: 'DefineProperty', property: { id: 'property:seat_address', label: 'Διεύθυνση έδρας', subjectKind: 'entity', subjectTypeId: 'type:company', valueType: 'string' } }, 'act:real-prop-seat');
  await commit({ type: 'DefineProperty', property: { id: 'property:concession_signed', label: 'Ημερομηνία υπογραφής παραχώρησης', subjectKind: 'entity', subjectTypeId: 'type:company', valueType: 'date' } }, 'act:real-prop-signed');
  await commit({ type: 'DefineProperty', property: { id: 'property:concession_term', label: 'Διάρκεια παραχώρησης', subjectKind: 'entity', subjectTypeId: 'type:company', valueType: 'string' } }, 'act:real-prop-term');
  await commit({ type: 'DefineProperty', property: { id: 'property:equity_percent', label: 'Μετοχικό ποσοστό', subjectKind: 'relationship', subjectTypeId: 'reltype:equity_share', valueType: 'number', unit: 'percent', nonnegative: true } }, 'act:real-prop-equity');

  await commit({ type: 'CreateSource', source: { id: hcc.sourceId, label: hcc.label, locator: hcc.locator, retrievedAt: hcc.retrievedAt, licenseNote: hcc.licenseNote, verificationStatus: 'verified', isDemo: false } }, 'act:real-source-hcc');
  await commit({ type: 'CreateSource', source: { id: nuts.sourceId, label: nuts.label, locator: nuts.locator, retrievedAt: nuts.retrievedAt, licenseNote: nuts.licenseNote, verificationStatus: 'verified', isDemo: false } }, 'act:real-source-nuts');

  for (const company of hcc.companies) {
    await commit({ type: 'CreateEntity', entity: { id: company.id, typeId: 'type:company', label: company.label } }, `act:real-co-${company.id}`);
  }
  await commit({ type: 'RecordFact', fact: textFact('fact:fraport-legal-name', 'company:fraport-ag', 'property:legal_name', hcc.legalName.value, hcc.sourceId, '2016-01-12', null, hcc.legalName.confidence) }, 'act:real-fact-name');
  await commit({ type: 'RecordFact', fact: textFact('fact:fraport-seat', 'company:fraport-ag', 'property:seat_address', hcc.seat.address, hcc.sourceId, hcc.seat.validFrom, null, hcc.seat.confidence) }, 'act:real-fact-seat');
  await commit({ type: 'RecordFact', fact: textFact('fact:concession-signed', 'company:fraport-ag', 'property:concession_signed', hcc.signedOn.value, hcc.sourceId, hcc.signedOn.validFrom, null, hcc.signedOn.confidence) }, 'act:real-fact-signed');
  await commit({ type: 'RecordFact', fact: textFact('fact:concession-term', 'company:fraport-ag', 'property:concession_term', hcc.term.value, hcc.sourceId, hcc.signedOn.validFrom, null, hcc.term.confidence) }, 'act:real-fact-term');
  await commit({ type: 'CreateRelationship', relationship: edge('edge:seat-fraport-ag', 'reltype:based_in', 'company:fraport-ag', hcc.seat.countryId, [hcc.sourceId], hcc.seat.validFrom, null, hcc.seat.confidence) }, 'act:real-edge-seat');

  const concessionaire = new Map(hcc.companies.filter(company => company.group).map(company => [company.group, company.id]));
  if (concessionaire.get('A') !== 'company:fraport-regional-a' || concessionaire.get('B') !== 'company:fraport-regional-b') {
    throw new Error('concessionaire ids are not the two named companies');
  }
  for (const holder of hcc.equity.holders) {
    if (!hcc.equity.quotation.includes(`${holder.percent}%`)) throw new Error(`equity quotation missing ${holder.percent}`);
    for (const group of ['A', 'B'] as const) {
      const toId = concessionaire.get(group);
      if (!toId) throw new Error(`missing concessionaire ${group}`);
      const edgeId = `edge:equity-${holder.fromId.split(':')[1]}-${group.toLowerCase()}`;
      await commit({ type: 'CreateRelationship', relationship: edge(edgeId, 'reltype:equity_share', holder.fromId, toId, [hcc.sourceId], hcc.equity.validFrom, hcc.equity.validTo, hcc.equity.confidence) }, `act:real-${edgeId}`);
      await commit({ type: 'RecordFact', fact: numberFact(`fact:${edgeId}`, edgeId, holder.percent, hcc.sourceId, hcc.equity.validFrom, hcc.equity.validTo, hcc.equity.confidence) }, `act:real-fact-${edgeId}`);
    }
  }

  const mappedAirportIds: string[] = [];
  const unmapped: ConcessionReport['unmapped'] = [];
  for (const airport of hcc.airports) {
    if (!hcc.controlQuotation.includes(airport.listToken)) throw new Error(`${airport.id} is not in the control quotation`);
    if (Boolean(airport.location) === Boolean(airport.unmappedReason)) throw new Error(`${airport.id} needs exactly one of location or blocker`);
    await commit({ type: 'CreateEntity', entity: { id: airport.id, typeId: 'type:infrastructure', label: airport.label } }, `act:real-${airport.id}`);
    const operator = concessionaire.get(airport.group);
    if (!operator) throw new Error(`${airport.id} has no concessionaire`);
    await commit({ type: 'CreateRelationship', relationship: edge(`edge:control-${slug(airport.id)}`, 'reltype:exclusive_control', 'company:fraport-ag', airport.id, [hcc.sourceId], hcc.signedOn.validFrom, null, 'high') }, `act:real-control-${slug(airport.id)}`);
    await commit({ type: 'CreateRelationship', relationship: edge(`edge:concession-${airport.group.toLowerCase()}-${slug(airport.id)}`, 'reltype:concession_operator', operator, airport.id, [hcc.sourceId], hcc.signedOn.validFrom, null, 'high') }, `act:real-concession-${slug(airport.id)}`);
    if (!airport.location) {
      unmapped.push({ id: airport.id, label: airport.label, reason: airport.unmappedReason ?? '' });
      continue;
    }
    assertLocation(airport.location, nutsByCode, regionIds, nuts.appliesFrom);
    mappedAirportIds.push(airport.id);
    await commit({ type: 'CreateRelationship', relationship: edge(`edge:located-${slug(airport.id)}`, 'reltype:located_in', airport.id, airport.location.regionId, [hcc.sourceId, nuts.sourceId], nuts.appliesFrom, null, airport.location.confidence) }, `act:real-located-${slug(airport.id)}`);
  }

  await commit({ type: 'SaveView', view: {
    id: 'view:capital-to-regions',
    label: 'Χώρα επενδυτή, εταιρεία, αεροδρόμιο, περιφέρεια',
    query: {
      startEntityId: 'country:DEU',
      steps: [
        { relationshipTypeId: 'reltype:based_in', direction: 'in' },
        { relationshipTypeId: 'reltype:exclusive_control', direction: 'out' },
        { relationshipTypeId: 'reltype:located_in', direction: 'out' },
      ],
      year: 2024,
      basis: 'reported',
      sourceIds: [hcc.sourceId, nuts.sourceId],
      limit: 20,
    },
  } }, 'act:real-view-path');

  return { mappedAirportIds, unmapped };
}

function assertLocation(
  location: LocationClaim,
  nutsByCode: Map<string, { code: string; name: string; parent?: string }>,
  regionIds: ReadonlySet<string>,
  appliesFrom: string,
): void {
  const nuts2 = nutsByCode.get(location.nuts2);
  const nuts3 = nutsByCode.get(location.nuts3);
  if (!nuts2 || nuts2.name !== location.nuts2Name) throw new Error(`NUTS 2 row missing for ${location.nuts2}`);
  if (!nuts3 || nuts3.name !== location.nuts3Name || nuts3.parent !== location.nuts2) throw new Error(`NUTS 3 row missing for ${location.nuts3}`);
  if (location.regionId !== `region:${location.nuts2}`) throw new Error(`region id does not match ${location.nuts2}`);
  if (!regionIds.has(location.regionId)) throw new Error(`${location.regionId} is not in the Eurostat extract`);
  if (!location.quotation.includes(location.decisionToken)) throw new Error(`quotation missing ${location.decisionToken}`);
  if (!location.nuts3Name.includes(location.nutsToken) && location.nuts2Name !== location.nutsToken) throw new Error(`NUTS name missing ${location.nutsToken}`);
  if (!placeNamesMatch(location.decisionToken, location.nutsToken)) throw new Error(`${location.decisionToken} does not match ${location.nutsToken}`);
  if (location.confidence === 'high' && !location.quotation.includes(location.nuts2Name)) throw new Error('high confidence location must quote the NUTS 2 name');
  if (appliesFrom !== '2024-01-01') throw new Error('NUTS application date changed');
}

function textFact(id: string, subjectId: string, propertyId: string, value: string, sourceId: string, validFrom: string, validTo: string | null, confidence: Confidence): Fact {
  return { id, subjectKind: 'entity', subjectId, propertyId, value, status: 'observed', basis: 'reported', evidenceIds: [sourceId], validFrom, validTo, createdAt: RETRIEVED, confidence };
}

function numberFact(id: string, subjectId: string, value: number, sourceId: string, validFrom: string, validTo: string, confidence: Confidence): Fact {
  return { id, subjectKind: 'relationship', subjectId, propertyId: 'property:equity_percent', value, status: 'observed', basis: 'reported', evidenceIds: [sourceId], validFrom, validTo, createdAt: RETRIEVED, confidence };
}

function edge(id: string, typeId: string, fromId: string, toId: string, evidenceIds: string[], validFrom: string, validTo: string | null, confidence: Confidence): Relationship {
  return { id, typeId, fromId, toId, basis: 'reported', evidenceIds, validFrom, validTo, confidence };
}

function slug(id: string): string {
  return id.slice(id.indexOf(':') + 1);
}

function requireText(quotation: string, value: string, label: string): void {
  if (!quotation.includes(value) && !value.includes(quotation)) throw new Error(`${label} is not inside its quotation`);
}

function stem(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el');
}

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, RAW), 'utf8')) as T;
}
