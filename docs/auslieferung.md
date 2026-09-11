# Auslieferung nach Netlify

Zwei Wege. Der erste ist der richtige, sobald das Projekt regelmässig
weiterentwickelt wird; der zweite ist der schnellste, wenn nur ein Stand
angesehen werden soll.

## Weg 1 — an das Repository anbinden (empfohlen)

1. In Netlify **Add new site → Import an existing project** wählen.
2. Dieses Repository verbinden, Branch `claude/sports-diagnostics-pwa-jnqy42`.
3. Nichts weiter eintragen: Build-Befehl, Publish-Verzeichnis, Node-Version und
   die Supabase-Zugangsdaten stehen in `netlify.toml`.

Danach baut jeder Push den Stand neu.

## Weg 2 — Paket von Hand hochladen

`kydon-netlify.zip` auf **Netlify → Deploys → Drag and drop** ziehen —
die ZIP-Datei selbst, Netlify packt sie aus. Wer lieber einen Ordner zieht,
entpackt sie vorher und zieht den entstandenen Ordner. Das Paket enthält den
fertigen Build; es wird nichts kompiliert.

Die Sicherheits- und Cache-Regeln liegen bewusst in `_headers` **im Paket**
und nicht nur in `netlify.toml`: beim Drag-and-drop-Deploy wird die
`netlify.toml` nicht ausgewertet, die `_headers` schon.

## Was in der Auslieferung steckt

| | |
|---|---|
| Einstiegspunkt | `index.html`, alle Routen darauf umgeleitet (SPA) |
| Zwischenspeicher | `assets/*` unveränderlich für ein Jahr, `index.html` und `sw.js` nie |
| Fremde Verbindungen | genau eine — das Supabase-Projekt, namentlich in der CSP |
| Schriften und Bilder | im Paket, keine Fremdabrufe zur Laufzeit |
| Offlinebetrieb | Service Worker mit Vorabspeicher |
| Sprachen | acht; Deutsch im Startpaket, die übrigen sieben als eigene Pakete |

## Was VOR dem öffentlichen Betrieb noch fehlt

Diese Punkte kann die App nicht selbst erledigen:

1. **`src/data/operator.ts` ausfüllen** — Name, Anschrift und E-Mail des
   Betreibers. Ohne sie ist das Impressum unvollständig, und die App weist
   im Rechtsbereich darauf hin.
2. **Rechtstexte prüfen lassen.** Datenschutzerklärung und
   Nutzungsbedingungen beschreiben, was die App tatsächlich tut. Ob das
   im konkreten Fall genügt, sagt ein Anwalt.
3. **Auftragsverarbeitung klären**, wenn Vereine mit Nachwuchs die App
   nutzen sollen: dort verarbeitet ein Trainer fremde Daten von
   Minderjährigen. Die Einwilligung ist im Produkt abgebildet, der Vertrag
   dahinter nicht.

## Prüfen, ob die Auslieferung stimmt

Nach dem Deploy diese vier Dinge ansehen:

- Eine tiefe Route direkt aufrufen (etwa `/verlauf/erinnerungen`) — sie muss
  laden statt eine 404 zu zeigen. Prüft den SPA-Redirect.
- Im Browser die Entwicklerwerkzeuge öffnen, Netzwerk ansehen: ausser dem
  eigenen Host und Supabase darf nichts erscheinen.
- Die App einmal offline neu laden — sie muss stehen.
- Im Profil eine andere Sprache wählen — etwa Svenska: Navigation UND
  Testnamen müssen umschalten. Bleiben die Testnamen deutsch, ist die
  Inhaltstabelle nicht mitgekommen.
