# Der Weg in den App Store und zu Google Play

Ziel ist BASELINE als richtige App in beiden Stores. Dieses Dokument hält
fest, wie das geht, was es kostet und was dabei gegen die Zusagen der App
verstiesse — damit die Entscheidung später nicht unter Zeitdruck fällt.

## Der Weg: Capacitor um die bestehende PWA

BASELINE ist eine React-Anwendung, die vollständig auf dem Gerät läuft.
Capacitor legt eine native Hülle darum: das gebaute `dist/` wird in ein
Xcode- und ein Android-Studio-Projekt eingebettet und läuft dort in einer
WebView. Der Anwendungscode bleibt derselbe, die Datenschicht bleibt
dieselbe, die Prüfdateien bleiben dieselben.

Das ist bewusst nicht React Native oder Flutter. Eine Neuentwicklung
brächte native Bedienelemente und würde alles andere neu einführen: den
Testkatalog, die Referenzen, die Migrationen, die 1900 Prüffälle. Der
Gewinn stünde in keinem Verhältnis.

```
npm install @capacitor/core @capacitor/cli
npx cap init "BASELINE" de.baseline.app --web-dir=dist
npm install @capacitor/ios @capacitor/android
npm run build && npx cap add ios && npx cap add android
npx cap sync            # nach jedem Build
```

Nicht ausgeführt, solange kein Gerät und kein Entwicklerkonto vorliegt:
die beiden Projektordner wollen gepflegt werden, und ungepflegt sind sie
schlechter als nicht vorhanden.

## Was zusätzlich gebraucht wird

| | |
|---|---|
| Apple Developer Program | 99 USD im Jahr, Firmenkonto braucht eine D-U-N-S-Nummer |
| Google Play Developer | 25 USD einmalig |
| Mac für den iOS-Build | Xcode läuft nur auf macOS |
| App-Icons und Startbildschirme | je Plattform in mehreren Grössen |
| Datenschutzerklärung unter einer festen Adresse | von beiden Stores verlangt |
| Ausfüllen der Datenschutzangaben | Apple «App Privacy», Google «Data safety» |

## Was die Stores von dieser App verlangen werden

**Keine medizinischen Aussagen.** Beide Stores prüfen Gesundheits-Apps
strenger. BASELINE macht keine Diagnosen, gibt keine Therapieempfehlungen
und bewertet keine Krankheiten (§82) — das muss auch in der
Store-Beschreibung so stehen. Formulierungen wie «erkennt
Übertraining» oder «zeigt Gesundheitsrisiken» wären ein Ablehnungsgrund
und zugleich eine Unwahrheit.

**Belegbare Referenzwerte.** Die Behauptung «wissenschaftlich validiert»
ist nur zulässig, wo sie nachweisbar ist (§81). Die Referenzen tragen ihre
Quelle am Eintrag; die Store-Beschreibung darf nicht mehr versprechen als
diese Quellen hergeben.

**Kauf im Store.** Sobald in der App ein Abo verkauft wird, verlangen
beide Plattformen ihre eigene Abwicklung (In-App Purchase beziehungsweise
Google Play Billing) und behalten 15–30 % ein. Ein Abo, das nur ausserhalb
der App abgeschlossen und dort nur genutzt wird, ist zulässig, darf aber in
der App nicht beworben werden. Das ist die eigentliche Preisfrage: bei
9,90 € im Monat sind 30 % ein spürbarer Anteil.

**Datenangaben.** Solange kein Konto besteht, ist die Antwort in beiden
Formularen dieselbe und angenehm kurz: es werden keine Daten erhoben.
Sobald die Supabase-Synchronisierung dazukommt, ändert sich das und muss
ehrlich angegeben werden — E-Mail-Adresse, Messwerte, Zuordnung zu einer
Kennung.

## Was dabei nicht passieren darf

- Der Export bleibt vollständig und kostenlos, auch in den Store-Fassungen
  (§32). Eine Store-Abrechnung ist kein Grund, Daten festzuhalten.
- Die App bleibt ohne Konto benutzbar. Ein Anmeldezwang wäre bequemer für
  die Abrechnung und ein Bruch mit dem, wofür sie gebaut ist.
- Keine Tracking-Bibliothek, kein Werbe-SDK. Beides zöge Einwilligungen
  nach sich, die die App heute nicht braucht.
