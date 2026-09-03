#!/usr/bin/env python3
"""Baut aus den Aufnahmen in mockups/out eine Galerie.

Die PNG-Aufnahmen liegen in doppelter Auflösung und sind zusammen rund
50 MB. Für das Ansehen wird daraus je Bild ein WebP — dieselbe Auflösung,
ein Bruchteil der Grösse. Die PNG bleiben liegen, falls jemand ein
einzelnes Bild in voller Güte braucht.
"""
import os
import shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
WEB = os.path.join(HERE, 'web')

TITLES = {
    '00-intro': ('Intro-Sequenz', 'Läuft beim Öffnen. Die Werte stammen aus dem Bestand — ohne Messungen zeigt sie, was gemessen wird, ohne Zahl.'),
    '01-willkommen': ('Willkommen', 'Die Wahl vor allem anderen: ohne Konto starten oder den Demobestand ansehen.'),
    '02-onboarding-schritt-1': ('Einstieg', 'Neun Schritte für Einzelnutzer, vier für Trainer. Rollenweiche gleich zu Beginn.'),
    '03-uebersicht': ('Übersicht', 'Performance Orb, die drei jüngsten Werte, der nächste Test mit Begründung.'),
    '04-diagnostik': ('Diagnostik', 'Die sechs Bereiche als schwebende Karten.'),
    '05-bereich-kraft': ('Bereich Kraft', 'Alle Tests eines Bereichs mit Herkunft der Referenz.'),
    '06-sportart': ('Sportart', 'Was für diese Disziplin sinnvoll gemessen wird.'),
    '07-testbatterie': ('Testbatterie', 'Ein zusammengestellter Satz Tests für einen Termin.'),
    '08-termine': ('Termine', 'Diagnostiktermine, geplant und abgeschlossen.'),
    '09-termin': ('Termin', 'Ein Termin mit seinen Tests und dem Stand.'),
    '10-testkatalog': ('Testkatalog', 'Alle Tests, filterbar nach Ausrüstung und Bereich.'),
    '11-testdetail': ('Testdetail', 'Protokoll, Einheit, Referenzlage — mit Quelle.'),
    '12-testdurchfuehrung': ('Test durchführen', 'Eingabe der Messwerte, Versuche, Timer.'),
    '13-ergebnis': ('Ergebnis', 'Der Wert gross, das Referenzspektrum, die Veränderung gegen den eigenen Messfehler.'),
    '14-verlauf': ('Verlauf', 'Die Journey über den Zahlen: Anfang, Bestwerte, Termine, heute.'),
    '15-werte': ('Alle Werte', 'Jede Messung als Liste, filter- und sortierbar.'),
    '16-kalender': ('Kalender', 'Wann gemessen wurde und was ansteht.'),
    '17-erinnerungen': ('Erinnerungen', 'Abstände je Test, nicht ein Takt für alles.'),
    '18-analyse': ('Analyse', 'Stärken, grösstes Potenzial, Abdeckung.'),
    '19-jahresrueckblick': ('Jahresrückblick', 'Nur Veränderungen, die über dem eigenen Messfehler liegen.'),
    '20-community': ('Vergleich', 'Einordnung gegen belegte Referenzen.'),
    '21-bericht': ('Bericht', 'Der Termin als Dokument zum Weitergeben.'),
    '22-profil': ('Profil', 'Angaben, Sportarten, Export, Intro-Schalter.'),
    '23-preise': ('Preise', 'Einzelnutzer, Trainer, Verein.'),
    '24-csv-import-leer': ('CSV-Import', 'Bestehende Excel-Listen übernehmen. Schritt 1: Datei wählen.'),
    '24b-csv-import-vorschau': ('CSV-Import — Vorschau', 'Spalten zuordnen, Vorschau ansehen. Geschrieben wird erst danach.'),
    '25-trainer': ('Trainerbereich', 'Eine Zeile je Athlet, sortiert nach Aufmerksamkeitsbedarf.'),
    '26-gruppentest': ('Gruppentest', 'Eine Station, alle Athleten, ein Schreibvorgang.'),
}

