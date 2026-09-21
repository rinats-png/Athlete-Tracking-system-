# Ausbau: vom Messgerät zum Betriebssystem

Wie das Coaching-System v4.0.0 (drei Arbeitsmappen, 84 Blätter, 1.960
Eingabefeldgruppen, 44.394 Formeln) in Kydon aufgeht — und was davon
ausdrücklich **nicht** hineingeht.

**Stand:** 21. September 2026. S1 und S2 gebaut (siehe Abschnitt 15); alles Weitere Planung.

---

## 1. Warum überhaupt

In `docs/preise.md` steht der Satz, an dem das Geschäftsmodell bisher hängt:

> «Man misst zwei- bis viermal im Jahr, ein Abo für tägliche Nutzung rechnet
> sich nie.»

Die Antwort dort war, nicht die Nutzung sei der Wert, sondern die Historie.
Das stimmt — es ist aber eine Verteidigung, keine Lösung. Ein Produkt, das
man dreimal im Jahr öffnet, kann kein Abo tragen; eines, das man jeden Abend
öffnet, schon. **Das Coaching-System ist täglich. Genau das fehlt.**

Der zweite Grund wiegt schwerer. `docs/preise.md` nennt den
Wirksamkeitsnachweis «den Grund, warum ein Trainer bleibt, und das Einzige,
was sonst niemand verkauft». Heute kann Kydon ihn nur grob führen — zwischen
zwei Diagnostikterminen liegen Monate ohne Datenpunkte. Das **Decision-Log**
des Coach-Systems schliesst die Lücke:

> «Am 14. März hast du das Volumen für Brust reduziert. Erwartet hast du:
> weniger Schulterschmerz. Seitdem: Schmerz von 4,2 auf 2,1 — ausserhalb der
> Schwankung. Bankdrücken unverändert — innerhalb der Schwankung.»

Das ist dieselbe epistemische Bewegung, die Kydon mit `DETECTION_FACTOR`
(1,96 · √2 ≈ 2,77) schon macht, angewandt auf **Entscheidungen** statt auf
Messwerte. Es ist keine Erweiterung um ein fremdes Thema, sondern die
Fortsetzung des vorhandenen Gedankens.

### Die zwei Systeme teilen eine Ethik

Das ist der eigentliche Grund, warum diese Zusammenführung funktionieren
kann. Beide Systeme sind unabhängig voneinander mit derselben Haltung gebaut
worden:

| Coaching-System v4, Designregeln | Kydon |
|---|---|
| 3. Safety-Gate: nie Mengen-, Dosis-, Wasser- oder Elektrolytvorgabe; nur «Coach Review» oder «Medizinische Abklärung» | §81 keine Trainingsempfehlung · §82 keine medizinische Aussage |
| 4. Korrelationen erst ab 12 Beobachtungen; unvalidierte Scores heissen «Index» | `DETECTION_FACTOR` — ist die Änderung echt oder Rauschen? |
| 5. «Leer ist nicht 0. Diagramme zeigen Lücken.» | §89 nicht gemessen ≠ schwach |
| 8. Jede Schwelle ist ein Parameter, nie hart in einer Formel | Referenzen sind Daten mit benannter Quelle, nicht Code |
| 9. Jede Berechnung gekapselt; Richtigkeit über Soll-Werte, nicht über sichtbare Fehler | Perzentil nur bei belegter Referenz |

Ein Produkt, das man an ein anderes anschliesst, bringt sonst seine eigene
Weltanschauung mit. Hier nicht.

---

## 2. Die vier getroffenen Entscheidungen

| Frage | Entscheidung | Folge für den Plan |
|---|---|---|
| Zielgruppe | **beide, gestuft** | Gelegenheitsathlet bleibt in Frei/Plus vollständig bedient; Wettkampfathlet wächst nach Pro/Elite. Die Oberfläche muss Tiefe **verbergen** können — Abschnitt 8. |
| Gesundheitsdaten Art. 9 | **von Anfang an mitdenken** | Architektur, Einwilligung und Verschlüsselung werden sofort dafür ausgelegt, auch wenn die Felder erst in S5 kommen. Teurer im Fundament, kein Umbau später — Abschnitt 6. |
| Lebensmitteldatenbank | **Open Food Facts** | Über 3 Mio. Produkte mit Barcode, offen lizenziert. Dafür schwankende Qualität — die als Datum ausgewiesen wird, nicht versteckt — Abschnitt 7. |
| Nächster Schritt | **dieses Dokument** | Danach Einzelentscheidungen, dann Etappe 0. |

---

## 3. Was nicht gebaut wird

Diese Liste steht vorn, weil sie sonst in Etappe 4 wieder zur Diskussion
steht.

