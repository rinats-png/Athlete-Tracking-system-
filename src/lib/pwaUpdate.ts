import { registerSW } from 'virtual:pwa-register'

/**
 * Aktualisierung der installierten App.
 *
 * Ohne diese Datei erreicht ein neuer Build zurückkehrende Nutzer nicht:
 * die von `vite-plugin-pwa` erzeugte Registrierung ruft einmal beim Laden
 * `register()` auf und fragt danach nie wieder nach einer neuen Fassung. Der
 * Browser prüft von sich aus nur unzuverlässig — gemessen blieb ein
 * Besucher auch nach drei Reloads auf dem alten Stand, und erst ein
 * ausdrückliches `update()` löste die Installation aus.
 *
 * Für eine App, die offline funktionieren soll, ist das keine Kleinigkeit:
 * der Service Worker liefert die alte Fassung aus dem Cache, und der Nutzer
 * sieht nach einem Deploy weiterhin die Version von gestern, ohne dass ihm
 * irgendetwas auffällt.
 *
 * Drei Anlässe, an denen geprüft wird:
 *   - beim Start
 *   - wenn die Seite wieder in den Vordergrund kommt (eine installierte PWA
 *     wird selten neu geladen, aber häufig wieder geöffnet)
 *   - stündlich, solange sie offen bleibt
 */

/** Abstand der Hintergrundprüfung. Eine Stunde ist selten genug, um nicht zu
 *  stören, und häufig genug, damit eine Korrektur am selben Tag ankommt. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function setupPwaUpdates() {
  // In der Testumgebung und bei deaktiviertem Service Worker gibt es nichts
  // zu registrieren — dann still zurückkehren statt zu werfen.
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  registerSW({
    immediate: true,

    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const check = () => {
        // Ein Update-Abruf ohne Netz erzeugt nur einen Fehler im Protokoll.
        if (navigator.onLine === false) return
        void registration.update().catch(() => {
          /* Netzfehler sind hier folgenlos: beim nächsten Anlass erneut. */
        })
      }

      window.setInterval(check, CHECK_INTERVAL_MS)

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })

      window.addEventListener('online', check)
    },
  })
}
