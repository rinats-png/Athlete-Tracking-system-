# Rechtsprüfung Art. 9 DSGVO und MDR — Entscheidungsvorlage zu S5

*Stand: 21. September 2026. Etappe 6 aus `docs/ausbau.md` §11.*

> **Keine Rechtsberatung.** Dieses Dokument ist die technisch-rechtliche
> Vorbereitung für zwei Fachgespräche — Datenschutz (Art. 9 DSGVO) und
> Medizinprodukterecht (MDR) — und die Entscheidungsvorlage für den Umfang
> von S5. Es benennt, was die App heute tut, ordnet jedes geplante Merkmal
> nach den einschlägigen Regeln und Leitlinien ein und sagt, was ich
> empfehle. Wo eine Einordnung offen ist, steht das. Die Entscheidung über
> die offenen Punkte gehört zu einem Fachanwalt; die Fragen dafür stehen
> in Abschnitt 8.

---

## 1. Warum die Prüfung jetzt kommt

S1–S4 sind gebaut und bewusst ohne Symptombewertung, ohne Triage und ohne
Gesundheitsdaten geplant. S5 (Blutwerte, Symptome, Zyklus, Körperbild,
Medikation, Fotos, Energy Availability, REDs-Screening, Peak Week) wäre
etwas anderes: Daten der besonderen Kategorie nach Art. 9 DSGVO und —
je nach Ausgestaltung — Software mit medizinischer Zweckbestimmung nach
Art. 2 Nr. 1 MDR. Beides ändert nicht ein Feature, sondern die
Rechtsklasse des Produkts. Deshalb steht diese Prüfung VOR S5, und nicht
als Fussnote danach.

Zwei Ergebnisse vorweg, weil sie den Rest bestimmen:

1. **Die App verarbeitet heute schon einen Wert, der eindeutig ein
   Gesundheitsdatum ist:** Kreatinkinase (`ck_u_l`) im Beobachtungskatalog,
   als «ärztliche Leistung» gekennzeichnet. Das ist ein Laborwert. Die
   Datenschutzerklärung sagt derzeit «keine Gesundheitsdaten zu
   diagnostischen Zwecken» — das ist als Zweckaussage richtig, als
   Kategorieaussage nicht ganz. Das gehört jetzt bereinigt, unabhängig von
   S5 (Abschnitt 3).
2. **Zwei der geplanten S5-Merkmale wären nach meiner Einordnung
   Medizinprodukte-Software** und damit nicht bauwürdig: die Red-Flag-Triage
   der Peak Week und das REDs-Screening nach IOC-Konsens. Der Rest lässt
   sich so schneiden, dass er ausserhalb der MDR bleibt (Abschnitt 5).

---

## 2. Die Massstäbe

**Art. 9 DSGVO.** «Gesundheitsdaten» sind nach Art. 4 Nr. 15 alle Daten,
die sich auf die körperliche oder geistige Gesundheit beziehen und aus
denen Informationen über den Gesundheitszustand hervorgehen; Erwägungsgrund
35 fasst das weit. Der EuGH legt Art. 9 weit aus (u. a. C-184/20, 2022:
auch mittelbare Rückschlüsse zählen). Die Art.-29-Gruppe hat 2015 in ihrem
Anhang zu Gesundheitsdaten in Lifestyle- und Wellness-Apps drei Fälle
unterschieden: (a) offensichtlich medizinische Daten, (b) Rohdaten, aus
denen sich mit Kontext ein Gesundheitszustand ableiten lässt, (c) blosse
Fitnessrohdaten ohne solchen Rückschluss («10.000 Schritte»). Rohdaten
werden zu Gesundheitsdaten, wenn sie über längere Zeit gesammelt und mit
anderen Daten verknüpft werden — das ist für eine App mit Verlauf die
Regel, nicht die Ausnahme.

