import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'

/* Entwurf Kreismenü «Schnellwahl» (nur Mockup, nicht in der App). Inspiriert von der gelieferten
   ZIP (Kreissegmente mit Joystick), neu in KYDON-Jade. Sechs Schnellaktionen des Athleten. */
const ic = (C, size = 18, sw = 1.8) => renderToStaticMarkup(h(C, { size, strokeWidth: sw }))
const ITEMS = [
  { i: L.ClipboardList, t: 'Test starten' },
  { i: L.SmilePlus, t: 'Check-in' },
  { i: L.Play, t: 'Einheit starten' },
  { i: L.Utensils, t: 'Mahlzeit' },
  { i: L.CalendarRange, t: 'Plan' },
  { i: L.BarChart3, t: 'Verlauf' },
]
const SIZE = 340, C = SIZE / 2, RI = 40, RO = 158, RC = 100
const pt = (r, deg) => [C + r * Math.cos(((deg - 90) * Math.PI) / 180), C + r * Math.sin(((deg - 90) * Math.PI) / 180)]
function seg(k, active) {
  const a = 360 / ITEMS.length, s = a * k + 1.4, e = a * (k + 1) - 1.4
  const [x1, y1] = pt(RI, s), [x2, y2] = pt(RO, s), [x3, y3] = pt(RO, e), [x4, y4] = pt(RI, e)
  const [cx, cy] = pt(RC, a * k + a / 2)
  const d = `M${x1} ${y1} L${x2} ${y2} A${RO} ${RO} 0 0 1 ${x3} ${y3} L${x4} ${y4} A${RI} ${RI} 0 0 0 ${x1} ${y1}Z`
  return `<path d="${d}" class="seg ${active ? 'on' : ''}"/>` +
    `<foreignObject x="${cx - 44}" y="${cy - 30}" width="88" height="60"><div class="sc ${active ? 'on' : ''}">${ic(ITEMS[k].i, 24)}<span>${ITEMS[k].t}</span></div></foreignObject>`
}
function ring(active = -1) {
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" class="ring">${ITEMS.map((_, k) => seg(k, k === active)).join('')}
    <circle cx="${C}" cy="${C}" r="30" class="joy"/><g transform="translate(${C - 12} ${C - 12})" class="joyi">${ic(L.LayoutGrid, 24)}</g></svg>`
}
function home(extra = '') {
  return `<div class="hd"><b>Heute</b><span class="q">${ic(L.Zap, 18)}</span></div>
  <div class="card"></div><div class="card s"></div><div class="card"></div><div class="card s"></div>${extra}`
}
const frame = (cap, body, dark) => `<figure class="${dark ? 'dark' : 'light'}"><div class="phone"><div class="screen">${body}</div></div><figcaption>${cap}</figcaption></figure>`
const overlay = (active, note = '') => `${home()}<div class="ov"><div class="x">${ic(L.X, 22)}</div>${ring(active)}<div class="hint">${note}</div></div>`

const settings = `<div class="hd"><b>Darstellung</b></div>
 <div class="row"><div><b>Schnellwahl-Menü</b><span>Der Blitz oben rechts öffnet sechs Schnellaktionen.</span></div><i class="sw on"></i></div>
 <div class="row"><div><b>Flackern bei der Auswahl</b><span>Ein kurzes Aufleuchten, höchstens 3 Helligkeitswechsel pro Sekunde. Aus bei «Bewegung reduzieren».</span></div><i class="sw on"></i></div>
 <div class="row"><div><b>Ton beim Öffnen und Auswählen</b><span>Kurze Töne. Ein, nur wenn du es willst.</span></div><i class="sw"></i></div>
 <div class="row"><div><b>Bewegung reduzieren (Gerät)</b><span>Alles erscheint sofort, ohne Aufleuchten und ohne Ton.</span></div><i class="sw on lock"></i></div>`

const html = `<!doctype html><meta charset="utf-8"><title>Entwurf Schnellwahl-Menü</title><style>
:root{--surface:#fff;--sunken:#D6E3E2;--line:#C3D2CF;--ink:#0d1f1b;--ink2:#40544f;--accent:#1E7D63;--ink-on:#F4FBF8;--quiet:rgba(30,125,99,.14);--bg:#EEF4F3;--glow:#3FBF93;--ovbg:rgba(238,244,243,.92)}
.dark{--surface:#1B252B;--sunken:#070A0D;--line:#2F3A3F;--ink:#E7F1EE;--ink2:#9DB2AD;--accent:#7FE5B5;--ink-on:#06100B;--quiet:rgba(127,229,181,.18);--bg:#0c1216;--glow:#A6F0CE;--ovbg:rgba(8,13,17,.93)}
body{margin:0;padding:28px;background:#9aa;font-family:system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:28px;justify-content:center}
figure{margin:0;width:390px;color:#111}figcaption{margin-top:10px;font-size:13px;line-height:1.45;text-align:center}
.phone{width:390px;height:720px;border-radius:38px;background:#000;padding:8px;box-sizing:border-box}
.screen{position:relative;width:100%;height:100%;border-radius:30px;overflow:hidden;background:var(--bg);color:var(--ink)}
.hd{padding:34px 20px 10px;display:flex;justify-content:space-between;align-items:center;font-size:26px}.hd span{font-size:13px;color:var(--ink2)}
.hd .q{color:var(--ink-on)}.q{width:40px;height:40px;border-radius:50%;background:var(--accent);color:var(--ink-on);display:grid;place-items:center;box-shadow:0 0 18px -4px var(--glow)}
.card{margin:0 16px 12px;height:96px;border-radius:16px;background:var(--surface);border:1px solid var(--line)}.card.s{height:64px}
.ov{position:absolute;inset:0;background:var(--ovbg);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;flex-direction:column}
.x{position:absolute;top:34px;right:20px;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;color:var(--ink2)}
.ring{overflow:visible}.seg{fill:var(--surface);stroke:var(--line);stroke-width:1.2}.seg.on{fill:var(--accent);stroke:var(--accent);filter:drop-shadow(0 0 14px var(--glow))}
.sc{width:88px;height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--ink);font-size:11px;text-align:center;line-height:1.15}.sc.on{color:var(--ink-on);font-weight:700}
.joy{fill:var(--sunken);stroke:var(--line);stroke-width:1.5}.joyi{color:var(--ink2)}
.hint{margin-top:18px;font-size:12px;color:var(--ink2);max-width:300px;text-align:center}
.row{margin:0 16px 10px;padding:14px;border-radius:14px;background:var(--surface);border:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;align-items:center}
.row b{display:block;font-size:14px}.row span{display:block;font-size:12px;color:var(--ink2);margin-top:3px}
.sw{flex:none;width:44px;height:26px;border-radius:13px;background:var(--sunken);border:1px solid var(--line);position:relative}.sw::after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:var(--ink2)}.sw.on{background:var(--accent)}.sw.on::after{left:20px;background:var(--ink-on)}.sw.lock{opacity:.55}
</style>
${frame('<b>A · Hell · Auslöser</b><br>Der Blitz oben rechts auf «Heute» öffnet die Schnellwahl. Die Bogenleiste (unten, hier nicht gezeigt) bleibt die Navigation.', home(), false)}
${frame('<b>B · Hell · geöffnet</b><br>Sechs Schnellaktionen im Ring, in der Mitte der Joystick (auf Touch: Antippen genügt, Ziehen ist optional). <b>Einheit starten</b> ist gerade ausgewählt.', overlay(2, 'Antippen oder zur Mitte ziehen. Esc oder × schließt.'), false)}
${frame('<b>C · Dunkel · geöffnet</b><br>Gleiche Form in KYDON-Jade, dunkel. Auswahl = Jade-Fläche mit leichtem Leuchten.', overlay(4, 'Auswahl: Plan'), true)}
${frame('<b>D · Dunkel · Darstellung</b><br>Flackern und Ton sind Schalter. Flackern ist auf höchstens 3 Wechsel pro Sekunde gedrosselt, Ton ist ab Werk aus, bei «Bewegung reduzieren» erscheint alles sofort.', settings, true)}
`
writeFileSync(new URL('./schnellwahl.html', import.meta.url), html)
console.log('ok')