**PEDs.** Das Blatt ist im Coach-System ausgeblendet und die Entscheidung
dort offengelassen. Für eine App unter eigenem Namen ist sie nicht offen:
eine Dokumentationshilfe für Dopingsubstanzen berührt das Anti-Doping-Gesetz,
macht den Betreiber angreifbar und ist mit einer Marke, deren einziger Inhalt
Ehrlichkeit ist, unvereinbar. Es gibt keine Stufe, in der sie erscheint.

**Automatische Anpassung von Mengen.** Der «Adaptive Coaching-TDEE» der
Zielsteuerung ist im Excel-System ausdrücklich ein «Vorschlag zur Diskussion
– nicht automatisch umsetzen». In der App wird er **gar nicht** als Vorschlag
gezeigt, sondern als Messung: was du isst, was du wiegst, was daraus folgt.
Abschnitt 4 erklärt den Unterschied.

**Ampeln auf Gesundheitswerten.** v4 hat die Ampel der Energy Availability
bereits entfernt und durch «unter Schwelle: ja/nein» ersetzt. Das bleibt so.
Eine Farbe ist eine Bewertung, und eine Bewertung eines Laborwerts ist eine
medizinische Aussage.

**Freie Korrelationsmatrix.** v4 erlaubt nur vorab definierte Variablenpaare,
weil bei vielen Paaren und wenigen Wochen zufällige Zusammenhänge entstehen.
Übernommen.

---

## 4. Der Konflikt mit §81 — und wie er aufgelöst wird

§81 sagt: keine Trainingsempfehlung. Der **Makro-Rechner** gibt kcal- und
Makrozielwerte aus. Der **Sport-Rechner** gibt Kohlenhydrate in g/kg aus. Das
sind Vorgaben.

Die Grenze, die §81 zieht, ist nicht «Training gegen Ernährung», sondern
**messen gegen vorschreiben**. Nach dem Buchstaben verletzt der Makro-Rechner
sie.

Die Auflösung steht in der eigenen Designregel 2 des Coaching-Systems: *Plan
und Ist stehen in getrennten Spalten.* Übersetzt in Kydons Sprache:

> Die App rechnet einen **Referenzwert** nach einer benannten Formel mit
> benannter Quelle und benanntem Fehler — «Grundumsatz nach Mifflin-St Jeor,
> 1990, Schätzfehler etwa ±10 %» — und stellt daneben, was tatsächlich
> gegessen wurde. Sie sagt nie «iss 3.265 kcal». Sie sagt: «Die Formel
> schätzt 3.265 kcal. Du lagst im Schnitt bei 2.398. Dein beobachteter
> Umsatz über 28 Tage liegt bei 2.909.»

Das ist exakt dieselbe Konstruktion wie das Perzentil: ein Massstab mit
Quelle, kein Befehl. Und der **beobachtete** Umsatz schlägt den berechneten —
gemessen vor geschätzt, wie überall sonst in der App.

**Zu klären, bevor S4 beginnt:** ob §81 im Wortlaut ergänzt wird
(«Referenzwerte mit benannter Quelle sind keine Empfehlung») oder ob eine
eigene Regel §83 dafür entsteht. Ich rate zur Ergänzung von §81, damit es
eine Stelle bleibt.

### §82 und die Medizinprodukte-Frage

Peak Week gibt bei Synkope, Verwirrtheit, anhaltendem Erbrechen oder
Palpitationen «MEDIZINISCHE ABKLÄRUNG» aus. Fachlich ist das genau richtig.

Rechtlich gilt: Software, die Symptome bewertet und zu ärztlicher Abklärung
triagiert, **kann** nach EU-MDR ein Medizinprodukt sein; die Abgrenzung zu
«Lifestyle und Wohlbefinden» verläuft genau hier. In einer verschlüsselten
Datei beim Trainer stellt sich die Frage kaum, in einer App im Store mit
tausend Nutzern sofort.

**Das ist keine Frage, die in diesem Dokument entschieden wird.** Sie gehört
vor S5 an einen Fachanwalt für Medizinprodukterecht. Bis dahin gilt für die
Planung: S1–S4 enthalten **keine** Symptombewertung und keine Triage.

---

## 5. Die fünf Schichten

Nicht «das Excel-System portieren», sondern fünf trennbare Schichten auf das
bestehende Rückgrat — jede einzeln auslieferbar, jede mit eigenem Risiko.

### S1 · Tagebuch

*Grösster Geschäftswert, kleinstes Risiko, keine Art.-9-Daten.*

Aus dem Client-Tracker und den Check-ins: Gewicht, Schlaf (Dauer, Qualität,
Latenz), Energie, Stress, Motivation, Muskelkater, Schritte, Sessions mit
Session-RPE, Plan-Adhärenz. Gleitende Mittelwerte, Gewichtstrend,
Datenvollständigkeit.

