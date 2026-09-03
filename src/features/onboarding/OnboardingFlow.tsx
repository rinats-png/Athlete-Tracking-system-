import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { DurationField } from '@/components/ui/DurationField'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SportList } from './SportList'
import { useAppData } from '@/lib/store/AppDataProvider'
import { disciplineById } from '@/data/sportProfiles'
import { getTest } from '@/data/testCatalog'
import { GOAL_KEYS, type GoalKey } from '@/lib/store/schema'
import { PERFORMANCE_LEVELS, type PerformanceLevel, type Sex } from '@/types/domain'
import { ageFromBirthDate } from '@/lib/format'
import { ageClass } from '@/domain/ageClass'
import { buildDiagnosticProfile, type RankedTest } from '@/domain/diagnosticProfile'
import { cn } from '@/lib/utils'

/**
 * Der Einstieg (Konzept §3): sechs Schritte, danach das Diagnostikprofil.
 *
 *   1  Willkommen          — der Willkommensbildschirm davor
 *   2  Persönliches Profil — Pflicht: Geschlecht, Geburtsdatum, Grösse, Gewicht
 *   3  Hauptsportart
 *   4  Weitere Sportarten  — freiwillig
 *   5  Ziel                — freiwillig
 *   6  Vorhandene Werte    — freiwillig
 *   →  Diagnostikprofil    — «8 relevante Tests gefunden, drei zum Start»
 *
 * Gespeichert wird erst am Ende, in einem Zug. Wer den Ablauf abbricht,
 * hinterlässt keinen halben Bestand — und wer zurückgeht, verliert nichts,
 * weil alles bis dahin im Zustand dieses Bildschirms liegt.
 *
 * Als abgeschlossen gilt der Einstieg erst, wenn das Diagnostikprofil
 * gelesen und verlassen wurde. Stünde der Abschluss schon beim Speichern
 * im Bestand, übernähme die App sofort — und das Profil, der eigentliche
 * Ertrag des Einstiegs, erschiene nie.
 *
 * Die Pflichtangaben sind Pflicht, weil ohne sie keine Referenzgruppe passt.
 * Ein Test ohne Geschlecht und Alter lässt sich speichern, aber nicht
 * einordnen — und Einordnen ist, was diese App verspricht.
 */

const STEPS = ['profile', 'sport', 'additional', 'goal', 'existing'] as const
type Step = (typeof STEPS)[number]
/** Schritt 1 ist der Willkommensbildschirm; die Zählung läuft weiter. */
const STEP_OFFSET = 2
const TOTAL_STEPS = STEPS.length + 1

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
  existing: Record<string, number | null>
}

