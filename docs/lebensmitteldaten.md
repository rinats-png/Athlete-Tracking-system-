# Der kuratierte Kern: BLS oder USDA

*Stand: 21. September 2026. Offener Punkt aus `docs/ausbau.md` §7 und
`docs/odbl.md` §4.*

> **Keine Rechtsberatung.** Die Lizenzlage von BLS und USDA ist aus den
> Bedingungen der Herausgeber gelesen. Die Entscheidung gegen den BLS ist
> zuerst eine wirtschaftliche und erst dann eine rechtliche; sie lässt sich
> jederzeit umdrehen, wenn jemand die Lizenz kauft.

---

## 1. Warum überhaupt ein dritter Bestand

Heute hat die App zwei Quellen:

| Quelle | Einträge | Mikronährstoffe | Güte |
|---|---|---|---|
| Kern aus dem Coaching-System v4 | 245 | 132 | geprüft, aber ohne benannte Primärquelle je Wert |
| Open Food Facts (auf Tipp, mit Netz) | Millionen | selten | Nutzerangaben, teils falsch |

Die Lücke liegt dazwischen: **113 Kern-Einträge ohne Mikronährstoffe**, und
eine Herkunft, die «aus v4» lautet statt «aus einer benannten
Nährwerttabelle». Für die Makros trägt das; für Magnesium, Eisen, Zink oder
Vitamin D trägt es nicht, und die Mikro-Abdeckung am Tag zeigt die Lücke
ehrlich an, statt sie zu füllen. Ein kuratierter Kern aus einer
Primärquelle schliesst beides: mehr Einträge mit Mikronährstoffen, und je
Eintrag eine Quelle, die man nennen kann.

---

## 2. Bundeslebensmittelschlüssel (BLS)

**Was er ist.** Die deutsche Referenz-Nährwertdatenbank, herausgegeben vom
Max Rubner-Institut (Bundesforschungsinstitut für Ernährung und
Lebensmittel). Rund 15.000 Lebensmittel, etwa 140 Nährstoffe je Eintrag,
auf deutsche Marktverhältnisse und deutsche Zubereitung geschnitten. Für
eine App mit deutschsprachiger Zielgruppe ist das fachlich die beste Wahl,
ohne Konkurrenz.

**Was er kostet.** Der BLS ist **nicht frei**. Er wird über eine
kostenpflichtige Nutzungslizenz abgegeben; für die Nutzung in kommerzieller
Software gilt eine eigene Lizenzklasse, die je nach Verbreitung gestaffelt
ist und mit dem MRI einzeln vereinbart wird. Die Weitergabe der Daten an
Endnutzer — und genau das wäre eine App, die Nährwerte im Gerät mitliefert
— ist der teure Fall und ausdrücklich zu regeln.

**Was das bedeutet.**

- Ein Lizenzvertrag mit dem MRI muss geschlossen werden, bevor eine einzige
  Zahl in den Code geht. Preis, Laufzeit und die Frage, ob Weitergabe im
  Installationspaket erlaubt ist, stehen nicht öffentlich — sie sind
  Verhandlung.
- Der Quelltext dieses Projekts liegt offen. BLS-Werte im Repository wären
  eine öffentliche Weitergabe der lizenzierten Daten und mit einer
  üblichen Lizenz **nicht vereinbar**. Der Kern müsste dann zur Laufzeit
  aus einer geschützten Quelle kommen oder als Binärpaket ausserhalb des
  Repositorys liegen — beides bricht mit «lokal zuerst, alles im Gerät».
- Es entstünde eine laufende Kostenstelle, bevor der erste Euro Umsatz da
  ist.

**Urteil:** fachlich erste Wahl, wirtschaftlich und architektonisch
derzeit nicht tragbar. **Nicht jetzt.**

---

## 3. USDA FoodData Central

**Was es ist.** Die Nährwertdatenbank des US-Landwirtschaftsministeriums.
Drei Bestände sind für uns interessant:

