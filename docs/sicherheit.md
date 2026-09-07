# Sicherheit

Diese Datei beantwortet die *Security Master Checkliste für KI-/Vibe-Coded
Apps* für BASELINE. Sie ist kein Werbetext: wo etwas offen ist, steht es
offen da, mit Grund und mit dem, was stattdessen gilt.

**Stand:** 7. September 2026 · Fassung 0.1.0 · geprüft an Zweig
`claude/sports-diagnostics-pwa-jnqy42`

---

## Wovon wir ausgehen

Zwei Sätze, aus denen sich fast alles andere ergibt:

1. **BASELINE läuft ohne Konto vollständig.** Der Normalfall ist eine App,
   die alle Daten auf dem Gerät hält und mit niemandem spricht. Ein Konto ist
   ein Zusatz für Abgleich und Trainerbetrieb. Das verkleinert die
   Angriffsfläche drastisch — es gibt für die meisten Nutzer keinen Server,
   den man angreifen könnte.
2. **Wo es doch einen Server gibt, ist er Supabase (PostgreSQL + PostgREST).**
   Es gibt keine eigene API-Schicht. Damit ist die **Row Level Security die
   Autorisierung** — nicht ein Teil davon, sondern die ganze. Jede Lücke dort
   ist unmittelbar ein Zugriff auf fremde Daten.

Punkt 2 ist der Grund, warum der Schwerpunkt dieser Arbeit auf den
Zugriffsregeln liegt und nicht auf Eingabevalidierung im Browser.

---

## Auditbericht

Vier Befunde, alle geschlossen. Format nach Abschnitt 24 der Checkliste.

### B-01 — Zugriff auf beliebige fremde Athleten

| | |
|---|---|
| **Schwachstelle** | Broken Object Level Authorization (IDOR/BOLA) + Privilege Escalation |
| **Severity** | **CRITICAL** |
| **Komponente** | `supabase/migrations/20260829120600_rls.sql`, Policy `links_insert_as_coach` |
| **Endpoint** | `POST /rest/v1/coach_athlete_links` |

**Angriffsszenario.** Die Regel lautete
`with check (coach_id = auth.uid() and public.is_coach())`. Sie prüfte, *wer*
schreibt, aber nicht, *über wen*. `athlete_id` war frei wählbar, `status`
steht per Vorgabe auf `active`, `can_edit` auf `true`. Ein beliebiger
angemeldeter Nutzer setzt also in seinem eigenen Profil `is_coach = true` —
das darf er, Trainer ist in diesem Produkt eine Selbstauskunft — und schickt
dann eine einzige Zeile `(coach_id = ich, athlete_id = fremd)`. Ab diesem
Moment liefert `can_view_athlete()` und `can_edit_athlete()` für ihn `true`.

**Auswirkung.** Vollständiger Lese- **und Schreibzugriff** auf die gesamte
Historie dieses Athleten: Messwerte, Biometrie (Gewicht, Ruhepuls,
Körperfett), Notizen, Berichte. Bei Minderjährigen sind das besonders
schutzbedürftige Daten. Schreibzugriff heisst zusätzlich: stille Verfälschung
einer Messreihe, die als diagnostische Grundlage dient.

Der einzige Schutz war, dass `athlete_id` eine UUID ist. Eine Objekt-Kennung
ist kein Berechtigungsnachweis (Checkliste 2) — sie steht in Exportdateien,
in Übergabelinks und in Berichtspfaden.

**Fix.** `20260907120000_harden_coach_links.sql`: Ein Trainer darf eine
Verknüpfung nur noch **anfragen** (`status = 'pending'`) und nur zu einem
Athleten, den er selbst angelegt hat oder für den eine gültige, nicht
eingelöste Einladung vorliegt.

**Regression Test.** `tests/security.spec.ts` →
«keine Schreibregel ohne Prüfung der neuen Zeile».

**Verbleibendes Risiko.** Die statische Prüfung liest die Regel, nicht ihre
Wirkung. Der Nachweis am lebenden System steht aus, siehe *Restrisiken*.

---

