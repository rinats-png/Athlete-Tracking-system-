# Instagram — 50 Posts für KYDON

Werbung für die App als 4:5-Karten (1080 × 1350 px). Jeder Post: ein Problem als
Headline, die Lösung durch die App in ein bis zwei Sätzen, ein Bild-Element.
Jede Zahl stammt aus dem Quelltext; die Quelle je Post steht in `plan.md`.

## Dateien

| Pfad | Inhalt |
|---|---|
| `build.mjs` | Die 50 Posts als Daten plus die Diagrammfunktionen. Schreibt `posts/*.html` und `index.html`. |
| `render.mjs` | Rendert `posts/*.html` mit Chromium nach `png/*.png`. |
| `posts/NN-slug.html` | Eine Datei je Post, Tokens und Bausteine eingebettet, Schriften relativ aus `fonts/`. |
| `png/NN-slug.png` | Die fertigen Bilder, 1080 × 1350, deviceScaleFactor 1. |
| `fonts/` | WOFF2 der drei Schriften (Latin-Subset), kopiert aus `node_modules/@fontsource/*` (SIL OFL). |
| `captions.md` | Caption und Alt-Text je Post. |
| `index.html` | Kontaktbogen: alle 50 PNGs als Raster mit Nummer, Titel und Theme. |
| `plan.md` | Alle Headlines mit Quelle im Code, Bildtyp, Zielgruppe, Theme; gestrichene Entwürfe. |

## Neu rendern

```sh
node marketing/instagram/build.mjs                          # HTML erzeugen
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node marketing/instagram/render.mjs        # alle 50
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node marketing/instagram/render.mjs 07 12  # nur 07 und 12
```

`render.mjs` nutzt `@playwright/test` aus dem Repo. Der Chromium-Pfad steht auf
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (die vorinstallierte
Fassung; die Playwright-Version im Repo würde sonst eine neuere suchen). Ein
anderer Browser lässt sich über `CHROME_PATH=…` setzen.

Das Script meldet je Datei, ob die drei Schriften geladen sind, wie viele Zeilen
die Headline hat (mehr als drei ist ein Fehler) und ob ein Element aus dem
1080 × 1350-Rahmen läuft.

Um einen Post zu ändern: Eintrag in `POSTS` in `build.mjs` anpassen, dann
`build.mjs` und `render.mjs` laufen lassen. Die HTML-Dateien werden überschrieben.

## Schriften — was gegriffen hat

Vorgesehen war Google Fonts per `<link>`. Der Link steht in jeder HTML-Datei,
aber im Renderumfeld hier lädt Chromium über den Proxy nichts von
`fonts.googleapis.com` (Curl kam durch, der Browser nicht). Deshalb:

- Die WOFF2-Dateien liegen in `fonts/` und sind in jeder HTML-Datei per
  `@font-face` relativ eingebunden (`../fonts/…`). Das ist die Quelle, die
  tatsächlich rendert. Der Testrender bestätigt `document.fonts.check()` für
  alle drei Familien.
- `render.mjs` bricht die Google-Fonts-Anfragen ab (`context.route`), sonst
  blockiert eine hängende Stylesheet-Anfrage den Seitenaufbau. Mit
  `GOOGLE_FONTS=1` geht die Anfrage durch, für Umgebungen mit Netz.
- Letzte Rückfallebene laut Theme: Arial Narrow / system-ui. Sie ist im
  Font-Stack, wurde aber nicht gebraucht.

Familien und Schnitte: Saira Condensed 600/700 (Display, Headline, gesperrte
Versalien in `.label-tag`), IBM Plex Sans 400/500/600 (Fliesstext), IBM Plex
Mono 400/500 (Messwerte, `.readout` mit `tabular-nums`).

## Designsystem

Alle Farben, Radien, Schatten und der Atmosphären-Gradient `--atmo` sind Kopien
der Tokens aus `src/styles/theme.css`; `build.mjs` hält sie im Block `TOKENS`.
Bausteine aus dem Theme: `.panel`, `.float` (mit Lichtkante), `.panel-ticked`,
`.corner-brackets` (zwei Ecken), `.label-tag`, `.readout`.

Themes: 30 Posts Mondlicht (`data-theme="dark"`), 20 Posts Mondstein (hell).

Diagramme sind Inline-SVG aus `build.mjs`: Referenzspektrum, Radar mit 4–6
Achsen, Verlauf mit Streuungsband (und Prognoseband), Balken mit Median- oder
Schwellenmarke, Raster, Messpunkte. Serienfarben `--series-1/2/3`, Referenz
`--reference`; Statusfarben kommen nicht vor. Richtung steht nie nur in einer
Farbe (Dreieck, Beschriftung, gestrichelte Kontur). Die Datenreihen sind
illustrativ und plausibel, kein Nutzerwert.
