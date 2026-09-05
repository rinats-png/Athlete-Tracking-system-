/**
 * Ausrüstung als Kennung statt als Fliesstext.
 *
 * DER FEHLER, DEN DAS BEHEBT
 *
 * Die Ausrüstung stand je Test in einem Satz: «Laufbahn oder vermessene
 * Strecke, Stoppuhr». Für einen Menschen lesbar, für die App unlesbar. Wer
 * eine Stoppuhr und ein Massband hat und wissen will, was er damit messen
 * kann, musste 51 Beschreibungen durchgehen — die App wusste die Antwort und
 * konnte sie nicht geben.
 *
 * WIE ES JETZT STEHT
 *
 * `equipmentIds` ist eine Liste von Gruppen. Innerhalb einer Gruppe genügt
 * EINES der genannten Stücke, alle Gruppen zusammen sind nötig:
 *
 *   [['track', 'measured_course'], ['stopwatch']]
 *   → eine Bahn ODER eine vermessene Strecke, UND eine Stoppuhr.
 *
 * Diese Unterscheidung ist der Grund für die verschachtelte Form. Eine flache
 * Liste müsste sich zwischen zwei Unwahrheiten entscheiden: entweder gilt ein
 * Test als machbar, sobald irgendein Stück da ist, oder er gilt als
 * unmachbar, solange nicht jede Alternative vorliegt. Beides führte dazu,
 * dass jemand einen Test nicht angeboten bekommt, den er durchführen könnte.
 *
 * Der Satz bleibt daneben stehen: er nennt Einzelheiten, die keine Kennung
 * trägt (die Bahnlänge, die Art der Griffe). `tests/equipment.spec.ts`
 * verlangt, dass beide dasselbe sagen.
 */

export type EquipmentId =
  | 'stopwatch'
  | 'measured_course'
  | 'track'
  | 'cones'
  | 'tape_measure'
  | 'heart_rate_monitor'
  | 'barbell'
  | 'dumbbells'
  | 'pull_up_bar'
  | 'added_load'
  | 'sled'
  | 'mat'
  | 'partner'
  | 'heavy_bag'
  | 'rowing_erg'
  | 'ski_erg'
  | 'bike_erg'
  | 'treadmill'
  | 'power_meter'
  | 'pool'
  | 'jump_mat'
  | 'hand_dynamometer'
  | 'lactate_analyser'
  | 'climbing_rope'
  | 'skipping_rope'
  | 'stairs'
  | 'obstacle_course'
  | 'audio_protocol'
  | 'wall_ball'
  | 'counter'
  | 'open_space'
  | 'gi'
  | 'kettlebell'

export interface EquipmentItem {
  id: EquipmentId
  name: { de: string; en: string }
  /**
   * Wörter, die im Ausrüstungstext auf dieses Stück hinweisen. Sie sind der
   * Prüfstein dafür, dass Text und Kennungen dasselbe sagen — nicht mehr:
   * die Zuordnung selbst steht am Test.
   */
  keywords: string[]
}

