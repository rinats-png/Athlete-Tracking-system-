# Plan — 50 Posts

Regel je Post: Headline = Beobachtung oder Zahl (das Problem), darunter die Lösung
in ein bis zwei Sätzen, dazu genau ein Bild-Element. Jede Zahl stammt aus dem Code
(Datei in Klammern). Zielgruppen: A = Einzelathlet, T = Trainer/Verein, V = Preis,
Daten, Rechte, Vertrauen. Theme: D = Mondlicht (dunkel), L = Mondstein (hell).

Gestrichen in der ersten Runde (zu generisch oder doppelt) und ersetzt:

- ~~«Schwimmen: die Uhr am Beckenrand misst. Die App ordnet ein.»~~ → 37 (Sicherung nach 10 Ergebnissen)
- ~~«Rad: 20 Minuten FTP. Und dann?»~~ → 38 (ab 3 Messungen Trend, ab 4 Streuung)
- ~~«Der Report ist ein PDF aus dem Browser.»~~ → 44 (ein Test, den nur einer hat, ist kein Vergleich)
- ~~«Deine Daten. Deine Datei. Immer.»~~ → 48 (Export ohne Kontingent, 0 €)
- ~~«Bring Struktur in deine Saison.»~~ → 41 (vier Reports für 89 €, weil viermal im Jahr)
- ~~«Unter 16 Jahren reicht das eigene Ja nicht.»~~ (falsche Zahl, ADULT_AGE = 18) → 26

