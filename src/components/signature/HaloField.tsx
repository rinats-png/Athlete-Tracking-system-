import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Der Halo — der leuchtende Partikelring aus der Vorlage.
 *
 * WARUM NICHT DIE VORLAGE 1:1: die trägt 160 000 GPU-Partikel über Three.js
 * von einem CDN. Drei Gründe sprechen dagegen, und keiner davon ist Aufwand:
 * eine Fremdabhängigkeit von rund 600 kB gegen ein Bündelbudget von 850 kB;
 * eine Quelle, die unsere CSP (`connect-src 'self'`) nicht erlaubt und die
 * offline gar nicht da wäre; und eine Dauerlast auf der GPU eines Telefons,
 * das in der Halle gerade eine Messung mitschreiben soll.
 *
 * Nachgebaut ist deshalb die FORM, nicht die Technik: dieselbe Geometrie
 * (Ring mit gaussisch aufgeweichtem Rand, Tiefe in z), dieselbe Lichtrampe
 * von unten nach oben, derselbe gestaffelte Einflug über 3,2 s, dieselbe
 * Zeigerparallaxe — auf einem 2D-Canvas mit additivem Zeichnen und ein paar
 * tausend Punkten. Auf Armlänge ist der Unterschied das Rauschen im Rand.
 *
 * Der Ring zeigt NICHTS AN. Er ist Grund, keine Darstellung von Daten —
 * deshalb steht hier auch keine Zahl aus dem Bestand drin.
 */

/** Die Lichtrampe der Vorlage, aus dem Vertex-Shader übernommen. */
const DEEP_MOSS = [26, 38, 23] as const /* vec3(0.10, 0.15, 0.09) */
const MID_GREEN = [82, 112, 74] as const /* vec3(0.32, 0.44, 0.29) */
const HOT_MIST = [237, 245, 230] as const /* vec3(0.93, 0.96, 0.90) */

/** 3,2 s Einflug — der Wert der Vorlage. */
const ENTRANCE_MS = 3200

interface Particle {
  theta: number
  r: number
  z: number
  scale: number
  seed: number
}

/** Box–Muller, wie in der Vorlage. */
function gaussian(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function build(count: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      theta: Math.random() * Math.PI * 2,
      r: 0.95 + Math.abs(gaussian()) * 0.9 * 0.35 + Math.random() * 0.12,
      z: gaussian() * 0.18,
      scale: 0.5 + Math.random() * 1.6,
      seed: Math.random(),
    })
  }
  return out
}

function mix(a: readonly number[], b: readonly number[], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
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
    /*
     * Die Vorlage zeichnet 160 000 Punkte auf der GPU. Auf einem 2D-Canvas
     * sind so viele nicht drin — aber unter etwa zwanzigtausend zerfällt der
     * Ring in ein Sternenfeld: es fehlt die Dichte, aus der das Leuchten
     * überhaupt erst entsteht. Diese Zahlen sind gemessen, nicht geraten.
     */
    const count = parent.clientWidth < 768 ? 14000 : 30000
    const particles = build(count)
    const still = prefersReducedMotion()

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

    /* Zeigerparallaxe: dieselben Werte wie in der Vorlage (±0,3 rad, lerp 0,04). */
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

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      /* Additiv: übereinanderliegende Punkte addieren sich zu Licht — genau
         das macht aus vielen schwachen Punkten einen glühenden Rand. */
      ctx.globalCompositeOperation = 'lighter'

      pointer.x += (target.x - pointer.x) * 0.04
      pointer.y += (target.y - pointer.y) * 0.04

      const cx = width / 2
      const cy = height * 0.46
      const radius = Math.min(width, height) * 0.38
      const spin = still ? 0 : time * 0.05

      for (const p of particles) {
        /* Gestaffelter Einflug, wie im Shader. */
        const lp = Math.min(1, Math.max(0, (progress - p.seed * 0.45) / 0.55))
        const entrance = 1 - Math.pow(1 - lp, 4)
        if (entrance <= 0) continue

        const expand = 2.4 + (1 - 2.4) * entrance
        const swirl = (1 - entrance) * 4.5
        const breathe = still ? 1 : 1 + 0.015 * Math.sin(time * 0.6 + p.seed * 6.28)
        /* Statt Simplex-Rauschen ein billiger Drift je Punkt: auf einem
           2D-Canvas ist echtes 3D-Rauschen je Punkt und Bild zu teuer, und
           sichtbar ist ohnehin nur, DASS der Rand lebt. */
        const drift = still ? 0 : 0.05 * Math.sin(time * 0.18 + p.seed * 6.28)

        const angle = p.theta + spin + swirl + pointer.x * 0.6
        const r = (p.r + drift) * expand * breathe
        const x = Math.cos(angle) * r
        const y = Math.sin(angle) * r
        const z = p.z + (1 - entrance) * 3.4

        /* Perspektive wie in der Vorlage: 1000 / (1000 + z·radius). */
        const perspective = 1000 / (1000 + z * radius)
        const px = cx + x * radius * perspective
        const py = cy + (y + pointer.y * 0.35) * radius * perspective
        if (px < -8 || px > width + 8 || py < -8 || py > height + 8) continue

        /* Licht von unten nach oben — auf dem Canvas ist y nach unten
           positiv, deshalb das Vorzeichen. */
        const vertical = Math.min(1, Math.max(0, -y * 0.5 + 0.5))
        const topGlow = smoothstep(0.55, 1, vertical)
        let col = mix(DEEP_MOSS, MID_GREEN, smoothstep(0, 0.7, vertical))
        col = mix(col, HOT_MIST, topGlow * 0.9)
        const spark = 0.6 + 0.4 * Math.sin(p.seed * 40 + time * 0.4)
        const intensity = (0.35 + 0.65 * vertical) * spark * entrance

        /* Kleine Punkte: ab etwa zwei Pixeln liest das Auge Klötzchen. */
        const size = Math.max(0.6, p.scale * perspective * 0.9)
        ctx.globalAlpha = Math.min(1, intensity * 0.62)
        ctx.fillStyle = `rgb(${col[0] | 0} ${col[1] | 0} ${col[2] | 0})`
        ctx.fillRect(px, py, size, size)
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      /* Ohne Bewegung genügt ein einziges Bild. */
      if (!still) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    /* Im Hintergrund nicht rechnen: ein Ring, den niemand sieht, kostet nur Akku. */
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
          'radial-gradient(60% 50% at 50% 22%, rgba(117,133,106,0.18), rgba(63,75,58,0.05) 40%, transparent 70%)',
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
