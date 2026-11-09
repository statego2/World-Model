# Ιστορικό και handoff

Νεότερο entry πρώτο. Οι εντολές παρακάτω εκτελούνται από το project root.
Τρέχον στάδιο: T-M5-01 και T-M5-02 στο `cursor/m5-real-sources-864c`. Η υπόθεση Β δεν αποδείχθηκε.

## 2026-11-09 — T-M5-01 / T-M5-02 — Πραγματικό απόσπασμα

Agent/session: Cursor Grok 4.7 | Status: done με ρητά κενά | Branch: cursor/m5-real-sources-864c

Φορτώθηκαν, μέσω `previewCsv` και `CommitImport`, μόνο τιμές από αρχεία που κατέβηκαν την ίδια μέρα:
- World Bank WDI `NY.GDP.MKTP.CD`, 5 χώρες, 2022–2023, current USD. CC BY 4.0 από το summary terms of use του data.worldbank.org.
- World Bank WDI `SP.POP.TOTL`, ίδιες χώρες και έτη. CC BY 4.0, με αναφορά στον UN World Population Prospects που ονομάζει το metadata.
- Eurostat `nama_10r_2gdp`, 13 ελληνικές NUTS 2, 2022, million euro.
- Eurostat `bop_fdi6_geo`, Ελλάδα ως reporting economy, εταίρος Γερμανία, 2022: inward stock και inward flow, million euro, σε ξεχωριστά properties πάνω σε ακμή χώρας–χώρας. Δεν αποδίδονται σε εταιρεία.

Ο χώρος έχει `dataMode: real` και όλες οι πηγές `isDemo: false`. Δεύτερη προεπισκόπηση του ίδιου ΑΕΠ βγαίνει duplicate. Κενό κελί δεν γίνεται 0. Άγνωστο ID μένει unresolved. Πηγή demo απορρίπτεται. Κατάταξη των περιφερειών χρησιμοποιεί μόνο το million euro. Σύγκριση χωρών πάνω στο περιφερειακό property επιστρέφει missing, όχι μηδέν.

Μέτρηση στο `buildRealWorkspace`: elapsedMs 54. Κάλυψη ΑΕΠ 5/5, περιφέρειες 13/13, στρατιωτικά facts 0, εταιρείες 0, υποδομές 0, ακμές προς εταιρεία 0. Inward FDI Γερμανία→Ελλάδα από το αρχείο Eurostat: stock 8094.9 million EUR, flow 948.2 million EUR. Δεν έγινε μελέτη χρηστών. Η αξία που μετρήθηκε είναι ο διαχωρισμός μονάδων και η ορατή απουσία εταιρικής διαδρομής, όχι εξοικονόμηση χρόνου.

Blockers, όχι done:
- `MS.MIL.XPND.CD` κατέβηκε αλλά η πηγή του metadata είναι SIPRI. Δεν επιβεβαιώθηκε άδεια αναδιανομής. Οι τιμές δεν αποθηκεύτηκαν.
- Η σελίδα πνευματικών δικαιωμάτων του Eurostat ζήτησε login. Η χρήση στηρίζεται στη νομική ειδοποίηση της Επιτροπής (CC BY 4.0, ανακτήθηκε). 
- `https://www.olp.gr/en/` δεν έδωσε παραθέσιμο γεγονός παραχώρησης. Υπόθεση Β μη αποδεδειγμένη.

Επαλήθευση: `npm test` — 47/47 pass. `tsc -p tsconfig.json --noEmit` και `tsc -p tsconfig.tests.json --noEmit` pass.

Επόμενο βήμα: μην εφευρεθεί εταιρική διαδρομή. Χρειάζεται χωριστό δημόσιο evidence για εταιρεία, επένδυση, υποδομή και περιφέρεια.
T-REPO-01: private ορατότητα μένει απόφαση του ιδιοκτήτη.

## 2026-11-09 — T-M2-01 / T-M2-02 — Διορθώσεις review

Agent/session: Cursor Grok 4.7 | Status: done | Branch: cursor/m1-workspace-editor-864c, ενσωματώθηκε στο cursor/m3-queries-maps-864c

Τέσσερα ευρήματα του Codex στο PR #2:
- Η επαναφορά σε IndexedDB αφαιρεί το τοπικό κλειδί `seq`, ώστε το ιστορικό να μη συγκρούεται με τις υπάρχουσες γραμμές.
- Κενό κελί CSV μένει σφάλμα και δεν γίνεται μηδέν.
- Το ID ενός εισαγόμενου fact περιλαμβάνει ιδιότητα, πηγή και προηγούμενο fact, όχι μόνο γραμμή και έτος.
- Η καταγραφή μένει ανενεργή αν αλλάξει το αρχείο ή η αντιστοίχιση μετά την προεπισκόπηση.

