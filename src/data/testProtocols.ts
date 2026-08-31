import type { TestBlueprint, TestField } from './testCatalog'
import { deriveRepsFatigue, deriveStrikeSplit } from './testDeriveShared'

/**
 * Parametrisierte Protokolle.
 *
 * DER FEHLER, DEN DAS BEHEBT
 *
 * Schlagtest 60 s, Tritttest 60 s und Schlagtest 180 s waren drei
 * vollständige Definitionen mit je eigener Anleitung, obwohl sie dasselbe
 * Protokoll beschreiben: maximale Wiederholungen einer Aktion über eine
 * feste Zeit, mit der Zwischensumme nach 30 Sekunden. Wer die Anleitung
 * präzisierte, musste sie an drei Stellen ändern — und wer eine vergass,
 * hinterliess zwei Athleten mit verschiedenen Vorgaben unter demselben
 * Testgedanken.
 *
 * Hier steht das Protokoll einmal. Die Unterschiede — Dauer, Zielaktion,
 * Feldgrenzen — sind Parameter, und die Anleitung setzt sie ein. Der
 * Parametersatz bleibt am Test stehen (`variant`), damit später erkennbar
 * ist, worin sich zwei Ergebnisse desselben Protokolls unterscheiden.
 *
 * Die Slugs bleiben, was sie waren: gespeicherte Ergebnisse und vorhandene
 * Importdateien verweisen darauf.
 */

const HEART_RATE: TestField = {
  key: 'maxHeartRate',
  type: 'integer',
  unit: 'bpm',
  required: false,
  min: 80,
  max: 240,
}
const RPE: TestField = { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 }

export interface StrikeTestParams {
  slug: string
  sortOrder: number
  durationSeconds: number
  /** Die Zielaktion. Sie bestimmt Einheit, Wortwahl und Feldgrenzen. */
  action: 'punch' | 'kick'
  /** Obergrenze der Eingabe. Hängt an der Dauer, nicht am Protokoll. */
  maxReps: number
  name: { de: string; en: string }
  shortName: { de: string; en: string }
  summary: { de: string; en: string }
}

const ACTION_WORDS = {
  punch: {
    unit: 'Schläge',
    de: { plural: 'Schläge', place: 'am Sandsack', note: 'Halbe Schläge zählen nicht.' },
    en: { plural: 'punches', place: 'on the heavy bag', note: 'Half punches do not count.' },
    equipment: { de: 'Sandsack, Handschuhe, Zähler', en: 'Heavy bag, gloves, counter' },
  },
  kick: {
    unit: 'Tritte',
    de: {
      plural: 'Tritte',
      place: 'am Pratzen- oder Sandsackziel, Seiten abwechselnd',
      note: 'Volle Ausführung mit Rückführung; die Trittart in der Notiz festhalten — ein Roundhouse und ein Frontkick sind nicht vergleichbar.',
    },
    en: {
      plural: 'kicks',
      place: 'on pads or bag, alternating sides',
      note: 'Full execution with retraction; record the kick type in the note — a roundhouse and a front kick are not comparable.',
    },
    equipment: {
      de: 'Sandsack oder Pratzen, Partner, Zähler',
      en: 'Bag or pads, partner, counter',
    },
  },
} as const

const durationPhrase = (seconds: number) => ({
  de: seconds % 60 === 0 && seconds >= 120 ? `${seconds / 60} Minuten` : `${seconds} Sekunden`,
  en: seconds % 60 === 0 && seconds >= 120 ? `${seconds / 60} minutes` : `${seconds} seconds`,
})

/**
 * Maximale Wiederholungen einer Kampfaktion über eine feste Zeit.
 *
 * Ab zwei Minuten kommt die Frequenz je Minute dazu: über eine Runde hinweg
 * sagt sie mehr als die Gesamtsumme, weil sie zwei Athleten mit gleicher
 * Summe und verschiedenem Verlauf trennt.
 */
export function strikeTest(params: StrikeTestParams): TestBlueprint {
  const words = ACTION_WORDS[params.action]
  const time = durationPhrase(params.durationSeconds)
  const longForm = params.durationSeconds > 60

  return {
    slug: params.slug,
    primaryMetric: 'reps',
    primaryUnit: words.unit,
    fields: [
      {
        key: 'reps',
        type: 'integer',
        unit: words.unit,
        required: true,
        min: 0,
        max: params.maxReps,
      },
      {
        key: 'repsFirst30',
        type: 'integer',
        unit: words.unit,
        required: false,
        min: 0,
        max: Math.round(params.maxReps * 0.7),
      },
      HEART_RATE,
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: params.durationSeconds },
    requiresBodyWeight: false,
    derivedMetrics: longForm
      ? ['fatigue_index_percent', 'reps_per_minute']
      : ['fatigue_index_percent'],
    derive: longForm ? deriveRepsFatigue : deriveStrikeSplit,
    variant: { action: params.action, durationSeconds: params.durationSeconds },
    sortOrder: params.sortOrder,
    name: params.name,
    shortName: params.shortName,
    summary: params.summary,
    instructions: {
      de: `${time.de} ${words.de.plural} ${words.de.place}, maximale Frequenz bei voller Ausführung. ${words.de.note} Die Zwischensumme nach 30 Sekunden ist freiwillig, macht das Ergebnis aber deutlich aussagekräftiger: gezählt wird die Zahl, nicht die Härte — Schlagkraft misst dieser Test ausdrücklich nicht.`,
      en: `${time.en} of ${words.en.plural} ${words.en.place}, maximal frequency with full execution. ${words.en.note} The 30-second subtotal is optional but makes the result markedly more informative: what is counted is the number, not the force — this test explicitly does not measure striking power.`,
    },
    equipment: words.equipment,
  }
}
