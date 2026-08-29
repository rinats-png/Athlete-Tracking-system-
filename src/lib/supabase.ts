import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Ohne Konfiguration läuft die App im Demomodus weiter, statt beim Start zu
 * scheitern — so lässt sich das UI auch ohne Backend-Zugang ansehen.
 */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
