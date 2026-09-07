import { getTest } from '@/data/testCatalog'
import { procedureFor } from '@/data/testProcedure'
import { changeReport } from '@/domain/change'
import { nextTests } from '@/domain/nextTest'
import type { NextTestInput } from '@/domain/nextTest'
import type { Rating } from '@/domain/rating'
import type { StoredResult } from '@/lib/store/localStore'
import type { AppLocale } from '@/i18n/locales'
import { pick } from '@/i18n/pick'

/**
 * Was ein Messwert bedeutet — in Sätzen statt in Fachbegriffen.
 *
 * DER GRUND, WARUM ES DAS GIBT: die App ordnete korrekt ein und sagte auch,
 * woher die Einordnung stammt («aus Perzentil 62 gegenüber Männer 20–29
 * Jahre, FRIEND-Register»). Das ist eine präzise Aussage in einer Sprache,
 * die ausserhalb der Sportwissenschaft niemand spricht. Wer sie nicht
 * übersetzt, hat zwar recht, aber nicht geholfen.
 *
 * VIER SÄTZE, IN DIESER REIHENFOLGE, WEIL SIE VIER VERSCHIEDENE FRAGEN
 * BEANTWORTEN:
 *
 *   1. Wo stehe ich gegenüber anderen?   — das Perzentil im Klartext
 *   2. Habe ich mich verändert?          — gegen die eigene Messstreuung
 *   3. Was sagt der Wert NICHT?          — die Grenze dieses Tests
 *   4. Was messe ich als Nächstes?       — kein Training, eine Messung
 *
 * Keiner dieser Sätze fügt eine Behauptung hinzu. Jeder rechnet nur aus,
 * was ohnehin im Bestand steht (§81). Und der vierte endet bewusst bei einer
 * Messung: was trainiert werden soll, entscheidet ein Trainer, nicht die App.
 */

/** Ein Satz, als Schlüssel und Werte — die Übersetzung bleibt in i18n. */
export interface MeaningLine {
  /** Ohne Präfix; die Oberfläche stellt `meaning.` davor. */
  key: string
  params?: Record<string, string | number>
  /** Freitext aus den Daten (Durchführungsvorschrift), schon in der Sprache. */
  text?: string
  /** Ziel eines weiterführenden Verweises, sofern der Satz einen trägt. */
  to?: string
}

export interface MeaningInput {
  result: StoredResult
  rating: Rating
  /** Alle Ergebnisse dieses Athleten — für Streuung und nächsten Test. */
  results: StoredResult[]
  locale: AppLocale
  nextInput: NextTestInput
}

/**
 * Der Anteil unterhalb, als ganze Menschen.
 *
 * «62 von 100» statt «Perzentil 62»: dieselbe Tatsache, aber sie lässt sich
 * jemandem am Spielfeldrand vorlesen.
 */
function ofHundred(percentile: number): number {
  return Math.round(Math.min(99, Math.max(1, percentile)))
}

export function meaningLines(input: MeaningInput): MeaningLine[] {
  const { result, rating, results, locale, nextInput } = input
  const test = getTest(result.testSlug)
  if (!test) return []

  const lines: MeaningLine[] = []

  // --- 1. Gegenüber anderen ------------------------------------------------
  const primary = rating.comparison
  if (primary?.percentile != null) {
    lines.push({
      key: 'percentile',
      params: {
        below: ofHundred(primary.percentile),
        above: 100 - ofHundred(primary.percentile),
        group: pick(primary.entry.cohortLabel, locale),
      },
    })
  } else if (primary?.band) {
    lines.push({
      key: 'band',
      params: { band: pick(primary.band.label, locale), group: pick(primary.entry.cohortLabel, locale) },
    })
  } else {
    // Keine Referenz ist auch eine Auskunft — und die häufigste.
    lines.push({ key: 'noReference' })
  }

  // --- 2. Gegenüber der eigenen Vorgeschichte ------------------------------
  const change = changeReport(results, result)
  if (change.verdict === 'first') {
    lines.push({ key: 'changeFirst' })
  } else if (change.verdict === 'unknown_error') {
    lines.push({ key: 'changeUnknown', params: { points: change.points } })
  } else if (change.changePercent != null && change.detectablePercent != null) {
    const magnitude = Math.abs(change.changePercent)
    lines.push({
      key:
        change.verdict === 'within_noise'
          ? 'changeNoise'
          : change.verdict === 'better'
            ? 'changeBetter'
            : 'changeWorse',
      params: {
        percent: magnitude.toFixed(1),
        detectable: change.detectablePercent.toFixed(1),
        days: change.daysSincePrevious ?? 0,
      },
    })
  }

  // --- 3. Was der Wert nicht sagt -----------------------------------------
  // Der erste Satz aus «Was gleich bleiben muss» ist genau die Einschränkung,
  // unter der dieser Wert überhaupt gilt. Er steht schon geschrieben — er
  // stand nur nie dort, wo das Ergebnis gelesen wird.
  const { procedure, source } = procedureFor(test)
  const limit = procedure.standardise[0]
  if (limit) {
    lines.push({ key: source === 'specific' ? 'limit' : 'limitGeneric', text: pick(limit, locale) })
  }

  // --- 4. Was als Nächstes zu messen ist -----------------------------------
  const next = nextTests(nextInput).filter((s) => s.slug !== result.testSlug)[0]
  const nextTest = next ? getTest(next.slug) : undefined
  if (next && nextTest) {
    lines.push({
      key: 'next',
      params: { test: pick(nextTest.name, locale) },
      to: `/tests/${next.slug}`,
    })
  }

  return lines
}
