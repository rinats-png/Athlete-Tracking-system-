# Offene Entscheidungen zum Trainingsbereich

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
