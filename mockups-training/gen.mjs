import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'

const ic = (C, size = 18, sw = 1.8) => renderToStaticMarkup(h(C, { size, strokeWidth: sw }))
const IMG = (k) => `../public/testbilder/U_${k}.jpg`

/* ---------- Bogen mit sechs Tabs: Plan groß, links der Mitte ---------- */
const TABS = [
  { i: L.House, t: 'Heute', x: 34 },
  { i: L.ClipboardList, t: 'Test', x: 92 },
  { i: L.CalendarRange, t: 'Plan', x: 160, big: true },
  { i: L.BarChart3, t: 'Leistung', x: 236 },
  { i: L.Flame, t: 'Fuel', x: 292 },
  { i: L.Ellipsis, t: 'Mehr', x: 346 },
]
function dock(active = 2) {
  const W = 390, H = 122, A = 178, BASE = 104, B = 48
  const items = TABS.map((t, k) => {
    const x = t.x
    const y = BASE - B * Math.sqrt(Math.max(0, 1 - ((x - 195) / A) ** 2))
    const s = t.big ? 64 : 42
    const on = k === active
    return `<div class="tab ${on ? 'on' : ''} ${t.big ? 'big' : ''}" style="left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px">${ic(t.i, t.big ? 28 : 20)}</div><span class="tl ${on ? 'on' : ''}" style="left:${x - 28}px;top:${y + s / 2 + 1}px">${t.t}</span>`
  }).join('')
  return `<div class="dock"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="arc"><path d="M0,${H} A${W / 2},${H - 14} 0 0 1 ${W},${H} Z"/></svg>${items}</div>`
}

/* ---------- Bausteine ---------- */
const chip = (txt, kind = '') => `<span class="chip ${kind}">${txt}</span>`
const conf = (lvl) => chip(`<i class="dot"></i>Datenlage ${lvl}`, 'conf')
const ev = (txt) => chip(`Evidenz ${txt}`, 'ev')
const unrev = () => chip('Ungeprüft', 'unrev')
const big = (n, u = '') => `<span class="big">${n}</span>${u ? `<span class="u">${u}</span>` : ''}`
const hd = (title, sub = '', back = false) => `<div class="hd">${back ? `<span class="bk">${ic(L.ChevronLeft, 20)}</span>` : ''}<div><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`
const phone = (n, label, body, theme, activeTab = 2, dockOn = true) => `<figure class="${theme}"><div class="phone"><div class="screen"><div class="sb"><span>9:41</span><span>${ic(L.Signal, 12)} ${ic(L.Wifi, 12)} ${ic(L.BatteryFull, 14)}</span></div>${body}${dockOn ? dock(activeTab) : ''}</div></div><figcaption><b>${n}</b> ${label}</figcaption></figure>`

/* ---------- Screens ---------- */
const hub = () => `${hd('Plan', 'HYROX Frankfurt · 12.04.2027')}<div class="pad">
 <div class="card hero"><small class="k">AKTUELLER BLOCK</small><h2>Aerobic Power &amp; Laufeffizienz</h2>
  <div class="wk">${[1, 2, 3, 4, 5, 6].map((w) => `<i class="${w < 3 ? 'd' : w === 3 ? 'c' : ''}"></i>`).join('')}</div>
  <div class="meta">Woche 3 von 6 · Phase Aufbau</div><div class="chips">${chip(ic(L.Timer, 12) + ' Retest in 18 Tagen')}${chip(ic(L.Flag, 12) + ' Wettkampf in 47 Tagen')}</div></div>
 <div class="g2">
  <div class="card"><small class="k">HEUTE</small><div class="mid">4 × 4 Intervalle</div><small>25 min · Schlüsseleinheit</small></div>
  <div class="card"><small class="k">DIESE WOCHE</small><div>${big('3', 'von 5')}</div><small>Einheiten abgeschlossen</small></div>
  <div class="card"><small class="k">BLOCKZIEL</small><div class="mid">Aerobic Power</div><small>Erhalt: Maximalkraft</small></div>
  <div class="card"><small class="k">RETEST</small><div class="mid">5-km-Test</div><small>in 18 Tagen</small></div></div>
 <div class="card"><b>Warum trainiere ich das?</b><p>Deine aerobe Leistungsfähigkeit liegt im ausreichend gemessenen Profil unter den übrigen Dimensionen. Der Block priorisiert sie und erhält die Kraft.</p><div class="chips">${conf('hoch')}${ev('hoch · übertragen')}${unrev()}</div><a class="lnk">Warum? ${ic(L.ChevronRight, 14)}</a></div>
 <div class="sc">${['Plan', 'Tests', 'Bibliothek', 'Fragen'].map((t, k) => `<span>${ic([L.CalendarRange, L.ClipboardList, L.Library, L.MessageSquareText][k], 16)}${t}</span>`).join('')}</div></div>`

