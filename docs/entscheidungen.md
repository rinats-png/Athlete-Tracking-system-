# Offene Entscheidungen zum Trainingsbereich

## Stand der Antworten (5. Oktober 2026, nach deiner Rückmeldung)

| Punkt | Entscheidung | Umgesetzt |
|---|---|---|
| A1 | Sammel-SQL-Datei | ja: `supabase/einspielen/offene_migrationen.sql` (`npm run sql:bundle`), Prüffall hält sie aktuell |
| A2 | niemand prüft zentral; der Trainer sendet, der Athlet antwortet | Hinweis: siehe «Kurztest» unten, 10 Minuten mit zwei Konten |
| B1 | Anwaltstermin kommt noch | offen, bei dir |
| B2 | Aufbewahrung so lassen (180 / 30 Tage) | nichts zu tun |
| B3 | Eltern müssen vor dem Start beim Trainer zustimmen (App oder Schriftstück); Puls unter 18 aus | ja: Bestätigung des Trainers vor dem Senden (Server verlangt sie), Puls unter 18 gesperrt, Hinweis beim Athleten, im AVV und in der Datenschutzerklärung |
| B4 | AVV-Zusatz «Freigabebasierte Datenverarbeitung» | ja: neuer Abschnitt 12 im AVV (de, en), Fassung `2026-10-05`; **Trainer müssen den AVV neu annehmen** |
| B5 | Push-Satz | ja: Satz in die Datenschutzerklärung (de, en) |
| B6 | Englisch als Rückfall | nichts zu tun |
| C3, C4, C5 | Festlegungen bestätigt, Vorschau bleibt in der Testphase an | nichts zu tun |
| C6 | Quellenliste mit DOI | ja: `docs/quellenpruefung.md`; Helgerud-DOI nach PubMed nachgetragen |
| D1, D2 | Taper (Kampfsport) und Rückkehr nach Pause, nur Struktur | ja: 5 neue Vorlagen (Grappling/Striking-Taper, Rückkehr für Grappling, Striking, Hybrid), alle Plätze offen |
| E1 | Muay Thai: ich schlage Anforderungshöhen vor, du bestätigst | **offen: Vorschlag unten, bitte bestätigen** |
| E2 | Judo und Kickboxen | beide gibt es im Katalog, nichts zu tun |
| F1, F2, F4 | Wetter, Check-in teilen, Strava bleiben aus | nichts zu tun, die Auslieferung setzt keinen dieser Schalter |
| F3 | **geändert:** Sprachmodell eingeschaltet, Inhaber kümmert sich um AVV, Region, Datenschutztext und Einrichten der Funktion | ja: `VITE_AI_PHRASE="on"` in `netlify.toml` |

### Hinweise zu deinen Antworten

- **Zu A2.** Gemeint war nur: wer probiert den Ablauf einmal mit zwei echten Konten aus (ein Trainer, ein Athlet), bevor Testpersonen ihn sehen, weil ich ihn nur mit nachgebildeten Antworten prüfen konnte. «Niemand» ist eine mögliche Antwort; der Kurztest unten kostet etwa zehn Minuten und fängt Fehler in der Migration ab, die kein automatischer Test findet. Auf deinem Telefon kann ich nichts ausprobieren; das müsstest du oder jemand anderes tun.
- **Ein Teil deiner Antworten (A2, B3, B5 ... F4)** las sich wie eine zweite Stimme, die mich in der Ich-Form anspricht («du bestätigst», «mein Formulierungsvorschlag»). Ich habe sie als deine Entscheidungen übernommen. Bei **B3** habe ich beides verbunden: deine Regel (Eltern stimmen beim Trainer zu) und die Pulssperre unter 18 aus der anderen Antwort. Wenn du die Pulssperre nicht willst, sag es, sie ist eine Zeile.
- **Beim AVV-Zusatz** habe ich deinen Text übernommen, die Überschriften der Unterabsätze getrennt und einen Absatz **«Minderjährige Athleten»** ergänzt (Zusicherung des Trainers, Bestätigung in der App, Pulssperre). Der englische Text ist meine Übersetzung. Beides gehört zum Anwaltstermin (B1).

### Kurztest mit zwei Konten (nach dem Einspielen der SQL-Datei)

