Συνέχισε το WORLD MODEL από τη νεότερη validated υλοποίηση του PR #7, διατηρώντας
τυχόν μεταγενέστερη δουλειά. Διάβασε τα πέντε root αρχεία μνήμης, το
`docs/reviews/2026-11-10-overnight-review.md` και το
`docs/plans/NEXT_SESSIONS_2026-11-10.md`.

Πρώτα εκτέλεσε το Session S1: returning-user sample upgrade, edge import conflicts,
πλήρη validation ιστορικών actions, ακριβές evidence metadata και view roundtrip.
Πρόσθεσε regression tests για τα πραγματικά failures. Μην ξαναγράφεις όσα ήδη
περνούν. Μετά προχώρα στο S2 όσο χωράει η συνεδρία· σε νέα συνεδρία συνέχισε από
το πρώτο έτοιμο task με βάση PROGRESS/TASKS.

Κάθε task: claim, μικρές αλλαγές, verification, commit, ενημέρωση μνήμης.
Δεν αλλάζεις main/visibility και δεν κάνεις deployment ή storage wipe. Δεν
επινοείς τεκμήρια, benchmarks ή user studies. Αν blocker είναι εξωτερική πηγή,
κατάγραψέ το και συνέχισε σε ανεξάρτητο task. Παράδωσε working checkpoint με
ακριβές επόμενο βήμα και όχι γενικό «όλα done».
