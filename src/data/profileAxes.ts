import { PERFORMANCE_DIMENSIONS, type PerformanceDimension, type ScoringDirection } from '@/types/domain'

/**
 * Profilachsen je Sportart.
 *
 * DER FEHLER, DEN DAS BEHEBT
 *
 * Bis hierher rechnete die App gegen sechs feste Achsen — Ausdauer,
 * Maximalkraft, Relativkraft, Kraftausdauer, Schnellkraft, Agilität. Gemessen
 * über alle 39 Disziplinen deckt KEINE ihre Kernbatterie vollständig ab: der
 * Marathon trifft eine der sechs, das Zeitfahren eine, Boxen zwei. Wer der
 * Empfehlung der App folgte, bekam anschliessend fünf leere Achsen und die
 * Meldung, sein Profil sei unvollständig. Die App bestrafte ihn dafür, dass
 * er ihrem eigenen Rat gefolgt war.
 *
 * DIE LÖSUNG
 *
 * Jede Disziplin bringt ihr eigenes Achsenset mit. Für den Marathon sind das
 * Ausdauer, Laufökonomie und Ermüdungsresistenz — drei Achsen, die er auch
 * erreichen kann. Vollständig heisst ab jetzt: die Achsen DIESER Disziplin
 * sind belegt.
 *
 * ZWEI ARTEN VON ACHSEN
 *
 *   `dimension` — eine der sechs bekannten Fähigkeiten. Sie werden aus den
 *                 Achsenzuordnungen des Testkatalogs gespeist und bleiben
 *                 zwischen Sportarten vergleichbar.
 *   `metric`    — eine Kennzahl quer über Tests, etwa die Laufökonomie oder
 *                 der Griffwert. Sie beschreiben, was eine Sportart
 *                 auszeichnet und was die sechs allgemeinen Achsen nicht
 *                 auflösen.
 *
 * WAS DAMIT VERLOREN GEHT, UND WARUM ES VERTRETBAR IST
 *
 * Zwei Sportarten mit verschiedenen Achsensets lassen sich nicht mehr Fläche
 * gegen Fläche vergleichen. Das war ohnehin eine Scheingenauigkeit — die
 * Fläche eines Marathonläufers mit fünf leeren Achsen sagte nichts über ihn.
 * Für den Quervergleich bleiben die sechs allgemeinen Achsen erhalten; sie
 * sind das Achsenset ohne gewählte Disziplin und stehen im Bericht weiter zur
 * Verfügung.
 */

export interface ProfileAxis {
  id: string
  name: { de: string; en: string }
  /** Ein Satz, der sagt, was die Achse für diese Art Sportart bedeutet. */
  meaning: { de: string; en: string }
  source:
    | { kind: 'dimension'; dimension: PerformanceDimension }
    | { kind: 'metric'; metricKey: string; direction: ScoringDirection }
}

const dimensionAxis = (
  dimension: PerformanceDimension,
  meaning: { de: string; en: string },
): ProfileAxis => ({
  id: dimension,
  // Der Anzeigename kommt aus der Übersetzung der Achse (`dimensions.*`);
  // hier steht die Kennung, damit beides nicht auseinanderläuft.
  name: { de: dimension, en: dimension },
  meaning,
  source: { kind: 'dimension', dimension },
})

/**
 * Alle verfügbaren Achsen. Die Disziplinen verweisen darauf über ihre
 * Kennung — so steht jeder Name genau einmal.
 */