Verarbeitung von Art.-9-Daten ist verboten, es sei denn, ein
Ausnahmetatbestand greift. Für eine Sport-App ist das die **ausdrückliche
Einwilligung** (Art. 9 Abs. 2 lit. a): freiwillig, informiert, für den
bestimmten Zweck, ausdrücklich (kein Vorankreuzen, kein Bündeln mit den
AGB), jederzeit widerrufbar, nachweisbar (Art. 7). Dazu kommen Art. 35
(Datenschutz-Folgenabschätzung bei umfangreicher Verarbeitung besonderer
Kategorien; die deutsche Aufsicht führt Gesundheits-Apps auf ihrer
Muss-Liste), Art. 37 i. V. m. § 38 BDSG (Datenschutzbeauftragter, wenn die
Kerntätigkeit in umfangreicher Art.-9-Verarbeitung besteht), Art. 30
(Verzeichnis) und Art. 32 (Stand der Technik — für Art.-9-Daten ist das
Verschlüsselung, die den Betreiber ausschliesst, nicht nur Zugriffsregeln).

**MDR.** Software ist ein Medizinprodukt, wenn der Hersteller ihr eine
medizinische Zweckbestimmung gibt (Art. 2 Nr. 1 MDR): Diagnose, Verhütung,
Überwachung, Vorhersage, Prognose, Behandlung oder Linderung von Krankheiten
oder Verletzungen — oder die Untersuchung eines physiologischen Vorgangs.
Die MDCG-Leitlinie 2019-11 zur Qualifizierung von Software zieht die Linie
so: Software, die Daten **nur speichert, archiviert, kommuniziert,
durchsucht oder verlustfrei darstellt**, ist kein Medizinprodukt; Software,
die Daten **zu einem medizinischen Zweck verarbeitet, interpretiert oder
daraus etwas ableitet**, ist eines. Ist sie eines, greift Regel 11 (Anhang
VIII): Software, die Informationen für diagnostische oder therapeutische
Entscheidungen liefert, ist mindestens **Klasse IIa** — Benannte Stelle,
Qualitätsmanagement nach ISO 13485, Lebenszyklus nach IEC 62304, klinische
Bewertung, Vigilanz, UDI. Realistisch sind das 12–24 Monate und ein
sechsstelliger Betrag, bevor ein Nutzer das Merkmal sieht. Die
Abgrenzung «Lifestyle und Wohlbefinden» (Erwägungsgrund 19 MDR) trägt nur,
solange die Software **nicht** auf Krankheit, Verletzung oder deren Risiko
zielt. Wichtig: Die Zweckbestimmung ergibt sich aus dem, was die App tut
und wie sie es beschreibt — ein Satz «kein Medizinprodukt» im Impressum
ändert daran nichts, wenn der Bildschirm Symptome zu «ärztlicher Abklärung»
triagiert.

**Anti-Doping.** § 4 AntiDopG stellt Erwerb, Besitz und Anwendung von
Dopingmitteln unter Strafe; wer als Coach Dopinganwendung dokumentiert und
steuert, bewegt sich in der Nähe von Beihilfe. Das steht hier nur der
Vollständigkeit halber: `docs/ausbau.md` §3 hat PEDs bereits
ausgeschlossen, und daran ändert diese Prüfung nichts.

---

## 3. Bestandsaufnahme: was die App heute verarbeitet