const way = () => `${hd('Plan wählen')}<div class="pad">
 <div class="way" style="--im:url(${IMG('rowing_erg')})"><div><b>Vorgefertigten Plan nutzen</b><small>Programme aus belegten Regeln</small>${unrev()}</div></div>
 <div class="way" style="--im:url(${IMG('back_squat')})"><div><b>Plan selbst erstellen</b><small>Volle Kontrolle und Flexibilität</small>${chip('Ohne Tests möglich')}</div></div>
 <div class="way lock" style="--im:url(${IMG('treadmill')})"><div><b>${ic(L.Lock, 16)} KI-Plan erstellen</b><small>Aus deinen Tests und Zielen berechnet</small>${chip('Abdeckung 68 %')}</div></div>
 <a class="lnk c">${ic(L.FileUp, 14)} Plan importieren (Datei)</a>
 <p class="note">„KI-Plan“ heißt: aus belegten Regeln berechnet. Ein Sprachmodell formuliert höchstens die Erklärung.</p></div>`

const lib = () => `${hd('Pläne', 'Vorgefertigt')}<div class="pad"><div class="srch">${ic(L.Search, 14)} Plan suchen</div>
 <div class="chips">${['Alle', 'HYROX', 'Hybrid', 'Boxen', 'Judo', 'Ringen'].map((t, k) => chip(t, k === 0 ? 'sel' : '')).join('')}</div>
 ${[['rowing_erg', 'HYROX Foundation', '8 Wochen · 4 Einh./Woche', 'Aerobe Basis · Kraft · Technik'], ['treadmill', 'HYROX Aerobic Engine', '6 Wochen · 5 Einh./Woche', 'Laufen · aerobe Leistung'], ['pull_up', 'Judo Griff &amp; Kraft', '6 Wochen · 4 Einh./Woche', 'Griffausdauer · Maximalkraft'], ['back_squat', 'Boxen Fight Camp', '8 Wochen · 5 Einh./Woche', 'VO₂max · Power · Runden']].map(([im, t, m, f]) => `<div class="pl"><img src="${IMG(im)}"><div><b>${t}</b><small>${m}</small><small>${f}</small><div class="chips">${ev('mittel')}${unrev()}</div></div></div>`).join('')}</div>`

const detail = () => `${hd('HYROX Performance', '16 Wochen · 5 Einheiten/Woche', true)}<div class="pad">
 <div class="card"><small class="k">PHASEN</small><div class="tl2"><i style="flex:4">Basis<br><small>W1–4</small></i><i style="flex:6" class="a">Aufbau<br><small>W5–10</small></i><i style="flex:4">Spezifisch<br><small>W11–14</small></i><i style="flex:2">Taper<br><small>W15–16</small></i></div></div>
 <div class="card"><small class="k">ZIELE</small><div class="gl"><b>Primär</b><span>Aerobe Kapazität · Laufleistung</span></div><div class="gl"><b>Sekundär</b><span>Kraftausdauer</span></div><div class="gl"><b>Erhalt</b><span>Maximalkraft</span></div></div>
 <div class="card soft"><b>Bewusst nicht priorisiert</b><p>Power und Maximalkraft werden in diesem Block nur erhalten.</p></div>
 <div class="card"><small class="k">GRUNDLAGE</small><div class="chips">${ev('hoch / mittel')}${chip('Direkte HYROX-Evidenz niedrig')}${unrev()}</div><a class="lnk">Quellen &amp; Regeln ${ic(L.ChevronRight, 14)}</a></div>
 <div class="cta">Anpassen &amp; übernehmen</div></div>`

