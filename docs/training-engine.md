# Training Engine: Pläne aus belegten Regeln

**Stand:** 4. Oktober 2026. Grundlage: Nachtrag 1 in [produktdoktrin.md](produktdoktrin.md) und die Recherche «KYDON Training Engine Deep Research Master v3» (Kapitel 40 bis 72).

## Entscheidungen des Inhabers

| Frage | Entscheidung |
|---|---|
| Darf KYDON Pläne aus belegten Regeln erzeugen? | Ja. Doktrin geändert (Nachtrag 1). |
| Pilot-Sportwelten | Alle drei, nacheinander: Combat Grappling (Judo, Ringen, BJJ), Hybrid (HYROX, Hybrid Training), Combat Striking (Boxen, Kickboxen, Muay Thai). |
| Fachliche Prüfung | Eine fachkundige Person prüft jede Regel vor dem Livegang. Bis dahin `unreviewed` und nur im Vorschauschalter. |
| Neubau? | Nein, schrittweise Ergänzung. Die Recherche selbst sagt: «Nichts davon muss gelöscht werden, die größte Änderung ist die Verknüpfung.» |

## Die Schleife

`ASSESS → IDENTIFY → PLAN → TRAIN → FUEL → MONITOR → RETEST → ADAPT`

| Schritt | Heute vorhanden | Neu |
|---|---|---|
| ASSESS | Testkatalog, Testtag, Kiosk | – |
| IDENTIFY | Anforderungslücke, Data Confidence, Messfehler | Lücke → Trainingsintention |
| PLAN | Wettkampf-Rahmen, Wochenziel | Block- und Wochenbauer, Regelobjekte |
| TRAIN | Trainingslog | Einheit mit Intention und Regel |
| FUEL | Fuel-Regeln | Bindung an die Einheit |
| MONITOR | Belastung, Check-in, Tagebuch | Rückkopplung in die Planprüfung |
| RETEST | Erinnerungen | Messung am Blockende, fest im Plan |
| ADAPT | Entscheidungslog | Coach Override mit Grund |

## Regeln der Regeln

- Ein Regelobjekt (`EvidenceRule`) hat Quelle, Stärke, Spezifität je Sportart, Grenzen, Sicherheitsangaben und Prüfstatus. Das Register ist die einzige Stelle, an der Dosierungen stehen.
- Der Planbauer wählt aus dem Register und rechnet; er schreibt keine Zahl selbst. Jede Zahl im Plan lässt sich auf eine Regel und deren Quelle zurückführen (Source-to-Rule Traceability, Kapitel 69).
- Regeln mit `forbiddenForAutoPrescription` oder ohne Prüfung werden nie automatisch verordnet.
- Harte Einheiten (Sparring, Rennsimulation) zählen in das Budget für hohe Intensität; eine VO₂max-Regel wird nicht blind mehrmals pro Woche kopiert.
- Quellen stehen im Quellenregister mit dem Hinweis aus der Recherche: Zahlen aus Abstracts, vor der Übernahme im Volltext prüfen.

## Etappen

| Etappe | Inhalt | Stand |
|---|---|---|
| 9a | Doktrin-Nachtrag, diese Seite, Plan | ✅ |
| 9b | Fundament: Typen, Regelregister mit Prüfstatus, Gate, erste Regel (Norwegian 4×4), Tests | ✅ |
| 9c | Pilot Combat Grappling: Regeln, Planbauer, Vorschau-Bildschirm `/plan`, Messung am Blockende | ✅ (Regeln ungeprüft) |
| 9d | Pilot Hybrid (HYROX, Hybrid Training) | ✅ (Regeln ungeprüft) |
| 9e | Pilot Combat Striking | offen |
| 9f | Session Player, Coach Override, Wochenprüfung, Block-Bericht | offen |

Jede Etappe: Prüfung der Doktrin (§50), Texte in 8 Sprachen, Prüffälle, Regeln mit Prüfstatus. Preise ändern wir nicht ohne Rückfrage; die in der Recherche vorgeschlagene Stufe «Training Pro» ist ein Vorschlag, keine Entscheidung.

## Was die fachkundige Person prüft

Pro Regel: stimmt die Quelle mit der Aussage überein, passt die Population, sind Grenzen und Sicherheitsangaben vollständig, ist die Spezifität je Sportart ehrlich. Das Ergebnis steht im Register (`review`: Name, Datum, Anmerkung). Ohne diese Zeile ist die Regel `unreviewed`.

## Pilot Grappling (Etappe 9c)