| Daten | Wo | Einordnung Art. 9 | Bewertung |
|---|---|---|---|
| Leistungsmesswerte (Sprung, Sprint, Kraft, Ausdauer, Beweglichkeit) | `results` | **Fitnessdaten**, kein Gesundheitsdatum — sie beschreiben Leistung, nicht Gesundheitszustand | tragfähig; die Datenschutzerklärung sagt es so |
| Gewicht, Grösse, Alter, Geschlecht | Profil | Körperdaten; für sich keine Art.-9-Daten, mit Verlauf und Verknüpfung Grauzone | tragfähig, Grauzone benannt |
| Körperfett, Fettmasse, fettfreie Masse | `bodyComposition`, `fat_mass_percent`, `lean_mass_kg` | Grauzone: Körperzusammensetzung lässt Rückschlüsse zu, zielt aber auf Leistung | vertretbar als Leistungsdatum; im Zweifel Art. 9 |
| Schlaf, Energie, Stress, Muskelkater, Ermüdung (Tagebuch, Bereitschaft, DOMS) | `diary`, `readiness`, `doms` | Wellness-Daten. Nach der Art.-29-Gruppe Rohdaten, die **mit Verlauf und Verknüpfung** zu Gesundheitsdaten werden können (Schlafstörung, Stressbelastung) | Grauzone; die App bewertet nichts und sagt «hinschauen, nicht handeln» — das hält den Zweck bei Training. Anwaltlich bestätigen lassen |
| HRV (rMSSD) | `hrv_rmssd_ms` | Physiologischer Messwert; die Aufsicht zählt Herzdaten aus Wearables regelmässig zu Gesundheitsdaten | **eher Art. 9** |
| **Kreatinkinase (CK)** | `ck_u_l`, Quelle «ärztlich» | **Laborwert = Gesundheitsdatum**, ohne Grauzone | **Art. 9 — heute ohne ausdrückliche Einwilligung** |
| SmO2, MIP, WBGT, FMS, Y-Balance | Beobachtungen | Leistungs- bzw. Umgebungsdaten; FMS/Y-Balance zielen auf Bewegungsqualität, nicht Verletzung — solange kein Verletzungsrisiko ausgegeben wird | tragfähig |
| Belegbilder | `photo.ts` | Bilder von Anzeigen/Geräten, keine Körperfotos; nicht hochgeladen | unproblematisch |
| Einwilligung Minderjähriger | `consent.ts` | Datum und Name der einwilligenden Person; Nachweis beim Trainer | tragfähig; für Art. 9 später um Kategorie erweitern |
| Wettkampfdatum, Disziplin, Ziele | Profil | keine | — |

**Drei Folgerungen für heute, unabhängig von S5:**

1. **CK gehört jetzt hinter eine ausdrückliche Einwilligung** — oder aus
   dem Katalog heraus, bis S5 sie mitbringt. Ich empfehle das Zweite für
   den Moment: ein einzelner Laborwert rechtfertigt keine eigene
   Einwilligungsmechanik, und er kehrt mit S5 an der richtigen Stelle
   zurück. Bestehende CK-Einträge bleiben im Bestand und im Export (§89,
   §32); nur die Eingabe neuer entfällt. *Entschieden und umgesetzt am
   21.09.2026: `retired: 'art9'` in `src/data/observations.ts`.*
2. **Die Datenschutzerklärung** sollte sagen, was stimmt: Die App
   verarbeitet keine Gesundheitsdaten **zu medizinischen Zwecken** und
   bewertet keine; einzelne Werte (HRV, Körperzusammensetzung,
   Wellness-Angaben) **können** Gesundheitsdaten sein und werden nur auf
   dem Gerät bzw. mit Synchronisierung unter der eigenen Einwilligung
   verarbeitet. Der Satz «erhebt keine Gesundheitsdaten» ist zu absolut.
   *Umgesetzt am 21.09.2026 in `src/features/legal/texts.ts` (de/en);
   anwaltlich zu prüfen wie der Rest.*
3. **Ein Auftragsverarbeitungsvertrag mit Trainern fehlte.** *Gebaut am
   21.09.2026: Vertragstext (Art. 28 Abs. 3, Aufbau nach den Standard-
   vertragsklauseln 2021/915), Seite `/auftragsverarbeitung`, Annahme je
   Fassung mit Zeitpunkt im Konto auf dem Server, Hinweis im Trainerbereich.
   Der Text ist anwaltlich zu prüfen.* Ein Trainer,
   der Athleten in KYDON führt, ist Verantwortlicher für deren Daten; KYDON
   verarbeitet sie in seinem Auftrag. Art. 28 verlangt dafür einen Vertrag
   — schon für Leistungsdaten, für Art.-9-Daten erst recht. Das gehört in
   die Nutzungsbedingungen für Trainerkonten (Anlage AV-Vertrag,
   Standardklauseln der Kommission oder eigene). Das ist heute die grösste
   formale Lücke, grösser als jede S5-Frage.

