# Αποφάσεις, όρια και εξέλιξη

## Ρητές κατευθύνσεις του χρήστη

Browser-first, χαμηλό κόστος, τέσσερις αρχικοί τομείς, ενιαίο World Model,
κατανόηση ΚΑΙ υποστήριξη αποφάσεων. Προσθήκη δεδομένων/οντολογιών/σχέσεων από τον
χρήστη ώστε να αυξάνεται η χρησιμότητα. Μικρό πείραμα πριν από μεγαλύτερη επένδυση.

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
