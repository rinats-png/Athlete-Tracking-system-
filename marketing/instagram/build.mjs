// Erzeugt die 50 Post-HTML-Dateien unter posts/ und den Kontaktbogen index.html.
//   node marketing/instagram/build.mjs
// Danach rendern: node marketing/instagram/render.mjs
//
// Alle Farb-, Schrift- und Radiuswerte stammen aus src/styles/theme.css und
// stehen hier als Kopie der Tokens, damit jede Datei für sich steht.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
mkdirSync(join(here, 'posts'), { recursive: true })

const FOOTER = 'Kein Fitnesswert, keine Bewertung einer Person, keine medizinische Aussage.'

// ---------------------------------------------------------------------------
// Tokens — Kopie aus src/styles/theme.css (Mondstein als Basis, Mondlicht über
// data-theme="dark"). Nichts hiervon ist erfunden.
// ---------------------------------------------------------------------------
const TOKENS = `
:root {
  color-scheme: light;
  --plane: #F0F4F4; --plane-glow-1: #E8EDEF; --plane-glow-2: #DFE7E9;
  --surface: #FFFFFF; --surface-raised: #FFFFFF; --surface-sunken: #DFE7E9;
  --ink: #1B2523; --ink-secondary: #4A5A56; --ink-muted: #536360;
  --line: #CFD6D5; --line-strong: #A9B5B2; --grid: #DCE3E3;
  --accent-glow: #A9BDB5; --accent: #5E7470; --accent-ink: #F4F7F6; --accent-text: #4E625E;
  --accent-quiet: rgba(94, 116, 112, 0.12); --brand-bridge: #75856A;
  --series-1: #5E7470; --series-2: #2A6FB0; --series-3: #B4531F; --reference: #536360;
  --good: #0A6E0A; --warning: #7F5300; --critical: #B3261E; --delta-up: #146B14; --delta-down: #A81E1E;
  --glass-edge: rgba(255, 255, 255, 0.9);
  --glow: rgba(94, 116, 112, 0.22);
  --atmo:
    radial-gradient(65% 50% at 50% 12%, rgba(255, 255, 255, 0.85), transparent 62%),
    radial-gradient(50% 40% at 20% 85%, rgba(160, 175, 180, 0.35), transparent 60%),
    radial-gradient(45% 35% at 85% 75%, rgba(185, 199, 188, 0.40), transparent 58%),
    linear-gradient(180deg, #E8EDEF, #DFE7E9 55%, #CFDADD);
  --radius: 16px; --radius-md: 10px; --radius-sm: 4px;
  --shadow-hue: 27 37 35;
  --elev-1: 0 8px 24px rgb(var(--shadow-hue) / 0.10), 0 1px 3px rgb(var(--shadow-hue) / 0.08), 0 0 40px -16px var(--glow);
  --elev-2: 0 18px 44px rgb(var(--shadow-hue) / 0.16), 0 2px 6px rgb(var(--shadow-hue) / 0.08), 0 0 80px -20px var(--glow);
  --font-display: "Saira Condensed", "Arial Narrow", system-ui, sans-serif;
  --font-body: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", monospace;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --plane: #12161A; --plane-glow-1: #141A1E; --plane-glow-2: #0D1013;
  --surface: #192025; --surface-raised: #1F282E; --surface-sunken: #0D1013;
  --ink: #EDF1F2; --ink-secondary: #B8C3C6; --ink-muted: #8B989C;
  --line: #2B3438; --line-strong: #3D474C; --grid: #1C2327;
  --accent-glow: #B9C7BC; --accent: #B9C7BC; --accent-ink: #12161A; --accent-text: #B9C7BC;
  --accent-quiet: rgba(185, 199, 188, 0.14); --brand-bridge: #75856A;
  --series-1: #B9C7BC; --series-2: #5FA8E8; --series-3: #E08A4E; --reference: #8B989C;
  --good: #4FBF4F; --warning: #D9A23A; --critical: #F07A72; --delta-up: #5CC85C; --delta-down: #F08A82;
  --glass-edge: rgba(237, 241, 242, 0.28);
  --glow: rgba(185, 199, 188, 0.32);
  --atmo:
    radial-gradient(60% 45% at 50% 8%, rgba(185, 199, 188, 0.22), transparent 60%),
    radial-gradient(70% 50% at 50% 115%, rgba(60, 70, 75, 0.25), transparent 60%),
    linear-gradient(180deg, #141A1E, #12161A 55%, #0D1013);
  --shadow-hue: 0 0 0;
  --elev-1: 0 1px 2px rgb(0 0 0 / 0.4), 0 2px 8px rgb(0 0 0 / 0.3), 0 0 40px -16px var(--glow);
  --elev-2: 0 1px 2px rgb(0 0 0 / 0.45), 0 6px 18px rgb(0 0 0 / 0.42), 0 0 80px -20px var(--glow);
}`

const FONTS = `
@font-face { font-family: "Saira Condensed"; font-weight: 600; font-style: normal; font-display: block; src: url("../fonts/saira-condensed-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Saira Condensed"; font-weight: 700; font-style: normal; font-display: block; src: url("../fonts/saira-condensed-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 400; font-style: normal; font-display: block; src: url("../fonts/ibm-plex-sans-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 500; font-style: normal; font-display: block; src: url("../fonts/ibm-plex-sans-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 600; font-style: normal; font-display: block; src: url("../fonts/ibm-plex-sans-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 400; font-style: normal; font-display: block; src: url("../fonts/ibm-plex-mono-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 500; font-style: normal; font-display: block; src: url("../fonts/ibm-plex-mono-latin-500-normal.woff2") format("woff2"); }`

// Bausteine — Kopie der Klassen aus theme.css, ergänzt um das Post-Raster.
const LAYOUT = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { width: 1080px; height: 1350px; overflow: hidden; background-color: var(--plane); color: var(--ink);
  font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
.post { position: relative; width: 1080px; height: 1350px; padding: 72px; background-image: var(--atmo);
  background-color: var(--plane); display: flex; flex-direction: column; }
.label-tag { font-family: var(--font-display); font-weight: 600; font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-muted); }
.readout { font-family: var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.panel { position: relative; background-color: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--elev-1); }
.float { background-color: var(--surface-raised); box-shadow: var(--elev-2); }
.float::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 1px;
  border-radius: var(--radius) var(--radius) 0 0;
  background: linear-gradient(to right, transparent, color-mix(in oklab, var(--glass-edge) 60%, transparent), transparent);
  pointer-events: none; }
.panel-ticked { position: relative; overflow: hidden; }
.panel-ticked::after { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background: var(--accent); }
.corner-brackets { position: relative; }
.corner-brackets::before, .corner-brackets::after { content: ""; position: absolute; width: 1.25rem; height: 1.25rem; }
.corner-brackets::before { top: 0; right: 0; border-top: 2px solid color-mix(in oklab, var(--ink) 40%, transparent);
  border-right: 2px solid color-mix(in oklab, var(--ink) 40%, transparent); border-top-right-radius: 3px; }
.corner-brackets::after { bottom: 0; left: 0; border-bottom: 2px solid color-mix(in oklab, var(--ink) 40%, transparent);
  border-left: 2px solid color-mix(in oklab, var(--ink) 40%, transparent); border-bottom-left-radius: 3px; }

.head { display: flex; justify-content: space-between; align-items: baseline; height: 40px; }
.mark { font-size: 24px; color: var(--ink-muted); }
.brand { font-family: var(--font-display); font-weight: 600; font-size: 24px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink); }
h1 { font-family: var(--font-display); font-weight: 700; margin: 44px 0 0; line-height: 0.98;
  letter-spacing: -0.005em; color: var(--ink); text-wrap: balance; }
