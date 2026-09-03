import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Check, Plus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { DurationField } from '@/components/ui/DurationField'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SportList } from './SportList'
import { useAppData } from '@/lib/store/AppDataProvider'
import { disciplineById } from '@/data/sportProfiles'
import { getTest } from '@/data/testCatalog'
import { EQUIPMENT_PRESETS, equipmentFor } from '@/data/equipmentPresets'
import { writeOwnedEquipment } from '@/features/tests/EquipmentFilter'
import { GOAL_KEYS, type GoalKey } from '@/lib/store/schema'
import { PERFORMANCE_LEVELS, type PerformanceLevel, type Sex } from '@/types/domain'
import { newId } from '@/lib/store/localStore'
import { ageFromBirthDate } from '@/lib/format'
import { ageClass } from '@/domain/ageClass'
import { DEFAULT_RETEST_DAYS } from '@/domain/nextTest'
import { buildDiagnosticProfile, type RankedTest } from '@/domain/diagnosticProfile'
import { parseCsv, previewImport, suggestRoles } from '@/lib/csvImport'
import { cn } from '@/lib/utils'

/**
 * Der Einstieg (Konzept §3).
 *
 * DER LEITGEDANKE: jede Frage sagt, was sie freischaltet. Diese App
 * vergleicht einen Menschen mit benannten Referenzgruppen — ohne Geschlecht
 * passt keine, ohne Geburtsdatum keine Altersklasse, ohne Sportart keine
 * Athletenkohorte. Steht das an der Frage, ist es keine Datensammelei mehr,
 * sondern ein nachvollziehbarer Handel.
 *
 * Neun Schritte für den Einzelnutzer:
 *
 *   1  Was BASELINE ist — und was nicht (§82)
 *   2  Für dich oder für andere? — die Weiche Solo/Trainer
 *   3  Person       — Pflicht: Geschlecht, Geburtsdatum, Grösse, Gewicht
 *   4  Sportart     — eine Hauptsportart, dazu beliebig viele weitere
 *   5  Ziel
 *   6  Wo du testest — füllt den Ausrüstungsfilter vor
 *   7  Wie oft      — Wiederholabstand und Erinnerungen
 *   8  Vorhandene Werte — eintragen oder aus einer Tabelle übernehmen
 *   9  Startplan    — drei Tests mit Begründung, dann der erste Termin
 *
 * Der Trainer bekommt einen kürzeren Weg: er richtet nicht sich selbst ein,
 * sondern seine Athleten. Ihn durch einen Fragebogen über seinen eigenen
 * Körper zu schicken wäre der falsche Fragebogen an die falsche Person.
 *
 * FORTSETZBAR: jeder Schritt schreibt sofort in den Bestand, und der Stand
 * liegt in `profile.onboardingStep`. Wer bei Schritt sechs das Telefon
 * weglegt, steht beim nächsten Öffnen bei Schritt sechs. Der frühere Ablauf
 * hielt alles im Zustand des Bildschirms — ein Neuladen kostete alles.
 *
 * Als abgeschlossen gilt der Einstieg erst, wenn der Startplan verlassen
 * wurde. Stünde der Abschluss schon beim Speichern im Bestand, übernähme die
 * App sofort, und der Plan — der eigentliche Ertrag — erschiene nie.
 */

const SOLO_STEPS = [
  'intro',
  'role',
  'person',
  'sport',
  'goal',
  'equipment',
  'rhythm',
  'existing',
  'plan',
] as const
const COACH_STEPS = ['intro', 'role', 'athletes', 'plan'] as const
type Step = (typeof SOLO_STEPS)[number] | (typeof COACH_STEPS)[number]

interface Draft {
  sex: Sex | null
  birthDate: string
  heightCm: number | null
  weightKg: number | null
  trainingAgeYears: number | null
  sessionsPerWeek: number | null
  performanceLevel: PerformanceLevel | null
  disciplineId: string | null
  additionalDisciplineIds: string[]
  goalKey: GoalKey | null
  presets: string[]
  retestDays: number
  remindersEnabled: boolean
  existing: Record<string, number | null>
  athleteNames: string[]
}