1. Konto T (Trainer) und Konto A (Athlet) anlegen, verbinden (Einladung wie bisher).
2. T: Plan anlegen (eigener Plan, eine Einheit) → Block → «Plan an Athleten zuweisen», Athleten wählen, Bestätigung ankreuzen, senden. Erwartet: «Der Plan wurde gesendet».
3. A: `/plan` öffnen. Erwartet: Angebot sichtbar, alle drei Freigaben aus; Puls erst nach «erledigt» wählbar. Annehmen (ohne aktiven Block).
4. A: Einheit im Player erledigen. T: Zuweisungen → «Fortschritt». Erwartet: nur, was A freigegeben hat.
5. A: Freigabe im Block ausschalten. T: Fortschritt neu laden. Erwartet: ausgeschaltete Werte weg.
6. Wenn Push aktiv ist: A schaltet «Pläne von deinem Trainer» ein; T sendet ein zweites Angebot. Erwartet: eine allgemeine Meldung «Neuer Plan wartet» innerhalb von etwa zehn Minuten.
7. Athlet mit Geburtsdatum unter 18: Erwartet: Hinweis auf die Zustimmung der Eltern, Puls nicht wählbar.

### Muay Thai: Vorschlag zur Bestätigung (E1)

Muay Thai fehlt im Katalog. Vorschlag: gleiche Pilotfamilie und gleiche Testliste wie Kickboxen (Kick-Test 60 s, Schlag-Test 60 s, Sprint 30 m, CMJ, Shuttle 5-10-5, Ermüdungsparcours), mit **diesen Anforderungshöhen** (0 bis 1, nur Voreinstellung der App, keine Literatur):

| Fähigkeit | Kickboxen (vorhanden) | Muay Thai (Vorschlag) | Begründung des Vorschlags |
|---|---|---|---|
| Kraftausdauer | 1,0 | 1,0 | Runden mit hohem Schlag- und Tritt-Volumen |
| Schnellkraft | 0,8 | 0,9 | zusätzlich Knie, Ellbogen, Clinch |
| Ausdauer | 0,8 | 0,8 | fünf Runden wie Kickboxen |
| Agilität | 0,7 | 0,6 | weniger Ringbewegung, mehr Clinch |
| Relativkraft | 0,5 | 0,6 | Clinch und Kontrolle |

Das sind meine Annahmen ohne Quelle; die Fachperson aus C1 sollte sie ansehen. Bitte antworte: **E1: so übernehmen** oder die Zahlen ändern.

---

Stand: 5. Oktober 2026. Alles, was ich nicht allein festlegen darf oder kann. Jede Frage hat den Hintergrund, die Möglichkeiten, was daraus folgt und meine Empfehlung. Zum Beantworten genügt ein Kreuz oder ein Satz; Fragen mit «Fachperson» oder «Anwalt» brauchen vermutlich erst deren Rat.

Reihenfolge: **A** muss zuerst (sonst läuft die Zuweisung ins Leere), **B** und **C** gehören vor das Ende der Testphase, **D** bis **F** sind Erweiterungen.

---

## A. Ausrollen (nur du kannst es, ich habe keinen Zugang zu Supabase)

Die Auslieferung (Netlify) hat die Zuweisung schon eingeschaltet. Auf dem Server fehlt:

1. In Supabase, **SQL-Editor** (oder `supabase db push`), in dieser Reihenfolge ausführen:
   1. `supabase/migrations/20261005100000_plan_assignments.sql` (Zuweisung)
   2. `supabase/migrations/20261005110000_push_plan_offer.sql` (Push-Hinweis)
   - Davor noch nicht eingespielt und vermutlich ebenfalls offen: `20261004100000_shared_checkins.sql`, `20261004110000_ai_usage.sql`, `20261004120000_push_weekly.sql`. Bitte in Supabase prüfen, welche schon laufen.
2. `supabase functions deploy push` (neue Aktion `plan_offer`).
3. Danach einmal von Hand prüfen: Trainer-Konto sendet einen Plan an ein verbundenes Athleten-Konto, der Athlet sieht das Angebot, nimmt an, erledigt eine Einheit, der Trainer sieht den Fortschritt nur so weit freigegeben.

**Frage A1.** Soll ich dir eine einzige zusammengefasste SQL-Datei (alle offenen Migrationen in der richtigen Reihenfolge) zum Einfügen in den SQL-Editor erzeugen?
- [ ] Ja, bitte
- [ ] Nein, ich nehme die Einzeldateien

**Frage A2.** Wer testet die Zuweisung mit echten Konten, bevor Testpersonen sie sehen? (Ich konnte sie nur gegen nachgebildete Antworten prüfen, die Migration lief nie gegen eine echte Datenbank.)

---

## B. Rechtstexte (Anwalt)

