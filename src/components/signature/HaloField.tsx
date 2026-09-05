import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Der Halo — der leuchtende Partikelring aus der Vorlage.
 *
 * WIE DIE DICHTE ZUSTANDE KOMMT. Die Vorlage zeichnet 160 000 Punkte je Bild
 * auf der GPU. Auf einem 2D-Canvas ist das je Bild nicht zu bezahlen — aber
 * es muss auch nicht je Bild sein: der Ring ist rotationssymmetrisch und
 * verändert sich zwischen zwei Bildern kaum. Er wird deshalb EINMAL in einen
 * Zwischenspeicher gezeichnet, mit der vollen Zahl Punkte, und danach nur
 * noch als Bild gedreht, skaliert und verschoben. Das kostet je Bild einen
 * einzigen Kopiervorgang.
 *
 * Darüber liegt eine dünne Schicht Punkte, die tatsächlich je Bild neu
 * gezeichnet wird — das Flimmern, das ein starres Bild nicht hat.
 *
 * Warum nicht Three.js wie in der Vorlage: das wären rund 600 kB
 * Fremdabhängigkeit gegen ein Bündelbudget von 850 kB, eine Quelle, die
 * unsere CSP nicht erlaubt und die offline fehlt, und Dauerlast auf der GPU
 * eines Telefons, das in der Halle eine Messung mitschreiben soll.
 *
 * Der Ring zeigt NICHTS AN. Er ist Grund, keine Darstellung von Daten.
 */

/**
 * Die Lichtrampe. Zwei Fassungen, weil ein Leuchten auf hellem Papier kein
 * Leuchten ist.
 *
 * DUNKEL: wie in der Vorlage — von tiefem Braun über Olive nach Cream Paper,
 * additiv gezeichnet. Übereinanderliegende Punkte addieren sich zu Licht.
 *
 * HELL: umgekehrt. Der Staub liegt als SCHATTEN auf dem Papier, von Dust
 * Gray über Olive nach Deep Brown, normal gezeichnet. Additiv wäre er auf
 * Cream Paper unsichtbar — man kann Creme nicht heller machen.
 */
/* Mondlicht: aus der Tinte über Moos ins Silber — kaltes Licht von oben. */
const RAMP_DARK = [
  [25, 32, 37], /* Tinte, die Fläche */
  [117, 133, 106], /* Moos — die Brücke */
  [237, 241, 242], /* Nebelweiss */
] as const
/* Mondstein: aus dem Silber über das tiefe Silbergrün in die Tinte. */
const RAMP_LIGHT = [
  [185, 199, 188], /* Silber */
  [94, 116, 112], /* tiefes Silbergrün */
  [27, 37, 35], /* kühle Tinte */
] as const

/** 3,2 s Einflug — der Wert der Vorlage. */
const ENTRANCE_MS = 3200

/** So viele Punkte stehen im Zwischenspeicher, so viele flimmern live. */
const BAKED_DESKTOP = 150_000
const BAKED_PHONE = 70_000
const LIVE = 2600

