import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'

/* Entwurf: Lupen-Dock mit allen Bereichen, seitlich über den Displayrand verschiebbar, mit Ton.
   Nur Mockup, nicht in der App. Öffnen: mockups-nav3/dock.html im Browser. */
const ic = (C) => renderToStaticMarkup(h(C, { size: 22, strokeWidth: 1.9 }))
const TABS = [
  ['Heute', L.House], ['Test', L.ClipboardList], ['Plan', L.CalendarRange], ['Leistung', L.BarChart3],
  ['Fuel', L.Flame], ['Tagebuch', L.NotebookPen], ['Belastung', L.Gauge], ['Gesundheit', L.HeartPulse],
  ['Peak Week', L.Mountain], ['Profil', L.User], ['Freigaben', L.Share2], ['Einstellungen', L.Settings],
].map(([t, I]) => ({ t, s: ic(I) }))

const css = `
:root{--bg:#EEF4F3;--s:#fff;--sr:#fff;--sun:#D6E3E2;--ink:#0d1f1b;--i2:#40544f;--line:#C3D2CF;--acc:#1E7D63;--accink:#F4FBF8;--glow:#3FBF93;--q:rgba(30,125,99,.14);--shade:rgba(16,40,34,.18)}
.dark{--bg:#0B1014;--s:#141C21;--sr:#1B252B;--sun:#0F161A;--ink:#F2F7F8;--i2:#BFCCD0;--line:#2F3A3F;--acc:#7FE5B5;--accink:#06100B;--glow:#A6F0CE;--q:rgba(127,229,181,.18);--shade:rgba(0,0,0,.5)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;padding:22px;background:#8f9e9c;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111}
.top{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:18px;flex-wrap:wrap}
.top h1{font-size:18px;margin:0 10px 0 0}.top button{min-height:40px;padding:0 16px;border-radius:999px;border:1px solid #577;background:#fff;font-size:14px;cursor:pointer}
.row{display:flex;flex-wrap:wrap;gap:26px;justify-content:center}
figure{margin:0;width:390px}figcaption{margin-top:10px;font-size:13px;line-height:1.45;text-align:center}
.phone{width:390px;height:760px;border-radius:40px;background:#000;padding:8px}
.screen{position:relative;width:100%;height:100%;border-radius:32px;overflow:hidden;background:var(--bg);color:var(--ink);user-select:none}
.page{position:absolute;inset:0;padding:40px 20px 0;transition:transform .42s cubic-bezier(.2,.8,.2,1),opacity .3s}
.page h2{font-size:28px;margin:0 0 14px}.card{height:92px;border-radius:16px;background:var(--s);border:1px solid var(--line);margin-bottom:12px}.card.s{height:60px}
.card.hero{border-color:var(--acc);background:linear-gradient(135deg,var(--q),transparent 70%)}
.hint{position:absolute;left:0;right:0;bottom:185px;text-align:center;font-size:12px;color:var(--i2)}
/* Dock läuft über die volle Breite und verschwindet weich am Displayrand */
.dock{position:absolute;left:0;right:0;bottom:18px;height:160px;touch-action:none;cursor:grab;
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 34px,#000 calc(100% - 34px),transparent);mask-image:linear-gradient(90deg,transparent 0,#000 34px,#000 calc(100% - 34px),transparent)}
.dock:active{cursor:grabbing}
.rail{position:absolute;left:0;right:0;bottom:8px;height:66px;margin:0 -40px;background:var(--sr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);box-shadow:0 12px 30px var(--shade)}
.track{position:absolute;left:0;bottom:18px;height:46px;will-change:transform}
.dt{position:absolute;bottom:0;width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:var(--sun);color:var(--i2);border:1px solid var(--line);transform-origin:bottom center;will-change:transform}
.dt.on{background:var(--acc);color:var(--accink);border-color:var(--acc);box-shadow:0 0 20px -4px var(--glow)}
.tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);padding:4px 10px;border-radius:8px;background:var(--ink);color:var(--bg);font-size:12px;white-space:nowrap;opacity:0;pointer-events:none}
.dt.hot .tip{opacity:1}
.lens{position:absolute;left:50%;bottom:4px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--acc);box-shadow:0 0 10px var(--glow)}
.sound{position:absolute;right:14px;top:44px;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--s);color:var(--i2);display:grid;place-items:center;cursor:pointer}
@media (prefers-reduced-motion:reduce){.page{transition:none}}
`
const js = `
const TABS = ${JSON.stringify(TABS)};
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEP = 56; // Abstand der Symbole
document.getElementById('theme').onclick = () => document.body.classList.toggle('dark');

/* ---------- Ton: kleine Synthese mit Web Audio, keine Dateien ---------- */
let ac = null, soundOn = true;
function audio() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; }
function blip(freq, dur, vol, type) { if (!soundOn) return; const a = audio(), t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02); }
const tick = (speed) => blip(1400 + Math.min(speed, 30) * 25, 0.035, 0.05, 'triangle'); // Rasten beim Vorbeiziehen
const pick = () => { blip(660, 0.09, 0.12, 'sine'); setTimeout(() => blip(990, 0.12, 0.09, 'sine'), 60); }; // Auswahl: zwei Töne aufwärts
const edge = () => blip(180, 0.12, 0.1, 'sine'); // Anschlag am Ende
document.querySelectorAll('.sound').forEach(b => b.onclick = (e) => { e.stopPropagation(); soundOn = !soundOn;
  document.querySelectorAll('.sound').forEach(x => x.innerHTML = soundOn ? ${JSON.stringify(ic(L.Volume2))} : ${JSON.stringify(ic(L.VolumeX))}); if (soundOn) pick(); });

function pageCtl(screen) { let cur = 0; const pg = screen.querySelector('.page');
  return (k) => { if (k === cur) return; const dir = k > cur ? 1 : -1; cur = k; const h2 = pg.querySelector('h2');
    if (calm) { h2.textContent = TABS[k].t; return; }
    pg.style.transition = 'transform .16s ease-in, opacity .16s'; pg.style.transform = 'translateX(' + (-30 * dir) + 'px)'; pg.style.opacity = '0';
    setTimeout(() => { h2.textContent = TABS[k].t; pg.style.transition = 'none'; pg.style.transform = 'translateX(' + (30 * dir) + 'px)';
      requestAnimationFrame(() => { pg.style.transition = ''; pg.style.transform = ''; pg.style.opacity = '1'; }); }, 160); };
}

/* mode 'finger': Lupe folgt dem Finger, Leiste rollt mit Schwung; 'mitte': Lupe fest in der Mitte, Leiste rastet ein */
function dock(screen, mode) {
  const d = screen.querySelector('.dock'), tr = screen.querySelector('.track'), go = pageCtl(screen);
  const W = d.clientWidth, n = TABS.length, total = (n - 1) * STEP;
  const els = TABS.map((t, i) => { const e = document.createElement('div'); e.className = 'dt' + (i ? '' : ' on');
    e.innerHTML = t.s + '<span class="tip">' + t.t + '</span>'; tr.appendChild(e); return e; });
  let active = 0, x = mode === 'mitte' ? W / 2 : 30, v = 0, lens = null, down = null, moved = 0, lastHot = -1, raf = 0;
  const minX = mode === 'mitte' ? W / 2 - total : W - 30 - total - 46, maxX = mode === 'mitte' ? W / 2 : 30;
  function layout() {
    const lx = mode === 'mitte' ? W / 2 : lens; let hot = -1, best = 1e9;
    els.forEach((e, i) => { const cx = x + i * STEP + (mode === 'mitte' ? 0 : 23); let s = 1, lift = 0, dx = 0;
      if (lx != null) { const dist = Math.abs(cx - lx); const f = Math.max(0, 1 - dist / 120); s = 1 + 0.75 * f * f; lift = 16 * f * f;
        dx = Math.sign(cx - lx) * 22 * (1 - Math.max(0, 1 - dist / 140)) * f * 2; if (dist < best) { best = dist; hot = i; } }
      e.style.transform = 'translate(' + (cx - 23 + dx) + 'px,' + (-lift) + 'px) scale(' + s.toFixed(3) + ')'; e.classList.toggle('hot', i === hot && (lx != null)); });
    if (hot !== lastHot && hot >= 0) { if (lastHot >= 0) tick(Math.abs(v)); lastHot = hot; }
    return hot;
  }
  function snapTo(i) { const target = W / 2 - i * STEP; cancelAnimationFrame(raf);
    const step = () => { const a = (target - x) * 0.16 - v * 0.42; v += a; x += v; layout(); if (Math.abs(target - x) > 0.3 || Math.abs(v) > 0.3) raf = requestAnimationFrame(step); else { x = target; v = 0; layout(); } };
    if (calm) { x = target; layout(); } else step(); }
  function coast() { cancelAnimationFrame(raf); const step = () => { v *= 0.94; x += v;
      if (x > maxX || x < minX) { const lim = x > maxX ? maxX : minX; x = lim + (x - lim) * 0.5; if (Math.abs(v) > 2) edge(); v = 0; }
      layout(); if (Math.abs(v) > 0.2) raf = requestAnimationFrame(step); };
    if (!calm) step(); }
  function choose(i) { if (i < 0) return; els[active].classList.remove('on'); active = i; els[i].classList.add('on'); pick(); go(i);
    if (navigator.vibrate) navigator.vibrate(8); }
  d.addEventListener('pointerdown', (e) => { audio(); cancelAnimationFrame(raf); d.setPointerCapture(e.pointerId);
    const r = d.getBoundingClientRect(); down = { px: e.clientX, x, t: performance.now(), lx: e.clientX }; moved = 0; v = 0;
    if (mode === 'finger') lens = e.clientX - r.left; layout(); });
  d.addEventListener('pointermove', (e) => { if (!down) return; const r = d.getBoundingClientRect(); const dx = e.clientX - down.px; moved = Math.max(moved, Math.abs(dx));
    const now = performance.now(); v = (e.clientX - down.lx) / Math.max(1, now - down.t) * 16; down.lx = e.clientX; down.t = now;
    let nx = down.x + dx; if (nx > maxX) nx = maxX + (nx - maxX) * 0.35; if (nx < minX) nx = minX + (nx - minX) * 0.35; x = nx;
    if (mode === 'finger') lens = e.clientX - r.left; layout(); });
  const up = (e) => { if (!down) return; const r = d.getBoundingClientRect(); down = null;
    if (mode === 'mitte') { // Antippen wählt das getippte Symbol, Wischen rastet in der Mitte ein
      let i; if (moved < 6) i = Math.round((e.clientX - r.left - x) / STEP); else i = Math.round((W / 2 - (x + v * 8)) / STEP);
      i = Math.max(0, Math.min(n - 1, i)); snapTo(i); choose(i); lastHot = i; return; }
    const hot = layout(); lens = null; if (moved < 6 || Math.abs(v) < 1) choose(hot); else { if (x > maxX || x < minX) { x = Math.max(minX, Math.min(maxX, x)); } coast(); } layout(); };
  d.addEventListener('pointerup', up); d.addEventListener('pointercancel', () => { down = null; lens = null; layout(); });
  layout();
}
dock(document.getElementById('F'), 'finger');
dock(document.getElementById('M'), 'mitte');
`
const screen = (id, hint) => `<div class="screen" id="${id}"><button class="sound" aria-label="Ton">${ic(L.Volume2)}</button><div class="page"><h2>Heute</h2><div class="card hero"></div><div class="card s"></div><div class="card"></div><div class="card s"></div></div><div class="hint">${hint}</div><div class="dock"><div class="rail"></div><div class="track"></div>${id === 'M' ? '<div class="lens"></div>' : ''}</div></div>`
const fig = (id, title, hint, cap) => `<figure><div class="phone">${screen(id, hint)}</div><figcaption><b>${title}</b><br>${cap}</figcaption></figure>`
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KYDON Dock</title><style>${css}</style></head>
<body><div class="top"><h1>KYDON · Lupen-Dock mit allen Bereichen</h1><button id="theme">Hell / Dunkel</button></div><div class="row">
${fig('F', 'C1 · Lupe folgt dem Finger', 'Wischen schiebt die Leiste · Finger halten vergrößert', 'Alle zwölf Bereiche liegen in einer Leiste, die über den Displayrand hinausläuft. Wischen schiebt sie mit Schwung, am Ende federt sie zurück. Wo der Finger liegt, wachsen die Symbole wie unter einer Lupe. Loslassen ohne Schwung wählt. Leises Rasten bei jedem Symbol, zwei Töne bei der Auswahl, dumpfer Ton am Anschlag.')}
${fig('M', 'C2 · Lupe fest in der Mitte', 'Wischen dreht die Leiste · Mitte ist gewählt', 'Die Lupe steht fest in der Mitte. Die Leiste gleitet darunter durch und rastet mit einem Klick ein. Der Bereich in der Mitte ist gewählt. Antippen holt ein Symbol direkt in die Mitte. Fühlt sich an wie ein Drehregler, nur waagerecht.')}
</div><p style="text-align:center;font-size:13px">Ton oben rechts im Telefon an- oder ausschalten. Der Ton startet erst nach der ersten Berührung (Vorgabe der Browser).</p><script>${js}</script></body></html>`
writeFileSync(new URL('./dock.html', import.meta.url), html)
console.log('ok')
