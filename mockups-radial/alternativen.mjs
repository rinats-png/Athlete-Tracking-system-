import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'

/* Alternativen zum Kreismenü: wenig Aufwand für den Nutzer (nur Mockup, nicht in der App). */
const ic = (C, size = 18, sw = 1.8) => renderToStaticMarkup(h(C, { size, strokeWidth: sw }))
const TABS = [
  { i: L.House, t: 'Heute', x: 34 }, { i: L.ClipboardList, t: 'Test', x: 92 }, { i: L.CalendarRange, t: 'Plan', x: 160, big: true },
  { i: L.BarChart3, t: 'Leistung', x: 236 }, { i: L.Flame, t: 'Fuel', x: 292 }, { i: L.Ellipsis, t: 'Mehr', x: 346 },
]
function dock(active = 0, press = -1) {
  const W = 390, H = 122, A = 178, BASE = 104, B = 48
  const items = TABS.map((t, k) => {
    const x = t.x, y = BASE - B * Math.sqrt(Math.max(0, 1 - ((x - 195) / A) ** 2)), s = t.big ? 64 : 42
    return `<div class="tab ${k === active ? 'on' : ''} ${k === press ? 'press' : ''} ${t.big ? 'big' : ''}" style="left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px">${ic(t.i, t.big ? 28 : 20)}</div><span class="tl ${k === active ? 'on' : ''}" style="left:${x - 28}px;top:${y + s / 2 + 1}px">${t.t}</span>`
  }).join('')
  return `<div class="dock"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="arc"><path d="M0,${H} A${W / 2},${H - 14} 0 0 1 ${W},${H} Z"/></svg>${items}</div>`
}
const today = (top = '') => `<div class="hd"><b>Heute</b><span>Mittwoch</span></div>${top}
  <div class="card hero"><small class="k">HEUTE GEPLANT</small><div class="mid">4 × 4 Intervalle</div><small>25 min · Schlüsseleinheit</small></div>
  <div class="card"><small class="k">WOCHE</small><div class="mid">3 von 5 Einheiten</div></div><div class="card s"><small class="k">NÄCHSTE MESSUNG</small><div class="mid">5-km-Test in 18 Tagen</div></div>`
const phone = (cap, body, theme, extra = '') => `<figure class="${theme}"><div class="phone"><div class="screen">${body}${extra}</div></div><figcaption>${cap}</figcaption></figure>`

/* 1 · Fächer aus dem Schnell-Plus */
const fan = (open) => {
  const BX = 336, BY = 560 // Mitte des Plus
  const acts = [{ i: L.Play, t: 'Einheit' }, { i: L.SmilePlus, t: 'Check-in' }, { i: L.Utensils, t: 'Mahlzeit' }, { i: L.ClipboardList, t: 'Test' }]
  const spread = acts.map((a, k) => {
    const rad = ((175 + k * 32) * Math.PI) / 180, R = 130
    const x = BX + R * Math.cos(rad), y = BY + R * Math.sin(rad)
    return `<div class="fa" style="left:${x - 25}px;top:${y - 25}px">${ic(a.i, 22)}</div><span class="fl" style="left:${x - 34}px;top:${y + 28}px">${a.t}</span>`
  }).join('')
  return `${open ? '<div class="dim"></div>' + spread : ''}<div class="plus ${open ? 'open' : ''}" style="left:${BX - 26}px;top:${BY - 26}px">${ic(open ? L.X : L.Plus, 26, 2.2)}</div>`
}
/* 2 · Als Nächstes */
const chips = `<div class="nx"><small class="k">ALS NÄCHSTES</small><div class="cr">
  <span class="c pri">${ic(L.Play, 16)}<b>Einheit starten</b><i>25 min</i></span><span class="c">${ic(L.SmilePlus, 16)}<b>Check-in</b><i>15 Sek.</i></span>
  <span class="c">${ic(L.Utensils, 16)}<b>Mahlzeit</b></span><span class="c">${ic(L.Timer, 16)}<b>Nachmessung fällig</b></span></div></div>`
