# KYDON Website

Eigenständige Website (Vite, ohne Framework), unabhängig von der App im
Wurzelverzeichnis. Design V2 vom 13. Oktober 2026 (Mockup «Website · V2»):
flache Flächen, die Farben der App, das Rauschband als wiederkehrender
Baustein. **Preise stehen nur in der App**; der Abschnitt «Kosten» nennt nur,
was der kostenlose Kern und die Stufen enthalten (`src/data/pricing.ts`).

    npm install
    npm run dev       # lokal
    npm run build     # -> dist/

Umgebungsvariablen beim Bauen:

- `VITE_APP_URL`   Ziel von «Zur App» (Standard: https://kydon.app)
- `VITE_MERCH_URL` Ziel von «Wear the New Era». Leer: der Knopf zeigt «Bald verfügbar».

## Design: woher was kommt

| Website | App |
|---|---|
| Farben hell/dunkel (`src/style.css`, `:root`) | `src/styles/theme.css` |
| `.scope-dark` (Training, Leitstand, Kosten, Schluss immer dunkel) | `.scope-dark` (Session Player) |
| `.band-row`, `.legend` (Rauschband: schraffierter Messfehler, Punkt gefüllt = besser, hohl = im Rauschen, gestrichelt = unbekannt, orange = schlechter) | Veränderungskarten, `src/domain/change.ts` |
| `.axes` (Profil, schraffiert = keine belegte Referenz) | Leistungsprofil |
| Überschriften Saira Condensed fett; Knöpfe als Pill in IBM Plex Sans | `ScreenHeader`, Knöpfe der App |

Die App-Ansichten («Heute» im Telefon, Trainingsblock, Leitstand) sind
gezeichnet, keine Bildschirmaufnahmen: Beispielwerte einer erfundenen
Athletin und eines erfundenen Kaders, alle Texte in den 8 Sprachdateien
(`ui.*`, `rb.*`, `pf.*`, `dash.*`). Dekorative Ansichten sind für
Screenreader ausgeblendet.

## Bilder und Film

- **Testbilder** `public/bild/`: verkleinerte Kopien aus `public/testbilder`
  der App (CMJ, Griffkraft, Sprint, SJFT, Yo-Yo, Standweitsprung, Übungen).
- **Fotos** `public/foto/` (640 und 1024 px) und `public/foto/thumb/` (96 px).
  Sportmotive hell/dunkel `public/sport/`.
- **Erklärfilm** `public/film/` («Besser – oder Messschwankung?», 60 s, nur auf der
  deutschen Seite): Untertitel eingebrannt, zusätzlich als WebVTT; bei
  `prefers-reduced-motion` lädt die ruhige Fassung. `preload="none"`: der Film
  lädt erst beim Abspielen.

## Prüfen

Kein eigenes Testpaket. Geprüft wird mit Playwright gegen `dist/`
(Bildschirmaufnahmen 1440 und 390 px, hell und dunkel; Kontrast, Überlauf,
Alternativtexte, Bedienelemente ≥ 44 px, Tastaturreihenfolge).
