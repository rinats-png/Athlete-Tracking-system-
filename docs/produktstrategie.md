# Produktstrategie — Gestaltung, Bindung, Vorteil

Festgehaltene Entscheidungen und Befunde aus der Durchsicht des
Auslieferungsstands — und der Umsetzungsstand dazu (Abschnitt 5).

---

## 1. Gestaltung — Befund und Regel

### Was trägt

Der statische Teil des Systems ist belastbar und wird gut altern:

- Vier Tiefenebenen, die eine **Bedeutung** tragen statt nur einen Schatten.
- Kontraste nachgerechnet und am Token belegt, nicht nach Augenmass gesetzt.
- Chart-Serien gegen Farbfehlsichtigkeit geprüft.
- Mono-Tabellenziffern für Messwerte, gesperrte Versalien für Beschriftungen.
  Diese Typografie sagt «Messgerät», bevor ein Wert gelesen ist — die
  stärkste Einzelentscheidung im System.
- Mondlicht/Mondstein als umgekehrtes Paar mit EINER Akzentlogik.

### Was zu viel ist

Die Grammatik der Halo-Landingpage ist in die Arbeitsbildschirme
durchgesickert. Eine Landingpage wird einmal gelesen, ein Arbeitsbildschirm
hundertmal.

- `[data-reveal]`: `translateY(100px) rotateX(15deg) scale(0.9) blur(10px)`,
  bei Karten über **1600 ms**. Auf der Übersicht, die jemand dreimal die Woche
  öffnet, ist das Reibung.
- Animiertes `filter: blur()` macht Text während des Übergangs unlesbar.
  Einmal beim Intro trägt es die Aussage «eine Messung, die scharf stellt».
  Bei jedem Bildschirmwechsel liest der schnelle Leser Unschärfe.
- Intro-Sequenz: fünf Sekunden **je Sitzung** bei einer App, die man öffnet,
  um eine Zahl einzutragen.

### Regel — und die Korrektur des Befunds

- **Signature-Momente** — Anmeldung, Intro, Jahresrückblick, Berichtsdeckblatt
  — behalten die volle Halo-Sprache.
- **Arbeitsbildschirme** bekommen nur `.rise`: 16 px von unten, keine
  Rotation, keine Unschärfe, 450 ms.

**Nachgeprüft im Code:** die Regel gilt bereits. `[data-reveal]` mit
Rotation und Unschärfe wird ausschliesslich im Willkommensbildschirm
(`features/auth/WelcomeScreen.tsx`) verwendet; jeder Arbeitsbildschirm nutzt
`.rise`. Die Intro-Sequenz läuft nicht «je Sitzung», sondern nur nach einer
ausdrücklichen Anmeldung — das Konto wird beim Öffnen aus dem Speicher
gelesen, und dann läuft keine Sequenz. Der ursprüngliche Befund war in
diesen zwei Punkten zu scharf. Geändert wurde deshalb nichts; die Regel
steht hier, damit sie beim nächsten Umbau nicht verloren geht.

### Beobachtung zur Alterung

Die Partikel-Canvas (ParticleGate, ParticleSphere, HaloField, zusammen rund
700 Zeilen) sind das einzige Element, das datiert altern wird. Leuchtringe
lesen sich als 2023–2025. Typografie und Ebenensystem lesen sich in fünf
Jahren noch richtig. Wenn irgendwann etwas fällt, fällt der Ring.

### Das grössere Risiko

Nicht Überdrehtheit, sondern **Kälte**. «Fast klinisch, Daten wie
Sternkarten» ist für ein Labor richtig und für den Einzelathleten, der 29,90 €
gezahlt hat und etwas über seinen Fortschritt empfinden will, ein
Bindungsproblem.

---

## 2. Bindung von Einzelathleten

### Das Fundament, das man nicht wegdiskutieren kann

`src/data/pricing.ts` hält fest: Diagnostik ist periodisch, zwei bis vier
Runden im Jahr. Das Produkt ist bewusst so gebaut, dass man es selten
braucht. Ein Feature, das häufigeres Testen nur vortäuscht, ist gleichzeitig
eine Lüge und ein Trainingsfehler — wer einen CMJ wöchentlich misst, misst
Rauschen, und die App weiss das, sie führt den Messfehler mit.

Mehr Kontingentverbrauch darf deshalb nur aus Gründen kommen, die einer
Prüfung standhalten.

### Hebel, nach Wirkung sortiert

1. **Den Report im Moment der Veränderung verkaufen, nicht in der Preisliste.**
   Heute liegt der Kaufweg unter Profil → Preise, dem Ort, an dem niemand
   kauft. Der richtige Moment: Erinnerung feuert → Athlet testet →
   automatischer Vergleich → «das ist eine echte Veränderung, nicht der
   Messfehler» → **dort** der Report. Alle Bauteile existieren
   (`RemindersScreen`, `NextTestCard`, `compareAssessments`, Messfehler am
   Ergebnis); es fehlt das Schliessen der Schleife.

