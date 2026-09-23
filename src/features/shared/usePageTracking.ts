import { useEffect, useRef } from 'react'
import { consentState, isUntrackedPath, normalizePath, onConsentChange, trackEvent, trackSessionStart } from '@/lib/analytics'

/**
 * Seitenaufrufe und Verweildauer — automatisch, aber nur mit Einwilligung.
 *
 * WARUM AUCH DIE VERWEILDAUER: Die Frage hinter dieser Statistik ist «was
 * hält die Leute und was nicht». Ein Seitenaufruf sagt, DASS jemand da war;
 * erst die Dauer sagt, ob er geblieben ist. Und der letzte `page_leave` einer
 * Sitzung ist die Seite, auf der jemand gegangen ist.
 *
 * `page_leave` geht in zwei Fällen ab: beim Wechsel der Route, und wenn der
 * Tab in den Hintergrund geht. Der zweite Fall ist der wichtigere — so endet
 * eine Sitzung fast immer, und nur ein Beacon kommt dann noch durch.
 */
export function usePageTracking(pathname: string): void {
  const current = useRef<{ path: string; since: number } | null>(null)

  useEffect(() => {
    const start = () => trackSessionStart()
    start()
    // Wer die App installiert, hat sich entschieden zu bleiben — das
    // stärkste Signal, das eine Web-App bekommen kann.
    const installed = () => trackEvent('pwa_installed')
    window.addEventListener('appinstalled', installed)
    const off = onConsentChange((state) => {
      if (state === 'granted') start()
    })
    return () => {
      off()
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  useEffect(() => {
    const leave = (reason: 'route' | 'hidden') => {
      const prev = current.current
      if (!prev) return
      const seconds = Math.round((Date.now() - prev.since) / 1000)
      // Unter einer Sekunde ist ein Durchklicken, kein Aufenthalt.
      if (seconds >= 1) trackEvent('page_leave', { path: prev.path, seconds: Math.min(seconds, 3600), reason })
    }

    leave('route')
    if (isUntrackedPath(pathname)) {
      // Auf gesperrten Seiten gibt es keinen Seitenaufruf und keine Dauer.
      current.current = null
      return
    }
    const path = normalizePath(pathname)
    current.current = { path, since: Date.now() }
    if (consentState() === 'granted') trackEvent('page_view', { path })

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        leave('hidden')
        current.current = null
      } else if (current.current == null && !isUntrackedPath(location.pathname)) {
        current.current = { path: normalizePath(location.pathname), since: Date.now() }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [pathname])
}
