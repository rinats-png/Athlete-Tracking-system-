/**
 * Die Karte zum Weitergeben.
 *
 * Gezeichnet auf ein Canvas und nicht als Bildschirmfoto: das Ergebnis ist
 * eine Datei, die jemand verschicken kann, in immer derselben Grösse und
 * ohne die Bedienelemente der App. Das Format ist 1080 × 1350 — das
 * Hochformat, das in einem Feed ohne Beschnitt steht.
 *
 * WAS DRAUFSTEHT, UND WARUM: das Profil als Radar, weil ein Radar in einer
 * Sekunde sagt, was fünf Zahlen in zehn sagen; die belegten Veränderungen
 * des Jahres mit Vorzeichen, weil die Karte sonst nur ein Zustand ist und
 * kein Weg; ein Satz, der das Jahr zusammenfasst — und immer die beiden
 * Zeilen, die die Karte hübscher machte wegzulassen: die Abdeckung neben
 * der Zahl, und dass es keine medizinische Aussage ist (§82). Eine Karte
 * ohne diese beiden Zeilen wandert durch einen Gruppenchat und wird dort zu
 * etwas, das sie nicht ist.
 *
 * Kein Name, kein Geburtsdatum, kein Verein: die Karte trägt Leistungswerte,
 * keine Personendaten (§50). Wer sie verschickt, weiss selbst, um wen es
 * geht.
 */

export interface CardAxis {
  label: string
  /** 0–100 oder null, wenn die Achse nicht belegt ist. Null bleibt eine Lücke. */
  score: number | null
}

export interface CardChange {
  label: string
  /** Richtungsbereinigt: positiv heisst besser. */
  percent: number
  proven: boolean
}

export interface CardContent {
  title: string
  /** Kleine Zeile unter dem Titel — meist das Jahr. */
  subtitle: string
  score: number | null
  coverage: string
  axes: CardAxis[]
  changes: CardChange[]
  /** Ein Satz, der das Jahr zusammenfasst. */
  sentence: string
  footer: string
  caveat: string
  /** Beschriftungen der beiden Spalten unter den Veränderungen. */
  labels: { proven: string; withinNoise: string; profile: string; changes: string }
}

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

/* Die Karte wird gezeichnet, nicht gestylt — deshalb stehen die Farben hier
   als Werte. Es sind die Töne von Mondstein: kühle Tinte, tiefes Silbergrün,
   silbriger Nebel. Die Karte ist immer hell, auch wenn die App dunkel steht:
   sie wird weitergegeben und oft gedruckt. */
const INK = '#1B2523'
const INK_SECONDARY = '#4A5A56'
const MUTED = '#536360'
const PAPER = '#F0F4F4'
const SURFACE = '#FFFFFF'
const LINE = '#CFD6D5'
const GRID = '#DCE3E3'
const ACCENT = '#5E7470'
const ACCENT_GLOW = '#A9BDB5'
const GOOD = '#0A6E0A'
const CRITICAL = '#B3261E'

/* Dieselbe Schriftlogik wie in theme.css: die Anzeige-Schrift ist eine
   Kondensschrift, Zahlen laufen in Mono. Ist die Schrift auf dem Gerät nicht
   vorhanden, greift die Rückfallebene — die Karte bleibt lesbar. */
const DISPLAY = '"Saira Condensed", "Arial Narrow", system-ui, sans-serif'
const BODY = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, "SF Mono", monospace'