export const PROFILE_AXES: Record<string, ProfileAxis> = {
  endurance: dimensionAxis('endurance', {
    de: 'Wie lange eine Belastung durchgehalten wird.',
    en: 'How long an effort can be sustained.',
  }),
  max_strength: dimensionAxis('max_strength', {
    de: 'Wie viel Kraft einmalig entwickelt wird.',
    en: 'How much force can be produced once.',
  }),
  relative_strength: dimensionAxis('relative_strength', {
    de: 'Kraft im Verhältnis zum eigenen Körpergewicht — in Gewichtsklassen die entscheidende Grösse.',
    en: 'Strength relative to body weight — the decisive quantity in weight classes.',
  }),
  strength_endurance: dimensionAxis('strength_endurance', {
    de: 'Wie oft eine kraftvolle Aktion wiederholt werden kann, bevor sie einbricht.',
    en: 'How often a forceful action can be repeated before it breaks down.',
  }),
  power: dimensionAxis('power', {
    de: 'Wie schnell Kraft entwickelt wird — Antritt, Absprung, Schlag.',
    en: 'How quickly force is produced — acceleration, jump, strike.',
  }),
  agility: dimensionAxis('agility', {
    de: 'Richtungswechsel unter Zeitdruck.',
    en: 'Change of direction under time pressure.',
  }),

  // --- Kennzahlachsen: was die sechs allgemeinen nicht auflösen -------------
  grip: {
    id: 'grip',
    name: { de: 'Griffkraft', en: 'Grip' },
    meaning: {
      de: 'Griffkraft je Körpergewicht. In Griffkampfsportarten entscheidet sie die letzten Minuten.',
      en: 'Grip strength per body weight. In gripping sports it decides the final minutes.',
    },
    source: { kind: 'metric', metricKey: 'grip_relative', direction: 'higher_is_better' },
  },
  fight_endurance: {
    id: 'fight_endurance',
    name: { de: 'Kampfausdauer', en: 'Fight endurance' },
    meaning: {
      de: 'Wiederholbarkeit maximaler Aktionen mit unvollständiger Erholung.',
      en: 'Repeatability of maximal actions with incomplete recovery.',
    },
    source: { kind: 'metric', metricKey: 'fight_endurance_score', direction: 'higher_is_better' },
  },
  fatigue_resistance: {
    id: 'fatigue_resistance',
    name: { de: 'Ermüdungsresistenz', en: 'Fatigue resistance' },
    meaning: {
      de: 'Wie stark die Leistung über wiederholte Aktionen abfällt. Weniger Abfall ist besser.',
      en: 'How far performance drops across repeated actions. Less drop is better.',
    },
    source: { kind: 'metric', metricKey: 'fatigue_index_percent', direction: 'lower_is_better' },
  },
  run_economy: {
    id: 'run_economy',
    name: { de: 'Laufökonomie (Näherung)', en: 'Run economy (approximation)' },
    meaning: {
      de: 'Wie nah an der Schwellenpace ein Rennen gehalten wird. Ersetzt keine Spiroergometrie.',
      en: 'How close to threshold pace a race is held. Does not replace spiroergometry.',
    },
    source: { kind: 'metric', metricKey: 'run_economy_score', direction: 'higher_is_better' },
  },
  durability: {
    id: 'durability',
    name: { de: 'Dauerbelastbarkeit', en: 'Durability' },
    meaning: {
      de: 'Anstieg der Herzfrequenz bei gleichbleibendem Tempo. Auf Langdistanzen aussagekräftiger als jeder Maximalwert.',
      en: 'Rise in heart rate at constant pace. Over long distances more telling than any maximal value.',
    },
    source: { kind: 'metric', metricKey: 'hr_drift_percent', direction: 'lower_is_better' },
  },
  bike_threshold: {
    id: 'bike_threshold',
    name: { de: 'Schwellenleistung Rad', en: 'Bike threshold' },
    meaning: {
      de: 'Dauerleistung je Körpergewicht — die Grösse, die am Berg entscheidet.',
      en: 'Sustainable power per body weight — the quantity that decides on a climb.',
    },
    source: { kind: 'metric', metricKey: 'ftp_watt_per_kg', direction: 'higher_is_better' },
  },
  swim_technique: {
    id: 'swim_technique',
    name: { de: 'Technikwert Schwimmen', en: 'Swim technique' },
    meaning: {
      de: 'Zuglänge im Verhältnis zur Geschwindigkeit. Trennt zwei Schwimmer mit gleicher Ausdauer.',
      en: 'Stroke length relative to speed. Separates two swimmers with equal endurance.',
    },
    source: { kind: 'metric', metricKey: 'swim_technique_score', direction: 'higher_is_better' },
  },
  load_carriage: {
    id: 'load_carriage',
    name: { de: 'Tragleistung', en: 'Load carriage' },
    meaning: {
      de: 'Zusatzlast je Körpergewicht. Im Einsatz die häufigste Form der Belastung.',
      en: 'Additional load per body weight. On duty the most common form of loading.',
    },
    source: { kind: 'metric', metricKey: 'load_relative', direction: 'higher_is_better' },
  },
  climbing: {
    id: 'climbing',
    name: { de: 'Steigleistung', en: 'Climbing' },
    meaning: {
      de: 'Höhenmeter je Stunde. Am Berg entscheidet sie über die Zeit.',
      en: 'Vertical metres per hour. On a climb it decides the time.',
    },
    source: { kind: 'metric', metricKey: 'vertical_speed_m_per_h', direction: 'higher_is_better' },
  },
}

/**
 * Das Achsenset ohne gewählte Disziplin: die sechs allgemeinen Fähigkeiten.
 * Es ist zugleich der gemeinsame Nenner für den Quervergleich zwischen
 * Sportarten.
 */
export const GENERAL_AXIS_IDS: string[] = [...PERFORMANCE_DIMENSIONS]

export function axisById(id: string): ProfileAxis | undefined {
  return PROFILE_AXES[id]
}

/**
 * Anzeigename einer Achse.
 *
 * Die sechs allgemeinen Fähigkeiten haben ihre Übersetzung schon unter
 * `dimensions.*` — sie stehen an vielen Stellen der App und sollen überall
 * gleich heissen. Die sportartspezifischen Achsen bringen ihren Namen selbst
 * mit. Deshalb hier eine Stelle statt zweier Sprachdateien.
 */
export function axisLabel(
  axisId: string,
  translate: (key: string) => string,
  lang: 'de' | 'en',
): string {
  const axis = PROFILE_AXES[axisId]
  if (!axis) return axisId
  if (axis.source.kind === 'dimension') return translate(`dimensions.${axis.source.dimension}`)
  return axis.name[lang]
}