2. **Beobachtungswerte als Bindung zwischen den Runden.**
   `features/observations/` existiert. Körpergewicht, Ruhepuls, Schlaf, RPE:
   billige Eingaben, die die App wöchentlich öffnenswert machen, ohne sich als
   Diagnostik auszugeben — und sie verbessern die Diagnostik, weil ein CMJ bei
   drei Kilo mehr Körpergewicht etwas anderes bedeutet.

3. **Wettkampfdatum als Rahmen.** Rückwärtsplanung auf den Wettkampf:
   Grundlagencheck, spezifischer Test, Formcheck. Drei Runden auf ein Ziel
   machen das Viererpaket zur natürlichen Kaufentscheidung. «Eine Saison»
   verkauft sich anders als «vier Reports».

4. **Performance Card als Bild.** Ein 1080x1350-Bild mit Radar, Deltas und
   Ein-Satz-Zusammenfassung. Das Stück, das geteilt wird — und das
   emotionale Gegengewicht zur klinischen Tonlage.

### Beobachtung zur Preisstaffel

Bei zwei bis vier Tests im Jahr ist das Zehnerpaket ein Drei- bis
Fünfjahresvorrat. Es wird sich praktisch nie verkaufen und wirkt als
Lockvogel, den ein rechnender Käufer durchschaut. Entweder als
**übertragbares** Team-/Familienpaket neu positionieren oder als
«Saison + Trainerkopie». So wie es steht, arbeitet es nicht.

---

## 3. Der unfaire Vorteil

### Die Grenze, die zuerst gilt

`src/domain/trainingFocus.ts` hält §81 fest: keine Übungsvorschläge, keine
Trainingsempfehlungen, keine Textbausteine — der Satz kommt vom Trainer.

Ein früher erwogener Vorschlag («Trainingsempfehlung aus dem Limiter») hätte
genau diese Grenze gerissen und ist deshalb **verworfen**.

Die Grenze ist zugleich die Lösung: Der Vorteil kommt aus der **Diagnose**,
nicht aus der Verschreibung. Die App sagt, **wo** die acht Wochen hingehören.
Was dort getan wird, sagt der Trainer.

### Woher der Vorteil tatsächlich kommt

Ein unfairer Vorteil im Sport entsteht fast nie daraus, dass jemand mehr
weiss, sondern daraus, dass jemand **keine Zeit verschwendet**. Der Konkurrent
ohne die App trainiert nicht weniger — er trainiert acht Wochen die falsche
Eigenschaft, wechselt das Programm wegen einer Veränderung, die Rauschen war,
und merkt am Wettkampftag, dass die Form fehlt.

### Für den Athleten

1. **Anforderungslücke.** Differenz zwischen Anforderungskontur der Disziplin
   (`dimensionWeights`) und gemessenem Profil, gewichtet danach, wie sehr die
   Achse für diese Disziplin zählt. Ergibt eine Rangfolge, wo acht Wochen am
   meisten bringen. Sagt **wo**, nicht **was** — §81 bleibt gewahrt.
2. **Formvorhersage auf den Wettkampftag.** Trend je Test plus Messfehler,
   hochgerechnet auf das eingetragene Wettkampfdatum, mit Band.
3. **Rauschen nicht hinterherlaufen.** Existiert bereits, muss als Vorteil
   benannt werden. Wer nicht weiss, ob +2 cm echt sind, wechselt alle drei
   Wochen das Programm und adaptiert nie.
4. **Taktisches Profil aus dem Kohortenvergleich.** «88. Perzentil
   Schnellkraft, 41. Kampfausdauer, in deiner Gewichtsklasse» führt zu einer
   Wettkampfstrategie, nicht zu einem Trainingsplan. Die einzige Zahl, die ein
   Einzelathlet unmöglich selbst herstellen kann — und ein Netzwerkeffekt.
5. **Retest-Fenster.** Wann eine Wiederholung aussagekräftig ist.

### Für den Trainer — hier liegt der kommerzielle Hebel

6. **Gruppen-Heatmap.** Liegen 14 von 20 Athleten auf derselben Achse unter
   der Anforderung, sind das nicht 14 Einzelprobleme, sondern ein Loch in der
   Programmierung des Trainers. Das wertvollste und unbequemste Feature.
7. **Wirksamkeitsnachweis.** Zwanzig Athleten mit gemessener Veränderung über
   zwölf Monate, vorlegbar an Eltern, Vorstand, Sponsor. Der geschäftliche
   Vorteil des Trainers und der stärkste Bindungsgrund für die Stufe. Der
   Jahresbericht ist für den Trainer wichtiger als für den Athleten.
