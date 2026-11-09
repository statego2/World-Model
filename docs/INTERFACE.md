# Browser εμπειρία

## Προτεινόμενη επιλογή διάταξης

Κοινό shell με πλοήγηση: Εξερεύνηση, Οντολογία, Δεδομένα, Αναλύσεις και τις τέσσερις
θεματικές ενότητες. Όλες χρησιμοποιούν κοινό entity inspector και φίλτρα χρόνου,
πηγής, basis και workspace. Η οργάνωση αυτή είναι πρόταση του σχεδίου, όχι ήδη
επιβεβαιωμένη ιστορική προτίμηση. Ο χάρτης δεν επιβάλλεται σε κάθε εργασία.

```text
┌ WORLD MODEL · Workspace · DEMO/REAL · Έτος · Αποθήκευση · Export ┐
│ Πλοήγηση │ Καμβάς: graph / map / table / chart │ Inspector      │
│ Ontology │ Φίλτρα και ερώτημα                 │ Entity / facts │
│ Data     │                                   │ Σχέσεις        │
│ 4 modules│ Αποτελέσματα / coverage / conflicts│ Evidence       │
└──────────┴───────────────────────────────────┴────────────────┘
```

## 1. Ontology Studio

Tabs: τύποι οντοτήτων, τύποι σχέσεων, properties. «Νέος τύπος» ζητά ID, label,
περιγραφή. «Νέα σχέση» ζητά label, ακριβές νόημα και from/to types. «Νέο property»
ζητά owner, primitive, μονάδα και metric semantics όπου χρειάζονται.
Impact preview πριν από αλλαγές χρησιμοποιημένων definitions. Δεν επεξεργάζεσαι JSON
για συνηθισμένη εργασία. Generic entity/edge forms παράγονται από αυτούς τους ορισμούς.

## 2. Entity και relationship editor

Προσθήκη/μετονομασία/αρχειοθέτηση αντικειμένου. Search επιλογή άκρων μιας σχέσης,
source/evidence, χρόνος ισχύος και basis. Το graph μπορεί να προτείνει άνοιγμα της
φόρμας σύνδεσης αλλά η αποθήκευση απαιτεί ρητό commit. Δεν αρκεί να τραβήξεις μια γραμμή.
Fact editor εμφανίζει ορισμό/μονάδα, περίοδο, status, source και correction history.
Αλλαγές χωρίς επιτυχημένο save εμφανίζονται ως μη αποθηκευμένες.

## 3. Data Studio

Λίστα sources/datasets, import wizard, unresolved matches, import reports και mapping
presets. Demo source δεν εισάγεται σε real workspace. Manual source επιτρέπεται,
αλλά μια προσωπική σημείωση είναι υπόθεση/ισχυρισμός με attribution, όχι επίσημη μέτρηση.

## 4. Explorer και saved analyses

Entity search → γείτονες → περιορισμένη path query → πίνακας αποτελεσμάτων.
Ο χρήστης επιλέγει relation types/φίλτρα από dropdowns που διαβάζουν ontology.
Save view αποθηκεύει το ερώτημα και τα bindings· όχι hardcoded λίστα αποτελεσμάτων.
Ένα συγκεκριμένο query template συνδέει capital και Greek economy όπως στο MASTER_PLAN.

## 5. Τέσσερις εφαρμογές

World Map: χώρα, metric, choropleth, legend, coverage, rank, compare και trend.
Military: Ελλάδα/Τουρκία ανά διαθέσιμη κατηγορία και κοινή πηγή/έτος, με κενά ορατά.
Capital: κατευθύνσεις, stock/flow ξεχωριστά, χώρα/εταιρεία με ακμή προς inspector.
Greek Economy: χάρτης περιφερειών, δείκτες/κλάδοι, συνδέσεις εταιρειών/υποδομών.

Module definitions χρησιμοποιούν explicit role bindings: ποιο entityType παίζει τον
ρόλο country/region, ποιο property είναι population/GDP, ποιο relation είναι capital.
Bindings ρυθμίζονται από metadata, όχι με fuzzy αναγνώριση labels. Νέοι τύποι
λειτουργούν αμέσως στον generic explorer· ειδική οθόνη χρειάζεται σχετικό binding
και συμβατά metadata. Δεν υποσχόμαστε αυτόματη παραγωγή εξειδικευμένου module.

## Προσβασιμότητα και states

390px: μία στήλη, inspector drawer/expandable panel, εναλλακτικός πίνακας σε χάρτη.
1440px: τρεις περιοχές. Keyboard controls, visible focus, επαρκές contrast, χρώμα
μαζί με label. Loading, empty, no-data, invalid-import, conflict, offline, storage-full
και unsupported-version states. DEMO badge σε κάθε οθόνη/export. No data ≠ zero.

## Αναφορά Sovereign

https://thenicedoctor.github.io/play/ — το HTML που εξετάστηκε στην προηγούμενη
εργασία είχε τίτλο Sovereign V15. Χρησιμοποιείται ως αναφορά για dark shell,
map-centered workspace και inspector. Δεν έγινε οπτικό browser test στο παρόν
πακέτο. Τα game indices/fictional στοιχεία δεν είναι πηγές πραγματικών δεδομένων.
Δεν αντιγράφουμε assets/κώδικα χωρίς επιβεβαιωμένη άδεια.