---

## 4. Art. 9 für S5: was die Architektur leisten muss

Die vier Punkte aus `docs/ausbau.md` §9 bleiben richtig. Konkret geprüft:

**Getrennte Ablage.** Eine Tabelle `health_entries` mit eigener RLS neben
`athlete_series`, nie darin. Jede Zeile trägt ihre Kategorie. Löschen je
Kategorie ist dann ein `delete where category = …`, ohne den Rest
anzufassen. Die Kontolöschung nimmt sie mit (Liste in
`delete_account_data`, wie bei `athlete_series`).

**Einwilligung je Kategorie.** Sieben Kategorien wie in der v4-Vorlage:
Körperdaten, Fotos, Wellness/Recovery, Zyklus, Laborwerte, Symptome und
Verletzungen, Supplemente und Medikation. Datenmodell je Kategorie:
`grantedAt`, `withdrawnAt`, `textVersion`, `grantedBy` (bei Minderjährigen
die einwilligende Person dem Namen nach — wie in `consent.ts`). Die
Einwilligung ist ein eigener Bildschirm mit eigenem Text je Kategorie,
nicht ein Ankreuzfeld in den AGB; ohne Einwilligung ist die Kategorie in
der Oberfläche nicht vorhanden, nicht ausgegraut. Widerruf ist ein Tipp
und löst die Löschung der Kategorie aus — auf dem Gerät und, mit
Synchronisierung, auf dem Server (Grabstein, dann Purge; hier ohne die
90 Tage, sondern sofort hart, weil es keine Zweitgerätfrage gibt, die eine
Löschung überwiegt). Das Sicherheitsprotokoll bekommt die Ereignisse
`health_consent_granted`, `health_consent_withdrawn`, `health_share_granted`,
`health_share_revoked`.

**Zwei Kategorien brauchen einen zweiten Blick.** *Zyklus* und *Libido*
sind nicht nur Gesundheitsdaten, sondern berühren Art. 9 auch als Daten
über das **Sexualleben**. Das ändert die Rechtsgrundlage nicht (weiterhin
ausdrückliche Einwilligung), aber die Schutzbedarfsstufe und die
Formulierung der Einwilligung. *Körperbild* ist ein Datum über die
psychische Gesundheit und liegt nahe an Essstörungsdiagnostik — die App
darf es erfassen, aber niemals bewerten.

**Verschlüsselung, die den Betreiber ausschliesst.** Für `health_entries`
reicht RLS nicht als Antwort auf «wer kann die Blutwerte lesen». Empfehlung:
Verschlüsselung auf dem Gerät (AES-GCM über WebCrypto) mit einem Schlüssel,
der aus einer **Wiederherstellungsphrase** abgeleitet wird, die der Nutzer
einmal sieht und selbst verwahrt — nicht aus dem Passwort, weil ein
Passwort-Zurücksetzen sonst die Daten kostet. Der Server sieht nur
Chiffrat; `payload` in `health_entries` ist ein verschlüsselter Blob, in
Klarspalten stehen nur Kategorie, Tag und Zeitstempel. Der Preis bleibt:
**Phrase verloren = Gesundheitsdaten verloren.** Das kollidiert mit §89 und
wird so aufgelöst: (1) §32 gilt — der Export enthält die Daten im Klartext,
und die App verlangt vor der ersten Art.-9-Eingabe einen Export;
(2) der Bildschirm sagt den Preis vor der Einwilligung, nicht danach;
(3) Trainings- und Leistungsdaten sind von der Phrase unabhängig. Wer das
nicht will, kann S5 auch ohne Synchronisierung nutzen — nur auf dem Gerät.

