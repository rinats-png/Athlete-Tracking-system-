# KYDON als native App: der ganze Weg, von Anfang bis Ende

Stand: 26.09.2026. Ergänzt [store-weg.md](store-weg.md) (das «Warum
Capacitor») um den vollständigen Arbeitsplan: was zu tun ist, was du dafür
brauchst, was es kostet und wie lange es dauert.

> **Vorbehalt.** Store-Regeln, Gebühren und Fristen ändern sich. Alles, was
> hier über Apple und Google steht, entspricht dem Stand meines Wissens und
> ist vor dem Start an den offiziellen Seiten zu prüfen (App Store Review
> Guidelines, Google Play Developer Policy Center). Die Stellen, an denen
> sich zuletzt viel bewegt hat, sind markiert (⚠︎).

---

## 0. Warum die erste Version echte iOS-Funktionen braucht

Apple prüft seit 2026 deutlich strenger (Recherche vom 26.09.2026):

- **2.5.2 — kein nachgeladener Code, der die Funktion ändert.** Deshalb
  wurden im März 2026 Updates von Replit und Vibecode blockiert und die App
  «Anything» entfernt. Apple hat dazu klargestellt: Es gibt **keine Regel
  gegen mit KI gebaute Apps**; getroffen werden Apps, die auf dem Gerät
  selbst Apps bauen und ausführen.
- **4.2 — Mindestfunktionalität.** Eine App, die nur eine Website in einer
  Hülle zeigt, wird abgelehnt. Push allein reicht nicht mehr; gefragt sind
  Funktionen über iOS-Schnittstellen, die der Browser nicht erreicht.
- **4.3 — Spam/Vorlagen.** Trifft KYDON kaum (eigener Fachkatalog).

**Folgen für diesen Plan:**

1. Brustgurt über CoreBluetooth, Apple Health (HealthKit) und ein
   Homescreen-Widget gehören in die **erste** Store-Version (Phase 3), nicht
   in 1.1.
2. **Keine Live-Updates** (nachgeladenes JavaScript am Store vorbei) zum
   Start. Updates laufen über normale Store-Versionen.
3. Eine **Prüfnotiz** an Apple nennt die nativen Funktionen und liefert
   einen Demo-Zugang (Checkliste in Phase 7).

---

## 1. Die Entscheidung in einem Satz

Die bestehende PWA wird mit **Capacitor** in eine iOS- und eine
Android-App verpackt. Der Anwendungscode, die Datenschicht, die 1 100+
Prüffälle bleiben; neu sind die native Hülle, ein paar Plugins und die
Abrechnung über die Stores.

Nicht React Native, nicht Flutter: das hiesse, Testkatalog, Referenzen,
Migrationen und Oberfläche neu zu bauen — Monate statt Wochen.

---

## 2. Was du brauchst (Checkliste)

### Konten und Rechtliches

| Was | Kosten | Dauer | Anmerkung |
|---|---|---|---|
| **Apple Developer Program** | 99 USD/Jahr | 1–2 Tage (Person) · 1–3 Wochen (Firma) | Firmenkonto braucht eine **D-U-N-S-Nummer** (kostenlos, Beantragung über Apple/Dun & Bradstreet, dauert bis zu ~2 Wochen). Der Firmenname erscheint dann als Anbieter im Store. |
| **Google Play Console** | 25 USD einmalig | 1–3 Tage (Identitätsprüfung) | ⚠︎ Neue **private** Konten müssen vor der Veröffentlichung einen **geschlossenen Test mit mindestens 12 Testern über 14 Tage** fahren. Organisationskonten (mit D-U-N-S) sind davon ausgenommen. |
| Rechtsform / Impressum | — | — | Betreiberangaben stehen in `src/data/operator.ts` noch aus (prd.md §13). Ohne sie keine Store-Einreichung. |
| Datenschutzerklärung unter fester Adresse | — | — | Existiert (`/datenschutz`); ergänzen um: App-Stores als Vertriebsweg, HealthKit/Health Connect, Bluetooth-Messung, Store-Abrechnung (RevenueCat/Apple/Google als Empfänger). **Anwaltlich prüfen lassen.** |
| Steuer- und Bankdaten | — | 1 Tag | In App Store Connect und Play Console, für Auszahlungen der Abos. |
| Support-Adresse und Support-Seite | — | — | Pflichtangabe in beiden Stores. |