h1 .q { color: var(--ink-muted); }
.solution { font-size: 32px; line-height: 1.38; margin: 36px 0 0; color: var(--ink-secondary); max-width: 900px; }
.solution strong { font-weight: 600; color: var(--ink); }
.viz { flex: 1; min-height: 0; margin-top: 44px; margin-bottom: 40px; display: flex; flex-direction: column; }
.viz .panel { flex: 1; min-height: 0; padding: 36px 40px; display: flex; flex-direction: column; }
.viz .cap { margin-bottom: 18px; font-size: 14px; }
.viz svg { flex: 1; min-height: 0; width: 100%; display: block; }
.big { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 24px 32px; }
.big .num { font-size: 220px; line-height: 1; color: var(--ink); font-weight: 500; }
.big .num.s { font-size: 150px; }
.big .num.xs { font-size: 104px; }
.big .sub { margin-top: 20px; font-size: 26px; color: var(--ink-muted); }
.big .sub .readout { color: var(--ink-secondary); }
.list { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 22px; padding: 24px 32px; }
.list .row { display: flex; gap: 28px; align-items: baseline; font-size: 30px; color: var(--ink); }
.list .row .readout { color: var(--accent-text); font-size: 30px; min-width: 96px; }
.foot { font-size: 22px; line-height: 1.3; color: var(--ink-muted); }
svg text { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
svg .lt { font-family: var(--font-display); font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }`

// ---------------------------------------------------------------------------
// Diagramme. Jede Funktion gibt ein SVG-Markup zurück, gezeichnet aus Tokens.
// Die Datenreihen sind illustrativ und plausibel, kein Nutzerwert.
// ---------------------------------------------------------------------------
const W = 856
const fmt = (n) => String(n).replace('.', ',')

/** Referenzspektrum: eine waagerechte Achse mit Marken. */
function spectrum({ left, right, marks, ticks = 5, band, h = 360, note }) {
  const y = h * 0.52
  const x0 = 24
  const x1 = W - 24
  const px = (t) => x0 + t * (x1 - x0)
  let s = `<svg viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg">`
  if (band) {
    s += `<rect x="${px(band[0])}" y="${y - 34}" width="${px(band[1]) - px(band[0])}" height="68" fill="var(--accent-quiet)" rx="4"/>`
  }
  s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="var(--line-strong)" stroke-width="1.5"/>`
  for (let i = 0; i <= ticks; i++) {
    const x = px(i / ticks)
    s += `<line x1="${x}" y1="${y - 8}" x2="${x}" y2="${y + 8}" stroke="var(--line-strong)" stroke-width="1.5"/>`
  }
  s += `<text x="${x0}" y="${y + 44}" class="lt" font-size="16" fill="var(--ink-muted)">${left}</text>`
  s += `<text x="${x1}" y="${y + 44}" class="lt" font-size="16" fill="var(--ink-muted)" text-anchor="end">${right}</text>`
  for (const m of marks) {
    const x = px(m.t)
    const col = m.color || 'var(--series-1)'
    const above = m.above !== false
    const ly = above ? y - 52 : y + 84
    if (m.empty) {
      s += `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="var(--ink-muted)" stroke-width="1.5" stroke-dasharray="4 4"/>`
    } else {
      s += `<line x1="${x}" y1="${y - 30}" x2="${x}" y2="${y + 30}" stroke="${col}" stroke-width="3"/>`
      s += `<circle cx="${x}" cy="${y}" r="9" fill="${col}"/>`
    }
    const anchor = m.t < 0.15 ? 'start' : m.t > 0.85 ? 'end' : 'middle'
    s += `<text x="${x}" y="${ly}" font-size="26" font-weight="500" fill="${m.empty ? 'var(--ink-muted)' : 'var(--ink)'}" text-anchor="${anchor}">${m.label}</text>`
    if (m.sub) s += `<text x="${x}" y="${ly + (above ? -32 : 30)}" class="lt" font-size="14" fill="var(--ink-muted)" text-anchor="${anchor}">${m.sub}</text>`
  }
  if (note) s += `<text x="${x0}" y="${h - 12}" font-size="20" fill="var(--ink-muted)">${note}</text>`
  return s + '</svg>'
}

/** Radar mit 4–6 Achsen: Profil (Serie 1) und Anforderungskontur (Referenz, gestrichelt). */
function radar({ axes, values, need, h = 470, empty = [] }) {
  const cx = W / 2
  const cy = h / 2 + 6
  const R = h / 2 - 54
  const n = axes.length
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]
  }
  let s = `<svg viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg">`
  for (const r of [0.25, 0.5, 0.75, 1]) {
    s += `<polygon points="${axes.map((_, i) => pt(i, r).join(',')).join(' ')}" fill="none" stroke="var(--grid)" stroke-width="1"/>`
  }
  axes.forEach((_, i) => {
    const [x, y] = pt(i, 1)
    s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`
  })
  if (need) {
    s += `<polygon points="${need.map((v, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="var(--reference)" stroke-width="1.5" stroke-dasharray="6 5"/>`
  }
  const poly = values.map((v, i) => (v == null ? null : pt(i, v)))
  const solid = poly.filter(Boolean)
  s += `<polygon points="${solid.map((p) => p.join(',')).join(' ')}" fill="var(--accent-quiet)" stroke="var(--series-1)" stroke-width="2.5" stroke-linejoin="round"/>`
  poly.forEach((p, i) => {
    if (p) s += `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="var(--series-1)"/>`
  })
  axes.forEach((label, i) => {
    const [x, y] = pt(i, 1.19)
    const anchor = Math.abs(x - cx) < 20 ? 'middle' : x < cx ? 'end' : 'start'
    const isEmpty = empty.includes(i)
    s += `<text x="${x}" y="${y + 6}" class="lt" font-size="16" fill="var(--ink-muted)" text-anchor="${anchor}">${label}${isEmpty ? ' —' : ''}</text>`
  })
  return s + '</svg>'
}

/** Verlaufslinie mit Streuungsband; optional Prognose mit Band bis zu einem Datum. */
function trend({ points, band, h = 440, forecast, yLabel, marks = [], labels, lines }) {
  const x0 = 60
  const x1 = W - 24
  const yTop = 30
  const yBot = h - 56
  const n = points ? points.length : lines[0].length
  const all = lines ? lines.flat() : points.concat(forecast || [])
  const lo = Math.min(...all) - (band || 0) * 1.6
  const hi = Math.max(...all) + (band || 0) * 1.6
  const px = (i) => x0 + (i / (n - 1 + (forecast ? forecast.length : 0))) * (x1 - x0)
  const py = (v) => yBot - ((v - lo) / (hi - lo)) * (yBot - yTop)
  let s = `<svg viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg">`
  for (const g of [0, 0.5, 1]) {
    const y = yTop + g * (yBot - yTop)
    s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="var(--grid)" stroke-width="1"/>`
  }
  s += `<line x1="${x0}" y1="${yBot}" x2="${x1}" y2="${yBot}" stroke="var(--line-strong)" stroke-width="1.5"/>`
  if (lines) {
    const cols = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']
    lines.forEach((ln, k) => {
      s += `<polyline points="${ln.map((v, i) => `${px(i)},${py(v)}`).join(' ')}" fill="none" stroke="${cols[k]}" stroke-width="2.5" stroke-linejoin="round"/>`
      ln.forEach((v, i) => (s += `<circle cx="${px(i)}" cy="${py(v)}" r="5" fill="${cols[k]}"/>`))
    })
  } else {
    if (band) {
      const up = points.map((v, i) => `${px(i)},${py(v + band)}`).join(' ')
      const dn = points.map((v, i) => `${px(i)},${py(v - band)}`).reverse().join(' ')
      s += `<polygon points="${up} ${dn}" fill="var(--accent-quiet)"/>`
    }
    s += `<polyline points="${points.map((v, i) => `${px(i)},${py(v)}`).join(' ')}" fill="none" stroke="var(--series-1)" stroke-width="2.5" stroke-linejoin="round"/>`
    points.forEach((v, i) => (s += `<circle cx="${px(i)}" cy="${py(v)}" r="6" fill="var(--series-1)"/>`))
    if (forecast) {
      const start = n - 1
      const fpts = [points[n - 1], ...forecast]
      const widen = (i) => (band || 1) * (1 + i * 0.6)
      const up = fpts.map((v, i) => `${px(start + i)},${py(v + widen(i))}`).join(' ')
      const dn = fpts.map((v, i) => `${px(start + i)},${py(v - widen(i))}`).reverse().join(' ')
      s += `<polygon points="${up} ${dn}" fill="var(--accent-quiet)" opacity="0.7"/>`
      s += `<polyline points="${fpts.map((v, i) => `${px(start + i)},${py(v)}`).join(' ')}" fill="none" stroke="var(--series-1)" stroke-width="2.5" stroke-dasharray="7 6"/>`
    }
  }
  for (const m of marks) {
    const x = px(m.i)
    s += `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBot}" stroke="var(--reference)" stroke-width="1.5" stroke-dasharray="4 5"/>`
    const atEnd = x > x1 - 120
    s += `<text x="${atEnd ? x - 10 : x + 10}" y="${yTop + 20}" class="lt" font-size="15" fill="var(--ink-muted)" text-anchor="${atEnd ? 'end' : 'start'}">${m.label}</text>`
  }
  if (labels) {
    labels.forEach((l, i) => {
      if (l) s += `<text x="${px(i)}" y="${h - 22}" font-size="18" fill="var(--ink-muted)" text-anchor="${i === labels.length - 1 && px(i) > x1 - 40 ? 'end' : i === 0 ? 'start' : 'middle'}">${l}</text>`
    })
  }
  if (yLabel) s += `<text x="${x0}" y="${yTop - 10}" class="lt" font-size="15" fill="var(--ink-muted)">${yLabel}</text>`
  return s + '</svg>'
}