### B-02 — Umhängen einer bestehenden Verknüpfung

| | |
|---|---|
| **Schwachstelle** | UPDATE-Policy ohne `WITH CHECK` |
| **Severity** | **CRITICAL** |
| **Komponente** | Policy `links_update_involved` |
| **Endpoint** | `PATCH /rest/v1/coach_athlete_links` |

**Angriffsszenario.** Fehlt `WITH CHECK`, prüft PostgreSQL die neue Zeile mit
dem `USING`-Ausdruck — und der meint die alte. `coach_id = auth.uid()` gilt
für die neue Zeile weiterhin, wenn man ausschliesslich `athlete_id` auf einen
Fremden dreht. Ein Trainer mit genau einem legitimen Klienten konnte diese
eine Verknüpfung auf jeden beliebigen Athleten umhängen.

**Auswirkung.** Wie B-01, aber ohne dass überhaupt eine neue Zeile nötig war.

**Fix.** `WITH CHECK` ergänzt. Zusätzlich der Trigger
`guard_coach_link_update()`: `coach_id` und `athlete_id` sind unveränderlich,
und **nur die Athletenseite** darf eine Verknüpfung aktivieren oder
Schreibrecht erteilen. Ein Trigger, weil `USING` die alte und `WITH CHECK` die
neue Zeile sieht — die Frage «ist dieser Übergang erlaubt?» braucht beide.

**Regression Test.** wie B-01, zusätzlich der Selbsttest «die Prüfung erkennt
eine fehlende WITH-CHECK-Klausel überhaupt».

---

### B-03 — Profilbilder öffentlich abrufbar

| | |
|---|---|
| **Schwachstelle** | Sensitive Information Disclosure |
| **Severity** | **MEDIUM** |
| **Komponente** | `20260829120700_storage.sql`, Bucket `avatars` |

**Angriffsszenario.** Der Bucket stand auf `public`, die Policy
`avatars_public_read` galt `to public` — also ohne Anmeldung. Die
Pfadkonvention ist `avatars/{user_id}.<ext>`. Wer eine Nutzerkennung kennt
(sie steht in geteilten Artefakten), lädt das Gesichtsbild ohne Konto.

**Auswirkung.** Kein Zugriff auf Messdaten, aber ein personenbezogenes Datum
ausserhalb jeder Zugriffskontrolle. Widerspricht der Datenminimierung
(Checkliste 15).

**Fix.** Bucket auf `public = false`. Neue Policy `avatars_read_permitted`
über `can_view_user_avatar()`: der Eigentümer, die eigenen Trainer, die
eigenen Athleten. Beide Blickrichtungen ausdrücklich — sie sind nicht
dasselbe. Ausgeliefert wird über signierte, kurzlebige Links.

**Regression Test.** `auditPolicies.mjs` Regel `no-anon-role` — sie schlägt
bei jeder Policy an, die `to public` oder `to anon` gilt.

---

### B-04 — Policy-Ausdruck kann die Abfrage abbrechen

| | |
|---|---|
| **Schwachstelle** | Fehlerbehandlung in Sicherheitsprüfung |
| **Severity** | **LOW** |
| **Komponente** | Storage-Policies, `split_part(name, '/', 1)::uuid` |

**Angriffsszenario.** Ein Objektname ohne gültige Kennung im ersten
Pfadsegment lässt den Cast fehlschlagen. Ein Fehler in einem Policy-Ausdruck
bricht die ganze Abfrage ab, statt `false` zu liefern — Denial of Service auf
den eigenen Berichtsordner, ausgelöst durch eine einzige falsch benannte
Datei.

**Fix.** `public.safe_uuid()` liefert bei ungültiger Eingabe `NULL`, und
`NULL` heisst hier: nein.

---

## Die Checkliste, Abschnitt für Abschnitt

Legende: **✓** erfüllt · **–** nicht zutreffend, mit Grund · **offen** noch
zu tun.

