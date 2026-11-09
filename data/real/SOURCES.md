# Κάρτες πηγών — ανάκτηση 2026-11-09

Οι αριθμοί δεν γράφτηκαν στο χέρι. Προέρχονται από τα αρχεία στο `raw/`.
Καμία από αυτές τις σειρές δεν μπαίνει στο synthetic demo.

## World Bank WDI — NY.GDP.MKTP.CD

- Φορέας: World Bank, World Development Indicators.
- Landing: https://data.worldbank.org/indicator/NY.GDP.MKTP.CD
- Λήψη: `https://api.worldbank.org/v2/country/GRC;TUR;DEU;USA;CYP/indicator/NY.GDP.MKTP.CD?format=json&date=2022:2023`
- Αρχείο: `raw/wdi-ny.gdp.mktp.cd-2022-2023.json`
- SHA-256: `aa4d685c3bc5cb4cad5ea270c9ca55f0e68549dd14021a56275da6b207a25833`
- Περίοδος: 2022 και 2023. Μονάδα: current US$, ετήσια ροή παραγωγής. Κάλυψη αυτής της λήψης: CYP, DEU, GRC, TUR, USA. Καμία κενή τιμή.
- Metadata δείκτη: επίσημες στατιστικές, εθνικοί λογαριασμοί OECD, εκτιμήσεις World Bank.
- Άδεια: το `https://data.worldbank.org/summary-terms-of-use` που ανακτήθηκε την ίδια μέρα λέει ότι, εκτός αν το metadata ορίζει αλλιώς, τα datasets διατίθενται με CC BY 4.0. Το metadata αυτού του δείκτη δεν ορίζει διαφορετικό περιορισμό.
- Αναφορά: World Bank, World Development Indicators, NY.GDP.MKTP.CD, retrieved 2026-11-09.

## World Bank WDI — SP.POP.TOTL

- Landing: https://data.worldbank.org/indicator/SP.POP.TOTL
- Λήψη: API `SP.POP.TOTL`, ίδιες χώρες και έτη.
- Αρχείο: `raw/wdi-sp.pop.totl-2022-2023.json`
- SHA-256: `bc9540e83bf728805f9b6bb6b34cdc841949c3a9515c1a905a428f49ceb5d196`
- Μονάδα: άτομα, midyear estimates. Κάλυψη: οι πέντε χώρες, 2022 και 2023.
- Το metadata ονομάζει ως πηγή το UN World Population Prospects και εθνικές στατιστικές. Δεν γράφει ξεχωριστή απαγόρευση αναδιανομής. Ισχύει η ίδια CC BY 4.0 του World Bank, με αναφορά και στον UN WPP.
- Αναφορά: World Bank WDI, SP.POP.TOTL, via UN World Population Prospects and national statistics, retrieved 2026-11-09.

## Eurostat — nama_10r_2gdp

- Dataset: Gross domestic product (GDP) at current market prices by NUTS 2 region.
- Λήψη: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp?format=JSON&lang=EN&unit=MIO_EUR&time=2022` και οι 13 γεωκωδικοί EL.
- Αρχείο: `raw/eurostat-nama_10r_2gdp-el-2022.json`
- SHA-256: `7cb8227c369d69b53485d8ec12a238efb75ef50b4151ae1231b9e3dfdd25dc7e`
- Ενημέρωση αρχείου Eurostat: 2026-02-10. Μονάδα: million euro. Έτος: 2022. Κάλυψη: και οι 13 ελληνικές περιφέρειες NUTS 2 του αρχείου. Καμία flagged κενή τιμή στο `value`.
- Άδεια: η σελίδα `https://ec.europa.eu/eurostat/web/main/help/copyright-notice` διαβάστηκε στις 2026-11-09. Η επαναχρησιμοποίηση στατιστικών δεδομένων επιτρέπεται με αναφορά της πηγής, κατά την απόφαση της Επιτροπής της 12ης Δεκεμβρίου 2011. Αναφορά: Source: Eurostat, nama_10r_2gdp.

## Eurostat — bop_fdi6_geo

- Dataset: EU direct investment positions, flows and income, by countries (BPM6).
- Λήψη: reporting economy EL, partner DE, 2022.
- Αρχείο: `raw/eurostat-bop_fdi6_geo-el-de-2022.json`
- SHA-256: `271982a158d1bdabd9133b5b4558154ba9597f12e1205361fc70d2c19ed09bc5`
- Ενημέρωση: 2026-11-05. Νόμισμα: million euro.
- Χρησιμοποιούνται μόνο δύο σειρές, και οι δύο `DI__D__F` (direct investment in the reporting economy): STOCKS 2022 και FLOWS 2022. Δεν αποδίδονται σε εταιρεία.
- Ίδια βάση άδειας με το nama_10r_2gdp. Αναφορά: Source: Eurostat, bop_fdi6_geo.

