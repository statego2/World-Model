import { Errors } from './components.tsx';
import { Entities, Facts, Relationships, Sources } from './records.tsx';
import { Home } from './home.tsx';
import { Inspector } from './inspector.tsx';
import { ModelProvider, useModel, type Section } from './model.tsx';
import { Ontology } from './ontology.tsx';
import { Transfer } from './transfer.tsx';
import { Explore } from './explore.tsx';

export function App() {
  return (
    <ModelProvider>
      <Shell />
    </ModelProvider>
  );
}

function Shell() {
  const model = useModel();
  const workspace = model.workspace;
  return (
    <>
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
            <span>Αναθεώρηση <span data-testid="revision">{workspace.revision}</span></span>
          </div>
        ) : <span className="muted">Τοπικός χώρος σε αυτόν τον browser</span>}
        <p className="status" role="status" data-testid="status">{model.status}</p>
      </header>
      {workspace ? (
        <div className="shell">
          <nav className="nav" aria-label="Ενότητες">
            <NavButton id="explore" label="Εξερεύνηση" />
            <NavButton id="ontology" label="Οντολογία" />
            <NavButton id="entities" label="Οντότητες" />
            <NavButton id="relationships" label="Σχέσεις" />
            <NavButton id="facts" label="Γεγονότα" />
            <NavButton id="sources" label="Πηγές" />
            <NavButton id="transfer" label="Μεταφορά" />
          </nav>
          <main id="stage" className="stage">
            {model.conflict ? (
              <div className="banner bad" role="alert" data-testid="conflict">
                <p>Ο χώρος άλλαξε από άλλη καρτέλα. Οι δικές σου αλλαγές δεν αποθηκεύτηκαν.</p>
                <button className="quiet" type="button" onClick={() => void model.open(workspace.id)}>Φόρτωση τρέχουσας αναθεώρησης</button>
              </div>
            ) : null}
            <Errors errors={model.errors} />
            {workspace.dataMode === 'demo' ? <p className="demo-note">Συνθετικά δεδομένα. Δεν τεκμηριώνουν πραγματικές μετρήσεις ή επενδύσεις.</p> : null}
            {model.section === 'entities' ? <Entities /> : null}
            {model.section === 'relationships' ? <Relationships /> : null}
            {model.section === 'facts' ? <Facts /> : null}
            {model.section === 'sources' ? <Sources /> : null}
            {model.section === 'transfer' ? <Transfer /> : null}
            {model.section === 'explore' ? <Explore /> : null}
            {model.section === 'ontology' || model.section === 'home' ? <Ontology /> : null}
          </main>
          <Inspector />
        </div>
      ) : <main id="stage" className="stage home-stage"><Home /></main>}
    </>
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
