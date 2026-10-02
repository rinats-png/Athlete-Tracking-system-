# Rennwetter: Entwurf für den Datenschutztext

**Stand:** Entwurf, nicht veröffentlicht. Die Funktion ist im Bau hinter `VITE_RACE_WEATHER=on` verborgen und in der
Auslieferung aus, bis dieser Text freigegeben und in `src/features/legal/texts.ts` übernommen ist. Keine
Rechtsberatung; die Freigabe liegt beim Betreiber.

## Vorschlag für einen Abschnitt «Rennwetter (freiwillig)»

> Im Reiter «Läufe» kannst du das Wetter für den Tag eines Wettkampfs abrufen. Das passiert nur, wenn du auf
> «Wetter abrufen» tippst. Dabei sendet dein Gerät an Open-Meteo (Open-Meteo.com, Schweiz/EU) zuerst den Ortsnamen,
> den du getippt hast, und danach die Koordinaten des Ortes, den du auswählst, sowie den Renntag. Wie bei jedem
> Aufruf im Netz sieht der Dienst dabei technisch deine IP-Adresse. Deine Läufe, Pulswerte, dein Name und der
> Standort deines Geräts werden nicht gesendet. KYDON speichert weder Ort noch Ergebnis. Rechtsgrundlage ist deine
> Einwilligung durch das Tippen (Art. 6 Abs. 1 lit. a DSGVO); ohne Tipp findet kein Aufruf statt, und die App
> funktioniert ohne Wetter vollständig.

## Was im Code gilt

| Punkt | Stand |
|---|---|
| Aufruf | nur nach Tipp, `src/lib/openMeteo.ts`; ohne Netz sagt die App das |
| Gesendet | Ortsname (Suche), dann Breite, Länge (3 Stellen) und Tag; Prüffall `tests/raceWeather.spec.ts` |
| Nicht gesendet | Läufe, Puls, Name, Gerätestandort |
| Gespeichert | nichts (kein Schema, keine Migration) |
| Sicherheitsrichtlinie | `connect-src` nennt zusätzlich `geocoding-api.open-meteo.com` und `api.open-meteo.com` |
| Schlüssel | keiner; keine Geheimnisse im Client |

## Vor der Freigabe zu klären

1. **Lizenz:** Open-Meteo ist für nichtkommerzielle Nutzung frei (CC BY 4.0, Namensnennung steht in der Anzeige).
   Für den kommerziellen Betrieb von KYDON ist ein Tarif des Dienstes nötig.
2. **Auftragsverarbeitung:** prüfen, ob Open-Meteo hier als eigenständiger Verantwortlicher oder Empfänger zu
   nennen ist, und die Liste der Empfänger/Auftragsverarbeiter (`docs/dpa`-Texte) ergänzen.
3. **Impressum/Quellen:** Namensnennung «Weather data by Open-Meteo.com» ins Impressum.
4. **Dann:** `VITE_RACE_WEATHER=on` in der Auslieferung setzen.
