# Fragen an KYDON und Coach Copilot (Etappe 5)

Umsetzung von Produktdoktrin §28–§31. Stand: deterministische Werkzeugschicht,
**kein Sprachmodell, kein Netz**.

## Aufbau

| Teil | Ort | Aufgabe |
|---|---|---|
| Fragen und Fakten | `src/domain/askKydon.ts` | `answer(frage, eingabe, stichtag)` liefert Fakten (Schlüssel plus Zahlen) |
| Zahlenwächter | `src/domain/answerGuard.ts` | prüft, dass ein Text nur Zahlen aus den Fakten enthält |
| Coach Copilot | `src/domain/coachCopilot.ts` | Wochenzusammenfassung und Entwürfe je markiertem Athleten |
| Bildschirm | `src/features/ask/AskScreen.tsx` (`/fragen`, Eintrag in Mehr) | schreibt die Fakten in der Nutzersprache aus |
| Trainer-Karte | `CopilotCard` in `src/features/coach/CoachToday.tsx` | Zusammenfassung, bearbeitbare Entwürfe, Kopieren |
| Texte | `ask.*` und `coachToday.copilot.*` in allen `*.extra.json` | 8 Sprachen |

## Die sieben festen Fragen

Entwicklung eines Tests · was sich belegt verändert hat · was überfällig ist ·
warum ein Test als unverändert gilt · was noch fehlt · ob die Messungen
vergleichbar sind · wie sicher die Datenlage ist. Freitext gibt es nicht.

## Werkzeuge (§31) und ihre Rechenstelle

| Frage | Rechenstelle |
|---|---|
| Entwicklung, unverändert | `changeReport`, `typicalErrorPercent` (`domain/change.ts`) |
| belegt verändert | `recentChanges` (`domain/performanceView.ts`) |
| überfällig | `overdueTests` (`domain/reminders.ts`) |
| fehlt | `athleteToday` → Assessment Coverage als Anzahl |
| vergleichbar | Protokoll, Untergrund, Gerät je Messung |
| Datenlage | `dataConfidence`, `confidenceScore` |

Jede Antwort nennt, woher sie kommt, und verlinkt auf die Details. Leere
Antworten sagen, was fehlt; sie raten nicht.

## Wie ein Sprachmodell später andocken dürfte

1. Es bekommt **nur die Fakten** einer Antwort, nie Rohdaten oder Namen.
2. Es formuliert um; es erzeugt keine Zahl und keine Aussage, die nicht in den Fakten steht.
3. Der Text geht durch `passesGuard`. Fällt er durch, gilt die feste Vorlage.
4. Aufruf über eine Edge Function (Schlüssel nur im Vault), mit Monatsdeckel je Konto.

Offen, bevor das gebaut wird: Anbieter, Region, Auftragsverarbeitung,
Monatsdeckel. Bis dahin bleibt alles lokal.

## Coach Copilot

Die Entwürfe sprechen nur über die Datenlage (fällig, fehlende Messung,
fallender Verlauf). Kein Training, keine Ursache. KYDON sendet nichts: der
Trainer bearbeitet, kopiert und verschickt selbst.

## Prüfung

`tests/ask.spec.ts` (Fachlogik mit handgerechneten Werten, Wächter, Copilot,
Bildschirm), `tests/doctrine.spec.ts` (keine Ratgeber- oder Kausalsprache).
