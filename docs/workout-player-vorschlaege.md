# Workout-Player in KYDON: Ist-Stand, Mobbin-Vorbilder, Technik und Vorschläge

Stand 13.10.2026. Bestandsaufnahme und Vorschläge, noch nichts davon gebaut. Vor dem Bau die Punkte unter «Vor dem Bau zu klären» entscheiden (CLAUDE.md §21).

**Kurz:** Einen Player gibt es, mit Satz-Log, Pausenuhr, Intervalluhr, Brustgurt-Puls und Feedback. Er liegt aber zwei Ebenen tief im Bereich «Plan», heisst nirgends «Workout» und verhält sich während des Trainings schwach:
- Er hält den Bildschirm nicht wach.
- Er gibt keinen Ton (auf dem iPhone also gar kein Signal).
- Er hat keine grosse Anzeige.
- Bei Neuladen ist alles weg.

Die freie Einheit hat überhaupt keine Uhr.

---

## Teil 1 — Ist-Stand in der App

### 1.1 Routen und Dateien (Router: `src/App.tsx`, Z. 150–191)

| Route | Bildschirm | Datei |
|---|---|---|
| `/plan` | Plan-Übersicht mit grünem Knopf «Training starten» (`hub-start-training`) | `src/features/plan/PlanHubScreen.tsx:73` |
| `/plan/start` | «Training starten»: Einheiten heute, verpasst und kommend mit Knopf «Start»; dazu drei freie Wege | `src/features/plan/TrainingStartScreen.tsx` |
| `/plan/heute?s=…&d=…` | **Session Player** «Einheit des Tages» | `src/features/plan/SessionPlayerScreen.tsx` |
| `/plan/frei/katalog`, `/plan/frei/neu`, `/plan/frei` | Freies Training: Einheit aus dem Katalog oder selbst gebaut, dann der freie Player | `src/features/plan/FreeTraining.tsx` |
| `/training` | Trainingslog: Einheiten nachträglich, e1RM, Muskelbalken. **Gesperrt hinter `trainingLog`, also erst ab Plus** (`src/data/pricing.ts:253`) | `src/features/training/TrainingScreen.tsx`, `WorkoutEditor.tsx` |
| `/tests/:slug` | Testlauf mit Countdown, Stoppuhr, Stufenzähler und Versuchstabelle | `src/features/tests/TestRunScreen.tsx`, `Timer.tsx`, `StageCounter.tsx` |
| `/trainer/kiosk` | Kiosk: ein Gerät an der Station, ohne Leiste | `src/features/coach/KioskScreen.tsx` |
| `/tagebuch` | Tagebuch: der Player schreibt beim Abschluss eine Einheit hinein | `src/features/diary/DiaryScreen.tsx` |

Weitere Einstiege zum Player:
- `AthleteToday.tsx:107`: Foto-Karte «Los geht's», nur wenn heute eine Planeinheit offen ist. Sonst steht dort klein der Textlink «Training starten» (Z. 127).
- `BlockScreen.tsx:108` und `FuelPlanned.tsx:37`.
- `PlanCalendarScreen.tsx:334`: Knopf «Jetzt durchführen» (`start.doNow`).

### 1.2 Was schon da ist

| Funktion | Wo | Bemerkung |
|---|---|---|
| Satz-Log Gewicht/Wdh/RIR/RPE/Dauer/Distanz, höchstens drei Felder je Übung | `SetLogger.tsx` | Felder aus dem Parametervertrag der Übung; vorbefüllt mit dem letzten Gewicht; ein Satz zählt erst nach dem Haken |
| Pausenuhr nach dem Haken | `SetLogger.tsx:132–185` | Klebender Streifen mit «Pause 1:30» und «Überspringen». **Kein +/−15 s, kein Ton, nur `navigator.vibrate`** |
| Intervalluhr Arbeit/Pause | `SessionPlayerScreen.tsx:36–48, 101–129` | Nur für Blöcke vom Typ `interval`. 56-px-Zahl in einer Karte, mitten in der Seite. **Kein Wake Lock, kein Ton, kein Vorwarnen 3-2-1** |
| Puls vom Brustgurt (Web Bluetooth) oder Handeingabe, Zielzone | `LiveHr.tsx`, `src/lib/bluetoothHr.ts`, `src/lib/bluetooth/heartRate.ts` | Gespeichert werden nur Mittel und Höchstwert. iOS hat kein Web Bluetooth |
| Abschluss: Minuten, RPE 1–10, Feedback 1–5, Schmerz-Haken | `SessionPlayerScreen.tsx:199–252` | Schreibt ins Tagebuch, hakt den Termin ab, meldet an den Trainer zurück |
| Ersatzübung (nur heute oder dauerhaft) | `SetLogger.tsx` | — |
| Übungsbilder, Kopfbild der Einheit, «Warum diese Einheit» | `SessionWhy.tsx`, `data/visuals` | — |
| Countdown mit Wake Lock und Endsignal (Ton und Vibration) | `tests/Timer.tsx`, `src/lib/useWakeLock.ts`, `src/lib/endSignal.ts` | **Nur im Testlauf, nicht im Player** |
| Stufenzähler für Beep-/Yo-Yo-Test | `tests/StageCounter.tsx` | Bewusst ohne eigenen Takt |
| Testmodi | Katalog | 39 × Stoppuhr, 19 × Countdown, 3 × AMRAP, 4 × Stufen, 47 × Versuche |
| Kiosk | `coach/KioskScreen.tsx` | Für Testtage, nicht fürs Training |

