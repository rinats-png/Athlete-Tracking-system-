import { getTest } from '@/data/testCatalog'
import type { DueTest } from '@/domain/reminders'
import type { AppLocale } from '@/types/domain'

/**
 * Fälligkeitstermine als Kalenderdatei.
 *
 * DER GRUND, WARUM ES DAS GIBT: eine Erinnerung, die nur in der App steht,
 * erreicht niemanden — die App wird viermal im Jahr geöffnet, und genau
 * dazwischen müsste die Erinnerung kommen. Ein Kalendereintrag dagegen liegt
 * dort, wo ohnehin jeden Tag jemand hinsieht, funktioniert offline, braucht
 * keinen Server und keine Erlaubnis.
 *
 * Bewusst ein ganztägiger Termin mit Voralarm statt einer Uhrzeit: wann
 * jemand testen kann, weiss die App nicht, und eine erfundene Uhrzeit wäre
 * eine Behauptung über seinen Tag.
 */

/** Wie viele Tage vor dem Termin der Voralarm ausgelöst wird. */
export const ALARM_LEAD_DAYS = 3

/**
 * Zeilen nach RFC 5545 falten: höchstens 75 Oktett je Zeile, Fortsetzung mit
 * einem führenden Leerzeichen. Ohne das Falten verwerfen manche Kalender die
 * Datei stillschweigend — und der Nutzer sähe nur, dass nichts passiert.
 */
function fold(line: string): string {
  const bytes = [...line]
  const out: string[] = []
  let current = ''
  let length = 0
  for (const char of bytes) {
    const size = new TextEncoder().encode(char).length
    if (length + size > 73) {
      out.push(current)
      current = ''
      length = 0
    }
    current += char
    length += size
  }
  out.push(current)
  return out.join('\r\n ')
}

/** Sonderzeichen nach RFC 5545 maskieren. */
function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
}

function plusOneDay(day: string): string {
  const next = new Date(`${day}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

/**
 * Baut die Kalenderdatei zu den fälligen Tests.
 *
 * `now` ist ein Parameter, damit sich das Ergebnis prüfen lässt, ohne von
 * der Uhr des Prüfrechners abzuhängen.
 */
export function buildIcs(due: DueTest[], locale: AppLocale, now: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BASELINE//Leistungsdiagnose//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const entry of due) {
    const test = getTest(entry.slug)
    if (!test) continue
    const day = entry.dueOn.replace(/-/g, '')
    const title =
      locale === 'de' ? `Nachmessung: ${test.name.de}` : `Re-test: ${test.name.en}`
    const description =
      locale === 'de'
        ? `Zuletzt gemessen am ${entry.lastPerformedAt.slice(0, 10)}. Vorgeschlagenes Intervall: ${entry.intervalDays} Tage. Bedingungen wie beim letzten Mal halten, sonst sind die beiden Messungen nicht vergleichbar.`
        : `Last measured on ${entry.lastPerformedAt.slice(0, 10)}. Suggested interval: ${entry.intervalDays} days. Keep the conditions identical, otherwise the two measurements are not comparable.`

    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${entry.slug}-${entry.dueOn}@baseline`),
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${plusOneDay(entry.dueOn).replace(/-/g, '')}`,
      fold(`SUMMARY:${escape(title)}`),
      fold(`DESCRIPTION:${escape(description)}`),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-P${ALARM_LEAD_DAYS}D`,
      fold(`DESCRIPTION:${escape(title)}`),
      'END:VALARM',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  // RFC 5545 verlangt CRLF; mit \n allein lehnen einige Kalender die Datei ab.
  return `${lines.join('\r\n')}\r\n`
}