Bewusst **nicht** dabei: Verletzung/Krankheit, Schmerzgrad, Zyklus, Libido,
Körperbild-Stress, Blutdruck, Ruhepuls, HRV. Das sind Gesundheitsdaten und
gehören in S5.

→ *Frei (verkürzt) · Plus (voll)*

### S2 · Trainingslog und Belastung

Aus Trainingslog, Trainings-Analytics, Muskelvolumen: Sätze mit Gewicht,
Wiederholungen und RIR; e1RM je Satz; Volumen; Wochenlast nach sRPE; Sätze je
Primärmuskel und Woche; Plateau-Erkennung über 4-Wochen-Blöcke.

Der Anschluss ist natürlich: **e1RM ist ein Testwert.** Er gehört in dieselbe
Zeitreihe wie ein Sprint oder ein Cooper-Test, mit demselben Fehlerband.

→ *Plus*

### S3 · Cockpit und Decision-Log

*Höchste Zahlungsbereitschaft.*

Die Regeln des Coach-Cockpits als **Hinweise**, nie als Vorgabe: Schlaf unter
Baseline, Recovery-Score mehr als 8 Punkte unter dem 28-Tage-Mittel, Gewicht
stagniert gegen Zielrate, Adhärenz unter 80 %, Plateau im Training. Jede
Schwelle als Parameter im Athletenprofil, wie in v4.

Dazu das Decision-Log: Anlass, Bereich, Beobachtung, Entscheidung,
Begründung, erwartete Wirkung, Überprüfungsdatum, tatsächliche Wirkung. Und —
das ist der Teil, den das Excel-System nicht kann — die **Prüfung der
Wirkung gegen das Fehlerband**, mit denselben 2,77 Standardfehlern.

→ *Trainerstufen · Pro für Selbstcoacher*

### S4 · Ernährung

Aus Mahlzeiten-Tracking, Makro-Rechner, Ernährungsplan, Nährstoffqualität:
Mahlzeiten mit Lebensmitteln, Timing an Sessions gebunden (Pre/Intra/Post),
Fueling Plan und Ist, Tagesflüssigkeit, Mikronährstoff-Abdeckung,
beobachteter Umsatz.

Der schwere Teil ist nicht die Logik, sondern die Datenbasis — Abschnitt 7.

→ *Pro*

### S5 · Gesundheit und Wettkampf

*Art. 9 DSGVO. Eigene Einwilligung je Kategorie. Eigene Rechtsprüfung.*

Blutwerte mit Präanalytik (Uhrzeit, nüchtern, Training am Vortag, Labor,
Zyklusphase, Infekt) und Laborreferenzbereichen; Symptom-Timeline; GI-Symptome
einzeln; Zyklus; Körperbild und Libido; Fotos mit Standardisierung; Energy
Availability und die REDs-Screening-Struktur; Peak Week mit Baseline, Mock
Peak, Show Day, Post-Contest; die zehn Sportmodule.

→ *Elite*

### Übersicht

| | Inhalt | Art. 9 | Stufe | Abhängig von |
|---|---|---|---|---|
| **S1** | Tagebuch | nein | Frei/Plus | Etappe 0 |
| **S2** | Trainingslog, Belastung | nein | Plus | S1 |
| **S3** | Cockpit, Decision-Log | nein | Pro/Trainer | S1, S2 |
| **S4** | Ernährung | nein | Pro | S1, Lebensmittel-DB |
| **S5** | Gesundheit, Peak Week | **ja** | Elite | S1–S4, Rechtsprüfung |

---

## 6. Etappe 0: das Fundament, das jetzt fehlt

Diese Etappe kommt **vor** S1 und ist der Grund, warum man nicht einfach
anfangen kann.

### Das 8-MB-Problem

Heute gilt: **ein JSON-Dokument je Athlet, höchstens 8 MB, immer vollständig
geschrieben.** Das steht so in `20260906_baseline_core.sql` und ist für
periodische Diagnostik genau richtig — der Server ist eine Zweitschrift, kein
zweites Datenmodell.

Tägliche Einträge über Jahre sprengen das. Eine überschlägige Rechnung:

| | je Tag | je Jahr |
|---|---|---|
| Tagebucheintrag (S1) | ~0,4 kB | ~150 kB |
| Trainingslog, 4 Einheiten/Woche à 20 Sätze (S2) | — | ~500 kB |
| Mahlzeiten, 5 je Tag (S4) | ~1,2 kB | ~440 kB |
| **Summe ohne Fotos** | | **rund 1,1 MB** |

Nach sieben Jahren ist die Grenze erreicht — und lange vorher wird jeder
Speichervorgang teuer, weil **das ganze Dokument** geschrieben wird. Ein
Tagebucheintrag von 400 Byte löst dann eine Übertragung von mehreren Megabyte
aus. Auf dem Telefon im Funkloch ist das die falsche Architektur.

**Der Weg:** Stammdaten bleiben im Dokument, Zeitreihen ziehen in eigene
Tabellen mit eigener RLS.

