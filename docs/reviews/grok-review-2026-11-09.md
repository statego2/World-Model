# Ανεξάρτητος έλεγχος Cursor / Grok 4.7

Εξετάστηκαν τα PR #2, #3, #4 και το snapshot d3c738c95db8f5ac07d096d39686725ff936d942,
σε ξεχωριστό φάκελο /workspace/world-model-review. Δεν έγινε αλλαγή κώδικα ή merge
στο GitHub. Τα PRs είναι stacked: #2 → main, #3 → branch του #2, #4 → branch του #3.
Το main παραμένει στην αρχική έκδοση. Το παλιό draft #1 δεν πρέπει να ενσωματωθεί
παράλληλα ως ανεξάρτητη υλοποίηση του ίδιου editor χωρίς επίλυση διαφορών.

## Αποτελέσματα

npm ci, npm test (47/47), npm run typecheck, npm run build και npm run validate
πέρασαν. Και οι 6 υπάρχουσες Playwright δοκιμές πέρασαν με το διαθέσιμο system
Chromium και προσωρινό config που αλλάζει μόνο launch executable/flags.
Δεν έγινε πλήρης live διασταύρωση τιμών/αδειών των θεσμικών πηγών. Επιβεβαιώθηκε
η λειτουργία πάνω στα αποθηκευμένα extracts. Τα screenshots του bot δεν θεωρήθηκαν
υποκατάστατο των ανεξάρτητων ελέγχων.

## Ευρήματα που χρειάζονται διόρθωση

### R1 — P1: Τα modules κρύβουν πραγματικά δεδομένα λόγω demo φίλτρων

src/ui/modules.tsx:13 χρησιμοποιεί σταθερό year=2023 και source:demo-macro για κάθε
workspace. Το real workspace έχει source:wdi-gdp, source:eurostat-gdp και δεδομένα
περιφερειών/FDI του 2022. Ανεξάρτητη κλήση rankEntities για την Ελλάδα με τα φίλτρα
του module επέστρεψε missing, ενώ με source:wdi-gdp επέστρεψε value.
Επιπλέον Greece αντιστοιχίζει τη γεωμετρία από fixture IDs region:ATT, ενώ το real
workspace χρησιμοποιεί region:EL30, κ.λπ. Το Capital factText ψάχνει πάντα 2023.

Διόρθωση: κοινά επιλέξιμα source/year/property φίλτρα με διαθέσιμα metadata,
region mapping από NUTS facts/role bindings και ίδιο query path για real/demo.
Προσθήκη browser tests των πραγματικών δεδομένων σε κάθε σχετικό module.

### R2 — P1: Reported εισαγωγή συγχέεται με υπάρχουσα υπόθεση

src/core/import.ts:98-100 και commitImport στο src/core/actions.ts δεν περιλαμβάνουν
basis/status στον έλεγχο duplicates. Αναπαραγωγή: υπάρχον GDP 2023 της Ελλάδας
με basis=assumption· εισαγωγή CSV ίδιας τιμής με reported basis χαρακτηρίζεται
ως duplicate. Το reported rank εξακολουθεί να επιστρέφει missing. Αν η τιμή
διαφέρει, η preview προτείνει supersedes από assumption σε reported, το οποίο
απορρίπτεται από τους κανόνες corrections. Έτσι αποκλείεται η πραγματική μέτρηση.

Διόρθωση: ξεχωριστά natural keys για διαφορετική basis και σαφή semantics status/
evidence. Tests ίδιας και διαφορετικής τιμής assumption → reported, τόσο preview
όσο και πραγματικό CommitImport.

### R3 — P2: Το M4 δηλώνεται done χωρίς διαδραστικό χάρτη/επιλογές

src/ui/map.tsx:16-27 σχεδιάζει στατικά SVG paths, χωρίς onClick, keyboard επιλογή,
pan/zoom ή σύνδεση με inspector. Όλα τα δεδομένα παίρνουν το ίδιο valued χρώμα
(src/ui/style.css:116), ανεξάρτητα από αριθμό. Δεν υπάρχουν επιλογή δείκτη/έτους,
χρονοσειρά και legend αριθμητικής κλίμακας στο World module. Τα browser tests
ελέγχουν data attributes και screenshots, όχι τις απαιτούμενες αλληλεπιδράσεις.

Διόρθωση: επαναφορά M4 σε in_progress, υλοποίηση και έλεγχοι των σχετικών κριτηρίων.
Το ελαφρύ SVG είναι αποδεκτή τεχνολογία αν προσφέρει τις απαιτούμενες λειτουργίες.

### R4 — P2: Το restore δεν ελέγχει το ιστορικό/actions με τον strict parser

src/core/transfer.ts:18-23 ελέγχει το workspace, αλλά history/actions είναι ουσιαστικά
unknown arrays. Επιβεβαιώθηκε ότι export envelope με history:[{}], actions:[{}]
γίνεται δεκτό. Το restoreToStore μετά προσπερνά σιωπηρά malformed actions και
αποθηκεύει malformed history. Έτσι ένα αντίγραφο φαίνεται έγκυρο παρότι το audit
trail/idempotency δεν αποκαθίσταται πιστά. Τα size/depth limits του workspace
δεν καλύπτουν το πλήρες envelope ιστορικού.

Διόρθωση: αυστηρό envelope/record parsing, bounds και consistency checks πριν από
οποιαδήποτε εγγραφή. Invalid backup απορρίπτεται ολόκληρο χωρίς partial restore.

## Συμφωνία με το όραμα

Ο editor/action/repository διαχωρισμός και τα tests αποτελούν ουσιαστικό βήμα προς
επεκτάσιμο World Model. Οι δοκιμές δείχνουν ότι νέοι τύποι και συσχετίσεις λειτουργούν.
Ωστόσο δεν υπάρχει UI δημιουργίας saved queries ή role bindings· το Explore τρέχει
τις ήδη αποθηκευμένες προβολές και τα κοινά φίλτρα δεν αλλάζουν το stored path query.
Η νέα κενή workspace επομένως δεν αποκτά από μόνη της τις demo αναλύσεις.

Το T-M5-02 έχει κλείσει παρότι η πραγματική cross-module διαδρομή και η μέτρηση
χρησιμότητας του MASTER_PLAN παραμένουν μη αποδεδειγμένες. Το elapsedMs του builder
είναι μέτρηση εκτέλεσης, όχι μέτρηση ωφέλειας στον χρήστη. Καλύτερα να σημειωθεί
partial/blocked και να διατηρηθεί το επόμενο συγκεκριμένο acceptance task.

Προτεραιότητα: R1/R2, κατόπιν R4 και πραγματική ολοκλήρωση M3/M4. Δεν προτείνεται
επέκταση σε AI ή simulation πριν σταθεροποιηθούν τα παραπάνω.