Der Abschnitt «Pläne vom Trainer (freiwillig, Testphase)» steht in der Datenschutzerklärung (de, en). Offene Punkte:

**B1. Anwaltliche Prüfung** der Datenschutzerklärung, besonders: Einwilligung zum Puls als Gesundheitsdatum (Art. 9 Abs. 2 lit. a), getrennte Freigaben, Widerruf mit sofortiger Löschung, Aufbewahrung.
- [ ] Anwalt ist beauftragt, Termin: ________
- [ ] Noch nicht

**B2. Aufbewahrung.** Heute: gemeldete Einheiten 180 Tage, abgelehnte oder zurückgezogene Pläne 30 Tage. Das sind meine Annahmen.
- [ ] so lassen
- [ ] kürzer: ________ Tage / ________ Tage
- [ ] länger: ________ Tage / ________ Tage

**B3. Minderjährige.** Die Zuweisung und die Pulsfreigabe gelten heute für alle. Bei unter 18 Jahren braucht es meist die Einwilligung der Eltern.
- [ ] Pulsfreigabe für unter 18 ausschalten (Empfehlung)
- [ ] Zuweisung für unter 18 ganz ausschalten
- [ ] so lassen, Einwilligung der Eltern regelt der Trainer
- Hinweis: KYDON kennt das Alter nur, wenn das Geburtsdatum im Profil steht.

**B4. Trainer als Empfänger.** Der Vertrag zur Auftragsverarbeitung (`/auftragsverarbeitung`) beschreibt den Trainer als Verantwortlichen für die Daten seiner Athleten. Bei der Zuweisung sieht er Fortschritt, den der Athlet selbst freigibt. Ist das aus Sicht des Anwalts abgedeckt oder braucht der Vertrag einen Zusatz?
- [ ] Anwalt klärt es mit B1

**B5. Push-Hinweis.** Beim Einspielen von `push_plan_offer` ein Satz in den Abschnitten «Push-Benachrichtigungen» und «Pläne vom Trainer» («Hinweis auf ein Angebot, ohne Namen und Inhalt, nur mit eingeschaltetem Thema»).
- [ ] Ich formuliere ihn mit dem Anwalt
- [ ] Du (Claude) schlägst einen Satz vor, ich lasse ihn prüfen

**B6. Weitere Sprachen.** Die Datenschutzerklärung gibt es nur in Deutsch und Englisch, die App in acht Sprachen. Für die sechs anderen Sprachen gilt der englische Text.
- [ ] so lassen
- [ ] übersetzen lassen (Rechtstexte besser nicht maschinell)

---

## C. Fachliche Prüfung (Fachperson für Trainingswissenschaft)

Du hattest «eine fachkundige Person» gewählt. Ohne ihre Prüfung bleibt der Trainingsbereich in der Vorschau, und jede Regel und Vorlage steht als «Ungeprüft» da.

**C1. Wer prüft?**
- Name / Qualifikation: ________________________
- Bis wann: ________

**C2. Prüfumfang** (ich bereite dazu eine Prüfliste vor, sag mir das Format):
- [ ] die 5 Regeln des Registers (4×4-Intervalle, wiederholte Sprints, Maximalkraft, Power, Plyometrie) mit ihren Quellen
- [ ] die 7 Vorlagen (Struktur, Wochen, Reihenfolge)
- [ ] die Planungsregeln der App (siehe C3)
- [ ] das Bewertungstor (siehe C4)

**C3. Planungsregeln der App** (keine Literaturwerte, meine Produktentscheidungen). Bitte bestätigen oder ändern:

| Festlegung | Heute | Deine Antwort |
|---|---|---|
| Hohe Reize je Woche (harte Runden zählen mit) | höchstens 3 | |
| Häufigkeit, wenn die Regel keine nennt | 1 je Woche | |
| Blocklänge | 6 Wochen, danach Messung | |
| Tage zwischen hohen Reizen bei Hybrid | möglichst nicht aufeinanderfolgend | |
| Kein hoher Reiz am Tag vor oder nach harten Runden | ja | |

**C4. Bewertungstor.** Ab wann gilt ein Leistungsbereich als ausreichend gemessen?

| Festlegung | Heute | Deine Antwort |
|---|---|---|
| Pflichtbereich = Anforderungshöhe der Disziplin ab | 0,7 | |
| Mindestzahl Messungen je Bereich | 2 | |
| Höchstalter der letzten Messung | 120 Tage | |
| «Analysieren» ab | Hälfte der Pflichtbereiche und Datenzuverlässigkeit mindestens MODERATE | |
| «Verordnen» ab | alle Pflichtbereiche und Datenzuverlässigkeit mindestens MODERATE | |

