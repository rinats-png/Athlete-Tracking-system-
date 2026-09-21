# Open Food Facts und die ODbL — Einordnung und Entscheidungen

*Stand: 21. September 2026. Offener Punkt aus `docs/ausbau.md` §7.*

> **Keine Rechtsberatung.** Das hier ist die technisch-rechtliche
> Einordnung aus dem Lizenztext und den Nutzungsbedingungen von Open Food
> Facts, übersetzt in Entscheidungen für den Code. Die Lizenz ist kurz und
> die Fragen sind klar genug, dass sich die meisten davon ohne Anwalt
> beantworten lassen; wo nicht, steht es.

---

## 1. Was Open Food Facts lizenziert

Open Food Facts stellt drei Dinge unter drei Lizenzen:

| Was | Lizenz | Betrifft uns |
|---|---|---|
| Die **Datenbank** (Struktur, Sammlung) | Open Database License (ODbL) 1.0 | **ja** — wir fragen sie ab |
| Die **einzelnen Inhalte** (Nährwerte, Namen, Marken) | Database Contents License (DbCL) 1.0 | ja — wir zeigen und speichern einzelne Werte |
| **Bilder** | CC BY-SA 3.0 | nein — wir laden keine Bilder |

Die DbCL ist eine sehr freie Lizenz für die Inhalte selbst («use the
contents in any way»); die Pflichten stecken in der ODbL für die
Datenbank. Deshalb geht es unten nur um die ODbL.

---

## 2. Die ODbL in vier Pflichten

Die ODbL 1.0 kennt drei Nutzungsarten mit unterschiedlichen Folgen:

- **Use** (§3): die Datenbank abfragen, Werte anzeigen, damit rechnen —
  ohne besondere Pflichten, solange nichts *weitergegeben* wird.
- **Produced Work** (§4.3): ein Werk, das aus der Datenbank *entsteht*,
  aber selbst keine Datenbank ist — eine Grafik, ein Bericht, ein Bildschirm
  mit Werten. Pflicht: eine **Notiz**, die darauf hinweist, dass Inhalte
  aus der Datenbank stammen und unter ODbL stehen (§4.3). **Kein
  Share-alike.**
- **Derivative Database** (§4.4): eine Datenbank, die aus der Datenbank
  abgeleitet ist — ein Auszug, eine Bereinigung, eine Zusammenführung.
  Wird sie **öffentlich weitergegeben** («Publicly Convey»), gilt
  Share-alike: dieselbe Lizenz, plus Zugang zur Datenbank oder zum
  Unterschied (§4.6), und keine technischen Schutzmassnahmen (§4.7).
- **Insubstantial** (§2.1, §3.1 ff.): unwesentliche Teile der Datenbank
  darf jeder ohne Pflichten nutzen. Was «wesentlich» ist, bemisst sich
  nach Menge oder Qualität — zehn Produkte von drei Millionen sind es nicht.

Die vierte Pflicht, die immer gilt: **Namensnennung** (§4.2, §4.3) — bei
jeder Weitergabe und bei jedem Produced Work.

---

## 3. Was KYDON tut, Fall für Fall

| Handlung | Einordnung | Pflicht | Stand |
|---|---|---|---|
| Suche über die API auf Tipp, zehn Treffer anzeigen | Use; die Anzeige ist ein Produced Work | Notiz | **erfüllt**: `OFF_ATTRIBUTION` unter jeder Trefferliste |
| Ein Produkt übernehmen: Name, Marke, Nährwerte je 100 g in die Mahlzeit kopieren | Extraktion eines unwesentlichen Teils; die Nährwerte selbst stehen unter DbCL | keine — aus Sorgfalt trotzdem Herkunft am Eintrag | **erfüllt**: Chip «Open Food Facts» an jeder Position |
| Der Bestand auf dem Gerät und die Zweitschrift auf dem Server | private Sammlung einzelner Werte; **keine öffentliche Weitergabe** — nur der Nutzer selbst hat Zugriff (RLS) | keine | — |
| Der **Export** (JSON) mit Mahlzeiten, die OFF-Werte tragen | der Nutzer gibt seine eigene Datei weiter; darin ein unwesentlicher Auszug. Nach dem Wortlaut kein «Publicly Convey» durch KYDON. Grauzone: ein Trainer mit 250 Athleten und Tausenden Positionen | Notiz aus Sorgfalt | **neu**: der Export trägt eine `notices`-Zeile mit Quelle und Lizenz, sobald eine OFF-Position enthalten ist |
| Ein **gebündelter Auszug** der meistgenutzten Produkte im Gerät (der Plan in §7 nannte ihn als «wahrscheinlichen Weg») | eine Derivative Database, mit der App **öffentlich weitergegeben** → Share-alike, Zugang zum Auszug, keine DRM | ODbL für den Auszug; Veröffentlichung des Auszugs | **entschieden: nicht bauen** (Abschnitt 4) |
| Reports/Einseiter mit Mahlzeiten | Produced Work | Notiz | heute enthält kein Report Mahlzeiten; wenn, dann mit derselben Zeile |
| Der kuratierte Kern (`foods.ts`, aus v4) | eigene Daten, nicht aus OFF | — | — |

**Ergebnis:** Solange KYDON die Datenbank **abfragt** und **keinen Auszug
verteilt**, ist die einzige Pflicht die Namensnennung — und die ist
erfüllt. Share-alike greift nicht, weil keine Derivative Database
öffentlich weitergegeben wird. Der eigene Bestand eines Nutzers ist keine
Weitergabe durch KYDON.