const indiv = () => `${hd('Plan anpassen', '', true)}<div class="pad">
 <small class="k">ZIEL</small><div class="seg"><i class="s">Leistung</i><i>Wettkampf</i><i>Schwäche</i><i>Allgemein</i></div>
 <small class="k">WETTKAMPF (OPTIONAL)</small><div class="fld">12.04.2027 · HYROX Frankfurt</div>
 <small class="k">TRAININGSTAGE</small><div class="chips">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d, k) => chip(d, [0, 1, 3, 4, 5].includes(k) ? 'sel' : '')).join('')}</div>
 <small class="k">ZEIT PRO EINHEIT</small><div class="chips">${['30', '45', '60', '75', '90+'].map((d, k) => chip(d + ' min', k === 2 ? 'sel' : '')).join('')}</div>
 <small class="k">AUSRÜSTUNG</small><div class="chips">${['Eigengewicht', 'Studio', 'Sled', 'SkiErg', 'RowErg', 'Assault Bike', 'Bahn'].map((d, k) => chip(d, [1, 2, 3, 4, 6].includes(k) ? 'sel' : '')).join('')}</div>
 <small class="k">FESTE EINHEITEN</small><div class="card tight"><div class="row"><span>Mi</span>Kickboxen</div><div class="row"><span>Fr</span>Sparring</div><div class="row"><span>So</span>Langer Lauf</div></div>
 <div class="card ok"><b>${ic(L.ShieldCheck, 16)} Regelprüfung</b><small>Kein VO₂max-Reiz am Tag vor Sparring · Kraft und harte Ausdauer getrennt · höchstens 3 harte Einheiten pro Woche</small></div></div>`

const cal = () => `${hd('Woche 3 von 16', '12. – 18. Okt.')}<div class="pad"><div class="seg"><i class="s">Woche</i><i>Phase</i><i>Monat</i></div>
 <div class="wkgrid">${[['Mo', 'Kraft', 'Maximalkraft', '60', 'k1'], ['Di', '4×4', 'VO₂max', '25', 'k2'], ['Mi', 'Kickboxen', 'Fest', '60', 'k3'], ['Do', 'Kraft', 'Power', '45', 'k1'], ['Fr', 'Sparring', 'Fest', '60', 'k3'], ['Sa', 'Lauf Z2', 'Aerob', '70', 'k4'], ['So', 'Frei', '', '', 'k0']].map(([d, t, s, m, c], k) => `<div class="day ${c} ${k === 3 ? 'lift' : ''}"><small>${d}</small><b>${t}</b><small>${s}</small><small>${m ? m + ' min' : ''}</small></div>`).join('')}</div>
 <div class="drag">${ic(L.GripVertical, 14)} Do „Kraft · Power“ auf Sa ziehen — oder antippen und Tag wählen</div>
 <div class="card"><small class="k">DI · 4×4 VO₂max</small><div class="chips">${chip('Schlüsseleinheit')}${ev('hoch · übertragen')}${chip(ic(L.Fuel || L.Flame, 12) + ' Fuel')}</div><small>Warum? · Quellen · Ändern</small></div></div>`

const builder = () => `${hd('Mittwoch · Woche 3', 'Eigener Plan', true)}<div class="pad">
 <div class="card soft"><small>Eigener Plan: KYDON belegt ihn nicht. Hinweise zeigen Konflikte und ändern nichts.</small></div>
 <div class="crumb">Plan › Aufbau › Woche 3 › Mi</div>
 <div class="mod"><small class="k">WARM-UP</small><b>Allgemein + Aktivierung</b><small>10 min</small></div>
 <div class="mod ex"><img src="${IMG('back_squat')}"><div><small class="k">KRAFT</small><b>Kniebeuge (Langhantel)</b><small>4 Sätze × 5 · 82 % 1RM · RIR 2 · Pause 3 min</small></div></div>
 <div class="mod"><small class="k">AUSDAUER</small><b>Intervall</b><small>4 × 4 min · 90–95 % HFmax · Pause 3 min</small></div>
 <div class="add">${ic(L.Plus, 14)} Modul hinzufügen</div>
 <div class="chips">${['Kopieren', 'Verschieben', 'Duplizieren', 'Als Vorlage'].map((t) => chip(t)).join('')}</div>
 <div class="card warn"><small>${ic(L.TriangleAlert, 14)} Hinweis: Kraft und VO₂max am selben Tag. Getrennte Tage sind in der Literatur günstiger belegt. Du entscheidest.</small></div></div>`

