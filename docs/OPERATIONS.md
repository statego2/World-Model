# Ενέργειες, εισαγωγές και αναλύσεις

## Domain service — το συμβόλαιο του M1/M2

Οι ενέργειες είναι ελεγχόμενες αλλαγές του μοντέλου, όχι εξωτερικές κρατικές ή
οικονομικές παρεμβάσεις. Όλες δέχονται workspaceId, expectedRevision, actionId και
actor. Επιστρέφουν newRevision/changedIds ή typed validation/conflict error.

| Action | Ελάχιστος έλεγχος |
|---|---|
| DefineEntityType | Μοναδικό ID, label, όχι αλλαγή υπάρχουσας σημασίας |
| DefineRelationshipType | Υπαρκτά endpoint types, direction και περιγραφή |
| DefineProperty | Owner type, primitive, unit και metric semantics |
| CreateEntity / RenameEntity | Υπαρκτός τύπος, ID μοναδικό, label μη κενό |
| CreateRelationship | Υπαρκτά άκρα, επιτρεπτοί τύποι, evidence, χρόνος |
| RecordFact | Σωστό subject/property/value, μονάδα από definition, evidence |
| CorrectFact | Ίδιο natural key, supersedes, νέο record, παλιό διατηρείται |
| ArchiveEntity / DeprecateDefinition | Διατήρηση references, καμία cascade διαγραφή |
| SaveView | Έγκυρες references και query shape, όχι executable code |
| CommitImport | Όλο το validated staging plan σε μία transaction |

Τα record arrays του types.ts είναι η persisted μορφή. Τα action envelopes,
repository interfaces και οι stored history payloads θα υλοποιηθούν στο M1.
Ο starter validator δεν είναι ολοκληρωμένο action engine.

ExpectedRevision συγκρίνεται μέσα στη συναλλαγή. Κάθε successful action έχει unique
ID και καταγράφεται μία φορά· repeat ID επιστρέφει το προηγούμενο αποτέλεσμα.
Validation failure δεν αυξάνει revision. History append-only με πριν/μετά references,
όχι μυστική επανεγγραφή. Undo στο M2 είναι inverse action με έλεγχο dependencies.
Αν έχουν χτιστεί νέες εξαρτήσεις, το undo μπλοκάρει με εξήγηση και προσφέρει νέο
διορθωτικό action. Πλήρες snapshot export πριν από batch import.

## CSV/JSON wizard

1. Τοπική επιλογή αρχείου. Parsing ως δεδομένα, όχι execution.
2. Επιλογή/δημιουργία source με άδεια, χρόνο λήψης, scope και demo/real mode.
3. Mapping: στήλη → ID/label/type/property/year/relation endpoint. Αποθηκεύεται
   mapping template για επόμενη εισαγωγή της ίδιας μορφής.
4. Exact matching μόνο με ρητό external ID ή επιλεγμένο mapping. Άγνωστο ή
   αμφίσημο endpoint μπαίνει σε unresolved list, όχι fuzzy auto-merge.
5. Preview: νέα/υπάρχοντα/duplicates/conflicts/missing/errors και affected queries.
6. Commit μόνο όταν όλα τα accepted rows είναι valid. Ο χρήστης μπορεί να εξαιρέσει
   invalid rows ρητά πριν το commit· τίποτε δεν απορρίπτεται σιωπηρά.
7. Atomic transaction και report με source, hash, mappingVersion, counts, revision.

Idempotency key: file hash + canonical mapping hash + source identity + workspace.
Ίδιο input/mapping κάνει skip, νέο hash δίνει preview και δεν αντικαθιστά υπάρχοντα
facts χωρίς explicit correction. Όριο αρχείου αρχικά 10MB, preview έως 200 rows,
limits configurable αφού μετρηθούν. Decimals, ISO dates, UTF-8 και semicolon/comma
επιλέγονται ρητά. Όχι μετατροπή νομίσματος ή units χωρίς μετασχηματισμό με provenance.

## Queries και source selection

- List/filter entities και property facts ανά χρόνο, dataset/source, basis.
- Neighbors(entity, year, direction, relationTypes, maxHops<=2).
- PathQuery: ακολουθία έως 4 relation types με φίλτρα κόμβων και valid-at year.
- Compare: 2–5 entities, ίδιο numeric property/έτος/source, latest revisions.
- Rank: declared covered set, dense ties, missing εκτός κατάταξης.
- Group/count/sum: μόνο ίδιες μονάδες/περίοδοι και valid metric semantics.

Το query περιέχει IDs τύπων/πεδίων ως parameters. SavedView το επανεκτελεί στα
τρέχοντα δεδομένα· το cached result ακυρώνεται σε κάθε workspace revision.
Τα graph cycles αντιμετωπίζονται με visited IDs και όρια. Edge basis=assumption
αποκλείεται από factual queries εξ ορισμού. Time filter σε κάθε βήμα της διαδρομής.
No data, conflicting sources και insufficient coverage είναι διαφορετικά states.

Κάθε result έχει matched IDs, source IDs, excluded/missing counts, queryVersion,
workspaceRevision και truncated flag. Μη δείχνεις όλες τις ακμές όταν ξεπερνάται
το rendering limit. Το table παραμένει ακριβής εναλλακτική.

## Export, restore και portable δεδομένα

Full JSON: metadata, ontology, entities, edges, facts, sources, saved views, history.
Το fixture είναι μικρό snapshot χωρίς history· το M2 καθορίζει envelope history και
βάζει αυτό το τμήμα ως προαιρετικό για backward compatibility. Restore πάντα σε
νέο workspaceId με validation/preview· ποτέ overwrite ενεργού workspace εξ ορισμού.
Άγνωστο formatVersion απορρίπτεται χωρίς αλλαγή. CSV export είναι προβολή, όχι backup.
Προστασία spreadsheet formula injection στα text cells και ασφαλές rendering labels.
