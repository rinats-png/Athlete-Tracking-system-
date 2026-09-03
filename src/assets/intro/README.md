# Figurenbilder der Intro-Sequenz

Die Vorlage der Sequenz (`BaselineIntroSequenz.html`) benutzt fünf
Posenbilder: Überkopfdrücken, Sprint, Sidekick, Schwimmstart, Jab.

Diese Bilder liegen dem Projekt nicht bei. Solange sie fehlen, trägt die
vorhandene Körperfigur (`../body-figure.webp`) die Szenen und wird je Szene
anders angeschnitten.

## Bilder ergänzen

Lege die Dateien hier ab — die Sequenz nimmt sie ohne Codeänderung auf,
sortiert nach Dateinamen:

```
src/assets/intro/1-press.webp
src/assets/intro/2-sprint.webp
src/assets/intro/3-sidekick.webp
src/assets/intro/4-dive.webp
src/assets/intro/5-jab.webp
```

Erwartet wird `.webp` oder `.png`:

- freigestellt, mit durchsichtigem Hintergrund
- Seitenverhältnis etwa 2:3, Figur mittig, etwas Luft am Rand
- lange Kante höchstens 1400 px — die Sequenz zeigt sie nie grösser, und
  jedes Kilobyte hier verzögert den Start der App
- ohne Text im Bild: die Beschriftungen sind echter Text daneben,
  übersetzbar und vorlesbar

Mehr als fünf Bilder werden nicht gebraucht; die Sequenz zeigt höchstens
drei Szenen.