/* 3 · Sheet */
const sheet = () => `<div class="dim"></div><div class="sheet"><div class="grab"></div><b>Schnell eintragen<span class="cx">${ic(L.X, 20)}</span></b>
  <div class="tiles">${[[L.Play, 'Einheit starten'], [L.SmilePlus, 'Check-in'], [L.Utensils, 'Mahlzeit'], [L.ClipboardList, 'Test'], [L.Scale, 'Gewicht'], [L.NotebookPen, 'Notiz']].map(([i, t]) => `<div class="t">${ic(i, 24)}<span>${t}</span></div>`).join('')}</div></div>`
/* 4 · Langdruck auf Tab */
const hold = () => `<div class="dim"></div><div class="mini"><div class="mr hl">${ic(L.Plus, 16)}Neuen Test starten</div><div class="mr">${ic(L.Repeat, 16)}Letzte Messung wiederholen</div><div class="mr">${ic(L.CalendarClock, 16)}Testtermin planen</div><span class="tip"></span></div>`

const css = `
:root{--bg:#EEF4F3;--s:#fff;--sr:#fff;--sun:#D6E3E2;--ink:#0d1f1b;--i2:#40544f;--line:#C3D2CF;--acc:#1E7D63;--accink:#F4FBF8;--glow:#3FBF93;--q:rgba(30,125,99,.14)}
.dark{--bg:#0B1014;--s:#141C21;--sr:#1B252B;--sun:#070A0D;--ink:#F2F7F8;--i2:#BFCCD0;--line:#2F3A3F;--acc:#7FE5B5;--accink:#06100B;--glow:#A6F0CE;--q:rgba(127,229,181,.18)}
body{margin:0;padding:28px;background:#9aa;font-family:system-ui,-apple-system,Segoe UI,sans-serif;display:flex;flex-wrap:wrap;gap:28px;justify-content:center}
figure{margin:0;width:390px;color:#111}figcaption{margin-top:10px;font-size:13px;line-height:1.45;text-align:center}
.phone{width:390px;height:720px;border-radius:38px;background:#000;padding:8px;box-sizing:border-box}
.screen{position:relative;width:100%;height:100%;border-radius:30px;overflow:hidden;background:var(--bg);color:var(--ink)}
.hd{padding:34px 20px 10px;display:flex;justify-content:space-between;align-items:baseline;font-size:26px}.hd span{font-size:13px;color:var(--i2)}
.card{margin:0 16px 12px;padding:14px;border-radius:16px;background:var(--s);border:1px solid var(--line)}.card.hero{border-color:var(--acc)}
.k{display:block;font-size:10px;letter-spacing:.08em;color:var(--i2);font-weight:700}.mid{font-size:17px;font-weight:700;margin:4px 0 2px}.card small{font-size:12px;color:var(--i2)}
.dock{position:absolute;left:0;right:0;bottom:0;width:390px;height:122px}.arc{position:absolute;left:0;bottom:0;overflow:visible;filter:drop-shadow(0 -6px 16px rgba(0,0,0,.2))}.arc path{fill:var(--sr);stroke:var(--line);stroke-width:1.5}
.tab{position:absolute;border-radius:50%;display:grid;place-items:center;color:var(--i2);background:var(--sun);border:1px solid var(--line);box-sizing:border-box}.tab.on{background:var(--acc);color:var(--accink);border-color:var(--acc);box-shadow:0 0 22px -4px var(--glow)}.tab.big{border-width:2px}.tab.press{box-shadow:0 0 0 7px var(--q),0 0 18px var(--glow);color:var(--acc);border-color:var(--acc)}
.tl{position:absolute;width:56px;text-align:center;font-size:9px;letter-spacing:.03em;color:var(--i2);text-transform:uppercase;font-weight:600}.tl.on{color:var(--acc);font-weight:800}
.dim{position:absolute;inset:0;background:rgba(0,0,0,.35)}
.plus{position:absolute;width:52px;height:52px;border-radius:50%;background:var(--acc);color:var(--accink);display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,0,0,.3),0 0 20px -4px var(--glow)}.plus.open{background:var(--s);color:var(--ink);border:1px solid var(--line)}
.fa{position:absolute;width:50px;height:50px;border-radius:50%;background:var(--s);color:var(--acc);border:1px solid var(--line);display:grid;place-items:center;box-shadow:0 6px 16px rgba(0,0,0,.3)}.fl{position:absolute;width:68px;text-align:center;font-size:11px;color:#fff;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.nx{margin:0 0 12px 16px}.cr{display:flex;gap:8px;overflow:hidden;margin-top:6px;padding-right:16px}
.c{flex:none;display:flex;align-items:center;gap:6px;padding:10px 12px;border-radius:999px;background:var(--s);border:1px solid var(--line);font-size:13px;min-height:44px;box-sizing:border-box}.c i{font-style:normal;color:var(--i2);font-size:11px}.c.pri{background:var(--acc);color:var(--accink);border-color:var(--acc)}.c.pri i{color:var(--accink);opacity:.85}
.sheet{position:absolute;left:0;right:0;bottom:0;background:var(--sr);border-radius:24px 24px 0 0;border-top:1px solid var(--line);padding:10px 16px 24px}.sheet b{display:block;font-size:15px;margin:4px 0 12px}.cx{float:right;color:var(--i2)}.grab{width:40px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 6px}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.t{height:84px;border-radius:16px;background:var(--s);border:1px solid var(--line);display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;font-size:12px;text-align:center;color:var(--ink)}.t svg{color:var(--acc)}
.mini{position:absolute;left:34px;bottom:140px;width:250px;border-radius:16px;background:var(--sr);border:1px solid var(--line);box-shadow:0 12px 30px rgba(0,0,0,.35);padding:6px}.mr{display:flex;gap:10px;align-items:center;padding:12px;border-radius:10px;font-size:14px;min-height:44px;box-sizing:border-box}.mr svg{color:var(--acc)}.mr.hl{background:var(--q);color:var(--acc);font-weight:700}
.tip{position:absolute;left:38px;bottom:-7px;width:14px;height:14px;background:var(--sr);border-right:1px solid var(--line);border-bottom:1px solid var(--line);transform:rotate(45deg)}
`
const four = (theme) => [
  phone('<b>1 · Fächer</b><br>Ein Plus-Knopf über der Leiste. <b>Ein Tipp öffnet, ein Tipp wählt</b> aus vier Schnellaktionen, die sich in einem Bogen auffächern. Das Kreis-Konzept bleibt, ohne Overlay und ohne Ziehen.', today() + dock(0) + fan(true), theme),
  phone('<b>2 · «Als Nächstes»</b><br>Gar nichts zu öffnen: Unter der Kopfzeile stehen nur die Handgriffe, die jetzt dran sind (Einheit, Check-in, fällige Messung). <b>Ein Tipp</b>, wenig Aufwand, passt sich dem Tag an.', today(chips) + dock(0), theme),
  phone('<b>3 · Schnell-Blatt</b><br>Plus-Knopf öffnet ein Blatt von unten mit sechs großen Kacheln, alle auf einen Blick und mit dem Daumen erreichbar. <b>Zwei Tipps</b>, kein Suchen, kein Ziehen.', today() + dock(0) + sheet(), theme),
  phone('<b>4 · Gedrückt halten</b><br>Ein langer Druck auf einen Tab zeigt die zwei, drei häufigsten Handgriffe dieses Bereichs. <b>Kein Extra-Knopf</b>; wer es nicht kennt, verliert nichts. Als Beschleuniger neben 1 bis 3 gedacht.', today() + dock(1, 1) + hold(), theme),
].join('')
for (const theme of ['light', 'dark']) {
  const html = `<!doctype html><meta charset="utf-8"><title>Alternativen Schnellzugriff</title><style>${css}</style>${four(theme)}`
  writeFileSync(new URL(`./alternativen-${theme === 'light' ? 'hell' : 'dunkel'}.html`, import.meta.url), html)
}
console.log('ok')