const gate = () => `${hd('KI-Plan', 'Aus deinen Tests berechnet', true)}<div class="pad">
 <div class="ring"><svg viewBox="0 0 120 120" width="150"><circle cx="60" cy="60" r="50" class="rt"/><circle cx="60" cy="60" r="50" class="rf" stroke-dasharray="${(0.68 * 314).toFixed(0)} 314" transform="rotate(-90 60 60)"/></svg><div><b>68 %</b><small>Abdeckung</small></div></div>
 <div class="card tight">${[['Laufleistung', '5 km 22:48', 'ok', 'hoch'], ['Aerobe Kapazität', 'Cooper 2910 m', 'ok', 'hoch'], ['Beinkraft', 'Kreuzheben 175 kg', 'ok', 'mittel'], ['Kraftausdauer', 'fehlt', 'no', ''], ['HYROX-Simulation', 'fehlt · stark empfohlen', 'no', ''], ['Power', 'CMJ 38,4 cm', 'ok', 'mittel']].map(([a, b, s, c]) => `<div class="row g"><span class="${s}">${s === 'ok' ? ic(L.Check, 14) : ic(L.Minus, 14)}</span><div><b>${a}</b><small>${b}</small></div>${c ? chip(c) : ''}</div>`).join('')}</div>
 <div class="card soft"><small>Freigeschaltet wird nach Sport, nötigen Dimensionen, Aktualität, Messqualität und Datenlage, nicht nach einer festen Anzahl Tests.</small></div>
 <div class="cta">Fehlende Tests planen</div></div>`

const result = () => `${hd('Dein Leistungsprofil', 'Berechnet aus belegten Regeln', true)}<div class="pad">
 <div class="card tight">${[['Stärke', 'Relative Kraft', 'hoch'], ['Stärke', 'Stationskraft', 'mittel'], ['Solide', 'Power', 'mittel'], ['Potenzial', 'Aerobe Kapazität', 'hoch'], ['Potenzial', 'Laufdauerhaftigkeit', 'mittel']].map(([a, b, c]) => `<div class="row g"><span class="lab">${a}</span><b>${b}</b>${chip('Datenlage ' + c)}</div>`).join('')}</div>
 <div class="card hero"><small class="k">EMPFOHLENER BLOCK · 6 WOCHEN</small><div class="gl"><b>Primär</b><span>Aerobe Leistung</span></div><div class="gl"><b>Sekundär</b><span>Laufdauerhaftigkeit</span></div><div class="gl"><b>Erhalt</b><span>Maximalkraft</span></div><div class="chips">${ev('hoch / mittel')}${unrev()}</div></div>
 <div class="cta">Plan anzeigen</div><p class="note">Du kannst jede Einheit ändern. Jede Änderung braucht einen Grund.</p></div>`

const why = () => `${hd('Warum?', '4 × 4 Intervalle', true)}<div class="pad">
 <div class="card"><small class="k">ZIEL</small><b>Aerobe Leistung</b></div>
 <div class="card"><small class="k">WARUM FÜR DICH?</small><p>Aerobe Kapazität liegt unter deinen anderen ausreichend gemessenen Dimensionen.</p><div class="chips">${conf('hoch')}</div></div>
 <div class="card"><small class="k">WARUM DIESE METHODE?</small><p>4×4-Intervalle sind für die Entwicklung der VO₂max stark belegt. 4×4 ist nicht allgemein überlegen.</p></div>
 <div class="card tight"><div class="row"><span>Evidenzstärke</span>hoch</div><div class="row"><span>Spezifität</span>auf HYROX übertragen</div><div class="row"><span>Direkte HYROX-Evidenz</span>niedrig</div><div class="row"><span>Regel</span>vo2_4x4 · v1.0.0</div><div class="row"><span>Prüfstatus</span>ungeprüft</div></div>
 <a class="lnk">Quellen ${ic(L.ChevronRight, 14)}</a></div>`

const playInt = () => `<div class="hd"><div><b>4 × 4 Intervalle</b><small>Intervall 2 / 4</small></div></div><div class="pad c">
 <div class="segs">${[1, 2, 3, 4].map((i) => `<i class="${i < 2 ? 'd' : i === 2 ? 'c' : ''}"></i>`).join('')}</div>
 <small class="k">ARBEIT</small><div class="clock">03:12</div>
 <div class="g2"><div class="card"><small class="k">ZIEL-HF</small><div class="mid">168–177</div></div><div class="card"><small class="k">AKTUELL</small><div class="mid">171</div><small>${ic(L.Bluetooth, 12)} Gurt verbunden</small></div></div>
 <div class="g2"><div class="btn2">Pause</div><div class="btn2">Überspringen</div></div><small class="note">Ohne Gurt: Herzfrequenz manuell eintragen.</small></div>`