Επαλήθευση στο M1 branch: `npm test` — 41/41 pass. Μετά το merge σε αυτό το branch: `npm test` — 46/46 pass και `tsc -p tsconfig.json --noEmit` pass.

## 2026-11-09 — T-M4-01 — Τέσσερις προβολές και χάρτες

Agent/session: Cursor Grok 4.7 | Status: done | Branch: cursor/m3-queries-maps-864c

Οι εφαρμογές διαβάζουν το ίδιο workspace και τα bindings. Παγκόσμιος χάρτης από Natural Earth (public domain). Ελληνικές περιφέρειες από NUTS 2024 / GISCO, με αναφορά πηγής. Η `region:ATT` δένεται ρητά με EL30. Η συνθετική κεντρική περιφέρεια γράφεται «χωρίς γεωμετρία» και δεν ζωγραφίζεται αλλού. Χώρες χωρίς fact μένουν χωρίς δεδομένα, όχι μηδέν. Η σύγκριση Ελλάδας–Τουρκίας δεν ανακηρύσσει νικητή. Το απόθεμα και η ροή FDI μένουν χωριστά. Η σελίδα κεφαλαίων δείχνει την ίδια αποθηκευμένη διαδρομή προς την Αττική και λέει ότι δεν είναι αιτιότητα.

Επαλήθευση:
- `npx tsc -p tsconfig.json --noEmit` — pass.
- `npx playwright test tests/browser/modules.spec.ts` — 1/1 pass.
- Screenshots: `docs/evidence/m4-regions-1440.png`, `docs/evidence/m4-world-1440.png`, `docs/evidence/m4-world-390.png`.

Δεν έγινε έλεγχος πραγματικών πηγών ούτε εισαγωγή WDI. Επόμενο βήμα: T-M5-01.

## 2026-11-09 — T-M3-01 — Εξερεύνηση και αποθηκευμένη διαδρομή

Agent/session: Cursor Grok 4.7 | Status: done | Branch: cursor/m3-queries-maps-864c

Η ενότητα Εξερεύνηση τρέχει την αποθηκευμένη προβολή και δείχνει κοινά φίλτρα έτους, βάσης και πηγής για την κατάταξη. Η σημείωση στην οθόνη λέει ότι η διαδρομή δεν είναι αιτιότητα.

Επαλήθευση:
- `npm test` — 44/44 pass.
- `npx playwright test tests/browser/explore.spec.ts` — 1/1 pass. Μετά από εταιρεία, υποδομή και τρεις ακμές από το UI, η ίδια προβολή δείχνει και τη δεύτερη διαδρομή προς την κεντρική περιφέρεια.
- Screenshots: `docs/evidence/m3-path-1440.png`, `docs/evidence/m3-path-390.png`.

Δεν υπάρχουν ακόμη οι τέσσερις θεματικές οθόνες ούτε ζωγραφισμένοι χάρτες. Επόμενο βήμα: T-M4-01.

## 2026-11-09 — T-M3-01 — Query engine χωρίς UI ακόμη

Agent/session: Cursor Grok 4.7 | Status: in_progress | Branch: cursor/m3-queries-maps-864c

`src/core/query.ts` εκτελεί path query, compare και rank. Το cache κλειδί περιλαμβάνει workspace revision. Assumption και ληγμένες ακμές αποκλείονται. Οι κύκλοι τερματίζουν. Το limit δηλώνει truncation. Σύγκρουση τιμών δεν διαλέγει νικητή. Η σημείωση λέει ότι η διαδρομή δεν είναι αιτιότητα.

Επαλήθευση: `npm test` — 44/44 pass. Η αποθηκευμένη προβολή `view:capital-to-regions` επιστρέφει DEU → EXAMPLE → TERMINAL → ATT. Νέα εταιρεία και υποδομή μπαίνουν στο ίδιο query object χωρίς αλλαγή του saved view.

Δεν υπάρχει ακόμη οθόνη εξερεύνησης ούτε browser test που προσθέτει εταιρεία από το UI. Δεν σημειώνεται done.
Επόμενο βήμα: ενότητα Εξερεύνηση και Playwright που τρέχει την ίδια προβολή πριν και μετά από νέα εταιρεία/υποδομή.

## 2026-11-09 — T-M3-01 — Γεωμετρίες, πριν από το query engine