| Nr | Headline | Quelle | Bild | Ziel | Theme |
|---:|---|---|---|---|---|
| 01 | +2 cm im Sprung. Oder ein guter Tag. | change.ts (2,77) | Verlauf mit Band | A | D |
| 02 | Was 42 Tage sind: der Abstand, ab dem ein zweiter Test etwas anderes misst als den ersten. | nextTest.ts | Spektrum 0–42 | A | L |
| 03 | Vier Wochen Griffkraft trainiert. Die Disziplin wollte Kampfausdauer. | produktstrategie (Anforderungslücke), sportProfiles | Radar | A | D |
| 04 | Diese App sagt dir nicht, wie du trainieren sollst. Sie sagt dir, wo. | trainingFocus.ts §81 | Balken (Rangfolge) | A | D |
| 05 | Für alles ausser Fussball. | sportProfiles.ts (49 Disziplinen, 11 Kategorien) | Zahl 49 | V | L |
| 06 | Dein Wettkampf ist am 14. Juni. Die Form weisst du am 14. Juni. Oder zwölf Wochen früher. | produktstrategie (Formvorhersage) | Verlauf mit Prognoseband | A | D |
| 07 | 29,90 €. Kein Abo. Kein Verfall. | pricing.ts | Zahl | V | L |
| 08 | Wir haben kein Perzentil für dich. Und wir erfinden auch keins. | benchmark.ts | Spektrum, leere Marke | V | D |
| 09 | 14 von 20 unter der Anforderung auf derselben Achse. Das sind nicht 14 Athleten. Das ist ein Plan. | produktstrategie (Heatmap) | Raster 20 | T | D |
| 10 | Neuer Athlet. Bisher: sechs Monate hinschauen. Jetzt: ein Termin. | produktstrategie (Neuzugang) | Zahl 1 | T | L |
| 11 | Zwei Werte sind eine Differenz. Keine Streuung. | change.ts (MIN_POINTS 4) | Punkte 1–4 | A | D |
| 12 | Der Mittelwert der Gruppe ist der Wert des einen, der abgebrochen hat. | groupStats.ts (Median, Quartile, 4) | Balken mit Median | T | L |
| 13 | Sprint auf Tartan, Sprint auf Rasen. Untereinander schreiben geht. Vergleichen nicht. | groupCompare.ts (180 Tage) | Spektrum, zwei Marken | T | D |
| 14 | Eine Zahl aus einer Achse ist diese Achse mit anderem Namen. | performanceScore.ts (3 Achsen, 4 von 6) | Radar 4/6 | A | L |
| 15 | Eine Achse fällt erst auf, wenn sie 10 Punkte unter deinen übrigen liegt. | insights.ts (AXIS_GAP 10) | Balken mit Schwelle | A | D |
| 16 | Nach 120 Tagen ist eine Messung eine Erinnerung. | insights.ts RETEST_AFTER_DAYS, scoring.ts 18 Monate, analytics.ts 90/540 | Spektrum Zeit | A | D |
| 17 | Deine Daten liegen in Frankfurt. Oder nur auf deinem Gerät. | operator.ts PROCESSORS | Zahl eu-central-1 | V | L |
| 18 | Die Karte im Gruppenchat trägt keinen Namen. Und kein Geburtsdatum. | performanceCard.ts | Radar-Karte | A | D |
| 19 | Trainerwechsel. Drei Jahre Messungen bleiben auf dem alten Gerät. | handover.ts | Verlauf mit Übergabemarke | T | L |
| 20 | Ausgeruht heisst nicht freigegeben. | readiness.ts | Spektrum Selbsteinschätzung | A | D |
| 21 | Der grösste Fortschritt des Jahres war ein Dienstag. | yearReview.ts | Verlauf, 12 Monate | A | D |
| 22 | 4,88 € je Athlet und Monat. | pricing.ts (Coach S) | Zahl | T | L |
| 23 | Zwanzig Athleten, zwölf Monate, eine Seite für den Vorstand. | produktstrategie (Wirksamkeitsnachweis) | Balken je Athlet | T | D |
| 24 | HYROX: acht Läufe, acht Stationen, eine Achse, die zurückfällt. | sportProfiles (HYROX), Anforderungslücke | Radar | A | D |
| 25 | Der CK-Wert bekommt keine Note. | observations.ts | Verlauf ohne Band | V | L |
| 26 | Mit 17 reicht das eigene Ja nicht. | consent.ts ADULT_AGE 18 | Zahl 18 | T | L |
| 27 | Ein Maximaltest bei RPE 6 ist kein Maximaltest. | flags.ts SUBMAXIMAL_RPE 8 | Spektrum RPE | A | D |
| 28 | Zwölf Wiederholungen sagen wenig über dein 1RM. | validation.ts REPS_RELIABLE_LIMIT 10 | Balken | A | D |
| 29 | Sechs je Station. Mehr passt nicht in einen Testtag. | testDay.ts MAX_GROUP_SIZE 6 | Raster | T | L |
| 30 | Drei Schwerpunkte. Nicht zwölf. | trainingFocus.ts MAX_ACTIVE_FOCUSES 3 | Zahl 3 | T | D |
| 31 | Das Profil zeigt 18 Monate. Nicht deinen besten Tag von 2021. | scoring.ts RADAR_WINDOW_MONTHS | Radar | A | L |
| 32 | 82 Tests. Am Anfang brauchst du drei. | testCatalog (82), diagnosticProfile START 3 | Zahl 82 | A | D |
| 33 | Wer alle drei Wochen das Programm wechselt, adaptiert nie. | produktstrategie (Rauschen) | Verlauf mit Band | A | D |
| 34 | Triathlon: drei Sportarten, eine Achse, die zurückfällt. | sportProfiles (70.3) | Radar | A | L |
| 35 | Der Athlet, der fällt, sagt nichts. | produktstrategie (Verfügbarkeit), readiness §82 | Verlauf, drei Linien | T | D |
| 36 | Ein Tempolauf ist keine Diagnostik. Zwölf Minuten auf der Bahn schon. | testCatalog cooper_12min, nextTest 42 | Zahl 12:00 | A | L |
| 37 | Zehn Ergebnisse ohne Sicherung. | backupReminder.ts (10 / 90 Tage) | Zahl 10 | V | D |
| 38 | Ab drei Messungen ein Trend. Ab vier eine Streuung. | analytics.ts MIN_TREND_POINTS 3, change.ts 4 | Verlauf | A | D |
| 39 | Feuerwehr: der Eignungstest misst einmal. Die Anforderung bleibt. | sportProfiles (Tactical) | Radar | A | D |
| 40 | Kein Fitnesswert. Keine Bewertung einer Person. | performanceScore.ts, performanceCard.ts §82 | Text | V | L |
| 41 | Vier Reports für 89 €. Weil du viermal im Jahr testest, nicht wöchentlich. | pricing.ts | Balken Preis je Report | V | L |
| 42 | Die Herkunft der Referenz reist mit. | benchmark.ts | Spektrum mit Quelle | T | D |
| 43 | Boxen: 88. Perzentil Schnellkraft, 41. Kampfausdauer. | produktstrategie (taktisches Profil), benchmark | Spektrum, zwei Marken | A | D |
| 44 | Ein Test, den nur einer hat, ist kein Vergleich. | groupCompare.ts | Balken | T | L |
| 45 | 5 km in 21:40. Und in 42 Tagen? | nextTest.ts | Zahl 21:40 | A | D |
| 46 | Mit einer einfachen Streuung als Schwelle wäre jede dritte Tagesschwankung ein Fortschritt. | change.ts (1,96 · √2) | Zahl 2,77 | A | L |
| 47 | Sie hat den Verein gewechselt. Ihre Historie auch. | handover.ts §32 | Verlauf mit Marke | A | D |
| 48 | Export: vollständig, kostenlos, ohne Kontingent. | pricing.ts §32 | Zahl 0 € | V | L |
| 49 | Ohne Sportart: sechs Achsen. Mit Judo: die eigenen. | scoring.ts | Radar 6 | A | D |
| 50 | Was die App nicht tut, steht im Code. Mit Paragraf. | trainingFocus §81, readiness §82, performanceCard §50, pricing §32 | Liste | V | D |

Rhetorische Frage als Headline: nur 45. Dunkel: 30, hell: 20.