const playStr = () => `<div class="hd"><div><b>Kraft</b><small>Satz 3 / 4</small></div></div><div class="pad c">
 <img class="exim" src="${IMG('back_squat')}"><b class="mid">Kniebeuge (Langhantel)</b>
 <div class="g2"><div class="card"><small class="k">WIEDERHOLUNGEN</small><div>${big('5')}</div></div><div class="card"><small class="k">GEWICHT</small><div>${big('120', 'kg')}</div></div></div>
 <small>Ziel-RPE 8 · Pause 03:00</small><div class="rest"><i style="width:62%"></i><span>Pause 01:52</span></div><div class="cta">Satz abgeschlossen</div></div>`

const post = () => `${hd('Einheit abschließen', '4 × 4 Intervalle')}<div class="pad">
 <small class="k">ABGESCHLOSSEN</small><div class="seg"><i class="s">Ja</i><i>Teilweise</i><i>Nein</i></div>
 <small class="k">DAUER</small><div class="fld">26 min</div>
 <small class="k">ANSTRENGUNG (RPE 1–10)</small><div class="chips">${[5, 6, 7, 8, 9, 10].map((n) => chip(String(n), n === 8 ? 'sel' : '')).join('')}</div>
 <small class="k">OPTIONAL</small><div class="seg"><i>Schwerer</i><i class="s">Wie erwartet</i><i>Leichter</i></div>
 <div class="card soft tog"><span>${ic(L.Activity, 14)} Schmerz oder Auffälligkeit</span><i class="sw"></i></div>
 <small class="note">Wenn aktiv: Automatische Anpassungen werden gestoppt. KYDON stellt keine Diagnose.</small><div class="cta">Eintragen</div></div>`

const outcome = () => `${hd('Block-Ergebnis', 'Aerobe Leistung · 6 Wochen', true)}<div class="pad">
 <div class="card"><div class="g2 in"><div><small class="k">AUSGANG</small>${big('24:18')}<small>5 km</small></div><div><small class="k">RETEST</small>${big('22:15')}<small>5 km</small></div></div></div>
 <div class="card tight"><div class="row"><span>Umsetzung</span>92 %</div><div class="row"><span>Typischer Messfehler</span>bekannt</div></div>
 <div class="card hero"><b>Veränderung über der Messschwankung</b><small>Der Wert liegt über der hinterlegten Messvariation.</small></div>
 <div class="card soft"><small>Der Bericht sagt nicht, dass der Plan die Veränderung verursacht hat.</small></div>
 <small class="k">WEITER</small><div class="chips">${['Fortsetzen', 'Erhalten', 'Priorität ändern', 'Erneut messen'].map((t) => chip(t)).join('')}</div></div>`

const coach = () => `${hd('Athleten · Pläne', 'Trainer')}<div class="pad">
 ${[['Mia K.', 'HYROX Performance', 'W3/16', '3/5', 'hoch', '18 Tage'], ['Jonas B.', 'Judo Griff &amp; Kraft', 'W2/6', '4/4', 'mittel', '9 Tage'], ['Lena R.', 'Boxen Fight Camp', 'W6/8', '2/5', 'mittel', '—']].map(([n, p, w, c, d, r]) => `<div class="card"><b>${n}</b><small>${p} · ${w}</small><div class="chips">${chip('Einheiten ' + c)}${chip('Datenlage ' + d)}${chip('Retest ' + r)}</div></div>`).join('')}
 <div class="card hero"><b>Plan zuweisen</b><small>Athlet oder Gruppe · Startdatum · Vorlage in Version v4</small><div class="chips">${chip('Athlet')}${chip('Gruppe')}</div><small class="note">Der Athlet sieht den Plan. Du siehst erledigt, Dauer und Anstrengung, nur mit seiner Freigabe.</small></div>
 <div class="card soft"><small><b>Vorschlag</b> Aerobe Kapazität hat sich verbessert, Power blieb stabil, der Block endet in 6 Tagen. Nichts wird automatisch übernommen.</small></div></div>`

const fuel = () => `${hd('Fuel zur Einheit', '4 × 4 Intervalle · 25 min', true)}<div class="pad">
 ${[['Vorher', '1–4 g/kg Kohlenhydrate, 1–4 h vorher; näher an der Einheit leicht verdaulich'], ['Währenddessen', 'Bei dieser Dauer meist nichts nötig; Wasser nach Durst'], ['Danach', 'Protein, Kohlenhydrate nach der nächsten Belastung ausrichten']].map(([a, b]) => `<div class="card"><small class="k">${a.toUpperCase()}</small><p>${b}</p><a class="lnk">Warum? ${ic(L.ChevronRight, 14)}</a></div>`).join('')}
 <div class="chips">${ev('mittel – hoch')}${unrev()}</div></div>`