/** Waagerechte Balken, optional Median-Marke oder Schwelle. */
function bars({ items, max, median, threshold, h, unit = '', thresholdLabel, medianLabel, muted = [] }) {
  const rowH = 54
  const H = h || items.length * rowH + 40
  const lx = 190
  const x1 = W - 250
  const px = (v) => lx + (v / max) * (x1 - lx)
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`
  if (median != null) {
    const x = px(median)
    s += `<line x1="${x}" y1="4" x2="${x}" y2="${H - 30}" stroke="var(--reference)" stroke-width="2" stroke-dasharray="5 5"/>`
    s += `<text x="${x}" y="${H - 8}" class="lt" font-size="14" fill="var(--ink-muted)" text-anchor="middle">${medianLabel || 'Median'}</text>`
  }
  if (threshold != null) {
    const x = px(threshold)
    s += `<line x1="${x}" y1="4" x2="${x}" y2="${H - 30}" stroke="var(--reference)" stroke-width="2" stroke-dasharray="5 5"/>`
    s += `<text x="${x}" y="${H - 8}" class="lt" font-size="14" fill="var(--ink-muted)" text-anchor="middle">${thresholdLabel}</text>`
  }
  items.forEach((it, i) => {
    const y = 16 + i * rowH
    const col = it.color || (muted.includes(i) ? 'var(--line-strong)' : 'var(--series-1)')
    s += `<text x="${lx - 18}" y="${y + 24}" class="lt" font-size="15" fill="var(--ink-muted)" text-anchor="end">${it.label}</text>`
    s += `<rect x="${lx}" y="${y + 6}" width="${px(it.value) - lx}" height="26" fill="${col}" rx="4"/>`
    s += `<text x="${px(it.value) + 14}" y="${y + 25}" font-size="20" fill="var(--ink)" stroke="var(--surface-raised)" stroke-width="8" paint-order="stroke" stroke-linejoin="round">${it.text ?? fmt(it.value) + unit}</text>`
  })
  return s + '</svg>'
}

/** Raster aus Feldern (Kader × Achse, Stationen × Plätze). */
function grid({ cols, rows, cells, h, size = 64, gap = 12, rowLabels, colLabels }) {
  const lx = rowLabels ? 150 : 0
  const gw = cols * (size + gap) - gap
  const ox = (W - gw - lx) / 2 + lx
  const oy = colLabels ? 36 : 12
  const H = h || oy + rows * (size + gap) - gap + 12
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`
  if (colLabels) colLabels.forEach((l, c) => (s += `<text x="${ox + c * (size + gap) + size / 2}" y="22" class="lt" font-size="14" fill="var(--ink-muted)" text-anchor="middle">${l}</text>`))
  for (let r = 0; r < rows; r++) {
    if (rowLabels) s += `<text x="${ox - 22}" y="${oy + r * (size + gap) + size / 2 + 6}" class="lt" font-size="15" fill="var(--ink-muted)" text-anchor="end">${rowLabels[r]}</text>`
    for (let c = 0; c < cols; c++) {
      const st = cells[r * cols + c]
      const x = ox + c * (size + gap)
      const y = oy + r * (size + gap)
      if (st === 'low') s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="4" fill="var(--series-1)"/><text x="${x + size / 2}" y="${y + size / 2 + 8}" font-size="24" fill="var(--accent-ink)" text-anchor="middle">▼</text>`
      else if (st === 'ok') s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="4" fill="var(--accent-quiet)" stroke="var(--line)"/>`
      else if (st === 'none') s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="4" fill="none" stroke="var(--line)" stroke-dasharray="4 4"/>`
      else if (typeof st === 'string') s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="4" fill="var(--accent-quiet)" stroke="var(--line)"/><text x="${x + size / 2}" y="${y + size / 2 + 7}" font-size="20" fill="var(--ink)" text-anchor="middle">${st}</text>`
    }
  }
  return s + '</svg>'
}