CSS = """
:root { color-scheme: light dark; --bg:#F4F6F1; --fg:#20241D; --muted:#5C6455; --line:#D8DDD1; --card:#FFFFFF; }
@media (prefers-color-scheme: dark) { :root { --bg:#14170F; --fg:#E8ECE2; --muted:#9AA391; --line:#2A2F24; --card:#1B1E17; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font: 15px/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
header { padding: 48px 24px 24px; border-bottom: 1px solid var(--line); }
h1 { margin:0; font-size: 30px; letter-spacing: .12em; text-transform: uppercase; }
header p { color: var(--muted); max-width: 62ch; }
nav { position: sticky; top:0; z-index:2; display:flex; flex-wrap:wrap; gap:6px; padding:12px 24px; background:var(--bg); border-bottom:1px solid var(--line); }
nav a { font-size:12px; text-decoration:none; color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:4px 10px; }
nav a:hover { color: var(--fg); }
section { padding: 40px 24px; border-bottom: 1px solid var(--line); }
h2 { margin:0 0 4px; font-size: 20px; }
section > p { margin:0 0 20px; color: var(--muted); max-width: 70ch; }
.pair { display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; }
figure { margin:0; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:12px; }
figcaption { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); padding-bottom:8px; }
img { display:block; border-radius:8px; }
.phone img { width: 300px; }
.desktop img { width: 640px; }
@media (max-width: 720px) { .desktop img { width: 100%; } }
footer { padding: 32px 24px 64px; color: var(--muted); font-size: 13px; }
"""


def main():
    if os.path.isdir(WEB):
        shutil.rmtree(WEB)
    keys = sorted({os.path.splitext(f)[0] for f in os.listdir(os.path.join(OUT, 'phone'))})

    for project in ('phone', 'desktop'):
        os.makedirs(os.path.join(WEB, project), exist_ok=True)
        for key in keys:
            src = os.path.join(OUT, project, key + '.png')
            if not os.path.exists(src):
                continue
            Image.open(src).convert('RGB').save(
                os.path.join(WEB, project, key + '.webp'), 'WEBP', quality=82, method=5
            )

    parts = [
        '<!doctype html><html lang="de"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>BASELINE — Mockups</title>',
        f'<style>{CSS}</style></head><body>',
        '<header><h1>Baseline — Mockups</h1>',
        '<p>Alle Bereiche der App, aufgenommen aus der laufenden Anwendung mit dem '
        'Demobestand. Die Werte sind nicht gezeichnet, sondern gerechnet: derselbe '
        'Athlet über drei Diagnostiktermine, durch dieselbe Ableitung wie im Betrieb. '
        'Telefon dunkel, Schreibtisch hell — beide Themes im selben Durchlauf.</p></header>',
        '<nav>'
        + ''.join(f'<a href="#{k}">{TITLES.get(k, (k, ""))[0]}</a>' for k in keys)
        + '</nav>',
    ]
    for key in keys:
        title, note = TITLES.get(key, (key, ''))
        parts.append(f'<section id="{key}"><h2>{title}</h2><p>{note}</p><div class="pair">')
        for project, label in (('phone', 'Telefon · 412 × 915'), ('desktop', 'Schreibtisch · 1440 × 900')):
            if os.path.exists(os.path.join(WEB, project, key + '.webp')):
                parts.append(
                    f'<figure class="{project}"><figcaption>{label}</figcaption>'
                    f'<img src="{project}/{key}.webp" alt="{title} — {label}" loading="lazy"></figure>'
                )
        parts.append('</div></section>')
    parts.append(
        '<footer>Aufgenommen mit <code>npm run mockups</code>. '
        'Baseline ist keine medizinische Diagnostik.</footer></body></html>'
    )
    with open(os.path.join(WEB, 'index.html'), 'w') as f:
        f.write(''.join(parts))
    size = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, _, fs in os.walk(WEB)
        for f in fs
    )
    print(f'{len(keys)} Bildschirme, {size / 1e6:.1f} MB in {WEB}')


if __name__ == '__main__':
    main()