function gaussian(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function mix(a: readonly number[], b: readonly number[], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Die Farbe eines Punktes aus seiner Höhe im Ring. */
function shade(vertical: number, dark: boolean): string {
  const ramp = dark ? RAMP_DARK : RAMP_LIGHT
  const topGlow = smoothstep(0.55, 1, vertical)
  let col = mix(ramp[0], ramp[1], smoothstep(0, 0.7, vertical))
  col = mix(col, ramp[2], topGlow * 0.9)
  return `rgb(${col[0] | 0} ${col[1] | 0} ${col[2] | 0})`
}

/**
 * Ob der Grund gerade dunkel ist — gelesen aus der Fläche selbst, nicht aus
 * einer Einstellung. Damit stimmt es auch dort, wo ein Bereich sein eigenes
 * Thema setzt, und es ändert sich mit, wenn jemand umschaltet.
 */
function groundIsDark(el: HTMLElement): boolean {
  const value = getComputedStyle(el).getPropertyValue('--plane').trim()
  const probe = document.createElement('span')
  probe.style.color = value
  document.body.appendChild(probe)
  const parts = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g) ?? []
  probe.remove()
  const [r, g, b] = parts.map(Number)
  if (![r, g, b].every((n) => Number.isFinite(n))) return true
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
}

/**
 * Den Ring einmal zeichnen.
 *
 * Geometrie wie in der Vorlage: Winkel gleichverteilt, Radius mit einem
 * gaussisch aufgeweichten Rand nach aussen, Tiefe in z. Die Tiefe geht in
 * Grösse und Helligkeit ein — daher die Räumlichkeit.
 */
function bake(size: number, count: number, dark: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  if (dark) ctx.globalCompositeOperation = 'lighter'

  const centre = size / 2
  const radius = size * 0.29

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const r = 0.95 + Math.abs(gaussian()) * 0.9 * 0.55 + Math.random() * 0.15
    const z = gaussian() * 0.18
    const scale = 0.5 + Math.random() * 1.6

    const perspective = 1000 / (1000 + z * radius)
    const x = Math.cos(theta) * r
    const y = Math.sin(theta) * r
    const px = centre + x * radius * perspective
    const py = centre + y * radius * perspective

    /* Licht von oben: auf dem Canvas zeigt y nach unten. */
    const vertical = Math.min(1, Math.max(0, -y * 0.5 + 0.5))
    const spark = 0.55 + Math.random() * 0.5
    const intensity = (0.3 + 0.7 * vertical) * spark

    /* Auf hellem Grund darf der Staub nicht so dicht werden: dort deckt
       jeder Punkt, statt sich zu addieren. */
    ctx.globalAlpha = Math.min(1, intensity * (dark ? 0.6 : 0.34))
    ctx.fillStyle = shade(vertical, dark)
    const dot = Math.max(0.7, scale * perspective)
    ctx.fillRect(px, py, dot, dot)
  }
  return canvas
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function HaloField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement as HTMLElement
    const still = prefersReducedMotion()
    const dark = groundIsDark(parent)

    const phone = parent.clientWidth < 768
    /* Kantenlänge des Zwischenspeichers: gross genug, dass einzelne Punkte
       beim Skalieren nicht zu Klötzchen werden. */
    const bakedSize = phone ? 1400 : 2000
    const baked = bake(bakedSize, phone ? BAKED_PHONE : BAKED_DESKTOP, dark)

    /* Die live gezeichnete Schicht — nur Position und Startphase. */
    const live = Array.from({ length: LIVE }, () => ({
      theta: Math.random() * Math.PI * 2,
      r: 0.95 + Math.abs(gaussian()) * 0.9 * 0.55,
      seed: Math.random(),
      scale: 0.6 + Math.random() * 1.4,
    }))

    let width = 0
    let height = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }
    resize()

    /* Zeigerparallaxe wie in der Vorlage: ±0,3 rad, Nachlauf 0,04. */
    const target = { x: 0, y: 0 }
    const pointer = { x: 0, y: 0 }
    const onPointer = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth - 0.5) * 0.3
      target.y = (event.clientY / window.innerHeight - 0.5) * 0.3
    }
    if (!still) window.addEventListener('pointermove', onPointer)

    let frame = 0
    let start = 0
    let running = true

    const draw = (now: number) => {
      if (!running) return
      if (!start) start = now
      const elapsed = now - start
      const time = elapsed / 1000
      const progress = still ? 1 : Math.min(1, elapsed / ENTRANCE_MS)
      /* Einflug: von aussen und unscharf herein, mit derselben Kurve wie im
         Shader (1 - (1-t)^4). */
      const entrance = 1 - Math.pow(1 - progress, 4)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      if (dark) ctx.globalCompositeOperation = 'lighter'

      pointer.x += (target.x - pointer.x) * 0.04
      pointer.y += (target.y - pointer.y) * 0.04

      const cx = width / 2 + pointer.x * width * 0.06
      /*
       * Der Mittelpunkt liegt TIEF, deutlich unter der Bildmitte. Dadurch
       * steht der obere Bogen des Rings im oberen Drittel, sein weicher
       * Aussenrand füllt alles darüber mit Staub — und darunter liegt die
       * dunkle Leere, auf der die Überschrift steht. Genau diese Aufteilung
       * macht das Bild der Vorlage aus.
       */
      const cy = height * 0.66 + pointer.y * height * 0.05
      /* Der Ring füllt die Breite: auf dem Telefon ist er höher als breit
         angeschnitten, genau wie in der Vorlage. */
      const reach = Math.max(width, height * 0.9)
      const spin = still ? 0 : time * 0.05
      const breathe = still ? 1 : 1 + 0.015 * Math.sin(time * 0.6)
      const expand = (2.4 + (1 - 2.4) * entrance) * breathe

      /* Der gebackene Ring, gedreht und skaliert. */
      const drawn = reach * 1.6 * expand
      ctx.globalAlpha = entrance
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(spin + (1 - entrance) * 4.5)
      ctx.drawImage(baked, -drawn / 2, -drawn / 2, drawn, drawn)
      ctx.restore()

      /* Die flimmernde Schicht darüber. */
      if (!still) {
        const radius = reach * 0.29 * 1.6 * expand
        for (const p of live) {
          const angle = p.theta + spin
          const wobble = 1 + 0.05 * Math.sin(time * 0.9 + p.seed * 6.28)
          const x = Math.cos(angle) * p.r * wobble
          const y = Math.sin(angle) * p.r * wobble
          const px = cx + x * radius
          const py = cy + y * radius
          if (px < 0 || px > width || py < 0 || py > height) continue
          const vertical = Math.min(1, Math.max(0, -y * 0.5 + 0.5))
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.6 + p.seed * 12.9))
          ctx.globalAlpha = Math.min(
            1,
            (0.25 + 0.75 * vertical) * twinkle * entrance * (dark ? 0.7 : 0.4),
          )
          ctx.fillStyle = shade(vertical, dark)
          const dot = Math.max(0.8, p.scale)
          ctx.fillRect(px, py, dot, dot)
        }
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      if (!still) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    /* Im Hintergrund nicht rechnen: ein Ring, den niemand sieht, kostet Akku. */
    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(frame)
      } else if (!running && !still) {
        running = true
        frame = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{
        /* Die Wolke hinter dem Ring — der Wert der Vorlage. */
        background:
          'radial-gradient(60% 50% at 50% 22%, var(--halo-plume-1), var(--halo-plume-2) 40%, transparent 70%)',
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