```
athlete_documents   Stammdaten, Profil, Konfiguration   (bleibt)
daily_entries       ein Eintrag je Athlet und Tag       (neu, S1)
training_sets       ein Satz                            (neu, S2)
decisions           eine Entscheidung                   (neu, S3)
meals / meal_items  Mahlzeit und Position               (neu, S4)
health_entries      verschlüsselt, Art. 9               (neu, S5)
```

Das bricht die bisherige Regel «der Server versteht die Daten nicht». Das ist
eine ernste Änderung und sie braucht eine Begründung, die trägt: Der Server
**muss** diese Daten weiterhin nicht verstehen — er speichert je Zeile ein
`payload jsonb`, das lokal gegen Zod geprüft wird. Was in eigene Spalten
wandert, sind nur `athlete_id`, `entry_date` und `updated_at`: die Felder, die
für Konfliktauflösung und teilweises Laden gebraucht werden. Die Rechenhoheit
bleibt auf dem Gerät.

**Zu entscheiden:** ob `daily_entries` eine Spalte je Messgrösse bekommt
(abfragbar, aber ein zweites Schema, das mit dem lokalen auseinanderlaufen
kann) oder ein `payload jsonb` (kein zweites Schema, aber serverseitig nicht
auswertbar). Ich rate zu `payload jsonb` — aus demselben Grund, aus dem
`athlete_documents` so gebaut wurde.

### Die Schemamigration

`CURRENT_SCHEMA_VERSION` steht bei 19. S1 bis S5 brauchen jeweils mindestens
eine Migration. Die bestehende Migrationskette ist getestet und trägt; neu ist
nur, dass Daten **aus dem Dokument heraus** in Tabellen wandern müssen, ohne
dass ein Nutzer etwas verliert (§89). Das ist die heikelste einzelne Aufgabe
des ganzen Ausbaus und gehört mit eigenen Prüffällen abgesichert.

### Die Oberfläche muss Tiefe verbergen können

Die Entscheidung «beide Zielgruppen, gestuft» hat eine Folge, die leicht
unterschätzt wird: **ein Einsteiger darf nie 40 Eingabefelder sehen.** Das
Coach-System hat allein im Blatt `Check-ins` 45 Spalten.

Der Mechanismus dafür muss in Etappe 0 stehen, nicht nachträglich: ein
Feldsatz je Stufe und Sportart, aus Daten gesteuert (wie `Sport-Presets` es
im Excel-System tut), plus ein «mehr erfassen»-Weg, der Felder einzeln
dazuschaltet. Wer nie mehr als Gewicht und Schlaf einträgt, sieht nie mehr
als zwei Felder.

---

## 7. Die Lebensmitteldatenbank

270 Lebensmittel reichen nicht; Mikronährstoffe liegen für etwa 90 davon vor.
Entschieden ist **Open Food Facts**.

**Was dafür spricht:** über drei Millionen Produkte, Barcodes, offen
lizenziert, kostenlos, mehrsprachig, deckt den deutschen Markt gut ab.

**Was dagegen spricht und ehrlich benannt gehört:** Die Daten sind von
Freiwilligen erfasst. Nährwerte sind teils unvollständig, teils falsch,
Mikronährstoffe sind die Ausnahme, nicht die Regel.

**Warum das trotzdem passt:** Die Lebensmittel-DB des Coaching-Systems hat
bereits die Spalten **Quelle, Datenstand, Datenqualität** (W–Y), und das
Tagesblatt zeigt eine **Mikro-Datenabdeckung**. Das ist genau Kydons Haltung:
Ein unsicherer Wert wird nicht versteckt und nicht geglättet, sondern als
unsicher ausgewiesen. Ein Eintrag aus Open Food Facts trägt dann sichtbar
«Quelle: Open Food Facts, Nutzerangabe, Mikronährstoffe unvollständig» — und
ein kuratierter Kern aus BLS oder USDA, wenn er später dazukommt, trägt eine
bessere Herkunft. Die App sagt, was sie weiss, und wie gut sie es weiss.

**Drei Punkte zu klären, bevor S4 beginnt:**

1. **Lizenz.** Open Food Facts steht unter der Open Database License (ODbL).
   Die verlangt Namensnennung, und für *weitergegebene abgeleitete
   Datenbanken* gilt eine Share-alike-Pflicht. Ob eine App, die Werte
   anzeigt, davon betroffen ist, oder erst eine, die einen Auszug
   weiterverteilt, gehört einmal rechtlich geklärt — nicht geraten.
2. **Technik.** Online-Abfrage der API oder ein eigener Auszug? Kydon ist
   lokal-zuerst; eine Ernährungserfassung, die ohne Netz nicht funktioniert,
   widerspricht dem. Ein Auszug der meistgenutzten Produkte im Gerät, die
   API für den Rest, ist der wahrscheinliche Weg.
