# Sprachen

Die App spricht acht Sprachen: Deutsch, Englisch, Französisch, Spanisch,
Schwedisch, Dänisch, Norwegisch (Bokmål), Niederländisch. Die Kennungen sind
`de en fr es sv da nb nl` (`src/i18n/locales.ts`).

## Zwei Schichten, eine Sprachwahl

**Oberfläche.** i18next, ein Wörterbuch je Sprache in zwei Teilen:
`src/i18n/<lang>.json` (Startbildschirm) und `<lang>.extra.json`
(nachgeladene Bildschirme). Deutsch liegt im Startpaket, alles andere wird
nachgeladen, wenn die Sprache gewählt wird. Ausweichreihenfolge: gewählte
Sprache → Englisch → Deutsch. Nie eine Leerstelle.

**Inhalte.** Testnamen, Anleitungen, Disziplinen, Achsen, Referenzkohorten,
Ausrüstung und Durchführungsvorschriften liegen als `{ de, en }`-Objekte in
den Datenmodulen (`src/data/*`). Für die weiteren Sprachen werden diese
Objekte beim Laden der Sprache ERGÄNZT: `src/i18n/content/<lang>.json` ist
eine flache Tabelle mit dem englischen Text als Schlüssel, und
`augmentContent()` (`contentRegistry.ts`) schreibt die Übersetzung an Ort
und Stelle dazu. Gelesen wird über `pick(text, locale)` — fehlt eine
Sprache, steht Englisch.

Warum der englische Text der Schlüssel ist: er ist in jedem Objekt schon da,
niemand pflegt Kennungen, und derselbe Satz an zwei Stellen bekommt dieselbe
Übersetzung.

## Was NICHT übersetzt ist, und warum

- **Rechtstexte** (Impressum, Datenschutz, Nutzungsbedingungen) gibt es nur
  deutsch und englisch. In jeder anderen Sprache steht oben auf der Seite,
  dass es die englische Fassung ist. Eine maschinelle Übersetzung ohne
  juristische Prüfung wäre kein Rechtstext, sondern ein Risiko.
- **Eigennamen der Sprachen** im Umschalter («Svenska», «Norsk») — bewusst
  in der jeweiligen Sprache, egal, in welcher die App gerade steht.
- **Kennungen, Einheiten, Testkürzel** (SJFT, CMJ, 1RM, VO₂max).

## Herkunft der Übersetzungen

Die sechs neuen Sprachen sind maschinell aus dem Englischen übersetzt, mit dem
deutschen Original zur Klärung, unter festen Regeln (Fachsprache der
Sportwissenschaft, kurze Sätze, keine Verlängerung über ein Viertel). Sie
sind nicht von Muttersprachlern geprüft. Vor einem Markteintritt in einem
dieser Länder gehört ein Fachlektorat dazu — vor allem für die
Durchführungsvorschriften, wo ein falsches Wort eine falsche Messung ist.

## Eine Sprache hinzufügen

1. Kennung in `APP_LOCALES` und `LOCALE_NAMES` (`src/i18n/locales.ts`).
2. `src/i18n/<lang>.json` und `<lang>.extra.json` aus `en.json` /
   `en.extra.json` übersetzen; Lader in `src/i18n/index.ts` ergänzen.
3. Inhaltstabelle: `npx tsx --tsconfig tsconfig.app.json scripts/exportContent.ts src/i18n/content/en.json`
   erzeugt den englischen Export; daraus `content/<lang>.json` übersetzen.
4. `node scripts/checkLocale.mjs <lang>` — muss «alles stimmig» melden.
5. `tests/i18n.spec.ts` läuft automatisch über alle Kennungen.

## Prüfung

`tests/i18n.spec.ts` prüft je Sprache: Schlüsselparität mit dem deutschen
Original, Platzhalter, keine Leerstellen, vollständige Inhaltstabelle — und
öffnet die Oberfläche einmal in jeder Sprache (Navigation, Katalog,
Rechtsseite mit Hinweis).
