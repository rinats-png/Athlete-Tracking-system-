# Fachliche Regelprüfung: wer, wie, womit

**Stand:** 11. Oktober 2026
**Bezug:** harte Regel 11 (CLAUDE.md), Nachtrag 1 der Produktdoktrin,
`docs/training-engine.md`

## Worum es geht

Alle 42 Trainingsregeln sind heute **ungeprüft**:
- 5 Pilotregeln der Engine in `src/data/trainingRules.ts`;
- 37 Regeln der Bibliothek in `programIndex.json`.

Sie erscheinen nur, weil die Produktion mit dem Vorschauschalter läuft, und
seit Sprint 0 überall mit «Fachlich noch nicht geprüft».

Eine Regel wird **nur durch einen Menschen mit Fachkunde** geprüft, mit Namen
und Datum. Weder die App noch ein Sprachmodell können diese Prüfung
ersetzen. Deshalb setzt dieses Dokument keine Regel auf «geprüft». Es legt
fest, wer prüfen soll, was geprüft wird und wie das Ergebnis in den Code
kommt.

## 1 Wer prüft: das Profil

**Mindestens zwei Rollen**, damit niemand seine eigene Arbeit freigibt:

| Rolle | Qualifikation (eine davon) | prüft |
|---|---|---|
| **Sportwissenschaft** | Master oder Promotion in Sport- oder Trainingswissenschaft; oder NSCA-CSCS bzw. vergleichbar, mit Erfahrung im Lesen von Studien | Quelle im Volltext, Dosierung, Evidenzstufe, Übertragbarkeit |
| **Sportart** | Trainer-A-Lizenz des Fachverbands (Judo, Ringen) oder Trainer am Olympiastützpunkt; für HYROX und Laufen eine vergleichbare Leistungssport-Erfahrung | Passt die Regel in den Alltag der Sportart? Belastung neben Mattentraining und Sparring, Wettkampfphasen |
| *ärztlich (nur bei Bedarf)* | Sportmedizin | nur Regeln mit Kontraindikationen oder für Minderjährige |

**Wo man solche Personen findet:**
- Institute für Sportwissenschaft der Hochschulen, etwa für eine
  bezahlte Abschlussarbeit oder eine Hilfskraft unter Aufsicht;
- Olympiastützpunkte, Landesfachverbände für Judo und Ringen;
- die Trainer des Kampfsport-Pilots selbst, für die Rolle «Sportart».

**Unabhängigkeit:** Wer prüft, gibt Interessenkonflikte an. Ein
Pilottrainer darf die Rolle «Sportart» übernehmen, aber nicht allein
freigeben.

## 2 Was geprüft wird: je Regel

Der Bogen steht in `docs/regelpruefung-pruefbogen.md` und ist aus den Daten
erzeugt. Je Regel:

1. **Quelle im Volltext gelesen.**
   - Die Recherche arbeitete auf Abstract-Ebene; `fullTextChecked` steht
     überall auf `false`.
   - Ohne Volltext gibt es keine Freigabe. Das Register prüft das bereits
     selbst: «geprüft, aber Quelle ohne Volltextprüfung» ist ein Fehler.
2. **Dosierung gedeckt:** Umfang, Intensität, Häufigkeit und Dauer liegen
   im Bereich der Studien. Weicht die Regel ab, ist das begründet.
3. **Evidenz richtig benannt:** Stärke und Spezifität je Sportfamilie,
   also direkt, übertragen oder extrapoliert.
4. **Grenzen und Ausschlüsse:** Trainingsalter, Kontraindikationen,
   Abbruchkriterien, Autonomiegrenze (`autonomy_ceiling`).
5. **Retest passt:** Die Messgröße am Blockende misst, was die Regel
   entwickeln soll.
6. **Ergebnis:** freigegeben, freigegeben mit Änderung oder abgelehnt, mit
   Begründung.

Für Pläne kommt eine **Prüfung des ganzen Plans** hinzu. Gefragt wird, ob
die Regeln zusammen passen: Gesamtbelastung, Abstände zwischen intensiven
Einheiten, Deload.

## 3 Reihenfolge: erste Runde

Vier Pläne zuerst. Sie decken den Kampfsport-Pilot und die meistgenutzten
Einstiege ab:

