import { DISCIPLINES, disciplineById } from './sportProfiles'

/**
 * Was das Zielgruppendokument nennt und die App NICHT hat.
 *
 * WAS SICH HIER GEÄNDERT HAT
 *
 * Diese Datei führte bis zuletzt eine zweite Zuordnung Disziplin → Test,
 * parallel zu der in `sportProfiles.ts`, gekoppelt über zehn Bautests. Die
 * Kopplung funktionierte, aber zwei Listen, die immer übereinstimmen
 * müssen, sind eine Liste zu viel. Die Herkunft steht jetzt am Eintrag der
 * einen Liste (`DisciplineTest.provenance`).
 *
 * Was bleibt, ist das, wofür es dort keinen Platz gibt: die Tests, die das
 * Dokument nennt und die die App nicht anbietet. Sie haben keinen Slug, also
 * auch keine Zeile in einer Testliste — und genau deshalb würden sie ohne
 * diese Datei unsichtbar bleiben. Jede Lücke nennt ihre Art und ihren Grund.
 *
 * Keine Bewertung, ob ein Testverfahren gut ist. Buchführung über eine
 * Quelle, nicht über die Fachlage.
 */

export type GapKind =
  /** Baubar mit dem, was die App schon kann — nur noch nicht gebaut. */
  | 'buildable'
  /** Braucht Geräte, die ausserhalb eines Instituts selten verfügbar sind. */
  | 'equipment'
  /** Das Dokument nennt den Test und sagt zugleich, dass es ihn kaum gibt. */
  | 'no_protocol'
  /** In der App vorhanden, aber ausserhalb des Testkatalogs. */
  | 'elsewhere'

export interface DocumentGap {
  disciplineId: string
  /** Bezeichnung wie im Dokument, damit die Zeile wiederauffindbar bleibt. */
  label: string
  kind: GapKind
  reason: string
}

