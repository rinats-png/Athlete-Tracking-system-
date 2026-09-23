import { useEffect, useState } from 'react'
import { checkAdmin } from '@/lib/supabase/analyticsAdmin'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * Ist die angemeldete Person der Admin?
 *
 * Die Antwort gibt die Datenbank (is_analytics_admin). Gefragt wird beim
 * Start UND bei jeder Änderung der Anmeldung — sonst sähe, wer sich erst
 * nach dem Öffnen der App anmeldet, den Admin-Bereich nie.
 */
export function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let alive = true
    let unsubscribe: (() => void) | null = null
    const ask = () => void checkAdmin().then((r) => alive && setAdmin(r === 'admin'))
    ask()
    void getSupabase().then((supabase) => {
      if (!supabase || !alive) return
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') setAdmin(false)
        else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') ask()
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })
    return () => {
      alive = false
      unsubscribe?.()
    }
  }, [])
  return admin
}
