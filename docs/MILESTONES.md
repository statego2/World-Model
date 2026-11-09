# Roadmap εκτέλεσης — μία μικρή εργασία κάθε φορά

Το browser-first δεν σημαίνει ότι περιμένουμε να τελειώσει όλο το προϊόν για να
δούμε κάτι. Το πρώτο milestone είναι ήδη χειρίσιμος editor, όχι μόνο API.

## M0 — το παρόν πακέτο

Σχέδιο, portable types, synthetic workspace, domain validator και offline tests.
Ο editor, storage adapter και queries είναι ακόμη προδιαγραφές.

## M1 — ο χρήστης χτίζει και αποθηκεύει ένα μικρό μοντέλο

React/TS/Vite shell, generic ontology forms, entity/relationship/fact editors,
repository + IndexedDB, validation/actions και μικρός entity table/inspector.
Δημιούργησε νέο workspace και επιλογή φόρτωσης DEMO, χωρίς silent seed σε real.
Επέκτεινε τον starter validator με strict parsing, limits και date semantics.

Acceptance: από κενό workspace ο χρήστης δημιουργεί τύπο Supplier, property capacity,
σχέση supplies_to προς Infrastructure, δύο οντότητες, πηγή, ακμή και fact. Μετά από
reload όλα παραμένουν. Η φόρμα για νέο τύπο παράγεται χωρίς νέο component.
Ακατάλληλα άκρα/τιμές/πηγές απορρίπτονται πριν το save. Failed transaction δεν
αλλάζει revision. Δεύτερο tab με stale revision παίρνει conflict, όχι απώλεια αλλαγών.
Typecheck/build και browser smoke αυτής της διαδρομής. Καταγραφή screenshots 390/1440.

## M2 — εισαγωγές, backup και εξέλιξη δεδομένων

CSV/JSON wizard, exact matching, previews, source cards, idempotency, atomic commit,
full JSON export/restore, history, correction, deprecation και guarded undo.

Acceptance: νέο CSV προσθέτει dataset/μετρήσεις από UI χωρίς κώδικα. Ίδιο αρχείο/mapping
δεν δημιουργεί duplicates. Άγνωστο ID μένει unresolved. Mid-import failure αφήνει
snapshot αμετάβλητο. Export → νέο workspace → restore διατηρεί IDs/τιμές/πηγές/ιστορικό.
Άγνωστη format version απορρίπτεται. Διόρθωση fact κρατά την προηγούμενη έκδοση.

## M3 — graph, queries και πρώτο cross-module αποτέλεσμα

Generic graph/table explorer, saved views, time/source/basis filters, path query,
compare/rank με coverage, role-binding metadata για modules.

Acceptance: η ερώτηση επενδυτής → εταιρεία → υποδομή → περιφέρεια επιστρέφει την
τεκμηριωμένη διαδρομή. Προσθήκη δεύτερης εταιρείας/υποδομής μέσω UI ενημερώνει το
ίδιο saved view χωρίς edit κώδικα ή query. Εκτός ισχύος/assumption edges αποκλείονται.
Cycles τερματίζουν, truncation δηλώνεται, cache ακυρώνεται σε νέα revision.
Συγκρίσεις δεν ενώνουν διαφορετικές μονάδες/έτη/πηγές. Conflict δεν επιλύεται σιωπηρά.

## M4 — οι τέσσερις αρχικές εφαρμογές σε μικρό scope

World map και rankings/trends, military compare, capital view, Greek region map.
Αδειοδοτημένες τοπικές γεωμετρίες και αντιστοίχιση stable IDs. Shared inspector,
filters και role bindings. Αρχικά synthetic data με εμφανή σήμανση.

Acceptance: τα 9 κριτήρια του brief: world map, country facts, ranks/compare,
GRC/TUR compare, επιλεγμένα capital flows, Greek regional map, κοινά entities/metrics,
πηγές/χρόνος, τουλάχιστον μία cross-module σύνδεση. Τα υπόλοιπα κράτη είναι no-data.
Το Greek regional map δεν αντικαθίσταται σιωπηρά από country map. Αν λείπει άδεια ή
γεωμετρία δηλώνεται συγκεκριμένος blocker και το milestone δεν θεωρείται πλήρες.

## M5 — πραγματικά δεδομένα και δοκιμή χρησιμότητας

Έλεγχος πηγών/αδειών, πρώτη πραγματική WDI λήψη, μία αμυντική και μία διμερής
οικονομική σειρά, ένας ελληνικός περιφερειακός δείκτης. Manual νόμιμη λήψη/CSV
είναι αποδεκτή. Δεν χρειάζεται backend μόνο και μόνο για να αρχίσει η δοκιμή.

Acceptance: δύο πραγματικές πηγές μοιράζονται stable entity IDs. Μία πραγματική
cross-module διαδρομή με ξεχωριστά evidence για εταιρεία/επένδυση/υποδομή/περιφέρεια.
Αν τέτοια τεκμήρια δεν είναι διαθέσιμα, η Υπόθεση Β παραμένει μη αποδεδειγμένη.
Στις 2026-11-09 η διαδρομή τεκμηριώθηκε για εννέα αεροδρόμια και έμεινε ανοιχτή για πέντε.
Μετράμε χρόνο, κάλυψη και λάθη σε πραγματικό ερώτημα πριν/μετά το εργαλείο.
Δεύτερο import/αναθεώρηση/λάθος λήψη/απουσίες ελέγχονται. Καμία χρήση DEMO στο REAL.

## Μετά την αξιολόγηση

M6 monitoring και alerts. M7 εξειδικευμένη ανάλυση και AI με τεκμήρια.
M8 ξεχωριστά μοντέλα πρόβλεψης με backtesting και uncertainty. M9 simulation και
σύγκριση αποφάσεων με objectives/constraints. Κανένα δεν θεωρείται ήδη δεσμευμένο scope.
