import { useEffect, useRef } from 'react'

/**
 * Die Partikel, aus denen sich der Login zusammensetzt — und in die er
 * wieder zerfällt.
 *
 * DREI ZUSTÄNDE, EIN TEILCHENFELD:
 *
 *   'gather'  Die Punkte stehen als Kugel im Raum (dieselbe Rechnung wie in
 *             `ParticleSphere`) und wandern von dort auf den Umriss der
 *             Anmeldefläche. Aus der Sphäre der App wird ihr Tor.
 *   'hold'    Sie liegen auf dem Umriss und atmen leicht. Der Rahmen ist
 *             gezeichnet, das Formular darüber ist echtes DOM.
 *   'scatter' Sie lösen sich nach aussen auf. Danach läuft die Sequenz.
 *
 * WARUM DER RAHMEN GEZEICHNET IST UND DAS FORMULAR NICHT: Eingabefelder aus
 * Partikeln wären weder bedienbar noch vorlesbar. Die Partikel machen den
 * Übergang, die Fläche darüber bleibt eine gewöhnliche Form — mit Beschriftung,
 * Tastaturbedienung und allem, was ein Anmeldefeld können muss.
 *
 * `prefers-reduced-motion` schaltet die Wanderung ab: die Punkte stehen
 * sofort auf dem Umriss. Wer Bewegung nicht verträgt, bekommt dieselbe
 * Gestalt ohne den Weg dorthin.
 */

export type GatePhase = 'gather' | 'hold' | 'scatter'

const COUNT = 520
/** Sekunden für den Weg von der Kugel auf den Umriss. */
const GATHER_SECONDS = 1.5
/** Sekunden, bis die Auflösung durch ist. */
const SCATTER_SECONDS = 1.1

interface Particle {
  /** Ort auf der Kugel, in Einheitskoordinaten. */
  sx: number
  sy: number
  sz: number
  /** Ziel auf dem Umriss, als Anteil der Fläche (0–1). */
  tx: number
  ty: number
  /** Richtung der Auflösung. */
  dx: number
  dy: number
  size: number
  alpha: number
  bright: boolean
  /** Versatz, damit nicht alle Punkte gleichzeitig ankommen. */
  delay: number
}

/**
 * Ziele auf dem Umriss eines Rechtecks, gleichmässig über den Rand verteilt.
 * An den Ecken sitzen dichter Punkte — dort liest das Auge die Form.
 */
function outlineTarget(i: number, count: number): { x: number; y: number } {
  const t = (i / count) * 4
  const side = Math.floor(t)
  const f = t - side
  // Ecknähe verdichten: die Kurve zieht Punkte zu den Enden jeder Kante.
  const e = f < 0.5 ? 0.5 * Math.pow(2 * f, 1.6) : 1 - 0.5 * Math.pow(2 * (1 - f), 1.6)
  if (side === 0) return { x: e, y: 0 }
  if (side === 1) return { x: 1, y: e }
  if (side === 2) return { x: 1 - e, y: 1 }
  return { x: 0, y: 1 - e }
}

function build(): Particle[] {
  const points: Particle[] = []
  for (let i = 0; i < COUNT; i++) {
    const phi = Math.acos(-1 + (2 * i) / COUNT)
    const theta = Math.sqrt(COUNT * Math.PI) * phi
    const target = outlineTarget(i, COUNT)
    const angle = Math.random() * Math.PI * 2
    points.push({
      sx: Math.cos(theta) * Math.sin(phi),
      sy: Math.sin(theta) * Math.sin(phi),
      sz: Math.cos(phi),
      tx: target.x,
      ty: target.y,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      size: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      bright: Math.random() > 0.4,
      delay: Math.random() * 0.35,
    })
  }
  return points
}

