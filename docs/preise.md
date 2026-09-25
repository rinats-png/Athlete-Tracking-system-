# Preise

Warum die Stufen so geschnitten sind, wie sie geschnitten sind. Die Zahlen
selbst stehen in `src/data/pricing.ts`; hier steht die Begründung, damit
niemand — auch nicht wir in einem Jahr — an einer Zahl dreht, ohne zu wissen,
was sie trägt.

**Stand:** 25. September 2026 (Trainerstaffel, Hochstufung, Teams). Das Grundmodell vom 13. September 2026 gilt weiter.

---

## Der Stand davor und warum er falsch war

| | alt | neu |
|---|---|---|
| Athleten | Report-Kontingente, 29,90 € je Report | Frei · Plus 49 €/Jahr · Pro 99 €/Jahr · Termin 69 € einmalig (seit dem Ausbau, docs/ausbau.md §10; vorher Plus 29 / Termin 49) |
| Trainer | 39/79/149 € im Monat für 8/20/50 **Listenplätze** | 149/349/649/999 € im Jahr für 10/30/75/150 **gemessene** Athleten (bis 24.09.2026: 149/349/699 € für 25/75/250) |

**1. Der Report war an die falsche Zielgruppe gepreist.** Was zahlt ein Athlet
für ein PDF seiner eigenen Zahlen? Fünf Euro, wenn es hoch kommt. Was zahlt ein
Trainer, der eine Diagnostiksitzung für 120 € verkauft und den Report als Beleg
braucht? Deutlich mehr. Der Preis war B2B, die Zielgruppe B2C. Zum Vergleich:
ein *ganzes Jahr* My Jump Lab kostet 29,99 € — so viel wie hier ein einzelner
Report, bei einer App, die per Kamera misst.

**2. Listenplätze sind bei periodischer Diagnostik das falsche Mass.** «Bis 8
Athleten» bestraft genau das, was dieses Produkt verspricht: Historie behalten.
Die naheliegende Reaktion eines Trainers am Limit wäre gewesen, alte Athleten zu
löschen. Ein Preismodell, das zum Löschen von Messreihen einlädt, arbeitet gegen
das eigene Produkt.

**3. Die Begründung gegen ein Athleten-Abo war halb richtig.** Stimmt: Man misst
zwei- bis viermal im Jahr, ein Abo für tägliche Nutzung rechnet sich nie. Falsch
war der Schluss. Nicht die *Nutzung* ist der Wert, sondern die *Historie* — und
die wächst mit jeder Messung weiter, auch in den Monaten dazwischen. Man zahlt
nicht für Öffnungen, man zahlt dafür, dass der Massstab da ist, wenn man ihn
braucht.

---

## Die vier Regeln

**1. Der Paywall liegt nie bei der Ehrlichkeit.** Messfehlerband, «innerhalb der
Schwankung», eigener Verlauf, vollständiger Export — dauerhaft frei. Wer dafür
zahlen müsste, bekäme gratis eine schlechtere Lüge. Die Grenze verläuft zwischen
dem Vergleich **mit sich selbst** (frei) und der **Einordnung und Vorausschau**
(Plus).

**2. Gezählt wird, wer gemessen wurde.** Der Athletenbestand ist unbegrenzt und
kostenlos. Abgerechnet werden Athleten mit mindestens einer Messung im Abojahr —
im Jahr und nicht im Monat, weil Diagnostik in Wellen läuft: dreissig im März,
keiner im April. Eine Monatszählung zwänge jeden in die Stufe seiner
Spitzenwoche.

**3. Reports sind nicht gedeckelt.** Ein Zähler auf Reports erzeugt Reibung im
Moment der Wertlieferung — der Trainer überlegt dann, ob er den Report wirklich
erzeugen soll.

**4. Der Wirksamkeitsnachweis ist in jeder Stufe, auch der kostenlosen.** Er ist
der Grund, warum ein Trainer bleibt, und das Einzige, was sonst niemand
verkauft. Ihn hinter die höchste Stufe zu legen hiesse, das beste Argument dem
zu verwehren, der es noch nicht kennt.

---

## Der Befund, der Plus geprägt hat

Beim Bau dieser Stufen habe ich gezählt, wie viele Tests überhaupt eine
Referenz haben:

| | Anzahl |
|---|---|
| Tests mit **Bevölkerungs**referenz (echtes Perzentil) | **4** — `grip_strength`, `cooper_12min`, `sprint_30m`, `ftp_20min` |
| Tests mit Athletenkohorte (Vergleich, kein Perzentil) | 10 |
| Tests im Katalog insgesamt | über achtzig |

