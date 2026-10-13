import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calibrate, startOnsets, stepOnsets, type OnsetState } from '@/domain/punchCounter'

/**
 * Schläge je Runde per Mikrofon (Vorschau, `domain/punchCounter.ts`).
 *
 * Erst eine Probe: zehn Schläge, daraus die Schwelle. Dann zählt der Pegel
 * während der Arbeitsphasen mit; je Runde eine Zahl. Kein Ton wird
 * aufgenommen oder gespeichert, nur der Pegel je Bild gerechnet.
 * Steht als «Schätzung»; geht in kein Urteil und keinen Bericht.
 */
type Stage = 'off' | 'calibrating' | 'on' | 'denied'

export function PunchCounter({ running, round, counts, onCount }: { running: boolean; round: number; counts: number[]; onCount: (round: number, n: number) => void }) {
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('off')
  const [probe, setProbe] = useState(0)
  const [live, setLive] = useState(counts[round] ?? 0)
  const refs = useRef({ running, round, state: null as OnsetState | null, onCount, base: counts[round] ?? 0 })
  refs.current.running = running
  refs.current.onCount = onCount

  useEffect(() => {
    if (refs.current.round !== round) {
      refs.current.round = round
      refs.current.base = counts[round] ?? 0
      if (refs.current.state) refs.current.state = startOnsets(refs.current.state.threshold)
      setLive(refs.current.base)
    }
  }, [round, counts])

  useEffect(() => {
    if (stage !== 'calibrating' && stage !== 'on') return
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let raf = 0
    let stopped = false
    const peaks: number[] = []
    let noise = 0
    let noiseN = 0
    let lastPeak = 0
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false })
      } catch {
        if (!stopped) setStage('denied')
        return
      }
      ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 512
      src.connect(an)
      const buf = new Float32Array(an.fftSize)
      const loop = () => {
        if (stopped) return
        an.getFloatTimeDomainData(buf)
        let sum = 0
        for (const v of buf) sum += v * v
        const level = Math.sqrt(sum / buf.length)
        const tS = performance.now() / 1000
        if (stage === 'calibrating') {
          noiseN++
          noise += (level - noise) / noiseN
          if (level > noise * 3 && level > 0.02 && tS - lastPeak > 0.15) {
            lastPeak = tS
            peaks.push(level)
            setProbe(peaks.length)
            if (peaks.length >= 10) {
              const th = calibrate(peaks, noise)
              if (th != null) {
                refs.current.state = startOnsets(th)
                setStage('on')
                return
              }
            }
          }
        } else if (refs.current.state && refs.current.running) {
          const before = refs.current.state.count
          refs.current.state = stepOnsets(refs.current.state, tS, level)
          if (refs.current.state.count !== before) {
            const n = refs.current.base + refs.current.state.count
            setLive(n)
            refs.current.onCount(refs.current.round, n)
          }
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((tr) => tr.stop())
      void ctx?.close().catch(() => {})
    }
  }, [stage])

  if (stage === 'off')
    return (
      <button type="button" onClick={() => setStage('calibrating')} data-testid="punch-enable" className="col-span-2 min-h-12 rounded-2xl border border-dashed border-white/25 text-[14px]">
        {t('workout.punch.enable')}
      </button>
    )
  return (
    <div className="col-span-2 rounded-2xl bg-white/10 px-4 py-3 text-left" data-testid="punch-counter">
      <p className="label-tag !text-[#CDB98A]">{t('workout.punch.title')}</p>
      {stage === 'denied' && <p className="mt-1 text-[14px]">{t('workout.punch.denied')}</p>}
      {stage === 'calibrating' && <p className="mt-1 text-[14px]">{t('workout.punch.calibrate', { n: probe })}</p>}
      {stage === 'on' && <p className="readout font-display text-[36px] leading-none font-bold">{live}</p>}
      <p className="mt-0.5 text-[11px] text-[#CDB98A]">{t('workout.punch.estimate')}</p>
    </div>
  )
}
