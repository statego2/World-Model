# Αποφάσεις, όρια και εξέλιξη

## 2026-11-09 — Ορατότητα repository και Node

Το GitHub repository `statego2/World-Model` είναι public. Το σχέδιο πρότεινε private αντίγραφο. Σε αυτή την εργασία η ορατότητα δεν αλλάζει· την αποφασίζει ο Dimitris. Δεν αποθηκεύονται tokens στα αρχεία του project.

Το `npm test` χρησιμοποιεί `--test-isolation=none`, σημαία του Node 24. Το Node 22.23.4 του VM την απορρίπτει. Το `.nvmrc` καρφώνει την έκδοση 24, σύμφωνη με το `engines`. Η επαλήθευση του clone έγινε με Node 24.22.2.

Το ανοιχτό draft PR #1 (`work/m1-browser-editor`) είναι μερικό JSX shell: αποθηκεύει ολόκληρο workspace, χωρίς strict parser, action envelope, idempotency ή typed errors. Η υλοποίηση του M1 ξεκινά από το `main` σε νέο branch, ώστε το συμβόλαιο να μην μείνει μισό. Εκείνο το PR δεν κλείνει από αυτή την εργασία.

## Ρητές κατευθύνσεις του χρήστη

Browser-first, χαμηλό κόστος, τέσσερις αρχικοί τομείς, ενιαίο World Model,
κατανόηση ΚΑΙ υποστήριξη αποφάσεων. Προσθήκη δεδομένων/οντολογιών/σχέσεων από τον
χρήστη ώστε να αυξάνεται η χρησιμότητα. Μικρό πείραμα πριν από μεγαλύτερη επένδυση.

## 2026-11-09 — Υλοποίηση M1/M2

Ο domain πυρήνας μένει χωρίς runtime βιβλιοθήκη. Το Zod προτάθηκε για schemas,
αλλά unknown fields και όρια βάθους/μεγέθους γράφτηκαν ρητά ώστε τα tests και
ένας μελλοντικός adapter να εισάγουν τα ίδια αρχεία χωρίς React ή Dexie.

Το history και τα idempotency records ζουν σε ξεχωριστά IndexedDB stores. Το
workspace document μένει το formatVersion 1 του fixture. Η επανάληψη ενός
επιτυχημένου action ID επιστρέφει το προηγούμενο αποτέλεσμα και το τρέχον
workspace, χωρίς δεύτερη εγγραφή και χωρίς να γυρίζει το UI σε παλιό snapshot.
Διαφορετικό payload με το ίδιο action ID είναι σφάλμα, όχι σιωπηλή επιτυχία.

Δεν μπήκε React Router. Το hash αρκεί για τις ενότητες και επιβιώνει σε reload.
Αποκλεισμένη πηγή δεν στηρίζει νέο ισχυρισμό. Η αναίρεση είναι αντίστροφη
ενέργεια που σταματά όταν υπάρχουν εξαρτήσεις και προτείνει αρχειοθέτηση ή
απόσυρση. Το CSV δεν δημιουργεί οντότητα για άγνωστο ID.

Γραμματοσειρές: Source Sans 3 και Source Serif 4, άδεια OFL-1.1, με ελληνικό
και λατινικό subset. Οι άδειες των άμεσων βιβλιοθηκών που κλειδώθηκαν είναι
MIT ή Apache-2.0.

## Επιλογές αυτού του σχεδίου

Editable lightweight ontology στο πρώτο PoC αντί για αναβολή όλων των συνδέσεων.
Browser-only persistence αρχικά. Generic editor/explorer και τέσσερις θεματικές
προβολές. Backend και πλήρης enterprise ontology μετά από τεκμηριωμένη ανάγκη.
Δεν παρουσιάζουμε τις τεχνικές αυτές επιλογές ως ήδη συμφωνημένο ιστορικό stack.

## Τα 7 επίπεδα είναι χάρτης ικανοτήτων, όχι υποχρεωτική σειρά

| Επίπεδο | Τι χρειάζεται | Σχέση με PoC |
|---|---|---|
| Visualization | γεωμετρίες, πίνακες, γραφήματα | M4 |
| Monitoring | ανανεώσεις, συγκρίσεις snapshots, alerts | manual history M2, automation αργότερα |
| Ontology | οντότητες, properties, σχέσεις, actions | ελαφρύς πυρήνας M1, πλήρης αργότερα |
| Analytical Intelligence | συγκρίσιμες μετρήσεις, queries, coverage | περιορισμένα deterministic templates M3 |
| Predictive Intelligence | επιλεγμένος στόχος, training/evaluation, uncertainty | μελλοντικό, όχι αυτόματα από το graph |
| Simulation | μοντέλο μηχανισμών, assumptions, calibration | μελλοντικό ξεχωριστό subsystem |
| Decision Intelligence | objectives, εναλλακτικές, constraints, trade-offs | μακροπρόθεσμο |

Μελλοντικό scenario: immutable base revision + assumptions overlay + model/version
+ parameters + outputs/uncertainty. Δεν μεταβάλλει factual workspace. Χρειάζεται
ξεχωριστό design και validation. Οι LLM εξηγήσεις θα παραπέμπουν σε τεκμήρια, όχι
θα υποκαθιστούν αιτιώδεις/οικονομικούς υπολογισμούς. Καμία πρόβλεψη «νικητή» από
counts στρατιωτικών μέσων. Δεδομένα διαθεσιμότητας/εκπαίδευσης/δόγματος μπορεί να λείπουν.

## Κόστος και ρίσκα εκτέλεσης

Χωρίς υποχρεωτικό paid data feed, hosted DB ή AI inference για το PoC. Υπάρχει
κόστος ανάπτυξης/AI coding, εξοπλισμού, χρόνου έρευνας και συντήρησης πηγών.
Η ποιότητα/κανονικοποίηση/άδεια των δεδομένων μπορεί να είναι δυσκολότερη από το UI.
Δεν υπόσχεται το σχέδιο συγκεκριμένο χρόνο ή εμπορική επιτυχία.
Browser storage έχει όρια και δεν συγχρονίζεται. Multiuser, permissions, server
jobs και μεγάλος όγκος απαιτούν νέα απόφαση. Η επιτυχία κρίνεται στα A/B/C του
MASTER_PLAN, όχι στο πλήθος widgets ή nodes.