export function drawPerformanceCard(canvas: HTMLCanvasElement, content: CardContent): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const m = 72 // Rand

  // Grund: Nebel mit einem silbrigen Aufblühen oben — nie eine flache Farbe.
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  const glow = ctx.createRadialGradient(w / 2, h * 0.12, 0, w / 2, h * 0.12, w * 0.7)
  glow.addColorStop(0, 'rgba(255,255,255,0.85)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  // Kopfzeile: Mono-Marke links, Wortmarke rechts.
  ctx.fillStyle = MUTED
  ctx.font = `500 22px ${MONO}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('[ ' + content.subtitle + ' ]', m, m + 18)
  ctx.font = `600 22px ${DISPLAY}`
  ctx.textAlign = 'right'
  drawTracked(ctx, 'BASELINE', w - m, m + 18, 0.14)
  ctx.textAlign = 'left'

  // Titel.
  ctx.fillStyle = INK
  ctx.font = `700 64px ${DISPLAY}`
  ctx.fillText(fit(ctx, content.title, w - 2 * m), m, m + 96)

  // Die Zahl — und direkt daneben, aus wie vielen Achsen sie stammt.
  const scoreTop = m + 150
  if (content.score == null) {
    ctx.fillStyle = MUTED
    ctx.font = `400 24px ${BODY}`
    wrap(ctx, content.coverage, m, scoreTop + 40, w / 2 - m, 30)
  } else {
    ctx.fillStyle = ACCENT
    ctx.font = `700 168px ${MONO}`
    ctx.fillText(String(content.score), m - 6, scoreTop + 150)
    ctx.fillStyle = MUTED
    ctx.font = `400 22px ${BODY}`
    wrap(ctx, content.coverage, m, scoreTop + 190, w / 2 - m, 28)
  }

  // Radar rechts vom Score.
  // Weit genug von der rechten Kante, dass auch eine lange Achsenbeschriftung
  // rechts davon noch in den Rahmen passt.
  drawRadar(ctx, { cx: w - m - 250, cy: scoreTop + 120, r: 150 }, content.axes)

  // Trennlinie.
  const changesTop = scoreTop + 330
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(m, changesTop)
  ctx.lineTo(w - m, changesTop)
  ctx.stroke()

  // Veränderungen des Jahres: Beschriftung, Balken, Zahl.
  ctx.fillStyle = MUTED
  ctx.font = `600 18px ${DISPLAY}`
  drawTracked(ctx, content.labels.changes.toUpperCase(), m, changesTop + 40, 0.14)

  const rows = content.changes.slice(0, 6)
  let y = changesTop + 90
  const barX = m + 300
  const barW = w - m - barX - 140
  const maxPercent = Math.max(10, ...rows.map((r) => Math.abs(r.percent)))
  if (rows.length === 0) {
    ctx.fillStyle = INK_SECONDARY
    ctx.font = `400 24px ${BODY}`
    ctx.fillText(content.sentence ? '' : '', m, y)
  }
  for (const row of rows) {
    ctx.fillStyle = INK
    ctx.font = `500 24px ${BODY}`
    ctx.fillText(fit(ctx, row.label, barX - m - 20), m, y)

    // Nullachse in der Mitte des Balkenfeldes; Richtung über Vorzeichen UND Farbe.
    const zero = barX + barW / 2
    const len = (Math.abs(row.percent) / maxPercent) * (barW / 2)
    ctx.fillStyle = row.proven ? (row.percent >= 0 ? GOOD : CRITICAL) : GRID
    ctx.fillRect(row.percent >= 0 ? zero : zero - len, y - 16, len, 16)
    ctx.fillStyle = LINE
    ctx.fillRect(zero, y - 22, 1, 28)

    ctx.fillStyle = row.proven ? INK : MUTED
    ctx.font = `600 24px ${MONO}`
    ctx.textAlign = 'right'
    ctx.fillText(`${row.percent > 0 ? '+' : ''}${row.percent.toFixed(1)} %`, w - m, y)
    ctx.textAlign = 'left'
    y += 52
  }
  if (rows.length > 0) {
    ctx.fillStyle = MUTED
    ctx.font = `400 18px ${BODY}`
    ctx.fillText(`■ ${content.labels.proven}   ▢ ${content.labels.withinNoise}`, m, y + 4)
    y += 40
  }

  // Der Satz — als Fläche, Ebene 2.
  const boxTop = Math.max(y + 20, h - 400)
  const boxH = 140
  ctx.fillStyle = SURFACE
  ctx.strokeStyle = LINE
  roundRect(ctx, m, boxTop, w - 2 * m, boxH, 16)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = ACCENT
  ctx.fillRect(m, boxTop + 16, 3, boxH - 32)
  ctx.fillStyle = INK
  ctx.font = `500 30px ${BODY}`
  wrap(ctx, content.sentence, m + 32, boxTop + 58, w - 2 * m - 64, 40, 3)

  // Fusszeile: Abdeckung des Jahres, dann der Vorbehalt. Beides bleibt.
  ctx.fillStyle = INK_SECONDARY
  ctx.font = `400 22px ${BODY}`
  ctx.fillText(fit(ctx, content.footer, w - 2 * m), m, h - 130)
  ctx.fillStyle = MUTED
  ctx.font = `400 19px ${BODY}`
  wrap(ctx, content.caveat, m, h - 92, w - 2 * m, 26, 2)

  // Eckklammern — zwei, nicht vier.
  ctx.strokeStyle = ACCENT_GLOW
  ctx.lineWidth = 2
  bracket(ctx, 32, 32, 1, 1)
  bracket(ctx, w - 32, h - 32, -1, -1)
}

function drawRadar(
  ctx: CanvasRenderingContext2D,
  { cx, cy, r }: { cx: number; cy: number; r: number },
  axes: CardAxis[],
): void {
  const n = axes.length
  if (n < 3) return
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const point = (i: number, k: number) => [cx + Math.cos(angle(i)) * r * k, cy + Math.sin(angle(i)) * r * k] as const

  // Raster: drei Ringe, dünn.
  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  for (const k of [1 / 3, 2 / 3, 1]) {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const [x, y] = point(i, k)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = point(i, 1)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  // Fläche: nur über belegte Achsen — eine Lücke bleibt eine Lücke, sie wird
  // nicht als Null gezeichnet (§89).
  ctx.fillStyle = 'rgba(94, 116, 112, 0.22)'
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 2.5
  ctx.beginPath()
  let started = false
  for (let i = 0; i < n; i++) {
    const s = axes[i].score
    if (s == null) {
      started = false
      continue
    }
    const [x, y] = point(i, Math.max(0.04, s / 100))
    if (!started) {
      ctx.moveTo(x, y)
      started = true
    } else ctx.lineTo(x, y)
  }
  if (axes[0].score != null && axes[n - 1].score != null) ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Punkte und Beschriftungen.
  ctx.font = `600 15px ${DISPLAY}`
  for (let i = 0; i < n; i++) {
    const s = axes[i].score
    if (s != null) {
      const [x, y] = point(i, Math.max(0.04, s / 100))
      ctx.fillStyle = ACCENT
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    const [lx, ly] = point(i, 1.2)
    ctx.fillStyle = s == null ? GRID : MUTED
    ctx.textAlign = Math.abs(Math.cos(angle(i))) < 0.2 ? 'center' : Math.cos(angle(i)) > 0 ? 'left' : 'right'
    ctx.fillText(axes[i].label.toUpperCase(), lx, ly + 5)
  }
  ctx.textAlign = 'left'
}

/** Gesperrte Versalien: Zeichen für Zeichen mit festem Abstand gesetzt. */
function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): void {
  const size = Number(/(\d+)px/.exec(ctx.font)?.[1] ?? 16)
  const gap = size * tracking
  const total = [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + gap, 0) - gap
  let cursor = ctx.textAlign === 'right' ? x - total : ctx.textAlign === 'center' ? x - total / 2 : x
  const align = ctx.textAlign
  ctx.textAlign = 'left'
  for (const ch of text) {
    ctx.fillText(ch, cursor, y)
    cursor += ctx.measureText(ch).width + gap
  }
  ctx.textAlign = align
}

/** Kürzt mit Auslassungspunkten, statt aus dem Rahmen zu laufen. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1)
  return `${s.trimEnd()}…`
}

/** Umbruch an Wortgrenzen — ohne ihn liefe der Hinweis aus der Karte. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 99,
): void {
  let line = ''
  let cursor = y
  let lines = 0
  const words = text.split(' ')
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines++
      if (lines === maxLines) {
        ctx.fillText(fit(ctx, `${line} ${words.slice(i).join(' ')}`, maxWidth), x, cursor)
        return
      }
      ctx.fillText(line, x, cursor)
      line = word
      cursor += lineHeight
    } else {
      line = candidate
    }
  }
  if (line) ctx.fillText(line, x, cursor)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function bracket(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number): void {
  const len = 22
  ctx.beginPath()
  ctx.moveTo(x, y + dy * len)
  ctx.lineTo(x, y)
  ctx.lineTo(x + dx * len, y)
  ctx.stroke()
}
