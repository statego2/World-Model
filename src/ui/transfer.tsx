import { useState } from 'react';
import { stableStringify } from '../core/actions.ts';
import { csvCell, importKey, previewCsv, previewEntities, previewRelationships, type ImportMapping, type PreviewRow } from '../core/import.ts';
import { readTransfer } from '../core/transfer.ts';
import type { Workspace } from '../core/types.ts';
import { repository } from '../storage/browser.ts';
import { explain } from './copy.ts';
import { useModel } from './model.tsx';

export function Transfer() {
  const model = useModel();
  const workspace = model.workspace;
  if (!workspace) return null;
  return (
    <div className="stack">
      <header className="stage-head">
        <h1>Μεταφορά</h1>
        <p>Η εξαγωγή είναι το αντίγραφο. Η επαναφορά ανοίγει νέο χώρο και δεν αντικαθιστά τον τρέχοντα.</p>
      </header>
      <ImportCard />
      <ExportCard />
      <RestoreCard />
    </div>
  );
}

function ExportCard() {
  const model = useModel();
  const workspace = model.workspace;
  if (!workspace) return null;
  return (
    <section className="panel">
      <h2>Εξαγωγή</h2>
      <p>Πλήρες JSON με οντολογία, γεγονότα, πηγές και ιστορικό.</p>
      <button className="primary" type="button" onClick={() => void download(workspace.id)}>Λήψη αντιγράφου</button>
      <button className="quiet" type="button" onClick={() => downloadCsv(workspace)}>Λήψη CSV προβολής</button>
    </section>
  );
}

function RestoreCard() {
  const model = useModel();
  const [preview, setPreview] = useState<string>('');
  const [payload, setPayload] = useState<unknown>(null);
  const [id, setId] = useState('workspace:restore');
  const [label, setLabel] = useState('Επαναφορά');
  const [message, setMessage] = useState('');
  return (
    <section className="panel">
      <h2>Επαναφορά</h2>
      <label className="field">
        <span>Αρχείο JSON</span>
        <input type="file" accept="application/json,.json" onChange={async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          let parsed: unknown;
          try { parsed = JSON.parse(text); } catch { setMessage('Το αρχείο δεν είναι JSON.'); setPayload(null); return; }
          const read = readTransfer(parsed);
          if (!read.ok) { setMessage(read.errors.map(error => explain(error.message)).join(' ')); setPayload(null); setPreview(''); return; }
          setPayload(parsed);
          setPreview(`${read.value.workspace.entities.length} οντότητες, ${read.value.workspace.facts.length} γεγονότα, ${read.value.history.length} εγγραφές ιστορικού.`);
          setMessage('');
        }} />
      </label>
      {preview ? <p>{preview}</p> : null}
      {message ? <p className="banner bad" role="alert">{message}</p> : null}
      <div className="form-grid">
        <label className="field"><span>ID νέου χώρου</span><input value={id} onChange={event => setId(event.target.value)} /></label>
        <label className="field"><span>Όνομα νέου χώρου</span><input value={label} onChange={event => setLabel(event.target.value)} /></label>
      </div>
      <button className="primary" type="button" disabled={!payload || model.busy} onClick={() => void (async () => {
        const restored = await repository.restore(payload, { id, label });
        if (!restored.ok) { setMessage(restored.errors.map(error => explain(error.message)).join(' ')); return; }
        await model.reloadCurrent();
        location.hash = `#/workspace/${encodeURIComponent(restored.value.id)}/entities`;
      })()}>Επαναφορά σε νέο χώρο</button>
    </section>
  );
}

