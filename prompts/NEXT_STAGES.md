# Κοινή οδηγία σε κάθε επόμενη συνεδρία

Διάβασε AGENTS.md, PROJECT.md, ARCHITECTURE.md, PROGRESS.md και TASKS.md στη ρίζα.
Δήλωσε task/owner πριν αρχίσεις. Ενημέρωσε PROGRESS.md και TASKS.md πριν τελειώσεις.
Όπου τα παρακάτω prompts αναφέρουν STATUS εννοείται το root PROGRESS/TASKS· το
παλιό docs/STATUS.md είναι πλέον μόνο σύνδεσμος προς τα κοινά αρχεία μνήμης.

# Prompts συνέχειας — χωριστές συνεδρίες

## M2
Διάβασε AGENTS, STATUS, OPERATIONS και M2 στο MILESTONES. Επιβεβαίωσε ότι το M1
λειτουργεί. Πρόσθεσε CSV/JSON mapping-preview-commit, exact matching, import reports,
idempotency και full export/restore σε νέο workspace. Πρόσθεσε append-only history,
correction/deprecation και guarded undo. Απόδειξε atomic failure και portable restore
με browser tests. Μην αλλάξεις τον στόχο σε dashboard. Σταμάτα στο M2, ενημέρωσε STATUS.

## M3
Διάβασε τα ίδια και MASTER_PLAN. Υλοποίησε generic graph/table explorer, παραμετρικό
path query, time/source/basis filters και saved views. Απόδειξε ότι προσθήκη εταιρείας
και υποδομής από το UI αλλάζει το αποθηκευμένο cross-module query χωρίς αλλαγή κώδικα.
Έλεγξε cycles, truncation, source conflicts, assumptions και cache invalidation.
Role bindings για επόμενα modules ως metadata. Σταμάτα στο M3, ενημέρωσε STATUS.

## M4
Υλοποίησε τις τέσσερις θεματικές εφαρμογές πάνω στο κοινό repository/query layer.
Απαγορεύονται per-module data arrays. Άδειες και mapping για world/Greek regional
geometries. Πρόσθεσε shared inspector και κάνε τα 9 acceptance checks του M4, browser
flow 390/1440 και keyboard. Demo labeling παντού. Σταμάτα στο M4.

## M5
Έλεγξε source cards και πραγματικές λήψεις/άδειες. Κράτα real workspace χωριστό.
Φέρε μικρά πραγματικά datasets και μία πραγματική cross-module διαδρομή με evidence
για κάθε βήμα. Αν δεν βρίσκεις τεκμήρια, δήλωσε την υπόθεση που παραμένει ανεπιβεβαίωτη.
Μέτρησε χρησιμότητα με πραγματικό ερώτημα, όχι απλώς rendered charts. Σταμάτα στο M5.