**C5. Prüfstatus im Betrieb.** Die Auslieferung zeigt den Trainingsbereich im Vorschaumodus (`VITE_TRAINING_PLAN=preview`) für alle Nutzer, ungeprüfte Regeln sind als «Ungeprüft» gekennzeichnet.
- [ ] so lassen bis zur Prüfung (Testphase)
- [ ] Vorschau in der Auslieferung abschalten, nur für Testkonten zeigen (ich baue dafür eine Freischaltung)
- [ ] Vorschau abschalten, bis geprüft ist (dann auch die Zuweisung aus)

**C6. Volltextprüfung der Quellen.** Die Regeln stützen sich bisher auf Abstracts. Eine Regel gilt erst als «geprüft», wenn die Quellen im Volltext gelesen wurden. Soll ich die Quellenliste mit DOI und Zugangslage aufbereiten, damit die Fachperson sie abarbeiten kann? Eine Quelle (Helgerud 2007, VO₂max) hat im Register noch keinen DOI.
- [ ] Ja, bitte
- [ ] Nein

---

## D. Weitere Vorlagen

Die Spezifikation nennt rund 13 Vorlagen, gebaut sind 7 (Hybrid-Basis, Hybrid-Kraft, Hyrox-Vorbereitung, Grappling Basis und Aufbau, Striking Basis und Aufbau). Jede neue Vorlage ist nur eine Struktur; eine Dosis steht nur dort, wo eine geprüfte Regel mit Quelle sie liefert, sonst bleibt die Einheit «offen».

**D1.** Welche Vorlagen sollen dazukommen? (Mehrfachauswahl)
- [ ] Ausdauer-Grundlage (Laufen, Rad)
- [ ] Kraft-Grundlage ohne Sportart
- [ ] Wettkampf-Spitze (Taper) für Kampfsport
- [ ] Rückkehr nach Pause / Übergangsphase
- [ ] andere: ________________________
- [ ] keine weiteren

**D2.** Gibt es für diese Vorlagen Quellen oder eine Fachperson, die Dosierungen nennen kann?
- [ ] Ja, über die Fachperson aus C1
- [ ] Nein: dann nur Struktur mit offenen Einheiten

---

## E. Muay Thai (und andere Disziplinen)

Muay Thai fehlt im Katalog der App. Eine neue Disziplin braucht Anforderungshöhen je Fähigkeit (0 bis 1), die ausdrücklich nur «Voreinstellung dieser App» sind, und die Zuordnung zur Pilotfamilie (Striking).

**E1.** Soll Muay Thai aufgenommen werden?
- [ ] Ja, Anforderungshöhen schlage ich vor und du (oder die Fachperson) bestätigt sie
- [ ] Ja, nach Vorgabe der Fachperson
- [ ] Nein, erst später

**E2.** Welche weiteren Disziplinen willst du in der Testphase? ________________________

---

## F. Weitere Punkte aus früheren Gesprächen (noch ohne Antwort)

**F1. Wetterdienst.** Der Rennwetter-Ersatz für Open-Meteo: Welcher Dienst soll es werden, oder soll die Funktion in der Auslieferung aus bleiben? (siehe `docs/rennwetter-datenschutz.md`)

**F2. Check-in teilen.** Soll die Freigabe der Check-ins an den Trainer in die Auslieferung? Dafür braucht es den Datenschutztext aus `docs/checkin-datenschutz.md`, die Migration `shared_checkins` und den Schalter `VITE_CHECKIN_SHARE=on`. Offen auch hier: Verhalten bei Minderjährigen.

**F3. Sprachmodell (Anthropic, EU-Region).** Gehen Montagsbrief, Antworten, Trainer-Entwürfe und Wochenbericht live? Voraussetzungen: Auftragsverarbeitungsvertrag mit dem Anbieter, bestätigte Region, Datenschutztext, Schalter `VITE_AI_PHRASE=on`. Heute in der Auslieferung aus.

**F4. Strava.** Soll die Anbindung kommen (Zugang, Datenschutz, Aufwand)? Heute nicht gebaut.

---

## Wie du antwortest

Am einfachsten: diese Datei kopieren, Kreuze setzen, zurückschicken, oder mir im Chat eine Nummer und die Antwort nennen («B3: Pulsfreigabe unter 18 aus»). Ich setze danach um, was sich im Code lösen lässt, und lege zu jedem Punkt, der eine Fachperson oder einen Anwalt braucht, eine Prüfliste an.