function ImportCard() {
  const model = useModel();
  const workspace = model.workspace;
  const [mode, setMode] = useState<'facts' | 'entities' | 'relationships'>('facts');
  const [text, setText] = useState('entityId,value,year\n');
  const [delimiter, setDelimiter] = useState<',' | ';'>(',');
  const [decimal, setDecimal] = useState<'.' | ','>('.');
  const [entityColumn, setEntityColumn] = useState('entityId');
  const [valueColumn, setValueColumn] = useState('value');
  const [yearColumn, setYearColumn] = useState('year');
  const [propertyId, setPropertyId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [previewSignature, setPreviewSignature] = useState('');
  const [message, setMessage] = useState('');
  if (!workspace) return null;
  const mapping: ImportMapping = { delimiter, decimal, entityColumn, valueColumn, yearColumn, propertyId, sourceId };
  return (
    <section className="panel">
      <h2>Εισαγωγή CSV</h2>
      <p>Ακριβές ID. Άγνωστος τύπος ή άκρο μένει εκκρεμές. Πρότυπο αντιστοίχισης έκδοση 1: μετρήσεις entityId,value,year · οντότητες id,typeId,label · συνδέσεις id,typeId,fromId,toId,validFrom,sourceId.</p>
      <label className="field"><span>Είδος</span>
        <select value={mode} onChange={event => { setMode(event.target.value as 'facts' | 'entities' | 'relationships'); setRows([]); setAccepted([]); setPreviewSignature(''); }}>
          <option value="facts">Μετρήσεις</option>
          <option value="entities">Οντότητες</option>
          <option value="relationships">Συνδέσεις</option>
        </select>
      </label>
      <label className="field"><span>CSV</span><textarea value={text} onChange={event => setText(event.target.value)} rows={6} /></label>
      <div className="form-grid">
        <label className="field"><span>Διαχωριστικό</span>
          <select value={delimiter} onChange={event => setDelimiter(event.target.value as ',' | ';')}><option value=",">Κόμμα</option><option value=";">Ελληνικό ερωτηματικό</option></select>
        </label>
        <label className="field"><span>Υποδιαστολή</span>
          <select value={decimal} onChange={event => setDecimal(event.target.value as '.' | ',')}><option value=".">Τελεία</option><option value=",">Κόμμα</option></select>
        </label>
        <label className="field"><span>Στήλη ID</span><input value={entityColumn} onChange={event => setEntityColumn(event.target.value)} /></label>
        <label className="field"><span>Στήλη τιμής</span><input value={valueColumn} onChange={event => setValueColumn(event.target.value)} /></label>
        <label className="field"><span>Στήλη έτους</span><input value={yearColumn} onChange={event => setYearColumn(event.target.value)} /></label>
        <label className="field"><span>Ιδιότητα</span>
          <select value={propertyId} onChange={event => setPropertyId(event.target.value)}>
            <option value="">Επίλεξε</option>
            {workspace.properties.filter(property => property.valueType === 'number' && !property.deprecated).map(property => <option key={property.id} value={property.id}>{property.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Πηγή</span>
          <select value={sourceId} onChange={event => setSourceId(event.target.value)}>
            <option value="">Επίλεξε</option>
            {workspace.sources.map(source => <option key={source.id} value={source.id}>{source.label}</option>)}
          </select>
        </label>
      </div>
      <button className="quiet" type="button" onClick={() => {
        const preview = mode === 'entities'
          ? previewEntities(workspace, text, { delimiter, idColumn: 'id', typeColumn: 'typeId', labelColumn: 'label' })
          : mode === 'relationships'
            ? previewRelationships(workspace, text, { delimiter, idColumn: 'id', typeColumn: 'typeId', fromColumn: 'fromId', toColumn: 'toId', validFromColumn: 'validFrom', sourceColumn: 'sourceId' })
            : previewCsv(workspace, text, mapping);
        setMessage(preview.error ?? '');
        setRows(preview.rows);
        setAccepted(preview.rows.flatMap(row => row.disposition === 'ready' ? [row.fact?.id ?? row.entity?.id ?? row.relationship?.id ?? ''] : []).filter(Boolean));
        setPreviewSignature(stableStringify({ text, mapping, mode }));
      }}>Προεπισκόπηση</button>
      {message ? <p className="banner bad" role="alert">{message}</p> : null}
      {rows.length > 0 ? (
        <div className="table-wrap"><table>
          <thead><tr><th></th><th>Γραμμή</th><th>ID</th><th>Κατάσταση</th></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${row.row}-${row.entityId}`}>
                <td>{row.disposition === 'ready' && (row.fact || row.entity || row.relationship) ? <input type="checkbox" checked={accepted.includes(row.fact?.id ?? row.entity?.id ?? row.relationship?.id ?? '')} onChange={event => {
                  const id = row.fact?.id ?? row.entity?.id ?? row.relationship?.id ?? '';
                  setAccepted(current => event.target.checked ? [...current, id] : current.filter(item => item !== id));
                }} aria-label={`Συμπερίληψη γραμμής ${row.row}`} /> : null}</td>
                <td>{row.row}</td>
                <td className="mono">{row.entityId || '—'}</td>
                <td>{labelFor(row.disposition)}. {row.message}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : null}
      {previewSignature && previewSignature !== stableStringify({ text, mapping, mode }) ? <p role="status">Η προεπισκόπηση δεν ταιριάζει πλέον με το αρχείο ή την αντιστοίχιση. Ξανατρέξε την πριν την καταγραφή.</p> : null}
      <button className="primary" type="button" disabled={model.busy || accepted.length === 0 || previewSignature !== stableStringify({ text, mapping, mode })} onClick={() => void (async () => {
        const facts = rows.flatMap(row => row.fact && accepted.includes(row.fact.id) ? [row.fact] : []);
        const entities = rows.flatMap(row => row.entity && accepted.includes(row.entity.id) ? [row.entity] : []);
        const relationships = rows.flatMap(row => row.relationship && accepted.includes(row.relationship.id) ? [row.relationship] : []);
        const key = await importKey(workspace.id, text, { ...mapping, mode });
        const committed = await repository.commit({
          workspaceId: workspace.id,
          expectedRevision: workspace.revision,
          actionId: key,
          actor: 'local-user',
          at: new Date().toISOString(),
          action: mode === 'facts' ? { type: 'CommitImport', facts } : { type: 'CommitRecords', entities, relationships },
        });
        if (!committed.ok) { setMessage(committed.errors.map(error => explain(error.message)).join(' ')); return; }
        setMessage(committed.value.replayed ? 'Η ίδια εισαγωγή είχε ήδη καταγραφεί.' : `Καταγράφηκαν ${committed.value.changedIds.length} γεγονότα.`);
        await model.reloadCurrent();
      })()}>Καταγραφή εισαγωγής</button>
    </section>
  );
}

async function download(id: string) {
  const exported = await repository.exportSnapshot(id);
  if (!exported.ok) return;
  saveBlob(`${id.replaceAll(':', '-')}.world-model.json`, JSON.stringify(exported.value, null, 2), 'application/json');
}

function downloadCsv(workspace: Workspace) {
  const lines = [['entityId', 'propertyId', 'value', 'validFrom', 'validTo'].map(csvCell).join(',')];
  for (const fact of workspace.facts) {
    lines.push([fact.subjectId, fact.propertyId, fact.value === null ? '' : String(fact.value), fact.validFrom, fact.validTo ?? ''].map(csvCell).join(','));
  }
  saveBlob(`${workspace.id.replaceAll(':', '-')}-facts.csv`, lines.join('\n'), 'text/csv');
}

function saveBlob(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function labelFor(disposition: PreviewRow['disposition']): string {
  if (disposition === 'ready') return 'Νέο';
  if (disposition === 'duplicate') return 'Διπλότυπο';
  if (disposition === 'conflict') return 'Σύγκρουση';
  if (disposition === 'unresolved') return 'Εκκρεμές';
  return 'Σφάλμα';
}