const trend = () => `${hd('Langfristige Entwicklung', '', false)}<div class="pad"><div class="seg"><i>3 M</i><i class="s">6 M</i><i>12 M</i><i>Gesamt</i></div>
 <div class="card"><small class="k">5 KM · LAUFLEISTUNG</small><svg viewBox="0 0 300 120" width="100%"><polyline fill="none" stroke="var(--acc)" stroke-width="2.5" points="10,30 70,38 130,34 190,60 250,78 290,92"/><line x1="10" y1="104" x2="290" y2="104" stroke="var(--line)"/><circle cx="290" cy="92" r="5" fill="var(--acc)"/></svg><div class="chips">${conf('hoch')}${chip('3 Messungen')}</div></div>
 <div class="card tight"><div class="row"><span>Veränderung</span>über der Messschwankung</div><div class="row"><span>Referenzgruppe</span>männlich, 30–39 J.</div><div class="row"><span>Einheiten (Plan)</span>92 %</div><div class="row"><span>Gesamt-sRPE</span>1 840 AU</div></div>
 <div class="card soft"><small>Kein Gesamtwert ohne Abdeckung, Alter, Datenqualität, Referenzgruppe und passende Testmethode.</small></div></div>`

/* ---------- Boards ---------- */
const css = `
:root{--ff:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.dark{--bg:#0B1014;--s:#141C21;--sr:#1B252B;--sun:#070A0D;--ink:#F2F7F8;--i2:#BFCCD0;--im:#90A0A4;--line:#2F3A3F;--acc:#7FE5B5;--accink:#06100B;--glow:#A6F0CE;--q:rgba(127,229,181,.18)}
.light{--bg:#EEF4F3;--s:#fff;--sr:#fff;--sun:#D6E3E2;--ink:#0d1f1b;--i2:#40544f;--im:#5c716c;--line:#C3D2CF;--acc:#1E7D63;--accink:#F4FBF8;--glow:#3FBF93;--q:rgba(30,125,99,.14)}
body{margin:0;padding:26px;background:#8aa0a0;font-family:var(--ff);display:grid;grid-template-columns:repeat(4,390px);gap:26px 26px;justify-content:center;width:max-content}
figure{margin:0;width:390px}figcaption{margin-top:8px;font-size:13px;text-align:center;color:#0b1613}
.phone{width:390px;height:780px;border-radius:38px;background:#000;padding:8px;box-sizing:border-box}
.screen{position:relative;height:100%;border-radius:30px;overflow:hidden;background:var(--bg);color:var(--ink)}
.sb{display:flex;justify-content:space-between;padding:10px 22px 0;font-size:12px;color:var(--ink)}
.hd{display:flex;gap:6px;align-items:center;padding:12px 18px 8px}.hd b{display:block;font-size:22px;letter-spacing:-.01em}.hd small{color:var(--im);font-size:12px}.bk{color:var(--i2)}
.pad{padding:4px 14px 150px;display:flex;flex-direction:column;gap:9px;height:calc(100% - 96px);overflow:hidden}.pad.c{align-items:stretch;padding-bottom:14px}
.card{background:var(--sr);border:1px solid var(--line);border-radius:16px;padding:11px 13px;display:flex;flex-direction:column;gap:5px;font-size:13px}
.card p{margin:0;color:var(--i2);line-height:1.4;font-size:12.5px}.card small,small{color:var(--im);font-size:11.5px}.k{letter-spacing:.09em;font-size:10px!important;color:var(--im)!important;font-weight:700}
.card.hero{border-color:var(--acc);background:linear-gradient(180deg,var(--q),transparent)}.card.hero h2{margin:2px 0;font-size:19px}.card.soft{background:var(--sun);border-style:dashed}.card.ok{border-color:var(--acc)}.card.warn{border-color:#b8923a}.card.tight{gap:0;padding:4px 13px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:9px}.mid{font-size:16px;font-weight:700}.big{font-size:32px;font-weight:300;font-family:ui-monospace,Menlo,monospace;letter-spacing:-.02em}.u{color:var(--im);margin-left:4px;font-size:13px}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:99px;padding:4px 10px;font-size:11px;color:var(--i2);min-height:24px;box-sizing:border-box}
.chip.sel{background:var(--acc);color:var(--accink);border-color:var(--acc);font-weight:700}.chip.unrev{border-style:dashed;color:var(--im)}.chip.ev{border-color:var(--acc);color:var(--acc)}.dot{width:7px;height:7px;border-radius:50%;background:var(--acc);display:inline-block}
.lnk{color:var(--acc);font-size:12.5px;display:inline-flex;align-items:center;gap:3px;font-weight:600}.lnk.c{justify-content:center;padding:6px}
.cta{margin-top:auto;background:var(--acc);color:var(--accink);text-align:center;padding:13px;border-radius:99px;font-weight:700;font-size:14px}
.btn2{border:1px solid var(--line);background:var(--sr);text-align:center;padding:12px;border-radius:99px;font-size:13px}
.note{font-size:11.5px;color:var(--im);line-height:1.4;margin:0}
.wk{display:flex;gap:4px}.wk i{flex:1;height:6px;border-radius:3px;background:var(--line)}.wk i.d{background:var(--acc)}.wk i.c{background:var(--glow)}.meta{font-size:12px;color:var(--i2)}
.sc{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.sc span{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:var(--i2);border:1px solid var(--line);border-radius:14px;padding:9px 2px;background:var(--sr)}
.way{height:128px;border-radius:18px;background:linear-gradient(90deg,rgba(7,10,13,.88),rgba(7,10,13,.35)),var(--im) center/cover;border:1px solid var(--line);display:flex;align-items:flex-end;padding:13px;color:#F2F7F8;background-image:linear-gradient(90deg,rgba(7,10,13,.9),rgba(7,10,13,.3)),var(--im)}
.way>div{display:flex;flex-direction:column;gap:5px}.way b{font-size:16px;display:flex;gap:6px;align-items:center}.way small{color:#cfdadc}.way .chip{color:#e8f1f2;border-color:#ffffff55;width:max-content}.way.lock{filter:saturate(.5)}
.way{background-size:cover;background-position:center}
.srch{border:1px solid var(--line);background:var(--sr);border-radius:99px;padding:10px 14px;color:var(--im);font-size:13px;display:flex;gap:8px;align-items:center}
.pl{display:flex;gap:11px;background:var(--sr);border:1px solid var(--line);border-radius:16px;padding:9px}.pl img{width:84px;height:100px;object-fit:cover;border-radius:11px}.pl>div{display:flex;flex-direction:column;gap:3px}.pl b{font-size:14px}
.tl2{display:flex;gap:4px;margin-top:4px}.tl2 i{font-style:normal;background:var(--sun);border:1px solid var(--line);border-radius:10px;padding:8px 6px;font-size:12px;text-align:center;line-height:1.3}.tl2 i.a{background:var(--q);border-color:var(--acc)}
.gl{display:flex;gap:10px;padding:5px 0;border-top:1px solid var(--line)}.gl:first-of-type{border-top:0}.gl b{width:64px;color:var(--im);font-size:12px}.gl span{font-size:13px}
.seg{display:flex;background:var(--sun);border:1px solid var(--line);border-radius:99px;padding:3px;gap:2px}.seg i{flex:1;text-align:center;font-style:normal;font-size:12px;padding:7px 2px;border-radius:99px;color:var(--i2)}.seg i.s{background:var(--acc);color:var(--accink);font-weight:700}
.fld{border:1px solid var(--line);background:var(--sr);border-radius:12px;padding:11px 13px;font-size:14px}
.row{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);font-size:13px}.row:first-child{border-top:0}.row>span:first-child{color:var(--im);min-width:78px;font-size:12px}.row.g>div{flex:1;display:flex;flex-direction:column}.row .ok{color:var(--acc)}.row .no{color:var(--im)}.lab{width:72px;color:var(--im);font-size:11.5px!important}
.wkgrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.day{min-width:0;overflow:hidden;border:1px solid var(--line);background:var(--sr);border-radius:10px;padding:6px 2px;display:flex;flex-direction:column;gap:2px;text-align:center;min-height:92px}.day b{font-size:11px}.day small{font-size:9.5px}
.day.k1{border-top:3px solid var(--acc)}.day.k2{border-top:3px solid var(--glow);background:var(--q)}.day.k3{border-top:3px dashed var(--im)}.day.k4{border-top:3px solid var(--line)}.day.k0{opacity:.55}.day.lift{transform:translateY(-6px) rotate(-2deg);box-shadow:0 10px 26px rgba(0,0,0,.4);border-color:var(--glow)}
.drag{font-size:11.5px;color:var(--i2);display:flex;gap:6px;align-items:center;border:1px dashed var(--line);border-radius:12px;padding:8px}
.crumb{font-size:11.5px;color:var(--im)}.mod{background:var(--sr);border:1px solid var(--line);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}.mod b{font-size:14px}
.mod.ex{flex-direction:row;gap:10px}.mod.ex img{width:62px;height:62px;border-radius:10px;object-fit:cover}.mod.ex>div{display:flex;flex-direction:column;gap:2px}.add{border:1px dashed var(--acc);color:var(--acc);border-radius:12px;padding:9px;text-align:center;font-size:12.5px;display:flex;gap:6px;justify-content:center;align-items:center}
.ring{display:flex;align-items:center;justify-content:center;gap:14px;position:relative}.ring svg{margin:0}.rt{fill:none;stroke:var(--line);stroke-width:9}.rf{fill:none;stroke:var(--acc);stroke-width:9;stroke-linecap:round}.ring>div{position:absolute;display:flex;flex-direction:column;align-items:center}.ring b{font-size:30px;font-weight:300}
.segs{display:flex;gap:6px}.segs i{flex:1;height:7px;border-radius:4px;background:var(--line)}.segs i.d{background:var(--acc)}.segs i.c{background:var(--glow)}.clock{font-size:76px;font-weight:300;text-align:center;font-family:ui-monospace,Menlo,monospace;letter-spacing:-.03em;line-height:1.1}
.exim{width:100%;height:170px;object-fit:cover;border-radius:16px}.rest{height:30px;border-radius:99px;background:var(--sun);border:1px solid var(--line);position:relative;overflow:hidden}.rest i{position:absolute;inset:0 auto 0 0;background:var(--q)}.rest span{position:absolute;inset:0;display:flex;align-items:center;padding-left:14px;font-size:12px}
.tog{flex-direction:row;justify-content:space-between;align-items:center}.sw{width:42px;height:24px;border-radius:99px;background:var(--line);display:inline-block}
.in{align-items:center}.in>div{display:flex;flex-direction:column}
.dock{position:absolute;left:0;right:0;bottom:0;width:390px;height:122px}.arc{position:absolute;left:0;bottom:0;overflow:visible;filter:drop-shadow(0 -6px 16px rgba(0,0,0,.25))}.arc path{fill:var(--sr);stroke:var(--line);stroke-width:1.5}
.tab{position:absolute;border-radius:50%;display:grid;place-items:center;color:var(--i2);background:var(--sun);border:1px solid var(--line);box-sizing:border-box}.tab.on{background:var(--acc);color:var(--accink);border-color:var(--acc);box-shadow:0 0 22px -4px var(--glow)}.tab.big{border-width:2px}
.tl{position:absolute;width:56px;text-align:center;font-size:9px;letter-spacing:.03em;color:var(--im);text-transform:uppercase;font-weight:600}.tl.on{color:var(--acc);font-weight:800}
`
const board = (title, items, theme) => `<!doctype html><meta charset="utf-8"><title>${title}</title><style>${css}</style><body>${items.map((x, k) => phone(`${k + 1}`, x[0], x[1], theme, x[2] ?? 2, x[3] ?? true)).join('')}</body>`

