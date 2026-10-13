import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, X } from 'lucide-react'
import { bodyVisible, patternAngle, startReps, stepReps, velocityLossPercent, type Landmark, type RepPattern, type RepState } from '@/domain/repCounter'
import { loadPoseDetector, type PoseDetector } from '@/lib/pose'
import { useWakeLock } from '@/lib/useWakeLock'
import { cueCount, unlockCues } from '@/lib/workoutCues'
import { cn } from '@/lib/utils'

/**
 * Kamera zählt mit (Mockups «Vorher: aufstellen und prüfen», «Die Kamera
 * zählt mit»).
 *
 * Ablauf: Kamera freigeben → drei Haken (ganzer Körper sichtbar, genug Licht,
 * Telefon steht still) → zählen. Die Zahl ist ein Vorschlag: −1/+1 korrigiert
 * sie, «Satz fertig» übernimmt sie ins Satz-Log. Der Mensch entscheidet.
 *
 * Kein Bild wird gespeichert oder verschickt (`lib/pose.ts`). Das Video wird
 * gespiegelt angezeigt; gerechnet wird auf dem Original.
 *
 * Tempo: je Wiederholung relativ (Grad/s im Hochweg), als Balken und als
 * Tempoverlust im Satz. Kein Vergleich zwischen Tagen, keine Last-Empfehlung.
 */

type Stage = 'loading' | 'denied' | 'unsupported' | 'setup' | 'counting'

/** So lange müssen alle Haken grün sein, bevor die Zählung startet (ms). */
const READY_MS = 1500
/** Mittlere Helligkeit, unter der das Licht nicht reicht (0..255). */
const MIN_BRIGHTNESS = 45
/** Bewegung des Hüftmittelpunkts je Bild, über der das Telefon nicht still steht. */
const MAX_JITTER = 0.02