### 1 Grundprinzipien — ✓
Frontend ist keine Sicherheitsgrenze; die Autorisierung liegt vollständig in
der RLS. Kein Geheimnis im Bundle ausser dem publizierbaren Schlüssel, der
öffentlich sein *darf* (`tests/security.spec.ts`). Getrennte Umgebungen,
`.env.local` nicht versioniert.
*Einschränkung:* Es gibt derzeit **nur ein Supabase-Projekt**. Produktion und
Entwicklung sind damit nicht getrennt — siehe *Restrisiken*.

### 2 Zugriff auf fremde Nutzerdaten — ✓ (nach B-01/B-02)
Jede Anfrage geht durch RLS; ohne Sitzung gibt es keine Rolle `authenticated`
und damit keine Zeile. Ressourcenbesitz wird serverseitig über
`can_view_athlete()` / `can_edit_athlete()` geprüft, und diese Funktionen
kennen genau zwei Wege: `athletes.user_id` oder eine aktive Verknüpfung.
Objekt-Kennungen gelten nirgends als Nachweis.

### 3 Rollen und Berechtigungen — ✓, mit einer bewussten Entscheidung
Rollen stehen serverseitig in `profiles.is_coach`. **`is_coach` ist eine
Selbstauskunft** — jeder darf sich zum Trainer erklären. Das ist gewollt: der
Trainerbetrieb ist ein Produktmodus, kein Vertrauensrang. Entscheidend ist,
dass diese Selbstauskunft **keinerlei Zugriff auf Fremde** verschafft; genau
das war B-01, und genau das ist geschlossen. Bezahlschranken (`coach_pro`)
hängen an `entitlements`, und diese Tabelle ist für Endnutzer **nur lesbar** —
geschrieben wird ausschliesslich vom Zahlungs-Webhook mit `service_role`.

### 4 Authentifizierung & Passwörter — ✓ (durch Supabase GoTrue)
Hashing, Salts, Reset-Tokens und Ratenbegrenzung liegen beim Dienst. Die App
legt eine **strengere** Mindestlänge fest als der Dienst (8 statt 6,
`MIN_PASSWORD_LENGTH`). Das Passwort verlässt das Eingabefeld nur Richtung
Dienst; es landet nie im lokalen Speicher.
**offen:** MFA für Trainerkonten ist nicht eingerichtet. Begründung: es gibt
noch keine Konten mit erhöhten Rechten — «Trainer» ist Selbstauskunft. Sobald
es eine Betreiberrolle gibt, wird MFA für sie zur Voraussetzung.

### 5 Sessions & Tokens — ✓
Ablauf, Rotation und Widerruf liegen bei GoTrue. `signOut()` läuft im
Vorgabebereich *global*, beendet also die Sitzung auch beim Dienst, nicht nur
die lokale Marke. Neu: **«Abmelden und Gerät leeren»** für geteilte Geräte.

### 6 Datenbank-Sicherheit — ✓
Keine offenen Ports (verwalteter Dienst). Kein Superuser im Anwendungspfad —
das Frontend spricht ausschliesslich als `anon`/`authenticated` über
PostgREST. Kein SQL aus Nutzereingaben: die Bibliothek erzeugt parametrisierte
Anfragen, es gibt keine Stelle, an der die App eine Abfrage zusammensetzt.
Fremdschlüssel und `CHECK`-Bedingungen sind gesetzt (Gewicht, Herzfrequenz,
Dokumentgrösse). RLS auf allen 18 Tabellen. Sicherungen macht der Dienst.
**offen:** Eine Wiederherstellung wurde noch nie geprobt.

### 7 Secrets & Schlüssel — ✓
`scripts/scanSecrets.mjs` prüft Quelltext **und** gebautes Paket, im
Sicherheitstor nach dem Bau. Der einzige Treffer auf `sb_secret_` im Bundle
ist die Supabase-Bibliothek, die selbst prüft, ob ihr jemand versehentlich
einen Dienstschlüssel übergeben hat — die Regel verlangt darum einen echten
Schlüsselkörper, sonst wäre der Fehlalarm dauerhaft und niemand schaute mehr
hin.

