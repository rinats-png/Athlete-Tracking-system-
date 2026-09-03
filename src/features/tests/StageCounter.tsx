import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * Der Stufenzähler für Stufentests (Konzept §13).
 *
 * WAS ER BEHEBT: Beep-Test, Yo-Yo und die anderen Stufentests waren als
 * «Schritt für Schritt begleitet» angekündigt, boten aber nur ein Zahlenfeld
 * für die Endstufe. Wer allein testet, muss dann im Kopf mitzählen und sich
 * die Zahl bis nach dem Test merken — genau dann, wenn er ausbelastet ist.
 *
 * WAS ER NICHT IST: kein Tonsignal und kein Taktgeber. Die Signaltöne kommen
 * aus der Aufnahme des jeweiligen Protokolls; ein selbstgebauter Takt wäre
 * eine andere Belastung unter demselben Namen und machte den Wert
 * unvergleichbar. Der Zähler zählt mit, mehr behauptet er nicht.
 */
export function StageCounter({
  value,
  step,
  min,
  max,
  onChange,
  label,
}: {
  value: number | null
  step: number
  min: number
  max: number
  onChange: (next: number) => void
  label: string
}) {
  const { t } = useTranslation()
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const started = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      if (started.current != null) setSeconds(Math.floor((Date.now() - started.current) / 1000))
    }, 500)
    return () => window.clearInterval(id)
  }, [running])

  const current = value ?? min
  const bump = (delta: number) => {
    if (!running) {
      started.current = Date.now()
      setRunning(true)
    }
    const next = Math.min(max, Math.max(min, Math.round((current + delta) / step) * step))
    onChange(Number(next.toFixed(2)))
  }

  const reset = () => {
    setRunning(false)
    setSeconds(0)
    started.current = null
    onChange(min)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="border-t border-line px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="label-tag">{label}</span>
        <span className="readout tabular-nums text-[13px] text-ink-muted" aria-live="off">
          {mm}:{ss}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          aria-label={t('stages.down')}
          onClick={() => bump(-step)}
          disabled={current <= min}
        >
          <Minus size={16} aria-hidden />
        </Button>
        <output className="readout min-w-16 text-center text-[28px] tabular-nums">
          {value == null ? '—' : value}
        </output>
        <Button variant="outline" size="sm" aria-label={t('stages.up')} onClick={() => bump(step)}>
          <Plus size={16} aria-hidden />
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
          <RotateCcw size={14} aria-hidden />
          {t('stages.reset')}
        </Button>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{t('stages.hint')}</p>
    </div>
  )
}
