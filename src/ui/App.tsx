import { AtlasProvider, useAtlas } from './atlas-context.tsx';
import { Errors } from './components.tsx';
import { Entities, Facts, Relationships, Sources } from './records.tsx';
import { Home } from './home.tsx';
import { Inspector } from './inspector.tsx';
import { ModelProvider, useModel, type Section } from './model.tsx';
import { Ontology } from './ontology.tsx';
import { Transfer } from './transfer.tsx';
import { Explore } from './explore.tsx';
import { Modules } from './modules.tsx';

export function App() {
  return (
    <ModelProvider>
      <AtlasProvider>
        <Shell />
      </AtlasProvider>
    </ModelProvider>
  );
}

function Shell() {
  const model = useModel();
  const workspace = model.workspace;
  return (
    <div className="app-frame">
      <a className="skip" href="#stage">Μετάβαση στο περιεχόμενο</a>
      <header className="topbar">
        <button className="wordmark" type="button" onClick={model.goHome}>
          WORLD MODEL
          <small>μοντέλο κόσμου</small>
        </button>
        {workspace ? (
          <div className="workspace-meta">
            <strong data-testid="workspace-label">{workspace.label}</strong>
            <span className={workspace.dataMode === 'demo' ? 'badge' : 'badge real'} data-testid="data-mode">
              {workspace.dataMode === 'demo' ? 'ΣΥΝΘΕΤΙΚΟ DEMO' : 'ΠΡΑΓΜΑΤΙΚΑ'}
            </span>
            <span className="revision-label">Αναθεώρηση <span data-testid="revision">{workspace.revision}</span></span>
          </div>
        ) : <span className="muted">Τοπικός χώρος σε αυτόν τον browser</span>}
        <YearControl />
        <p className="status" role="status" data-testid="status">{model.status}</p>
      </header>
      {workspace ? (
        <div className="shell">
          <nav className="nav" aria-label="Ενότητες">
            <p className="nav-kicker">Χάρτης</p>
            <NavButton id="explore" label="Εξερεύνηση" />
            <NavButton id="modules" label="Εφαρμογές" />
            <p className="nav-kicker">Μοντέλο</p>
            <NavButton id="ontology" label="Οντολογία" />
            <NavButton id="entities" label="Οντότητες" />
            <NavButton id="relationships" label="Σχέσεις" />
            <NavButton id="facts" label="Γεγονότα" />
            <NavButton id="sources" label="Πηγές" />
            <NavButton id="transfer" label="Μεταφορά" />
          </nav>
          <main id="stage" className={model.section === 'modules' ? 'stage atlas-stage' : 'stage'}>
            {model.conflict ? (
              <div className="banner bad" role="alert" data-testid="conflict">
                <p>Ο χώρος άλλαξε από άλλη καρτέλα. Οι δικές σου αλλαγές δεν αποθηκεύτηκαν.</p>
                <button className="quiet" type="button" onClick={() => void model.open(workspace.id)}>Φόρτωση τρέχουσας αναθεώρησης</button>
              </div>
            ) : null}
            <Errors errors={model.errors} />
            {model.section !== 'modules' && workspace.dataMode === 'demo' ? <p className="demo-note">Συνθετικά δεδομένα. Δεν τεκμηριώνουν πραγματικές μετρήσεις ή επενδύσεις.</p> : null}
            {model.section === 'entities' ? <Entities /> : null}
            {model.section === 'relationships' ? <Relationships /> : null}
            {model.section === 'facts' ? <Facts /> : null}
            {model.section === 'sources' ? <Sources /> : null}
            {model.section === 'transfer' ? <Transfer /> : null}
            {model.section === 'explore' ? <Explore /> : null}
            {model.section === 'modules' ? <Modules /> : null}
            {model.section === 'ontology' || model.section === 'home' ? <Ontology /> : null}
          </main>
          <Inspector />
        </div>
      ) : <main id="stage" className="stage home-stage"><Home /></main>}
    </div>
  );
}

function YearControl() {
  const atlas = useAtlas();
  if (!atlas.active) return null;
  return (
    <label className="year-control">
      <span>Έτος</span>
      <select aria-label="Έτος χάρτη" value={String(atlas.year)} onChange={event => atlas.setYear(Number(event.target.value))}>
        {atlas.years.map(year => <option key={year} value={year}>{year}</option>)}
      </select>
    </label>
  );
}

function NavButton({ id, label }: { id: Section; label: string }) {
  const model = useModel();
  return (
    <button type="button" aria-current={model.section === id ? 'page' : undefined} onClick={() => model.navigate(id)}>
      {label}
    </button>
  );
}
