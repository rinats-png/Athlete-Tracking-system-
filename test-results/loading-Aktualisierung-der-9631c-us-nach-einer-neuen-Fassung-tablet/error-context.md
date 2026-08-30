# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: loading.spec.ts >> Aktualisierung der installierten App >> die App fragt von sich aus nach einer neuen Fassung
- Location: tests/loading.spec.ts:87:3

# Error details

```
TimeoutError: page.waitForFunction: Timeout 20000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - generic [ref=f1e5]:
      - generic [ref=f1e6]: Baseline
      - generic [ref=f1e11]: Leistungsdiagnostik
      - generic [ref=f1e12]:
        - generic "Beispieldaten. Änderungen bleiben auf diesem Gerät." [ref=f1e13]: Demo
        - radiogroup "Sprache" [ref=f1e14]:
          - radio "de" [checked] [ref=f1e15]
          - radio "en" [ref=f1e16]
        - radiogroup "Darstellung" [ref=f1e17]:
          - radio "Hell" [ref=f1e18]
          - radio "Dunkel" [checked] [ref=f1e26]
          - radio "System" [ref=f1e30]
  - main [ref=f1e34]:
    - generic [ref=f1e35]:
      - generic [ref=f1e36]:
        - text: Leistungsprofil
        - heading "Alex Roth" [level=1] [ref=f1e37]
        - paragraph [ref=f1e38]:
          - text: "Letzte Diagnostik: 14. Juni 2026"
          - generic [ref=f1e39]: (vor 3 Monaten)
      - generic [ref=f1e40]:
        - link "Diagnostik starten" [ref=f1e41] [cursor=pointer]:
          - /url: /diagnostik/neu
        - link "Bericht" [ref=f1e44] [cursor=pointer]:
          - /url: /bericht
    - generic [ref=f1e48]:
      - link "Gesamtleistung 77 Belastbarkeit 98 %" [ref=f1e49] [cursor=pointer]:
        - /url: /analyse
        - generic [ref=f1e50]: Gesamtleistung
        - generic [ref=f1e51]: "77"
        - generic [ref=f1e52]: Belastbarkeit 98 %
      - link "Primärer Limiter Agilität liegt 15.5 Punkte unter deinen übrigen Achsen" [ref=f1e53] [cursor=pointer]:
        - /url: /analyse
        - generic [ref=f1e54]: Primärer Limiter
        - generic [ref=f1e59]: Agilität
        - generic [ref=f1e60]: liegt 15.5 Punkte unter deinen übrigen Achsen
      - link "Grösste Veränderung Bear +13.8 % · über 298 Tage" [ref=f1e61] [cursor=pointer]:
        - /url: /analyse
        - generic [ref=f1e62]: Grösste Veränderung
        - generic [ref=f1e65]: Bear
        - generic [ref=f1e66]: +13.8 % · über 298 Tage
      - link "Nächster Termin 12. Sept. 2026 vorgeschlagen" [ref=f1e67] [cursor=pointer]:
        - /url: /diagnostik/neu
        - generic [ref=f1e68]: Nächster Termin
        - generic [ref=f1e73]: 12. Sept. 2026
        - generic [ref=f1e74]: vorgeschlagen
    - generic [ref=f1e75]:
      - generic [ref=f1e76]:
        - generic [ref=f1e77]:
          - generic [ref=f1e78]:
            - heading "Baseline-Index" [level=2] [ref=f1e79]
            - paragraph [ref=f1e80]: gegen Referenzwerte
          - radiogroup "Leistungsprofil" [ref=f1e82]:
            - radio "Bestleistung" [ref=f1e83]
            - radio "Referenz" [checked] [ref=f1e84]
        - generic [ref=f1e86]:
          - generic [ref=f1e87]:
            - generic [ref=f1e108]:
              - img "Körperdarstellung mit hervorgehobenen Leistungsdimensionen"
              - generic:
                - button "Ausdauer" [ref=f1e109]
                - button "Ausdauer" [ref=f1e110]
                - button "Maxkraft" [ref=f1e111]
                - button "Maxkraft" [ref=f1e112]
                - button "Relativkraft" [ref=f1e113]
                - button "Relativkraft" [ref=f1e114]
                - button "Kraftausdauer" [ref=f1e115]
                - button "Schnellkraft" [ref=f1e116]
                - button "Schnellkraft" [ref=f1e117]
                - button "Agilität" [ref=f1e118]
                - button "Agilität" [ref=f1e119]
            - button "Maxkraft 79" [ref=f1e120]:
              - generic [ref=f1e128]: Maxkraft
              - generic [ref=f1e129]: "79"
            - button "Relativkraft 81" [ref=f1e130]:
              - generic [ref=f1e136]: Relativkraft
              - generic [ref=f1e137]: "81"
            - button "Agilität 65" [ref=f1e138]:
              - generic [ref=f1e143]: Agilität
              - generic [ref=f1e144]: "65"
            - button "Ausdauer 83" [ref=f1e145]:
              - generic [ref=f1e150]: Ausdauer
              - generic [ref=f1e151]: "83"
            - button "Kraftausdauer 78" [ref=f1e152]:
              - generic [ref=f1e156]: Kraftausdauer
              - generic [ref=f1e157]: "78"
            - button "Schnellkraft 79" [ref=f1e158]:
              - generic [ref=f1e162]: Schnellkraft
              - generic [ref=f1e163]: "79"
          - generic [ref=f1e164]:
            - generic [ref=f1e165]: "77"
            - generic [ref=f1e166]: Baseline-Index
            - paragraph [ref=f1e167]: 6 von 6 Achsen belegt · Perzentil
      - generic [ref=f1e168]:
        - generic [ref=f1e169]:
          - generic [ref=f1e170]:
            - heading "Stammdaten" [level=2] [ref=f1e171]
            - paragraph [ref=f1e172]: "Stärkste Achse: Ausdauer"
          - link "Bearbeiten" [ref=f1e174] [cursor=pointer]:
            - /url: /profil
        - list [ref=f1e175]:
          - listitem [ref=f1e176]:
            - generic [ref=f1e180]:
              - generic [ref=f1e181]:
                - generic [ref=f1e182]: 82,0
                - generic [ref=f1e183]: kg
              - text: Körpergewicht
          - listitem [ref=f1e184]:
            - generic [ref=f1e191]:
              - generic [ref=f1e192]:
                - generic [ref=f1e193]: "181"
                - generic [ref=f1e194]: cm
              - text: Grösse
          - listitem [ref=f1e195]:
            - generic [ref=f1e199]:
              - generic [ref=f1e200]:
                - generic [ref=f1e201]: "48"
                - generic [ref=f1e202]: bpm
              - text: Ruhepuls
          - listitem [ref=f1e203]:
            - generic [ref=f1e207]:
              - generic [ref=f1e208]:
                - generic [ref=f1e209]: "189"
                - generic [ref=f1e210]: bpm
              - text: Max. Puls
          - listitem [ref=f1e211]:
            - generic [ref=f1e215]:
              - generic [ref=f1e216]: 14. Juni 2026
              - text: Letzte Diagnostik
          - listitem [ref=f1e218]:
            - generic [ref=f1e223]:
              - generic [ref=f1e224]: 14. Okt. 2026
              - text: Nächste Diagnostik empfohlen
          - listitem [ref=f1e226]:
            - paragraph [ref=f1e227]: "32 Jahre · Empfohlener Abstand: 4 Monate"
      - generic [ref=f1e228]:
        - generic [ref=f1e229]:
          - generic [ref=f1e230]:
            - heading "Leistungsprofil" [level=2] [ref=f1e231]
            - paragraph [ref=f1e232]: Sechs Achsen, gegen Referenzwerte
          - generic [ref=f1e233]: Agilität
        - generic [ref=f1e234]:
          - generic [ref=f1e235]:
            - generic [ref=f1e236]: Perzentil
            - button "Als Tabelle" [ref=f1e237]
          - img "Leistungsprofil — Perzentil" [ref=f1e240]
          - paragraph [ref=f1e243]: 6 von 6 Achsen belegt · Perzentil gegenüber trainierten Erwachsenen deines Alters und Geschlechts.
      - generic [ref=f1e244]:
        - heading "Achsen im Detail" [level=2] [ref=f1e247]
        - list [ref=f1e248]:
          - listitem [ref=f1e249]:
            - generic [ref=f1e250]:
              - generic [ref=f1e251]: Ausdauer
              - generic [ref=f1e252]:
                - generic [ref=f1e253]: "83"
                - generic [ref=f1e254]: +24,7 %
            - generic [ref=f1e258]: 3 Tests
          - listitem [ref=f1e263]:
            - generic [ref=f1e264]:
              - generic [ref=f1e265]: Maxkraft
              - generic [ref=f1e266]:
                - generic [ref=f1e267]: "79"
                - generic [ref=f1e268]: "-4,5 %"
            - generic [ref=f1e272]: 3 Tests
          - listitem [ref=f1e277]:
            - generic [ref=f1e278]:
              - generic [ref=f1e279]: Relativkraft
              - generic [ref=f1e280]:
                - generic [ref=f1e281]: "81"
                - generic [ref=f1e282]: "-1,7 %"
            - generic [ref=f1e286]: 3 Tests
          - listitem [ref=f1e291]:
            - generic [ref=f1e292]:
              - generic [ref=f1e293]: Kraftausdauer
              - generic [ref=f1e294]:
                - generic [ref=f1e295]: "78"
                - generic [ref=f1e296]: +7,5 %
            - generic [ref=f1e300]: 3 Tests
          - listitem [ref=f1e305]:
            - generic [ref=f1e306]:
              - generic [ref=f1e307]: Schnellkraft
              - generic [ref=f1e308]:
                - generic [ref=f1e309]: "79"
                - generic [ref=f1e310]: +9,0 %
            - generic [ref=f1e314]: 1 Test
          - listitem [ref=f1e319]:
            - generic [ref=f1e320]:
              - generic [ref=f1e321]: Agilität
              - generic [ref=f1e322]:
                - generic [ref=f1e323]: "65"
                - generic [ref=f1e324]: +31,6 %
            - generic [ref=f1e328]: 1 Test
      - generic [ref=f1e333]:
        - generic [ref=f1e334]:
          - heading "Letzte Ergebnisse" [level=2] [ref=f1e336]
          - link "Alle ansehen" [ref=f1e338] [cursor=pointer]:
            - /url: /verlauf
        - table [ref=f1e340]:
          - rowgroup [ref=f1e341]:
            - row [ref=f1e342]:
              - columnheader "Test" [ref=f1e343]
              - columnheader "Datum" [ref=f1e344]
              - columnheader "Ergebnis" [ref=f1e345]
              - columnheader "Veränderung" [ref=f1e346]
              - columnheader "RPE" [ref=f1e347]
          - rowgroup [ref=f1e348]:
            - row [ref=f1e349]:
              - cell "Cooper-Test (12 Minuten) Bestleistung Ausdauer · 62.935 ml/kg/min" [ref=f1e350]:
                - generic [ref=f1e351]:
                  - generic [ref=f1e352]: Cooper-Test (12 Minuten)
                  - generic "Bestleistung" [ref=f1e353]
                - generic [ref=f1e357]:
                  - text: Ausdauer ·
                  - generic [ref=f1e358]: 62.935 ml/kg/min
              - cell "14. Juni 2026" [ref=f1e359]
              - cell "3.320m" [ref=f1e360]
              - cell "+12,2 %" [ref=f1e361]
              - cell "9.5" [ref=f1e366]
            - row [ref=f1e367]:
              - cell "Bankdrücken (Bench Press) 1RM Maxkraft · 122.5 kg" [ref=f1e368]:
                - generic [ref=f1e369]: Bankdrücken (Bench Press) 1RM
                - generic [ref=f1e371]:
                  - text: Maxkraft ·
                  - generic [ref=f1e372]: 122.5 kg
              - cell "14. Juni 2026" [ref=f1e373]
              - cell "122,5kg" [ref=f1e374]
              - cell "-3,9 %" [ref=f1e375]
              - cell "9" [ref=f1e380]
            - row [ref=f1e381]:
              - cell "Illinois Agility Test Bestleistung Agilität" [ref=f1e382]:
                - generic [ref=f1e383]:
                  - generic [ref=f1e384]: Illinois Agility Test
                  - generic "Bestleistung" [ref=f1e385]
                - text: Agilität
              - cell "14. Juni 2026" [ref=f1e389]
              - cell "0:16.4" [ref=f1e390]
              - cell "-3,7 %" [ref=f1e391]
              - cell "8" [ref=f1e396]
            - row [ref=f1e397]:
              - cell "2000 m Rudern Bestleistung Ausdauer · 100.5 s/500m" [ref=f1e398]:
                - generic [ref=f1e399]:
                  - generic [ref=f1e400]: 2000 m Rudern
                  - generic "Bestleistung" [ref=f1e401]
                - generic [ref=f1e405]:
                  - text: Ausdauer ·
                  - generic [ref=f1e406]: 100.5 s/500m
              - cell "13. Juni 2026" [ref=f1e407]
              - cell "6:42" [ref=f1e408]
              - cell "-6,1 %" [ref=f1e409]
              - cell "10" [ref=f1e414]
            - row [ref=f1e415]:
              - cell "Bear Complex (Maximallast) Kraftausdauer · 0.992 × KG" [ref=f1e416]:
                - generic [ref=f1e417]: Bear Complex (Maximallast)
                - generic [ref=f1e419]:
                  - text: Kraftausdauer ·
                  - generic [ref=f1e420]: 0.992 × KG
              - cell "13. Juni 2026" [ref=f1e421]
              - cell "82,5kg" [ref=f1e422]
              - cell "-5,7 %" [ref=f1e423]
              - cell "9" [ref=f1e428]
            - row [ref=f1e429]:
              - cell "Standweitsprung Bestleistung Schnellkraft" [ref=f1e430]:
                - generic [ref=f1e431]:
                  - generic [ref=f1e432]: Standweitsprung
                  - generic "Bestleistung" [ref=f1e433]
                - text: Schnellkraft
              - cell "13. Juni 2026" [ref=f1e437]
              - cell "244cm" [ref=f1e438]
              - cell "+2,5 %" [ref=f1e439]
              - cell "7" [ref=f1e444]
            - row [ref=f1e445]:
              - cell "Kniebeuge (Back Squat) 1RM Maxkraft · 165 kg" [ref=f1e446]:
                - generic [ref=f1e447]: Kniebeuge (Back Squat) 1RM
                - generic [ref=f1e449]:
                  - text: Maxkraft ·
                  - generic [ref=f1e450]: 165 kg
              - cell "12. Juni 2026" [ref=f1e451]
              - cell "165,0kg" [ref=f1e452]
              - cell "-4,3 %" [ref=f1e453]
              - cell "9" [ref=f1e458]
            - row [ref=f1e459]:
              - cell "Cindy (20 Min AMRAP) Bestleistung Kraftausdauer · 445 Wdh." [ref=f1e460]:
                - generic [ref=f1e461]:
                  - generic [ref=f1e462]: Cindy (20 Min AMRAP)
                  - generic "Bestleistung" [ref=f1e463]
                - generic [ref=f1e467]:
                  - text: Kraftausdauer ·
                  - generic [ref=f1e468]: 445 Wdh.
              - cell "12. Juni 2026" [ref=f1e469]
              - cell "14Runden" [ref=f1e470]
              - cell "+7,7 %" [ref=f1e471]
              - cell "10" [ref=f1e476]
      - generic [ref=f1e477]:
        - generic [ref=f1e479]:
          - heading "Verlauf" [level=2] [ref=f1e480]
          - paragraph [ref=f1e481]: Cooper-Test (12 Minuten) · m
        - img "Cooper-Test (12 Minuten)" [ref=f1e483]
  - navigation "Hauptnavigation" [ref=f1e486]:
    - generic [ref=f1e487]:
      - button "Start" [ref=f1e488]
      - button "Diagnostik" [ref=f1e493]
      - button "Diagnostik starten" [ref=f1e499]
      - button "Verlauf" [ref=f1e502]
      - button "Profil" [ref=f1e506]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | import { openDemo, openGuest } from './helpers'
  3   | 
  4   | /**
  5   |  * Was beim ersten Aufruf über die Leitung geht, entscheidet darüber, ob die
  6   |  * App in der Halle mit schlechtem Empfang benutzbar ist. Die Diagrammbiblio-
  7   |  * thek ist der grösste Einzelposten — sie darf nur laden, wenn wirklich ein
  8   |  * Diagramm gezeichnet wird.
  9   |  */
  10  | 
  11  | const isEcharts = (url: string) => /\/assets\/echarts-[^/]*\.js$/.test(url)
  12  | 
  13  | test.describe('Auslieferung', () => {
  14  |   test('ohne Diagramm wird die Diagrammbibliothek nicht geladen', async ({ page }) => {
  15  |     const requested: string[] = []
  16  |     page.on('request', (request) => {
  17  |       if (isEcharts(request.url())) requested.push(request.url())
  18  |     })
  19  | 
  20  |     await openGuest(page)
  21  |     await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  22  |     // Kurz Gelegenheit geben, den Baustein zu holen — er darf es nicht.
  23  |     await page.waitForTimeout(600)
  24  | 
  25  |     expect(requested, 'Diagrammbibliothek auf einer Seite ohne Diagramm').toEqual([])
  26  |   })
  27  | 
  28  |   test('mit Diagramm wird sie nachgeladen und das Diagramm erscheint', async ({ page }) => {
  29  |     const requested: string[] = []
  30  |     page.on('request', (request) => {
  31  |       if (isEcharts(request.url())) requested.push(request.url())
  32  |     })
  33  | 
  34  |     await openDemo(page)
  35  | 
  36  |     // Auf das Diagramm warten statt auf `networkidle`: der Service Worker
  37  |     // hält die Verbindung offen, und unter Volllast lief die Wartezeit ins
  38  |     // Zeitlimit, obwohl das Diagramm längst da war.
  39  |     await expect(page.getByRole('img', { name: /Leistungsprofil/ })).toBeVisible()
  40  |     expect(requested.length).toBeGreaterThan(0)
  41  |   })
  42  | 
  43  |   test('das Nachladen verschiebt das Layout nicht', async ({ page }) => {
  44  |     await openDemo(page)
  45  | 
  46  |     // Position eines Elements UNTER dem Diagramm vor und nach dem Nachladen.
  47  |     const probe = page.getByRole('button', { name: /Als Tabelle/ }).first()
  48  |     await probe.waitFor()
  49  |     const before = await probe.boundingBox()
  50  | 
  51  |     await expect(page.getByRole('img', { name: /Leistungsprofil/ })).toBeVisible()
  52  |     const after = await probe.boundingBox()
  53  | 
  54  |     // Der Platzhalter hat exakt die Höhe des Diagramms — sonst wandern die
  55  |     // Bedienelemente unter dem Finger weg und es kommt zu Fehlklicks.
  56  |     expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1)
  57  |   })
  58  | 
  59  |   test('ein fehlgeschlagenes Nachladen reisst die Seite nicht mit', async ({ page }) => {
  60  |     // Abgebrochene Verbindung, geleerter Cache, blockierendes Netz: die
  61  |     // Diagrammfläche bleibt dann leer — aber die Seite muss stehen und die
  62  |     // Zahlen müssen erreichbar bleiben. Ohne Auffangnetz schlüge die Ausnahme
  63  |     // aus Suspense nach oben durch und der Nutzer stünde vor einer weissen
  64  |     // Seite, obwohl alle seine Daten da sind.
  65  |     //
  66  |     // Anmerkung zur Reichweite dieser Prüfung: `route.abort()` unterbricht
  67  |     // hier einen Teilbaustein, den der nachgeladene Baustein statisch
  68  |     // einbindet; das Versprechen bleibt in dieser Emulation offen, statt
  69  |     // abgelehnt zu werden. Der erklärende Hinweistext, den der Code für den
  70  |     // Ablehnungsfall vorhält, lässt sich damit nicht auslösen. Geprüft wird
  71  |     // deshalb die Zusage, die in beiden Fällen gelten muss.
  72  |     await page.route(/\/assets\/echarts-[^/]*\.js$/, (route) => route.abort())
  73  |     await openDemo(page)
  74  | 
  75  |     // Die Seite lebt.
  76  |     await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  77  |     await expect(page.getByText('Leistungsprofil').first()).toBeVisible()
  78  | 
  79  |     // Und der Weg zu den Zahlen funktioniert ohne die Bibliothek.
  80  |     await page.getByRole('button', { name: /Als Tabelle/ }).first().click()
  81  |     await expect(page.getByRole('columnheader', { name: 'Achse' }).first()).toBeVisible()
  82  |     await expect(page.getByRole('cell', { name: /Ausdauer/ }).first()).toBeVisible()
  83  |   })
  84  | })
  85  | 
  86  | test.describe('Aktualisierung der installierten App', () => {
  87  |   test('die App fragt von sich aus nach einer neuen Fassung', async ({ page }) => {
  88  |     // Gemessener Fehler, gegen den dieser Fall steht: die mitgelieferte
  89  |     // Registrierung von vite-plugin-pwa ruft einmal `register()` auf und
  90  |     // fragt danach nie wieder. Ein zurückkehrender Nutzer blieb auch nach
  91  |     // drei Reloads auf dem alten Stand — nach einem Deploy sah er weiterhin
  92  |     // die Version von gestern, ohne dass ihm etwas auffiel.
  93  |     const updateCalls: string[] = []
  94  |     await page.addInitScript(() => {
  95  |       ;(window as unknown as { __swUpdates: number }).__swUpdates = 0
  96  |     })
  97  | 
  98  |     await openDemo(page)
  99  | 
  100 |     // Registrierung ist vorhanden …
> 101 |     await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      |                ^ TimeoutError: page.waitForFunction: Timeout 20000ms exceeded.
  102 |       timeout: 20_000,
  103 |     })
  104 | 
  105 |     // … und die Aktualisierungsprüfung hängt an der Rückkehr zur Seite.
  106 |     const wired = await page.evaluate(async () => {
  107 |       const registration = await navigator.serviceWorker.getRegistration()
  108 |       if (!registration) return 'keine Registrierung'
  109 | 
  110 |       let called = 0
  111 |       const original = registration.update.bind(registration)
  112 |       registration.update = async () => {
  113 |         called += 1
  114 |         return original()
  115 |       }
  116 | 
  117 |       Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  118 |       document.dispatchEvent(new Event('visibilitychange'))
  119 |       Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  120 |       document.dispatchEvent(new Event('visibilitychange'))
  121 | 
  122 |       await new Promise((r) => setTimeout(r, 200))
  123 |       return called
  124 |     })
  125 | 
  126 |     expect(updateCalls).toEqual([])
  127 |     expect(wired, 'Rückkehr zur Seite muss eine Update-Prüfung auslösen').toBeGreaterThan(0)
  128 |   })
  129 | 
  130 |   test('die Registrierung des Plugins ist nicht zusätzlich eingebunden', async ({ page }) => {
  131 |     // Zwei Registrierungen nebeneinander würden sich gegenseitig
  132 |     // überschreiben; die eigene ist die mit der Update-Prüfung.
  133 |     const requested: string[] = []
  134 |     page.on('request', (r) => {
  135 |       if (r.url().endsWith('/registerSW.js')) requested.push(r.url())
  136 |     })
  137 |     await openDemo(page)
  138 |     expect(requested).toEqual([])
  139 |   })
  140 | })
  141 | 
```