| Bestand | Inhalt | Güte |
|---|---|---|
| **Foundation Foods** | wenige hundert Grundnahrungsmittel, einzeln analysiert, mit Probenzahl und Streuung | am höchsten |
| **SR Legacy** | rund 7.800 Einträge, die alte Standard Reference, bis 2019 gepflegt | hoch, aber nicht mehr fortgeschrieben |
| Branded Foods | Markenprodukte nach Herstellerangabe | niedrig, US-Markt |

Für einen Kern aus **Rohware** — Haferflocken, Linsen, Lachs, Brokkoli —
sind Foundation Foods und SR Legacy genau richtig. Die Branded Foods
brauchen wir nicht; dafür gibt es Open Food Facts.

**Was es kostet.** Nichts. Werke von Bundesbehörden der Vereinigten Staaten
stehen dort gemeinfrei; das USDA stellt die Daten ausdrücklich ohne
Einschränkung zur Verfügung und bittet lediglich um Namensnennung.
Bulk-Downloads gibt es ohne Schlüssel, die API mit einem kostenlosen
Schlüssel. **Kein Vertrag, keine Gebühr, keine Share-alike-Pflicht** — das
ist der entscheidende Unterschied zur ODbL von Open Food Facts
(`docs/odbl.md`): Ein USDA-Auszug darf im Installationspaket mitgeliefert
und im offenen Quelltext stehen.

**Was dagegen spricht und ehrlich benannt gehört.**

- **US-Marktbezug.** «Bread, whole-wheat, commercially prepared» ist nicht
  dasselbe wie ein deutsches Vollkornbrot. Bei **Rohware** ist der
  Unterschied klein (eine Linse ist eine Linse); bei **verarbeiteten**
  Lebensmitteln ist er erheblich.
- **Namen und Einteilung sind englisch** und müssen je Eintrag deutsch
  benannt werden — das ist die Kuratierung, und sie ist Handarbeit.
- **SR Legacy wird nicht mehr gepflegt.** Der Datenstand gehört deshalb an
  den Eintrag, nicht nur in die Fussnote.
- Anreicherung: US-Mehl und US-Milch sind teils anders angereichert als
  deutsche. Bei Eisen, Folsäure und Vitamin D kann das den Wert deutlich
  verschieben.

**Urteil:** für Rohware die richtige Quelle, kostenlos und
weitergabefähig. **Ja — und nur für Rohware.**

---

## 4. Die Entscheidung

**Der Kern wächst aus USDA FoodData Central (Foundation Foods zuerst, SR
Legacy danach), beschränkt auf Rohware und einfache Zubereitungen.**
Verarbeitete und deutsche Marktprodukte bleiben beim v4-Bestand oder bei
Open Food Facts.

Drei Regeln, die daraus folgen:

1. **Eine Quelle je Eintrag, nie gemischt.** Wer die Makros aus v4 und das
   Magnesium aus USDA nimmt, hat einen Eintrag, dessen Zahlen aus zwei
   Laboren stammen und nicht mehr zusammenpassen. Ein Eintrag kommt ganz
   aus einer Quelle; ersetzt USDA einen v4-Eintrag, ersetzt er ihn
   vollständig.
2. **Die Quelle steht am Eintrag**, nicht in der Fussnote — im Datenmodell
   (`source`), in der Suche und im Impressum. Das ist dieselbe Haltung wie
   bei den Referenzwerten der Tests: ein Wert ohne benannte Herkunft ist
   ein halber Wert.
3. **Kuratiert heisst von Hand bestätigt.** Kein automatischer Namens-
   abgleich geht ungeprüft in den Bestand. Das Werkzeug schlägt vor, ein
   Mensch entscheidet, und die Entscheidung steht als Datei im Repository.

**Der BLS bleibt die Option für später.** Wenn die App Umsatz trägt und
deutsche Marktprodukte wichtig werden, ist eine MRI-Lizenz der nächste
Schritt — dann mit einem Bestand, der die Quelle je Eintrag ohnehin schon
kennt, und mit einem Auslieferungsweg, der lizenzierte Daten aus dem
offenen Quelltext heraushält.

