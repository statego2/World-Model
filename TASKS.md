# Εργασίες και dependencies

## Ενεργή επόμενη ανάθεση — 2026-11-10

Διάβασε docs/reviews/2026-11-10-overnight-review.md και docs/plans/NEXT_SESSIONS_2026-11-10.md.
Η παρακάτω ουρά έχει προτεραιότητα για τις επόμενες συνεδρίες. Τα παλιά done
παραμένουν ιστορικό, όχι απόδειξη ότι δεν υπάρχουν νέα regression findings.

| ID | Εργασία | Status | Owner | Εξάρτηση |
|---|---|---|---|---|
| AM-PLAN | Ανεξάρτητο review και πλάνο S1–S4 | done | Codex | e8a53447 |
| S1-1 | Baseline και επανέλεγχος A–E | todo | — | — |
| S1-2 | Returning-user cited snapshot versions/upgrade | todo | — | S1-1 |
| S1-3 | Exact edge conflicts και complete history/action validation | todo | — | S1-1 |
| S1-4 | Used evidence, ενεργοί neighbors, complete view roundtrip | todo | — | S1-1 |
| S2-1 | Metric explorer με συμβατές κλίμακες/φίλτρα | todo | — | S1 integrity gate |
| S2-2 | Geography bindings από χρήστη, χωρίς hardcoded property IDs | todo | — | S1 integrity gate |
| S2-3 | Shared selection, graph/mobile usability και custom-model proof | todo | — | S2-1, S2-2 |
| S3-1 | Επαναλήψιμο source ingestion και ασφαλές refresh preview | todo | — | S1 |
| S3-2 | Evidence case study και αξιολόγηση ερωτημάτων | todo | — | S2, διαθέσιμα τεκμήρια |
| S3-3 | Μετρημένα storage/query/backup όρια | todo | — | Σταθερή S1/S2 έκδοση |
| S4 | Release candidate, CI artifacts και PR integration plan | todo | — | Passing completed scope |

Acceptance και αναπαραγωγές στα παραπάνω docs. Claim πριν από εργασία και
ενημέρωση PROGRESS/TASKS πριν από κάθε handoff. Main merge/deployment δεν εκτελούνται αυτόματα.

## Προηγούμενη ανάθεση (ιστορικό)


## Ενεργή ανάθεση: εμπειρία προϊόντος

Η ουρά N0–N7 είναι done στο `cursor/overnight-depth-864c`. Η νέα ουρά είναι η εμπειρία του χάρτη, στο `cursor/product-experience-864c`, με βάση εκείνο το branch. Δεν αλλάζει η ορατότητα και δεν γίνεται merge στο main.

| ID | Εργασία | Status | Owner | Dependency |
|---|---|---|---|---|
| PX-1 | Shell χάρτη, format αριθμών, επιθεώρηση, viewport | done | Cursor Grok 4.7 / cursor/product-experience-864c | Header πάνω, checkbox στο label, ελληνικό compact, χάρτης αρχική οθόνη. Ο κόσμος μένει κενός στις χώρες χωρίς fact. |
| PX-2 | WDI για όλες τις χώρες με γεωμετρία | done | Cursor Grok 4.7 / cursor/product-experience-864c | 164 χώρες με ΑΕΠ 2022. 10 πολύγωνα χωρίς τιμή μένουν κενά. CC BY 4.0. |
| PX-3 | Graph δίπλα στον πίνακα και διάγραμμα με άξονες που διαβάζονται | done | Cursor Grok 4.7 / cursor/product-experience-864c | Κύκλος δίπλα στον πίνακα. Γραμμή μόνο σε διαδοχικά έτη με τιμή. Στο 390 το 2023 θέλει οριζόντια κύλιση. |
| PX-4 | Κρίση screenshots 1440/390 και δεύτερο πέρασμα | done | Cursor Grok 4.7 / cursor/product-experience-864c | Το id δεν κολλάει πια στο όνομα. Στο τηλέφωνο η επιθεώρηση των φορμών δεν σκεπάζει το πεδίο. Οι φόρμες μένουν σελίδες, όχι συρτάρια. |

## Προηγούμενη ανάθεση: πολύωρη συνέχεια

Η ουρά N0–N7 ολοκληρώθηκε στο `cursor/overnight-depth-864c`. Το κείμενο παρακάτω είναι η αρχική ανάθεση, όπως καταγράφηκε τότε.