**Hätte Plus auf dem Perzentil gestanden, hätten die meisten gezahlt und nichts
gesehen.** Ein Kraftdreikämpfer, ein Kletterer, ein Kampfsportler misst Tests,
für die es keine Kohorte gibt — er hätte 29 € für ein Merkmal bezahlt, das bei
ihm nie erscheint. Das wäre kein Umsatz gewesen, sondern eine Rückerstattung mit
Verzögerung.

Deshalb trägt Plus auf Merkmalen, die bei **jedem** Test wirken: Prognose,
Saisonplan, Anforderungslücke, Abgleich, Karte. Das Perzentil ist ein Merkmal
unter mehreren — und der stärkste Grund, die Referenzbibliothek auszubauen.

---

## Warum ein Athlet überhaupt umsteigt

Die naheliegende Sorge: Die kostenlose Version kann viel, also zahlt niemand.
Die Antwort ist, dass beide Versionen **verschiedene Fragen** beantworten.

> Kostenlos beantwortet eine **Methodenfrage**: *Hat sich etwas verändert, oder
> war das Schwankung?*
>
> Plus beantwortet die **Lebensfrage**: *Wo stehe ich, und wo werde ich sein?*

Die erste Frage ist einmal faszinierend und dann beantwortet. Die zweite stellt
sich nach jeder Messung neu. Fünf Gründe, nach Verlässlichkeit geordnet:

**1. Die Prognose — das stärkste Argument.** «Wenn es so weitergeht, bist du am
14. März bei 2.950 m, mit einem Band von ±180 m.» Sie wirkt bei jedem Test,
braucht keine Kohorte, nur vier Messungen — und niemand sonst im Markt rechnet
sie ehrlich mit Unsicherheitsband. Entscheidend ist die Reihenfolge: **Der
kostenlose Teil erzeugt genau die Voraussetzung.** Wer viermal gemessen hat, hat
die Datengrundlage, und in diesem Moment ist die Frage «und wohin geht das?»
zwingend.

**2. Die Anforderungslücke.** «Von deinen sechs Achsen bringt Ausdauer für Judo
am meisten — dort ist deine grösste Lücke.» Das ist der einzige Satz in der App,
der einer Empfehlung nahekommt, ohne §81 zu brechen. Für einen ambitionierten
Athleten ist es der wertvollste Satz überhaupt, und er braucht die Gewichtungs-
und Referenzdaten.

**3. Die Zeit arbeitet für den Kauf.** Nach vier Messungen ist die Reihe ein
Besitz. Abgleich ist dann keine Bequemlichkeit mehr, sondern Versicherung. Weil
der Export immer frei bleibt, ist das ein echtes Angebot und kein Druckmittel —
es überzeugt später, aber es überzeugt sauber.

**4. Das Perzentil, wo es belegt ist.** Heute vier Tests. Für wen sie passen,
ist es das stärkste Einzelargument; als Überschrift trägt es noch nicht.

**5. Die Karte zum Zeigen.** Teilen ist ein eigener Antrieb.

### Der Mechanismus: die Lücke zeigen, nicht verstecken

Kein ausgegrauter Knopf. An der Stelle, an der ein Perzentil oder eine Prognose
**existieren würde**, sagt die kostenlose Version die Wahrheit über vorhandene
Daten:

> «Für diesen Test liegt eine belegte Referenz vor (n = 1.402, Cooper 1968).
> Plus zeigt dir, wo du darin stehst.»

Das ist keine Sperre, sondern eine Auskunft — und jede neue Messung öffnet die
Schleife erneut. *(Noch nicht gebaut; siehe Offene Punkte.)*

### Und die ehrliche Gegenrede

**Wenn die kostenlose Version für die meisten reicht, zahlen die meisten nicht —
und das ist in Ordnung.** Das Geschäft steht auf der Trainerseite: Ein Trainer
auf *Team* ist so viel wert wie zwölf Plus-Abos, und nach dem Abzug des App
Store sogar mehr. Die Athletenstufe ist Trichter, Markenbeweis und
Datengrundlage. Die kostenlose Version zu verkrüppeln, um Konversion zu
erzwingen, würde die einzige Eigenschaft beschädigen, für die diese App
überhaupt bekannt werden kann.

---

## Trainer: die Rechnung dahinter

