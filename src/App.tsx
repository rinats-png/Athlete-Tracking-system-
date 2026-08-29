import { useEffect, useState } from 'react'
import { AthleteDashboard } from '@/features/dashboard/AthleteDashboard'
import { WelcomeScreen } from '@/features/auth/WelcomeScreen'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/**
 * Einstiegspunkt.
 *
 * Ohne Sitzung erscheint der Willkommensbildschirm; von dort führt "Demo
 * ansehen" ins Dashboard mit Demodaten, damit das Produkt ohne Konto
 * beurteilbar bleibt. Sobald Auth steht, ersetzt die echte Sitzung diesen Weg.
 */
export default function App() {
  const [hasSession, setHasSession] = useState(false)
  const [demoRequested, setDemoRequested] = useState(false)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
      setHasSession(Boolean(session)),
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!hasSession && !demoRequested) {
    return <WelcomeScreen onDemo={() => setDemoRequested(true)} />
  }

  return <AthleteDashboard demo={!isSupabaseConfigured || !hasSession} />
}
