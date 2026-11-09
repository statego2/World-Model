# World Model — μελέτη World Monitor, Sovereign και God's Eye View

Ημερομηνία: 2026-11-09. Πρόταση σχεδιασμού/επαναχρησιμοποίησης, όχι ήδη υλοποιημένες
λειτουργίες. Τα συμπεράσματα βασίζονται σε δημόσιο HTML/CSS, README, άδειες και
συγκεκριμένα source modules. Οι live οπτικοί έλεγχοι αναφέρονται χωριστά στο τέλος.

## Απόφαση που προτείνεται

Διατηρούμε τον σημερινό ontology/action/repository πυρήνα. Προσθέτουμε ένα κοινό
περιβάλλον εξερεύνησης που συνδυάζει τη διάταξη του Sovereign, θεματικά layers και
κατάσταση πηγών όπως στο World Monitor, και επιλογή/εστίαση αντικειμένου και
αποθηκευμένη χωρική προβολή όπως στο God's Eye View.

Πρώτα 2D χάρτης + graph + κοινός inspector. Το φωτορεαλιστικό 3D και οι live feeds
δεν είναι προϋπόθεση. Δεν αντικαθιστούμε το React project με fork άλλης εφαρμογής.
Το «όλα συνδέονται» θα προκύπτει από κοινά entity IDs και τεκμήρια, όχι από το ότι
πολλά layers ζωγραφίζονται στον ίδιο χάρτη.

## Συγκριτικός χάρτης

| Αναφορά | Τι εξετάστηκε | Τι υιοθετούμε | Τι μένει εκτός άμεσης υλοποίησης |
|---|---|---|---|
| World Monitor | Landing HTML, README, layer catalog, refresh scheduler, freshness tracker | Layer registry, themed views, source status, coverage, flexible panels | News wall ως κεντρικό προϊόν, proprietary risk scores ως δικοί μας δείκτες, ολόκληρη η server υποδομή |
| Sovereign | Single-file HTML/CSS/JS, map/inspector layout, simulation/save functions | Σαφή country card, map-first layout, draft/apply αλλαγές, baseline-vs-scenario interaction | Hand-authored game values και μη βαθμονομημένες εξισώσεις ως factual μοντέλο |
| God's Eye View | README, package exports, LICENSE, layer lifecycle/catalog, share codec | Click/select/focus, lifecycle layers, source availability, αποθήκευση viewport/time/layers | Vue/Cesium ολόκληρη εφαρμογή, photoreal tiles, live traffic/CCTV/voice ως άμεσο scope |

## 1. World Monitor — γιατί έχει αξία ως αναφορά

Η apex σελίδα είναι landing/welcome, όχι η ίδια η SPA. Το πραγματικό dashboard
βρίσκεται στο /dashboard. Το README περιγράφει shared layer catalog για 2D/3D,
θεματικές παραλλαγές, panels και γεωπολιτική/οικονομική παρακολούθηση.

Στον κώδικα:
- src/services/webmcp-map-layer-catalog.ts διακρίνει enabled, available,
  rendererCompatible και runtime availability. Δεν αρκεί ένα checkbox «ενεργό»
  όταν το layer δεν έχει πηγή ή δεν υποστηρίζεται από τον renderer.
- src/services/data-freshness.ts έχει fresh/stale/very_stale/no_data/disabled/error
  και source/panel summaries. Αποφεύγει το ψευδές «όλα καλά» όταν δεν υπάρχει data.
- src/app/refresh-scheduler.ts έχει per-lane in-flight guard, bounded lease και
  cancellation για refresh, ώστε μία κρεμασμένη πηγή να μη σταματά μόνιμα τη ροή.

Στο World Model σχεδιάζουμε δικό μας μικρό registry και tracker. Οι thresholds
είναι ανά dataset: ετήσιο GDP δεν γίνεται stale σε 15 λεπτά όπως μια live ροή.
Reference period, retrievedAt, last successful refresh και feed health είναι
διαφορετικά πεδία. Manual imports εμφανίζονται ως snapshots, όχι ως «live».

## 2. Sovereign — reverse engineering της εμπειρίας και του μηχανισμού

URL: https://thenicedoctor.github.io/play/
HTML title που ανακτήθηκε: Sovereign V15 — Funded Budgets & New Reforms.
Το αρχείο περιλαμβάνει styling, γεωγραφικό dataset, state, renderers και simulation.

### Εμφάνιση που προκύπτει από CSS/DOM