export const DOCUMENT_GAPS: DocumentGap[] = [
  {
    disciplineId: 'wrestling',
    label: 'wrestling-specific performance test',
    kind: 'no_protocol',
    reason:
      'Das Dokument nennt keinen bestimmten Test, sondern die Kategorie. Der SWFT deckt sie ab; ein zweiter, unbestimmter Eintrag wäre eine leere Zeile.',
  },
  {
    disciplineId: 'boxing',
    label: 'punch-force plate test',
    kind: 'equipment',
    reason:
      'Braucht eine Kraftmessplatte oder einen instrumentierten Sack. Ohne Gerät nicht messbar, geschätzte Schlagkraft wäre eine erfundene Zahl.',
  },
  {
    disciplineId: 'pencak_silat',
    label: 'specific combat circuits',
    kind: 'no_protocol',
    reason:
      'Das Dokument hält für Pencak Silat ausdrücklich fest, dass spezifische Protokolle teils fehlen und derzeit allgemeine Feldtests benutzt werden. Ein erfundenes Protokoll wäre schlechter als die offene Lücke.',
  },
  {
    disciplineId: 'fencing',
    label: 'lunge speed',
    kind: 'equipment',
    reason:
      'Braucht Lichtschranken oder Videoanalyse mit hoher Bildrate. Von Hand gestoppt läge der Messfehler über dem Unterschied zwischen Athleten.',
  },
  {
    disciplineId: 'fencing',
    label: 'reaction time',
    kind: 'equipment',
    reason:
      'Braucht eine Reizanlage mit Millisekundenauflösung. Ein Wert vom Telefon würde die Reaktionszeit des Geräts mitmessen.',
  },
  {
    disciplineId: 'run_5k_discipline',
    label: 'running economy test',
    kind: 'equipment',
    reason:
      'Laufökonomie ist der Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und braucht eine Spiroergometrie. Ohne Atemgasmessung gibt es sie nicht, nur Näherungen unter anderem Namen.',
  },
  {
    disciplineId: 'run_10k_discipline',
    label: 'running economy test',
    kind: 'equipment',
    reason:
      'Braucht Spiroergometrie: Laufökonomie ist der Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und ohne Atemgasmessung nicht bestimmbar.',
  },
  {
    disciplineId: 'half_marathon',
    label: 'economy test',
    kind: 'equipment',
    reason:
      'Braucht Spiroergometrie: Laufökonomie ist der Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und ohne Atemgasmessung nicht bestimmbar.',
  },
  {
    disciplineId: 'marathon',
    label: 'body composition',
    kind: 'elsewhere',
    reason:
      'Körperzusammensetzung wird als Körperwert erfasst und im Zeitverlauf geführt, nicht als Test durchgeführt. Sie steht im Profil unter den Körperwerten.',
  },
  {
    disciplineId: 'marathon',
    label: 'running economy',
    kind: 'equipment',
    reason:
      'Braucht Spiroergometrie: Laufökonomie ist der Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und ohne Atemgasmessung nicht bestimmbar.',
  },
  {
    disciplineId: 'marathon',
    label: 'pace variance metrics',
    kind: 'buildable',
    reason:
      'Braucht Rundenzeiten oder eine GPS-Datei je Wettkampf. Die App erfasst heute Ergebnisse, keine Verläufe innerhalb eines Tests.',
  },
  {
    disciplineId: 'ultramarathon',
    label: 'fuel management',
    kind: 'no_protocol',
    reason:
      'Verpflegungsverträglichkeit ist eine Ernährungsfrage und keine Leistungsmessung. BASELINE gibt keine Ernährungsempfehlungen ab; ein Testergebnis dazu hätte hier keine Folge.',
  },
  {
    disciplineId: 'time_trial',
    label: 'aero position tests',
    kind: 'equipment',
    reason:
      'Braucht Windkanal oder Leistungsmessung mit Geschwindigkeitsprofil auf gesperrter Strecke. Beides ist keine Feldmessung.',
  },
  {
    disciplineId: 'mtb',
    label: 'technical terrain test',
    kind: 'no_protocol',
    reason:
      'Eine Zeit auf einer technischen Strecke misst die Strecke mit. Ohne festgelegte, wiederholbare Strecke ist der Wert zwischen zwei Terminen nicht vergleichbar; die App kann keine Strecke vorgeben.',
  },
  {
    disciplineId: 'gravel',
    label: 'terrain variability',
    kind: 'no_protocol',
    reason:
      'Wie beim Mountainbike: ohne festgelegte, wiederholbare Strecke misst der Wert das Gelände mit und nicht den Athleten.',
  },
  {
    disciplineId: 'open_water',
    label: 'drafting simulation',
    kind: 'no_protocol',
    reason:
      'Windschattenschwimmen braucht mindestens einen zweiten Schwimmer und misst dessen Tempo mit. Als Einzelmessung nicht wiederholbar.',
  },
  {
    disciplineId: 'open_water',
    label: 'feeding/temperature markers',
    kind: 'no_protocol',
    reason:
      'Verpflegung und Wassertemperatur sind Rahmenbedingungen, keine Leistung. Sie gehören zu den Messbedingungen eines Ergebnisses und werden dort erfasst.',
  },
  {
    disciplineId: 'triathlon_70_3',
    label: 'nutrition tolerance',
    kind: 'no_protocol',
    reason:
      'Verpflegungsverträglichkeit ist eine Ernährungsfrage und keine Leistungsmessung; BASELINE gibt dazu keine Empfehlungen ab.',
  },
  {
    disciplineId: 'triathlon_ironman',
    label: 'nutrition tolerance',
    kind: 'no_protocol',
    reason:
      'Verpflegungsverträglichkeit ist eine Ernährungsfrage und keine Leistungsmessung; BASELINE gibt dazu keine Empfehlungen ab.',
  },
]

/** Die offenen Lücken, wie sie im Bericht erscheinen. */
export function openGaps(): DocumentGap[] {
  return DOCUMENT_GAPS
}

export type Provenance = 'document' | 'concept' | 'addition' | 'unknown'

/**
 * Woher kommt die Zuordnung dieses Tests zu dieser Disziplin?
 *
 * `unknown` heisst: dieser Test steht nicht in der Liste dieser Disziplin.
 * Ein Absturz wäre hier die schlechtere Antwort als eine fehlende Angabe.
 */
export function provenanceOf(disciplineId: string, slug: string): Provenance {
  return disciplineById(disciplineId)?.tests.find((t) => t.slug === slug)?.provenance ?? 'unknown'
}

/** Begründung einer Ergänzung; bei Dokumenttests null. */
export function additionReason(disciplineId: string, slug: string): string | null {
  const entry = disciplineById(disciplineId)?.tests.find((t) => t.slug === slug)
  return entry?.provenance === 'addition' ? (entry.reason ?? null) : null
}

/** Die Bezeichnung in der Quelle, sofern der Test aus Dokument oder Konzept stammt. */
export function documentLabelOf(disciplineId: string, slug: string): string | null {
  const entry = disciplineById(disciplineId)?.tests.find((t) => t.slug === slug)
  return entry?.provenance === 'document' || entry?.provenance === 'concept'
    ? (entry.documentLabel ?? null)
    : null
}

/** Disziplinen, für die das Dokument Tests nennt, die die App nicht hat. */
export function disciplinesWithGaps(): string[] {
  const withGaps = new Set(DOCUMENT_GAPS.map((g) => g.disciplineId))
  return DISCIPLINES.filter((d) => withGaps.has(d.id)).map((d) => d.id)
}