| Plan | Regeln |
|---|---|
| `PLN_COMBAT_GRAPPLING_BASE_8W` (Judo, Ringen, BJJ) | MR_K1, K2, K3, K4, K5, K8, TS19, TS28 |
| `PLN_STR_BASE_8W` (Kraftgrundlage) | MR_TS1, TS19, TS21, TS28 |
| `PLN_HYROX_BASE_8W` | MR_H3, H4, K4, L1, TS1, TS19, TS27, TS28 |
| `PLN_RUN5K_BASE_8W` | MR_H4, L1, L6, TS19, TS22, TS27, TS28 |

Das sind **16 Bibliotheksregeln** (Überschneidungen nur einmal gezählt) und
dazu die **5 Pilotregeln** der Engine, zusammen 21 Regeln.

**Aufwand, geschätzt:**
- etwa 1 Stunde je Regel mit Volltext, also rund 21 Stunden;
- etwa 2 Stunden je Plan für die Gesamtprüfung, also rund 8 Stunden;
- zusammen rund **30 Stunden Sportwissenschaft**, dazu etwa
  **6–8 Stunden Sportart**.

Das ist eine Schätzung und kein Angebot. Den Preis legt der Betreiber fest.

## 4 Wie das Ergebnis in den Code kommt

**Engine-Regeln** (`src/data/trainingRules.ts`):
```ts
review: { state: 'reviewed', reviewer: 'Dr. … (Sportwissenschaft) / … (A-Lizenz Judo)', reviewedOn: '2026-11-…', note: 'Dosis auf … angepasst; Volltext gelesen' },
```
- Die Quellen bekommen `fullTextChecked: true`.
- `version` steigt, wenn sich an der Dosierung etwas ändert.
- Die Prüfung im Register lehnt «geprüft ohne Name oder Datum» und «geprüft
  ohne Volltext» ab.

**Bibliotheksregeln** (`content/library/…` → `node scripts/buildLibrary.mjs`):
- `review_status: 'REVIEWED'` setzen und `fulltext_checked: true` an den
  Quellen.
- `planReviewed()` (library.ts) gibt einen Plan erst frei, wenn **alle**
  seine Regeln geprüft sind. Erst dann verschwindet in der App das
  Kennzeichen «Fachlich noch nicht geprüft».

**Nachweis:**
- Der ausgefüllte Bogen wird unter `docs/reviews/<datum>-<regel>.md` mit
  dem Commit abgelegt, der den Status ändert.
- Wer den Status ändert, ohne einen solchen Nachweis abzulegen, bricht
  Regel 11.

## 5 Vertrag und Haftung

- **Schriftliche Vereinbarung mit jeder prüfenden Person:**
  - Umfang: fachliche Plausibilität der Regel, keine medizinische
    Beratung im Einzelfall;
  - Vergütung, Nennung in der App (Name und Qualifikation an der Regel);
  - Pflicht, Interessenkonflikte anzugeben;
  - Haftungsbegrenzung.
- **Haftpflicht des Betreibers:** Die Prüfung senkt das Risiko, verschiebt
  es aber nicht. Ob die Betriebshaftpflicht Trainingshinweise abdeckt,
  klärt der Betreiber mit dem Versicherer. Das ist im Umbauplan noch offen.
- **Neuprüfung:** Ändert sich eine Regel in der Dosis, gilt sie wieder als
  ungeprüft (`version` +1, `review.state` zurück auf `unreviewed`).
  Unverändert gilt eine Prüfung zwei Jahre; danach wird die Quellenlage neu
  gesichtet.

## 6 Was bis dahin gilt

- Die Vorschau bleibt eingeschaltet, mit sichtbarer Kennzeichnung an jeder
  Stelle (Sprint 0, Punkt 3).
- Im Modus `live` dürfen ungeprüfte Bibliothekspläne nicht übernommen werden.
  Diese Sperre fehlt noch (siehe Umbauplan). Vor dem Umschalten auf `live`
  muss sie gebaut sein.
- Website und Werbung: «Jede Regel trägt Quelle und Evidenzstufe» stimmt.
  «Fachlich geprüft» darf erst dort stehen, wo es für die gezeigten Pläne
  zutrifft.
