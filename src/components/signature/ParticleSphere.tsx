import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Die rotierende Partikelsphäre aus der Vorlage.
 *
 * 600 Punkte auf einer Fibonacci-Kugel, um die Y-Achse gedreht, nach Tiefe
 * sortiert und perspektivisch verkleinert — die Rechnung der Vorlage, Zeile
 * für Zeile. Sie wächst beim Erscheinen von einem Fünftel auf ihre volle
 * Grösse.
 *
 * Sie steht dort, wo vorher die Körperfigur stand. Eine gezeichnete Person
 * behauptet einen Körper, der nicht der des Betrachters ist; eine Kugel aus
 * Messpunkten behauptet nichts.
 */
const COUNT = 600

interface Point {
  x: number
  y: number
  z: number
  size: number
  alpha: number
  bright: boolean
}

function build(): Point[] {
  const points: Point[] = []
  for (let i = 0; i < COUNT; i++) {
    const phi = Math.acos(-1 + (2 * i) / COUNT)
    const theta = Math.sqrt(COUNT * Math.PI) * phi
    points.push({
      x: Math.cos(theta) * Math.sin(phi),
      y: Math.sin(theta) * Math.sin(phi),
      z: Math.cos(phi),
      size: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      /* Mist White und Moss Shadow im Verhältnis der Vorlage. */
      bright: Math.random() > 0.4,
    })
  }
  return points
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ParticleSphere({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement as HTMLElement
    const points = build()
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

    let frame = 0
    let start = 0
    let rotation = 0
    let running = true

    const draw = (now: number) => {
      if (!running) return
      if (!start) start = now
      const time = (now - start) / 1000
      /* Wachsen in gut einer Sekunde, danach ganz langsam weiter. */
      const grow = still ? 1 : Math.min(1, time / 1.1)
      const scale = 0.2 + grow * 0.8 + (still ? 0 : Math.max(0, time - 1.1) * 0.02)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      if (!still) rotation += 0.006 * (1 + (1 - grow) * 0.5)

      const radius = Math.min(width, height) * 0.35 * scale
      ctx.save()
      ctx.translate(width / 2, height / 2)
      const sorted = points
        .map((p) => ({
          p,
          rx: p.x * Math.cos(rotation) - p.z * Math.sin(rotation),
          rz: p.x * Math.sin(rotation) + p.z * Math.cos(rotation),
        }))
        .sort((a, b) => a.rz - b.rz)
      for (const { p, rx, rz } of sorted) {
        const perspective = 1000 / (1000 + rz * radius)
        ctx.beginPath()
        ctx.arc(rx * radius * perspective, p.y * radius * perspective, p.size * perspective, 0, Math.PI * 2)
        ctx.fillStyle = p.bright ? '#EEF1EA' : '#3F4B3A'
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * grow * perspective))
        ctx.fill()
      }
      ctx.restore()
      ctx.globalAlpha = 1
      if (!still) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return (
    <div aria-hidden className={cn('relative', className)}>
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  )
}
