import { useEffect, useState } from 'react'
import { AthleteDashboard } from '@/features/dashboard/AthleteDashboard'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/**
 * Einstiegspunkt.
 *
 * Solange keine Sitzung besteht, läuft das Dashboard mit Demodaten weiter —
 * das Layout ist damit ohne Login und ohne Backend-Zugang beurteilbar. Sobald
 * Auth und die Datenabfragen stehen, wird `demo` false und die Ansicht liest
 * aus Supabase.
 */
export default function App() {
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
      setHasSession(Boolean(session)),
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  const demo = !isSupabaseConfigured || !hasSession
  return <AthleteDashboard demo={demo} />
}
