import { useEffect, useState } from 'react'
import { loadExtra } from '@/i18n'

/**
 * Für Karten auf sofort geladenen Bildschirmen (Übersicht), deren Texte im
 * Zusatzwörterbuch liegen. Bis es da ist, zeigt die Karte nichts — sonst
 * stünden für einen Augenblick rohe Schlüssel auf der Startseite.
 */
export function useExtraReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    void loadExtra().then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])
  return ready
}