**Trainerzugriff je Kategorie.** `can_view_athlete` sieht heute alles.
Für `health_entries` braucht es eine eigene Freigabe je Kategorie durch
den Athleten (`health_shares`), mit sofortigem Entzug. Bei
Ende-zu-Ende-Verschlüsselung heisst Freigabe: der Kategorieschlüssel wird
für den öffentlichen Schlüssel des Trainers verschlüsselt (Umschlag). Das
ist Aufwand — und der Grund, warum S5 nicht «ein paar Felder mehr» ist.

**Datenschutz-Folgenabschätzung.** Vor S5 durchführen und dokumentieren
(Art. 35): Beschreibung, Notwendigkeit, Risiken, Massnahmen. Mit
Ende-zu-Ende-Verschlüsselung fällt das Restrisiko deutlich; ohne sie wäre
die DSFA schwer zu bestehen. **Datenschutzbeauftragter:** ob § 38 BDSG
greift, hängt davon ab, ob die Art.-9-Verarbeitung «Kerntätigkeit» wird —
mit einer Elite-Stufe, die genau das verkauft, spricht einiges dafür.
Frage an den Anwalt.

**Minderjährige.** Art. 8 DSGVO (16 Jahre in Deutschland für Dienste der
Informationsgesellschaft) und die Einwilligung der Erziehungsberechtigten
in Art.-9-Verarbeitung. Empfehlung: S5 erst ab 18 freischalten. Das ist
eine Produktentscheidung, die die Rechtsfrage schlicht vermeidet, und im
Nachwuchsbereich ist kein Blutwert-Tracking in einer App nötig.

**Drittland.** Supabase in eu-central-1 (AWS Frankfurt); AWS ist
US-Anbieter, gedeckt durch das EU-US Data Privacy Framework und
Standardvertragsklauseln — mit Ende-zu-Ende-Verschlüsselung sieht AWS
ohnehin nur Chiffrat. Stripe (Irland) sieht keine Gesundheitsdaten. Netlify
liefert nur statische Dateien aus. Das ist tragfähig; in die DSFA aufnehmen.

---

## 5. MDR: jedes S5-Merkmal einzeln

