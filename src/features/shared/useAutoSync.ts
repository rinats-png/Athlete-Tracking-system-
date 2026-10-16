import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppData } from '@/lib/store/AppDataProvider'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { hasStoredSession } from '@/lib/supabase/session'
import { onSyncPreferenceChange, syncEnabled } from '@/lib/supabase/syncPreference'
import { readSyncState } from '@/lib/supabase/syncState'

/**
 * Der automatische Abgleich.
 *
 * KYDON braucht ein Konto, und mit dem Konto gleicht das Gerät von selbst ab:
 * kurz nach dem Start, einige Sekunden nach jeder Änderung, sobald das Netz
 * zurück ist und wenn die App nach einer Weile wieder in den Vordergrund
 * kommt. Gemessen wird trotzdem zuerst auf dem Gerät — der Abgleich läuft
 * hinterher und hält niemanden auf (Regel 3: Messen geht ohne Netz).
 *
 * WAS NICHT ABGEGLICHEN WIRD: die Demo (Beispieldaten gehören in kein Konto)
 * und alles, solange der Abgleich im Profil ausgeschaltet ist.
 *
 * Der Abgleich selbst (`lib/supabase/sync`) wird erst beim ersten Lauf
 * nachgeladen; das Startpaket trägt nur diese Steuerung.
 *
 * Zurück kommt, was der Mensch wissen muss — und nur das. Ein fehlendes Netz
 * ist kein Hinweis wert, es ist der Normalfall in der Halle.
 */
export type SyncAttention = null | 'signedOut' | 'conflict' | 'otherAccount'

const START_DELAY_MS = 2_000
const AFTER_CHANGE_MS = 12_000
const REVISIT_MS = 5 * 60_000

export function useAutoSync(): SyncAttention {
  const { mode, store, mergeAthletes, mergeSeriesRows, replacePool, dropAthletes } = useAppData()
  const [enabled, setEnabled] = useState(syncEnabled)
  const [attention, setAttention] = useState<SyncAttention>(() =>
    readSyncState().conflicts.length > 0 ? 'conflict' : null,
  )

  // Immer der jüngste Stand, ohne den Zeitplan bei jedem Bestand neu zu bauen.
  const latest = useRef({ store, mergeAthletes, mergeSeriesRows, replacePool, dropAthletes })
  latest.current = { store, mergeAthletes, mergeSeriesRows, replacePool, dropAthletes }

  const running = useRef(false)
  const again = useRef(false)
  const timer = useRef<number | null>(null)
  const lastRun = useRef(0)
  const first = useRef(true)

  useEffect(() => onSyncPreferenceChange(() => setEnabled(syncEnabled())), [])

  const active = enabled && mode !== 'demo' && isSupabaseConfigured() && hasStoredSession()

  const run = useCallback(async () => {
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    try {
      const { syncOnce } = await import('@/lib/supabase/sync')
      const l = latest.current
      const report = await syncOnce(l.store, l.mergeAthletes, l.mergeSeriesRows, l.replacePool, l.dropAthletes)
      lastRun.current = Date.now()
      if (report.reason === 'not_signed_in') setAttention('signedOut')
      else if (report.reason === 'other_account') setAttention('otherAccount')
      else if (report.ok) setAttention(report.conflicts.length > 0 ? 'conflict' : null)
      // offline / unknown: still weiterarbeiten, beim nächsten Anlass erneut.
    } catch {
      /* Ein Fehler im Abgleich darf die App nicht stören. */
    } finally {
      running.current = false
      if (again.current) {
        again.current = false
        schedule(AFTER_CHANGE_MS)
      }
    }
    // `schedule` ist unten definiert und stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const schedule = useCallback(
    (ms: number) => {
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = null
        void run()
      }, ms)
    },
    [run],
  )

  // Jede Änderung am Bestand: abgleichen, wenn es eine Weile ruhig war.
  useEffect(() => {
    if (!active) return
    schedule(first.current ? START_DELAY_MS : AFTER_CHANGE_MS)
    first.current = false
  }, [active, store, schedule])

  // Netz zurück, oder die App kommt nach einer Weile wieder nach vorn.
  useEffect(() => {
    if (!active) return
    const online = () => schedule(1_000)
    const visible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRun.current > REVISIT_MS) schedule(1_000)
    }
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [active, schedule])

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    },
    [],
  )

  return active ? attention : null
}
