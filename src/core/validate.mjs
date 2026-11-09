/** Starter domain validator, not a complete JSON Schema or untrusted-file boundary. */
export function validateWorkspace(w) {
  const errors = [];
  const fail = message => errors.push(message);
  const text = v => typeof v === 'string' && v.trim().length > 0;
  const date = v => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + 'T00:00:00Z');
    return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === v;
  };
  const datetime = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v) &&
    date(v.slice(0, 10)) && Number.isFinite(Date.parse(v));
  if (!w || typeof w !== 'object' || Array.isArray(w)) return ['workspace must be an object'];
  if (w.formatVersion !== 1) fail('unsupported formatVersion');
  if (!text(w.id) || !text(w.label)) fail('workspace id/label required');
  if (!['demo', 'real'].includes(w.dataMode)) fail('invalid dataMode');
  if (!Number.isInteger(w.revision) || w.revision < 0) fail('invalid revision');
  if (!Number.isInteger(w.ontologyVersion) || w.ontologyVersion < 1) fail('invalid ontologyVersion');
  const names = ['entityTypes','relationshipTypes','properties','entities','relationships','facts','sources','savedViews'];
  const maps = {};
  const allIds = new Set();
  for (const name of names) {
    if (!Array.isArray(w[name])) { fail(`${name} must be an array`); maps[name] = new Map(); continue; }
    maps[name] = new Map();
    for (const row of w[name]) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || !text(row.id)) {
        fail(`${name}: invalid record/id`); continue;
      }
      if (allIds.has(row.id)) fail(`duplicate id: ${row.id}`);
      allIds.add(row.id);
      maps[name].set(row.id, row);
    }
  }
  const rows = name => [...maps[name].values()];
  const has = (name, id) => maps[name].has(id);
  const list = (value, context, exists) => {
    if (!Array.isArray(value) || value.length === 0) { fail(`${context}: nonempty list required`); return; }
    if (new Set(value).size !== value.length) fail(`${context}: duplicate reference`);
    for (const id of value) if (!exists(id)) fail(`${context}: unknown reference ${id}`);
  };
  const period = row => {
    if (!date(row.validFrom) || !(row.validTo === null || date(row.validTo))) fail(`${row.id}: invalid period`);
    if (row.validTo !== null && row.validTo < row.validFrom) fail(`${row.id}: reversed period`);
  };
  const claim = row => {
    period(row);
    if (!['reported','assumption'].includes(row.basis)) fail(`${row.id}: invalid basis`);
    list(row.evidenceIds, `${row.id} evidence`, id => has('sources', id));
  };
  for (const type of rows('entityTypes')) {
    if (!text(type.label) || typeof type.description !== 'string') fail(`${type.id}: invalid type metadata`);
  }
  for (const type of rows('relationshipTypes')) {
    if (!text(type.label) || typeof type.description !== 'string' || type.directed !== true) fail(`${type.id}: invalid relationship type`);
    list(type.fromTypeIds, `${type.id} from types`, id => has('entityTypes', id));
    list(type.toTypeIds, `${type.id} to types`, id => has('entityTypes', id));
  }
  for (const p of rows('properties')) {
    if (!text(p.label)) fail(`${p.id}: property label required`);
    const ownerMap = p.subjectKind === 'entity' ? 'entityTypes' : p.subjectKind === 'relationship' ? 'relationshipTypes' : null;
    if (!ownerMap || !has(ownerMap, p.subjectTypeId)) fail(`${p.id}: invalid property owner`);
    if (!['string','number','boolean','date'].includes(p.valueType)) fail(`${p.id}: invalid primitive`);
    if (p.measureKind !== undefined) {
      if (p.valueType !== 'number' || !['stock','flow','ratio','count'].includes(p.measureKind) || !text(p.unit) || p.frequency !== 'annual') fail(`${p.id}: invalid metric semantics`);
    } else if (p.frequency !== undefined) fail(`${p.id}: frequency requires metric`);
    if (p.unit !== undefined && (p.valueType !== 'number' || !text(p.unit))) fail(`${p.id}: invalid unit`);
    if (p.nonnegative !== undefined && (p.valueType !== 'number' || typeof p.nonnegative !== 'boolean')) fail(`${p.id}: invalid nonnegative constraint`);
  }
  for (const source of rows('sources')) {
    if (!text(source.label) || !text(source.locator) || !text(source.licenseNote) || !datetime(source.retrievedAt)) fail(`${source.id}: incomplete source`);
    if (!['candidate','verified','blocked'].includes(source.verificationStatus)) fail(`${source.id}: invalid source status`);
    if (typeof source.isDemo !== 'boolean' || source.isDemo !== (w.dataMode === 'demo')) fail(`${source.id}: demo/real mismatch`);
  }
  for (const e of rows('entities')) {
    if (!has('entityTypes', e.typeId) || !text(e.label)) fail(`${e.id}: invalid entity type/label`);
  }
  for (const rel of rows('relationships')) {
    claim(rel);
    const type = maps.relationshipTypes.get(rel.typeId);
    const from = maps.entities.get(rel.fromId), to = maps.entities.get(rel.toId);
    if (!type || !from || !to) { fail(`${rel.id}: unresolved relationship`); continue; }
    if (!Array.isArray(type.fromTypeIds) || !type.fromTypeIds.includes(from.typeId) || !Array.isArray(type.toTypeIds) || !type.toTypeIds.includes(to.typeId)) fail(`${rel.id}: endpoint type mismatch`);
    if (rel.fromId === rel.toId) fail(`${rel.id}: self link forbidden in v1`);
  }
  for (const f of rows('facts')) {
    claim(f);
    if (!datetime(f.createdAt)) fail(`${f.id}: invalid createdAt`);
    const p = maps.properties.get(f.propertyId);
    const subjects = f.subjectKind === 'entity' ? maps.entities : f.subjectKind === 'relationship' ? maps.relationships : new Map();
    const subject = subjects.get(f.subjectId);
    if (!p || !subject || p.subjectKind !== f.subjectKind || p.subjectTypeId !== subject.typeId) fail(`${f.id}: subject/property mismatch`);
    if (f.subjectKind === 'relationship' && subject &&
        (f.validFrom < subject.validFrom ||
         (subject.validTo !== null && (f.validTo === null || f.validTo > subject.validTo)))) {
      fail(`${f.id}: fact outside relationship validity`);
    }
    if (!['observed','estimated','provisional','missing'].includes(f.status)) fail(`${f.id}: invalid status`);
    if (f.status === 'missing') {
      if (f.value !== null) fail(`${f.id}: missing requires null`);
    } else if (p) {
      const valid = p.valueType === 'date' ? date(f.value) : typeof f.value === p.valueType && (p.valueType !== 'number' || Number.isFinite(f.value));
      if (!valid) fail(`${f.id}: value type mismatch`);
      if (p.nonnegative && typeof f.value === 'number' && f.value < 0) fail(`${f.id}: negative value`);
    }
    if (p?.frequency === 'annual' && !(date(f.validFrom) && f.validFrom.endsWith('-01-01') && f.validTo === f.validFrom.slice(0, 4) + '-12-31')) fail(`${f.id}: annual period required`);
    if (f.supersedesId !== undefined) {
      const old = maps.facts.get(f.supersedesId);
      const same = old && ['subjectKind','subjectId','propertyId','validFrom','validTo','basis'].every(k => old[k] === f[k]);
      const sameEvidence = old && Array.isArray(old.evidenceIds) && Array.isArray(f.evidenceIds) && JSON.stringify([...old.evidenceIds].sort()) === JSON.stringify([...f.evidenceIds].sort());
      if (!same || !sameEvidence || old.createdAt > f.createdAt || old.id === f.id) fail(`${f.id}: invalid supersedes`);
    }
  }
  const successors = new Set();
  for (const f of rows('facts')) {
    if (f.supersedesId) {
      if (successors.has(f.supersedesId)) fail(`${f.id}: branched correction`);
      successors.add(f.supersedesId);
    }
    const seen = new Set([f.id]);
    let previous = f.supersedesId;
    while (previous && has('facts', previous)) {
      if (seen.has(previous)) { fail(`${f.id}: correction cycle`); break; }
      seen.add(previous); previous = maps.facts.get(previous).supersedesId;
    }
  }
  for (const view of rows('savedViews')) {
    const q = view.query;
    if (!text(view.label) || !q || typeof q !== 'object') { fail(`${view.id}: invalid saved view`); continue; }
    if (!has('entities', q.startEntityId)) fail(`${view.id}: query start missing`);
    if (!Array.isArray(q.steps) || q.steps.length < 1 || q.steps.length > 4) fail(`${view.id}: invalid path length`);
    else for (const step of q.steps) if (!step || !has('relationshipTypes', step.relationshipTypeId) || !['out','in'].includes(step.direction)) fail(`${view.id}: invalid query step`);
    if (!Number.isInteger(q.year) || q.year < 1900 || q.year > 2100 || !Number.isInteger(q.limit) || q.limit < 1 || q.limit > 1000 || !['reported','assumption'].includes(q.basis)) fail(`${view.id}: invalid query bounds`);
    list(q.sourceIds, `${view.id} sources`, id => has('sources', id));
  }
  if (!w.bindings || typeof w.bindings !== 'object' || Array.isArray(w.bindings)) fail('bindings must be an object');
  else for (const [role, id] of Object.entries(w.bindings)) if (!text(role) || !(has('entityTypes', id) || has('relationshipTypes', id) || has('properties', id))) fail(`invalid binding: ${role}`);
  return errors;
}