Header με brand/time controls. Στενή αριστερή navigation rail. Κεντρικός workspace
με summary KPIs, map, χαμηλότερη λωρίδα events. Δεξιός country inspector με country
selector, subtabs, scrollable details και actions. Dark muted palette με θερμή
accent και χαμηλή οπτική ένταση στα borders. Mobile layout αναδιατάσσει sections
και παρέχει map focus. Η διάταξη επιβεβαιώθηκε και οπτικά με τοπικό render του ληφθέντος HTML σε Chromium
1440×1000. Δεν ήταν πλήρες live deployment test.

### Πώς λειτουργεί

- newGame δημιουργεί κρατικό state από SEEDS και GEO, player, policies/targets,
  events και options. Το source δηλώνει ρητά gameplay assumptions.
- simulateMonth αυξάνει τον μήνα. Οι στόχοι πολιτικής μεταβάλλουν σταδιακά την
  εφαρμοζόμενη πολιτική, με lags, και επηρεάζουν budget, growth, inflation,
  infrastructure, housing pipelines, approval κ.ά.
- taxation και fiscal υπολογίζουν budget/tax effects από τις υποθέσεις του game.
- provenance διαχωρίζει hand-authored illustrative 2026 scenario από ιστορική
  Natural Earth βάση με επιπλέον generic assumptions.
- save αποθηκεύει localStorage, validSave ελέγχει έκδοση/ranges/relations,
  migrations και exportSave υποστηρίζουν portable game saves.

Το ενδιαφέρον για μας είναι το interaction «σχεδιάζω αλλαγή → βλέπω παραμέτρους →
εφαρμόζω σε σενάριο → συγκρίνω». Δεν εισάγουμε τα SEEDS ή τους συντελεστές ως
μετρημένες οικονομικές αλήθειες. Ένα όμορφο slider δεν δημιουργεί causal model.

Μελλοντικό World Model scenario:
immutable base revision + assumption overlay + versioned computation model +
parameters/units + outputs/uncertainty. Το baseline fact δεν ξαναγράφεται.
Αρχικά επιτρέπεται sensitivity arithmetic με δηλωμένες υποθέσεις, όχι «πρόβλεψη
ελληνικής οικονομίας». Δεν είναι εντολή να προστεθεί simulator στην τωρινή νύχτα.

## 3. God's Eye View — τι αξίζει να μελετήσουμε τεχνικά

Το package δείχνει Vue/Pinia, Cesium, Vite, satellite.js και διακριτά exports για
layers, source adapters, maps, view/share και lifecycle. Δεν είναι drop-in React UI.

- src/data/lifecycle.js: LayerLifecycle διαχειρίζεται registration, visibility,
  initialization/update state, failure και cleanup. Οι ορατές προβολές χρειάζονται
  lifecycle ανεξάρτητο από την αποθήκευση των οντοτήτων.
- src/app/constructCatalog.js: σύνθεση καταλόγου από sources/layers με explicit
  serialization policy· κάποια hardware-local/session-local layers δεν μοιράζονται.
- src/share/viewCodec.js: versioned view serialization, bounds πριν από decode,
  compatibility/default κανόνες και διαχωρισμός pure codec από DOM/Cesium.

Για μας: stable layer IDs, enable/disable, availability/error, explicit entity
selection και fly-to/focus. Shareable view περιέχει presentation state και refs,
όχι raw private facts ή credentials. Άλλος browser χωρίς το workspace πρέπει να
δείχνει «λείπει το dataset», όχι να υπονοεί ότι το URL μετέφερε ολόκληρη τη βάση.
Ένας live γεωγραφικός contact δεν αποθηκεύεται ως ιστορικό fact κάθε animation frame.

## 4. Προτεινόμενος κοινός workspace

```text
┌ Project / workspace · DEMO/REAL · coverage · search · save view ─┐
│ Layers & queries │             Map / Graph / Table │ Inspector  │
│ [x] Countries    │                                │ Entity     │
│ [x] Regions      │       κοινή επιλογή entity       │ Metrics    │
│ [ ] Investments  │                                │ Relations  │
│ [ ] Energy       │                                │ Evidence   │
├─────────────────┴────────────────────────────────┴────────────┤
│ Year / source / basis · legend · reference period · data health │
└───────────────────────────────────────────────────────────────┘
```

