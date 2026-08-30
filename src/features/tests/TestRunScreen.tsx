import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Info } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { DurationField } from '@/components/ui/DurationField'
import { Timer } from './Timer'
import { getTest } from '@/data/testCatalog'
import { useAppData } from '@/lib/store/AppDataProvider'
import { deriveMetrics } from '@/lib/metrics/derive'
import { ageFromBirthDate, formatNumber } from '@/lib/format'
import { REPS_RELIABLE_LIMIT } from '@/lib/metrics'
import type { AppLocale } from '@/types/domain'

/**
 * Geführte Testdurchführung.
 *
 * Ablauf: Protokoll lesen → Timer (wo das Protokoll einen vorgibt) →
 * Werte erfassen → speichern. Die abgeleiteten Metriken werden live
 * mitgerechnet und angezeigt, damit vor dem Speichern sichtbar ist, was aus
 * den Rohwerten entsteht.
 */
export function TestRunScreen() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const navigate = useNavigate()
  const { data, recordResult, bodyWeightAt } = useAppData()

  const test = getTest(slug)
  const [values, setValues] = useState<Record<string, number | null>>({})
  const [performedOn, setPerformedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [saved, setSaved] = useState(false)

  const numericValues = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(values).filter(([, v]) => v != null && Number.isFinite(v)),
      ) as Record<string, number>,
    [values],
  )

  const preview = useMemo(() => {
    if (!test) return {}
    return deriveMetrics(test, numericValues, {
      bodyWeightKg: bodyWeightAt(`${performedOn}T12:00:00.000Z`),
      ageYears: ageFromBirthDate(data.profile.birthDate),
      sex: data.profile.sex,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, numericValues, performedOn, data.profile.birthDate, data.profile.sex])

  if (!test) {
    return (
      <Panel className="p-6">
        <p className="text-ink-secondary">{t('tests.notFound')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/tests">{t('actions.backToCatalog')}</Link>
        </Button>
      </Panel>
    )
  }

  const missing = test.fields
    .filter((field) => field.required)
    .filter((field) => numericValues[field.key] == null)

  const needsBodyWeight =
    test.requiresBodyWeight && bodyWeightAt(`${performedOn}T12:00:00.000Z`) == null

  const save = () => {
    const result = recordResult({
      testSlug: test.slug,
      performedAt: new Date(`${performedOn}T12:00:00`).toISOString(),
      values: numericValues,
    })
    if (result) {
      setSaved(true)
      // Kurz die Bestätigung zeigen, dann in den Verlauf.
      window.setTimeout(() => navigate('/verlauf'), 700)
    }
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/tests">
          <ArrowLeft size={14} aria-hidden />
          {t('actions.backToCatalog')}
        </Link>
      </Button>

      <header className="mb-4">
        <span className="label-tag">{t(`dimensions.${test.dimension}`)}</span>
        <h1 className="mt-1 font-display text-[28px] leading-tight font-bold sm:text-[34px]">
          {test.name[locale]}
        </h1>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink-secondary">
          {test.summary[locale]}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader title={t('tests.protocol')} subtitle={test.equipment[locale]} />
          <p className="px-4 py-3 text-[14px] leading-relaxed text-ink-secondary">
            {test.instructions[locale]}
          </p>

          {(test.protocol.mode === 'countdown' || test.protocol.mode === 'amrap') &&
            test.protocol.durationSeconds != null && (
              <div className="border-t border-line px-4 py-4">
                <Timer seconds={test.protocol.durationSeconds} />
              </div>
            )}
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title={t('tests.enterResult')} />
          <div className="space-y-4 px-4 py-4">
            <label className="block">
              <span className="label-tag">{t('tests.performedOn')}</span>
              <input
                type="date"
                value={performedOn}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPerformedOn(e.target.value)}
                className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[15px]"
              />
            </label>

            {test.fields.map((field) =>
              field.type === 'duration' ? (
                <DurationField
                  key={field.key}
                  label={t(`fields.${field.key}`)}
                  value={values[field.key] ?? null}
                  onChange={(v) => setValues((s) => ({ ...s, [field.key]: v }))}
                  required={field.required}
                />
              ) : (
                <NumberField
                  key={field.key}
                  label={t(`fields.${field.key}`)}
                  unit={field.unit}
                  value={values[field.key] ?? null}
                  onChange={(v) => setValues((s) => ({ ...s, [field.key]: v }))}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? (field.type === 'integer' ? 1 : 0.1)}
                  required={field.required}
                />
              ),
            )}

            {needsBodyWeight && (
              <p className="flex gap-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-snug text-ink-secondary">
                <Info size={14} className="mt-px shrink-0" aria-hidden />
                <span>
                  {t('tests.needBodyWeight')}{' '}
                  <Link to="/profil" className="underline">
                    {t('tests.addBodyWeight')}
                  </Link>
                </span>
              </p>
            )}

            {(numericValues.reps ?? 0) > REPS_RELIABLE_LIMIT && (
              <p className="border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-snug text-ink-secondary">
                {t('tests.repsWarning', { limit: REPS_RELIABLE_LIMIT })}
              </p>
            )}

            {Object.keys(preview).length > 0 && (
              <div className="border-t border-line pt-3">
                <span className="label-tag">{t('tests.derived')}</span>
                <ul className="mt-2 space-y-1">
                  {test.derivedMetrics
                    .filter((key) => preview[key] != null)
                    .map((key) => (
                      <li key={key} className="flex justify-between text-[13px]">
                        <span className="text-ink-secondary">{t(`metrics.${key}`)}</span>
                        <span className="readout">{formatNumber(preview[key], locale, 2)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={missing.length > 0 || saved}
              onClick={save}
            >
              <Check size={15} strokeWidth={2.5} aria-hidden />
              {saved ? t('tests.saved') : t('tests.save')}
            </Button>
            {missing.length > 0 && (
              <p className="text-center text-[12px] text-ink-muted">
                {t('tests.missing', { fields: missing.map((f) => t(`fields.${f.key}`)).join(', ') })}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </>
  )
}