| ID | Εργασία | Status | Owner | Dependency |
|---|---|---|---|---|
| N-PLAN | Σχεδιασμός και GitHub handoff | done | Codex | — |
| N0 | Baseline, επανέλεγχος review και milestone statuses | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | R1 ήδη κλειστό στο 18d0ebd. R2/R4 κλείνουν στο N1. R3 μένει για N4. |
| N1-A | Basis/status-aware εισαγωγές και duplicates | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Reported μένει δίπλα σε assumption. Σύγκρουση μέσα στο CSV απορρίπτεται. |
| N1-B | Strict export/history/action validation | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Κακογραμμένο ιστορικό απορρίπτεται ολόκληρο. |
| N1-C | Regressions transactions, replay και stale tabs | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Τα υπάρχοντα repository/IndexedDB tests πέρασαν μαζί με τα νέα. |
| N2 | Γενικά κοινά φίλτρα, metrics και geometry mappings | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Κοινό έτος/βάση/πηγές. Δεύτερη πηγή μένει σύγκρουση. Demo 2023, real 2022. |
| N3 | Query builder και role bindings από UI | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Κενός χώρος: φόρμα ερωτήματος, reload, δεύτερη διαδρομή. Ασυμβίβαστο binding απορρίπτεται. |
| N4-A | Generic graph explorer και inspector | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Αναζήτηση, 1–2 βήματα, φίλτρο τύπου/κατεύθυνσης, όριο 200/500, πίνακας. |
| N4-B | Διαδραστικοί world/region maps και numeric scale | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Click, πληκτρολόγιο, κλίμακα, no-data και πηγή στον inspector. |
| N4-C | Comparisons, trends και browser acceptance | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Σειρά μόνο από υπάρχοντα έτη. Κενό έτος μένει κενό. |
| N5 | CSV imports entities/edges/relationship facts | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Ακριβές ID. Άγνωστος τύπος/άκρο unresolved. Μεγάλο αρχείο δεν κόβεται σιωπηλά. |
| N6 | Επαλήθευση πραγματικής διαδρομής και technical case study | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | docs/CASE_STUDY.md. Κάλυψη 9/14. Όχι μελέτη χρηστών. |
| N7 | CI, performance/accessibility, τεκμηρίωση και handoff | done | Cursor Grok 4.7 / cursor/overnight-depth-864c | Workflow Node 24. Όριο 50k δεν ανέβηκε. CI στο 590bcb5: 4/4 χωρίς αποτυχία. |

Τα αναλυτικά acceptance/gates βρίσκονται στο πλάνο. Claim πριν από εργασία,
PROGRESS/TASKS μετά από κάθε task. Αν source μπλοκάρει, συνέχισε ανεξάρτητο task.

## Προηγούμενη κατάσταση milestones (προς επανέλεγχο από N0)


Ενημέρωση: 2026-11-09. Status: todo / in_progress / blocked / done.
Owner `—` σημαίνει unclaimed. Τα Markdown claims δεν είναι distributed locks.
Πριν από εργασία έλεγξε branch/PR assignments αν υπάρχει κοινό remote.
Το PROGRESS.md κρατά το ιστορικό· εδώ βρίσκεται η τρέχουσα ουρά.

| ID | Εργασία | Status | Owner / branch | Εξάρτηση |
|---|---|---|---|---|
| T-M0-01 | Σχέδιο, contracts, fixture, validator, tests | done | Codex / χωρίς branch | — |
| T-MEM-01 | Πέντε αρχεία μνήμης και agent workflow | done | Codex / χωρίς branch | M0 |
| T-REPO-01 | GitHub repo και αρχικό versioned snapshot | blocked | Cursor Grok 4.7 / cursor/m1-workspace-editor-864c | Clone και tests πέρασαν με Node 24.22.2. Μένει private ορατότητα, απόφαση ιδιοκτήτη — δεν αλλάζει σε αυτή την εργασία |
| T-M1-01 | React/TS/Vite scaffold και scripts/lockfile | done | Cursor Grok 4.7 / cursor/m1-workspace-editor-864c | M0. Build, typecheck, lockfile, υπάρχοντα tests |
| T-M1-02 | Strict parser, actions και repository contract | done | Cursor Grok 4.7 / cursor/m1-workspace-editor-864c | Unknown fields, limits, typed errors, malformed tests |
| T-M1-03 | IndexedDB adapter, transactions, revision conflicts | done | Cursor Grok 4.7 / cursor/m1-workspace-editor-864c | Reload, atomic failure, stale tab, idempotent IDs |
| T-M1-04 | Generic ontology/entity/edge/fact editors | done | Cursor Grok 4.7 / cursor/m1-workspace-editor-864c | Supplier/capacity/supplies_to από φόρμες, με πηγή |
| T-M1-05 | Browser acceptance, reload, failure/tab tests | done | Cursor Grok 4.7 / cursor/m1-workspace-editor-864c | Playwright, keyboard, conflict, screenshots 390/1440 |
| T-M2-01 | Mapping/import preview, idempotency, atomic commit | done | Cursor Grok 4.7 / cursor/m1-workspace-editor-864c | CSV preview, unresolved IDs, ίδιο αρχείο δεν διπλασιάζει |
| T-M2-02 | Full export/restore, corrections/history, guarded undo | done | Cursor Grok 4.7 / cursor/m1-workspace-editor-864c | Νέος χώρος, άγνωστη version, διόρθωση, αναίρεση με εξάρτηση |
| T-M3-01 | Graph/query engine, saved views και shared filters | done | Cursor Grok 4.7 / cursor/m3-queries-maps-864c | Path query, cache, compare/rank, explorer. Browser: νέα εταιρεία μπαίνει στην ίδια προβολή. |
| T-M4-01 | Τέσσερα modules, world/Greek region maps | done | Cursor Grok 4.7 / cursor/m3-queries-maps-864c | Τέσσερις προβολές, Natural Earth, NUTS. Η region:CENTRAL μένει χωρίς πολύγωνο, ρητά. |
| T-M5-01 | Επαλήθευση πηγών και μικρά πραγματικά datasets | done | Cursor Grok 4.7 / cursor/m5-real-sources-864c | WDI ΑΕΠ/πληθυσμός και Eurostat περιφέρειες/FDI. Η στρατιωτική σειρά SIPRI μένει blocker. |
| T-M5-02 | Πραγματική cross-module ανάλυση και μέτρηση αξίας | done | Cursor Grok 4.7 / cursor/m5-real-sources-864c | Εννέα διαδρομές Germany → FRAPORT AG → αεροδρόμιο → NUTS 2. Οι εφαρμογές δείχνουν το ΑΕΠ 2022, το FDI και τις 13 περιφέρειες. Πέντε αεροδρόμια μένουν blocker. |

