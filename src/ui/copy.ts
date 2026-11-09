const PHRASES: readonly (readonly [string, string])[] = [
  ['unsupported formatVersion', 'Μη υποστηριζόμενη έκδοση εγγράφου.'],
  ['endpoint type', 'Τα άκρα δεν ταιριάζουν με τον τύπο της σχέσης.'],
  ['demo/real mismatch', 'Πηγή demo δεν μπαίνει σε πραγματικό χώρο, ούτε το αντίστροφο.'],
  ['value type', 'Η τιμή δεν ταιριάζει με τον τύπο της ιδιότητας.'],
  ['negative value', 'Η ιδιότητα δεν δέχεται αρνητική τιμή.'],
  ['annual period', 'Η ετήσια μέτρηση πρέπει να καλύπτει ολόκληρο το ημερολογιακό έτος.'],
  ['missing requires null', 'Η κατάσταση «ελλιπές» κρατά κενή τιμή, όχι μηδέν.'],
  ['evidence', 'Χρειάζεται τουλάχιστον μία πηγή.'],
  ['self link', 'Μια σύνδεση δεν ενώνει μια οντότητα με τον εαυτό της.'],
  ['subject/property', 'Η ιδιότητα δεν ανήκει σε αυτό το υποκείμενο.'],
  ['invalid period', 'Η περίοδος δεν είναι έγκυρη ημερομηνία.'],
  ['reversed period', 'Η λήξη είναι πριν από την έναρξη.'],
  ['outside relationship', 'Το γεγονός βγαίνει έξω από την ισχύ της σύνδεσης.'],
  ['invalid supersedes', 'Η διόρθωση πρέπει να κρατά το ίδιο υποκείμενο, ιδιότητα, περίοδο και τεκμήρια.'],
  ['branched correction', 'Υπάρχει ήδη διόρθωση. Δεν επιλέγεται σιωπηλά νικητής.'],
  ['duplicate id', 'Το ID χρησιμοποιείται ήδη.'],
];

export function explain(message: string): string {
  const found = PHRASES.find(([needle]) => message.includes(needle));
  return found ? found[1] : message;
}

export const BASIS_OPTIONS = [
  { value: 'reported', label: 'Τεκμηριωμένο' },
  { value: 'assumption', label: 'Υπόθεση' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'observed', label: 'Παρατηρημένο' },
  { value: 'estimated', label: 'Εκτίμηση' },
  { value: 'provisional', label: 'Προσωρινό' },
  { value: 'missing', label: 'Ελλιπές' },
] as const;

export const SOURCE_STATUS = [
  { value: 'candidate', label: 'Υποψήφια' },
  { value: 'verified', label: 'Ελεγμένη' },
  { value: 'blocked', label: 'Αποκλεισμένη' },
] as const;

export const VALUE_TYPES = [
  { value: 'string', label: 'Κείμενο' },
  { value: 'number', label: 'Αριθμός' },
  { value: 'boolean', label: 'Λογική τιμή' },
  { value: 'date', label: 'Ημερομηνία' },
] as const;