### 8 API Security — teils *nicht zutreffend*
Es gibt keine eigene API. Authentifizierung, Autorisierung und Zeilenfilter
macht PostgREST anhand der RLS. Ratenbegrenzung, Zeitlimits und
Anfragegrössen liegen beim Dienst und sind **nicht** von uns konfiguriert —
siehe *Restrisiken*. Es gibt keine Debug- oder Testendpunkte.

### 9 Input Validation & Injection — ✓
Alles, was in den Bestand geht, läuft durch ein **Zod-Schema mit versionierten
Migrationen** (`src/lib/store/schema.ts`, Fassung 19) — auch Importe aus CSV
und übernommene Dateien. Auf der Serverseite begrenzen `CHECK`-Bedingungen
Längen und Wertebereiche, inklusive einer Grössengrenze von 8 MB je Dokument.
Pfadangriffe und Command Injection sind mangels Dateisystem und Shell nicht
anwendbar; SSRF ebenso, weil die App keine vom Nutzer angegebenen URLs abruft.

### 10 XSS, CSRF & Browser — ✓
Kein `dangerouslySetInnerHTML`, kein `innerHTML`, kein `eval` — als Prüffall
festgehalten, nicht nur als Behauptung. CSRF ist strukturell nicht anwendbar:
die Authentifizierung läuft über einen `Authorization`-Header, nicht über
Cookies, und ein Header wird bei einer fremd ausgelösten Anfrage nicht
mitgeschickt. Clickjacking-Schutz über `X-Frame-Options: DENY` **und**
`frame-ancestors 'none'`.

### 11 HTTPS & Security Headers — ✓
`public/_headers` (gilt auch beim manuellen Hochladen, anders als
`netlify.toml`): HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
COOP, CORP und eine CSP ohne `unsafe-eval`, ohne `unsafe-inline` bei
Skripten und mit **genau einer** fremden Herkunft in `connect-src` — kein
Platzhalter über `*.supabase.co`, denn der erlaubte jedes fremde Projekt.
CORS ist Sache des Dienstes und nicht auf `*` gestellt.

### 12 File Uploads — ✓ (soweit vorhanden)
Buckets begrenzen Grösse und erlaubte MIME-Typen serverseitig
(Berichte 25 MB, nur PDF; Logos 2 MB). Pfade sind konventioniert und werden
in der Policy geprüft, nicht vom Client bestimmt.
**Anmerkung:** `image/svg+xml` ist im Branding-Bucket erlaubt. SVG kann
Skripte tragen. Das ist tragbar, weil der Bucket nicht öffentlich ist und die
CSP `object-src 'none'` setzt — aber es ist eine Stelle, die man bei einer
Erweiterung im Auge behalten muss.

### 13 Fehlerbehandlung — ✓
Fehler des Dienstes werden in eigene **Kennungen** übersetzt
(`invalid_credentials`, `offline`, …), nie als Fremdtext angezeigt. Kein
Stacktrace, kein SQL-Fehler, kein Pfad erreicht die Oberfläche. Was nicht
erkannt wird, ist `unknown` — ein falsch einsortierter Fehler wäre schlimmer
als ein unspezifischer. Keine Quellkarten im Paket.

### 14 Logging & Monitoring — **offen**
Es gibt keine eigene Protokollierung. Anmeldungen und Fehlversuche
protokolliert Supabase; niemand wertet sie aus, es gibt keine Alarme. Das ist
für den heutigen Stand vertretbar (kein Wirkbetrieb) und **nicht** für den
Start. Positiv: die App protokolliert auch nichts Sensibles, weil sie gar
nicht protokolliert.

### 15 Datenschutz & Nutzerdaten — ✓, mit einer offenen Stelle
Datenminimierung ist die Grundeinstellung: ohne Konto verlässt nichts das
Gerät. Der Export ist immer vollständig und kostenlos (§32). Löschen des
lokalen Bestands geht sofort und vollständig (neu: auch beim Abmelden).
**offen:** Das **Löschen des Kontos** braucht den Dienstschlüssel und geht
darum nicht aus dem Browser. Der Code sagt das ausdrücklich
(`ACCOUNT_DELETION_NEEDS_SERVER`), statt einen Knopf anzubieten, der nichts
tut; bis dahin führt der Weg über eine Mitteilung an den Betreiber. Für den
Start muss daraus eine serverseitige Funktion werden — Art. 17 DSGVO ist
keine Absichtserklärung. Aufbewahrungsfristen sind nicht definiert.