3. **Kuratierter Kern.** Die 270 geprüften Lebensmittel aus v4 bleiben als
   Kern mit höherer Datenqualität erhalten und stehen in der Suche oben.

---

## 8. Die Formel-Inventur

44.394 Formeln klingen nach Jahren. Es sind aber rund vierzig fachliche
Berechnungen, die über tausende Zeilen wiederholt werden. Die wichtigsten,
mit Quelle und Prüfwert aus eurem eigenen Testbericht:

| Berechnung | Formel / Quelle | Prüfwert | Schicht |
|---|---|---|---|
| Grundumsatz | Mifflin-St Jeor 1990: `10·kg + 6,25·cm − 5·Jahre + 5` | `Makro-Rechner!C11` = 1.892,5 | S4 |
| Gesamtumsatz | Grundumsatz × PAL | `C13` = 3.265 (PAL 1,725) | S4 |
| Beobachteter Umsatz | `Ø Zufuhr − (Δ Gewicht · 7.700 / Tage)`, erst ab 14 Datentagen | `Zielsteuerung!C11` = 2.909 | S4 |
| e1RM | Epley mit RIR: `kg · (1 + (Wdh + RIR)/30)` | `Trainingslog!J5` = 108 | S2 |
| Session-Last | sRPE nach Foster: `Dauer (min) × Session-RPE` | `Tagesdaten!AG5` = 525 | S1 |
| Cardio-Last | dieselbe Methode | `Tagesdaten!AI7` = 120 | S1 |
| Wochenlast | Summe der Session-Lasten | `Trainings-Analytics!C48` = 2.100 | S2 |
| Plateau | Δ e1RM aktueller 4-Wochen-Block gegen Vorblock < Schwelle | `Analytics!K6` = «Plateau prüfen» | S2 |
| Energy Availability | `(Zufuhr − Trainingsverbrauch) / fettfreie Masse`, Schwelle 30 kcal/kg FFM | Cockpit-Regel «AKTIV» | S5 |
| Recovery-Index | zusammengesetzt, ausdrücklich «rein subjektiv» (★★☆☆☆) | `Tagesdaten!AE5` = 75 | S1 |
| Vollständigkeit | Anteil erfasster Felder je Woche | `Check-in-Grafiken!M13` = 0,9643 | S1 |
| Mikro-Abdeckung | Anteil der Lebensmittel mit hinterlegten Mikronährstoffen | `Tag 1!W24` = 1 | S4 |
| Relevanz eines Testwerts | Δ % gegen typische Messabweichung | `Performance-Tests!Q7` = «relevant» | **vorhanden** |
| Korrelation | nur vorab definierte Paare, erst ab n = 12 | `Korrelationen!H5` = «ja, explorativ» | S3 |
| Makroverteilung | g/kg Körpergewicht, `kcal = KH·4 + Protein·4 + Fett·9` | `Tag 1!D22` = 297,6 | S4 |

Bemerkenswert: **«Relevanz eines Testwerts» gibt es in Kydon schon** — das
ist `DETECTION_FACTOR`. Zwei Systeme, dieselbe Idee, unterschiedliche
Herleitung. Beim Port muss geprüft werden, welche der beiden strenger ist,
und die strengere gewinnt.

### Der Testbericht ist eine fertige Prüffallsammlung

Das ist das wertvollste mitgelieferte Stück, und es heisst nirgends so. **64
Soll-Werte mit exakten Erwartungen**, geprüft gegen einen Testathleten über
16 Wochen mit eingebauten Grenzfällen.

Jede portierte Funktion wird gegen genau diese Zahlen geprüft. Ein Port, der
bei allen 64 Werten dasselbe rechnet wie das geprüfte Excel-System, ist kein
«sieht richtig aus» — er ist gegen eine unabhängige Implementierung belegt.

Die Grenzen, die ihr selbst nennt, gelten weiter: 64 Werte decken die
Kernlogik ab, nicht alle 44.000 Formeln. Was keinen Soll-Wert hat, ist beim
Port neu zu begründen, nicht blind zu übernehmen.

---

## 9. Was «Art. 9 von Anfang an mitdenken» konkret heisst

Entschieden ist: die Architektur wird sofort dafür ausgelegt, die Felder
kommen später. Das bedeutet vier Dinge in Etappe 0.

**1. Getrennte Ablage.** Gesundheitsdaten kommen nie in dieselbe Tabelle wie
Trainingsdaten. `health_entries` ist eine eigene Tabelle mit eigener RLS —
damit ein Löschen je Kategorie möglich ist, ohne den Rest anzufassen. Die
Datenschutzvorlage verlangt genau das: «Widerruf der Einwilligung →
Gesundheitsdaten löschen» als eigener Vorgang.