Layers: countries, Greek regions, company/infrastructure points μόνο όταν έχουν
τεκμηριωμένη geometry, και relationship arcs για επιλεγμένες οικονομικές σχέσεις.
Όχι αυθαίρετη τοποθέτηση εταιρείας στο κέντρο χώρας σαν να είναι πραγματική θέση.
Ποσό FDI δίνει πάχος/label με stock/flow διαχωρισμό· δεν συνεπάγεται ownership.
Inspector από map ή graph δείχνει το ίδιο entity, sources, validity και gaps.

Tab «Build» ανοίγει ontology/data/query editors. Tab «Explore» χρησιμοποιεί τις
ίδιες οντότητες με map/graph/table. Tab «Scenarios» θα εμφανιστεί όταν υπάρχει
ξεχωριστά σχεδιασμένο και ελεγμένο model subsystem. Όχι ανενεργά buttons που
δίνουν την εντύπωση υλοποιημένης simulation δυνατότητας.

## 5. Ελάχιστο συμβόλαιο για δική μας υλοποίηση

Ενδεικτικό specification, όχι αντιγραμμένος κώδικας ή νέο schema ήδη σε χρήση:

```ts
type LayerAvailability = 'ready' | 'empty' | 'unsupported' | 'error';
interface LayerDefinition {
  id: string;
  label: string;
  kind: 'polygon' | 'point' | 'arc';
  requiredBindings: string[];
  supportedViews: ('map2d' | 'graph' | 'table')[];
}
interface LayerProjection {
  layerId: string;
  workspaceRevision: number;
  filterHash: string;
  availability: LayerAvailability;
  entityIds: string[];
  relationshipIds: string[];
  excludedCount: number;
  truncated: boolean;
}
interface ExplorationView {
  formatVersion: 1;
  workspaceId: string;
  enabledLayerIds: string[];
  selectedEntityId?: string;
  selectedRelationshipId?: string;
  year: number;
  sourceIds: string[];
  basis: 'reported' | 'assumption';
  viewport: { center: [number, number]; zoom: number };
}
```

Geometry/metric read models παραμένουν derived από repository/query services.
Το layer projection δεν επιτρέπεται να δημιουργεί facts ή να παρακάμπτει import
validation. Από αρχείο/connector εισάγουμε σε staging, ελέγχουμε provenance/IDs και
κάνουμε explicit commit. Source registry και layer registry είναι χωριστά:
μία πηγή μπορεί να τροφοδοτεί πολλά layers και ένα layer πολλές επιλεγμένες πηγές.

## 6. Άδειες και τι μπορεί πραγματικά να επαναχρησιμοποιηθεί

### World's Monitor

Το LICENSE και package.json του koala73/worldmonitor δηλώνουν AGPL-3.0-only.
Μπορούμε να μελετήσουμε τις ιδέες και να γράψουμε δική μας υλοποίηση. Αν ενσωματώσουμε
κώδικα σε covered derivative έργο, πρέπει να τηρηθούν οι αντίστοιχες copyleft/source
υποχρεώσεις, συμπεριλαμβανομένης της σχετικής network-use πρόβλεψης. Το ότι το δικό
μας GitHub είναι public δεν λύνει μόνο του το θέμα της άδειας. Το παρόν επιλέγει
νέο κώδικα για αυτές τις συμπεριφορές· δεν απαιτεί απόφαση αλλαγής άδειας τώρα.

### God's Eye View

Το LICENSE παραχωρεί MIT για source code, με διατήρηση notice. Πιθανοί extraction
candidates: pure helpers/share-state patterns και μικρά lifecycle utilities,
αφού ελεγχθούν οι πραγματικές transitive dependencies και προσαρμοστούν στο React
και τον δικό μας domain contract. Ο μεγάλος Cesium-bound lifecycle manager και
το περίπλοκο codec δεν είναι αυτόματα καλή αντιγραφή για το μικρό μας PoC.

Το ίδιο LICENSE εξαιρεί third-party data/assets: TeleGeography cables CC BY-NC-SA
3.0, OSM-derived datasets ODbL, ορισμένα event imagery/derived coordinates CC BY-NC
4.0 και μεμονωμένα 3D models με δικούς τους όρους. Live provider terms/API quotas
ξεχωριστά. Δεν γίνεται μαζικό copy του local_data ή models folder με βάση το MIT.

### Sovereign

Το δημόσιο HTML ήταν αναγνώσιμο, αλλά δεν επιβεβαιώθηκε άδεια source/assets. Το
GitHub contents endpoint thenicedoctor/play επέστρεψε 404. Αυτό δεν αποδεικνύει ότι
δεν υπάρχει άδεια· σημαίνει ότι δεν τεκμηριώθηκε στην παρούσα μελέτη. Χρησιμοποιούμε
περιγραφή συμπεριφοράς και πρωτότυπο δικό μας UI. Όχι αντιγραφή κώδικα, assets,
brand ή gameplay data χωρίς όρους/άδεια που το επιτρέπουν.