### 16 Dependencies & Supply Chain — ✓
`npm ci` gegen die Sperrdatei, `npm audit --audit-level=high` im Tor,
wöchentlich auch ohne Commit (Lücken entstehen ohne Zutun). Stand heute:
**0 Schwachstellen**. Geheimnis-Scan bei jedem Lauf. Ein externes SAST ist
nicht eingerichtet; die Typprüfung und die Regelprüfung decken die
Fehlerklassen ab, die hier tatsächlich vorkommen.

### 17 CI/CD Security Gate — ✓
`.github/workflows/security-gate.yml`, von billig nach teuer geordnet:
Typprüfung → Sprachdateien → Zugriffsregeln → `npm audit` → Bau →
Geheimnis-Scan → Tests. Bricht ab, statt zu warnen.
**Ehrlich dazu:** Es gibt **kein automatisches Deployment**. Das Paket geht
von Hand zu Netlify. Dieses Tor entscheidet also nicht *über* die
Auslieferung, es sagt, ob das Paket eines sein darf. Wer ohne grünen Lauf
hochlädt, umgeht kein System, sondern eine Zusage.
**offen:** Branch Protection ist nicht eingerichtet.

### 18 Browser-Konsole / DevTools — ✓
Es gibt nichts zu finden: keine Geheimnisse im JavaScript, keine sensiblen
Daten im ausgelieferten HTML (die Seite ist leer und wird erst im Browser
gefüllt), keine versteckten Adminfunktionen. Der lokale Speicher enthält die
eigenen Daten des Nutzers — auf seinem Gerät, für ihn. Das Backend weist
manipulierte Anfragen ab, weil die RLS nicht fragt, was der Client behauptet,
sondern wer die Sitzung führt.

### 19 PWA / Offline-Sicherheit — ✓ (nach dieser Arbeit)
Der Service Worker legt **nur das Programm** im Cache ab (`js`, `css`, `html`,
Bilder, Schriften) — keine Antworten des Dienstes, also keine
personenbezogenen Daten. Die eigenen Daten liegen in `localStorage` und, als
Zweitschrift gegen Browser-Räumung, in IndexedDB.
Bis heute behielt das Abmelden beides. Das ist auf einem persönlichen Gerät
richtig (§32) und auf einem geteilten falsch. Jetzt gibt es **beide Wege**,
mit Rückfrage vor dem endgültigen. Offline umgeht nichts: ohne Verbindung
gibt es keinen Serverzugriff, den man umgehen könnte.

### 20 Falls die App selbst KI verwendet — *nicht zutreffend*
BASELINE ruft **kein** Sprachmodell auf, weder im Browser noch serverseitig.
Es gibt keine Prompts, keine Werkzeugaufrufe, keine Handlungsvollmacht.
Das ist eine bewusste Produktentscheidung und keine Auslassung: die App gibt
diagnostische Aussagen aus Messwerten und Referenzen, und dafür wäre ein
Sprachmodell die falsche Quelle.

### 21 Vibe-Coding-Regeln — ✓
Als Arbeitsregeln in `CLAUDE.md` und in dieser Datei verankert. Der
inhaltlich wichtigste Fall aus diesem Durchgang: Die Regeln wurden **enger**
gemacht, obwohl der lockere Zustand funktionierte — der Preis dafür ist
null, weil die App an dieser Stelle ohnehin nichts schreibt.

### 22 Security Testing — teils ✓, teils **offen**
Automatisiert und im Tor: Regelprüfung, Geheimnis-Scan, Abhängigkeiten,
XSS-Flächen, Header, Löschen auf geteilten Geräten (22 Fälle in
`tests/security.spec.ts`).
**offen:** Die negativen Autorisierungstests am lebenden System — Nutzer A
gegen Nutzer B, Trainer gegen fremden Athleten. Siehe *Restrisiken*, das ist
die wichtigste offene Position.