**2. Einwilligung je Kategorie, nicht pauschal.** Eure Vorlage hat sieben
Ankreuzfelder (Körperdaten, Fotos, Wellness, Zyklus, Laborwerte, Symptome,
Medikation). Die App braucht dieselbe Granularität als Datenmodell: je
Kategorie ein Einwilligungsdatum, ein Widerrufsdatum, eine Fassung des Textes.
Ohne Einwilligung ist das Feld nicht vorhanden — nicht ausgegraut.

**3. Verschlüsselung, die den Betreiber ausschliesst.** Für Art.-9-Daten
reicht «RLS schützt es» nicht als Antwort auf die Frage, wer die Blutwerte
lesen kann. Der Betreiber sollte sie **nicht lesen können**. Das heisst
Verschlüsselung auf dem Gerät mit einem Schlüssel, der nie zum Server geht.

Das hat einen Preis, der offen benannt gehört: **Wer den Schlüssel verliert,
verliert die Daten.** Bei einem Passwort-Zurücksetzen sind die
Gesundheitsdaten weg, die Trainingsdaten nicht. Das kollidiert mit §89, und
zwar echt. Die Auflösung ist wahrscheinlich: §32 gilt weiter — der Export ist
frei und vollständig, und die App drängt vor der ersten Art.-9-Eingabe auf
einen Export. Aber es ist eine Kollision, kein Missverständnis, und sie
gehört vor S5 entschieden.

**4. Trainerzugriff ist enger als bei Trainingsdaten.** Heute gilt:
`can_view_athlete` sieht alles. Für Art.-9-Daten muss der Athlet je Kategorie
freigeben, und der Entzug muss sofort wirken. Das Sicherheitsprotokoll aus
`20260910090000` protokolliert Berechtigungsänderungen bereits — es bekommt
neue Ereignisarten.

---

## 10. Stufen und Preise

Zwei Regeln vorweg.

**§32 bleibt unberührt.** Der Export ist in jeder Stufe frei und vollständig,
auch in der kostenlosen. Eine Stufe, die Daten einsperrt, beschädigt die
einzige Eigenschaft, für die diese App bekannt werden kann.

**Die kostenlose Stufe wird grösser, nicht kleiner.** Sie bekommt den
täglichen Haken (Tagebuch light). Das ist der Trichter — und `docs/preise.md`
rechnet vor, dass ein Trainer etwa fünfundzwanzig Plus-Abos wert ist. Den
Trichter zu verengen, um Konversion zu erzwingen, kostet mehr, als es bringt.

### Athletenstufen

| | heute | neu | Preis |
|---|---|---|---|
| **Frei** | messen, Historie, Fehlerband, eigenes Profil, Export, Erinnerungen | **unverändert** + Tagebuch light (Gewicht, Schlaf, Energie, Sessions) | 0 € |
| **Plus** | Prognose, Saisonplan, Anforderungslücke, Perzentil, Abgleich, Karte, Jahresrückblick | + volles Tagebuch, Trainingslog, e1RM, Belastung, Wochenreview | **49 €/Jahr** (heute 29) |
| **Pro** | — | + Ernährung, Periodisierung, Belastungsanalytik, Decision-Log für sich selbst, Korrelationen | **99 €/Jahr** |
| **Elite** | — | + Peak Week, Sportmodule, Gesundheitsschicht (Art. 9, opt-in), Laborverlauf, Post-Contest | **199 €/Jahr** |

Zur Anhebung von Plus auf 49 €: Plus bekommt mit S1 und S2 erheblich mehr
Substanz — und 29 € waren am Markt ohnehin defensiv gesetzt (ein Jahr My Jump
Lab kostet 29,99 €). Wer heute Plus hat, behält seinen Preis, solange er
zahlt; das ist billiger als der Vertrauensverlust.

### Trainerstufen

Unverändert 149 / 349 / 699 € im Jahr für 25 / 75 / 250 gemessene Athleten.
**Die Achse bleibt die Anzahl betreuter Athleten, nicht die Datentiefe** —
sonst konkurrieren Elite und Coach Team miteinander. Jede Trainerstufe
enthält die volle Datentiefe für die betreuten Athleten; was die Stufen
trennt, ist, für wie viele.

Der Hebel aus `docs/preise.md` bleibt und wird stärker: Zahlt der Trainer,
bekommen seine Athleten die volle App. Mit S1–S4 ist das ein deutlich
grösseres Geschenk als heute.

### Die ehrliche Gegenrede

Vier Stufen sind eine Entscheidung mehr für den Käufer, und jede zusätzliche
Entscheidung kostet Konversion. **Die Stufenzahl allein macht keinen Umsatz —
der tägliche Grund, die App zu öffnen, macht ihn.** Wenn S1 und S2 gebaut
sind und die Nutzung täglich ist, tragen die Stufen. Wenn nicht, wären auch
zehn Stufen leer.