---

## 4. Die Entscheidung zum Offline-Auszug

Der Plan nannte einen Auszug der meistgenutzten Produkte im Gerät, damit
die Ernährung auch ohne Netz über den Kern hinaus geht. Das wird **nicht
gebaut**, aus drei Gründen:

1. **Lizenz.** Der Auszug wäre eine Derivative Database, die mit jeder
   Installation öffentlich weitergegeben wird. Dann gilt Share-alike: Der
   Auszug müsste unter ODbL veröffentlicht und zugänglich gemacht werden.
   Das ist machbar (der Auszug ist ohnehin nur eine Kopie), aber es ist
   eine dauernde Pflicht mit Prüfaufwand bei jeder Änderung — für einen
   Nutzen, der klein ist.
2. **Qualität.** Die «meistgenutzten» Produkte sind bei Freiwilligendaten
   nicht die verlässlichsten. Ein Auszug im Gerät würde unsichere Werte
   ohne Netz verfügbar machen und damit *aufwerten*; §89 will das Gegenteil.
3. **Bedarf.** Der Kern deckt ohne Netz 245 Grundnahrungsmittel ab. Wer
   ein Markenprodukt einträgt, hat in der Regel den Barcode vor sich und
   ein Telefon mit Netz.

Wenn später doch ein grösserer Offline-Bestand gewünscht ist, ist der
richtige Weg ein **kuratierter Kern aus USDA FoodData Central** — gemeinfrei,
analysiert, ohne Share-alike. Das ist entschieden und vorbereitet:
`docs/lebensmitteldaten.md`.

---

## 5. Was neben der Lizenz gilt: Nutzungsbedingungen der API

Open Food Facts bittet in seiner API-Dokumentation um drei Dinge, die keine
Lizenzfragen sind, aber ein fairer Umgang mit einem Freiwilligenprojekt:

- **Kennung der App** über den User-Agent. Ein Browser erlaubt es nicht,
  diesen Header zu setzen; die Bitte ist für Server- und App-Clients
  gemeint. KYDON setzt stattdessen `app_name` und `app_version` als
  Parameter — die API nimmt sie entgegen, und der Betreiber sieht, woher
  die Anfragen kommen.
- **Ratenbegrenzung:** höchstens 10 Suchabfragen und 100 Produktabfragen
  je Minute je Client. KYDON hält sich daran im Code: ein gleitendes
  Fenster je Abfrageart, und eine Abfrage darüber wartet, statt
  abgewiesen zu werden. Suchen laufen ohnehin nur auf Tipp, nie beim
  Tippen.
- **Kein Spiegeln der Datenbank über die API.** Genau das ist der Auszug
  aus Abschnitt 4 — nicht gebaut.

---

## 6. Datenschutz

Jede Abfrage an Open Food Facts übermittelt den Suchbegriff oder Barcode
und die IP-Adresse des Nutzers an die Server des Vereins (Open Food Facts,
Frankreich). Das passiert **nur auf ausdrücklichen Tipp**, nie beim Tippen
und nie im Hintergrund. Open Food Facts ist dafür eigener Verantwortlicher,
kein Auftragsverarbeiter — es gibt keinen Vertrag, und es soll keinen
brauchen: Es fliessen keine Athletendaten, nur ein Suchwort.

Die Datenschutzerklärung sagte bisher «keine Übermittlung an Dritte» und
nannte Open Food Facts nicht. Das war unvollständig. **Behoben am
21.09.2026:** eigener Abschnitt «Lebensmittelsuche (auf Tipp)» in
`src/features/legal/texts.ts`, und der absolute Satz ist präzisiert.

---

## 7. Was in den Code gegangen ist

| Massnahme | Wo |
|---|---|
| Namensnennung im Impressum («Datenquellen und Lizenzen») | `ImprintScreen`, `legal.imprint.sources*` in acht Sprachen |
| Notiz im Export, sobald eine OFF-Position enthalten ist | `exportData` in `src/lib/store/localStore.ts` |
| Open Food Facts in der Datenschutzerklärung (de/en) | `src/features/legal/texts.ts` |
| Ratenbegrenzung 10/min Suche, 100/min Produkt, gleitendes Fenster; `app_name`/`app_version` an jeder Abfrage | `src/lib/openFoodFacts.ts` |
| Prüffälle: Fenster, Export-Notiz, Impressum, Datenschutztext | `tests/odbl.spec.ts` |

**Nicht gebaut, mit Absicht:** ein Offline-Auszug; Bilder von Open Food
Facts; Rückschreiben in die Datenbank (wäre wünschenswert als Beitrag,
braucht aber ein Konto bei OFF und eine eigene Einwilligung des Nutzers).

---

## 8. Offen für den Anwalt (klein)

- Ob der Export eines Trainers mit sehr vielen Positionen die Schwelle
  «wesentlicher Teil» je erreichen kann. Meine Einschätzung: nein — es
  sind Einzelwerte aus dem, was jemand gegessen hat, keine systematische
  Extraktion; und die Notiz steht ohnehin drin.
- Ob die Notiz im Export in der Form («Quelle: Open Food Facts, ODbL,
  openfoodfacts.org») den Anforderungen von §4.3 genügt. Nach dem
  Wortlaut («reasonably calculated to make any Person … aware») ja.