Agent/session: Cursor Grok 4.7 | Status: in_progress | Branch: cursor/m3-queries-maps-864c

Το branch ξεκινά από το `cursor/m1-workspace-editor-864c` (commit 5b43947). Δεν έγινε merge στο main.

Προστέθηκαν απλοποιημένες γεωμετρίες, όχι ακόμη χάρτης ή query:
- `data/geometries/world-countries.json`: Natural Earth 1:110m, public domain, κλειδί ISO_A3_EH. 174 χώρες.
- `data/geometries/greek-regions.json`: NUTS 2024 επίπεδο 2 για την Ελλάδα, Eurostat/GISCO, ελεύθερη επαναχρησιμοποίηση με αναφορά. 13 περιφέρειες, ανάμεσά τους EL30.
- `data/geometries/region-links.json`: ρητή σύνδεση `region:ATT` → `EL30`. Δεν γίνεται ταίριασμα από label. Η συνθετική «Κεντρική περιφέρεια — DEMO» δεν έχει γεωμετρία.

Δεν γράφτηκε query engine, explorer, module ή test διαδρομής.
Επαλήθευση: `npm test` — 39/39 pass. Τα νέα αρχεία δεν συμμετέχουν στα tests.
Επόμενο βήμα: `src/core/query.ts` με path query, cache ανά revision, compare/rank, και tests πριν από UI.

## 2026-11-09 — T-M1-01 … T-M2-02 — Επεξεργάσιμος χώρος και μεταφορά

Agent/session: Cursor Grok 4.7 | Status: done | Branch: cursor/m1-workspace-editor-864c

Node 24.22.2. Ο πυρήνας έμεινε χωρίς React/Dexie. Νέος τύπος, ιδιότητα και σχέση
βγαίνουν από τις ίδιες φόρμες. IndexedDB γράφει workspace, action id και history
στην ίδια transaction. CSV preview δεν συγχωνεύει άγνωστα IDs. Το export ανοίγει
νέο χώρο. Η αναίρεση σταματά όταν υπάρχει εξάρτηση.

Επαλήθευση:
- `npm test` — 39/39 pass (20 παλιά domain tests συμπεριλαμβάνονται).
- `npm run validate` — `Valid demo workspace: 10 entities, 8 relationships, 65 facts.`
- `npm run typecheck` — pass.
- `npm run build` — pass (Vite 8.3.7).
- `npm run test:browser` — 3/3 pass: κενός χώρος με Προμηθευτή και reload,
  πληκτρολόγιο και σύγκρουση καρτέλας, CSV με εκκρεμές ID και idempotent replay.
- Screenshots: `docs/evidence/m1-1440.png`, `docs/evidence/m1-390.png`.

Άδειες άμεσων βιβλιοθηκών: React MIT, Dexie Apache-2.0, Vite MIT, TypeScript
Apache-2.0, Playwright Apache-2.0, fake-indexeddb Apache-2.0, fontsource OFL-1.1.

Δεν έγινε αλλαγή ορατότητας του GitHub. Δεν υπάρχουν graph queries, χάρτες,
modules ή πραγματικά δεδομένα.

Επόμενο βήμα: T-M3-01, path query επενδυτής → εταιρεία → υποδομή → περιφέρεια.

## 2026-11-09 — T-REPO-01 — Clone σε δεύτερο χώρο

Agent/session: Cursor Grok 4.7 | Status: blocked | Branch: cursor/m1-workspace-editor-864c

Ο φάκελος εργασίας είναι ήδη clone του `https://github.com/statego2/World-Model`. Έγινε δεύτερο fresh clone στο `/tmp/world-model-fresh` και έτρεξαν οι έλεγχοι από εκεί. Το προεπιλεγμένο Node του VM είναι 22.23.4 και απορρίπτει το `--test-isolation=none` του `npm test`. Το `package.json` ζητά Node >=24. Οι έλεγχοι έτρεξαν με Node 24.22.2 (npm 11.19.1).

Επαλήθευση:
- `npm test` — 20/20 pass, 0 fail.
- `npm run validate` — `Valid demo workspace: 10 entities, 8 relationships, 65 facts.`

Η ορατότητα του repository είναι PUBLIC. Δεν άλλαξε. Το αρχικό acceptance ζητούσε private repository· αυτό μένει απόφαση του Dimitris και καταγράφεται στο `docs/DECISIONS.md`. Δεν καταχωρίστηκαν tokens. Το draft PR #1 (`work/m1-browser-editor`) δεν συνεχίζεται: είναι μερικό JSX shell χωρίς action contract.

