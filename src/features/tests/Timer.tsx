import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDuration } from '@/lib/format'

/**
 * Countdown für Tests mit fester Dauer.
 *
 * Rechnet gegen die Wanduhr (`Date.now()`), nicht gegen die Zahl der
 * Intervall-Ticks: Browser drosseln Timer im Hintergrund, ein Zähler würde
 * beim Sperren des Telefons nachgehen. Bei einem 12-Minuten-Cooper-Test wäre
 * das ein ungültiger Test.
 */
export function Timer({ seconds }: { seconds: number }) {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const endsAt = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (endsAt.current == null) return
      const left = Math.max(0, (endsAt.current - Date.now()) / 1000)
      setRemaining(left)
      if (left <= 0) setRunning(false)
    }
    tick()
    const id = window.setInterval(tick, 200)
    // Nach Rückkehr aus dem Hintergrund sofort nachziehen statt bis zum
    // nächsten Intervall zu warten.
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [running])

  const start = useCallback(() => {
    endsAt.current = Date.now() + remaining * 1000
    setRunning(true)
  }, [remaining])

  const pause = useCallback(() => setRunning(false), [])

  const reset = useCallback(() => {
    setRunning(false)
    endsAt.current = null
    setRemaining(seconds)
  }, [seconds])

  const done = remaining <= 0

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="label-tag">{t('tests.timer')}</span>
      <output
        aria-live="polite"
        className={
          'readout text-[52px] leading-none font-medium tabular-nums ' +
          (done ? 'text-accent-text' : '')
        }
      >
        {formatDuration(Math.ceil(remaining))}
      </output>
      <div className="flex gap-2">
        {running ? (
          <Button variant="outline" size="sm" onClick={pause}>
            <Pause size={14} aria-hidden />
            {t('tests.pause')}
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={start} disabled={done}>
            <Play size={14} aria-hidden />
            {t('tests.start')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw size={14} aria-hidden />
          {t('tests.reset')}
        </Button>
      </div>
    </div>
  )
}