### Hardware und Werkzeuge

| Was | Kosten | Anmerkung |
|---|---|---|
| **Mac** (für Xcode und den iOS-Build) | 0 € (vorhanden) · ~700 € (Mac mini) · oder Cloud | Alternative ohne eigenen Mac: **Codemagic** oder **GitHub Actions macOS-Runner** für Builds (Freikontingente, danach nutzungsabhängig), MacinCloud (~30–50 €/Monat) für gelegentliche Xcode-Arbeit. |
| iPhone zum Testen | ~250 € gebraucht | Bluetooth und HealthKit lassen sich im Simulator nicht prüfen. |
| Android-Gerät zum Testen | ~150 € | Dito für Health Connect und Bluetooth. |
| Polar H10 (oder vergleichbar) | ~90 € | Für die Brustgurt-Messung auf beiden Plattformen. |
| Xcode, Android Studio | 0 € | |
| **RevenueCat** (Abo-Verwaltung) | 0 € bis 2 500 USD Umsatz/Monat, danach ~1 % | Optional, spart aber 1–2 Wochen Eigenbau. |

### Inhalte

- App-Icon (1024 px) und Startbildschirm — aus dem vorhandenen Logo, per `@capacitor/assets` erzeugt.
- **Screenshots**: iPhone 6,9″ (Pflicht), ggf. 6,5″; Android-Telefon; je Sprache, in der du listest. Die Mockup-Skripte (`npm run mockups`) liefern die Grundlage.
- Store-Texte: Name, Untertitel (30 Zeichen), Kurz- und Langbeschreibung, Schlüsselwörter — in den 8 Sprachen.
- Altersfreigabe-Fragebogen (Apple) und IARC-Fragebogen (Google).
- **App Privacy** (Apple) und **Data safety** (Google): ehrliche Angaben zu E-Mail, Messwerten, Gesundheitsdaten, Nutzungsstatistik.

---

## 3. Die Arbeit, Schritt für Schritt

Aufwand in **Entwicklertagen** (ein Entwickler bzw. ich mit dir als
Entscheider/Tester). Kalenderzeit steht in Abschnitt 4.

### Phase 0 — Konten und Entscheidungen (parallel zu allem, 1–3 Wochen Kalender)

1. Personen- oder Firmenkonto entscheiden (Empfehlung: **Firma** — ein
   Gesundheits- und Abo-Produkt unter Privatnamen ist ungünstig, und das
   Firmenkonto erspart bei Google den 12-Tester-Pflichttest).
2. D-U-N-S beantragen → Apple Developer Program → Google Play Console.
3. Bundle-ID festlegen: `app.kydon.diagnostics` (steht in store-weg.md).
4. **Abrechnungsentscheidung** (siehe Phase 4) — die grösste offene Frage.

### Phase 1 — Hülle und erster Lauf auf Geräten (2–3 Tage)

1. Capacitor einbauen (`@capacitor/core`, `cli`, `ios`, `android`), `npx cap init`, `add ios`, `add android`.
2. Build-Weg: `npm run build && npx cap sync`; Service Worker in der nativen
   Fassung abschalten (die App liegt ohnehin lokal im Paket; ein Service
   Worker in der WebView bringt dort nur Aktualisierungsprobleme).
3. Routing prüfen (History-Routen funktionieren in Capacitor), Safe Areas
   (Notch, Home-Indikator) — die Oberfläche nutzt schon `env(safe-area-*)`
   an der Leiste; jede Seite einmal ansehen.
