# Kamera, Mikrofon und Standort im Training

Stand 13.10.2026. Freigegeben vom Auftraggeber (Kameraerkennung integrieren),
umgesetzt mit dem Workout-Player (`docs/workout-player-vorschlaege.md`).

## Was die Kamera tut

- **Wiederholungen zählen** und das **Tempo je Wiederholung relativ** schätzen
  (`src/domain/repCounter.ts`). Gezählt wird ein Gelenkwinkel je Bewegungsmuster:
  Knie (Kniebeuge), Hüfte (Hüftbeugen), Ellbogen (Drücken, Ziehen). Welche
  Übung zählbar ist, folgt aus `patterns` der Übungsdatenbank.
- Die Zahl ist ein **Vorschlag**: ±1 korrigiert, «Satz fertig» übernimmt sie
  ins Satz-Log. Der Mensch entscheidet.
- **Kein Urteil, keine Last:** Tempo ist Winkelgeschwindigkeit in Grad/s,
  keine Hantelgeschwindigkeit in m/s. Angezeigt werden nur der Verlauf im
  Satz (Tempoverlust) und das Wort «Schätzung». Ein Vergleich zwischen Tagen
  käme erst über `domain/change.ts` (Regel 7); eine Lastempfehlung gibt es
  nicht (Doktrin §2.2).

## Datenschutz

- Erkennung **nur auf dem Gerät** (MediaPipe Pose Landmarker «lite», WebAssembly).
  Kein Bild, kein Video wird gespeichert oder verschickt; heraus kommen
  33 Körperpunkte je Bild, und auch die werden nur gezählt.
- **Mikrofon** (Schlagzähler, nur Vorschaubau): nur der Pegel je Bild, keine
  Aufnahme. Geht in kein Urteil und keinen Bericht.
- **Standort** (Lauf): nur solange die App offen ist. Gespeichert werden
  Strecke, Zeit, Runden und Puls — keine Spur, kein Ort.
- `public/_headers`: `Permissions-Policy` erlaubt Kamera, Mikrofon und
  Standort nur der eigenen Seite; die CSP erlaubt `'wasm-unsafe-eval'`
  (nur WebAssembly übersetzen, kein `eval()`).
- **Offen (Rückfrage):** ob die Datenschutzerklärung einen Satz zu Kamera,
  Mikrofon und Standort braucht — es wird nichts davon übertragen, aber der
  Zugriff wird erfragt. Rechtstexte nur nach Rückfrage ändern.

## Auslieferung

- Bibliothek `@mediapipe/tasks-vision` 1.1.0 (Apache-2.0), nachgeladen erst
  beim Öffnen der Kamera (eigener Chunk, nicht im Startpaket).
- WebAssembly wird beim Bau aus dem Paket nach `public/mediapipe/` kopiert
  (`vite.config.ts`, nicht im Repo), nur die SIMD-Fassung.
- Modell `public/models/pose_landmarker_lite.task` (5,8 MB, float16,
  SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`),
  bezogen von storage.googleapis.com/mediapipe-models.
- **Offen vor dem Livegang:** die Lizenz der Modelldatei an der Model Card
  bestätigen (die Bibliothek ist Apache-2.0; die Modellkarte nennt ihre
  Bedingungen eigens).
- Beides liegt nicht im Vorab-Zwischenspeicher; beim ersten Öffnen geladen,
  danach offline (`runtimeCaching` «pose»).

## Grenzen

- Geräte ohne SIMD-WebAssembly oder ohne Kamera: der Zähler sagt das und
  führt zurück zum Satz; gezählt wird dann wie gewohnt von Hand.
- Licht, Winkel und mehrere Personen im Bild stören. Die drei Haken beim
  Einrichten (Körper sichtbar, Licht, Telefon still) fangen das Gröbste ab.
- Die Genauigkeit ist nicht gegen eine Videozählung validiert.
