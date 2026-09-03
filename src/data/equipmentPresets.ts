import type { EquipmentId } from '@/data/equipment'

/**
 * Wo jemand testet — als Vorauswahl der Ausrüstung.
 *
 * Im Einstieg dreissig Einzelhaken abzufragen wäre eine Zumutung und würde
 * abgebrochen. Fast jeder kann aber sofort sagen, WO er misst, und daraus
 * folgt die Ausstattung mit guter Näherung. Die Vorgaben sind additiv: wer
 * im Verein UND im Studio misst, wählt beides.
 *
 * Es bleibt eine Näherung, und die App sagt das auch. Feinjustiert wird im
 * Ausrüstungsfilter des Katalogs, der schon existiert; die Vorgabe füllt ihn
 * nur vor. Und: wer nichts wählt, bekommt den vollständigen Katalog — ein
 * leerer Filter versteckt nichts.
 */

export interface EquipmentPreset {
  id: string
  name: { de: string; en: string }
  hint: { de: string; en: string }
  equipment: EquipmentId[]
}

/** Was praktisch überall verfügbar ist, sobald man irgendwo trainiert. */
const BASIS: EquipmentId[] = ['stopwatch', 'tape_measure', 'mat', 'counter']

export const EQUIPMENT_PRESETS: EquipmentPreset[] = [
  {
    id: 'outdoor',
    name: { de: 'Draussen: Bahn, Platz, Strasse', en: 'Outdoors: track, field, road' },
    hint: {
      de: 'Laufstrecken, Sprints, Sprünge — alles, was Platz braucht und kein Gerät.',
      en: 'Runs, sprints, jumps — everything that needs space and no machine.',
    },
    equipment: [...BASIS, 'measured_course', 'track', 'cones', 'skipping_rope'],
  },
  {
    id: 'gym',
    name: { de: 'Fitnessstudio', en: 'Gym' },
    hint: {
      de: 'Hantel, Zusatzlast, Klimmzugstange, Ergometer und Laufband.',
      en: 'Barbell, added load, pull-up bar, ergometers and treadmill.',
    },
    equipment: [
      ...BASIS,
      'barbell',
      'dumbbells',
      'pull_up_bar',
      'added_load',
      'rowing_erg',
      'bike_erg',
      'ski_erg',
      'treadmill',
      'wall_ball',
    ],
  },
  {
    id: 'club',
    name: { de: 'Verein oder Trainingshalle', en: 'Club or training hall' },
    hint: {
      de: 'Matten, Partner für Partnerübungen, Sandsack, Hindernisse.',
      en: 'Mats, a partner for paired drills, heavy bag, obstacles.',
    },
    equipment: [...BASIS, 'partner', 'heavy_bag', 'climbing_rope', 'obstacle_course', 'stairs'],
  },
  {
    id: 'measuring',
    name: { de: 'Messgeräte vorhanden', en: 'Measuring devices available' },
    hint: {
      de: 'Handdynamometer, Sprungmatte, Leistungsmesser, Pulsgurt.',
      en: 'Hand dynamometer, jump mat, power meter, heart rate strap.',
    },
    equipment: [...BASIS, 'hand_dynamometer', 'jump_mat', 'power_meter', 'heart_rate_monitor'],
  },
  {
    id: 'pool',
    name: { de: 'Schwimmbad', en: 'Pool' },
    hint: { de: 'Bahnen zum Schwimmen.', en: 'Lanes for swimming.' },
    equipment: [...BASIS, 'pool'],
  },
  {
    id: 'lab',
    name: { de: 'Labor oder Sportmedizin', en: 'Lab or sports medicine' },
    hint: {
      de: 'Laktatmessung und Stufentests unter Aufsicht.',
      en: 'Lactate measurement and step tests under supervision.',
    },
    equipment: [...BASIS, 'lactate_analyser', 'treadmill', 'bike_erg', 'audio_protocol'],
  },
]

/** Die Vereinigung der gewählten Vorgaben. */
export function equipmentFor(presetIds: string[]): EquipmentId[] {
  const out = new Set<EquipmentId>()
  for (const id of presetIds) {
    const preset = EQUIPMENT_PRESETS.find((p) => p.id === id)
    for (const item of preset?.equipment ?? []) out.add(item)
  }
  return [...out]
}
