# Ανεξάρτητος έλεγχος νυχτερινής ανάπτυξης

Ημερομηνία: 2026-11-10. Ελεγμένο commit: e8a53447c70fca214406c40ef6b562864357f993,
PR #7 / cursor/product-experience-864c, πάνω στο PR #6. Η εφαρμογή ελέγχθηκε σε
απομονωμένο αντίγραφο, όχι πάνω στο παλιό local draft του Codex. Δεν έγινε merge,
αλλαγή runtime κώδικα ή νέα live επαλήθευση των θεσμικών datasets.

## Τι παραδόθηκε πραγματικά

- Query builder και semantic role bindings με actions, validation και history.
- Shared filters, relationship metrics, βελτιώσεις assumption/reported εισαγωγών.
- Entity/edge CSV imports, ενισχυμένο backup parser και regression tests.
- Graph neighborhood, συγκρίσεις και χρονοσειρές με κενά.
- Map-first shell, pan/zoom/focus, numeric logarithmic choropleth, no-data/zero,
  inspector, ελληνικοί compact αριθμοί και viewport/year στο hash.
- Επέκταση WDI για world map: το τεκμηριωμένο extract έχει 164 χώρες με GDP 2022,
  1197 facts συνολικά, διαφορετικές σειρές GDP/population/GDP per capita.
- Πραγματική εταιρική διαδρομή Fraport/αεροδρομίων με explicit evidence, κάλυψη 9/14.
- CI για Node 24 και Playwright. Καμία αναδιανομή SIPRI χωρίς επιβεβαιωμένους όρους.

## Ανεξάρτητα αποτελέσματα

npm ci, npm test: 63/63 pass, npm run typecheck, npm run build και npm run validate:
pass. Playwright: και οι 11 υπάρχουσες δοκιμές pass με system Chromium και
προσωρινό config που αλλάζει μόνο executable/launch flags. Επιθεωρήθηκαν τα
παραγόμενα screenshots 1440 και 390. Το production JS bundle είναι περίπου
1.03MB uncompressed / 224KB gzip, με Vite size warning· δεν είναι μόνο του blocker.

GitHub CI στο ίδιο SHA: push run 42706099222 και PR run 42706107406 completed/success.
Αυτή είναι πραγματική νέα επαλήθευση, όχι επανάληψη του παλιού claim «47+6».
Οι επιπλέον διερευνητικές αναπαραγωγές δεν προσμετρώνται στο suite του bot.

## Παλιός έλεγχος — τι διορθώθηκε

R1: η βασική εμφάνιση real δεδομένων και NUTS mapping λειτουργεί τώρα στα tests.
R2: assumption → reported καλύπτεται πλέον από unit και browser regression.
R3: προστέθηκαν selection, zoom, κλίμακα, graph και σειρά· δεν είναι πια στατικά SVG.
R4: malformed κενά records απορρίπτονται και αυξήθηκε το όριο fingerprints για import.
Παραμένει ανάγκη πλήρους validation των nested actions και consistency του audit.
Δεν ζητάμε να ξαναγραφούν οι παραπάνω ήδη λειτουργικές διαδρομές.

## Ευρήματα / επόμενες προτεραιότητες

### A — P1: επιστρέφων χρήστης δεν λαμβάνει το νέο cited snapshot

src/ui/model.tsx:loadCited χρησιμοποιεί το ίδιο workspace ID για όλες τις εκδόσεις.
Αν repository.restore επιστρέψει conflict, ο handler συνεχίζει σαν να φορτώθηκε
το νέο extract. Έτσι παλιό τοπικό workspace πέντε χωρών μπορεί να παραμείνει παλιό,
ενώ ο χρήστης βλέπει μήνυμα επιτυχίας της νεότερης έκδοσης.
Επιβεβαιώθηκε και σε browser: με προϋπάρχον παλιό sample, μετά το load η Γαλλία
παρέμεινε data-value=none ενώ το status έγραφε «Φορτώθηκε πραγματικό απόσπασμα».

Χρειάζεται explicit dataset version/hash και UI επιλογής «άνοιγμα υπάρχοντος» ή
«φόρτωση νέου snapshot σε νέο χώρο». Αν υλοποιηθεί update στον ίδιο χώρο, απαιτούνται
preview, backup, source revision handling και διατήρηση προσωπικών αλλαγών.
Μην διαγράφεις IndexedDB ή κάνεις overwrite για να περάσει το test.

### B — P1: διαφορετική σχέση με ίδιο ID ταξινομείται ως duplicate

src/core/import.ts:previewRelationships απορρίπτει ως duplicate οποιοδήποτε υπάρχον
edge ID χωρίς να ελέγχει from/to/type/evidence/validity. Επιβεβαιώθηκε με το demo:
ίδιο edge:investment, αλλαγή χώρας από DEU σε USA → disposition duplicate.
Ο χρήστης χάνει την ένδειξη σύγκρουσης. Δεν ζητείται αυτόματο overwrite.