4. Icons und Startbildschirm erzeugen.
5. Erste Builds auf iPhone und Android-Gerät.

### Phase 2 — Was in der WebView anders ist (5–8 Tage)

1. **Datenhaltung absichern (wichtigster Punkt).** KYDON ist lokal zuerst;
   der Bestand liegt in `localStorage`/IndexedDB. In einer iOS-WebView
   können diese unter Speicherdruck geleert werden. Für die native Fassung
   den Bestand zusätzlich in nativen Speicher schreiben
   (`@capacitor/preferences` oder SQLite) — hinter derselben Schnittstelle
   wie heute (`localStore.saveData`). Prüffall: Bestand überlebt App-Neustart
   und «Speicher freigeben».
2. **Anmeldung und Links.** Bestätigungs- und Passwort-Mails von Supabase
   führen heute auf `kydon.app/...`. Für die App: **Universal Links** (iOS)
   und **App Links** (Android) auf `kydon.app` einrichten
   (`apple-app-site-association`, `assetlinks.json` auf der Website), in
   Supabase die Weiterleitungs-URLs ergänzen.
3. **Erinnerungen.** Heute Web Push (VAPID). In der App: APNs (Apple) und
   FCM (Google) über `@capacitor/push-notifications`; die Edge Function
   `push` um diese beiden Wege erweitern. Schlüssel (APNs-Key, FCM-Service-
   Account) **nur im Supabase Vault**, nie im Repo.
4. **Export und Teilen.** Download-Links in der WebView funktionieren nicht
   wie im Browser → `@capacitor/filesystem` + `@capacitor/share` für JSON-
   Export, PDF-Bericht, Performance Card, Kalenderdatei.
5. **Fotos.** Kamera/Galerie über `@capacitor/camera`
   (Berechtigungstexte in `Info.plist` / `AndroidManifest`).
6. **Externe Links** (Stripe-Portal, Rechtstexte) im System-Browser öffnen
   (`@capacitor/browser`).
7. Content Security Policy für `capacitor://localhost` bzw. `https://localhost` anpassen.

### Phase 3 — Native Funktionen für die erste Version (6–9 Tage, Pflicht wegen 4.2)

1. **Bluetooth.** Web Bluetooth gibt es in der iOS-WebView nicht. Die
   Datei `src/lib/bluetooth/heartRate.ts` bekommt eine zweite
   Implementierung über **`@capacitor-community/bluetooth-le`** (iOS und
   Android); die Fachlogik (`domain/hrv.ts`) bleibt unverändert. Damit geht
   die HRV-Messung dann **auch auf dem iPhone**.
2. **Apple Health / Health Connect** über **`@capgo/capacitor-health`**
   (github.com/Cap-go/capacitor-health): lesen von Ruhepuls, HRV (Apple:
   SDNN, nicht RMSSD — getrennt führen!), Schlaf, Gewicht, Workouts; optional
   schreiben der eigenen HRV-Messung.
   - Apple: HealthKit-Entitlement, Nutzungsbeschreibungen, klare Begründung
     in der Review-Notiz.
   - ⚠︎ Google: Health-Connect-Berechtigungen erfordern eine **Deklaration
     in der Play Console** und eine gesonderte Prüfung; Freigabe kann
     Wochen dauern. Früh einreichen.
3. **Homescreen-Widget** (iOS WidgetKit, Android App Widget): Tageskontext
   («2 von 6 Angaben ausserhalb deiner Bandbreite») und nächster fälliger
   Test. Braucht ein kleines natives Modul (Swift/Kotlin) und einen
   geteilten Speicherbereich (App Group).
4. Einwilligung für Gesundheitsdaten je Datenart (existiert für die
   Brustgurt-Messung, erweitern).
5. Optional, falls die Prüfung trotzdem hakt: iOS-Teilen-Erweiterung
   (Bericht/Card teilen) oder Kurzbefehle (Siri: «HRV messen»).

