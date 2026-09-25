# KYDON Landing

Eigenständige Landingpage (Vite + three.js), unabhängig von der App im Wurzelverzeichnis.
Aufbau und Partikelszene nach der Dantora-Vorlage; statt der DNA-Helix formt die Szene
den Schriftzug KYDON (`src/scene/wordInk.ts`). Farben und Schriften sind die der App,
hell (Mondstein) und dunkel (Mondlicht), mit Umschalter und Systemeinstellung.

    npm install
    npm run dev       # lokal
    npm run build     # -> dist/

Umgebungsvariablen beim Bauen:

- `VITE_APP_URL`   Ziel von „Get the App“ (Standard: https://kydon.app)
- `VITE_MERCH_URL` Ziel von „Wear the New Era“. Leer: der Knopf zeigt „Coming soon“.

App-Bilder: `public/app/*-light|dark.webp`, erzeugt mit `npm run mockups -- landing-shots`
im Wurzelverzeichnis (Demobestand, Englisch). Sportbilder: Kopien aus `src/assets/sport`.