### 23 Release Gate
Nach heutigem Stand:

| Ausschlusskriterium | Stand |
|---|---|
| Kritische Lücken | keine bekannt (B-01/B-02 geschlossen) |
| Fremde Nutzerdaten erreichbar | nein |
| Authentication umgehbar | nein |
| Authorization umgehbar | nein, statisch geprüft |
| Adminfunktionen ungeschützt | es gibt keine |
| Secrets im Repository/Frontend | nein, automatisch geprüft |
| Kritische Dependencies | 0 Schwachstellen |
| Datenbank ungeschützt | nein, RLS auf allen Tabellen |
| Sicherheitstests rot | nein, 22/22 grün |

**Trotzdem kein Freigabe-Häkchen.** Die drei Punkte unter *Restrisiken* sind
vor dem öffentlichen Start abzuarbeiten — sie sind keine Nachbesserung.

---

## Restrisiken

Nach Dringlichkeit, nicht nach Aufwand.

1. **Die Autorisierung ist gelesen, nicht erprobt.** Die statische Prüfung
   fängt die Fehlerklasse, die man beim Schreiben von Policies macht. Sie
   beantwortet nicht, ob `can_edit_athlete()` in jedem Zustand das Richtige
   tut. Nötig: zwei echte Konten, ein Athlet je Konto, und der ausdrückliche
   Nachweis, dass A nichts von B sieht, in beide Richtungen und über jede
   Tabelle. Das braucht eine Testinstanz — und damit die Trennung von
   Produktion und Entwicklung, die es heute nicht gibt.

2. **Ein einziges Supabase-Projekt.** Produktion und Entwicklung teilen sich
   die Datenbank. Jede Migration wird am Wirkbestand ausprobiert, und ein
   Fehler dort ist ein Fehler an echten Daten. Das ist der Punkt, der die
   meisten anderen offenen Punkte blockiert.

3. **Kontolöschung geht nicht ohne Betreiber.** Aus dem Browser unmöglich
   (der Dienstschlüssel darf nicht dorthin, §41). Bis es eine serverseitige
   Funktion gibt, ist Art. 17 DSGVO ein manueller Vorgang. Für den Start zu
   wenig.

Dazu, kleiner: keine Protokollauswertung und keine Alarme (14); MFA für
Betreiberkonten, sobald es sie gibt (4); Ratenbegrenzung des Dienstes nicht
selbst konfiguriert (8); Wiederherstellung nie geprobt (6); Branch Protection
nicht eingerichtet (17); Aufbewahrungsfristen undefiniert (15).

---

## Was man selbst laufen lassen kann

```bash
npm run security          # Typprüfung + Regeln + Geheimnisse + Abhängigkeiten
npm run audit:policies    # nur die Zugriffsregeln
npm run audit:secrets     # nur die Suche nach Zugangsdaten
npx playwright test tests/security.spec.ts
```

Der Regel-Prüfer hat einen Selbsttest: nimmt man die Migration vom 07.09.
heraus, meldet er B-01 und B-03 wieder. Eine Prüfung, von der niemand weiss,
ob sie etwas findet, ist keine.

## Wenn eine neue Zugriffsregel dazukommt

1. Schreibt sie? Dann braucht sie `WITH CHECK`. Ohne Ausnahme — bei `UPDATE`
   nimmt PostgreSQL sonst den `USING`-Ausdruck, und der meint die alte Zeile.
2. Hängt die Entscheidung vom **Übergang** ab (alter *und* neuer Zustand)?
   Dann kann eine Policy es nicht, und es braucht einen Trigger.
3. `SECURITY DEFINER` immer mit `set search_path` und ohne `EXECUTE` für
   `anon`/`public` — sonst ist der Helfer ein Endpunkt ohne Anmeldung.
4. `node scripts/auditPolicies.mjs` laufen lassen. Meldet er nichts, heisst
   das: kein *bekanntes* Muster verletzt. Es heisst nicht, dass die Regel
   richtig ist.