**Regeln im Register** (alle `unreviewed`, Quellen ohne Volltextprüfung): `vo2_4x4`, `rst_30m` (3 Sätze × 6 × 30 m, 2×/Woche, 6 Wochen), `max_strength_80` (ab 80 % 1RM, 2 bis 3 Sätze, mindestens 2×/Woche), `power_30_70` (30 bis 70 % 1RM, höchstens 24 Wiederholungen je Satz), `plyo_combat` (2 bis 3×/Woche, 4 bis 12 Wochen). Die Dosierungen stammen aus der Recherche (Kap. 2.2 bis 2.7 und die Ergänzungen v3); bei zwei Stufen (allgemein hoch, Kampfsport mittel) gilt die vorsichtigere.

**Planbauer** (`src/domain/trainingPlan.ts`): nimmt die Anforderungslücke der Disziplin (`requirementGap`), nur offene Lücken mit mindestens zwei Messungen, wählt je Lücke die erste passende Regel, verteilt auf freie Tage und schließt mit einer Messung am Blockende. Er benennt, was er nicht plant und warum: zu wenige Messungen, keine Regel, keine Pulsziele ohne bekannte HFmax, kein freier Tag, zu lang, Budget ausgeschöpft, keine offene Lücke.

**Ohne Regel (Lücken des Piloten):** Kraftausdauer, Griffausdauer, Agilität. Die Recherche nennt dafür keine Dosierung; der Bauer plant sie nicht, sondern sagt es.

**Planungsregeln der App, Produktentscheidungen, nicht Literatur, Teil der fachlichen Prüfung:**
1. Höchstens eine Schlüsseleinheit je Tag, nie am Tag harter Runden.
2. Hohe Intensität nicht am Tag vor oder nach harten Runden.
3. Budget hoher Intensität: 3 Einheiten je Woche, harte Runden zählen mit.
4. Wo die Regel keine Frequenz nennt: eine Einheit je Woche.
5. Blocklänge: Eingabe, Vorgabe sechs Wochen.

**Offen für die Fachperson:** Übung, Sprungformen und Wiederholungszahl bei Kraft legt keine Quelle fest; sie bleiben beim Trainer. Das Alter der Stichproben (häufig unter 18 bei Plyometrie) und der Frauenanteil begrenzen die Übertragung.

**Schalter:** `VITE_TRAINING_PLAN=preview` zeigt `/plan` mit ungeprüften Regeln, jede Einheit als «Ungeprüft» gekennzeichnet. Ohne den Schalter ist der Bildschirm aus und nicht in «Mehr» verlinkt. Produktiv bleibt er aus, bis eine fachkundige Person Regeln geprüft hat.

## Pilot Hybrid (Etappe 9d)

**Zuordnung:** die Disziplinen `hyrox` und `hybrid` gehören zur Sportfamilie `hybrid`. Die fünf Regeln aus 9c gelten auch hier, mit der Spezifität, die die Recherche nennt: 4 × 4 und wiederholte Sprints nur übertragen (`EXTRAPOLATED`), Kraft und Power allgemein (`GENERAL`). Plyometrie gilt nur für Kampfsport.

**Neu im Planbauer:**
- Schlüsseleinheiten werden in Hybridplänen auf getrennte Tage gelegt (Concurrent-Training-Literatur: Abstand bevorzugt); sind nur benachbarte Tage frei, werden sie genutzt.
- Hinweise zur Studienlage mit Quellen: bei Kraft plus harter Ausdauer der Hinweis zum gleichzeitigen Training (keine feste Reihenfolge belegt, kleiner Nachteil bei der Beinkraft von Männern, keine Geschlechtsregel); bei offener Kraftausdauer der Hinweis, dass für stationsspezifisches Training keine Dosis belegt ist.
- Neue Quellen im Register (Verfasser aus dem Quellenregister der Recherche, Kap. 68): Huiberts 2024, Held 2026, Llanos-Lagos 2025, Brandt 2025, Villarroel López 2025. Die Quellen aus 9c tragen jetzt ihre Verfasser.

**Was für Hybrid bewusst nicht geplant wird, weil keine Dosis belegt ist:** Schwellenintervalle, aerobe Grundlage, stationsspezifische Einheiten (HYROX_STATIONS), Compromised Running. Die Recherche beschreibt Blockstrukturen (Kap. 8 und 9) als Entwurf, nennt aber keine Studie mit Dosierung. Der Bauer sagt das («keine passende Regel»), statt sie zu erfinden. Wer diese Einheiten aufnehmen will, braucht eine Quelle und eine Fachperson; dann kommt je eine Regel ins Register.

**HYROX-Daten** (Rennzeiten, Pace-Drop, Anteil Laufen) sind Beobachtungen und Benchmarks, keine Interventionsevidenz. Sie dienen später der Anforderungsanzeige, nicht der Dosierung.
