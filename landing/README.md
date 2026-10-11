# KYDON Website

Eigenständige Website (Vite, ohne Framework), unabhängig von der App im
Wurzelverzeichnis. Design und Inhalte folgen der App nach der Neugestaltung
«weniger Text, mehr Bild» (9. Oktober 2026, `docs/umbauplan.md`).

    npm install
    npm run dev       # lokal
    npm run build     # -> dist/

Umgebungsvariablen beim Bauen:

- `VITE_APP_URL`   Ziel von «Zur App» (Standard: https://kydon.app)
- `VITE_MERCH_URL` Ziel von «Wear the New Era». Leer: der Knopf zeigt «Bald verfügbar».

## Design: woher was kommt

| Website | App |
|---|---|
| Farben hell/dunkel, Atmosphäre, Ebenen (`src/style.css`, `:root`) | `src/styles/theme.css` (Mondstein / Mondlicht) |
| `.photo-card` (Bild, dunkler Verlauf, heller Text) | `components/ui/PhotoCard.tsx` |
| `.segments`, `.thumb`, `.label-tag`, `.num` | `Segments`, `.thumb`, `.label-tag`, `.readout` |
| `.card` mit Lichtkante | `.panel.float` |
| `details.info` (ⓘ, Erklärung eine Ebene tiefer) | `InfoNote`, `PanelHeader note` |
| `.scope-dark` (Bereich Training immer dunkel) | `.scope-dark` (Session Player) |
| Überschriften Saira Condensed fett, Satzschreibung; Knöpfe als Pill in IBM Plex Sans | `ScreenHeader`, Knöpfe der App |

Abweichung: der Verlauf der Fotokarte ist unten kräftiger als in der App,
damit kleine Beschriftungen auch auf hellen Sportfotos 4,5 : 1 halten.

## Bilder und Film

- **App-Bildschirme** `public/app/<de|en>/<name>-<light|dark>.webp`: deutsch auf der
  deutschen Seite, sonst englisch; hell oder dunkel nach Erscheinungsbild.
  Erzeugen:

      # im Wurzelverzeichnis, mit gesetzten Bau-Variablen (z. B. aus .env.example)
      LANDING_SHOTS=<ordner> npx playwright test -c playwright.mockups.config.ts mockups/landing-shots.spec.ts --project=phone
      python3 landing/scripts/shots.py <ordner> landing/public/app

- **Fotos** `public/foto/` (640 und 1024 px) und `public/foto/thumb/` (96 px):
  Ausschnitte aus `public/testbilder` der App. Sportmotive `public/sport/`.
- **Erklärfilm** `public/film/` («Besser – oder Messschwankung?», 60 s, nur auf der
  deutschen Seite): Untertitel eingebrannt, zusätzlich als WebVTT; bei
  `prefers-reduced-motion` lädt die ruhige Fassung. `preload="none"`: der Film
  lädt erst beim Abspielen.

## Prüfen

Kein eigenes Testpaket. Geprüft wird mit Playwright gegen `dist/`
(Bildschirmaufnahmen 1440 und 390 px, hell und dunkel; Kontrast, Überlauf,
Alternativtexte, Bedienelemente ≥ 44 px, Tastaturreihenfolge).