/** Einzelne Messpunkte auf einer Zeitachse, mit Zählung. */
function dots({ count, needed, h = 300, labels }) {
  const x0 = 80
  const x1 = W - 80
  let s = `<svg viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg">`
  const y = h / 2 - 10
  s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="var(--line-strong)" stroke-width="1.5"/>`
  for (let i = 0; i < needed; i++) {
    const x = x0 + (i / (needed - 1)) * (x1 - x0)
    if (i < count) s += `<circle cx="${x}" cy="${y}" r="16" fill="var(--series-1)"/>`
    else s += `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="var(--ink-muted)" stroke-width="1.5" stroke-dasharray="5 5"/>`
    s += `<text x="${x}" y="${y + 58}" font-size="22" fill="var(--ink)" text-anchor="middle">${i + 1}</text>`
    if (labels && labels[i]) s += `<text x="${x}" y="${y + 90}" class="lt" font-size="14" fill="var(--ink-muted)" text-anchor="middle">${labels[i]}</text>`
  }
  return s + '</svg>'
}

// ---------------------------------------------------------------------------
// Die 50 Posts.
// ---------------------------------------------------------------------------
const POSTS = [
  {
    slug: 'guter-tag', theme: 'dark', title: '+2 cm im Sprung. Oder ein guter Tag.',
    h: '+2 cm im Sprung. Oder ein guter Tag.',
    s: 'Erst wenn die Veränderung grösser ist als deine eigene Schwankung mal <strong>2,77</strong>, zählt sie. Vorher sagt die App: nicht belegt.',
    cap: 'Sprunghöhe · Streuungsband aus den eigenen Messungen',
    viz: trend({ points: [41.0, 40.2, 41.8, 40.9, 42.4, 41.6, 43.1], band: 1.4, labels: ['Jan', 'Feb', 'Apr', 'Mai', 'Jul', 'Aug', 'Okt'], yLabel: 'cm' }),
  },
  {
    slug: '42-tage', theme: 'light', title: 'Was 42 Tage sind',
    h: 'Was 42 Tage sind: der Abstand, ab dem ein zweiter Test etwas anderes misst als den ersten.',
    s: 'KYDON setzt den nächsten Termin auf 42 Tage nach dem letzten. Wer früher wiederholt, misst Tagesform.',
    cap: 'Wiederholungsabstand · Voreinstellung',
    viz: spectrum({ left: 'Letzter Test', right: 'Tag 60', ticks: 6, band: [0.7, 1], marks: [{ t: 0, label: 'Tag 0', sub: 'gemessen' }, { t: 0.7, label: 'Tag 42', sub: 'fällig' }] }),
  },
  {
    slug: 'griffkraft', theme: 'dark', title: 'Vier Wochen Griffkraft',
    h: 'Vier Wochen Griffkraft trainiert. Die Disziplin wollte Kampfausdauer.',
    s: 'Die Anforderungslücke: dein Profil gegen die Kontur von Judo, gewichtet danach, wie sehr jede Achse dort zählt. Oben steht, wo acht Wochen am meisten bringen.',
    cap: 'Profil (Fläche) · Anforderungskontur Judo (gestrichelt)',
    viz: radar({ axes: ['Maximalkraft', 'Griffkraft', 'Kampfausdauer', 'Schnellkraft', 'Beweglichkeit', 'Rumpf'], values: [0.72, 0.88, 0.46, 0.68, 0.6, 0.7], need: [0.7, 0.75, 0.9, 0.8, 0.6, 0.7] }),
  },
  {
    slug: 'wo-nicht-wie', theme: 'dark', title: 'Sie sagt dir, wo.',
    h: 'Diese App sagt dir nicht, wie du trainieren sollst. Sie sagt dir, wo.',
    s: 'Regel §81: keine Übungen, keine Pläne, keine Textbausteine. Die Rangfolge der Achsen kommt aus der Messung. Der Satz dazu kommt vom Trainer.',
    cap: 'Gewichtete Lücke zur Anforderung · Rangfolge',
    viz: bars({ items: [{ label: 'Kampfausdauer', value: 34, text: '34 Punkte' }, { label: 'Schnellkraft', value: 18, text: '18 Punkte' }, { label: 'Rumpf', value: 7, text: '7 Punkte' }, { label: 'Maximalkraft', value: 3, text: '3 Punkte' }, { label: 'Griffkraft', value: 0, text: 'keine' }], max: 40, muted: [2, 3, 4] }),
  },
  {
    slug: 'ausser-fussball', theme: 'light', title: 'Für alles ausser Fussball.',
    h: 'Für alles ausser Fussball.',
    s: 'Von Judo bis Rettungsdienst, von 5 km bis Ironman: 49 Disziplinen in 11 Kategorien, jede mit eigener Anforderungskontur. Fussball ist als Datenregel ausgeschlossen, nicht vergessen.',
    big: { num: '49', sub: 'Disziplinen · <span class="readout">11</span> Kategorien · <span class="readout">0</span> davon Fussball' },
  },
  {
    slug: 'wettkampf-14-juni', theme: 'dark', title: 'Die Form weisst du am 14. Juni',
    h: 'Dein Wettkampf ist am 14. Juni. Die Form weisst du am 14. Juni. Oder zwölf Wochen früher.',
    s: 'Formvorhersage: Trend je Test plus Messfehler, hochgerechnet auf das eingetragene Datum. Mit Band, das breiter wird, je weiter es reicht.',
    cap: 'Verlauf · Prognose bis zum Wettkampftag (gestrichelt)',
    viz: trend({ points: [312, 318, 315, 324, 329], forecast: [334, 339, 344], band: 6, labels: ['Nov', 'Dez', 'Feb', 'Mär', 'Apr', '', '', '14. Jun'], yLabel: 'Watt', marks: [{ i: 7, label: 'Wettkampf' }] }),
  },
  {
    slug: '29-90', theme: 'light', title: '29,90 €. Kein Abo.',
    h: '29,90 €. Kein Abo.<br>Kein Verfall.',
    s: 'Ein Report kostet 29,90 €, vier kosten 89 €. Messen und Auswerten kosten nichts und laufen auf deinem Gerät. Ein gekaufter Report bleibt, bis du ihn brauchst.',
    big: { num: '29,90 €', sub: 'je Report · <span class="readout">4</span> für <span class="readout">89 €</span> · Messen kostet nichts' },
  },
  {
    slug: 'kein-perzentil', theme: 'dark', title: 'Kein Perzentil, kein erfundenes',
    h: 'Wir haben kein Perzentil für dich. Und wir erfinden auch keins.',
    s: 'Ein Perzentil gibt es nur, wo eine benannte Kohorte mit Quelle existiert. Sonst bleibt die Marke leer, und die App sagt, warum.',
    cap: 'Referenzspektrum · Perzentil gegen die benannte Kohorte',
    viz: spectrum({ left: 'P0', right: 'P100', ticks: 4, marks: [{ t: 0.63, label: 'P63', sub: 'Cooper · Kohorte mit Quelle' }, { t: 0.3, label: 'keine Referenz', sub: 'Bear Complex', empty: true, above: false }] }),
  },
  {
    slug: '14-von-20', theme: 'dark', title: '14 von 20. Das ist ein Plan.',
    h: '14 von 20 unter der Anforderung. Das sind nicht 14 Athleten. Das ist ein Plan.',
    s: 'Die Gruppenansicht legt den Kader je Achse nebeneinander. Eine Lücke, die alle teilen, ist kein Einzelproblem. Sie ist ein Loch im Programm.',
    cap: 'Kader × Achse · ▼ unter der Anforderungskontur',
    viz: grid({ cols: 10, rows: 2, size: 66, gap: 14, cells: ['low', 'low', 'ok', 'low', 'low', 'low', 'ok', 'low', 'low', 'low', 'low', 'ok', 'low', 'low', 'ok', 'low', 'ok', 'low', 'low', 'ok'] }),
  },
  {
    slug: 'neuzugang', theme: 'light', title: 'Neuer Athlet. Ein Termin.',
    h: 'Neuer Athlet. Bisher: sechs Monate hinschauen. Jetzt: ein Termin.',
    s: 'Ein Testtag, drei Starttests, und der Neuzugang steht mit Profil im Kader. Mit Angabe, wie gut jede Achse belegt ist, und was noch fehlt.',
    big: { num: '1', sub: 'Testtag statt <span class="readout">6</span> Monate Beobachtung · <span class="readout">3</span> Starttests' },
  },
  {
    slug: 'zwei-werte', theme: 'dark', title: 'Zwei Werte sind eine Differenz.',
    h: 'Zwei Werte sind eine Differenz. Keine Streuung.',
    s: 'Erst ab 4 Messungen desselben Tests schätzt die App deine Streuung. Vorher zeigt sie den Unterschied, aber sie nennt ihn nicht Fortschritt.',
    cap: 'Messungen desselben Tests · ab der vierten gibt es eine Streuung',
    viz: dots({ count: 2, needed: 4, labels: ['', 'Differenz', '', 'Streuung'] }),
  },
  {
    slug: 'median', theme: 'light', title: 'Der Mittelwert der Gruppe',
    h: 'Der Mittelwert der Gruppe ist der Wert des einen, der abgebrochen hat.',
    s: 'Die Stationsauswertung nimmt den Median und die Spanne zwischen erstem und drittem Quartil. Ein Abbruch zieht das Mittel, den Median nicht. Unter 4 Werten gibt es keine Streuung.',
    cap: '2000 m Rudern · Median der Station',
    viz: bars({ items: [{ label: 'A', value: 448, text: '7:28' }, { label: 'B', value: 455, text: '7:35' }, { label: 'C', value: 461, text: '7:41' }, { label: 'D', value: 470, text: '7:50' }, { label: 'E', value: 690, text: '11:30 · Abbruch', color: 'var(--line-strong)' }], max: 760, median: 461 }),
  },
  {
    slug: 'tartan-rasen', theme: 'dark', title: 'Tartan und Rasen',
    h: 'Tartan und Rasen. Untereinander schreiben geht. Vergleichen nicht.',
    s: 'Verglichen wird nur derselbe Test, innerhalb von 180 Tagen, mit Angabe, wie viele der Ausgewählten ihn haben. Abweichende Bedingungen stehen dabei.',
    cap: '30 m Sprint · Bedingung wird mitgeführt',
    viz: spectrum({ left: '4,6 s', right: '3,8 s', ticks: 4, marks: [{ t: 0.55, label: '4,16 s', sub: 'Tartan · Lichtschranke' }, { t: 0.38, label: '4,30 s', sub: 'Rasen · Handstopp', above: false, color: 'var(--series-2)' }], note: 'Bedingungen weichen ab: Untergrund, Zeitnahme' }),
  },
  {
    slug: 'eine-zahl', theme: 'light', title: 'Eine Zahl aus einer Achse',
    h: 'Eine Zahl aus einer Achse ist diese Achse mit anderem Namen.',
    s: 'Die Zusammenfassung entsteht erst ab 3 belegten Achsen und trägt immer ihre Abdeckung: «aus 4 von 6». Eine Achse ohne Referenz zählt nicht als null. Sie zählt nicht.',
    cap: 'Profil · 4 von 6 Achsen mit Referenz',
    viz: radar({ axes: ['Ausdauer', 'Kraft', 'Schnellkraft', 'Beweglichkeit', 'Agilität', 'Kraftausdauer'], values: [0.7, 0.62, null, 0.55, null, 0.66], empty: [2, 4] }),
  },
  {
    slug: '10-punkte', theme: 'dark', title: 'Erst ab 10 Punkten',
    h: 'Eine Achse fällt erst auf, wenn sie 10 Punkte unter deinen übrigen liegt.',
    s: 'Darunter ist es Unterschied zwischen Achsen, kein Hinweis. Darüber nennt die App die Regel und die Messungen, aus denen der Hinweis entstand.',
    cap: 'Abstand zum eigenen Mittel · Schwelle 10 Punkte',
    viz: bars({ items: [{ label: 'Kraftausdauer', value: 16, text: '−16 · fällt auf' }, { label: 'Agilität', value: 11, text: '−11 · fällt auf' }, { label: 'Ausdauer', value: 6, text: '−6' }, { label: 'Schnellkraft', value: 3, text: '−3' }], max: 22, threshold: 10, thresholdLabel: '10 Punkte', muted: [2, 3] }),
  },
  {
    slug: '120-tage', theme: 'dark', title: 'Nach 120 Tagen eine Erinnerung',
    h: 'Nach 120 Tagen ist eine Messung eine Erinnerung.',
    s: 'Ab 120 Tagen gilt ein Ergebnis als veraltet und steht auf der Liste für den nächsten Test. Ins Profil gehen die letzten 18 Monate ein, mit sinkendem Gewicht ab dem 90. Tag.',
    cap: 'Alter einer Messung · Gewicht im Profil',
    viz: spectrum({ left: 'heute', right: '18 Monate', ticks: 6, band: [0, 0.165], marks: [{ t: 0.165, label: 'Tag 90', sub: 'volles Gewicht bis hier' }, { t: 0.22, label: 'Tag 120', sub: 'veraltet', above: false }, { t: 1, label: 'Tag 540', sub: 'zählt nicht mehr' }] }),
  },
  {
    slug: 'frankfurt', theme: 'light', title: 'Frankfurt oder dein Gerät',
    h: 'Deine Daten liegen in Frankfurt. Oder nur auf deinem Gerät.',
    s: 'Messen und Auswerten laufen lokal. Die Zweitschrift, wenn du sie einschaltest, liegt bei Supabase im Rechenzentrum Frankfurt am Main. Der Export ist jederzeit vollständig und kostenlos.',
    big: { num: 'eu-central-1', cls: 'xs', sub: 'Rechenzentrum Frankfurt am Main · nur mit eingeschalteter Zweitschrift' },
  },
  {
    slug: 'karte-ohne-name', theme: 'dark', title: 'Die Karte ohne Namen',
    h: 'Die Karte im Gruppenchat trägt keinen Namen. Und kein Geburtsdatum.',
    s: 'Die Performance Card zeigt Profil, Veränderung und Abdeckung, und den Satz, dass es keine medizinische Aussage ist. Wer sie verschickt, weiss selbst, um wen es geht.',
    cap: 'Performance Card · Abdeckung 5 von 6 Achsen',
    viz: radar({ axes: ['Ausdauer', 'Kraft', 'Schnellkraft', 'Beweglichkeit', 'Agilität', 'Kraftausdauer'], values: [0.74, 0.6, 0.68, null, 0.58, 0.7], empty: [3] }),
  },
  {
    slug: 'trainerwechsel', theme: 'light', title: 'Trainerwechsel',
    h: 'Trainerwechsel. Drei Jahre Messungen bleiben auf dem alten Gerät.',
    s: 'Die Übergabe ist eine eigene Datei je Athlet. Beim neuen Trainer wird sie ergänzt, nie ersetzt. Seine anderen Athleten bleiben, die Historie kommt mit.',
    cap: 'Cooper-Test · Historie über die Übergabe hinweg',
    viz: trend({ points: [2410, 2480, 2530, 2510, 2600, 2640, 2620, 2700], band: 45, labels: ['2024', '', '', '2025', '', '', '2026', ''], marks: [{ i: 4, label: 'Übergabe' }], yLabel: 'm' }),
  },
  {
    slug: 'nicht-freigegeben', theme: 'dark', title: 'Ausgeruht heisst nicht freigegeben.',
    h: 'Ausgeruht heisst nicht freigegeben.',
    s: 'Die Selbsteinschätzung vor dem Test ist ausdrücklich subjektiv: gleich gewichtete Fragen, fehlende Antworten werden nicht ersetzt. Daraus folgt keine Trainingsfreigabe.',
    cap: 'Selbsteinschätzung · aus 4 von 5 beantworteten Fragen',
    viz: spectrum({ left: 'niedrig', right: 'hoch', ticks: 4, marks: [{ t: 0.71, label: '71', sub: 'subjektiv · 4 von 5 Fragen' }] }),
  },
  {
    slug: 'dienstag', theme: 'dark', title: 'Der grösste Fortschritt war ein Dienstag',
    h: 'Der grösste Fortschritt des Jahres war ein Dienstag.',
    s: 'Im Jahresrückblick zählt eine Verbesserung nur über der eigenen Streuung mal 2,77. Darunter heisst es: stabil. Ein Bestwert ist ein Fakt, kein Trend.',
    cap: 'Jahresrückblick · Beep-Test, Stufe',
    viz: trend({ points: [9.4, 9.8, 9.6, 10.1, 9.9, 10.9, 10.7], band: 0.35, labels: ['Jan', 'Mär', 'Apr', 'Jun', 'Aug', 'Okt', 'Dez'], yLabel: 'Stufe' }),
  },
  {
    slug: '4-88', theme: 'light', title: '4,88 € je Athlet',
    h: '4,88 € je Athlet und Monat.',
    s: 'Coach S: 39 € im Monat für 8 Plätze. Die Reports der Athleten sind enthalten. Niemand zahlt zweimal für dieselbe Messung.',
    big: { num: '4,88 €', sub: 'je Platz und Monat · Coach S <span class="readout">39 €</span> für <span class="readout">8</span> Athleten' },
  },
  {
    slug: 'vorstand', theme: 'dark', title: 'Eine Seite für den Vorstand',
    h: 'Zwanzig Athleten, zwölf Monate, eine Seite für den Vorstand.',
    s: 'Der Wirksamkeitsnachweis: gemessene Veränderung über die Saison, je Athlet mit Messfehler. Was innerhalb der Streuung liegt, heisst stabil. Vorlegbar an Eltern, Vorstand, Sponsor.',
    cap: 'Veränderung über 12 Monate · Cooper-Test',
    viz: bars({ items: [{ label: 'belegt besser', value: 11, text: '11 Athleten' }, { label: 'stabil', value: 7, text: '7 Athleten', color: 'var(--line-strong)' }, { label: 'belegt schlechter', value: 2, text: '2 Athleten', color: 'var(--series-3)' }], max: 14 }),
  },
  {
    slug: 'hyrox', theme: 'dark', title: 'HYROX: eine Achse fällt zurück',
    h: 'HYROX: acht Läufe, acht Stationen, eine Achse, die zurückfällt.',
    s: 'Die Anforderungskontur von HYROX gegen dein Profil. Nicht die schwächste Achse steht oben, sondern die mit der grössten gewichteten Lücke.',
    cap: 'Profil (Fläche) · Anforderungskontur HYROX (gestrichelt)',
    viz: radar({ axes: ['Ausdauer', 'Kraftausdauer', 'Maximalkraft', 'Laufökonomie', 'Rumpf'], values: [0.78, 0.52, 0.7, 0.66, 0.6], need: [0.85, 0.85, 0.55, 0.75, 0.6] }),
  },
  {
    slug: 'ck-wert', theme: 'light', title: 'Der CK-Wert bekommt keine Note.',
    h: 'Der CK-Wert bekommt keine Note.',
    s: 'Beobachtungswerte wie CK, Ruhepuls oder Körpergewicht werden erfasst und im Verlauf gezeigt. Nie gegen eine Norm bewertet, nie in eine Achse gerechnet. Was sie bedeuten, sagt eine Ärztin.',
    cap: 'Ruhepuls · Beobachtungswert, ohne Bewertung',
    viz: trend({ points: [52, 54, 51, 53, 56, 55, 52, 51], labels: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So', 'Mo'], yLabel: 'Schläge/min' }),
  },
  {
    slug: 'mit-17', theme: 'light', title: 'Mit 17 reicht das eigene Ja nicht.',
    h: 'Mit 17 reicht das eigene Ja nicht.',
    s: 'Unter 18 hält die App fest, dass, wann und von wem eingewilligt wurde. Keine Unterschrift, kein Scan, keine Anschrift der Eltern. Der Nachweis bleibt beim Trainer.',
    big: { num: '18', sub: 'Jahre · darunter braucht der Datensatz eine festgehaltene Einwilligung' },
  },
  {
    slug: 'rpe-6', theme: 'dark', title: 'Maximaltest bei RPE 6',
    h: 'Ein Maximaltest bei RPE 6 ist kein Maximaltest.',
    s: 'Unter RPE 8 markiert die App den Versuch als nicht ausbelastet. Der Wert bleibt, mit Vorbehalt, und steht als Grund auf der Liste für den nächsten Test.',
    cap: 'Anstrengung nach dem Versuch · ab 8 gilt der Test als ausbelastet',
    viz: spectrum({ left: 'RPE 1', right: 'RPE 10', ticks: 9, band: [7 / 9, 1], marks: [{ t: 5 / 9, label: '6', sub: 'nicht ausbelastet · mit Vorbehalt' }, { t: 7 / 9, label: '8', sub: 'ab hier zählt es', above: false }] }),
  },
  {
    slug: 'zwoelf-wiederholungen', theme: 'dark', title: 'Zwölf Wiederholungen und das 1RM',
    h: 'Zwölf Wiederholungen sagen wenig über dein 1RM.',
    s: 'Ab 10 Wiederholungen streut die Schätzung des Maximums merklich. Die App zeigt den Wert und sagt es dazu, statt ihn wie eine Messung aussehen zu lassen.',
    cap: 'Geschätztes 1RM aus Wiederholungen · Verlässlichkeit',
    viz: bars({ items: [{ label: '3 Wdh.', value: 128, text: '128 kg' }, { label: '6 Wdh.', value: 126, text: '126 kg' }, { label: '10 Wdh.', value: 124, text: '124 kg' }, { label: '12 Wdh.', value: 121, text: '121 kg · streut', color: 'var(--line-strong)' }], max: 150 }),
  },
  {
    slug: 'sechs-je-station', theme: 'light', title: 'Sechs je Station',
    h: 'Sechs je Station. Mehr passt nicht in einen Testtag.',
    s: 'Die Testtag-Planung setzt jeden Athleten in genau eine Gruppe, höchstens 6 je Station. Das ist keine Optimierung, sondern die Bedingung, dass der Plan durchführbar ist.',
    cap: 'Stationen × Plätze · Testtag mit 18 Athleten',
    viz: grid({ cols: 6, rows: 3, size: 66, gap: 14, rowLabels: ['Sprung', 'Cooper', 'Agilität'], cells: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'] }),
  },
  {
    slug: 'drei-schwerpunkte', theme: 'dark', title: 'Drei Schwerpunkte. Nicht zwölf.',
    h: 'Drei Schwerpunkte. Nicht zwölf.',
    s: 'Höchstens 3 offene Schwerpunkte je Athlet. Der Befund kommt aus der Messung, der Satz dazu vom Trainer. Auf die zweite Seite des Berichts passen genau drei.',
    big: { num: '3', sub: 'offene Schwerpunkte je Athlet · Priorität <span class="readout">1 · 2 · 3</span>' },
  },
  {
    slug: '18-monate', theme: 'light', title: 'Das Profil zeigt 18 Monate',
    h: 'Das Profil zeigt 18 Monate. Nicht deinen besten Tag von 2021.',
    s: 'Ins Profil gehen nur Messungen der letzten 18 Monate ein. Ältere bleiben im Verlauf, aber nicht in der Form von heute.',
    cap: 'Profil · Fenster 18 Monate',
    viz: radar({ axes: ['Ausdauer', 'Kraft', 'Schnellkraft', 'Beweglichkeit', 'Agilität', 'Kraftausdauer'], values: [0.66, 0.58, 0.61, 0.5, 0.64, 0.6] }),
  },
  {
    slug: '82-tests', theme: 'dark', title: '82 Tests. Am Anfang drei.',
    h: '82 Tests. Am Anfang brauchst du drei.',
    s: 'Die drei universellen Starttests decken die allgemeinen Achsen. Danach führt die Rangliste: nie gemessen, überfällig, schwächste Achse, letzter Wert mit Vorbehalt.',
    big: { num: '82', sub: 'Tests im Katalog · <span class="readout">3</span> zum Start · der Rest nach Datenlage' },
  },
  {
    slug: 'programm-wechseln', theme: 'dark', title: 'Alle drei Wochen das Programm',
    h: 'Wer alle drei Wochen das Programm wechselt, adaptiert nie.',
    s: 'Die App führt den Messfehler mit. Solange +2 % im Band deiner eigenen Streuung liegen, sagt sie: nicht belegt. Dann bleibt das Programm, bis die Messung etwas anderes sagt.',
    cap: '2000 m Rudern · alles im Band ist Tagesform',
    viz: trend({ points: [452, 447, 455, 449, 451, 444], band: 6, labels: ['Sep', 'Nov', 'Jan', 'Feb', 'Apr', 'Mai'], yLabel: 's' }),
  },
  {
    slug: 'triathlon', theme: 'light', title: 'Triathlon: eine Achse fällt zurück',
    h: 'Triathlon: drei Sportarten, eine Achse, die zurückfällt.',
    s: 'Die Anforderungskontur der Mitteldistanz gegen dein Profil. Die Lücke wird danach gewichtet, wie sehr die Achse für 70.3 zählt, nicht danach, wie gross sie absolut ist.',
    cap: 'Profil (Fläche) · Anforderungskontur Mitteldistanz (gestrichelt)',
    viz: radar({ axes: ['Ausdauer', 'Schwelle', 'Kraftausdauer', 'Ökonomie', 'Beweglichkeit'], values: [0.8, 0.62, 0.7, 0.58, 0.55], need: [0.9, 0.85, 0.65, 0.8, 0.45] }),
  },
  {
    slug: 'sagt-nichts', theme: 'dark', title: 'Der Athlet, der fällt, sagt nichts.',
    h: 'Der Athlet, der fällt, sagt nichts.',
    s: 'Verfügbarkeit über den Kader: der Trend der Selbsteinschätzung je Athlet, nur als Hinweis auf ein Gespräch. Keine Freigabe, keine Sperre, keine Diagnose.',
    cap: 'Selbsteinschätzung · drei Athleten über sechs Wochen',
    viz: trend({ lines: [[72, 74, 70, 73, 71, 74], [68, 66, 69, 65, 67, 66], [75, 71, 66, 62, 58, 55]], labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'], yLabel: 'subjektiv' }),
  },
  {
    slug: 'zwoelf-minuten', theme: 'light', title: 'Zwölf Minuten auf der Bahn',
    h: 'Ein Tempolauf ist keine Diagnostik. Zwölf Minuten auf der Bahn schon.',
    s: 'Cooper-Test: eine Bahn, ein Wert mit bekannter Streuung, in 42 Tagen unter denselben Bedingungen wiederholbar. Das Training misst nichts. Der Test schon.',
    big: { num: '12:00', sub: 'Minuten · <span class="readout">400 m</span> Bahn · Wiederholung nach <span class="readout">42</span> Tagen' },
  },
  {
    slug: 'zehn-ergebnisse', theme: 'dark', title: 'Zehn Ergebnisse ohne Sicherung.',
    h: 'Zehn Ergebnisse ohne Sicherung.',
    s: 'Nach 10 neuen Ergebnissen oder 90 Tagen ohne Export erinnert die App an die Sicherung. Der Export ist vollständig, kostenlos und deine Datei.',
    big: { num: '10', sub: 'Ergebnisse oder <span class="readout">90</span> Tage · dann erinnert die App an den Export' },
  },
  {
    slug: 'drei-vier', theme: 'dark', title: 'Ab drei ein Trend, ab vier eine Streuung',
    h: 'Ab drei Messungen ein Trend. Ab vier eine Streuung.',
    s: 'Vorher steht ein Wert mit Datum da. Nicht weniger, nicht mehr. Die App rechnet nichts hoch, was die Daten nicht tragen.',
    cap: '20-Minuten-Leistung · vierte Messung, erstes Band',
    viz: trend({ points: [268, 274, 271, 279], band: 4, labels: ['1', '2', '3', '4'], yLabel: 'Watt' }),
  },
  {
    slug: 'feuerwehr', theme: 'dark', title: 'Feuerwehr: die Anforderung bleibt',
    h: 'Feuerwehr: der Eignungstest misst einmal. Die Anforderung bleibt.',
    s: 'Anforderungskonturen für Feuerwehr, Polizei, Rettungsdienst, Militär und Spezialeinheiten. Die App zeigt die Lücke zur Kontur. Was du damit tust, entscheidest du.',
    cap: 'Profil (Fläche) · Anforderungskontur Feuerwehr (gestrichelt)',
    viz: radar({ axes: ['Kraftausdauer', 'Relativkraft', 'Lastentragen', 'Agilität', 'Ausdauer'], values: [0.66, 0.7, 0.55, 0.6, 0.72], need: [0.8, 0.7, 0.85, 0.6, 0.7] }),
  },
  {
    slug: 'kein-fitnesswert', theme: 'light', title: 'Kein Fitnesswert.',
    h: 'Kein Fitnesswert. Keine Bewertung einer Person.',
    s: 'Die eine Zahl ist das Mittel der Perzentile belegter Achsen, mit Abdeckung daneben. Nicht mehr. Der Satz unten steht deshalb auf jeder Karte und in jedem Bericht.',
    big: { num: 'aus 4 von 6', cls: 'xs', sub: 'Abdeckung, die neben jeder Zusammenfassung steht · nie optional' },
  },
  {
    slug: 'vier-fuer-89', theme: 'light', title: 'Vier Reports für 89 €',
    h: 'Vier Reports für 89 €. Weil du viermal im Jahr testest, nicht wöchentlich.',
    s: 'Diagnostik ist periodisch. Vier Reports sind eine Saison: 22,25 € je Report, 26 % unter dem Einzelpreis. Kein Verfall, keine Kündigung.',
    cap: 'Preis je Report',
    viz: bars({ items: [{ label: '1 Report', value: 29.9, text: '29,90 €' }, { label: '4 Reports', value: 22.25, text: '22,25 €' }, { label: '10 Reports', value: 17.9, text: '17,90 €' }], max: 34 }),
  },
  {
    slug: 'herkunft', theme: 'dark', title: 'Die Herkunft der Referenz reist mit.',
    h: 'Die Herkunft der Referenz reist mit.',
    s: 'Jedes Band nennt seine Quelle: welche Kohorte, wer, wann. Ein Band ist eine andere Darstellung desselben Perzentils, keine zusätzliche Erkenntnis. Das steht auch im Bericht für die Eltern.',
    cap: 'Referenzspektrum · Quelle am Band',
    viz: spectrum({ left: 'P0', right: 'P100', ticks: 4, band: [0.5, 0.75], marks: [{ t: 0.58, label: 'P58', sub: 'Kohorte · Erwachsene · Quelle im Bericht' }] }),
  },
  {
    slug: 'boxen', theme: 'dark', title: 'Boxen: 88. und 41. Perzentil',
    h: 'Boxen: 88. Perzentil Schnellkraft, 41. Kampfausdauer.',
    s: 'Das ist keine Trainingsvorgabe. Das ist eine Wettkampfstrategie. Sie gibt es nur, wenn für deine Gewichtsklasse eine Kohorte mit Quelle vorliegt. Sonst nicht.',
    cap: 'Perzentil in der Gewichtsklasse · zwei Achsen',
    viz: spectrum({ left: 'P0', right: 'P100', ticks: 4, marks: [{ t: 0.88, label: 'P88', sub: 'Schnellkraft' }, { t: 0.41, label: 'P41', sub: 'Kampfausdauer', above: false, color: 'var(--series-2)' }] }),
  },
  {
    slug: 'nur-einer', theme: 'light', title: 'Ein Test, den nur einer hat',
    h: 'Ein Test, den nur einer hat, ist kein Vergleich.',
    s: 'Die Gruppenansicht zeigt nur Tests, die mindestens zwei der Ausgewählten gemessen haben. Sonst stünde eine Zeile da und sähe aus wie ein Ergebnis von allen.',
    cap: 'Standweitsprung · 5 von 6 Ausgewählten haben den Test',
    viz: bars({ items: [{ label: 'A', value: 2.62, text: '2,62 m' }, { label: 'B', value: 2.48, text: '2,48 m' }, { label: 'C', value: 2.41, text: '2,41 m' }, { label: 'D', value: 2.35, text: '2,35 m' }, { label: 'E', value: 2.2, text: '2,20 m' }, { label: 'F', value: 0, text: 'nicht gemessen' }], max: 3, median: 2.41 }),
  },
  {
    slug: '21-40', theme: 'dark', title: '5 km in 21:40',
    h: '<span class="q">5 km in 21:40. Und in 42 Tagen?</span>',
    s: 'Ein Wert bekommt Bedeutung durch den zweiten. Der nächste Termin steht, die Bedingung steht: gleiche Strecke, gleiche Zeitnahme. Erst dann ist ein Unterschied ein Unterschied.',
    big: { num: '21:40', sub: '5 km · nächster Termin in <span class="readout">42</span> Tagen · gleiche Strecke, gleiche Uhr' },
  },
  {
    slug: 'jede-dritte', theme: 'light', title: 'Jede dritte Tagesschwankung',
    h: 'Eine Streuung als Schwelle, und jeder dritte gute Tag wäre ein Fortschritt.',
    s: 'Deshalb 1,96 · √2. Die Differenz zweier Messungen streut √2‑mal so stark wie eine, und 1,96 Streuungen decken das übliche 95-Prozent-Band.',
    big: { num: '2,77', sub: '= <span class="readout">1,96 · √2</span> · Vielfaches der eigenen Streuung, ab dem eine Veränderung belegt ist' },
  },
  {
    slug: 'vereinswechsel', theme: 'dark', title: 'Ihre Historie auch.',
    h: 'Sie hat den Verein gewechselt. Ihre Historie auch.',
    s: 'Die Übergabedatei enthält die vollständige Historie einer Person. Sie gehört ihr, nicht dem Gerät, auf dem sie entstanden ist. Der neue Trainer liest sie ein, ohne etwas zu verlieren.',
    cap: 'Beep-Test · dieselbe Historie, neuer Verein',
    viz: trend({ points: [8.2, 8.6, 9.1, 9.0, 9.4, 9.9, 9.8, 10.3], band: 0.3, labels: ['2024', '', '', '2025', '', '', '2026', ''], marks: [{ i: 5, label: 'Vereinswechsel' }], yLabel: 'Stufe' }),
  },
  {
    slug: 'export', theme: 'light', title: 'Export ohne Kontingent',
    h: 'Export: vollständig, kostenlos, ohne Kontingent.',
    s: 'Ob du einen Report gekauft hast oder keinen: der Export der eigenen Daten wird nie eingeschränkt. Diese Zusage steht über allen Preisen.',
    big: { num: '0 €', sub: 'für den vollständigen Export · immer · unabhängig vom Kontingent' },
  },
  {
    slug: 'sechs-achsen', theme: 'dark', title: 'Ohne Sportart sechs Achsen',
    h: 'Ohne Sportart: sechs Achsen. Mit Judo: die eigenen.',
    s: 'Jede Disziplin hat ihr eigenes Achsenset und ihre Kontur. Das Profil meldet nicht «unvollständig», weil du der Empfehlung der App gefolgt bist.',
    cap: 'Allgemeines Profil · sechs Achsen',
    viz: radar({ axes: ['Ausdauer', 'Kraft', 'Schnellkraft', 'Beweglichkeit', 'Agilität', 'Kraftausdauer'], values: [0.6, 0.72, 0.65, 0.48, 0.7, 0.62] }),
  },
  {
    slug: 'mit-paragraf', theme: 'dark', title: 'Mit Paragraf.',
    h: 'Was die App nicht tut, steht im Code. Mit Paragraf.',
    s: 'Jede Grenze ist eine Regel mit Nummer, im Quelltext neben der Funktion, die sie einhält.',
    list: [
      ['§81', 'Keine Trainingsempfehlung. Der Satz kommt vom Trainer.'],
      ['§82', 'Keine medizinische Aussage. Keine Trainingsfreigabe.'],
      ['§50', 'Keine Personendaten auf der Karte. Kein Name, kein Geburtsdatum.'],
      ['§32', 'Export immer vollständig und kostenlos.'],
    ],
  },
]

if (POSTS.length !== 50) throw new Error(`Es sind ${POSTS.length} Posts, nicht 50`)

// Schriftgrösse der Headline nach Länge, damit sie in drei Zeilen bleibt.
function headlineSize(h) {
  const len = h.replace(/<[^>]+>/g, '').length
  if (len <= 34) return 120
  if (len <= 52) return 108
  if (len <= 66) return 96
  return 84
}

function page(p, i) {
  const nn = String(i + 1).padStart(2, '0')
  let body
  if (p.big) {
    body = `<div class="big corner-brackets"><div class="num readout ${p.big.cls || ''}">${p.big.num}</div><div class="sub">${p.big.sub}</div></div>`
  } else if (p.list) {
    body = `<div class="list corner-brackets">${p.list.map(([k, t]) => `<div class="row"><span class="readout">${k}</span><span>${t}</span></div>`).join('')}</div>`
  } else {
    body = `<div class="panel float panel-ticked"><div class="cap label-tag">${p.cap}</div>${p.viz}</div>`
  }
  return `<!doctype html>
<html lang="de"${p.theme === 'dark' ? ' data-theme="dark"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080">
<title>[ ${nn} / 50 ] ${p.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Saira+Condensed:wght@600;700&display=block" rel="stylesheet">
<style>${FONTS}${TOKENS}${LAYOUT}</style>
</head>
<body>
<div class="post">
  <div class="head"><span class="mark readout">[ ${nn} / 50 ]</span><span class="brand">Kydon</span></div>
  <h1 style="font-size:${headlineSize(p.h)}px">${p.h}</h1>
  <p class="solution">${p.s}</p>
  <div class="viz">${body}</div>
  <div class="foot">${FOOTER}</div>
</div>
</body>
</html>
`
}

const names = []
POSTS.forEach((p, i) => {
  const nn = String(i + 1).padStart(2, '0')
  const name = `${nn}-${p.slug}`
  names.push({ name, title: p.title, theme: p.theme })
  writeFileSync(join(here, 'posts', `${name}.html`), page(p, i))
})

// Kontaktbogen
const index = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>KYDON · Instagram · Kontaktbogen</title>
<style>${FONTS}${TOKENS}
* { box-sizing: border-box; }
body { margin: 0; padding: 40px; background: var(--plane); background-image: var(--atmo); background-attachment: fixed;
  color: var(--ink); font-family: var(--font-body); }
h1 { font-family: var(--font-display); font-weight: 700; font-size: 40px; margin: 0 0 6px; }
.sub { color: var(--ink-muted); margin: 0 0 32px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(216px, 1fr)); gap: 20px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--elev-1); overflow: hidden; }
.card img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
.card .meta { padding: 10px 12px 12px; }
.card .mark { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 12px; color: var(--ink-muted); }
.card .t { font-size: 14px; line-height: 1.3; margin-top: 2px; }
.card .lt { font-family: var(--font-display); font-weight: 600; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-muted); margin-top: 4px; }
</style>
</head>
<body>
<h1>KYDON · 50 Posts</h1>
<p class="sub">1080 × 1350 px · Mondlicht ${names.filter((n) => n.theme === 'dark').length} · Mondstein ${names.filter((n) => n.theme === 'light').length}</p>
<div class="grid">
${names.map((n, i) => `  <a class="card" href="png/${n.name}.png"><img src="png/${n.name}.png" alt="${n.title}" loading="lazy"><div class="meta"><div class="mark">[ ${String(i + 1).padStart(2, '0')} / 50 ]</div><div class="t">${n.title}</div><div class="lt">${n.theme === 'dark' ? 'Mondlicht' : 'Mondstein'}</div></div></a>`).join('\n')}
</div>
</body>
</html>
`
writeFileSync(join(here, 'index.html'), index)
console.log(`${names.length} Posts geschrieben`)
