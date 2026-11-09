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
- Άδεια: η σελίδα πνευματικών δικαιωμάτων του Eurostat δεν διαβάστηκε· επέστρεψε τοίχο σύνδεσης. Η νομική ειδοποίηση της Επιτροπής, `https://commission.europa.eu/legal-notice_en`, που ανακτήθηκε την ίδια μέρα, αναφέρει CC BY 4.0 για περιεχόμενο της ΕΕ εκτός αν υπάρχει ειδική επιφύλαξη, μέσω της Commission Decision της 12ης Δεκεμβρίου 2011. Αναφορά: Source: Eurostat, nama_10r_2gdp.

## Eurostat — bop_fdi6_geo

- Dataset: EU direct investment positions, flows and income, by countries (BPM6).
- Λήψη: reporting economy EL, partner DE, 2022.
- Αρχείο: `raw/eurostat-bop_fdi6_geo-el-de-2022.json`
- SHA-256: `271982a158d1bdabd9133b5b4558154ba9597f12e1205361fc70d2c19ed09bc5`
- Ενημέρωση: 2026-11-05. Νόμισμα: million euro.
- Χρησιμοποιούνται μόνο δύο σειρές, και οι δύο `DI__D__F` (direct investment in the reporting economy): STOCKS 2022 και FLOWS 2022. Δεν αποδίδονται σε εταιρεία.
- Ίδια βάση άδειας με το nama_10r_2gdp. Αναφορά: Source: Eurostat, bop_fdi6_geo.

## Αποκλεισμένα

- `MS.MIL.XPND.CD` κατέβηκε από το API του World Bank, αλλά το metadata ονομάζει μοναδική πηγή τη SIPRI Military Expenditure Database. Δεν βρέθηκε καθαρός όρος αναδιανομής της SIPRI στη σελίδα που ανακτήθηκε. Οι τιμές δεν αποθηκεύονται και δεν χρησιμοποιούνται.
- Η αρχική σελίδα `https://www.olp.gr/en/` απάντησε, αλλά το κείμενο που εξήχθη δεν περιέχει παραθέσιμο γεγονός για παραχώρηση, εταιρεία ή υποδομή. Δεν δημιουργήθηκε εταιρική διαδρομή.