### Phase 4 — Abrechnung (5–10 Tage, je nach Weg)

**Die Regel** (⚠︎ in Bewegung): Digitale Abos, die *in der App*
verkauft werden, müssen über **Apple In-App Purchase** bzw. **Google Play
Billing** laufen. Provision: **15 %** im Small Business Program (Apple) bzw.
15 % auf Abos (Google). In den USA und in der EU (DMA) gibt es inzwischen
Ausnahmen für externe Kauflinks — mit eigenen Gebühren und Bedingungen; für
den Start nicht darauf bauen.

**Drei Wege:**

| Weg | Aufwand | Folge |
|---|---|---|
| **A — Store-Abrechnung mit RevenueCat** (Empfehlung) | 5–7 Tage | Produkte in beiden Stores anlegen, RevenueCat-SDK, **Webhook → Edge Function → `entitlements`** (analog `stripe-webhook`; Freischaltungen schreibt weiterhin nur der Server, §19). Web-Käufe (Stripe) und Store-Käufe landen in derselben Tabelle. |
| B — Store-Abrechnung selbst gebaut | 8–12 Tage | Wie A ohne RevenueCat: Belegprüfung bei Apple und Google selbst, Server-Benachrichtigungen beider Stores. |
| C — Keine Käufe in der App | 1–2 Tage | Die App schaltet nur frei, was im Web gekauft wurde, und darf den Kauf in der App **nicht bewerben** (auch kein Preis, kein Link). Schnellster Start, aber Nutzer ohne Web-Konto sehen nur die kostenlose Stufe. |

Preise: bei 15 % Provision entweder gleiche Preise (weniger Marge) oder
Store-Preise leicht höher — **deine Entscheidung** (Preise nur nach
Rückfrage, CLAUDE.md).

### Phase 5 — Store-Auftritt (3–5 Tage)

1. Screenshots in 8 Sprachen (automatisiert aus den Mockup-Skripten).
2. Texte: Name «KYDON – Performance Diagnostics», Untertitel, Beschreibung,
   Keywords. **Keine medizinischen Versprechen** (store-weg.md): kein
   «erkennt Übertraining», kein «Gesundheitsrisiko».
3. App Privacy / Data safety ausfüllen.
4. Kategorie: Gesundheit & Fitness (Apple) / Health & Fitness (Google).
5. Altersfreigaben; Hinweis: Minderjährige nutzen KYDON mit
   Einwilligung der Eltern — das bleibt so und ist anzugeben.

### Phase 6 — Testen (1–2 Wochen Kalender)

1. **TestFlight** (Apple) mit dir und 5–20 Athleten/Trainern.
2. **Geschlossener Test** bei Google (⚠︎ bei Privatkonto Pflicht: 12 Tester,
   14 Tage durchgehend).
3. Prüfliste: Offline messen, Bestand nach Neustart, Anmeldung per Mail-Link,
   Kauf und Wiederherstellen, Push, Export, Brustgurt, Health-Import,
   Kontolöschung **in der App** (Apple verlangt sie; gibt es schon:
   Edge Function `delete-account`).
4. Automatisiert: die bestehenden Playwright-Prüffälle laufen weiter gegen
   den Web-Build; für die native Hülle ein kleiner Satz Gerätetests
   (Appium oder Maestro, optional).

### Phase 7 — Einreichen und Prüfung (1–2 Wochen Kalender)

**Prüfnotiz an Apple (App Review Information → Notes), Checkliste:**
- Native Funktionen mit Weg dorthin: Brustgurt-Messung (CoreBluetooth),
  Apple-Health-Import (HealthKit), Widget, Erinnerungen (APNs),
  Offline-Betrieb mit nativer Speicherung.
- Demo-Zugang (E-Mail/Passwort) mit Beispieldaten.
- Hinweis: keine Diagnosen, keine Trainingsfreigabe; HRV nur gegen die
  eigene Bandbreite.