Exact duplicate μόνο με ισοδύναμο canonical record. Διαφορετική σημασία = conflict
με before/after preview και σαφή resolution policy. Έλεγξε και conflicts μεταξύ
rows του ίδιου αρχείου. Regression σε core και browser/import report.

### C — P2: filters και selection δεν αποθηκεύονται πλήρως ως view

src/ui/atlas-context.tsx αποθηκεύει hash layer/year/vx/vy/vk. Basis/sourceIds και
selected entity/relationship δεν γράφονται ούτε αποκαθίστανται. Reload κάνει
chooseFilters και επανέρχεται σε reported/all-source defaults. Δεν είναι πλήρης
υλοποίηση του exploration-view acceptance του reference study.
Επιβεβαιώθηκε σε πρόσθετο browser probe: BASIS BEFORE assumption, BASIS AFTER reported.

Πρόσθεσε versioned view state με whitelist IDs/bounds, full roundtrip και no-private
facts in URL. Same-browser reload/back/forward και άλλος browser χωρίς dataset
είναι διαφορετικά cases. Τα unknown source IDs πρέπει να έχουν explicit warning,
όχι σιωπηρή αλλαγή του νοήματος της προβολής.

### D — P2: audit parsing παραμένει επιφανειακό μέσα στα actions

src/core/transfer.ts:actionShape ελέγχει κυρίως action.type και ύπαρξη child.id,
όχι πλήρες payload. JSON-parsed envelope με valid workspace/revision και history
CreateEntity action/inverse που περιέχει μόνο entity.id (χωρίς label/typeId)
γίνεται ακόμη δεκτό από readTransfer. Υπάρχουν και κενά διασταύρωσης history με
idempotency actions/fingerprints. Αυτό δεν αναιρεί τη βελτίωση έναντι του παλιού
history:[{}], αλλά δεν είναι πλήρες strict restore.

Χρειάζονται typed action schemas, bounded envelope, cross-record consistency,
valid historical syntax χωρίς απαίτηση παλιά αντικείμενα να είναι ακόμη ενεργά.
Μη θεωρήσεις το κάθε ιστορικό action επανεκτελέσιμο πάνω στο σημερινό snapshot.
Invalid restore ολόκληρο rollback, όχι silent skip. Valid old exports παραμένουν valid.

### E — P2: evidence/query metadata δεν αποτυπώνει μόνο τη χρησιμοποιημένη πηγή

src/core/query.ts:computePath βάζει query.sourceIds σε κάθε PathHit, αντί της
πραγματικής ένωσης evidenceIds των ακμών του path. Επιβεβαιώθηκε query με επιλεγμένες
source:demo-links και source:demo-macro: η macro εμφανίζεται ως source του path
χωρίς να στηρίζει κάποια ακμή. Η λίστα selectedSourceIds πρέπει να διαφέρει από
usedEvidenceIds. Το ίδιο ισχύει για metadata κατατάξεων.

Ο map inspector επίσης παίρνει neighbors με σκέτο workspace.relationships.filter,
χωρίς κοινά year/basis/source φίλτρα. Να ξεχωρίσει «όλες οι καταγεγραμμένες σχέσεις»
από «σχέσεις ενεργές με τα τρέχοντα φίλτρα», για να μη φαίνεται ληγμένη/assumption
σχέση ως τρέχον reported αποτέλεσμα. Πρόσθεσε αρνητικά tests.

## Όρια ολοκλήρωσης και κατεύθυνση

Το label «N0–N7 done» είναι υπερβολικά συνοπτικό. Υπάρχει σαφής λειτουργική πρόοδος,
αλλά εξακολουθούν hardcoded ISO/NUTS property/mapping assumptions, αποκλειστικό GDP
στο world layer αντί ελεύθερου metric selector, όριο import 200 rows και απουσία
μετρημένου larger-workspace benchmark. Το κινητό διάγραμμα απαιτεί horizontal scroll.
Τα υπόλοιπα 5 airport mappings και η SIPRI άδεια είναι πραγματικά data blockers,
όχι λόγος να ανασταλεί όλη η ανάπτυξη.

Δεν προτείνεται ακόμη AI/simulation/φωτορεαλιστικό globe. Προτείνεται:
1. Αξιόπιστο returning-user/update/backup flow.
2. Οντολογία και χάρτης που επεκτείνονται από χρήστη χωρίς hardcoded δεδομένα.
3. Ελεγχόμενες ανανεώσεις και πραγματική δοκιμή χρησιμότητας.
4. Καθαρή ενσωμάτωση των stacked PRs και reproducible release candidate.
