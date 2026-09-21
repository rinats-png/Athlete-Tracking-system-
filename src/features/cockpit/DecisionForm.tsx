import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { DECISION_AREAS, DECISION_TRIGGERS, type DecisionArea, type DecisionTrigger } from '@/lib/store/schema'
import { newId } from '@/lib/store/localStore'
import type { StoredDecision, StoredResult, StoredWorkout } from '@/lib/store/localStore'
import { exerciseByKey } from '@/data/exercises'
import { getTest } from '@/data/testCatalog'
import { exerciseSummary } from '@/domain/training'
import { toDay } from '@/domain/diary'
import { pick } from '@/i18n/pick'
import { cn } from '@/lib/utils'

const DIARY_METRICS = ['weightKg', 'sleepHours', 'energy', 'stress', 'soreness', 'adherence', 'load'] as const

function Chips<T extends string>({ label, options, value, onChange, render }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void; render: (v: T) => string }) {
  return (
    <div>
      <span className="label-tag">{label}</span>
      <div role="radiogroup" aria-label={label} className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={cn(
              'min-h-11 rounded-pill border px-3 font-display text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors',
              value === o ? 'border-accent bg-accent-quiet text-ink' : 'border-line text-ink-muted hover:text-ink',
            )}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Text({ label, value, onChange, required = false }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block text-[13px]">
      <span className="label-tag">
        {label}
        {required && <span aria-hidden> *</span>}
      </span>
      <textarea
        aria-label={label}
        value={value}
        maxLength={600}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full border border-line bg-surface-sunken px-3 py-2 text-[15px] leading-snug"
      />
    </label>
  )
}

/**
 * Eine Entscheidung festhalten.
 *
 * Die Felder sind die aus v4, Blatt Decision-Log. Vorbelegt ist nur der
 * ANLASS, wenn das Formular aus einem Signal heraus geöffnet wurde — und
 * das ist keine Aussage, sondern der Grund, warum jemand hingeschaut hat.
 * Beobachtung, Entscheidung, Begründung und Erwartung schreibt der Mensch.
 * Die App formuliert nichts vor (§81).
 *
 * Die MESSGRÖSSE ist das Neue gegenüber Excel: Wer sie nennt, bekommt nach
 * der Frist die Wirkung gegen die eigene Schwankung gerechnet. Wer sie nicht
 * nennt, bekommt keine — und das ist erlaubt.
 */
export function DecisionForm({
  initial,
  workouts,
  results,
  onSave,
  onCancel,
}: {
  initial: Partial<StoredDecision>
  workouts: StoredWorkout[]
  results: StoredResult[]
  onSave: (d: StoredDecision) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const today = toDay(new Date())
  const [d, setD] = useState<StoredDecision>({
    id: initial.id ?? newId(),
    decidedOn: initial.decidedOn ?? today,
    trigger: initial.trigger ?? 'other',
    area: initial.area ?? 'other',
    observation: initial.observation ?? '',
    decision: initial.decision ?? '',
    rationale: initial.rationale ?? '',
    expected: initial.expected ?? '',
    reviewOn: initial.reviewOn ?? shiftDay(today, 28),
    actual: initial.actual ?? '',
    status: initial.status ?? 'open',
    metric: initial.metric ?? null,
    createdAt: initial.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewedAt: initial.reviewedAt ?? null,
  })
  const set = (p: Partial<StoredDecision>) => setD((x) => ({ ...x, ...p }))

  const exercises = useMemo(() => exerciseSummary(workouts).filter((e) => e.exerciseKey !== 'custom'), [workouts])
  const tests = useMemo(() => [...new Set(results.map((r) => r.testSlug))], [results])
  const metricValue = d.metric ? `${d.metric.kind}:${d.metric.key}` : ''

  return (
    <div className="space-y-4" data-testid="decision-form">
      <Chips label={t('cockpit.decision.trigger')} options={DECISION_TRIGGERS} value={d.trigger} onChange={(v: DecisionTrigger) => set({ trigger: v })} render={(v) => t(`cockpit.triggers.${v}`)} />
      <Chips label={t('cockpit.decision.area')} options={DECISION_AREAS} value={d.area} onChange={(v: DecisionArea) => set({ area: v })} render={(v) => t(`cockpit.areas.${v}`)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Text label={t('cockpit.decision.observation')} value={d.observation} onChange={(v) => set({ observation: v })} />
        <Text label={t('cockpit.decision.decision')} value={d.decision} onChange={(v) => set({ decision: v })} required />
        <Text label={t('cockpit.decision.rationale')} value={d.rationale} onChange={(v) => set({ rationale: v })} />
        <Text label={t('cockpit.decision.expected')} value={d.expected} onChange={(v) => set({ expected: v })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-[13px]">
          <span className="label-tag">{t('cockpit.decision.decidedOn')}</span>
          <input type="date" aria-label={t('cockpit.decision.decidedOn')} value={d.decidedOn} max={today} onChange={(e) => e.target.value && set({ decidedOn: e.target.value })} className="mt-1.5 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>
        <label className="text-[13px]">
          <span className="label-tag">{t('cockpit.decision.reviewOn')}</span>
          <input type="date" aria-label={t('cockpit.decision.reviewOn')} value={d.reviewOn ?? ''} onChange={(e) => set({ reviewOn: e.target.value || null })} className="mt-1.5 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]" />
        </label>
        <label className="text-[13px]">
          <span className="label-tag">{t('cockpit.decision.metric')}</span>
          <select
            aria-label={t('cockpit.decision.metric')}
            value={metricValue}
            onChange={(e) => {
              const [kind, ...rest] = e.target.value.split(':')
              set({ metric: e.target.value ? { kind: kind as 'diary' | 'exercise' | 'test', key: rest.join(':') } : null })
            }}
            className="mt-1.5 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[15px]"
          >
            <option value="">{t('cockpit.decision.noMetric')}</option>
            <optgroup label={t('diary.title')}>
              {DIARY_METRICS.map((k) => (
                <option key={k} value={`diary:${k}`}>
                  {t(`diary.metrics.${k}`)}
                </option>
              ))}
            </optgroup>
            {exercises.length > 0 && (
              <optgroup label={t('training.title')}>
                {exercises.map((e) => (
                  <option key={e.exerciseKey} value={`exercise:${e.exerciseKey}`}>
                    {pick(exerciseByKey(e.exerciseKey)!.name, locale)} (e1RM)
                  </option>
                ))}
              </optgroup>
            )}
            {tests.length > 0 && (
              <optgroup label={t('nav.diagnostics')}>
                {tests.map((slug) => (
                  <option key={slug} value={`test:${slug}`}>
                    {pick(getTest(slug)?.name, locale) ?? slug}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>
      <p className="text-[12px] leading-relaxed text-ink-muted">{t('cockpit.decision.metricWhy')}</p>

      <div className="flex gap-2">
        <Button variant="primary" size="md" disabled={d.decision.trim() === ''} onClick={() => onSave(d)}>
          {t('cockpit.decision.save')}
        </Button>
        <Button variant="ghost" size="md" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
    </div>
  )
}

function shiftDay(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000))
}