Deshalb: Stufen erst scharf schalten, wenn S1 und S2 stehen und die
Nutzungsdaten zeigen, dass das Tagebuch benutzt wird. Bis dahin beschreibt
`pricing.ts` sie, wie heute, ohne sie zu erzwingen.

---

## 11. Reihenfolge

| Etappe | Inhalt | Ergebnis |
|---|---|---|
| **0** | Datenmodell (Zeitreihen-Tabellen), Migration, Feldsatz-Mechanismus, Art.-9-Fundament | nichts sichtbar Neues, alles Weitere möglich |
| **1** | S1 Tagebuch | täglicher Grund, die App zu öffnen |
| **2** | S2 Trainingslog, e1RM, Belastung | Plus wird erheblich stärker |
| **3** | S3 Cockpit, Decision-Log | Wirksamkeitsnachweis; Trainerstufen werden verkaufbar |
| **4** | Stufen scharf schalten, Bezahlweg (Stripe zuerst) | erster Umsatz |
| **5** | S4 Ernährung, Open Food Facts | Pro wird verkaufbar |
| **6** | Rechtsprüfung Art. 9 und MDR | Entscheidung über S5 |
| **7** | S5 Gesundheit, Peak Week, Sportmodule | Elite |

Etappe 4 steht bewusst **vor** der Ernährung: Nach S1–S3 ist genug Wert da,
um Geld zu verlangen, und der Bezahlweg fehlt ohnehin noch vollständig.
Ernährung ist der grösste Brocken und sollte nicht zwischen Produkt und
Umsatz stehen.

---

## 12. Risiken

| Risiko | Einschätzung | Gegenmittel |
|---|---|---|
| **Die App wird zu komplex und verliert den Einsteiger** | hoch, und der wahrscheinlichste Weg zu scheitern | Feldsatz je Stufe in Etappe 0, nicht später; die Frei-Stufe bleibt schlicht |
| **Art. 9 zieht Aufwand und Haftung nach sich, die niemand eingeplant hat** | hoch | S5 zuletzt; Rechtsprüfung als eigene Etappe; Verschlüsselung ohne Betreiberzugriff |
| **MDR-Einstufung** | offen, nicht von mir bewertbar | Fachanwalt vor S5; S1–S4 ohne Symptombewertung |
| **Open Food Facts liefert schlechte Daten und die App sieht unseriös aus** | mittel | Datenqualität als Datum ausweisen (ist im System schon angelegt); kuratierter Kern oben in der Suche |
| **Das 8-MB-Dokument wird zu spät geteilt** | mittel | Etappe 0 vor S1, keine Ausnahme |
| **Die Stufen kannibalisieren einander** | mittel | Athlet nach Datentiefe, Trainer nach Anzahl — die Achsen nie mischen |
| **Der Umfang ist zu gross für eine Person** | hoch | Etappen sind einzeln auslieferbar; nach jeder Etappe ist ein Halt möglich, ohne dass etwas Halbes stehen bleibt |

Zum letzten Punkt, offen gesagt: **Das ist ein Vorhaben von Monaten, nicht
von Wochen.** Etappe 0 bis 3 schätze ich, konservativ und mit dem
bestehenden Prüfniveau, auf drei bis fünf Monate bei stetiger Arbeit. S4 und
S5 noch einmal so viel. Die Etappenschnitte sind so gesetzt, dass nach jeder
ein benutzbares Produkt steht.

---

## 13. Was vor Etappe 0 entschieden werden muss

1. **§81 ergänzen oder §83 neu?** Referenzwerte mit benannter Quelle sind
   keine Empfehlung — das gehört als Regel geschrieben, bevor der erste
   Makro-Referenzwert erscheint.
2. **`payload jsonb` oder Spalten je Messgrösse** in den Zeitreihen-Tabellen.
   Empfehlung: `payload jsonb`, aus demselben Grund wie bei
   `athlete_documents`.
3. **Der Schlüsselverlust bei Art.-9-Daten gegen §89.** Wenn der Betreiber
   Gesundheitsdaten nicht lesen können soll, kann er sie auch nicht
   wiederherstellen. Das ist eine echte Kollision und braucht eine
   geschriebene Entscheidung.
4. **Bestandspreise.** Behalten heutige Plus-Kunden 29 €? Empfehlung: ja,
   solange sie zahlen.
5. **Bleiben die Excel-Dateien bestehen?** Viele Trainer arbeiten gern in
   Excel. Eine Export-/Import-Brücke in die bestehenden Blätter wäre ein
   Übergang statt eines Bruchs — und ein Verkaufsargument gegenüber genau den
   Trainern, die das System schon nutzen.

---

## 15. Umsetzungsstand

