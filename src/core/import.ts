import { stableStringify } from './actions.ts';
import type { Fact, Workspace } from './types.ts';

export interface ImportMapping {
  delimiter: ',' | ';';
  decimal: '.' | ',';
  entityColumn: string;
  valueColumn: string;
  yearColumn?: string;
  year?: number;
  propertyId: string;
  sourceId: string;
}

export interface PreviewRow {
  row: number;
  entityId: string;
  disposition: 'ready' | 'duplicate' | 'conflict' | 'unresolved' | 'error';
  message: string;
  fact?: Fact;
}

export function csvCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${guarded.replaceAll('"', '""')}"`;
}

const FILE_LIMIT = 10 * 1024 * 1024;
const PREVIEW_LIMIT = 200;

export function parseCsv(text: string, delimiter: ',' | ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { cell += '"'; index += 1; }
        else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === delimiter) { row.push(cell); cell = ''; continue; }
    if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (char !== '\r') cell += char;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter(item => item.some(value => value.trim() !== ''));
}

export async function importKey(workspaceId: string, fileText: string, mapping: ImportMapping): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableStringify({ workspaceId, fileText, mapping })));
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `act:import-${hex.slice(0, 48)}`;
}

export function previewCsv(workspace: Workspace, fileText: string, mapping: ImportMapping): { rows: PreviewRow[]; error?: string } {
  if (fileText.length > FILE_LIMIT) return { rows: [], error: 'Το αρχείο ξεπερνά τα 10MB.' };
  const table = parseCsv(fileText, mapping.delimiter);
  if (table.length < 2) return { rows: [], error: 'Το CSV χρειάζεται κεφαλίδα και τουλάχιστον μία γραμμή.' };
  const header = table[0]?.map(cell => cell.trim()) ?? [];
  const entityIndex = header.indexOf(mapping.entityColumn);
  const valueIndex = header.indexOf(mapping.valueColumn);
  const yearIndex = mapping.yearColumn ? header.indexOf(mapping.yearColumn) : -1;
  if (entityIndex < 0 || valueIndex < 0 || (mapping.yearColumn && yearIndex < 0)) return { rows: [], error: 'Η αντιστοίχιση δεν βρίσκει όλες τις στήλες.' };
  const property = workspace.properties.find(item => item.id === mapping.propertyId);
  const source = workspace.sources.find(item => item.id === mapping.sourceId);
  if (!property || property.deprecated) return { rows: [], error: 'Η ιδιότητα δεν είναι διαθέσιμη.' };
  if (!source) return { rows: [], error: 'Η πηγή δεν υπάρχει.' };
  if (property.valueType !== 'number') return { rows: [], error: 'Η εισαγωγή μετρήσεων δέχεται αριθμητική ιδιότητα.' };
  const body = table.slice(1);
  if (body.length > PREVIEW_LIMIT) return { rows: [], error: `Η προεπισκόπηση δέχεται έως ${PREVIEW_LIMIT} γραμμές.` };
  const rows = body.map((cells, index) => previewRow(workspace, property, source.retrievedAt, mapping, cells, index + 2, entityIndex, valueIndex, yearIndex));
  return { rows };
}

function previewRow(workspace: Workspace, property: Workspace['properties'][number], createdAt: string, mapping: ImportMapping, cells: string[], row: number, entityIndex: number, valueIndex: number, yearIndex: number): PreviewRow {
  const entityId = cells[entityIndex]?.trim() ?? '';
  const entity = workspace.entities.find(item => item.id === entityId);
  if (!entity) return { row, entityId, disposition: 'unresolved', message: 'Άγνωστο ID. Δεν γίνεται αυτόματη αντιστοίχιση.' };
  if (entity.archived) return { row, entityId, disposition: 'error', message: 'Η οντότητα είναι αρχειοθετημένη.' };
  const rawValue = (cells[valueIndex] ?? '').trim();
  const normalized = mapping.decimal === ',' ? rawValue.replace(',', '.') : rawValue;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { row, entityId, disposition: 'error', message: 'Η τιμή δεν είναι αριθμός.' };
  const yearText = yearIndex >= 0 ? cells[yearIndex]?.trim() : String(mapping.year ?? '');
  const year = Number(yearText);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return { row, entityId, disposition: 'error', message: 'Το έτος δεν είναι έγκυρο.' };
  if (property.subjectKind !== 'entity' || property.subjectTypeId !== entity.typeId) {
    return { row, entityId, disposition: 'error', message: 'Η ιδιότητα δεν ανήκει στον τύπο της οντότητας.' };
  }
  const validFrom = `${year}-01-01`;
  const validTo = property.frequency === 'annual' ? `${year}-12-31` : null;
  const samePeriod = workspace.facts.filter(fact => fact.subjectKind === 'entity' && fact.subjectId === entityId && fact.propertyId === mapping.propertyId && fact.validFrom === validFrom && fact.validTo === validTo && fact.evidenceIds.includes(mapping.sourceId) && !workspace.facts.some(newer => newer.supersedesId === fact.id));
  if (samePeriod.some(fact => fact.value === value)) return { row, entityId, disposition: 'duplicate', message: 'Ίδια τιμή και περίοδος. Δεν δημιουργείται διπλότυπο.' };
  const conflict = samePeriod.find(fact => fact.value !== value);
  const slug = entityId.replaceAll(':', '.');
  const fact: Fact = {
    id: `fact:${conflict ? 'fix' : 'import'}-${row}-${year}-${slug}`,
    subjectKind: 'entity',
    subjectId: entityId,
    propertyId: mapping.propertyId,
    value,
    status: 'observed',
    basis: 'reported',
    evidenceIds: [mapping.sourceId],
    validFrom,
    validTo,
    createdAt,
    ...(conflict ? { supersedesId: conflict.id } : {}),
  };
  if (conflict) return { row, entityId, disposition: 'conflict', message: `Υπάρχει ήδη τιμή ${String(conflict.value)}. Χρειάζεται ρητή διόρθωση.`, fact };
  return { row, entityId, disposition: 'ready', message: 'Έτοιμο για καταγραφή.', fact };
}