export const EQUIPMENT: EquipmentItem[] = [
  {
    id: 'stopwatch',
    name: { de: 'Stoppuhr', en: 'Stopwatch' },
    keywords: ['stoppuhr', 'zeitmesser', 'uhr'],
  },
  {
    id: 'measured_course',
    name: { de: 'Vermessene Strecke', en: 'Measured course' },
    keywords: [
      'vermessene strecke',
      'markierte strecke',
      'laufstrecke',
      'ebene strecke',
      'vermessene steigung',
      'measured',
      'strecke',
      'route',
      'lane',
    ],
  },
  {
    id: 'track',
    name: { de: 'Laufbahn', en: 'Running track' },
    keywords: ['laufbahn', 'bahn', 'track'],
  },
  {
    id: 'cones',
    name: { de: 'Markierungen', en: 'Cones' },
    keywords: ['markierung', 'hütchen', 'cone', 'mark'],
  },
  {
    id: 'tape_measure',
    name: { de: 'Massband', en: 'Tape measure' },
    keywords: ['massband', 'tape'],
  },
  {
    id: 'heart_rate_monitor',
    name: { de: 'Pulsmesser', en: 'Heart rate monitor' },
    keywords: ['pulsmesser', 'pulsgurt', 'heart rate'],
  },
  {
    id: 'barbell',
    name: { de: 'Langhantel', en: 'Barbell' },
    keywords: [
      'langhantel',
      'scheiben',
      'rack',
      'bumper',
      'plattform',
      'barbell',
      'plates',
      'platform',
    ],
  },
  {
    id: 'dumbbells',
    name: { de: 'Kurzhanteln', en: 'Dumbbells' },
    keywords: ['kurzhantel', 'farmers-griffe', 'dumbbell', 'farmers handles'],
  },
  {
    id: 'pull_up_bar',
    name: { de: 'Klimmzugstange', en: 'Pull-up bar' },
    keywords: ['klimmzugstange', 'pull-up bar'],
  },
  {
    id: 'added_load',
    name: { de: 'Zusatzlast (Weste, Gürtel, Rucksack)', en: 'Added load (vest, belt, pack)' },
    keywords: [
      'gewichtsweste',
      'dipgürtel',
      'rucksack',
      'ausrüstung',
      'gewichte',
      'gewichtsscheiben',
      'weight plates',
      'weight vest',
      'dip belt',
      'pack',
      'weights',
    ],
  },
  {
    id: 'sled',
    name: { de: 'Schlitten', en: 'Sled' },
    keywords: ['schlitten', 'gurtsystem', 'sled', 'harness'],
  },
  { id: 'mat', name: { de: 'Matte', en: 'Mat' }, keywords: ['matte', 'mat'] },
  {
    id: 'partner',
    name: { de: 'Partner', en: 'Partner' },
    keywords: ['partner', 'betreuung', 'supervision'],
  },
  {
    id: 'heavy_bag',
    name: { de: 'Sandsack oder Pratzen', en: 'Heavy bag or pads' },
    keywords: ['sandsack', 'pratzen', 'bag', 'pads'],
  },
  {
    id: 'rowing_erg',
    name: { de: 'Ruderergometer', en: 'Rowing ergometer' },
    keywords: ['ruderergometer', 'rowing ergometer'],
  },
  {
    id: 'ski_erg',
    name: { de: 'Ski-Ergometer', en: 'Ski ergometer' },
    keywords: ['ski-ergometer', 'ski ergometer'],
  },
  {
    id: 'bike_erg',
    name: { de: 'Radergometer oder Smart-Trainer', en: 'Bike ergometer or smart trainer' },
    keywords: [
      'ergometer',
      'smart-trainer',
      'assault bike',
      'air bike',
      'rad',
      'bike',
      'smart trainer',
    ],
  },
  {
    id: 'treadmill',
    name: { de: 'Laufband', en: 'Treadmill' },
    keywords: ['laufband', 'treadmill'],
  },
  {
    id: 'power_meter',
    name: { de: 'Leistungsmesser', en: 'Power meter' },
    keywords: ['leistungsmesser', 'power meter'],
  },
  {
    id: 'pool',
    name: { de: 'Schwimmbahn', en: 'Pool lane' },
    keywords: ['schwimmbahn', 'becken', 'pool'],
  },
  {
    id: 'jump_mat',
    name: { de: 'Sprungmatte oder Messsystem', en: 'Jump mat or measurement system' },
    keywords: ['sprungmatte', 'messsystem', 'jump mat', 'measurement system'],
  },
  {
    id: 'hand_dynamometer',
    name: { de: 'Handdynamometer', en: 'Hand dynamometer' },
    keywords: ['handdynamometer', 'dynamometer'],
  },
  {
    id: 'lactate_analyser',
    name: { de: 'Laktatmessgerät', en: 'Lactate analyser' },
    keywords: ['laktatmessgerät', 'lactate'],
  },
  {
    id: 'climbing_rope',
    name: { de: 'Kletterseil', en: 'Climbing rope' },
    keywords: ['kletterseil', 'climbing rope'],
  },
  {
    id: 'skipping_rope',
    name: { de: 'Springseil', en: 'Skipping rope' },
    keywords: ['springseil', 'skipping rope'],
  },
  { id: 'stairs', name: { de: 'Treppenhaus', en: 'Stairwell' }, keywords: ['treppe', 'stair'] },
  {
    id: 'obstacle_course',
    name: { de: 'Hindernisbahn', en: 'Obstacle course' },
    keywords: ['hindernisbahn', 'obstacle'],
  },
  {
    id: 'audio_protocol',
    name: { de: 'Audio-Protokoll', en: 'Audio protocol' },
    keywords: ['audio'],
  },
  { id: 'wall_ball', name: { de: 'Wall Ball', en: 'Wall ball' }, keywords: ['wall ball'] },
  { id: 'counter', name: { de: 'Zähler', en: 'Counter' }, keywords: ['zähler', 'counter'] },
  {
    id: 'open_space',
    name: { de: 'Ebene Fläche', en: 'Level ground' },
    keywords: ['ebener boden', 'freie fläche', 'level ground'],
  },
  {
    id: 'gi',
    name: { de: 'Judogi oder Gi', en: 'Judogi or gi' },
    keywords: ['judogi', 'gi', 'kimono', 'anzug', 'jacke'],
  },
  {
    id: 'kettlebell',
    name: { de: 'Kettlebells', en: 'Kettlebells' },
    keywords: ['kettlebell', 'kugelhantel'],
  },
]

export const EQUIPMENT_BY_ID = new Map(EQUIPMENT.map((item) => [item.id, item]))

/**
 * Lässt sich dieser Test mit dem durchführen, was jemand hat?
 *
 * Ohne Angabe (leere Auswahl) gilt jeder Test als durchführbar: wer nichts
 * angegeben hat, soll nicht vor einem leeren Katalog stehen.
 */
export function canPerform(groups: EquipmentId[][], owned: ReadonlySet<EquipmentId>): boolean {
  if (owned.size === 0) return true
  return groups.every((group) => group.some((id) => owned.has(id)))
}

/** Was diesem Test bei dieser Ausstattung fehlt — je Gruppe eine Alternative. */
export function missingFor(
  groups: EquipmentId[][],
  owned: ReadonlySet<EquipmentId>,
): EquipmentId[][] {
  if (owned.size === 0) return []
  return groups.filter((group) => !group.some((id) => owned.has(id)))
}