Σε κάθε πραγματικό source reuse: file/path + pinned commit + original license +
notice + αλλαγές + dependency/data audit στο THIRD_PARTY_NOTICES. Μέχρι στιγμής
δεν αντιγράφηκε κώδικας από κανένα από τα τρία στο application runtime.

## 7. Ενσωμάτωση στο ήδη ανατεθειμένο πλάνο

Δεν ανατρέπουμε την ουρά N0–N7 του PR #5.

- N1/N2 πρώτα: data integrity και κοινά φίλτρα.
- N3: saved query/binding editor και shared selection state.
- N4-A/B: πρόσθεσε μικρό layer registry, map/graph/table views και κοινό inspector
  σύμφωνα με την παραπάνω εμπειρία. Source health/coverage εμφανίζονται με βάση
  snapshots και επιλεγμένες πηγές, χωρίς να απαιτείται live collector.
- N7: saved exploration view, bounded codec/input validation, source status tests
  και notices για ό,τι πραγματικά επαναχρησιμοποιήθηκε.
- Μετά το τρέχον scope: prototype 3D renderer πίσω από ίδιο selection/layer contract,
  μόνο με μετρημένη χρησιμότητα, κόστος/provider terms και fallback 2D.
- Ξεχωριστό μελλοντικό design: scenario overlays και versioned causal/statistical
  model. Δεν περιλαμβάνεται overnight αντιγραφή simulator.

### Acceptance για το πρώτο adaptation

1. Ο χρήστης ενεργοποιεί Countries + Regions + Investment arcs από layer picker.
2. Επιλέγει entity στον χάρτη, inspector και graph χρησιμοποιούν το ίδιο ID.
3. Αλλαγή έτους/πηγής ενημερώνει όλα τα ορατά views· καμία μίξη παλιών revisions.
4. Απουσία/σφάλμα source διαφέρει από μηδενικό μέγεθος ή no-events.
5. Save view → reload κρατά layers, selection, φίλτρα και viewport.
6. Νέο συμβατό entity/import εμφανίζεται από query χωρίς νέο hardcoded component.
7. Λειτουργεί στα 390px/1440px και με keyboard/table fallback.
8. Δεν χρειάζεται paid provider, 3D tiles ή external account για το βασικό demo.

## 8. Πηγές που εξετάστηκαν

World Monitor snapshot ab5168791df07c8d88684d40b45a5e45abdf6612:
https://github.com/koala73/worldmonitor
LICENSE, README.md, package.json, src/services/webmcp-map-layer-catalog.ts,
src/services/data-freshness.ts, src/app/refresh-scheduler.ts. Η landing HTML
ανακτήθηκε από https://www.worldmonitor.app/.

God's Eye View observed main head e5da073d33c76a6fe8f56d676b13b4a12152e0ce:
https://github.com/bilawalsidhu/gods-eye-view
LICENSE, README.md, package.json, src/data/lifecycle.js,
src/app/constructCatalog.js, src/share/viewCodec.js. Τα πρώτα reads έγιναν από main
και αποτελούν snapshot της συγκεκριμένης συνεδρίας, όχι guarantee pinned byte-for-byte
για κάθε αρχείο αν άλλαζε ο upstream κλάδος κατά την ανάγνωση.

Sovereign: https://thenicedoctor.github.io/play/ — δημόσιο ενιαίο HTML/CSS/JS V15.
Έγινε source/DOM/CSS ανάλυση και τοπικό render σε Chromium. Επιλέχθηκε η Ελλάδα
στον inspector και δοκιμάστηκε ένα simulateMonth: month 0 → 1, September → October.
Αυτό επιβεβαιώνει τον μηχανισμό βήματος, όχι τις οικονομικές εξισώσεις ή calibration.
Το screenshot /tmp/sovereign-workspace.png επιθεωρήθηκε τοπικά, δεν ενσωματώθηκε
ως δικό μας asset στο προϊόν.

Η ζωντανή browser επιθεώρηση είναι best-effort, όχι πλήρης δοκιμή αυτών των μεγάλων
εφαρμογών. Το World Monitor /dashboard έφτασε σε navigation timeout. Δεν ισχυριζόμαστε
επιτυχημένο πλήρες live UI/performance test από την ανάγνωση README ή HTML.