- Hinweis: kein nachgeladener Code; alle Inhalte liegen im Paket.
- Wo die Kontolöschung in der App zu finden ist.

1. Apple-Prüfung: meist 1–3 Tage. Häufigste Ablehnungsgründe für diese Art
   App: «nur eine Website in einer Hülle» (4.2 — hier entkräftet durch
   Offline-Betrieb, Bluetooth, HealthKit, Push), fehlende Kontolöschung,
   Abrechnung am Store vorbei, unklare Gesundheitsaussagen.
2. Google-Prüfung: einige Tage; Health-Connect-Deklaration separat.
3. Mit einer Ablehnungsrunde rechnen.

### Phase 8 — Betrieb (laufend, ~1–2 Tage im Monat)

- Jede Web-Änderung → `cap sync` → neue Store-Version. **Live Updates**
  (Capgo, Appflow) erst erwägen, wenn die App stabil im Store ist — und nur
  für Korrekturen ohne neue Funktion (Richtlinie 2.5.2).
- Jährlich: Apple-Mitgliedschaft, neue iOS/Android-Versionen, ⚠︎ Googles
  Pflicht-Ziel-API-Level (jährlich angehoben).
- Automatisierung mit **Fastlane** oder **Codemagic** (Signieren,
  Hochladen, Screenshots).

---

## 4. Zeit und Kosten zusammengefasst

### Aufwand (Entwicklung)

| Phase | Tage |
|---|---|
| 1 Hülle, erster Lauf | 2–3 |
| 2 WebView-Anpassungen (Speicher, Links, Push, Export, Kamera) | 5–8 |
| 3 Bluetooth nativ, Apple Health / Health Connect, Widget | 6–9 |
| 4 Abrechnung (Weg A) | 5–7 |
| 5 Store-Auftritt | 3–5 |
| 6–7 Testen, Einreichen, Nachbessern | 3–5 |
| **Summe** | **≈ 24–37 Entwicklertage** |

### Kalenderzeit

**≈ 6–10 Wochen** vom Start bis zu beiden Stores, weil Wartezeiten
(D-U-N-S, Google-Testphase, Health-Connect-Freigabe, Store-Prüfungen)
parallel zur Entwicklung laufen, aber nicht beschleunigt werden können.

Schnellster sinnvoller Weg: **Abrechnung Weg C** (keine Käufe in der App)
im ersten Release, native Funktionen aus Phase 3 aber **dabei** →
≈ 18–25 Entwicklertage, **≈ 5–7 Wochen** Kalender; Store-Abos als 1.1.
Ohne Phase 3 zu starten spart Zeit, macht eine Ablehnung nach 4.2 aber
wahrscheinlich.

### Kosten (ohne Arbeitszeit)

| Posten | Einmalig | Laufend |
|---|---|---|
| Apple Developer Program | — | 99 USD/Jahr |
| Google Play Console | 25 USD | — |
| Testgeräte (gebraucht) + Brustgurt | ~500 € | — |
| Mac (falls keiner da) | ~700 € | oder Cloud-Build ~0–50 €/Monat |
| RevenueCat | — | 0 € bis 2 500 USD Umsatz/Monat, dann ~1 % |
| Store-Provision | — | 15 % der In-App-Umsätze |
| Anwaltliche Prüfung Datenschutz/AGB für Stores | 500–1 500 € (Schätzung) | — |

---

## 5. Was ich (Claude) übernehmen kann und was nur du kannst

| Ich | Nur du |
|---|---|
| Capacitor einbauen, Plugins, native Speicherung, Bluetooth-Brücke, Health-Import, Push-Erweiterung, Abrechnungs-Webhook, Prüffälle, Screenshots, Store-Texte in 8 Sprachen, Fastlane/Codemagic-Konfiguration | Konten anlegen und bezahlen, D-U-N-S, Identitätsprüfungen, Verträge (Apple Paid Apps, Google Payments), Steuer/Bank, Signierzertifikate erzeugen und sicher aufbewahren, Tester einladen, auf Geräten testen, Store-Einreichung auslösen, Preisentscheidung, anwaltliche Freigabe |

