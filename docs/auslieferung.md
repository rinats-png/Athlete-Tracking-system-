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

## Eigene Domain: kydon.app

Die App läuft bis zur Umstellung unter `baseline-diagnostics.netlify.app`.
Die eigene Domain kommt in dieser Reihenfolge dazu — und die Reihenfolge ist
kein Detail, weil jeder Schritt den vorigen voraussetzt:

1. **Netlify → Domain management → Add a domain** → `kydon.app`. Netlify
   nennt daraufhin die DNS-Einträge, die es erwartet. Am einfachsten ist es,
   die Nameserver der Domain auf Netlify DNS zu stellen; sonst beim Registrar
   einen `A`/`ALIAS`-Eintrag für die Apex-Domain und ein `CNAME` für `www`
   auf das Netlify-Ziel.
2. **HTTPS** stellt Netlify automatisch über Let's Encrypt aus, sobald der
   DNS-Eintrag greift — das kann bis zu einer Stunde dauern. Die `.app`-Endung
   steht auf der HSTS-Preload-Liste der Browser: sie ist **nur** über HTTPS
   erreichbar, ein Aufruf ohne Zertifikat scheitert nicht weich, sondern hart.
   Also erst DNS, dann Zertifikat abwarten, dann verlinken.
3. **Primäre Domain** auf `kydon.app` setzen. Netlify leitet `www.kydon.app`
   und die Netlify-Adresse dann dorthin um — die alte Adresse bleibt
   erreichbar, sie ist nur nicht mehr die Hauptadresse.
4. **Supabase → Authentication → URL Configuration:** *Site URL* auf
   `https://kydon.app`, und unter *Redirect URLs* `https://kydon.app/**`
   eintragen. Ohne diesen Schritt läuft das Zurücksetzen des Passworts ins
   Leere: die App nennt als Rücksprungadresse ihre eigene Herkunft, und
   Supabase lehnt jede Adresse ab, die nicht auf der Liste steht.
5. Die Edge Function `delete-account` kennt `kydon.app` bereits (siehe
   `ALLOWED_ORIGINS` in ihrem Quelltext). Braucht eine weitere Herkunft
   Zugriff — eine Vorschau-Umgebung etwa —, kommt sie über die
   Umgebungsvariable `APP_ORIGIN` dazu, ohne die Datei anzufassen.

**Zur E-Mail:** Eine Domain bringt keinen Posteingang mit. `preise@kydon.app`
steht in der App als Kontaktadresse; damit dort etwas ankommt, braucht die
Domain entweder einen Mail-Dienst oder eine Weiterleitung beim Registrar —
beides ist in wenigen Minuten eingerichtet, aber es ist ein eigener Schritt.

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