export function OnboardingFlow({ onDone }: { onDone: (target: 'overview' | 'tests') => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const { data, saveProfile, saveBiometric, recordResult } = useAppData()

  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => ({
    sex: data.profile.sex,
    birthDate: data.profile.birthDate ?? '',
    heightCm: data.profile.heightCm,
    weightKg: null,
    trainingAgeYears: data.profile.trainingAgeYears,
    sessionsPerWeek: data.profile.sessionsPerWeek,
    performanceLevel: data.profile.performanceLevel,
    disciplineId: data.profile.disciplineId,
    additionalDisciplineIds: data.profile.additionalDisciplineIds,
    goalKey: data.profile.goalKey,
    existing: {},
  }))
  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }))

  const step: Step = STEPS[index]
  const age = ageFromBirthDate(draft.birthDate || null)

  const missing = [
    draft.sex == null && t('profile.sex'),
    !draft.birthDate && t('profile.birthDate'),
    draft.heightCm == null && t('profile.height'),
    draft.weightKg == null && t('onboarding.profile.weight'),
  ].filter((x): x is string => typeof x === 'string')

  const canContinue =
    step === 'profile' ? missing.length === 0 : step === 'sport' ? draft.disciplineId != null : true

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

  const finish = () => {
    const discipline = draft.disciplineId ? disciplineById(draft.disciplineId) : undefined
    const today = new Date().toISOString().slice(0, 10)
    saveProfile({
      sex: draft.sex,
      birthDate: draft.birthDate || null,
      heightCm: draft.heightCm,
      trainingAgeYears: draft.trainingAgeYears,
      sessionsPerWeek: draft.sessionsPerWeek,
      performanceLevel: draft.performanceLevel,
      disciplineId: discipline?.id ?? null,
      sportCategoryId: discipline?.categoryId ?? null,
      additionalDisciplineIds: draft.additionalDisciplineIds,
      goalKey: draft.goalKey,
    })
    if (draft.weightKg != null) {
      saveBiometric({ measuredOn: today, bodyWeightKg: draft.weightKg, bodyFatPercent: null, restingHr: null })
    }
    for (const [slug, value] of Object.entries(draft.existing)) {
      const test = getTest(slug)
      if (!test || value == null || !Number.isFinite(value)) continue
      recordResult({
        testSlug: slug,
        performedAt: new Date(`${today}T12:00:00`).toISOString(),
        values: { [test.primaryMetric]: value },
      })
    }
    setFinished(true)
  }

  if (finished) {
    return <DiagnosticProfileResult draft={draft} onDone={onDone} />
  }

  const next = () => (index === STEPS.length - 1 ? finish() : setIndex(index + 1))
  const back = () => setIndex(Math.max(0, index - 1))

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="shrink-0 border-b-2 border-ink pb-4">
        <span className="label-tag">
          {t('onboarding.stepOf', { step: index + STEP_OFFSET, total: TOTAL_STEPS })}
        </span>
        <h1 className="mt-1.5 font-display text-[30px] leading-none font-bold uppercase sm:text-[40px]">
          {t(`onboarding.${step}.title`)}
        </h1>
        <p className="mt-2.5 max-w-[56ch] text-[14px] leading-relaxed text-ink-secondary">
          {t(`onboarding.${step}.body`)}
        </p>
      </header>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {step === 'profile' && (
          <ProfileStep draft={draft} patch={patch} age={age} missing={missing} />
        )}
        {step === 'sport' && (
          <SportList
            selected={draft.disciplineId ? [draft.disciplineId] : []}
            onToggle={(id) =>
              patch({
                disciplineId: id,
                additionalDisciplineIds: draft.additionalDisciplineIds.filter((x) => x !== id),
              })
            }
            autoFocus
          />
        )}
        {step === 'additional' && (
          <>
            <p className="mb-2 text-[12px] text-ink-muted">
              {draft.additionalDisciplineIds.length === 0
                ? t('onboarding.additional.none')
                : t('onboarding.additional.count', { count: draft.additionalDisciplineIds.length })}
            </p>
            <SportList
              multiple
              selected={draft.additionalDisciplineIds}
              exclude={draft.disciplineId ? [draft.disciplineId] : []}
              onToggle={(id) =>
                patch({
                  additionalDisciplineIds: draft.additionalDisciplineIds.includes(id)
                    ? draft.additionalDisciplineIds.filter((x) => x !== id)
                    : [...draft.additionalDisciplineIds, id],
                })
              }
            />
          </>
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
        {step === 'existing' && (
          <div className="space-y-4">
            {quickTests.length === 0 ? (
              <p className="text-[13px] text-ink-secondary">{t('onboarding.existing.none')}</p>
            ) : (
              quickTests.map((test) => {
                const field = test.fields.find((f) => f.key === test.primaryMetric)!
                const value = draft.existing[test.slug] ?? null
                const set = (v: number | null) =>
                  patch({ existing: { ...draft.existing, [test.slug]: v } })
                return field.type === 'duration' ? (
                  <DurationField key={test.slug} label={test.name[lang]} value={value} onChange={set} />
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
              })
            )}
            <p className="text-[12px] leading-relaxed text-ink-muted">{t('onboarding.existing.hint')}</p>
          </div>
        )}
      </div>

      <footer className="mt-4 flex shrink-0 items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="ghost" onClick={back} disabled={index === 0}>
          <ArrowLeft size={15} aria-hidden />
          {t('onboarding.back')}
        </Button>
        <div className="flex items-center gap-2">
          {(step === 'additional' || step === 'goal' || step === 'existing') && (
            <Button variant="ghost" onClick={next}>
              {t('onboarding.skip')}
            </Button>
          )}
          <Button variant="primary" onClick={next} disabled={!canContinue}>
            {index === STEPS.length - 1 ? t('onboarding.finish') : t('onboarding.next')}
            <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </footer>
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
          {age != null && (
            <span className="mt-1 block text-[11px] text-ink-muted">
              {t('onboarding.profile.age')}: {age} {t('onboarding.profile.years')}
              {klass && ` · ${t('onboarding.profile.ageClass')}: ${t(`ageClass.${klass}`)}`}
            </span>
          )}
        </label>
        <NumberField label={t('profile.height')} unit="cm" value={draft.heightCm} onChange={(v) => patch({ heightCm: v })} min={80} max={260} step={1} required />
        <NumberField label={t('onboarding.profile.weight')} unit="kg" value={draft.weightKg} onChange={(v) => patch({ weightKg: v })} min={20} max={400} step={0.1} required />
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

function DiagnosticProfileResult({
  draft,
  onDone,
}: {
  draft: Draft
  onDone: (target: 'overview' | 'tests') => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const { data, saveProfile } = useAppData()
  const discipline = draft.disciplineId ? disciplineById(draft.disciplineId) : undefined
  const leave = (target: 'overview' | 'tests') => {
    saveProfile({ onboardingCompletedAt: new Date().toISOString() })
    onDone(target)
  }
  const profile = buildDiagnosticProfile({
    disciplineId: draft.disciplineId,
    sex: draft.sex,
    birthDate: draft.birthDate || null,
    results: data.results,
  })

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
          {t('onboarding.result.found', { count: profile.ranked.length })}
        </p>
      </header>

      <div className="mt-4 space-y-4">
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
        <p className="text-[13px] leading-relaxed text-ink-secondary">{t('onboarding.result.body')}</p>
      </div>

      <footer className="mt-6 flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => leave('tests')}>
          {t('onboarding.allTests')}
        </Button>
        <Button variant="primary" onClick={() => leave('overview')}>
          {t('onboarding.toOverview')}
          <ArrowRight size={15} aria-hidden />
        </Button>
      </footer>
    </div>
  )
}
