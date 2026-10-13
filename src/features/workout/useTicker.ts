import { useEffect, useState } from 'react'

/**
 * Die aktuelle Zeit, neu gesetzt alle `ms` Millisekunden, solange `active`.
 * Nur Anzeige: was die Uhr zeigt, rechnet der Uhrenmotor aus Start und Pausen
 * (`domain/workoutClock.ts`), nie aus der Zahl der Ticks.
 */
export function useTicker(active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return now
}