### 1.3 Was fehlt

- **Kein Wake Lock im Player.** Das Telefon geht mitten in der Pause aus; `useWakeLock` gibt es, es wird dort nur nicht benutzt.
- **Kein Ton im Player.** Er nutzt nur `navigator.vibrate`, und das kann iOS nicht. Ein iPhone-Nutzer bekommt also gar kein Signal. `endSignal.ts` gibt es, ungenutzt im Player.
- **Keine Laufzeituhr des ganzen Trainings.** Die Dauer wird am Ende von Hand eingetragen; vorbelegt ist die geplante Dauer, nicht die gemessene.
- **Freier Player** (`FreeTraining.tsx`): keine Uhr, kein Puls, nur ein Minutenfeld. Nach dem Speichern geht es zu `/training`, und dort sperrt für Free-Nutzer die Plus-Schranke.
- **Nichts übersteht Neuladen oder Wegwischen.** Alles liegt in `useState`. Wer den Player verlässt (Link «Fuel», X) oder wen iOS im Hintergrund beendet, verliert Sätze und Uhr. Es gibt keinen «Training läuft»-Balken zum Zurückkehren.
- **Uhren fehlen:** Wiederholungszähler, EMOM, AMRAP und Tabata (im Training), Rundenuhr für Kampfsport (Runde/Pause/10-s-Warnung).
- **Keine Ansagen** per Sprache oder 3-2-1-Ton.
- **Keine Anzeige über das Training:** keine Vollbild-Ansicht, die man aus 2–3 m liest, keine Steuerung im Sperrbildschirm, keine Live-Ansicht für Trainer.
- **Keine Zusammenfassung danach.** Nach dem Speichern springt der Player auf `/plan/block`, ohne Volumen, Sätze, Puls und Vergleich zum letzten Mal.

### 1.4 Warum der Auftraggeber den Knopf nicht findet

1. **Der Begriff fehlt.** Die Leiste heisst «Plan», nicht Training oder Workout (`BottomNav.tsx:57`, `nav.athletePlan = "Plan"`). Wer trainieren will, sucht nicht unter «Plan».
2. **Die Tiefe.** Der Weg ist Plan → «Training starten» → Liste → «Start» → Player: drei Tipps, bevor etwas läuft. Ohne Planblock bekommt man drei Textzeilen («Etwas eintragen», «Aus dem Katalog», «Selbst zusammenstellen»), und die erste führt Free-Nutzer an eine Bezahlschranke.
3. **«Heute» zeigt den Start nur mit Planeinheit.** Ohne sie steht dort «Keine Einheit eingetragen.» und ein kleiner Textlink (`AthleteToday.tsx:118–130`).
4. **Die Navigation versteckt «Plan».** Das Lupen-Dock ist eine seitlich verschiebbare Leiste mit über zehn Symbolen (`BottomNav.tsx` §3); «Plan» ist eines davon. Der feste Action Orb (`ActionOrb.tsx`) hat vier Aktionen, alle aus der Diagnostik, keine davon «Training starten».
5. **Der Bereich hängt an einem Bau-Schalter.** Ohne `VITE_TRAINING_PLAN` fehlt «Plan» ganz (`navItemsFor`, `planMode.ts`). `netlify.toml:22` setzt ihn auf `preview`. Lokale oder andere Bauten ohne die Variable zeigen gar nichts.
6. **Benennung:** «Einheit des Tages», «Start» und «Los geht's» sind drei verschiedene Wörter für dieselbe Sache.