function palette(el: HTMLElement): [string, string] {
  const style = getComputedStyle(el)
  return [style.getPropertyValue('--ink').trim(), style.getPropertyValue('--accent-text').trim()]
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Weiche Beschleunigung und weiches Auslaufen, wie überall im System. */
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export function ParticleGate({
  phase,
  targetRef,
}: {
  phase: GatePhase
  /** Die Fläche, deren Umriss die Punkte bilden. */
  targetRef: React.RefObject<HTMLElement | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Die Phase liegt in einem Ref, damit ein Wechsel die Schleife nicht neu
  // startet — sonst spränge das Feld beim Absenden zurück auf die Kugel.
  const phaseRef = useRef(phase)
  const phaseStart = useRef<number>(0)

  useEffect(() => {
    phaseRef.current = phase
    phaseStart.current = 0
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const host = canvas.parentElement as HTMLElement
    const points = build()
    const still = prefersReducedMotion()
    const [brightColor, quietColor] = palette(host)

    let width = 0
    let height = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      width = host.clientWidth
      height = host.clientHeight
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }
    resize()

    let frame = 0
    let rotation = 0
    let running = true

    const draw = (now: number) => {
      if (!running) return
      if (!phaseStart.current) phaseStart.current = now
      const time = (now - phaseStart.current) / 1000
      const current = phaseRef.current

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      /*
       * Der Umriss wird bei JEDEM Bild neu gemessen, nicht einmal am Anfang:
       * die Fläche wächst, während jemand zwischen Anmelden und Registrieren
       * wechselt, und ein eingefrorener Umriss läge dann daneben.
       */
      const box = targetRef.current?.getBoundingClientRect()
      const hostBox = host.getBoundingClientRect()
      const left = box ? box.left - hostBox.left : width * 0.25
      const top = box ? box.top - hostBox.top : height * 0.3
      const boxWidth = box ? box.width : width * 0.5
      const boxHeight = box ? box.height : height * 0.4

      // Wie weit ist die Wanderung? 0 = Kugel, 1 = Umriss.
      const settled =
        still || current !== 'gather' ? 1 : Math.min(1, time / GATHER_SECONDS)
      const away = current === 'scatter' ? Math.min(1, time / SCATTER_SECONDS) : 0
      if (!still && current === 'gather') rotation += 0.006 * (1 - settled)

      const radius = Math.min(width, height) * 0.3

      for (const p of points) {
        // Eigener Fortschritt je Punkt: das Feld kommt gestaffelt an, statt
        // wie eine Wand.
        const own = Math.max(0, Math.min(1, (settled - p.delay) / (1 - p.delay)))
        const eased = easeInOut(own)

        const rx = p.sx * Math.cos(rotation) - p.sz * Math.sin(rotation)
        const rz = p.sx * Math.sin(rotation) + p.sz * Math.cos(rotation)
        const perspective = 1000 / (1000 + rz * radius)
        const sphereX = width / 2 + rx * radius * perspective
        const sphereY = height / 2 + p.sy * radius * perspective

        const outlineX = left + p.tx * boxWidth
        const outlineY = top + p.ty * boxHeight

        let x = sphereX + (outlineX - sphereX) * eased
        let y = sphereY + (outlineY - sphereY) * eased

        // Auf dem Umriss atmet das Feld leicht — sonst wirkt es gedruckt.
        if (eased > 0.99 && !still && current !== 'scatter') {
          const breath = Math.sin(time * 1.6 + p.delay * 20) * 1.2
          x += p.dx * breath
          y += p.dy * breath
        }

        let alpha = p.alpha * (0.35 + 0.65 * eased)
        if (away > 0) {
          const flight = easeInOut(away)
          x += p.dx * flight * Math.max(width, height) * 0.55
          y += p.dy * flight * Math.max(width, height) * 0.55
          alpha *= 1 - flight
        }
        if (alpha <= 0.01) continue

        ctx.beginPath()
        ctx.arc(x, y, p.size * (eased > 0.5 ? 1 : perspective), 0, Math.PI * 2)
        ctx.fillStyle = p.bright ? brightColor : quietColor
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.fill()
      }
      ctx.globalAlpha = 1
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [targetRef])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
