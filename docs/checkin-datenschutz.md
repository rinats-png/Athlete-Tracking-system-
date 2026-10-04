# Check-in teilen: Entwurf für den Datenschutztext

**Stand:** Entwurf, nicht veröffentlicht. Das Teilen ist im Bau hinter `VITE_CHECKIN_SHARE=on` verborgen und in der Auslieferung aus, bis dieser Text freigegeben ist und die Migration `supabase/migrations/20261004100000_shared_checkins.sql` ausgerollt wurde. Der Check-in selbst (lokal, im Tagebuch) läuft ohne Konto und braucht keinen neuen Text. Keine Rechtsberatung; die Freigabe liegt beim Betreiber.

## Vorschlag für einen Abschnitt «Check-in mit dem Trainer teilen (freiwillig)»

> Im Tagebuch und auf «Heute» kannst du jeden Tag in 15 Sekunden drei Selbsteinschätzungen von 1 bis 5 festhalten: Energie, Muskelkater und Stress. Diese Werte bleiben auf deinem Gerät. Nur wenn du «Meinem Trainer zeigen» einschaltest, speichert KYDON diese drei Werte mit dem Datum auf unseren Servern (Supabase, EU), damit dein verbundener Trainer sie sehen kann. Es werden weder Notizen noch andere Tagebuchfelder übertragen. Dein Trainer sieht nur, ob du dich gemeldet hast und ob die letzten Tage von deinem eigenen Durchschnitt abweichen. Eine Bewertung oder Ursache leitet KYDON daraus nicht ab. Rechtsgrundlage ist deine ausdrückliche Einwilligung (Art. 6 Abs. 1 lit. a, Art. 9 Abs. 2 lit. a DSGVO), weil Angaben zu Muskelkater und Stress gesundheitsbezogen sein können. Du kannst sie jederzeit widerrufen: Ausschalten löscht alle geteilten Werte sofort. Nach 90 Tagen löscht KYDON geteilte Werte automatisch, und beim Löschen deines Kontos werden sie mit entfernt.

## Was im Code gilt

| Punkt | Stand |
|---|---|
| Speicherort | Tagebuch auf dem Gerät (`diary.energy/soreness/stress`), kein neues Datenformat |
| Schema | Version 30: `shareCheckins` je Athlet, Vorgabe aus |
| Server | Tabelle `shared_checkins` (Eigentümer-Zugriff per RLS), Trainer lesen nur über `coach_shared_checkins()` bei aktiver Verknüpfung |
| Gesendet | Tag und die drei Werte, nie Name, Notiz oder Gewicht (`sharedRows`, Prüffall) |
| Widerruf | Schalter aus löscht alle Zeilen; Aufbewahrung 90 Tage; Kontolöschung räumt ab |
| Auswertung | nur gegen die eigene Baseline (letzte 3 Tage gegen 28 Tage davor, Abweichung ab 1 Punkt), Produktentscheidung, offen zur Prüfung |

## Vor der Freigabe zu klären

1. Rechtstext freigeben und in `src/features/legal/texts.ts` übernehmen; Auftragsverarbeitung prüfen (Trainer als Empfänger).
2. Migration in Supabase ausrollen.
3. Bei Minderjährigen: Einwilligung der Eltern bzw. Teilen für unter 18 ausschalten (offen, Entscheidung beim Betreiber).
4. Dann `VITE_CHECKIN_SHARE=on` in der Auslieferung setzen.