---

## 5. Was dafür gebaut ist

| Teil | Wo | Zustand |
|---|---|---|
| Quellenregister mit Lizenz, Namensnennung und Gütehinweis | `src/data/foodSources.ts` | gebaut |
| `source` je Eintrag; die 245 v4-Einträge tragen `v4` | `src/data/foods.ts` | gebaut |
| Werkzeug: Vorschläge erzeugen (`--propose`) und Kern bauen (`--build`) | `scripts/buildFoodCore.mjs` | gebaut |
| Kuratierungsliste, von Hand bestätigt | `scripts/foodCore.curation.json` | **leer — hier beginnt die Handarbeit** |
| Suche zeigt die Quelle je Treffer; Impressum nennt alle benutzten Quellen | `FoodSearch`, `ImprintScreen` | gebaut |
| Prüffälle für Nährstoffzuordnung, Einheiten, Vorschläge, Ausgabe | `tests/foodCore.spec.ts` | gebaut |

**Was NICHT gebaut ist und nicht gebaut werden durfte:** ein gefüllter
USDA-Kern. Die Entwicklungsumgebung hat keinen Zugang zu
`fdc.nal.usda.gov`, und Nährwerte aus dem Gedächtnis einzutippen wäre
genau der Fehler, den §89 verbietet — eine erfundene Zahl ist schlimmer
als eine sichtbare Lücke. Die Daten holt, wer Netz hat; das Werkzeug
rechnet sie um, und ein Mensch bestätigt jede Zuordnung.

---

## 6. Wie der Kern erweitert wird

```bash
# 1. Daten holen (einmalig, ~350 MB entpackt)
#    https://fdc.nal.usda.gov/download-datasets.html
#    "Foundation Foods" oder "SR Legacy", CSV-Format
unzip FoodData_Central_foundation_food_csv_*.zip -d /tmp/fdc

# 2. Vorschläge erzeugen: für jeden Kern-Eintrag ohne Mikronährstoffe
#    die ähnlichsten USDA-Einträge, als Datei zum Durchsehen
node scripts/buildFoodCore.mjs --propose --data /tmp/fdc \
  --out scripts/foodCore.proposals.json

# 3. Durchsehen. Jede Zeile, die stimmt, wandert mit ihrer fdcId und einem
#    deutschen Namen in scripts/foodCore.curation.json. Was nicht sicher
#    passt, bleibt draussen — lieber 20 gute Einträge als 200 ungefähre.

# 4. Bauen: erzeugt src/data/foodsUsda.ts aus der Kuratierungsliste
node scripts/buildFoodCore.mjs --build --data /tmp/fdc

# 5. Prüfen
npm run lint && npx playwright test tests/foodCore.spec.ts tests/nutrition.spec.ts
```

Das Werkzeug **bricht ab**, wenn eine Nährstoffkennung nicht den erwarteten
Namen trägt oder eine Einheit nicht stimmt. Lieber kein Kern als ein Kern,
in dem Magnesium in Mikrogramm steht.

---

## 7. Reihenfolge der Kuratierung

Nicht alphabetisch, sondern nach Nutzen:

1. Die **113 Kern-Einträge ohne Mikronährstoffe** — dort ist die Lücke
   sichtbar, und die Mikro-Abdeckung am Tag steigt sofort.
2. **Rohware, die im Training häufig vorkommt** und im Kern fehlt: weitere
   Fischarten, Nüsse und Samen, Hülsenfrüchte, Blattgemüse.
3. Alles Weitere nur, wenn jemand es vermisst.

Ein Eintrag, dessen deutscher Name nicht eindeutig zu bilden ist («Beef,
chuck, arm pot roast, separable lean only»), gehört **nicht** in den Kern:
Ein Name, den niemand sucht, ist kein Eintrag, sondern Ballast.