---

## Teil 2 — Mobbin-Beispiele (iOS)

| # | App | Bildschirm/Flow | Link | Was gut ist |
|---|---|---|---|---|
| 1 | Hevy | Workout-Tab «Start Empty Workout» und «Start Routine» | [Bildschirm](https://mobbin.com/screens/ffc35de8-fc69-4292-b7ac-710ab04c6e65) | Ein eigener Tab nur zum Starten; freies Workout ist ein Knopf ganz oben |
| 2 | Hevy | Flow «Logging a workout», 21 Bildschirme | [Flow](https://mobbin.com/flows/7b6374ff-8ff6-4d7b-babe-077e72b6ee1f) | Vollständiger Ablauf: Start, Übung, Sätze, Pause, Speichern, Feed |
| 3 | Hevy | Log Workout: Dauer/Volumen/Sätze oben, Spalte «Previous», Haken | [Bildschirm](https://mobbin.com/screens/1c4a0238-dffb-4b0e-9dfb-e74d1ef62fb1) | Letzter Wert direkt neben dem Eingabefeld; ein Daumen, ein Haken |
| 4 | Hevy | Pausen-Banner −15/+15/Skip mit nächstem Satz (110 kg × 5–6) | [Bildschirm](https://mobbin.com/screens/6f5fad08-23a6-4698-9868-2289969a1d5e) | In der Pause steht schon, was als Nächstes kommt |
| 5 | Hevy | Sperrbildschirm-Live-Activity «Deadlift Set 3 of 4, 90 kg × 5» mit Haken | [Bildschirm](https://mobbin.com/screens/184c2861-65d0-4764-a3d3-6808a961264e) | Satz abhaken, ohne zu entsperren (nur nativ möglich) |
| 6 | Hevy | Scheibenrechner als Bottom Sheet | [Bildschirm](https://mobbin.com/screens/0ecebb09-0629-48dd-bba0-feb1b07b2d5e) | Hantel grafisch, verfügbare Scheiben wählbar |
| 7 | Bevel | Satz-Log mit schwebender Mini-Leiste (Übung, Uhr, Puls) | [Bildschirm](https://mobbin.com/screens/fb4dd4d3-a726-4b44-93cf-32443b7a84ce) | Laufendes Training bleibt als Leiste sichtbar |
| 8 | Bevel | Zusammenfassung: Gesamt-/Aktivzeit, Last, Gewicht, Wdh | [Bildschirm](https://mobbin.com/screens/5f7837bf-96da-4c5d-a614-655893f9cbf3) | Trennt aktive Zeit von Gesamtzeit |
| 9 | Ladder | Satz-Log dunkel mit grosser Ziffernfeld-Tastatur, kg/lb | [Bildschirm](https://mobbin.com/screens/3daed3ec-2832-48af-9f73-0aab0d428f51) | Eingabe mit dem Daumen, Kontrast für das Studio |
| 10 | Ladder | Video im Vollbild, Bogen-Countdown 0:22, «+ reps», Einstellungen (Tempo, Audio) | [Bildschirm](https://mobbin.com/screens/308ace07-5344-44ea-9f4a-edff86cbfe93) | Die Uhr unten rechts lässt sich aus der Distanz lesen; Audio ist schaltbar |
| 11 | Peloton Strength+ | Wdh-Eingabe als Ziffernfeld über dem Übungsbild | [Bildschirm](https://mobbin.com/screens/61ab24f0-ff1a-49e1-a08d-7ec5bb1af3b3) | Eine Zahl, ein grosser Bestätigen-Knopf |
| 12 | Peloton Strength+ | Pause mit «Resume / End», «Skip Block» | [Bildschirm](https://mobbin.com/screens/c52d049e-9b0d-4bd4-a8f1-bf715f44cfec) | Klare Unterbrechung mit zwei Entscheidungen |
| 13 | Peloton | Blockfortschritt 7/7 als Segmentleiste, Uhr gross oben | [Bildschirm](https://mobbin.com/screens/14eaed94-0e01-428d-b98c-522452ffc217) | Fortschritt auf einen Blick |
| 14 | Gymshark | Pausenring 00:59 mit −10 s/+10 s und Skip | [Bildschirm](https://mobbin.com/screens/f4cdbd47-9666-4c67-ae63-c75f2094254d) | Ring statt Zahl, auch aus dem Augenwinkel lesbar |
| 15 | Gymshark | Satzzeilen als grosse Kacheln mit Haken | [Bildschirm](https://mobbin.com/screens/25eebc84-2d43-4fdd-8474-2f05dea50098) | Erledigte Sätze färben sich |
| 16 | Google Health (Fitbit) | Flow «Completing a workout»: 3-2-1, Liste, Pause, RPE, Zusammenfassung | [Flow](https://mobbin.com/flows/69f9b525-c45b-40f5-adc4-51eb2f2922e9) | Kompletter Ablauf inklusive Anstrengung am Ende |
| 17 | Google Health (Fitbit) | Pause 00:14 riesig, «Next: High plank», «Skip rest» | [Bildschirm](https://mobbin.com/screens/e6319ff3-94ff-490a-bb8d-92f80e7a42be) | Ein Hauptknopf, Vorschau auf das Nächste |
| 18 | Google Health (Fitbit) | «Squat 10 Reps» und ein Knopf «Log set» | [Bildschirm](https://mobbin.com/screens/a4707f57-7ee6-48f0-8037-73e763e06a99) | Eine Übung pro Bildschirm statt einer langen Liste |
| 19 | pushr | Wiederholungszähler: riesige Ziffer, Gesamt, Satzzeit, Kamera-Knopf | [Bildschirm](https://mobbin.com/screens/ece8cca0-43a7-4747-86fa-8e1253bcf704) | Zählen mit Kamera oder Antippen, aus Distanz lesbar |
| 20 | Runna | «Record workout» als schwebender Knopf über dem Heute-Bildschirm | [Bildschirm](https://mobbin.com/screens/c1772274-03ea-4352-af4e-db6feb70753b) | Startknopf immer sichtbar, auch ohne Plan |
| 21 | Runna | Flow «Logging an exercise»: Satzkarten, «Active», Rest-Knopf, «Pause/Stop» und «Next Exercise» | [Flow](https://mobbin.com/flows/637dd0a9-6338-43a6-a474-765843d736bb) | Zwei feste Daumenknöpfe unten |
| 22 | Apple Fitness | Workout-Tab mit Play je Aktivität, Sperrbildschirm-Uhr | [Tab](https://mobbin.com/screens/8a91523f-2e4e-4c56-8f81-0e3a45e146d2), [Sperrbildschirm](https://mobbin.com/screens/5e65770d-0f4f-464f-8445-b23d3917ae7a) | Ein Tipp vom Tab zum laufenden Training |
| 23 | Strava | Tab-Leiste mit «Record» in der Mitte | [Bildschirm](https://mobbin.com/screens/22c0cb3a-2564-4836-8871-fa138ab97064) | Der klassische Mittelknopf |
| 24 | Tonal | Pause 0:10 über Video, ±10 s, «End workout», Fortschritt | [Bildschirm](https://mobbin.com/screens/50541d0f-6dd5-4652-946c-0d3b655e616f) | Medienplayer-Logik für geführte Einheiten |
| 25 | Noom / Tempo | Pose-Skelett und Kalibrier-Haken; Tempo «real-time coaching» | [Noom](https://mobbin.com/screens/047026d6-2957-4053-b44b-a4cab362dfac), [Tempo](https://mobbin.com/screens/1cd3e36c-55a1-4901-9e51-54b196d73ce4) | Kamera-Kalibrierung vor dem Satz |
| 26 | Ultrahuman / Oura | Live-Ansicht: Zeit riesig, Pulsring nach Zonen; Zusammenfassung mit Zonen | [Ultrahuman](https://mobbin.com/screens/a073ee84-ce8c-4198-9f1a-add73ff2de09), [Oura](https://mobbin.com/screens/d4f18703-69ba-4cce-bdb3-48c0c037a326) | Puls als Ring statt Zahl |

**Muster aus den Beispielen:**
1. Start in einem eigenen Tab oder Mittelknopf, freies Workout ohne Vorbedingung.
2. Während des Satzes eine Zahl oder Uhr über die halbe Bildschirmhöhe, dunkler Grund.
3. Zwei feste Daumenknöpfe unten (Pause/Weiter bzw. Satz fertig).
4. Pause als Ring mit ±10/15 s und «Nächstes: …».
5. Ein laufendes Training bleibt als Mini-Leiste sichtbar.
6. Zusammenfassung mit Vergleich zum letzten Mal.

---

## Teil 3 — Technische Optionen im Browser (PWA)

| Option | Im Browser? | iOS? | Aufwand | Bemerkung |
|---|---|---|---|---|
| Wake Lock API | Ja | Safari ab 16.4; als Homescreen-App laut Berichten erst ab 18.4 verlässlich ([progressier](https://progressier.com/pwa-capabilities/screen-wake-lock), [WebKit 254545](https://webkit.org/b/254545)) | S | **Schon da** (`useWakeLock.ts`), nur im Player einschalten |
| Web Audio für Pieptöne | Ja | Ja, wenn per Tippen freigeschaltet; der Stummschalter dämpft je nach Audio-Session | S | **Schon da** (`endSignal.ts`, gerechneter Ton, offline) |
| Speech Synthesis (Ansagen) | Ja | Ja, Stimmen je Sprache unterschiedlich, offline meist vorhanden; erste Ansage aus einem Tipp heraus | S | Für alle 8 Sprachen nötig; Text kurz halten («Runde 3. Zehn Sekunden.») |
| Vibration API | Android ja | **Nein.** `navigator.vibrate` wirkt in Safari nicht; der Trick mit `<input switch>` ist inoffiziell und soll mit iOS 26.5 gesperrt sein ([web-haptics](https://www.mintlify.com/lochie/web-haptics/advanced/browser-support), [rapidtoolset](https://rapidtoolset.com/en/tool/ios-haptics-tester)) | – | Nie das einzige Signal; Ton und Bild dazu |
| Media Session API und Benachrichtigungen (Sperrbildschirm) | Teilweise: Media Session nur, solange Audio spielt; Benachrichtigungen per Push | iOS: Web Push ab 16.4 nur als Homescreen-App; keine Live Activities | M | Ein stilles Audio als Träger für die Sperrbildschirm-Steuerung ist ein Hack, unzuverlässig |
| Hintergrund-Timer | Timer werden gedrosselt; Service Worker hat keine Uhr | iOS hält die PWA im Hintergrund an | S | **Gegen die Wanduhr rechnen** (macht `Timer.tsx` schon) und Zustand in `localStorage` sichern; Ende per geplanter Push nur mit Netz, also keine Lösung für «offline messen» |
| Web Bluetooth (Puls) | Chrome/Android/Desktop ja | **Nein** (auch nicht in der iOS-WebView) | – | **Schon da** (`LiveHr.tsx`); iOS nur nativ, siehe `docs/native-app.md` Phase 3 (`@capacitor-community/bluetooth-le`) |
| DeviceMotion zum Zählen von Wiederholungen | Ja | Ja, nach `DeviceMotionEvent.requestPermission()` aus einem Tipp und über HTTPS ([MDN](https://developer.mozilla.org/docs/Web/API/DeviceMotionEvent), [WebKit-Bug](https://bugs.webkit.org/show_bug.cgi?id=210261)) | M | Nur sinnvoll, wenn das Telefon am Körper oder an der Hantel sitzt; die Abtastrate ist nicht dokumentiert (rund 60 Hz). Für Wdh-Zählen brauchbar, für Geschwindigkeit nur grob |
| Kamera und Pose (MediaPipe Pose Landmarker / MoveNet) | Ja (WASM/WebGL), läuft auf dem Gerät | Ja, mit Kamerafreigabe; ältere iPhones ruckeln | L | Code unter Apache 2.0. Modell lite ca. 5,5 MB (Drittangabe, [pub.dev](https://pub.dev/documentation/vision_ai_pose/latest/)); die Lizenz der gehosteten Modelldatei an der Model Card prüfen ([MediaPipe](https://developers.google.cn/mediapipe/solutions/vision/pose_landmarker)). Selbst ausliefern statt von Google laden (Offline, Datenschutz). Kein Bild verlässt das Gerät, also auch keine Art-9-Frage zu Fotos |
| VBT (Bewegungsgeschwindigkeit) mit Kamera | Ja | Ja, aber Browser-Video läuft mit 30–60 fps, nicht 240 fps | L | Hantelpfad-Tracking über Scheibenmarker oder Pose. Ohne eigene Validierung **nur relativ** (Satz zu Satz, Tag zu Tag) und gegen den eigenen Messfehler zeigen |
| VBT mit Sensor (Bluetooth-Encoder/IMU) | Nur Chrome/Android | Nein (nur nativ) | M–L | Hersteller-Protokolle meist proprietär |
| Mikrofon (Sprung- und Schlaggeräusche) | Ja (`getUserMedia`, Web Audio) | Ja, mit Freigabe | M | Für Schlagzählung am Sack plausibel; für Sprunghöhe nicht belegt |
| Sprunghöhe per Zeitlupe (wie My Jump) | Video ja, Auswertung von Hand | Ja | M | Für CMJ validiert gegen eine Kraftmessplatte bei 240 Hz (Balsalobre-Fernández 2015; Gallardo-Fuentes 2016; Bishop 2022) ([St Mary's PDF](https://research.stmarys.ac.uk/id/eprint/1715/1/iPhone%20paper.pdf), [Herts](https://uhra.herts.ac.uk/id/eprint/7054/1/Haynes_et_al_my_jump_2_app_Accepted_Manuscript.pdf)). Im Browser geht nur die Bildfrequenz des Geräts; Messfehler selbst bestimmen |
| Apple Watch / Wear OS, Live Activities, Widgets | Nein | Nur nativ | L | Capacitor-Pfad in `docs/native-app.md` (Phase 3: Bluetooth, Health, Widget). Live Activity und Watch kämen als weiteres natives Modul (Swift) dazu |

---

## Teil 4 — Vorschläge

### V1 — «Training starten» als Mittelpunkt (löst den Einstieg) · Aufwand S–M

**Idee:** Ein fester, beschrifteter Startknopf in der Mitte von «Heute» und als Aktion im Action Orb. Freies Training ohne Plan und ohne Bezahlschranke. Laufende Einheiten überstehen alles.

**Ablauf:**
1. Auf «Heute» steht immer eine grosse Karte. Mit Plan: «Einheit von heute starten». Ohne Plan: «Freies Training starten», dazu «Rundenuhr» und «Intervalle».
2. Der Action Orb bekommt «Training starten» als erste Aktion.
3. Die Leiste «Plan» heisst «Training».
4. Ein Tipp öffnet sofort den Player mit laufender Uhr; Übungen kommen danach dazu (wie «Start Empty Workout» bei Hevy).
5. Verlässt man den Player, bleibt unten eine Mini-Leiste «Training läuft 23:14 · Pause 0:40» (wie Bevel).
6. Der Zustand liegt bei jedem Satz in `localStorage`; nach Neuladen fragt der Player «Weitermachen?».

**Technik:** Nur bestehende Bausteine: `TrainingStartScreen`, `FreeTraining`, `ActionOrb`, `BottomNav`. Neue Texte in allen 8 Sprachen.

**Risiken:**
- Gespeicherte Sätze dürfen für Free-Nutzer nicht hinter der `trainingLog`-Schranke landen. Ob das Speichern selbst frei ist und nur die Auswertung Plus, ist eine Preisfrage, also **Rückfrage**.
- Doktrin §6 legt die fünf Hauptbereiche fest; die Umbenennung «Plan» → «Training» klären.

**Vorbild:** Hevy Quick Start (#1), Runna «Record workout» (#20), Strava-Mittelknopf (#23), Bevel Mini-Leiste (#7).

### V2 — Arena-Modus: ein Vollbild-Player für alle Sportarten · Aufwand M

**Idee:** Statt einer Seite mit Karten ein Querformat-tauglicher Vollbildmodus. Eine riesige Zahl, Farbe je Phase (Arbeit, Pause, Vorwarnung), zwei Daumenknöpfe. Derselbe Motor fährt die Formen Sätze, Intervall, EMOM, AMRAP, Tabata und **Kampfsport-Runden**.

**Ablauf:**
1. Form wählen oder aus der Planeinheit übernehmen, z. B. «Boxen 12 × 3:00 / 1:00, Warnung 10 s».
2. Ein Tipp auf Start schaltet Wake Lock, Audio und Ansagen frei.
3. Der Bildschirm zeigt die Runde 7/12 und 1:42 über die halbe Höhe; die Farbe wechselt 10 s vor Ende.
4. Ansagen per Ton (gerechneter Gong) und Sprache: «Letzte zehn Sekunden», «Runde acht».
5. In der Pause: Puls (falls Gurt) und ein Tipp für den Schlagzähler oder «Runde gut/schlecht».
6. Am Ende geht es direkt in die Zusammenfassung (V4).

**Technik:**
- Ein reiner Phasenmotor in `src/domain` (Wanduhr-basiert, testbar).
- `useWakeLock`, `endSignal`, `speechSynthesis`.
- Der Zustand liegt lokal und läuft ohne Netz.

**Risiken:**
- Der Stummschalter unter iOS; die Ansage-Texte brauchen alle 8 Sprachen.
- Das Ende im Hintergrund lässt sich nicht signalisieren. Deshalb gehört der Modus in den Vordergrund mit Wake Lock, und das muss die Oberfläche sagen.

**Vorbild:** Ladder (#10), Gymshark-Ring (#14), Google Pause groß (#17), Ultrahuman-Pulsring (#26).

### V3 — Satz-Messung statt Satz-Behauptung: Kamera-Zähler und relative Bewegungsgeschwindigkeit · Aufwand L (in zwei Stufen)

**Idee:** Das Telefon steht am Boden, die Kamera zählt die Wiederholungen und misst die mittlere konzentrische Geschwindigkeit je Wiederholung, nur auf dem Gerät. KYDON zeigt den Geschwindigkeitsverlust im Satz und den Vergleich zum letzten Mal, **gegen den eigenen Messfehler**. Es schreibt keine Last vor.

**Ablauf:**
1. Im Satz «Mit Kamera messen» antippen.
2. Kalibrieren: Körper oder Hantelscheibe im Bild, ein Haken wie bei Noom.
3. Satz ausführen; die Zahl der Wiederholungen springt mit.
4. Nach dem Satz zeigt die Karte: 5 Wdh, Tempo der ersten zu letzten Wdh −18 %, vergleichbar mit dem letzten Mal: ja/nein.
5. Wdh werden ins Satz-Log übernommen und lassen sich bearbeiten (der Mensch entscheidet).
6. Kein Bild, kein Video wird gespeichert, nur Zahlen.

**Technik:**
- Stufe 1: Wdh-Zählen mit MediaPipe Pose lite, selbst ausgeliefert, in einem Lazy-Chunk.
- Stufe 2: Geschwindigkeit nur relativ, mit eigener Test-Retest-Prüfung, bevor «besser/schlechter» erscheint (Regel 7, `domain/change.ts`).

**Risiken:**
- Rechenlast und Akku; Licht und Kamerawinkel.
- Eine absolute Geschwindigkeit ohne Validierung wäre eine Behauptung, also anfangs nur Wdh und relativer Verlust, gekennzeichnet als «Schätzung».
- Modelllizenz prüfen; Kameraeinwilligung sauber texten.
- Fachlich gehört eine Last-Empfehlung aus der Geschwindigkeit **nicht** dazu (Doktrin §2.2).

**Vorbild:** pushr (#19), Noom/Tempo (#25).

### V4 — Zusammenfassung mit Messfehler: «Was hat sich wirklich verändert?» · Aufwand S–M

**Idee:** Nach jeder Einheit eine kurze Karte, die die Doktrin-Frage 4 beantwortet, nicht «Gut gemacht!».

**Ablauf:**
1. Abschluss mit RPE, Feedback und Schmerz wie heute.
2. Dann die Karte: Dauer (gemessen), Sätze, Volumen, Puls (Mittel/Max, Zonen falls Gurt).
3. Je Hauptübung der e1RM bzw. die Bestleistung gegen das letzte Mal, mit «innerhalb des Messfehlers» oder «darüber».
4. Ein Hinweis auf den nächsten fälligen Retest aus dem Block («In 9 Tagen: CMJ»).
5. Ein Knopf «Fertig»; Teilen nur, wenn gewollt.

**Technik:**
- Vorhanden: `domain/training` (e1RM, Volumen), `domain/change.ts`, `liveHr`.
- Neu: nur der Bildschirm und der Weg dorthin statt `navigate('/plan/block')`.

**Risiken:** e1RM ist eine Schätzung und muss so heissen (steht schon so in `TrainingScreen`).

**Vorbild:** Bevel-Zusammenfassung (#8), The Outsiders «vs 30-day avg» ([Bildschirm](https://mobbin.com/screens/98638987-60b2-4189-bee0-cd4f04fea285)), Google-Flow (#16).

### V5 — Testtag-Live für Trainer: Kiosk trifft Rundenuhr · Aufwand M–L

**Idee:** Der Trainer startet am Testtag oder im Gruppentraining eine gemeinsame Uhr (Stationen, Runden). Jedes Athletengerät zeigt dieselbe Phase. Der Trainer sieht live, wer an welcher Station welchen Wert eingetragen hat.

**Ablauf:**
1. Der Trainer öffnet den Testtag und tippt «Live starten».
2. Die Athleten treten per Code bei.
3. Die gemeinsame Uhr läuft (Startzeit vom Server, danach lokal gegen die Wanduhr, damit sie auch bei schlechtem Netz weiterläuft).
4. Werte werden lokal erfasst und abgeglichen, sobald Netz da ist.
5. Der Trainer sieht ein Gitter «Station × Athlet».

**Technik:**
- Supabase Realtime-Kanäle oder einfache Abfragen.
- Neue Tabelle(n) **mit RLS in derselben Migration**, Schema-Version +1.
- Bestehende `KioskScreen` und `TestDay*` erweitern.

**Risiken:**
- Regel 3 (Messen ohne Netz) und Regel 8 (nie mitten am Testtag sperren): die Live-Ansicht darf nur Zusatz sein, nie Voraussetzung.
- Datenschutz Gruppensicht; das ist eine **Rückfrage** wegen RLS und Nutzerdaten.

**Vorbild:** Peloton Blockfortschritt (#13); kein direktes Mobbin-Vorbild für die Gruppensicht.

### V6 — Kampfsport-Pratzen- und Sack-Zähler per Mikrofon · Aufwand M, Vorschau

**Idee:** In der Rundenuhr (V2) zählt das Mikrofon Schläge am Sack oder an der Pratze und zeigt Schläge je Runde und den Abfall über die Runden. Das ist ein beschreibender Messwert, keine Bewertung.

**Ablauf:**
1. «Schläge zählen» einschalten.
2. Eine Probe von 10 Schlägen kalibriert die Schwelle.
3. Runde läuft; der Zähler steht klein unter der Uhr.
4. Danach: Schläge je Runde als Balken, mit «Zählung geschätzt, Fehler ±x % (eigene Probe)».

**Technik:** `getUserMedia` und ein Web-Audio-Analyser, alles auf dem Gerät, keine Aufnahme gespeichert.

**Risiken:**
- Lärm in der Halle, mehrere Säcke nebeneinander.
- Ohne eigene Genauigkeitsprüfung nur hinter dem Vorschauschalter (Regel 6/11 sinngemäss).

**Vorbild:** pushr-Zähler (#19) als Anzeigeform.

---

## Empfohlene Reihenfolge

1. **Schnelle Reparaturen im bestehenden Player (S, sofort):**
   - `useWakeLock(running || restEnd)` und `prepareEndSignal`/`playEndSignal` in `SessionPlayerScreen` und `SetLogger` einbauen, mit 3-2-1-Tönen; Pause ±15 s.
   - Gemessene Dauer statt geplanter vorbelegen.
   - Zustand in `localStorage` sichern.

   Das behebt das «nutzlos» am stärksten mit dem kleinsten Eingriff.
2. **V1 Einstieg:** Startkarte auf Heute, Orb-Aktion, Umbenennung, Mini-Leiste, freies Training ohne Schranke beim Speichern. Preisfrage vorher klären.
3. **V2 Arena-Modus** mit Rundenuhr, Intervall, EMOM, AMRAP und Tabata (Motor in `src/domain`, Ansagen in 8 Sprachen).
4. **V4 Zusammenfassung** gegen den Messfehler.
5. **V3 Kamera:** zuerst Wdh-Zählen, Geschwindigkeit erst nach eigener Test-Retest-Prüfung.
6. **V5 Testtag-Live** und **V6 Mikrofon-Zähler**. V5 mit Migration, RLS und Rückfrage; V6 als Vorschau.
7. **Nativ** (Capacitor, `docs/native-app.md`): Bluetooth-Puls auf iOS, Sperrbildschirm-Live-Activity, Watch. Erst wenn die PWA-Grundlage steht.

**Vor dem Bau zu klären (CLAUDE.md §21):**
- Freies Speichern ohne Plus (Preise).
- Umbenennung des Hauptbereichs (Doktrin §6).
- Neue Tabellen für Live und Testtag (RLS, Nutzerdaten).
- Kamera- und Mikrofon-Einwilligungstexte.
- Keine neuen Bibliotheken ohne Rückfrage; MediaPipe wäre eine.
---

## Entscheidungen (13.10.2026)

Vom Auftraggeber freigegeben:

1. **Freies Training wird auch ohne Plus gespeichert.** Die Auswertung im Trainingslog bleibt eine Frage der Stufe; das Speichern nicht.
2. **«Plan» heisst künftig «Training».** Betrifft Leiste, Überschriften und Texte in allen 8 Sprachen.
3. **Kameraerkennung (MediaPipe Pose) darf integriert werden.** Bedingungen bleiben: läuft nur auf dem Gerät, Modell wird mit der App ausgeliefert, kein Bild oder Video wird gespeichert, Geschwindigkeit nur relativ und gegen den eigenen Messfehler.

Vor dem Bau: Mockups (Einstieg in drei Varianten; Zähler für Kraft, Pause, Laufen, Runden, Kamera; Zusammenfassung) zur Auswahl vorgelegt.
