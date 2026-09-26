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

### Phase 3 — Brustgurt und Gesundheitsdaten nativ (4–6 Tage)

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
3. Einwilligung für Gesundheitsdaten je Datenart (existiert für die
   Brustgurt-Messung, erweitern).

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

1. Apple-Prüfung: meist 1–3 Tage. Häufigste Ablehnungsgründe für diese Art
   App: «nur eine Website in einer Hülle» (4.2 — hier entkräftet durch
   Offline-Betrieb, Bluetooth, HealthKit, Push), fehlende Kontolöschung,
   Abrechnung am Store vorbei, unklare Gesundheitsaussagen.
2. Google-Prüfung: einige Tage; Health-Connect-Deklaration separat.
3. Mit einer Ablehnungsrunde rechnen.

### Phase 8 — Betrieb (laufend, ~1–2 Tage im Monat)

- Jede Web-Änderung → `cap sync` → neue Store-Version (oder
  **Capgo/Appflow Live Updates** für reine Web-Änderungen, im Rahmen der
  Store-Regeln).
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
| 3 Bluetooth nativ, Apple Health / Health Connect | 4–6 |
| 4 Abrechnung (Weg A) | 5–7 |
| 5 Store-Auftritt | 3–5 |
| 6–7 Testen, Einreichen, Nachbessern | 3–5 |
| **Summe** | **≈ 22–34 Entwicklertage** |

### Kalenderzeit

**≈ 6–10 Wochen** vom Start bis zu beiden Stores, weil Wartezeiten
(D-U-N-S, Google-Testphase, Health-Connect-Freigabe, Store-Prüfungen)
parallel zur Entwicklung laufen, aber nicht beschleunigt werden können.

Schnellster sinnvoller Weg: **Abrechnung Weg C** und **ohne Health-Import**
im ersten Release → ≈ 12–18 Entwicklertage, **≈ 4–6 Wochen** Kalender;
HealthKit/Health Connect und Store-Abos als Version 1.1.

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
4. **Health-Import** im ersten Release oder in 1.1? (Empfehlung: 1.1.)
5. **Mac** vorhanden, oder Cloud-Build?