Επόμενο βήμα: T-M1-01 και τα υπόλοιπα tasks του M1 στο ίδιο branch.

## 2026-11-09 — T-REPO-01 — Προετοιμασία GitHub

Agent: Codex. Status: blocked. Τοπικό Git main και origin https://github.com/statego2/World-Model.git αρχικοποιήθηκαν. Ο GitHub connector αναγνώρισε το stratego2 αλλά get_repo επέστρεψε 404 και η λίστα repositories ήταν κενή. Το gh auth status ανέφερε invalid token. Δεν έγινε push και δεν έχει ελεγχθεί το περιεχόμενο του remote. Επόμενο βήμα: διορθώστε τη GitHub πρόσβαση και ελέγξτε το remote πριν από push.

## 2026-11-09 — T-REPO-01 — GitHub app

Agent: Codex. Το GitHub app βρήκε το public stratego2/World-Model και δημιούργησε αρχικό README commit. Το πλήρες starter ανέβηκε στο main με commit 596eb5c5 και ελέγχθηκε η πρόσβαση στα AGENTS.md, TASKS.md, PROGRESS.md, validator και fixture. Εκκρεμεί clone σε δεύτερο χώρο και εκτέλεση tests από εκεί. Το πρώτο αίτημα μεταφοράς επέστρεψε 404, αλλά με ρητό branch main πέτυχε.

## 2026-11-09 — T-MEM-01 — Persistent project memory

Agent: Codex, τρέχουσα συνεδρία. Status: done. Branch/commit: δεν υπάρχουν·
το project folder δεν είναι ακόμη Git repository και δεν έχει remote.

- Δημιουργήθηκαν PROJECT.md, ARCHITECTURE.md, PROGRESS.md, TASKS.md και επεκτάθηκε
  το AGENTS.md με υποχρεωτικό read/update workflow και κανόνες handoff/parallel work.
- Προστέθηκε `docs/AGENT_WORKFLOW.md` για private GitHub setup, agents με διαφορετικά
  εργαλεία, branches/worktrees και ξεχωριστή αποθήκευση προσωπικών datasets.
- README/prompts ενημερώθηκαν να ξεκινούν από τα αρχεία μνήμης. Το docs/STATUS.md
  έγινε pointer ώστε να μη συντηρείται δεύτερη λίστα κατάστασης.
- Κώδικας/fixtures δεν άλλαξαν. Ο πραγματικός στόχος παραμένει editable World Model.
- Επαλήθευση: npm test — 20/20 pass, npm run validate — 10 entities, 8 edges,
  65 facts valid. Έγινε έλεγχος απαιτούμενων αρχείων/σχετικών Markdown links.
- Δεν έγινε Git initialization, commit, remote upload, deployment ή Drive upload.

**Επόμενο βήμα:** προαιρετικά setup private repository (T-REPO-01), κατόπιν T-M1-01
στο Terra ή άλλον agent. Διατήρησε την εφαρμογή μικρή και υλοποίησε μόνο M1.
Το αναλυτικό acceptance του M1 βρίσκεται στο docs/MILESTONES.md.

## 2026-11-09 — T-M0-01 — World Model v2 starter

Agent: Codex, προηγούμενη εργασία. Status: done. Καταγραφή βάσει υπαρχόντων αρχείων
και VALIDATION.txt, όχι Git commits (δεν υπάρχει ακόμη ιστορικό).

- Σχέδιο επεξεργάσιμης ontology, τέσσερα κοινά modules, M0–M5 roadmap και prompts.
- Portable TypeScript types, synthetic fixture, Node validator και 20 domain tests.
- Checks καταγεγραμμένα στο VALIDATION.txt: Node syntax check, fixture validation,
  20 passing tests, JSON/Markdown links. Syntax check δεν είναι full TS typecheck.
- Καμία browser UI, persistence, import/export ή πραγματική πηγή υλοποιημένη.
- Το προηγούμενο Greek Strategic Intelligence σχέδιο αντικαταστάθηκε ως κατεύθυνση.

## Πρότυπο νέου entry

```text
YYYY-MM-DD — TASK-ID — τίτλος
Agent/session: ... | Status: ... | Branch/commit/PR: ...
Αλλαγές και αρχεία: ...
Επαλήθευση (εντολές + πραγματικό αποτέλεσμα): ...
Blockers / τι ΔΕΝ ολοκληρώθηκε: ...
Handoff / ακριβές επόμενο βήμα: ...
```
