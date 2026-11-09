import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DomainAction } from '../core/actions.ts';
import type { DomainError } from '../core/errors.ts';
import type { Workspace } from '../core/types.ts';
import type { ChangeRecord } from '../storage/records.ts';
import type { WorkspaceSummary } from '../storage/repository.ts';
import { repository } from '../storage/browser.ts';

export type Section = 'ontology' | 'entities' | 'relationships' | 'facts' | 'sources' | 'transfer' | 'explore' | 'modules';

export type Selection =
  | { kind: 'entity' | 'relationship' | 'source' | 'entityType' | 'relationshipType' | 'property'; id: string };

interface Model {
  summaries: WorkspaceSummary[];
  workspace: Workspace | null;
  history: ChangeRecord[];
  section: Section | 'home';
  selection: Selection | null;
  status: string;
  errors: DomainError[];
  conflict: boolean;
  busy: boolean;
  setSelection: (selection: Selection | null) => void;
  navigate: (section: Section) => void;
  createEmpty: (input: { id: string; label: string }) => Promise<boolean>;
  loadDemo: (payload: unknown) => Promise<boolean>;
  loadCited: (payload: unknown) => Promise<boolean>;
  open: (id: string) => Promise<void>;
  commit: (action: DomainAction) => Promise<boolean>;
  goHome: () => void;
  reloadCurrent: () => Promise<void>;
}

const ModelContext = createContext<Model | null>(null);

export function useModel(): Model {
  const model = useContext(ModelContext);
  if (!model) throw new Error('model missing');
  return model;
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [summaries, setSummaries] = useState<WorkspaceSummary[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [history, setHistory] = useState<ChangeRecord[]>([]);
  const [section, setSection] = useState<Section | 'home'>('home');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [status, setStatus] = useState('Έτοιμο.');
  const [errors, setErrors] = useState<DomainError[]>([]);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const workspaceRef = useRef<Workspace | null>(null);

  const remember = (next: Workspace | null) => {
    workspaceRef.current = next;
    setWorkspace(next);
  };

  const open = async (id: string) => {
    const loaded = await repository.load(id);
    if (!loaded.ok) {
      setErrors(loaded.errors);
      setStatus('Ο χώρος δεν φορτώθηκε.');
      return;
    }
    remember(loaded.value);
    setHistory(await repository.history(id));
    setConflict(false);
    setErrors([]);
    setStatus(`Φορτώθηκε η αναθεώρηση ${loaded.value.revision}.`);
  };

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const route = readRoute();
      setSection(route.section);
      if (!route.id) {
        if (!cancelled) remember(null);
        return;
      }
      if (workspaceRef.current?.id === route.id) return;
      const loaded = await repository.load(route.id);
      if (cancelled) return;
      if (!loaded.ok) {
        setErrors(loaded.errors);
        return;
      }
      remember(loaded.value);
      setHistory(await repository.history(route.id));
    };
    void repository.list().then(items => { if (!cancelled) setSummaries(items); });
    void sync();
    const onHash = () => { void sync(); };
    window.addEventListener('hashchange', onHash);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const model = useMemo<Model>(() => ({
    summaries, workspace, history, section, selection, status, errors, conflict, busy, setSelection,
    navigate(next) {
      if (!workspace) return;
      location.hash = routeHash(workspace.id, next);
    },
    async createEmpty(input) {
      setBusy(true);
      setErrors([]);
      try {
        const result = await repository.createEmpty({ ...input, dataMode: 'real' });
        if (!result.ok) {
          setErrors(result.errors);
          setStatus('Ο χώρος δεν δημιουργήθηκε.');
          return false;
        }
        setSummaries(await repository.list());
        location.hash = routeHash(result.value.id, 'ontology');
        return true;
      } finally {
        setBusy(false);
      }
    },
    async loadCited(payload) {
      setBusy(true);
      setErrors([]);
      const record = payload as { id?: string; label?: string };
      const id = record.id || 'workspace:real-2026';
      const label = record.label || 'Πραγματικό απόσπασμα';
      try {
        const restored = await repository.restore(payload, { id, label });
        if (!restored.ok && !restored.errors.some(error => error.code === 'conflict')) {
          setErrors(restored.errors);
          setStatus('Το πραγματικό απόσπασμα δεν φορτώθηκε.');
          return false;
        }
        setSummaries(await repository.list());
        setStatus('Φορτώθηκε πραγματικό απόσπασμα. Δεν είναι το συνθετικό demo.');
        location.hash = routeHash(id, 'modules');
        return true;
      } finally {
        setBusy(false);
      }
    },
    async loadDemo(payload) {
      setBusy(true);
      setErrors([]);
      try {
        const result = await repository.loadDemo(payload);
        if (!result.ok) {
          setErrors(result.errors);
          setStatus('Το demo δεν φορτώθηκε.');
          return false;
        }
        setSummaries(await repository.list());
        setStatus(result.value.revision === 0 ? 'Φορτώθηκε το συνθετικό demo.' : 'Το συνθετικό demo ήταν ήδη φορτωμένο.');
        location.hash = routeHash(result.value.id, 'modules');
        return true;
      } finally {
        setBusy(false);
      }
    },
    open,
    async commit(action) {
      const current = workspaceRef.current;
      if (!current || busy) return false;
      setBusy(true);
      setErrors([]);
      try {
        const result = await repository.commit({
          workspaceId: current.id,
          expectedRevision: current.revision,
          actionId: `act:${crypto.randomUUID()}`,
          actor: 'local-user',
          at: new Date().toISOString(),
          action,
        });
        if (!result.ok) {
          setErrors(result.errors);
          setConflict(result.errors.some(error => error.code === 'conflict'));
          setStatus('Δεν αποθηκεύτηκε.');
          return false;
        }
        remember(result.value.workspace);
        setHistory(await repository.history(result.value.workspace.id));
        setConflict(false);
        setSummaries(await repository.list());
        setStatus(result.value.replayed
          ? 'Η ενέργεια είχε ήδη καταγραφεί.'
          : `Αποθηκεύτηκε · αναθεώρηση ${result.value.workspace.revision}.`);
        return true;
      } finally {
        setBusy(false);
      }
    },
    goHome() {
      location.hash = '#/';
    },
    async reloadCurrent() {
      setSummaries(await repository.list());
      const id = workspaceRef.current?.id;
      if (!id) return;
      const loaded = await repository.load(id);
      if (!loaded.ok) return;
      remember(loaded.value);
      setHistory(await repository.history(id));
    },
  }), [summaries, workspace, history, section, selection, status, errors, conflict, busy]);

  return <ModelContext.Provider value={model}>{children}</ModelContext.Provider>;
}

function readRoute(): { id?: string; section: Section | 'home' } {
  const raw = decodeURIComponent(location.hash.replace(/^#/, '').split('?')[0] ?? '');
  const match = raw.match(/^\/workspace\/([^/]+)\/(ontology|entities|relationships|facts|sources|transfer|explore|modules)$/);
  if (!match) return { section: 'home' };
  return { id: match[1], section: match[2] as Section };
}

function routeHash(id: string, section: Section): string {
  return `#/workspace/${encodeURIComponent(id)}/${section}`;
}
