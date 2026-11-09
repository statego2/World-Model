import Dexie from 'dexie';
import demo from '../../data/fixtures/workspace.demo.json';
import { validateWorkspace } from '../core/validate.mjs';
const db = new Dexie('world-model');
db.version(1).stores({ workspaces: '&id' });
export function blankWorkspace() { return {formatVersion:1,id:'workspace:personal',label:'Το μοντέλο μου',dataMode:'real',ontologyVersion:1,revision:0,entityTypes:[],relationshipTypes:[],properties:[],entities:[],relationships:[],facts:[],sources:[],savedViews:[],bindings:{}}; }
export async function load(id) { return db.workspaces.get(id); }
export async function all() { return db.workspaces.toArray(); }
export async function create(mode) {
  const w = mode === 'demo' ? structuredClone(demo) : blankWorkspace();
  return db.transaction('rw',db.workspaces,async()=>{ const existing=await db.workspaces.get(w.id); if(existing) return existing; await db.workspaces.add(w); return w; });
}
export async function save(next, expectedRevision) {
  const errors=validateWorkspace(next); if(errors.length) throw new Error(errors.join('\n'));
  return db.transaction('rw',db.workspaces,async()=>{
    const current=await db.workspaces.get(next.id);
    if(!current || current.revision!==expectedRevision) throw new Error('Ο χώρος άλλαξε σε άλλη καρτέλα. Ανανέωσε τη σελίδα πριν συνεχίσεις.');
    const result={...next, revision:expectedRevision+1}; await db.workspaces.put(result); return result;
  });
}