| Merkmal aus v4 | Was es tut | Einordnung | Empfehlung |
|---|---|---|---|
| **Blutwerte speichern, Verlauf zeichnen** | Eingabe, Anzeige, Verlauf | Speichern und verlustfreie Darstellung: **kein Medizinprodukt** (MDCG 2019-11) | bauen |
| Blutwerte mit **Labor-Referenzbereich** | Referenz niedrig/hoch neben dem Wert | Solange der Referenzbereich **vom Nutzer aus dem Laborbefund** eingetragen und nur wiedergegeben wird: Darstellung. Sobald die App **eigene** Referenzen mitbringt oder Werte als «auffällig» markiert: Interpretation → Medizinprodukt, Klasse IIa | bauen ohne eigene Referenzen und ohne Markierung; der Befund des Labors ist die Quelle, die App der Ordner |
| **Präanalytik** (Uhrzeit, nüchtern, Training am Vortag, Labor, Zyklusphase, Infekt) | Kontext zur Messung | Metadaten, keine Interpretation | bauen |
| **Symptom-Timeline**, GI-Symptome 0–3 | Erfassung über Zeit | Erfassung und Darstellung: kein Medizinprodukt | bauen — ohne Bewertung |
| **Red-Flag-Triage** («MEDIZINISCHE ABKLÄRUNG» bei Synkope, Verwirrtheit, Erbrechen, Palpitationen) | Software erkennt Symptommuster und triagiert | **Medizinprodukt**: Verarbeitung von Symptomdaten zum Zweck der Erkennung eines behandlungsbedürftigen Zustands; Regel 11 → mindestens IIa. Symptom-Checker werden von BfArM und MDCG genau so eingeordnet | **nicht bauen.** Stattdessen ein **statischer**, immer sichtbarer Hinweistext am Symptom-Bildschirm («Bei Ohnmacht, Verwirrtheit, anhaltendem Erbrechen oder Herzrasen: ärztliche Hilfe, nicht diese App»). Ein allgemeiner Hinweis ohne Datenverarbeitung ist Information, kein Medizinprodukt |
| **REDs-Screening** nach IOC-Konsens (Screening → Risikoeinschätzung → Abklärung) | Risikoeinschätzung eines Syndroms | **Medizinprodukt**: Vorhersage/Erkennung eines Krankheitsbildes | **nicht bauen** |
| **Energy Availability** (kcal/kg FFM) | Rechengrösse aus Zufuhr, Verbrauch, fettfreier Masse | Als reine Rechengrösse mit Formel und Quelle: Grenzfall, eher Lifestyle. Mit **Schwelle** («unter 30: ja/nein»): die Schwelle ist ein klinischer Cutoff für ein Krankheitsrisiko → Interpretation | Rechengrösse bauen, **Schwelle nicht**; Text wie beim Referenzumsatz: «Formel, Quelle, kein Ziel, keine Diagnose» |
| **Zyklus** | Phase als Selbstangabe, Tag | Erfassung: kein Medizinprodukt. **Vorhersage** von Ovulation/Fruchtbarkeit oder Verhütungszweck: Medizinprodukt (Zyklus-Apps mit Verhütungszweck sind zertifiziert, Klasse IIb) | nur Selbstangabe, keine Vorhersage, kein Kalenderalgorithmus |
| **Körperbild, Libido** | Selbstangabe-Skalen | Erfassung: kein Medizinprodukt. Bewertung («Hinweis auf …»): Medizinprodukt | erfassen, nie bewerten; Art.-9-Fragen siehe oben |
| **Supplemente, Medikation** | Liste mit Datum | Erfassung: kein Medizinprodukt. Wechselwirkungs- oder Dosishinweise: Medizinprodukt | erfassen als Liste; keine Hinweise. Verschreibungspflichtiges nur als Freitext des Nutzers |
| **PEDs** | — | AntiDopG | **nicht bauen** (bereits entschieden) |
| **Peak Week** (Baseline, Mock Peak, Tage, Show Day, Post-Contest) | Protokoll von Gewicht, Look, GI-Komfort, Posing, Fotos je Tag | Dokumentation: kein Medizinprodukt. **Wasser-, Natrium-, Kohlenhydrat-Vorgaben**: keine MDR-Frage, aber §81 — und bei Wasser/Elektrolyten mit echtem Gesundheitsrisiko | Dokumentation bauen; keine Mengenvorgaben (v4 macht das bereits so); Look-Index als Heuristik gekennzeichnet |
| **Fotos** zur Verlaufsdokumentation | standardisierte Aufnahme | kein Medizinprodukt; Art. 9 (Körperbild), hoher Schutzbedarf; nicht biometrisch, solange keine Identifikation | bauen mit Ende-zu-Ende-Verschlüsselung, nie unverschlüsselt hochladen |
| **Sportmodule** (zehn Disziplinen) | Kennzahlen je Sportart | Leistungsdaten | bauen, gehört eher zu S2/S3 als zu S5 |

**Die Linie, die überall gilt:** KYDON darf **speichern, ordnen, darstellen
und rechnen, was der Nutzer selbst beurteilt** — es darf nicht **erkennen,
einstufen, warnen oder triagieren**. Das ist dieselbe Linie wie §81 und
§82, jetzt mit rechtlicher Konsequenz: Ein Signal im Cockpit («Schlaf
unter dem eigenen Mittel») ist Statistik über Trainingsdaten. «Hinweis auf
Übertraining» wäre ein Medizinprodukt.