---

## 6. Offene Entscheidungen vor dem Start

1. **Firmen- oder Privatkonto?** (Empfehlung: Firma.)
2. **Abrechnung A, B oder C** für die erste Version? (Empfehlung: C für den
   ersten Release, dann A.)
3. **Store-Preise** gleich wie im Web oder angepasst?
4. ~~Health-Import erst in 1.1~~ — entschieden: Brustgurt, HealthKit und Widget in die erste Version (Richtlinie 4.2).
5. **Mac** vorhanden, oder Cloud-Build?

---

## 7. Ohne Mac entwickeln (Windows)

Xcode läuft **nur auf macOS**; auf Windows gibt es kein offizielles Apple-
Werkzeug zum Bauen oder Signieren. Wege:

| Weg | Kosten | Eignung |
|---|---|---|
| **Cloud-Build** (Codemagic, GitHub Actions mit macOS-Runner) | Freikontingent, dann nutzungsabhängig | **Empfohlen.** Baut, signiert und lädt direkt zu TestFlight hoch. Du arbeitest auf Windows, getestet wird auf dem iPhone über TestFlight. |
| **Mac in der Cloud** (MacinCloud, AWS EC2 Mac) | ab ~30 €/Monat bzw. stundenweise | Für die Stellen, an denen man Xcode wirklich öffnen muss (Signing einrichten, Widget, Fehlersuche). |
| **Gebrauchter Mac mini** (M1/M2) | ~400–700 € einmalig | Am bequemsten auf Dauer. |
| macOS in einer VM auf Windows | — | **Nicht empfohlen**: verstösst gegen Apples Lizenz, instabil, Apple-Konto kann gesperrt werden. |

Unabhängig davon funktionieren im Browser unter Windows: App Store Connect
(Einträge, Screenshots, Preise, TestFlight-Tester, Einreichung), das
Apple-Developer-Portal und die ganze Google-Seite (Android Studio läuft auf
Windows).

---

## 8. Links (Stand 26.09.2026 — vor Nutzung prüfen)

**Apple**
- Apple Developer Program, Anmeldung: https://developer.apple.com/programs/enroll/
- D-U-N-S-Nummer prüfen/beantragen: https://developer.apple.com/enroll/duns-lookup/
- App Store Connect: https://appstoreconnect.apple.com
- Xcode (nur macOS): https://developer.apple.com/xcode/
- TestFlight: https://developer.apple.com/testflight/
- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Small Business Program (15 %): https://developer.apple.com/app-store/small-business-program/
- HealthKit: https://developer.apple.com/documentation/healthkit
- WidgetKit: https://developer.apple.com/documentation/widgetkit

**Google**
- Play Console, Registrierung: https://play.google.com/console/signup
- Android Studio (Windows, macOS, Linux): https://developer.android.com/studio
- Richtlinien für Entwickler: https://play.google.com/about/developer-content-policy/
- Health Connect: https://developer.android.com/health-and-fitness/guides/health-connect
- Firebase (Push über FCM): https://console.firebase.google.com

**Werkzeuge**
- Capacitor: https://capacitorjs.com/docs
- Plugin Apple Health / Health Connect: https://github.com/Cap-go/capacitor-health
- Plugin Bluetooth LE: https://github.com/capacitor-community/bluetooth-le
- RevenueCat (Abos): https://www.revenuecat.com
- Codemagic (Cloud-Build): https://codemagic.io
- GitHub Actions, macOS-Runner: https://docs.github.com/actions/using-github-hosted-runners/about-github-hosted-runners
- MacinCloud: https://www.macincloud.com
- Node.js: https://nodejs.org · Git: https://git-scm.com · VS Code: https://code.visualstudio.com

---

