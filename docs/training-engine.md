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
| 9c | Pilot Combat Grappling: Anforderungsprofil, Regeln, Planbauer, Retest-Schleife | offen |
| 9d | Pilot Hybrid (HYROX, Hybrid Training) | offen |
| 9e | Pilot Combat Striking | offen |
| 9f | Session Player, Coach Override, Wochenprüfung, Block-Bericht | offen |

Jede Etappe: Prüfung der Doktrin (§50), Texte in 8 Sprachen, Prüffälle, Regeln mit Prüfstatus. Preise ändern wir nicht ohne Rückfrage; die in der Recherche vorgeschlagene Stufe «Training Pro» ist ein Vorschlag, keine Entscheidung.

## Was die fachkundige Person prüft

Pro Regel: stimmt die Quelle mit der Aussage überein, passt die Population, sind Grenzen und Sicherheitsangaben vollständig, ist die Spezifität je Sportart ehrlich. Das Ergebnis steht im Register (`review`: Name, Datum, Anmerkung). Ohne diese Zeile ist die Regel `unreviewed`.