## Επόμενη development εργασία

T-M5-02 έκλεισε μερικά στο `cursor/m5-real-sources-864c`.
Η διαδρομή εταιρείας υπάρχει για εννέα αεροδρόμια. Άκτιο, Καβάλα, Σαντορίνη, Μυτιλήνη και Σκιάθος δεν παίρνουν περιφέρεια χωρίς νέα παραπομπή.
Η στρατιωτική σειρά περιμένει όρο αναδιανομής της SIPRI.

Ιστορικό acceptance του scaffold:

Scaffold στον υπάρχοντα project root χωρίς αντικατάσταση core/fixture/tests/docs.
Επαλήθευση εκδόσεων/αδειών, lockfile, dev/build/typecheck scripts και μικρό app shell.
Το υπάρχον npm test και npm run validate πρέπει να συνεχίσουν να περνούν.
Acceptance: app ξεκινά, build και typecheck περνούν, README έχει run commands,
PROGRESS/TASKS ενημερωμένα. Δεν αρκεί το scaffold για να χαρακτηριστεί ολόκληρο M1 done.
Το prompts/START_HERE.md περιγράφει όλο το M1· κάθε μικρό task μπορεί να εκτελείται
σε χωριστή συνεδρία εφόσον διατηρείται το συνολικό acceptance.

## Acceptance των υπόλοιπων M1 tasks

- T-M1-02: strict parsing με limits/unknown fields, action validation, stable IDs,
  typed errors και repository interface, με tests malformed/invalid changes.
- T-M1-03: persistence/reload, atomic failed writes, expectedRevision conflict από
  δεύτερο tab, idempotent action IDs. Καμία σιωπηρή απώλεια αλλαγών.
- T-M1-04: νέος τύπος Supplier/property/relation και instances από generic forms,
  source/evidence, inspector. Μη έγκυρες αλλαγές δεν αποθηκεύονται.
- T-M1-05: πλήρης M1 browser διαδρομή από κενό workspace, persistence μετά reload,
  390/1440px, screenshots, keyboard, meaningful tests, build/typecheck.

Για M2–M5 ισχύουν τα αναλυτικά acceptance criteria στο docs/MILESTONES.md.
Real-data source/άδεια/coverage που λείπουν καταγράφονται ως blockers, όχι ως done.

## Acceptance T-REPO-01

Repository στο σωστό account ως private, μόνο ο world-model φάκελος, .gitignore
ελεγμένο, αρχικό commit/main και remote URL καταγεγραμμένα, clone σε δεύτερο χώρο
περνά tests/validation, επιλεγμένοι agents έχουν πρόσβαση. Μην καταχωρίσεις tokens.
Δεν μπλοκάρει τοπική M1 ανάπτυξη, αλλά χρειάζεται πριν από κοινή απομακρυσμένη εργασία.

## Claim template

Πριν αρχίσεις, ενημέρωσε owner/session, branch και status στην αντίστοιχη γραμμή.
Σε blocked εργασία γράψε αιτία/εξάρτηση στο PROGRESS. Στο τέλος ενημέρωσε και τα δύο
αρχεία ακόμη και αν δεν ολοκληρώθηκε το task. Μην κρατάς μυστικές εκκρεμότητες στο chat.

Backlog μετά M5: monitoring/alerts, AI με citations, εξειδικευμένη πρόβλεψη,
simulation/decision support. Δεν είναι εγκεκριμένο τρέχον implementation scope.



## Συμπληρωματική μελέτη σχεδιασμού (2026-11-09)

- T-REF-01 — done, Codex: μελέτη World Monitor, Sovereign και God's Eye View· δημόσιο HTML/CSS, επιλεγμένος source κώδικας και άδειες. Αναφορά: docs/research/REFERENCE_STUDY.md.
- N4 guidance: layer registry, κοινό selection/inspector και source availability όπως στην αναφορά. Εφαρμόζεται μετά τα N1–N3, όχι ως παράκαμψή τους.
- N7 guidance: portable saved exploration view και notices μόνο για source που πραγματικά επαναχρησιμοποιείται.
- 3D/Cesium και simulator παραμένουν future proposals. Δεν προστέθηκαν ως υποχρεωτικά overnight tasks.