## 9. Für Solo-Betrieb ohne Programmierkenntnisse

Gilt, wenn eine Person ohne eigenes Codeverständnis das Projekt allein über
KI-Werkzeuge steuert (Stand dieses Betriebs: Claude Code als Hauptwerkzeug).
Die Zeitangaben in Abschnitt 4 gehen von einer Person aus, die Code selbst
lesen und Fehler einordnen kann. Ohne das verschiebt sich die Rechnung.

### Was sich ändert, und warum

| Grund | Auswirkung |
|---|---|
| **Testen auf echten Geräten kann nur ein Mensch.** Ob der Brustgurt wirklich verbindet, ob HealthKit die richtigen Werte liefert, ob ein Update nach `cap sync` noch läuft — das bestätigt niemand außer dir, am Gerät. | Jede Testrunde kostet deine Zeit, nicht nur Rechenzeit. |
| **Store-Rückfragen brauchen eine Antwort, die du einreichst.** Wenn ein Prüfer schreibt «wofür der Standortzugriff?», entwerfe ich die Antwort, du reichst sie ein und trägst die Verantwortung dafür. | Wartezeit + Rückfragen wiederholen sich oft. |
| **Mehrere KI-Werkzeuge parallel (Claude Code, Gemini, Kimi K3 o. ä.) sind ohne Codeprüfung ein Risiko, kein Vorteil.** Verschiedene Modelle treffen verschiedene Architekturentscheidungen; bearbeiten zwei Systeme dieselbe Datei, entstehen Widersprüche, die nur jemand mit Codeverständnis sauber zusammenführt. | **Empfehlung: ein Werkzeug führt** (hier: Claude Code, weil der gesamte Kontext — Architekturregeln, `CLAUDE.md`, 1165 Prüffälle — schon hier sitzt). Die anderen höchstens für Recherche oder eine zweite Meinung, nie für dieselbe Datei. |
| **Betrieb danach ist keine einmalige Sache.** Sicherheitsupdates, ein abgelaufenes Zertifikat, eine neue Store-Angabe, ein iOS-Update mit anderem Verhalten. | Laufend ca. 1–2 Stunden im Monat einplanen, nicht null. |

### Realistische Zeit, mit gleichzeitigem Server-Umzug

| Block | Aufwand als Entwicklertage (Abschnitt 4) | Realistische Kalenderzeit im Solo-Betrieb |
|---|---|---|
| Server-Umzug weg von Netlify/Supabase | ca. 4–9 Tage | **3–5 Wochen** — jeder Schritt (Anmeldung, Zahlung, Sync) will nach der Umstellung von Hand bestätigt werden, und ein Fehler hier betrifft sofort alle Nutzer |
| Capacitor-Hülle + native Funktionen (Phasen 1–3) | ca. 12–18 Tage | **8–14 Wochen** — jeder Baustein braucht eine Bestätigung auf echten Geräten, dazu Wartezeiten (D-U-N-S, Apple-Konto, Google-Testphase) |
| Abrechnung, Store-Auftritt, Testen (Phasen 4–6) | ca. 8–14 Tage | **4–6 Wochen** |
| Einreichen, Ablehnungsrunden (Phase 7) | ca. 3–5 Tage | **2–4 Wochen**, realistisch mit mindestens einer Ablehnungsrunde |
| **Gesamt bis beide Apps live sind** | ≈ 27–46 Tage | **≈ 4–6 Monate** neben anderer Arbeit, **≈ 2–3 Monate** mit KYDON als Hauptfokus |

Das liegt deutlich über den 6–10 Wochen aus Abschnitt 4. Der Unterschied ist
nicht die Technik, sondern die Zeit für Testen, Rückmeldungen verstehen und
Entscheiden.

