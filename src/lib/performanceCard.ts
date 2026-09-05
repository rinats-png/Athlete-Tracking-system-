/**
 * Die Karte zum Weitergeben.
 *
 * Gezeichnet auf ein Canvas und nicht als Bildschirmfoto: das Ergebnis ist
 * eine Datei, die jemand verschicken kann, in immer derselben Grösse und
 * ohne die Bedienelemente der App.
 *
 * ZWEI DINGE STEHEN IMMER DRAUF, auch wenn es die Karte hübscher machte, sie
 * wegzulassen: die Abdeckung neben der Zahl, und der Satz, dass es keine
 * medizinische Aussage ist (§82). Eine Karte ohne diese beiden Zeilen wandert
 * durch einen Gruppenchat und wird dort zu etwas, das sie nicht ist.
 *
 * Kein Name, kein Geburtsdatum, kein Verein: die Karte trägt Leistungswerte,
 * keine Personendaten (§50). Wer sie verschickt, weiss selbst, um wen es
 * geht.
 */

export interface CardContent {
  title: string
  score: number | null
  coverage: string
  rows: { label: string; value: number }[]
  footer: string
  caveat: string
}

/* Die Karte wird gezeichnet, nicht gestylt — deshalb stehen die Farben hier
   als Werte. Es sind die Töne von Mondstein: kühle Tinte, tiefes
   Silbergrün, silbriger Nebel. Die Karte ist immer hell, auch wenn die App dunkel steht: sie
   wird weitergegeben und oft gedruckt. */
const INK = '#1B2523'
const MUTED = '#536360'
const PAPER = '#F0F4F4'
const ACCENT = '#5E7470'

export function drawPerformanceCard(canvas: HTMLCanvasElement, content: CardContent): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 4
  ctx.strokeRect(16, 16, w - 32, h - 32)

  ctx.fillStyle = MUTED
  ctx.font = '600 20px system-ui, sans-serif'
  ctx.fillText('BASELINE', 48, 76)

  ctx.fillStyle = INK
  ctx.font = '700 40px system-ui, sans-serif'
  ctx.fillText(content.title, 48, 132)

  // Die Zahl — und direkt darunter, aus wie vielen Achsen sie stammt.
  if (content.score == null) {
    ctx.fillStyle = MUTED
    ctx.font = '400 22px system-ui, sans-serif'
    ctx.fillText(content.coverage, 48, 200)
  } else {
    ctx.fillStyle = ACCENT
    ctx.font = '700 120px system-ui, sans-serif'
    ctx.fillText(String(content.score), 48, 268)
    ctx.fillStyle = MUTED
    ctx.font = '400 20px system-ui, sans-serif'
    ctx.fillText(content.coverage, 48, 306)
  }

  let y = 380
  ctx.font = '400 24px system-ui, sans-serif'
  for (const row of content.rows) {
    ctx.fillStyle = INK
    ctx.fillText(row.label, 48, y)
    ctx.textAlign = 'right'
    ctx.fillText(String(row.value), w - 48, y)
    ctx.textAlign = 'left'
    ctx.strokeStyle = '#C8C7BE'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(48, y + 14)
    ctx.lineTo(w - 48, y + 14)
    ctx.stroke()
    y += 52
  }

  ctx.fillStyle = MUTED
  ctx.font = '400 20px system-ui, sans-serif'
  ctx.fillText(content.footer, 48, h - 108)

  ctx.font = '400 16px system-ui, sans-serif'
  wrap(ctx, content.caveat, 48, h - 72, w - 96, 22)
}

/** Umbruch an Wortgrenzen — ohne ihn liefe der Hinweis aus der Karte. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  let line = ''
  let cursor = y
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, cursor)
      line = word
      cursor += lineHeight
    } else {
      line = candidate
    }
  }
  if (line) ctx.fillText(line, x, cursor)
}