| Stufe | Preis | gemessene Athleten | Trainer | je Athlet und Jahr |
|---|---|---|---|---|
| Coach Free | 0 € | 3 | 1 | — |
| Coach Start | 149 € | 10 | 1 | **14,90 €** |
| Coach Team | 349 € | 30 | 2 | **11,63 €** |
| Coach Pro | 649 € | 75 | 3 | **8,65 €** |
| Coach Club | 999 € | 150 | 5 | **6,66 €** |
| Verein / Einrichtung | Anfrage | über 150 | nach Bedarf | — |

Monatlich: 15 / 35 / 65 / 99 €.

**Warum fünf Stufen statt drei (25.09.2026).** Die alte Staffel (25/75/250)
hatte zwei Fehler. Der Einstieg verlangte Plätze, die ein anfangender Trainer
nie füllt — die meisten betreuen fünf bis fünfzehn Leute. Und zwischen 75 und
250 lag ein Sprung um das Dreieinhalbfache: Wer 76 Athleten misst, zahlte das
Doppelte für einen einzigen mehr. An so einer Schwelle springen Kunden ab. Die
Regel jetzt: Von Stufe zu Stufe wächst die Athletenzahl um höchstens das
Dreifache, und der Preis wächst jedes Mal **weniger** als die Zahl — so wird
jeder Athlet mit jeder Stufe günstiger. Ein Prüffall hält das fest
(`tests/pricing.spec.ts`).

**Warum der Einstieg nicht bei 99 € liegt.** 99 € ist Athlete Pro — für
*eine* Person. Ein Trainer mit zehn Athleten, Reports und Gruppentest darf
nicht gleich viel kosten. Coach Start enthält ausserdem Plus für alle betreuten
Athleten; einzeln wären das 10 × 49 €. Zum Start gibt es stattdessen den
**Gründerpreis**: −30 % auf das erste Jahr für die ersten 100 Trainer, als
Stripe-Gutschein mit `max_redemptions` (Umgebung `STRIPE_COUPON_FOUNDER`, Hinweis
im Bau mit `VITE_FOUNDER_OFFER=on`). Ein Rabatt lässt sich beenden, ein zu
niedriger Listenpreis kaum anheben.

Der Massstab bleibt die Rechnung des Trainers: Er verkauft eine
Diagnostiksitzung für 80–150 €. Coach Start kostet im Jahr ungefähr **eine**
Sitzung, je Athlet unter zehn Prozent einer Sitzung.

## Stufe überschritten: Frist und anteiliger Wechsel

Gezählt wird im **laufenden Abojahr** (Jahresabo: Beginn des bezahlten
Zeitraums; Monatsabo: Jahrestag des Abobeginns; ohne Abo: die letzten zwölf
Monate). Mit jeder Verlängerung beginnt die Zählung neu. Die Zählung macht der
Server aus den Dokumenten des Bestands (`my_coach_status`), nicht das Gerät.

1. **Nie mitten am Testtag sperren.** Wer den elften Athleten misst, misst ihn.
2. **Vierzehn Tage Frist** ab dem Moment, in dem der Server die Überschreitung
   zum ersten Mal sieht. Danach sind nur noch Athleten messbar, die im
   laufenden Abojahr schon gezählt sind; neue erst nach dem Wechsel.
3. **Hochstufen kostet die anteilige Differenz** für den Rest des Zeitraums —
   zur Hälfte des Jahres von Pro zu Club (999 − 649) / 2 = 175 €. Stripe rechnet
   das auf die Sekunde (`proration_behavior=always_invoice`) und wechselt nur,
   wenn die Zahlung durchgeht (`payment_behavior=error_if_incomplete`).
   Mollie kann das bei Abos nicht selbst; deshalb Stripe.
4. **Herabstufen erstattet nichts** und gilt ab der nächsten Verlängerung
   (Stripe-Abo-Plan mit zwei Phasen). Hat das Team mehr Trainer, als die
   kleinere Stufe Plätze hat, müssen erst Trainer gehen.
5. **Automatisch hochstufen** nur, wenn der Inhaber es selbst einschaltet —
   einmal je Überschreitung. Eine Mehrzahlung ohne Bestätigung ist nicht die
   Voreinstellung.

Code: `src/domain/upgrade.ts` (Regeln), `supabase/functions/change-plan`
(Stripe), `src/features/billing/CoachPlanPanel.tsx` (Oberfläche).

## Teams (ab Coach Team)

Ein Team gehört einem **Inhaber** (zahlt, lädt ein, entfernt); die anderen sind
**Trainer** (messen, sehen dieselben Athleten, erstellen Reports). Plätze:
Team 2, Pro 3, Club 5 — der Inhaber zählt mit.