**Zur bestehenden App:** Bereitschaft (`readiness.ts`) und Cockpit-Signale
bleiben diesseits der Linie, weil sie ausdrücklich subjektiv sind, keine
Trainingsfreigabe ableiten und keinen Krankheitsbezug haben. Das gilt es
bei jeder Erweiterung zu halten: Kein Signal darf je einen Krankheits-,
Verletzungs- oder Risikonamen tragen.

---

## 6. Empfehlung: der Umfang von S5

**Bauen (Elite, Art. 9, eigene Einwilligung je Kategorie, Ende-zu-Ende-
verschlüsselt, ab 18):**

- Laborwerte mit Präanalytik und vom Nutzer eingetragenem Laborreferenz-
  bereich; Verlauf; keine Markierung, keine eigenen Referenzen.
- Symptom-Timeline und GI-Symptome als Erfassung; statischer Sicherheits-
  hinweis am Bildschirm, keine Triage.
- Zyklusphase als Selbstangabe; keine Vorhersage.
- Körperbild und Libido als Skalen; keine Bewertung.
- Supplemente und Medikation als Liste; keine Hinweise.
- Energy Availability als Rechengrösse mit Formel und Quelle; keine Schwelle.
- Peak Week als Protokoll mit Fotos; keine Mengenvorgaben.
- Sportmodule (als Leistungsdaten; ohne Art.-9-Mechanik).

**Nicht bauen:** Red-Flag-Triage, REDs-Screening, Zyklusvorhersage,
Wechselwirkungshinweise, jede Schwelle mit Krankheitsbezug, PEDs.

**Vorher, unabhängig von S5:** CK-Eingabe aussetzen oder hinter
Einwilligung stellen; Datenschutzerklärung präzisieren; AV-Vertrag für
Trainerkonten; DSFA anlegen; Frage Datenschutzbeauftragter klären.

**Was das für Elite bedeutet.** Elite verkauft dann Ordnung und Verlauf
für Daten, die der Nutzer und sein Arzt beurteilen — nicht Diagnostik. Das
ist weniger, als v4 als Excel beim Trainer tun konnte, und mehr, als eine
App im Store rechtssicher tun darf. Der Preis von 199 € trägt sich über
Peak Week, Laborverlauf und die Sportmodule; die Triage war nie das
Verkaufsargument, sie war die Sorgfalt des Trainers — und die bleibt beim
Trainer.

---

## 7. Was ich nicht entscheiden kann

- Ob HRV, Körperzusammensetzung und Wellness-Verlauf **jetzt schon** als
  Art.-9-Daten mit ausdrücklicher Einwilligung zu behandeln sind, oder ob
  die Einordnung als Fitnessdaten mit dokumentierter Begründung trägt.
  Meine Einschätzung: HRV eher ja, der Rest vertretbar nein — aber das ist
  genau die Frage für den Datenschutzanwalt.
- Ob ein **statischer Hinweistext** am Symptom-Bildschirm wirklich
  ausserhalb der MDR bleibt, wenn er auf demselben Bildschirm steht, auf
  dem Symptome eingetragen werden. Meine Einschätzung: ja, weil keine
  Datenverarbeitung zu medizinischem Zweck stattfindet — aber die Grenze
  zur «Zweckbestimmung durch Kontext» ist genau der Punkt, den ein
  Medizinprodukterechtler prüfen muss.
- Ob die Energy-Availability-Rechengrösse ohne Schwelle unproblematisch
  ist oder ob schon die Formel (die aus der REDs-Literatur stammt) eine
  Zweckbestimmung nahelegt.
- Ob ein Datenschutzbeauftragter zu bestellen ist.
- Wie der AV-Vertrag mit Trainern abgeschlossen wird (in den AGB durch
  Zustimmung, oder als eigenes Dokument je Trainerkonto).

---

## 8. Fragen an die Fachanwälte

**Datenschutz (Art. 9):**

1. Welche der heute erfassten Werte (Tabelle in Abschnitt 3) sind
   Gesundheitsdaten im Sinne von Art. 4 Nr. 15, und ab wann kippt ein
   Wellness-Verlauf?