export default function CameraCounter({ pattern, name, target, onSet, onClose }: {
  pattern: RepPattern
  name: string
  target: number | null
  onSet: (reps: number) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [checks, setChecks] = useState({ body: false, light: false, still: false })
  const [reps, setReps] = useState<RepState>(startReps)
  const [adjust, setAdjust] = useState(0)
  const stageRef = useRef<Stage>('loading')
  stageRef.current = stage
  useWakeLock(stage === 'setup' || stage === 'counting')

  useEffect(() => {
    let stream: MediaStream | null = null
    let detector: PoseDetector | null = null
    let raf = 0
    let stopped = false
    let readySince: number | null = null
    let lastHip: { x: number; y: number } | null = null
    let state = startReps()
    const sampler = document.createElement('canvas')
    sampler.width = 32
    sampler.height = 24

    const brightness = (v: HTMLVideoElement) => {
      const ctx = sampler.getContext('2d', { willReadFrequently: true })
      if (!ctx) return 255
      ctx.drawImage(v, 0, 0, 32, 24)
      const d = ctx.getImageData(0, 0, 32, 24).data
      let sum = 0
      for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3
      return sum / (d.length / 4)
    }

    const draw = (lm: Landmark[] | null) => {
      const c = canvas.current
      const v = video.current
      if (!c || !v) return
      c.width = v.clientWidth
      c.height = v.clientHeight
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, c.width, c.height)
      if (!lm) return
      // Gleiches Seitenverhältnis wie object-cover; gespiegelt wie das Video.
      const vw = v.videoWidth || 1
      const vh = v.videoHeight || 1
      const scale = Math.max(c.width / vw, c.height / vh)
      const ox = (c.width - vw * scale) / 2
      const oy = (c.height - vh * scale) / 2
      const px = (p: Landmark) => [c.width - (ox + p.x * vw * scale), oy + p.y * vh * scale] as const
      ctx.strokeStyle = '#7FE5B5'
      ctx.fillStyle = '#7FE5B5'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      for (const [a, b] of BONES) {
        const pa = lm[a]
        const pb = lm[b]
        if (!pa || !pb || (pa.visibility ?? 1) < 0.5 || (pb.visibility ?? 1) < 0.5) continue
        ctx.beginPath()
        ctx.moveTo(...px(pa))
        ctx.lineTo(...px(pb))
        ctx.stroke()
      }
    }

    const loop = () => {
      if (stopped) return
      const v = video.current
      if (v && detector && v.readyState >= 2) {
        const now = performance.now()
        let lm: Landmark[] | null = null
        try {
          lm = detector.detect(v, now)
        } catch {
          lm = null
        }
        draw(lm)
        if (stageRef.current === 'setup') {
          const hip = lm?.[23] && lm?.[24] ? { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 } : null
          const still = hip != null && lastHip != null && Math.hypot(hip.x - lastHip.x, hip.y - lastHip.y) < MAX_JITTER
          lastHip = hip
          const next = { body: bodyVisible(pattern, lm), light: brightness(v) >= MIN_BRIGHTNESS, still }
          setChecks((c) => (c.body === next.body && c.light === next.light && c.still === next.still ? c : next))
          if (next.body && next.light && next.still) {
            readySince ??= now
            if (now - readySince >= READY_MS) {
              cueCount()
              setStage('counting')
            }
          } else readySince = null
        } else if (stageRef.current === 'counting') {
          const before = state.reps.length
          state = stepReps(state, now / 1000, lm ? patternAngle(pattern, lm) : null)
          if (state.reps.length !== before) {
            cueCount()
            setReps(state)
          }
        }
      }
      raf = requestAnimationFrame(loop)
    }

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStage('unsupported')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      } catch {
        if (!stopped) setStage('denied')
        return
      }
      if (stopped) {
        stream.getTracks().forEach((tr) => tr.stop())
        return
      }
      if (video.current) {
        video.current.srcObject = stream
        await video.current.play().catch(() => {})
      }
      try {
        detector = await loadPoseDetector()
      } catch {
        if (!stopped) setStage('unsupported')
        return
      }
      if (stopped) return
      setStage('setup')
      raf = requestAnimationFrame(loop)
    })()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [pattern])

  const count = Math.max(0, reps.reps.length + adjust)
  const loss = velocityLossPercent(reps.reps)
  const maxSpeed = Math.max(1, ...reps.reps.map((r) => r.speed))
  const bars = Math.max(target ?? 0, reps.reps.length, 1)

  return (
    <div role="dialog" aria-modal="true" aria-label={t('workout.camera.title')} data-testid="camera-counter" className="fixed inset-0 z-[60] flex flex-col bg-[#0B100E] text-[#E9EFEB]">
      <video ref={video} playsInline muted className={cn('absolute inset-0 size-full -scale-x-100 object-cover', stage === 'counting' ? 'brightness-[.6]' : 'brightness-[.65] saturate-50')} />
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" aria-hidden />

      <div className="relative flex items-center justify-between gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label={t('workout.camera.close')} className="grid size-11 place-items-center rounded-full bg-black/50"><X size={20} aria-hidden /></button>
        <span className="rounded-pill bg-black/60 px-3 py-1.5 text-[12px] text-[#A9B7B0]">{t('workout.camera.onDevice')}</span>
      </div>

      {stage === 'loading' && (
        <div className="relative m-auto flex flex-col items-center gap-3 px-6 text-center">
          <Loader2 size={28} className="animate-spin" aria-hidden />
          <p className="text-[15px]">{t('workout.camera.loading')}</p>
        </div>
      )}
      {(stage === 'denied' || stage === 'unsupported') && (
        <div className="relative m-auto max-w-sm px-6 text-center" data-testid="camera-unavailable">
          <p className="text-[16px] font-semibold">{t(stage === 'denied' ? 'workout.camera.denied' : 'workout.camera.unsupported')}</p>
          <p className="mt-2 text-[14px] text-[#A9B7B0]">{t('workout.camera.fallback')}</p>
          <button type="button" onClick={onClose} className="mt-4 min-h-12 rounded-pill bg-[#7FE5B5] px-6 font-semibold text-[#08231A]">{t('workout.camera.back')}</button>
        </div>
      )}

      {stage === 'setup' && (
        <div className="relative mt-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]" data-testid="camera-setup">
          <p className="font-display text-[30px] leading-none font-bold">{t('workout.camera.setupTitle')}</p>
          <p className="mt-1 text-[14px] text-[#A9B7B0]">{t(`workout.camera.hint.${pattern}`, { name })}</p>
          <ul className="mt-3 grid gap-2 text-[15px]">
            {(['body', 'light', 'still'] as const).map((k) => (
              <li key={k} className="flex min-h-12 items-center justify-between rounded-xl border border-[#222D29] bg-[#141B18]/90 px-4" data-testid={`camera-check-${k}`} data-ok={checks[k]}>
                <span>{t(`workout.camera.check.${k}`)}</span>
                {checks[k] ? <Check size={18} className="text-[#7FE5B5]" aria-label={t('workout.camera.ok')} /> : <span className="text-[#F2C46D]" aria-label={t('workout.camera.waiting')}>…</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-[#A9B7B0]">{t('workout.camera.privacy')}</p>
        </div>
      )}

      {stage === 'counting' && (
        <>
          <div className="pointer-events-none absolute top-24 right-5 text-right">
            <p className="readout font-display text-[clamp(110px,36vw,160px)] leading-none font-bold drop-shadow-[0_4px_24px_rgba(0,0,0,.6)]" data-testid="camera-count" aria-live="polite">{count}</p>
            {target != null && <p className="label-tag !text-[#E9EFEB]">{t('workout.camera.ofTarget', { target })}</p>}
          </div>
          <div className="relative mt-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="rounded-2xl bg-[#0B100E]/90 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="label-tag !text-[#A9B7B0]">{t('workout.camera.tempo')}</span>
                <span className="label-tag !text-[#F2C46D]">{t('workout.camera.estimate')}</span>
              </div>
              <div className="mt-2 flex h-16 items-end gap-1.5" aria-hidden>
                {Array.from({ length: bars }, (_, i) => reps.reps[i]).map((r, i) =>
                  r ? <span key={i} className="flex-1 rounded-t-md rounded-b-sm bg-[#7FE5B5]" style={{ height: `${Math.max(12, (r.speed / maxSpeed) * 100)}%` }} /> : <span key={i} className="h-full flex-1 rounded-t-md rounded-b-sm border-2 border-dashed border-[#222D29]" />,
                )}
              </div>
              <p className="mt-2 text-[13px] text-[#A9B7B0]" data-testid="camera-loss">{loss != null ? t('workout.camera.loss', { percent: loss }) : t('workout.camera.lossNone')}</p>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setAdjust((a) => a - 1)} disabled={count === 0} className="min-h-16 rounded-pill border border-[#222D29] bg-black/60 text-[16px] font-semibold disabled:opacity-40">−1</button>
                <button type="button" onClick={() => setAdjust((a) => a + 1)} className="min-h-16 rounded-pill border border-[#222D29] bg-black/60 text-[16px] font-semibold">+1</button>
              </div>
              <button type="button" onClick={() => { unlockCues(); onSet(count) }} disabled={count === 0} data-testid="camera-done" className="flex min-h-16 items-center justify-center gap-2 rounded-pill bg-[#7FE5B5] text-[17px] font-semibold text-[#08231A] disabled:opacity-50">
                <Check size={20} aria-hidden />{t('workout.focus.done')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Verbindungen des Skeletts (MediaPipe-Indizes), nur zur Anzeige. */
const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
]
