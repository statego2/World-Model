import { useState } from 'react';
import demo from '../../data/fixtures/workspace.demo.json' with { type: 'json' };
import cited from '../../data/real/workspace.real.json' with { type: 'json' };
import { Errors } from './components.tsx';
import { useModel } from './model.tsx';

export function Home() {
  const model = useModel();
  const [label, setLabel] = useState('Το μοντέλο μου');
  const [id, setId] = useState('workspace:personal');

  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Strategic & Decision Intelligence</p>
        <h1>Χτίσε το μοντέλο του κόσμου.</h1>
        <p>
          Τύποι, ιδιότητες και σχέσεις είναι δεδομένα. Ένας νέος τύπος, όπως ο Προμηθευτής,
          εμφανίζεται στις ίδιες φόρμες χωρίς νέα οθόνη και χωρίς νέα βάση.
        </p>
      </section>
      <Errors errors={model.errors} />
      <div className="home-grid">
        <form className="panel" onSubmit={event => { event.preventDefault(); void model.createEmpty({ id, label }); }}>
          <h2>Κενός χώρος</h2>
          <p>Ξεκίνα χωρίς δεδομένα. Τίποτα δεν συμπληρώνεται σιωπηλά.</p>
          <label className="field">
            <span>Όνομα χώρου</span>
            <input value={label} onChange={event => setLabel(event.target.value)} />
          </label>
          <label className="field">
            <span>ID χώρου</span>
            <input value={id} onChange={event => setId(event.target.value)} placeholder="workspace:personal" />
            <small>Σταθερό λατινικό ID. Το όνομα μπορεί να αλλάξει αργότερα.</small>
          </label>
          <button className="primary" type="submit" disabled={model.busy}>Δημιουργία κενού χώρου</button>
        </form>
        <section className="panel demo-card">
          <h2>Συνθετικό demo</h2>
          <p>Δέκα οντότητες και εξήντα πέντε γεγονότα για να δεις τη δομή. Δεν τεκμηριώνουν πραγματικές επενδύσεις ή μετρήσεις.</p>
          <button className="quiet" type="button" disabled={model.busy} onClick={() => void model.loadDemo(demo)}>Φόρτωση συνθετικού DEMO</button>
          <p>Τα πραγματικά αποσπάσματα δεν αναμειγνύονται με το demo.</p>
          <button className="quiet" type="button" disabled={model.busy} onClick={() => void model.loadCited(cited)}>Φόρτωση πραγματικού αποσπάσματος</button>
        </section>
      </div>
      <section className="panel">
        <h2>Αποθηκευμένοι χώροι</h2>
        {model.summaries.length === 0 ? <p className="muted">Κανένας χώρος σε αυτόν τον browser.</p> : (
          <ul className="workspace-list">
            {model.summaries.map(summary => (
              <li key={summary.id}>
                <button type="button" onClick={() => { location.hash = `#/workspace/${encodeURIComponent(summary.id)}/ontology`; }}>
                  <strong>{summary.label}</strong>
                  <span>{summary.dataMode === 'demo' ? 'Συνθετικό' : 'Πραγματικό'} · αναθ. {summary.revision}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