8. **Time-to-correct-programming beim Neuzugang.** Aus einem halben Jahr
   Beobachtung wird ein Testtermin.
9. **Verfügbarkeit statt Leistung.** Bereitschaftstrend über den Kader, der
   den fallenden Athleten markiert, bevor er ausfällt. Nur als **Hinweis auf
   ein Gespräch** — §82 bleibt gewahrt, keine Trainingsfreigabe.
10. **Übergabefähigkeit.** Trainer-, Vereins-, Kaderwechsel mit vollständiger
    Messhistorie statt mit nichts.

### Die Falle, und die Regel dagegen

«Unfairer Vorteil» zieht Produkte zuverlässig Richtung Pseudowissenschaft:
HRV-Readiness ohne Validierung, Verletzungsvorhersage, genetisches Potenzial.
Diese App hat ihre Glaubwürdigkeit teuer bezahlt — sie nennt Belegstärke,
Lücken und Herkunft jedes Referenzwerts.

**Regel: Jede Vorteilsaussage muss auf einen gemessenen Wert plus eine
genannte Unsicherheit zurückführbar sein.** Was das nicht erfüllt, kommt nicht
hinein, unabhängig davon, wie gut es sich verkaufen liesse.

### Reihenfolge

Anforderungslücke (1), Gruppen-Heatmap (6), Wirksamkeitsnachweis (7).
Punkt 1 ist der Athletenvorteil und nutzt nur Vorhandenes. Punkt 6 lässt einen
Trainer nicht mehr wechseln. Punkt 7 ist der Grund, warum er zahlt.
Punkt 4 ist der Burggraben, braucht aber die Kohorte — also später.

---

## 4. Offen vor dem öffentlichen Betrieb

1. `src/data/operator.ts` — Name, Anschrift, E-Mail fehlen (§5 DDG).
2. Rechtstexte anwaltlich prüfen lassen.
3. Fussball: entschieden, bleibt ausgeschlossen (`BLOCKED_DISCIPLINES`).

---

## 5. Umsetzungsstand

Gebaut, mit Prüffällen, auf dem Branch:

| Vorhaben | Wo | Regel, die es einhält |
|---|---|---|
| Anforderungslücke | `domain/requirementGap.ts`, Übersicht (kompakt), Analyse (ganz) | Sagt WO, nicht WAS (§81). Ungemessen ≠ schwach. Kennzahlachsen ohne Gewicht werden nicht eingereiht. |
| Wettkampf als Rahmen | Schema v19 `profile.competition`, `domain/seasonPlan.ts`, Profil, Übersicht | 12 / 6 / 2 Wochen als offene Produktentscheidung; ein Testplan, kein Trainingsplan. |
| Formvorhersage | `domain/formProjection.ts`, Übersicht | Gerade + eigenes Streuungsband; nie über den doppelten Messzeitraum, nie über ein Jahr. Zielaussage nur, wenn das ganze Band auf einer Seite liegt. |
| Report im Moment der Veränderung | `ResultScreen` (`ChangeBlock`) | Angebot nur bei belegter Veränderung. Innerhalb der Schwankung wird der Vorteil benannt. |
| Zwischen den Tests | `data/observations.ts` (Schlaf, sRPE-Belastung), Übersicht | Erfasst, nie bewertet. |
| Performance Card | `lib/performanceCard.ts` (1080 × 1350, Radar, belegte Veränderungen, ein Satz) | Ohne Name, ohne Geburtsdatum. Abdeckung und Vorbehalt stehen immer drauf. |
| Gruppen-Heatmap | `domain/groupHeatmap.ts`, `/trainer/heatmap` | Nenner immer daneben. Muster ab 4 Athleten UND halber Gruppe. |
| Wirksamkeitsnachweis | `domain/coachProof.ts`, `/trainer/nachweis` (druckbar) | Derselbe Massstab wie am Ergebnis (2,77 × eigene Streuung). Rückgänge stehen gleich gross dabei. Beobachtung, keine Ursache. |
| Verfügbarkeit, Neuzugang | `domain/availability.ts`, Trainerbereich | Gesprächsanlass, keine Freigabe (§82). Zwei Termine unter der Linie, nicht einer. |

Nicht gebaut, mit Grund:

- **Kohortenvergleich (Community-Benchmark).** Braucht eine anonymisierte
  Kohorte auf dem Server mit Mindestzahl je Zelle, Opt-in und Konfidenz.
  Das ist eine eigene Etappe mit Schema, RLS und Rechtstext — nicht etwas,
  das nebenbei entsteht. Der Bildschirm sagt weiterhin, dass er leer ist.
- **Trainingsempfehlung aus dem Limiter.** Verworfen, §81 (siehe oben).