export function OnboardingFlow({ onDone }: { onDone: (path: string) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const { data, role, setRole, addAthlete, saveProfile, saveBiometric, recordResult, saveAssessment } =
    useAppData()

  const [index, setIndex] = useState(() => data.profile.onboardingStep)
  const [draft, setDraft] = useState<Draft>(() => ({
    sex: data.profile.sex,
    birthDate: data.profile.birthDate ?? '',
    heightCm: data.profile.heightCm,
    weightKg: data.biometrics.find((b) => b.bodyWeightKg != null)?.bodyWeightKg ?? null,
    trainingAgeYears: data.profile.trainingAgeYears,
    sessionsPerWeek: data.profile.sessionsPerWeek,
    performanceLevel: data.profile.performanceLevel,
    disciplineId: data.profile.disciplineId,
    additionalDisciplineIds: data.profile.additionalDisciplineIds,
    goalKey: data.profile.goalKey,
    presets: [],
    retestDays: DEFAULT_RETEST_DAYS,
    remindersEnabled: false,
    existing: {},
    athleteNames: [],
  }))
  const [csvCount, setCsvCount] = useState<number | null>(null)
  const [csvRows, setCsvRows] = useState<{ day: string; testSlug: string; value: number }[]>([])
  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }))

  const steps = role === 'coach' ? COACH_STEPS : SOLO_STEPS
  const clamped = Math.min(index, steps.length - 1)
  const step: Step = steps[clamped]
  const age = ageFromBirthDate(draft.birthDate || null)

  const missing = [
    draft.sex == null && t('profile.sex'),
    !draft.birthDate && t('profile.birthDate'),
    draft.heightCm == null && t('profile.height'),
    draft.weightKg == null && t('onboarding.profile.weight'),
  ].filter((x): x is string => typeof x === 'string')

  const canContinue =
    step === 'person'
      ? missing.length === 0
      : step === 'sport'
        ? draft.disciplineId != null
        : true

  /**
   * Tests, für die sich ein vorhandener Wert direkt eintragen lässt: genau
   * ein Pflichtfeld, und das ist der Primärwert. Ein SJFT mit fünf Feldern
   * gehört nicht hierher — der wird mit vollem Protokoll erfasst.
   */
  const quickTests = useMemo(() => {
    const profile = buildDiagnosticProfile({
      disciplineId: draft.disciplineId,
      sex: draft.sex,
      birthDate: draft.birthDate || null,
      results: [],
    })
    return profile.ranked
      .map((entry) => getTest(entry.slug))
      .filter((test) => {
        if (!test) return false
        const required = test.fields.filter((f) => f.required)
        return required.length === 1 && required[0].key === test.primaryMetric
      })
      .map((test) => test!)
  }, [draft.disciplineId, draft.sex, draft.birthDate])

  /** Was der Schritt gesammelt hat, sofort in den Bestand. */
  const persist = (nextIndex: number) => {
    const today = new Date().toISOString().slice(0, 10)
    const discipline = draft.disciplineId ? disciplineById(draft.disciplineId) : undefined

    if (step === 'person') {
      saveProfile({
        sex: draft.sex,
        birthDate: draft.birthDate || null,
        heightCm: draft.heightCm,
        trainingAgeYears: draft.trainingAgeYears,
        sessionsPerWeek: draft.sessionsPerWeek,
        performanceLevel: draft.performanceLevel,
        onboardingStep: nextIndex,
      })
      if (draft.weightKg != null) {
        saveBiometric({
          measuredOn: today,
          bodyWeightKg: draft.weightKg,
          bodyFatPercent: null,
          restingHr: null,
        })
      }
      return
    }
    if (step === 'sport') {
      saveProfile({
        disciplineId: discipline?.id ?? null,
        sportCategoryId: discipline?.categoryId ?? null,
        additionalDisciplineIds: draft.additionalDisciplineIds,
        onboardingStep: nextIndex,
      })
      return
    }
    if (step === 'goal') {
      saveProfile({ goalKey: draft.goalKey, onboardingStep: nextIndex })
      return
    }
    if (step === 'equipment') {
      // Die Ausrüstung gehört zum Ort, nicht zur Person (§50) — sie liegt
      // deshalb neben dem Bestand und nicht im Profil.
      writeOwnedEquipment(new Set(equipmentFor(draft.presets)))
      saveProfile({ onboardingStep: nextIndex })
      return
    }
    if (step === 'rhythm') {
      const slugs = buildDiagnosticProfile({
        disciplineId: draft.disciplineId,
        sex: draft.sex,
        birthDate: draft.birthDate || null,
        results: [],
      }).recommendedStart.map((entry) => entry.slug)
      const intervals: Record<string, number> = { ...data.profile.reminderIntervalDays }
      for (const slug of slugs) intervals[slug] = draft.retestDays
      saveProfile({
        remindersEnabled: draft.remindersEnabled,
        reminderIntervalDays: intervals,
        onboardingStep: nextIndex,
      })
      return
    }
    if (step === 'existing') {
      for (const [slug, value] of Object.entries(draft.existing)) {
        const test = getTest(slug)
        if (!test || value == null || !Number.isFinite(value)) continue
        recordResult({
          testSlug: slug,
          performedAt: new Date(`${today}T12:00:00`).toISOString(),
          values: { [test.primaryMetric]: value },
        })
      }
      for (const row of csvRows) {
        const test = getTest(row.testSlug)
        if (!test) continue
        recordResult({
          testSlug: row.testSlug,
          performedAt: new Date(`${row.day}T12:00:00`).toISOString(),
          values: { [test.primaryMetric]: row.value },
          notes: t('csvImport.noteMarker'),
        })
      }
      setCsvRows([])
      saveProfile({ onboardingStep: nextIndex })
      return
    }
    saveProfile({ onboardingStep: nextIndex })
  }

  const next = () => {
    const nextIndex = Math.min(clamped + 1, steps.length - 1)
    persist(nextIndex)
    setIndex(nextIndex)
  }
  const back = () => {
    const prev = Math.max(0, clamped - 1)
    saveProfile({ onboardingStep: prev })
    setIndex(prev)
  }

  if (step === 'plan') {
    return (
      <PlanStep
        draft={draft}
        onDone={onDone}
        onBack={back}
        coach={role === 'coach'}
        saveAssessment={saveAssessment}
      />
    )
  }

  const readCsv = (file: File) => {
    void file.text().then((text) => {
      const table = parseCsv(text)
      if (!table) {
        setCsvCount(0)
        setCsvRows([])
        return
      }
      const preview = previewImport(table, suggestRoles(table.headers))
      setCsvCount(preview.rows.length)
      setCsvRows(preview.rows.map(({ day, testSlug, value }) => ({ day, testSlug, value })))
    })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="shrink-0 border-b-2 border-ink pb-4">
        <span className="label-tag">
          {t('onboarding.stepOf', { step: clamped + 1, total: steps.length })}
        </span>
        <h1 className="mt-1.5 font-display text-[30px] leading-none font-bold uppercase sm:text-[40px]">
          {t(`onboarding.${step}.title`)}
        </h1>
        <p className="mt-2.5 max-w-[56ch] text-[14px] leading-relaxed text-ink-secondary">
          {t(`onboarding.${step}.body`)}
        </p>
      </header>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {step === 'intro' && <IntroStep />}

        {step === 'role' && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {(['solo', 'coach'] as const).map((option) => (
              <li key={option}>
                <button
                  type="button"
                  aria-pressed={role === option}
                  onClick={() => setRole(option)}
                  className={cn(
                    'flex min-h-24 w-full flex-col items-start gap-1 border px-4 py-3 text-left transition-colors',
                    role === option
                      ? 'border-accent bg-accent-quiet'
                      : 'border-line hover:bg-accent-quiet',
                  )}
                >
                  <span className="text-[16px] font-medium">
                    {t(`onboarding.role.options.${option}.label`)}
                  </span>
                  <span className="text-[13px] leading-snug text-ink-secondary">
                    {t(`onboarding.role.options.${option}.hint`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {step === 'person' && (
          <ProfileStep draft={draft} patch={patch} age={age} missing={missing} />
        )}

        {step === 'sport' && (
          <div className="space-y-4">
            {/* Nach der Wahl klappt die Hauptliste zusammen. Zwei
                vollständige Sportartenlisten übereinander sind lang, und
                dieselbe Sportart stünde zweimal da. */}
            {draft.disciplineId ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border border-accent bg-accent-quiet px-4 py-3">
                <span className="text-[15px]">
                  <span className="label-tag block">{t('onboarding.sport.main')}</span>
                  {disciplineById(draft.disciplineId)?.name[lang]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => patch({ disciplineId: null })}
                >
                  {t('onboarding.sport.change')}
                </Button>
              </div>
            ) : (
              <div>
                <h2 className="label-tag mb-2">{t('onboarding.sport.main')}</h2>
                <SportList
                  selected={[]}
                  onToggle={(id) =>
                    patch({
                      disciplineId: id,
                      additionalDisciplineIds: draft.additionalDisciplineIds.filter((x) => x !== id),
                    })
                  }
                  autoFocus
                />
              </div>
            )}
            {draft.disciplineId && (
              <div>
                <h2 className="label-tag mb-1">{t('onboarding.sport.more')}</h2>
                <p className="mb-2 text-[12px] text-ink-muted">
                  {draft.additionalDisciplineIds.length === 0
                    ? t('onboarding.additional.none')
                    : t('onboarding.additional.count', {
                        count: draft.additionalDisciplineIds.length,
                      })}
                </p>
                <SportList
                  multiple
                  selected={draft.additionalDisciplineIds}
                  exclude={[draft.disciplineId]}
                  onToggle={(id) =>
                    patch({
                      additionalDisciplineIds: draft.additionalDisciplineIds.includes(id)
                        ? draft.additionalDisciplineIds.filter((x) => x !== id)
                        : [...draft.additionalDisciplineIds, id],
                    })
                  }
                />
              </div>
            )}
          </div>
        )}

        {step === 'goal' && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {GOAL_KEYS.map((key) => {
              const active = draft.goalKey === key
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch({ goalKey: active ? null : key })}
                    className={cn(
                      'flex min-h-12 w-full items-center justify-between gap-3 border px-4 py-3 text-left text-[15px] transition-colors',
                      active ? 'border-accent bg-accent-quiet' : 'border-line hover:bg-accent-quiet',
                    )}
                  >
                    {t(`onboarding.goal.options.${key}`)}
                    {active && <Check size={16} className="shrink-0 text-accent-text" aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {step === 'equipment' && (
          <div className="space-y-3">
            <ul className="grid gap-2 sm:grid-cols-2">
              {EQUIPMENT_PRESETS.map((preset) => {
                const active = draft.presets.includes(preset.id)
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        patch({
                          presets: active
                            ? draft.presets.filter((x) => x !== preset.id)
                            : [...draft.presets, preset.id],
                        })
                      }
                      className={cn(
                        'flex min-h-20 w-full flex-col items-start gap-1 border px-4 py-3 text-left transition-colors',
                        active
                          ? 'border-accent bg-accent-quiet'
                          : 'border-line hover:bg-accent-quiet',
                      )}
                    >
                      <span className="text-[15px] font-medium">{preset.name[lang]}</span>
                      <span className="text-[12px] leading-snug text-ink-secondary">
                        {preset.hint[lang]}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              {t('onboarding.equipment.hint')}
            </p>
          </div>
        )}

        {step === 'rhythm' && (
          <div className="space-y-5">
            <div>
              <span className="label-tag">{t('onboarding.rhythm.interval')}</span>
              <div className="mt-1.5">
                <SegmentedControl<string>
                  label={t('onboarding.rhythm.interval')}
                  value={String(draft.retestDays)}
                  onChange={(value) => patch({ retestDays: Number(value) })}
                  options={[
                    { value: '28', label: t('onboarding.rhythm.monthly') },
                    { value: '42', label: t('onboarding.rhythm.sixWeeks') },
                    { value: '91', label: t('onboarding.rhythm.quarterly') },
                    { value: '182', label: t('onboarding.rhythm.halfYear') },
                  ]}
                />
              </div>
            </div>
            <label className="flex min-h-11 items-start gap-3 text-[14px]">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0"
                checked={draft.remindersEnabled}
                onChange={(e) => patch({ remindersEnabled: e.target.checked })}
              />
              <span>
                {t('onboarding.rhythm.remind')}
                <span className="mt-1 block text-[12px] leading-relaxed text-ink-muted">
                  {t('reminders.noPush')}
                </span>
              </span>
            </label>
          </div>
        )}

        {step === 'existing' && (
          <div className="space-y-4">
            <div className="border border-line px-4 py-3">
              <h2 className="label-tag">{t('onboarding.existing.fromTable')}</h2>
              <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[14px]">
                <Upload size={16} aria-hidden />
                <span>{t('csvImport.choose')}</span>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  aria-label={t('csvImport.choose')}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) readCsv(file)
                  }}
                />
              </label>
              {csvCount != null && (
                <p role="status" className="mt-1 text-[13px] text-ink-secondary">
                  {csvCount === 0
                    ? t('onboarding.existing.csvNone')
                    : t('onboarding.existing.csvFound', { count: csvCount })}
                </p>
              )}
            </div>

            {quickTests.length === 0 ? (
              <p className="text-[13px] text-ink-secondary">{t('onboarding.existing.none')}</p>
            ) : (
              <div className="space-y-4">
                <h2 className="label-tag">{t('onboarding.existing.byHand')}</h2>
                {quickTests.map((test) => {
                  const field = test.fields.find((f) => f.key === test.primaryMetric)!
                  const value = draft.existing[test.slug] ?? null
                  const set = (v: number | null) =>
                    patch({ existing: { ...draft.existing, [test.slug]: v } })
                  return field.type === 'duration' ? (
                    <DurationField
                      key={test.slug}
                      label={test.name[lang]}
                      value={value}
                      onChange={set}
                    />
                  ) : (
                    <NumberField
                      key={test.slug}
                      label={test.name[lang]}
                      unit={field.unit}
                      value={value}
                      onChange={set}
                      min={field.min}
                      max={field.max}
                      step={field.step ?? (field.type === 'integer' ? 1 : 0.1)}
                    />
                  )
                })}
              </div>
            )}
            <p className="text-[12px] leading-relaxed text-ink-muted">
              {t('onboarding.existing.hint')}
            </p>
          </div>
        )}

        {step === 'athletes' && (
          <AthletesStep
            names={draft.athleteNames}
            onChange={(athleteNames) => patch({ athleteNames })}
            onCreate={addAthlete}
            existing={data.profile.firstName ? 1 : 0}
          />
        )}
      </div>

      <footer className="mt-4 flex shrink-0 items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="ghost" onClick={back} disabled={clamped === 0}>
          <ArrowLeft size={15} aria-hidden />
          {t('onboarding.back')}
        </Button>
        <div className="flex items-center gap-2">
          {(step === 'goal' || step === 'equipment' || step === 'existing') && (
            <Button variant="ghost" onClick={next}>
              {t('onboarding.skip')}
            </Button>
          )}
          <Button variant="primary" onClick={next} disabled={!canContinue}>
            {t('onboarding.next')}
            <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </footer>
    </div>
  )
}

/** Was die App ist — und was sie ausdrücklich nicht ist (§81, §82). */
function IntroStep() {
  const { t } = useTranslation()
  return (
    <ul className="space-y-3">
      {(['measures', 'compares', 'notPlan', 'notMedical', 'onDevice'] as const).map((key) => (
        <li key={key} className="flex gap-3 border-l-2 border-accent bg-accent-quiet px-4 py-3">
          <span className="text-[14px] leading-relaxed">{t(`onboarding.intro.points.${key}`)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Der Trainer legt seine Athleten an, statt sich selbst einzurichten. */
function AthletesStep({
  names,
  onChange,
  onCreate,
  existing,
}: {
  names: string[]
  onChange: (names: string[]) => void
  onCreate: (name: string, options?: { activate?: boolean }) => string
  existing: number
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')

  const add = () => {
    const name = value.trim()
    if (!name) return
    // Nicht aktivieren: der Einstieg läuft auf dem Bestand des Trainers, und
    // ein Wechsel mitten im Ablauf zöge ihm den Boden weg.
    onCreate(name, { activate: false })
    onChange([...names, name])
    setValue('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="label-tag">{t('onboarding.athletes.name')}</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>
        <Button variant="outline" onClick={add} disabled={value.trim() === ''}>
          <Plus size={15} aria-hidden />
          {t('onboarding.athletes.add')}
        </Button>
      </div>

      {names.length === 0 ? (
        <p className="text-[13px] text-ink-secondary">{t('onboarding.athletes.none')}</p>
      ) : (
        <ul className="divide-y divide-line border border-line">
          {names.map((name, i) => (
            <li key={`${name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
              <Check size={15} className="shrink-0 text-accent-text" aria-hidden />
              {name}
            </li>
          ))}
        </ul>
      )}
      {existing > 0 && (
        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-muted">
          <X size={14} className="mt-0.5 shrink-0" aria-hidden />
          {t('onboarding.athletes.firstIsYou')}
        </p>
      )}
      <p className="text-[12px] leading-relaxed text-ink-muted">{t('onboarding.athletes.hint')}</p>
    </div>
  )
}

function ProfileStep({
  draft,
  patch,
  age,
  missing,
}: {
  draft: Draft
  patch: (next: Partial<Draft>) => void
  age: number | null
  missing: string[]
}) {
  const { t } = useTranslation()
  const klass = ageClass(age)
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="space-y-4">
        <h2 className="label-tag">{t('onboarding.profile.required')}</h2>
        <div>
          <span className="label-tag">{t('profile.sex')}</span>
          <div className="mt-1.5">
            <SegmentedControl<Sex>
              label={t('profile.sex')}
              value={draft.sex ?? ('' as Sex)}
              onChange={(sex) => patch({ sex })}
              options={[
                { value: 'male', label: t('profile.male') },
                { value: 'female', label: t('profile.female') },
                { value: 'other', label: t('profile.otherSex') },
              ]}
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">{t('profile.sexHint')}</p>
        </div>
        <label className="block">
          <span className="label-tag">{t('profile.birthDate')}</span>
          <input
            type="date"
            value={draft.birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => patch({ birthDate: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
          <span className="mt-1 block text-[11px] leading-snug text-ink-muted">
            {age != null
              ? `${t('onboarding.profile.age')}: ${age} ${t('onboarding.profile.years')}${klass ? ` · ${t('onboarding.profile.ageClass')}: ${t(`ageClass.${klass}`)}` : ''}`
              : t('onboarding.profile.birthDateWhy')}
          </span>
        </label>
        <NumberField label={t('profile.height')} unit="cm" value={draft.heightCm} onChange={(v) => patch({ heightCm: v })} min={80} max={260} step={1} required />
        <NumberField label={t('onboarding.profile.weight')} unit="kg" value={draft.weightKg} onChange={(v) => patch({ weightKg: v })} min={20} max={400} step={0.1} required />
        <p className="text-[12px] leading-relaxed text-ink-muted">
          {t('onboarding.profile.weightWhy')}
        </p>
        {missing.length > 0 && (
          <p className="text-[12px] text-ink-muted" role="status">
            {t('onboarding.profile.missing', { fields: missing.join(', ') })}
          </p>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="label-tag">{t('onboarding.profile.optional')}</h2>
        <NumberField label={t('onboarding.profile.trainingYears')} value={draft.trainingAgeYears} onChange={(v) => patch({ trainingAgeYears: v })} min={0} max={70} step={1} />
        <NumberField label={t('onboarding.profile.sessionsPerWeek')} value={draft.sessionsPerWeek} onChange={(v) => patch({ sessionsPerWeek: v })} min={0} max={21} step={1} />
        <label className="block">
          <span className="label-tag">{t('onboarding.profile.level')}</span>
          <select
            value={draft.performanceLevel ?? ''}
            onChange={(e) => patch({ performanceLevel: (e.target.value || null) as PerformanceLevel | null })}
            className="mt-1.5 h-11 w-full min-w-0 border border-line bg-surface-sunken px-3 text-[16px]"
          >
            <option value="">{t('onboarding.profile.levelNone')}</option>
            {PERFORMANCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`profile.level.${level}`)}
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  )
}

/**
 * Der Startplan — und der erste Termin.
 *
 * Der Einstieg endet nicht in einer leeren Übersicht, sondern mit einer
 * angelegten Diagnostik. Wer hier ankommt, hat etwas vor sich.
 */
function PlanStep({
  draft,
  onDone,
  onBack,
  coach,
  saveAssessment,
}: {
  draft: Draft
  onDone: (path: string) => void
  onBack: () => void
  coach: boolean
  saveAssessment: ReturnType<typeof useAppData>['saveAssessment']
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const { data, saveProfile } = useAppData()
  const discipline = draft.disciplineId ? disciplineById(draft.disciplineId) : undefined

  const profile = buildDiagnosticProfile({
    disciplineId: draft.disciplineId,
    sex: draft.sex,
    birthDate: draft.birthDate || null,
    results: data.results,
  })

  const leave = (path: string) => {
    // Der Schrittstand geht zurück auf null: ein erneuter Durchlauf soll
    // wieder am Anfang beginnen, nicht am Ende hängen bleiben.
    saveProfile({ onboardingCompletedAt: new Date().toISOString(), onboardingStep: 0 })
    onDone(path)
  }

  const startAssessment = () => {
    const id = newId()
    const today = new Date().toISOString().slice(0, 10)
    saveAssessment({
      id,
      title: discipline ? discipline.name.de : t('onboarding.plan.firstTitle'),
      batterySlug: null,
      performedOn: today,
      status: 'in_progress',
      plannedTestSlugs: profile.recommendedStart.map((entry) => entry.slug),
      readiness: null,
      nextAssessmentOn: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    })
    leave(`/diagnostik/${id}`)
  }

  const row = (entry: RankedTest, position?: number) => {
    const test = getTest(entry.slug)
    if (!test) return null
    return (
      <li key={entry.slug} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0">
        {position != null && (
          <span className="readout w-6 shrink-0 text-[20px] leading-none text-accent-text">{position}</span>
        )}
        <div className="min-w-0">
          <p className="font-medium">{test.name[lang]}</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {entry.reasons.map((r) => t(`onboarding.result.reasons.${r}`)).join(' · ')}
          </p>
        </div>
      </li>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="shrink-0 border-b-2 border-ink pb-4">
        <span className="label-tag">{t('onboarding.result.eyebrow')}</span>
        <h1 className="mt-1.5 font-display text-[30px] leading-none font-bold uppercase sm:text-[40px]">
          {discipline
            ? t('onboarding.result.title', { sport: discipline.name[lang] })
            : t('onboarding.result.titleGeneral')}
        </h1>
        <p className="mt-2.5 text-[14px] text-ink-secondary">
          {coach
            ? t('onboarding.plan.coachBody')
            : t('onboarding.result.found', { count: profile.ranked.length })}
        </p>
      </header>

      <div className="mt-4 space-y-4">
        {!coach && (
          <>
            <section className="panel panel-ticked">
              <h2 className="label-tag border-b border-line px-4 py-3">{t('onboarding.result.start')}</h2>
              <ul>{profile.recommendedStart.map((entry, i) => row(entry, i + 1))}</ul>
            </section>
            {profile.further.length > 0 && (
              <section className="panel">
                <h2 className="label-tag border-b border-line px-4 py-3">{t('onboarding.result.further')}</h2>
                <ul>{profile.further.map((entry) => row(entry))}</ul>
              </section>
            )}
          </>
        )}
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          {coach ? t('onboarding.plan.coachHint') : t('onboarding.result.body')}
        </p>
      </div>

      <footer className="mt-6 flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden />
          {t('onboarding.back')}
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => leave('/')}>
            {t('onboarding.toOverview')}
          </Button>
          {coach ? (
            <Button variant="primary" onClick={() => leave('/trainer')}>
              {t('onboarding.plan.toCoach')}
              <ArrowRight size={15} aria-hidden />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={startAssessment}
              disabled={profile.recommendedStart.length === 0}
            >
              {t('onboarding.plan.startFirst')}
              <ArrowRight size={15} aria-hidden />
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