- **Ein Bestand.** Die Trainer arbeiten im Bestand des Inhabers
  (`athlete_documents.owner_id`). Deshalb gibt es keinen zweiten Bestand, in dem
  man am Preis vorbei messen könnte: Bringt ein Trainer dreissig eigene
  Athleten mit und misst sie, zählen sie für das Team — und die Frist aus dem
  vorigen Abschnitt greift.
- **Einladung** per Link mit 244 Bit Zufall im Fragment (`#…`), gespeichert
  nur als SHA-256. Optional an eine E-Mail gebunden. Eine offene Einladung
  belegt einen Platz. Gültig 14 Tage.
- **Beitritt:** Der Trainer entscheidet, ob sein bisheriger Bestand ins Team
  geht (dann zählt er dort) oder im eigenen Konto bleibt.
- **Austritt / Entfernung:** Die Athleten bleiben beim Team; das Gerät leert
  den Teambestand beim nächsten Abgleich.
- **Stufe fällt unter Team** (Start, Ablauf): Der Zugriff der Trainer endet von
  selbst (`can_use_pool`), die Daten bleiben beim Inhaber.
- **Löschen** im gemeinsamen Bestand darf nur der Inhaber — sonst liesse sich
  die Zählung drücken.
- **Einwilligung:** Der Vordruck nennt das Team und die Zahl der Trainer, die
  die Werte sehen.

**Gegen TeamBuildr** (90 $/Monat für 50 Athleten im *Bestand*, über 1.000 $ im
Jahr): Ein Trainer mit hundert Klienten, der sechzig davon jährlich misst, zahlt
dort das Dreifache von *Team*. Die Stufen gewinnen überall dort, wo **episodisch**
gemessen wird — und das ist bei Diagnostik immer der Fall. Wo täglich
programmiert wird, verlieren sie; das ist nicht unser Produkt.

**Der beste strukturelle Hebel: Plus für alle betreuten Athleten.** Zahlt der
Trainer, bekommen seine Athleten die volle App kostenlos. Drei Wirkungen auf
einmal — die Trainerstufe wird spürbar wertvoller, jeder Trainer wird zum
Vertriebskanal, und die Athleten bleiben nach dem Betreuungsende als
Plus-Interessenten im System.

---

## Was bewusst verworfen wurde

**Freemium mit verkrüppelter Statistik.** Würde die Konversion kurzfristig
heben und die Marke zerstören, deren einziger Inhalt Ehrlichkeit ist.

**Pay-per-Test.** Bestraft Messen. Ein Produkt, dessen Aussagekraft mit der Zahl
der Messungen steigt, darf Messen nie verteuern.

**Report-Kontingente für Athleten.** Siehe oben — falsche Zielgruppe.

**«Prüfungsvorbereitung» als Name.** Streift §82: Der Name würde ein Ergebnis in
Aussicht stellen. *Termin* beschreibt nur den Mechanismus — ein Datum, auf das
man misst. Die Zielwerte erscheinen als amtliche Anforderung mit Quelle, nie als
Prognose über das Bestehen.

**Vereins- und Schulstufe zum Start.** Echtes Segment, aber der DMT 6-18 hat in
NRW, BW und Berlin eigene Software, und Vereine haben kein Budget. Später über
Verbandspartnerschaften.

---

## Offene Punkte

| Was | Warum es zählt |
|---|---|
| **Keine Sperren im Code.** `pricing.ts` beschreibt die Stufen, erzwingt sie nicht. | Eine Sperre ohne Bezahlweg nähme allen etwas weg und gäbe niemandem die Möglichkeit, es zurückzukaufen. Sperren kommen **mit** der Zahlung, in einem Zug. |
| **Stripe für Trainer zuerst**, In-App-Kauf für Athleten danach | Ein Trainer ist rund fünfundzwanzig Athleten wert. Und deutsche Selbstständige brauchen eine ordentliche Rechnung — das kann der App Store nicht. |
| **App Store nimmt 15–30 %** | Aus 29 € werden netto etwa 20–25 €. Trainerabos laufen über die Website und bleiben ungeschmälert. |
| **Referenzbibliothek ausbauen** | Die höchste Hebelwirkung für die Athletenstufe: vier Bevölkerungsreferenzen sind zu wenig, damit das Perzentil trägt. |
| **Die Lücke sichtbar machen** | Der Satz «für diesen Test liegt eine Referenz vor — Plus zeigt dir, wo du stehst» ist der Konversionsmechanismus und noch nicht gebaut. |
| **Preise am Markt prüfen** | Zehn Trainer fragen, ob 149 € im Jahr fair klingen. Sagen drei von zehn ja, steht die Stufe. Zögern alle, ist 99 € der nächste Test. |
