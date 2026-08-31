import { useEffect } from 'react'

/**
 * Hält den Bildschirm wach, solange `active` gilt.
 *
 * Warum das hier zählt: ein Cooper-Test dauert zwölf Minuten, ein Ruderzweier
 * knapp sieben, ein geladener Marsch deutlich länger. Das Telefon liegt
 * währenddessen auf der Bank oder steckt im Armband und schaltet nach dreissig
 * Sekunden ab. Wer dann zurückkommt, entsperrt zuerst — und liest die Zeit,
 * die er eigentlich in dem Moment gebraucht hätte, in dem er ins Ziel kam.
 *
 * Die Sperre wird vom Browser bei jedem Wechsel in den Hintergrund selbst
 * wieder freigegeben. Deshalb wird sie bei der Rückkehr erneut angefordert;
 * ohne das hielte sie nur bis zum ersten Blick auf eine andere App.
 *
 * Fehlende Unterstützung ist kein Fehlerfall: iOS beherrscht die Sperre erst
 * ab Version 16.4, und ohne sicheren Kontext gibt es sie gar nicht. Dann
 * verhält sich die App wie vorher, statt eine Meldung zu zeigen, mit der
 * niemand etwas anfangen kann.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch {
        // Abgelehnt (Akkusparmodus, fehlende Nutzerinteraktion, kein sicherer
        // Kontext). Der Test läuft weiter; nur der Bildschirm schläft.
      }
    }

    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}