## Επιτροπή Ανταγωνισμού — απόφαση 626/2016

- Φορέας: Επιτροπή Ανταγωνισμού. Συνεδρίαση 7.4.2016. ΑΔΑ `Ω41ΘΙΜΞ-5ΓΤ`.
- Έγγραφο: `https://diavgeia.gov.gr/doc/Ω41ΘΙΜΞ-5ΓΤ`
- Αρχείο αποσπασμάτων: `raw/hcc-626-2016.json`
- SHA-256 του PDF που ανακτήθηκε: `029a89abf908cad2522feeaed3bea0ac8576220ac8af17efc14e13feefeee12e`
- Τι μπαίνει στο μοντέλο: έδρα της FRAPORT AG στη Γερμανία, υπογραφή δύο συμβάσεων παραχώρησης στις 14.12.2015, διάρκεια 40 ετών από αχρονολόγητη έναρξη παραχώρησης, αποκλειστικός έλεγχος των 14 κατονομασμένων αεροδρομίων, υπογράφουσες Εταιρία Α και Εταιρία Β, μετοχική σύνθεση 65% FRAPORT και 35% SLENTEL για το 2016.
- Το 65/35 κλείνει στις 31.12.2016. Η σελίδα `https://www.fraport-greece.com/en/about-us/shareholders.html`, ανακτημένη την ίδια μέρα, ονομάζει Fraport AG, Copelouzos Group και Blackstone χωρίς ποσοστά και δεν επιβεβαιώνει τη σύνθεση του 2016.

## EUR-Lex — Κανονισμός (ΕΕ) 2023/674

- Τίτλος: Commission Delegated Regulation (EU) 2023/674 of 26 December 2022.
- Κείμενο: `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023R0674`
- Αρχείο: `raw/nuts-2024-el-excerpt.json`, μόνο οι γραμμές που χρησιμοποιεί η αντιστοίχιση.
- SHA-256 του HTML: `8e645f2e1c615dd582eecadeddb8499dde326dc79f71731002b6343f31745616`
- Εφαρμογή για διαβίβαση δεδομένων: 1.1.2024. Τα ονόματα NUTS 2/3 είναι από τον πίνακα του παραρτήματος.
- Άδεια: αναφορά European Union, EUR-Lex. Η επαναχρησιμοποίηση στηρίζεται στην απόφαση της Επιτροπής της 12ης Δεκεμβρίου 2011.

## Αποκλεισμένα

- `MS.MIL.XPND.CD` κατέβηκε από το API του World Bank, αλλά το metadata ονομάζει μοναδική πηγή τη SIPRI Military Expenditure Database. Δεν βρέθηκε καθαρός όρος αναδιανομής της SIPRI στη σελίδα που ανακτήθηκε. Οι τιμές δεν αποθηκεύονται και δεν χρησιμοποιούνται.
- Η αρχική σελίδα `https://www.olp.gr/en/` απάντησε, αλλά το κείμενο που εξήχθη δεν περιέχει παραθέσιμο γεγονός για παραχώρηση.
- Δεν μπήκε ακμή περιφέρειας για Άκτιο, Καβάλα, Σαντορίνη, Μυτιλήνη και Σκιάθο. Το Άκτιο και η Καβάλα περιγράφονται στην απόφαση ως πρόσβαση σε περισσότερες από μία περιφέρειες. Η Σαντορίνη, η Μυτιλήνη και η Σκιάθος δεν ταυτίζονται με τα ονόματα Θήρα, Λέσβος και Σποράδες του κανονισμού.
- Το 2015 ως έτος έναρξης της σαρανταετίας δεν καταγράφεται. Η απόφαση ξεχωρίζει την υπογραφή από την έναρξη παραχώρησης και δεν δίνει τη δεύτερη ημερομηνία.
- Η σελίδα `https://www.fraport-greece.com/en.html` λέει ότι η Fraport Greece διαχειρίζεται 14 αεροδρόμια, αλλά δεν δηλώνει NUTS ούτε ποσοστά. Δεν συγχωνεύτηκε με τις Εταιρίες Α και Β του 2016.