2. Genügt die geplante Einwilligungsmechanik (je Kategorie, eigener Text,
   Versionsstand, Widerruf mit sofortiger Löschung) den Anforderungen von
   Art. 7 und Art. 9 Abs. 2 lit. a?
3. Ist KYDON gegenüber Trainerkonten Auftragsverarbeiter, und welche Form
   muss der Vertrag nach Art. 28 haben? Gibt es Fälle gemeinsamer
   Verantwortlichkeit (Art. 26), etwa bei der Trainer-Athlet-Freigabe?
4. Ist eine DSFA für S5 verpflichtend, und in welchem Umfang; ist ein
   Datenschutzbeauftragter zu bestellen?
5. Trägt die Altersgrenze 18 für S5, und was gilt für Trainerkonten, die
   Minderjährige führen, wenn S5 für den Trainer freigeschaltet ist?
6. Genügt Ende-zu-Ende-Verschlüsselung mit nutzergehaltener Phrase als
   Massnahme nach Art. 32 — und ist der damit verbundene mögliche
   Datenverlust bei Phrasenverlust hinreichend aufgeklärt, wenn Export und
   Hinweis vorher stehen?

**Medizinprodukterecht (MDR):**

7. Bleibt die App mit dem in Abschnitt 6 beschriebenen Umfang ausserhalb
   von Art. 2 Nr. 1 MDR — insbesondere Laborverlauf mit nutzereingetragenem
   Referenzbereich, Symptom-Erfassung mit statischem Hinweistext, Energy
   Availability ohne Schwelle?
8. Wo genau liegt die Grenze zwischen «verlustfreier Darstellung» und
   «Interpretation» bei Verlaufsgrafiken von Laborwerten (Trendlinie?
   Mittelwert? Vergleich zweier Messungen mit Messfehler, wie die App es
   für Leistungswerte tut)?
9. Ändert die Vermarktung als «Gesundheitsschicht» oder «Elite» die
   Zweckbestimmung, und welche Formulierungen in Preisseite, Store-Text und
   Rechtstexten sind zu vermeiden?
10. Falls später doch eine Triage gewollt ist: welcher Weg wäre der
    kleinste (eigenständige Klasse-IIa-Software neben der App, Partner mit
    zertifiziertem Produkt, oder gar nicht)?

---

## 9. Was aus dieser Prüfung in den Code gehört

Nur wenn du es so entscheidest — hier steht, was es wäre:

| Massnahme | Umfang | Wann |
|---|---|---|
| CK-Eingabe aussetzen (Bestand bleibt) | `src/data/observations.ts`: `retired: 'art9'`; Verlauf und Export lesen ihn weiter | **erledigt** 21.09.2026 |
| Datenschutzerklärung präzisieren | `src/features/legal/texts.ts`, Abschnitt «Keine medizinische Datenverarbeitung» | **erledigt** 21.09.2026 |
| AV-Vertrag für Trainerkonten | `dpaDocument` in `src/features/legal/texts.ts`, Seite `/auftragsverarbeitung`, Annahme mit Fassung und Datum in `accounts` (Migration `dpa_acceptance`), Hinweis im Trainerbereich | **gebaut** 21.09.2026 — Text anwaltlich zu prüfen |
| DSFA-Dokument anlegen | `docs/dsfa.md` nach dem Muster der Aufsicht | vor S5 |
| `health_entries`, `health_consents`, `health_shares` mit RLS, Ende-zu-Ende-Verschlüsselung, Protokollereignisse | Migration + `src/lib/health/` | S5 |
| Altersgrenze 18 für S5 | Schranke wie bei Stufen | S5 |
| Regel in den Prüffällen: kein Signal, kein Text mit Krankheits-, Verletzungs- oder Risikonamen | `tests/health.spec.ts`, wie der «kein Ziel»-Fall in `nutrition.spec.ts` | S5 |
