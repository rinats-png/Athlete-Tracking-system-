import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'
import { writeFileSync } from 'node:fs'

/* Interaktive Entwürfe für eine neue, bewegliche Navigation (nur Mockups, nicht in der App).
   Öffnen: mockups-nav2/navigation.html im Browser; auf dem Telefon mit dem Finger, am Rechner mit der Maus. */
const ic = (C, size = 22, sw = 1.9) => renderToStaticMarkup(h(C, { size, strokeWidth: sw }))
const TABS = [
  ['Heute', L.House], ['Test', L.ClipboardList], ['Plan', L.CalendarRange], ['Leistung', L.BarChart3], ['Fuel', L.Flame], ['Mehr', L.Ellipsis],
].map(([t, I]) => ({ t, s: ic(I, 22), b: ic(I, 28) }))

const css = `
:root{--bg:#EEF4F3;--s:#fff;--sr:#fff;--sun:#D6E3E2;--ink:#0d1f1b;--i2:#40544f;--line:#C3D2CF;--acc:#1E7D63;--accink:#F4FBF8;--glow:#3FBF93;--q:rgba(30,125,99,.14);--shade:rgba(16,40,34,.18)}
.dark{--bg:#0B1014;--s:#141C21;--sr:#1B252B;--sun:#070A0D;--ink:#F2F7F8;--i2:#BFCCD0;--line:#2F3A3F;--acc:#7FE5B5;--accink:#06100B;--glow:#A6F0CE;--q:rgba(127,229,181,.18);--shade:rgba(0,0,0,.5)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;padding:22px;background:#8f9e9c;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111}
.top{display:flex;gap:12px;align-items:center;justify-content:center;margin-bottom:18px;flex-wrap:wrap}
.top h1{font-size:18px;margin:0 12px 0 0}.top button{min-height:40px;padding:0 16px;border-radius:999px;border:1px solid #577;background:#fff;font-size:14px;cursor:pointer}
.row{display:flex;flex-wrap:wrap;gap:26px;justify-content:center}
figure{margin:0;width:390px}figcaption{margin-top:10px;font-size:13px;line-height:1.45;text-align:center}
.phone{width:390px;height:760px;border-radius:40px;background:#000;padding:8px}
.screen{position:relative;width:100%;height:100%;border-radius:32px;overflow:hidden;background:var(--bg);color:var(--ink);touch-action:pan-y;user-select:none}
.page{position:absolute;inset:0;padding:40px 20px 0;transition:transform .42s cubic-bezier(.2,.8,.2,1),opacity .3s}
.page h2{font-size:28px;margin:0 0 14px}.card{height:92px;border-radius:16px;background:var(--s);border:1px solid var(--line);margin-bottom:12px}.card.s{height:60px}
.card.hero{border-color:var(--acc);background:linear-gradient(135deg,var(--q),transparent 70%)}
@media (prefers-reduced-motion:reduce){.page{transition:none}}
/* ---------- A · Drehrad ---------- */
.wheel{position:absolute;left:0;right:0;bottom:0;height:200px;touch-action:none;cursor:grab}
.wheel .plate{position:absolute;left:50%;top:70px;width:620px;height:620px;margin-left:-310px;border-radius:50%;background:var(--sr);border:1.5px solid var(--line);box-shadow:0 -10px 30px var(--shade)}
.wheel .ticks{position:absolute;inset:0;border-radius:50%}
.wheel .ticks i{position:absolute;left:50%;top:0;width:2px;height:10px;margin-left:-1px;background:var(--line);transform-origin:1px 310px}
.wheel .notch{position:absolute;left:50%;top:58px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:var(--acc);box-shadow:0 0 12px var(--glow)}
.wt{position:absolute;left:0;top:0;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;display:grid;place-items:center;background:var(--sun);border:1px solid var(--line);color:var(--i2);will-change:transform}
.wt.on{background:var(--acc);color:var(--accink);border-color:var(--acc);box-shadow:0 0 26px -4px var(--glow)}
.wl{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--acc)}
/* ---------- B · Flüssige Leiste ---------- */
.liquid{position:absolute;left:14px;right:14px;bottom:22px;height:70px;border-radius:26px;background:var(--sr);border:1px solid var(--line);box-shadow:0 12px 30px var(--shade);display:flex;touch-action:none}
.blob{position:absolute;top:8px;height:54px;border-radius:20px;background:var(--acc);box-shadow:0 0 22px -4px var(--glow);transform-origin:center}
.lt{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--i2);font-size:10px;font-weight:700;letter-spacing:.04em;cursor:pointer;transition:color .25s,transform .35s cubic-bezier(.3,1.6,.5,1)}
.lt span{opacity:0;transform:translateY(4px);transition:opacity .2s,transform .3s;height:12px}
.lt.on{color:var(--accink);transform:translateY(-2px)}.lt.on span{opacity:1;transform:none}
/* ---------- C · Lupen-Dock ---------- */
.dock{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);height:76px;padding:0 10px;border-radius:28px;background:var(--sr);border:1px solid var(--line);box-shadow:0 12px 30px var(--shade);display:flex;align-items:flex-end;gap:6px;padding-bottom:10px;touch-action:none}
.dt{position:relative;width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:var(--sun);color:var(--i2);border:1px solid var(--line);transform-origin:bottom center;cursor:pointer}
.dt.on{background:var(--acc);color:var(--accink);border-color:var(--acc)}
.dt .tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);padding:4px 10px;border-radius:8px;background:var(--ink);color:var(--bg);font-size:12px;white-space:nowrap;opacity:0;transition:opacity .15s;pointer-events:none}
.dt.hot .tip{opacity:1}
.dot{position:absolute;bottom:-7px;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--acc)}
/* ---------- D · Kapsel-Karussell ---------- */
.cap{position:absolute;left:50%;bottom:26px;width:236px;height:64px;margin-left:-118px;border-radius:999px;background:var(--sr);border:1px solid var(--line);box-shadow:0 12px 30px var(--shade);perspective:500px;touch-action:none;cursor:grab;overflow:hidden;transition:width .45s cubic-bezier(.3,1.3,.5,1),margin-left .45s cubic-bezier(.3,1.3,.5,1),height .45s cubic-bezier(.3,1.3,.5,1),border-radius .45s}
.ring{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d}
.ci{position:absolute;left:-55px;top:-22px;width:110px;height:44px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700;color:var(--i2);backface-visibility:hidden}
.ci.on{background:var(--acc);color:var(--accink);box-shadow:0 0 18px -4px var(--glow)}
.cap .arr{position:absolute;top:50%;margin-top:-10px;color:var(--i2);opacity:.6}.cap .arr.l{left:10px}.cap .arr.r{right:10px}
.cap.open{width:362px;margin-left:-181px;height:150px;border-radius:28px;cursor:default}
.grid{position:absolute;inset:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;opacity:0;pointer-events:none;transition:opacity .25s}
.cap.open .grid{opacity:1;pointer-events:auto}.cap.open .ring,.cap.open .arr{opacity:0}
.gi{border-radius:16px;background:var(--sun);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}
.gi.on{background:var(--acc);color:var(--accink);border-color:var(--acc)}
.hint{position:absolute;left:0;right:0;bottom:100px;text-align:center;font-size:12px;color:var(--i2)}
#A .hint{bottom:150px}
`
const TABS_JSON = JSON.stringify(TABS)
const js = `
const TABS = ${TABS_JSON};
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.getElementById('theme').onclick = () => document.body.classList.toggle('dark');

/* Seite: Titel wechselt mit Gleit-Übergang in Bewegungsrichtung */
function pageCtl(screen) {
  let cur = 0; const pg = screen.querySelector('.page');
  return (k) => { if (k === cur) return; const dir = k > cur ? 1 : -1; cur = k;
    if (calm) { pg.querySelector('h2').textContent = TABS[k].t; return; }
    pg.style.transition = 'transform .18s ease-in, opacity .18s'; pg.style.transform = 'translateX(' + (-30 * dir) + 'px)'; pg.style.opacity = '0';
    setTimeout(() => { pg.querySelector('h2').textContent = TABS[k].t; pg.style.transition = 'none'; pg.style.transform = 'translateX(' + (30 * dir) + 'px)';
      requestAnimationFrame(() => { pg.style.transition = ''; pg.style.transform = ''; pg.style.opacity = '1'; }); }, 180); };
}
function spring(get, set, target, done) { // kritisch gedämpfte Feder
  let v = 0; const step = () => { const x = get(); const a = (target - x) * 0.16 - v * 0.42; v += a; const n = x + v;
    if (Math.abs(target - n) < 0.002 && Math.abs(v) < 0.002) { set(target); done && done(); return; } set(n); requestAnimationFrame(step); };
  if (calm) { set(target); done && done(); } else requestAnimationFrame(step);
}

/* A · Drehrad */
(function () {
  const sc = document.getElementById('A'), w = sc.querySelector('.wheel'), plate = w.querySelector('.plate'), ticks = w.querySelector('.ticks'), lbl = w.querySelector('.wl'), page = pageCtl(sc);
  for (let i = 0; i < 72; i++) { const t = document.createElement('i'); t.style.transform = 'rotate(' + i * 5 + 'deg)'; ticks.appendChild(t); }
  const STEP = 30, R = 310, CX = 195, CY = 70 + 310; let rot = 0, active = 0;
  const els = TABS.map((t, k) => { const d = document.createElement('div'); d.className = 'wt'; d.innerHTML = t.b; d.onclick = () => go(k); w.appendChild(d); return d; });
  const n = TABS.length;
  function draw() {
    plate.style.transform = 'rotate(' + (-rot * STEP) + 'deg)';
    els.forEach((el, k) => { let d = ((k - rot) % n + n) % n; if (d > n / 2) d -= n;
      const th = d * STEP * Math.PI / 180, x = CX + R * Math.sin(th), y = CY - R * Math.cos(th);
      const near = Math.max(0, 1 - Math.abs(d)); const s = 0.78 + 0.42 * near; const op = Math.max(0, 1 - Math.max(0, Math.abs(d) - 2.2) * 1.2);
      el.style.transform = 'translate(' + x + 'px,' + (y + 18) + 'px) scale(' + s + ')'; el.style.opacity = op; el.classList.toggle('on', Math.abs(d) < 0.5); });
    const a = ((Math.round(rot) % n) + n) % n; if (a !== active) { active = a; page(a); } lbl.textContent = TABS[a].t;
  }
  function go(k) { let d = ((k - rot) % n + n) % n; if (d > n / 2) d -= n; spring(() => rot, (v) => { rot = v; draw(); }, rot + d); }
  let sx = null, sr = 0, moved = false;
  w.addEventListener('pointerdown', (e) => { sx = e.clientX; sr = rot; moved = false; w.setPointerCapture(e.pointerId); });
  w.addEventListener('pointermove', (e) => { if (sx == null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; rot = sr - dx / 70; draw(); });
  w.addEventListener('pointerup', (e) => { if (sx == null) return; sx = null; if (moved) { spring(() => rot, (v) => { rot = v; draw(); }, Math.round(rot)); } });
  w.addEventListener('click', (e) => { if (moved) e.stopPropagation(); }, true);
  draw();
})();

/* B · Flüssige Leiste */
(function () {
  const sc = document.getElementById('B'), bar = sc.querySelector('.liquid'), blob = bar.querySelector('.blob'), page = pageCtl(sc);
  const items = TABS.map((t, k) => { const d = document.createElement('div'); d.className = 'lt'; d.innerHTML = t.s + '<span>' + t.t + '</span>'; d.onclick = () => go(k); bar.appendChild(d); return d; });
  let pos = 0, active = 0; const W = () => bar.clientWidth / TABS.length;
  function draw(vel = 0) { const w = W(); const stretch = Math.min(0.6, Math.abs(vel) * 6);
    blob.style.width = (w - 12) + 'px'; blob.style.left = '0px';
    blob.style.transform = 'translateX(' + (pos * w + 6) + 'px) scaleX(' + (1 + stretch) + ') scaleY(' + (1 - stretch * 0.35) + ')'; }
  function go(k) { if (k === active) return; active = k; items.forEach((el, i) => el.classList.toggle('on', i === k)); page(k);
    let last = pos; spring(() => pos, (v) => { const vel = v - last; last = v; pos = v; draw(vel); }, k, () => draw(0)); }
  let sx = null, sp = 0, moved = false;
  bar.addEventListener('pointerdown', (e) => { sx = e.clientX; sp = pos; moved = false; });
  bar.addEventListener('pointermove', (e) => { if (sx == null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 6) { moved = true; pos = Math.max(0, Math.min(TABS.length - 1, sp + dx / W())); draw(0.02); } });
  window.addEventListener('pointerup', () => { if (sx == null) return; sx = null; if (moved) { const k = Math.round(pos); active = -1; go(k); } });
  items[0].classList.add('on'); draw();
})();

/* C · Lupen-Dock */
(function () {
  const sc = document.getElementById('C'), dock = sc.querySelector('.dock'), page = pageCtl(sc);
  const items = TABS.map((t, k) => { const d = document.createElement('div'); d.className = 'dt'; d.innerHTML = t.s + '<span class="tip">' + t.t + '</span>'; dock.appendChild(d); return d; });
  let active = 0; items[0].classList.add('on'); items[0].insertAdjacentHTML('beforeend', '<i class="dot"></i>');
  function mag(x) { items.forEach((el) => { const r = el.getBoundingClientRect(); const c = r.left + r.width / 2; const d = Math.abs(x - c);
    const s = x == null ? 1 : 1 + 0.55 * Math.max(0, 1 - d / 110); el.style.transition = x == null ? 'transform .35s cubic-bezier(.3,1.5,.5,1)' : 'transform .06s';
    el.style.transform = 'scale(' + s + ') translateY(' + (-(s - 1) * 14) + 'px)'; el.classList.toggle('hot', x != null && d < 26); }); }
  function pick(x) { let best = 0, bd = 1e9; items.forEach((el, k) => { const r = el.getBoundingClientRect(); const d = Math.abs(x - (r.left + r.width / 2)); if (d < bd) { bd = d; best = k; } }); return best; }
  function select(k) { if (k === active) return; items[active].classList.remove('on'); items[active].querySelector('.dot')?.remove(); active = k; items[k].classList.add('on'); items[k].insertAdjacentHTML('beforeend', '<i class="dot"></i>'); page(k); }
  let down = false;
  dock.addEventListener('pointerdown', (e) => { down = true; dock.setPointerCapture(e.pointerId); mag(e.clientX); });
  dock.addEventListener('pointermove', (e) => { if (down || e.pointerType === 'mouse') mag(e.clientX); });
  dock.addEventListener('pointerup', (e) => { if (!down) return; down = false; select(pick(e.clientX)); mag(null); });
  dock.addEventListener('pointerleave', () => { if (!down) mag(null); });
})();

/* D · Kapsel-Karussell */
(function () {
  const sc = document.getElementById('D'), cap = sc.querySelector('.cap'), ring = cap.querySelector('.ring'), grid = cap.querySelector('.grid'), page = pageCtl(sc);
  const n = TABS.length, STEP = 360 / n, RAD = 118; let rot = 0, active = 0;
  const els = TABS.map((t) => { const d = document.createElement('div'); d.className = 'ci'; d.innerHTML = t.s + t.t; ring.appendChild(d); return d; });
  const gis = TABS.map((t, k) => { const d = document.createElement('div'); d.className = 'gi'; d.innerHTML = t.s + t.t; d.onclick = (e) => { e.stopPropagation(); set(k); cap.classList.remove('open'); }; grid.appendChild(d); return d; });
  function draw() { ring.style.transform = 'translateZ(-' + RAD + 'px) rotateY(' + (-rot * STEP) + 'deg)';
    els.forEach((el, k) => { el.style.transform = 'rotateY(' + (k * STEP) + 'deg) translateZ(' + RAD + 'px)'; });
    const a = ((Math.round(rot) % n) + n) % n; els.forEach((el, k) => el.classList.toggle('on', k === a)); gis.forEach((el, k) => el.classList.toggle('on', k === a));
    if (a !== active) { active = a; page(a); } }
  function set(k) { let d = ((k - rot) % n + n) % n; if (d > n / 2) d -= n; spring(() => rot, (v) => { rot = v; draw(); }, rot + d); }
  let sx = null, sr = 0, moved = false;
  cap.addEventListener('pointerdown', (e) => { if (cap.classList.contains('open')) return; sx = e.clientX; sr = rot; moved = false; cap.setPointerCapture(e.pointerId); });
  cap.addEventListener('pointermove', (e) => { if (sx == null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) moved = true; rot = sr - dx / 90; draw(); });
  cap.addEventListener('pointerup', () => { if (sx == null) return; sx = null; if (moved) spring(() => rot, (v) => { rot = v; draw(); }, Math.round(rot)); else cap.classList.add('open'); });
  sc.querySelector('.page').addEventListener('click', () => cap.classList.remove('open'));
  draw();
})();
`
const screen = (id, nav, hint) => `<div class="screen" id="${id}"><div class="page"><h2>Heute</h2><div class="card hero"></div><div class="card s"></div><div class="card"></div><div class="card s"></div></div>${nav}<div class="hint">${hint}</div></div>`
const fig = (id, title, nav, hint, cap) => `<figure><div class="phone">${screen(id, nav, hint)}</div><figcaption><b>${title}</b><br>${cap}</figcaption></figure>`
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Entwurf neue Navigation</title><style>${css}</style>
<body><div class="top"><h1>KYDON · neue Navigation (Entwürfe zum Ausprobieren)</h1><button id="theme">Hell / Dunkel</button></div><div class="row">
${fig('A', 'A · Drehrad', '<div class="wheel"><div class="plate"><div class="ticks"></div></div><div class="notch"></div><div class="wl"></div></div>', 'Nach links oder rechts wischen, um das Rad zu drehen', 'Die heutige Leiste als Rad: wischen dreht alle Bereiche am Bogen entlang, oben rastet einer ein und wird groß. Antippen dreht ihn nach oben. Endlos, Skala dreht sich mit.')}
${fig('B', 'B · Flüssige Leiste', '<div class="liquid"><div class="blob"></div></div>', 'Antippen oder über die Leiste wischen', 'Eine schwebende Leiste mit einem Jade-Tropfen, der zum gewählten Bereich fließt und sich dabei dehnt. Das gewählte Symbol hebt sich und bekommt seinen Namen.')}
${fig('C', 'C · Lupen-Dock', '<div class="dock"></div>', 'Finger auf das Dock legen und entlang ziehen', 'Finger auflegen und entlangziehen: die Symbole wachsen wie eine Lupe, der Name erscheint darüber. Loslassen wählt. Einfaches Antippen geht auch.')}
${fig('D', 'D · Kapsel-Karussell', '<div class="cap"><span class="arr l">‹</span><div class="ring"></div><span class="arr r">›</span><div class="grid"></div></div>', 'Wischen dreht · Antippen öffnet alle', 'Eine kleine Kapsel zeigt nur den aktuellen Bereich. Wischen dreht die Walze in 3D zum nächsten, Antippen klappt alle sechs auf. Am wenigsten Platz, am meisten Inhalt sichtbar.')}
</div><script>${js}</script></body></html>`
writeFileSync(new URL('./navigation.html', import.meta.url), html)
console.log('ok')
