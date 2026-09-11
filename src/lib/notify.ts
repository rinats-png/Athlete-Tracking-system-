/**
 * Systembenachrichtigungen für fällige Nachmessungen.
 *
 * WAS DAS KANN UND WAS NICHT: ohne einen Server, der Push-Nachrichten
 * verschickt, kann eine Web-App nicht benachrichtigen, während sie
 * geschlossen ist. Sie kann nur beim Öffnen sagen, was inzwischen fällig
 * geworden ist. Das ist wenig — und deshalb steht diese Grenze auch in der
 * Oberfläche und nicht nur hier (§81): «erinnert dich zuverlässig» wäre eine
 * Behauptung, die die App nicht einlösen kann.
 *
 * Der verlässliche Weg ist die Kalenderdatei (siehe lib/export/ics.ts). Diese
 * Benachrichtigung ist die Zugabe für den, der die App ohnehin öffnet.
 */

export type NotifyPermission = 'unsupported' | 'default' | 'granted' | 'denied'

/** Wie oft höchstens benachrichtigt wird, in Millisekunden. */
export const NOTIFY_COOLDOWN_MS = 20 * 60 * 60 * 1000

const LAST_SHOWN_KEY = 'kydon.notify.lastShown'

export function notifyPermission(): NotifyPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as NotifyPermission
}

/**
 * Fragt nach der Erlaubnis. Nur auf eine ausdrückliche Handlung hin
 * aufrufen — ein ungefragter Berechtigungsdialog beim Start wird weggeklickt
 * und ist danach dauerhaft verweigert.
 */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (notifyPermission() === 'unsupported') return 'unsupported'
  try {
    return (await Notification.requestPermission()) as NotifyPermission
  } catch {
    return 'denied'
  }
}

function lastShown(): number {
  try {
    return Number(localStorage.getItem(LAST_SHOWN_KEY) ?? '0')
  } catch {
    return 0
  }
}

/**
 * Zeigt eine Benachrichtigung, sofern erlaubt und seit der letzten genug Zeit
 * vergangen ist.
 *
 * Die Sperre ist kein Detail: wer die App an einem Tag dreimal öffnet, bekäme
 * sonst dreimal dieselbe Meldung und schaltet sie danach ab.
 *
 * Gibt zurück, ob tatsächlich benachrichtigt wurde.
 */
export function notifyOverdue(title: string, body: string, now: number = Date.now()): boolean {
  if (notifyPermission() !== 'granted') return false
  if (now - lastShown() < NOTIFY_COOLDOWN_MS) return false
  try {
    new Notification(title, { body, tag: 'baseline-overdue', icon: '/icon-192.png' })
    localStorage.setItem(LAST_SHOWN_KEY, String(now))
    return true
  } catch {
    return false
  }
}

/** Setzt die Sperre zurück. Nur für Prüfläufe gedacht. */
export function resetNotifyCooldown(): void {
  try {
    localStorage.removeItem(LAST_SHOWN_KEY)
  } catch {
    /* Ohne Speicher greift die Sperre ohnehin nicht. */
  }
}
