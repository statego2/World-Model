# Πηγές και ποιότητα

Η πρώτη ελεγμένη λήψη είναι στο `data/real/SOURCES.md` (2026-11-09).
Οι γραμμές παρακάτω μένουν υποψήφιες όπου δεν υπάρχει κάρτα σε εκείνο το αρχείο.
Η σειρά SIPRI μέσω WDI `MS.MIL.XPND.CD` ελέγχθηκε και αποκλείστηκε: δεν επιβεβαιώθηκε άδεια αναδιανομής.

| Πεδίο | Starting points | Έλεγχος πριν την εισαγωγή |
|---|---|---|
| Οικονομία/δημογραφία | data.worldbank.org, api.worldbank.org, data.un.org | μονάδες, aggregate codes, αναθεωρήσεις, pagination |
| Άμυνα | sipri.org/databases/milex, nato.int | διαφορετικοί ορισμοί, estimates, όροι πρόσβασης |
| Κεφάλαια | data.imf.org, unctad.org, data-explorer.oecd.org | FDI vs portfolio, stock vs flow, reporter direction |
| Χρηματοπιστωτικά | bis.org/statistics | κάλυψη, claims/positions, confidentiality |
| Ελληνική οικονομία | statistics.gr, ec.europa.eu/eurostat | NUTS/NACE versions, suppressions, period |
| Ελληνικά χρηματοοικονομικά | bankofgreece.gr | revisions, scope, συχνότητα |
| Εταιρείες/υποδομές | επίσημα registry/company/authority documents | explicit evidence, χρονική ισχύς, άδεια |
| Γεωμετρίες | naturalearthdata.com, GISCO Eurostat | άδειες, attribution, country/NUTS mapping |

Source card πριν το import: φορέας, dataset key, landing URL, ακριβές download,
λήψη, περίοδος, μέθοδος, μονάδα, άδεια, redistribution terms, rate limits, κάλυψη,
raw hash και παρατηρήσεις. Candidate μέχρι να ελεγχθούν. Όχι υπόθεση «δημόσιο=ελεύθερο».
Local evidence επιτρέπεται με locator τύπου file:// ή stable document reference,
χωρίς να ανεβαίνει το αρχείο αυτομάτως. Μη δημοσιεύεις ιδιωτικές πηγές με το site.

Το πρώτο πραγματικό dataset μπορεί να είναι WDI GDP/population για 5 χώρες και
κοινά έτη, εφόσον επαληθευθούν. Όχι hardcoded fabricated τελευταίες τιμές.
Companies και regional links χρειάζονται πραγματικά τεκμήρια ανεξάρτητα από macro
datasets. Για aggregate bilateral FDI δεν επιτρέπεται αυτόματο company attribution.
Η εφαρμογή καταγράφει τις γνωστές ελλείψεις και την κάλυψη, όχι μόνο τις τιμές.
