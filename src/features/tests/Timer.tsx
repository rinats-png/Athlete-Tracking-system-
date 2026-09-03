import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDuration } from '@/lib/format'
import { useWakeLock } from '@/lib/useWakeLock'
import { playEndSignal, prepareEndSignal } from '@/lib/endSignal'

/**
 * Countdown für Tests mit fester Dauer.
 *
 * Rechnet gegen die Wanduhr (`Date.now()`), nicht gegen die Zahl der
 * Intervall-Ticks: Browser drosseln Timer im Hintergrund, ein Zähler würde
 * beim Sperren des Telefons nachgehen. Bei einem 12-Minuten-Cooper-Test wäre
 * das ein ungültiger Test.
 *
 * Dazu zwei Dinge, die erst auf dem Telefon zählen: der Bildschirm bleibt
 * während der Messung wach, und das Ende wird hörbar und spürbar gemeldet.
 * Ohne beides läuft man an einem abgeschalteten Telefon vorbei zu weit — und
 * merkt es nicht.
 */
export function Timer({ seconds }: { seconds: number }) {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const endsAt = useRef<number | null>(null)

  // Solange die Uhr läuft, bleibt der Bildschirm an.
  useWakeLock(running)
  // Das Signal darf genau einmal kommen: zwischen dem Erreichen der Null und
  // dem Abräumen des Intervalls kann noch ein weiterer Tick laufen.
  const signalled = useRef(false)

  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (endsAt.current == null) return
      const left = Math.max(0, (endsAt.current - Date.now()) / 1000)
      setRemaining(left)
      if (left <= 0) {
        setRunning(false)
        if (!signalled.current) {
          signalled.current = true
          playEndSignal()
        }
      }
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
    // Muss aus der Berührung heraus geschehen: iOS gibt den Ton sonst nicht
    // frei, und das Ende bliebe stumm.
    prepareEndSignal()
    signalled.current = false
    endsAt.current = Date.now() + remaining * 1000
    setRunning(true)
  }, [remaining])

  const pause = useCallback(() => setRunning(false), [])

  const reset = useCallback(() => {
    setRunning(false)
    signalled.current = false
    endsAt.current = null
    setRemaining(seconds)
  }, [seconds])

  const done = remaining <= 0

  /**
   * Der Ring: der Umfang als Strichmuster, der Rest als Versatz. Damit
   * animiert genau EIN Zahlenwert, und zwar auf der GPU — eine Neuzeichnung
   * des Kreises je Sekunde wäre auf einem älteren Telefon sichtbar ruckelig.
   *
   * Der Ring zeigt die verbleibende Zeit als Anteil, nicht als Fortschritt
   * von null: unter Belastung will man wissen, wie viel noch KOMMT.
   */
  const R = 70
  const CIRC = 2 * Math.PI * R
  const left = seconds > 0 ? Math.max(0, Math.min(1, remaining / seconds)) : 0

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="label-tag">{t('tests.timer')}</span>

      <div className="relative size-[180px]">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90" aria-hidden>
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth="6"
          />
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - left)}
            style={{
              // Ohne Übergang springt der Ring im Takt des Intervalls von
              // 200 ms — mit ihm läuft er durch.
              transition: running ? 'stroke-dashoffset 200ms linear' : 'none',
            }}
          />
        </svg>
        <output
          aria-live="polite"
          className={
            'readout absolute inset-0 flex items-center justify-center text-[46px] leading-none font-bold tabular-nums ' +
            (done ? 'text-accent-text' : '')
          }
        >
          {formatDuration(Math.ceil(remaining))}
        </output>
      </div>
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