**Empfohlene Reihenfolge:** Server-Umzug zuerst abschließen und mindestens
1–2 Wochen störungsfrei laufen lassen, bevor der native Umbau beginnt. Zwei
große Baustellen gleichzeitig sind im Solo-Betrieb ohne Codeverständnis das
größte Risiko: geht dabei etwas schief, ist die Fehlersuche am schwersten
genau dann, wenn zwei Systeme gleichzeitig in Bewegung sind.

### Test-Protokoll für jede grössere Änderung

Eine feste Liste statt Code lesen zu müssen. Nach jedem `cap sync` und vor
jeder Store-Einreichung einmal durchgehen, auf einem echten iPhone UND
einem echten Android-Gerät:

**Grundfunktion**
1. App kalt starten (vorher vollständig beenden) — lädt sie ohne Fehler?
2. Ohne Internet einen Test messen und speichern — funktioniert es offline?
3. App beenden, neu starten — ist der Messwert noch da?
4. Auf «Speicher freigeben» / App-Neuinstallation-Tricks des Systems
   verzichten, aber Gerät einmal neu starten — App und Daten noch da?

**Anmeldung**
5. Neues Konto anlegen — kommt die Bestätigungs-Mail, öffnet der Link die App?
6. Passwort vergessen — kommt die Mail, öffnet der Link die App?
7. Abmelden, wieder anmelden — sind die Daten wieder da?

**Brustgurt / HRV**
8. Gurt anlegen, in der App verbinden — verbindet er sich?
9. Zwei Minuten messen — kommt ein plausibler Wert (RMSSD, Ruhepuls)?
10. Gurt während der Messung abnehmen — bricht die App sauber ab, statt
    einzufrieren oder abzustürzen?

**Apple Health / Health Connect** (nur wenn in dieser Version enthalten)
11. Erlaubnis erteilen — fragt die App die richtigen Kategorien ab?
12. Ein Wert aus Health (z. B. Ruhepuls) erscheint in KYDON?

**Erinnerungen / Widget**
13. Eine Erinnerung auslösen (Testtermin anlegen) — kommt die
    Benachrichtigung?
14. Widget auf den Homescreen legen — zeigt es einen sinnvollen Stand?

**Käufe** (falls in dieser Version enthalten)
15. Ein Abo kaufen (Sandbox/Testkonto von Apple bzw. Google) — schaltet die
    richtige Stufe frei?
16. Abo im System kündigen — verhält sich die App danach richtig (kein
    Absturz, korrekte Anzeige)?

**Konto**
17. Konto in der App löschen — verschwinden Zugriff und Daten wirklich?

**Sprachen**
18. Gerätesprache auf zwei andere Sprachen stellen (z. B. Englisch,
    Französisch) — sind Kernbildschirme vollständig übersetzt?

Jeder Punkt, der scheitert, wird so beschrieben, wie es aussieht («bleibt
bei ‹Wird verbunden› stehen», «Absturz nach dem Antippen von X») — das
genügt, um es einzugrenzen; Codekenntnisse sind dafür nicht nötig.

### Laufender Betrieb, minimaler aber nötiger Aufwand

- **Uptime-Monitor** (z. B. UptimeRobot, kostenlos) auf die eigene
  Serveradresse einrichten — meldet per Mail, wenn der Server nicht
  erreichbar ist, ohne dass du selbst nachsehen musst.
- **Backups** automatisch UND regelmäßig geprüft: einmal im Monat wirklich
  eine Wiederherstellung testen, nicht nur annehmen, dass die Sicherung lief.
- **Store-Postfächer** (Apple, Google) auf Benachrichtigungen prüfen —
  beide melden sich bei neuen Anforderungen, abgelaufenen Zertifikaten oder
  Richtlinienänderungen häufig nur per Mail.
- **Ein Werkzeug, eine Historie:** Änderungen an der App über dieselbe
  Codebasis und denselben Chat-Verlauf laufen lassen, statt zwischen
  Werkzeugen zu wechseln — sonst geht der Zusammenhang («warum wurde das so
  gebaut») verloren, den auch die KI braucht, um sicher weiterzuarbeiten.