| Schicht | Stand | Wo |
|---|---|---|
| **S1 Tagebuch** | **gebaut**, 21.09.2026 | `src/domain/diary.ts`, `src/features/diary/`, `src/features/overview/DiaryTodayCard.tsx`, Schema v20 |
| **S2 Trainingslog** | **gebaut**, 21.09.2026 | `src/data/exercises.ts`, `src/domain/training.ts`, `src/features/training/`, Schema v21 |
| S3 Cockpit, Decision-Log | offen | |
| S4 Ernährung | offen | |
| S5 Gesundheit | offen | |

**Eine bewusste Abweichung vom Plan, offen benannt.** Etappe 0 sah vor, die
Zeitreihen *vor* S1 in eigene Servertabellen zu ziehen. S1 legt das Tagebuch
stattdessen **im Athletendokument** ab. Der Grund ist die Rechnung aus
Abschnitt 6: ein Tagebuchtag wiegt rund 400 Byte, ein Jahr rund 150 kB —
das Dokument trägt das jahrelang, und das lokale Modell (ein Bestand, ein
Export, eine Migration) bleibt unangetastet. Die Tabellentrennung wird
nötig, sobald S2 (Sätze) oder S4 (Mahlzeiten) dazukommen; sie steht als
erste Aufgabe **vor** S2, nicht danach. Ein Umbau, den man aufschiebt, bis
er weh tut, ist keiner mehr — deshalb steht das hier und nicht im Code.

**Was S1 geworden ist:**

- Ein Eintrag je Tag: Gewicht, Schlaf, Energie, Einheiten (Kern) — plus
  Schlafqualität, Stress, Muskelkater, Schritte, Plan-Adhärenz, Notiz als
  einzeln zuschaltbare Felder («mehr erfassen»). Der Feldsatz-Mechanismus
  aus Etappe 0 ist damit gebaut: ein Einsteiger sieht vier Felder.
- Keine Art.-9-Daten. Schmerz, Zyklus, Ruhepuls, HRV sind im Schema nicht
  vorhanden; ein Import, der sie mitbringt, verliert sie beim Prüfen.
- Bedienung ohne Tabellen: Tipp-Skalen (1–5, 1–10) statt Regler für Stufen,
  Regler nur für Minuten, Einheiten als Chips, ein Tag pro Bildschirm.
- Rechnung geprüft gegen den Testbericht v4.0.0: Session-Last 525 und 120,
  Wochenlast 2.100, Tageslast 540, Vollständigkeit 0,9643. Belastungs-
  verhältnis 7:28 nur beschreibend, erst ab 14 erfassten Tagen; Gewichts-
  trend erst ab drei Wägungen je Woche.
- Die Übersicht nimmt den Tag mit einem Tipp entgegen — auch bei leerem
  Bestand, denn dort beginnt die Gewohnheit.

**Was S2 geworden ist:**

- Übungskatalog aus der Übungs-DB v4 (70 Übungen, Primärmuskel, Gerät),
  Suche über Umlaute und Sprachen, freie Übungen ohne Muskelzuordnung —
  ehrlicher als ein geratener Muskel.
- Eine Einheit = Übungen mit Sätzen (kg, Wdh, RIR). Editor ohne Tabelle:
  Ziffernblock für kg, Plus/Minus für Wdh, Tipp-Skala 0–5 für RIR, e1RM
  sofort neben dem Satz, «Satz wiederholen» kopiert den letzten.
- Rechnung geprüft gegen den Testbericht: e1RM Epley mit RIR 108 kg
  (`Trainingslog!J5`), Sätze je Primärmuskel 6 (`Muskelvolumen!V5`).
  Blockvergleich 4 gegen 4 Wochen sagt «unverändert», nie «Plateau brechen».
- Eine Wahrheit für die Last: Dauer und RPE der Einheit erzeugen die
  Session-Last im Tagebuch desselben Tages (verknüpft über
  `diarySessionId`); Löschen nimmt sie mit.
- Der e1RM bleibt eine Schätzung mit Namen — er wandert nicht ins
  Leistungsprofil neben einen gemessenen 1RM.

**Vor S3 fällig, unverändert:** die Tabellentrennung auf dem Server. Mit
Sätzen wächst das Dokument spürbar schneller als mit Tagebuchtagen.

## 14. Zusammenfassung in drei Sätzen

Das Coaching-System füllt genau die Lücke, an der Kydons Geschäftsmodell
bisher hängt — es macht aus einem Produkt, das man dreimal im Jahr öffnet,
eines, das man täglich öffnet, und es liefert mit dem Decision-Log den
Wirksamkeitsnachweis, den `docs/preise.md` als das einzige unverkaufte
Argument im Markt beschreibt. Übernommen wird es in fünf Schichten und nicht
am Stück, weil die Gesundheitsschicht eine andere Rechtsklasse ist als der
Rest und das Fundament sie vorher tragen muss. Nicht übernommen wird das
PED-Blatt, in keiner Stufe.