const A = [
  ['Training-Hub', hub(), 2], ['Weg zum Plan', way(), 2], ['Planbibliothek', lib(), 2], ['Plan-Detail', detail(), 2],
  ['Plan anpassen', indiv(), 2], ['Kalender (Drag & Drop)', cal(), 2], ['Eigener Plan: Builder', builder(), 2], ['KI-Plan: Freischaltung', gate(), 2],
]
const B = [
  ['Profil & empfohlener Block', result(), 2], ['„Warum?“ je Einheit', why(), 2], ['Player: Intervall', playInt(), 2, false], ['Player: Kraft', playStr(), 2, false],
  ['Einheit abschließen', post(), 2, false], ['Block-Ergebnis', outcome(), 3], ['Trainer: Pläne zuweisen', coach(), 2], ['Fuel zur Einheit', fuel(), 4],
]
const C = [['Training-Hub (hell)', hub(), 2], ['Plan-Detail (hell)', detail(), 2], ['Kalender (hell)', cal(), 2], ['Langfristig (hell)', trend(), 3]]
writeFileSync('mockups-training/board1.html', board('Board 1', A, 'dark'))
writeFileSync('mockups-training/board2.html', board('Board 2', B, 'dark'))
writeFileSync('mockups-training/board3.html', board('Board 3', C, 'light'))
