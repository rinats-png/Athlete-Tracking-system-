import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import {
  formatSleepDuration,
  parseSleepDuration,
  readinessScore,
} from '@/domain/readiness'
import type { ValidatedReadiness } from '@/lib/store/schema'

const SCALES = ['sleepQuality', 'fatigue', 'stress', 'soreness', 'motivation'] as const

/**
 * Selbsteinschätzung vor dem Termin (§28).
 *
 * Vollständig überspringbar, und das steht als erstes da. Eine
 * Selbstauskunft, die man abgeben MUSS, wird zur Formalie und dann
 * beliebig ausgefüllt — was schlechter ist als keine Angabe, weil die
 * Zahl anschliessend echt aussieht.
 */
export function ReadinessForm({
  value,
  onSave,
  onSkip,
}: {
  value: ValidatedReadiness | null
  onSave: (readiness: ValidatedReadiness) => void
  onSkip: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<ValidatedReadiness>(
    () =>
      value ?? {
        sleepMinutes: null,
        sleepQuality: null,
        fatigue: null,
        stress: null,
        soreness: null,
        motivation: null,
        recordedAt: new Date().toISOString(),
      },
  )
  const [sleepText, setSleepText] = useState(() => formatSleepDuration(value?.sleepMinutes ?? null))
  const [sleepError, setSleepError] = useState(false)

  const score = readinessScore(draft)

  return (
    <Panel>
      <PanelHeader title={t('readiness.title')} subtitle={t('readiness.optional')} />
      <div className="space-y-4 px-4 py-4">
        <label className="block">
          <span className="label-tag">{t('readiness.sleepDuration')}</span>
          <input
            type="text"
            inputMode="numeric"
            value={sleepText}
            placeholder="7:30"
            aria-invalid={sleepError || undefined}
            aria-describedby={sleepError ? 'sleep-error' : undefined}
            onChange={(e) => {
              setSleepText(e.target.value)
              const minutes = parseSleepDuration(e.target.value)
              setSleepError(e.target.value.trim() !== '' && minutes == null)
              setDraft((d) => ({ ...d, sleepMinutes: minutes }))
            }}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
          {sleepError ? (
            <span id="sleep-error" role="alert" className="mt-1 block text-[12px] text-critical">
              {t('readiness.sleepInvalid')}
            </span>
          ) : (
            <span className="mt-1 block text-[12px] text-ink-muted">{t('readiness.sleepHint')}</span>
          )}
        </label>

        {SCALES.map((key) => (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`readiness-${key}`} className="label-tag">
                {t(`readiness.${key}`)}
              </label>
              <span className="readout text-[13px] tabular-nums text-ink-secondary">
                {draft[key] ?? '—'}
              </span>
            </div>
            {/* Der Schieberegler ist über die Pfeiltasten bedienbar und
                trägt seinen Wert im aria-Attribut — der Zahlentext daneben
                ist die Sichtkontrolle, nicht die einzige Auskunft. */}
            <input
              id={`readiness-${key}`}
              type="range"
              min={1}
              max={10}
              step={1}
              value={draft[key] ?? 5}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
              className="mt-1.5 h-11 w-full accent-[var(--accent)]"
            />
            <p className="text-[11px] text-ink-muted">{t(`readiness.scale.${key}`)}</p>
          </div>
        ))}

        <div className="border-t border-line pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="label-tag">{t('readiness.score')}</span>
            <span className="readout font-display text-[24px] font-bold tabular-nums">
              {score.score == null ? '—' : `${score.score} %`}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            {score.score == null
              ? t('readiness.noAnswers')
              : t('readiness.basis', { answered: score.answered, total: score.total })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="md"
            disabled={score.score == null}
            onClick={() => onSave({ ...draft, recordedAt: new Date().toISOString() })}
          >
            <Check size={15} strokeWidth={2.5} aria-hidden />
            {t('readiness.save')}
          </Button>
          <Button variant="ghost" size="md" onClick={onSkip}>
            {t('readiness.skip')}
          </Button>
        </div>

        <p className="text-[12px] leading-relaxed text-ink-muted">{t('readiness.disclaimer')}</p>
      </div>
    </Panel>
  )
}
