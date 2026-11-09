# Εργασίες και dependencies

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
| T-M5-01 | Επαλήθευση πηγών και μικρά πραγματικά datasets | todo | — | M4 done |
| T-M5-02 | Πραγματική cross-module ανάλυση και μέτρηση αξίας | todo | — | T-M5-01 |

## Επόμενη development εργασία: T-M5-01

T-M3-01 και T-M4-01 ολοκληρώθηκαν στο `cursor/m3-queries-maps-864c`.
Επόμενο: έλεγχος πηγών και μικρά πραγματικά datasets. Όχι demo στη θέση πραγματικών μετρήσεων.
Η `region:CENTRAL` δεν έχει επίσημο NUTS id και δεν πρέπει να βαφτεί πάνω σε άλλη περιφέρεια.

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
