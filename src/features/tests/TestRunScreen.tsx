import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Info } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { DurationField } from '@/components/ui/DurationField'
import { Timer } from './Timer'
import { AttemptTable } from './AttemptTable'
import { ContextFields } from './ContextFields'
import { aggregateAttempts, attemptContextFor, defaultSelectionFor } from '@/domain/assessment'
import { getTest } from '@/data/testCatalog'
import { useAppData } from '@/lib/store/AppDataProvider'
import { deriveMetrics } from '@/lib/metrics/derive'
import { ageFromBirthDate, formatNumber } from '@/lib/format'
import { formulaFor } from '@/domain/formulaRegistry'
import { hasErrors, issuesFor, validateTestInput } from '@/domain/validation'
import type { AttemptSelection, ValidatedContext } from '@/lib/store/schema'
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
  const [searchParams] = useSearchParams()

  // Läuft dieser Test innerhalb einer Diagnostik? Dann gehört das Ergebnis
  // dem Termin, und der Rückweg führt dorthin und nicht in den Verlauf.
  const assessmentId = searchParams.get('diagnostik')
  const assessment = assessmentId
    ? (data.assessments.find((a) => a.id === assessmentId) ?? null)
    : null

  const test = getTest(slug)
  const [values, setValues] = useState<Record<string, number | null>>({})
  const [performedOn, setPerformedOn] = useState(() =>
    assessment ? assessment.performedOn : new Date().toISOString().slice(0, 10),
  )
  const [attempts, setAttempts] = useState<Record<string, number>[]>([])
  const [selection, setSelection] = useState<AttemptSelection>(() => defaultSelectionFor(slug))
  const [notes, setNotes] = useState('')
  const [measurementContext, setMeasurementContext] = useState<Partial<ValidatedContext>>({})
  const [saved, setSaved] = useState(false)

  const attemptContext = attemptContextFor(slug)

  /**
   * Aus den Versuchen wird der gewertete Datensatz. Er überschreibt die
   * Einzeleingabe des Leistungsfelds — sonst stünden zwei Wahrheiten
   * nebeneinander und niemand wüsste, welche gespeichert wird.
   */
  const aggregated = useMemo(() => {
    if (!attemptContext || attempts.length === 0) return null
    return aggregateAttempts(attempts, selection, attemptContext)
  }, [attempts, selection, attemptContext])

  const numericValues = useMemo(() => {
    const manual = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v != null && Number.isFinite(v)),
    ) as Record<string, number>
    return aggregated ? { ...manual, ...aggregated } : manual
  }, [values, aggregated])

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

  // Eine Quelle für alle Regeln: dieselbe Funktion prüft auch beim Import.
  const issues = validateTestInput(test, { ...values, ...numericValues }, {
    bodyWeightKg: bodyWeightAt(`${performedOn}T12:00:00.000Z`),
    performedOn,
  })
  const blocked = hasErrors(issues)

  const save = () => {
    if (blocked) return
    const result = recordResult({
      testSlug: test.slug,
      performedAt: new Date(`${performedOn}T12:00:00`).toISOString(),
      values: numericValues,
      assessmentId: assessment?.id ?? null,
      attempts: aggregated ? attempts.filter((a) => Object.keys(a).length > 0) : [],
      attemptSelection: aggregated ? selection : null,
      measurementContext,
      notes: notes.trim() || undefined,
    })
    if (result) {
      setSaved(true)
      // Kurz die Bestätigung zeigen, dann zurück an die Stelle, von der der
      // Test gestartet wurde.
      const target = assessment ? `/diagnostik/${assessment.id}` : '/verlauf'
      window.setTimeout(() => navigate(target), 700)
    }
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to={assessment ? `/diagnostik/${assessment.id}` : '/tests'}>
          <ArrowLeft size={14} aria-hidden />
          {assessment ? t('assessments.backToAssessment') : t('actions.backToCatalog')}
        </Link>
      </Button>

      {assessment && (
        <p className="mb-3 border-l-2 border-accent bg-accent/10 px-3 py-2 text-[13px] text-ink-secondary">
          {t('assessments.partOf', { title: assessment.title ?? assessment.performedOn })}
        </p>
      )}

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
                  issues={issuesFor(issues, field.key)}
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
                  issues={issuesFor(issues, field.key)}
                />
              ),
            )}

            {/* Mehrfachversuche nur, wo das Protokoll sie vorsieht. Bei einem
                Cooper-Test gibt es keinen zweiten Versuch. */}
            {test.protocol.mode === 'attempts' && attemptContext && (
              <AttemptTable
                attempts={attempts}
                onChange={setAttempts}
                selection={selection}
                onSelectionChange={setSelection}
                valueKey={attemptContext.key}
                unit={test.fields.find((f) => f.key === attemptContext.key)?.unit ?? null}
              />
            )}

            {/* Hinweise, die den ganzen Datensatz betreffen. Warnungen
                blockieren nicht — sie sagen nur, wie belastbar der Wert ist. */}
            {issuesFor(issues, '*').map((issue) => (
              <p
                key={issue.messageKey}
                className="flex gap-2 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-snug text-ink-secondary"
              >
                <Info size={14} className="mt-px shrink-0" aria-hidden />
                <span>
                  {t(issue.messageKey, issue.values)}{' '}
                  {issue.messageKey === 'validation.noBodyWeight' && (
                    <Link to="/profil" className="underline">
                      {t('tests.addBodyWeight')}
                    </Link>
                  )}
                </span>
              </p>
            ))}

            {Object.keys(preview).length > 0 && (
              <div className="border-t border-line pt-3">
                <span className="label-tag">{t('tests.derived')}</span>
                <ul className="mt-2 space-y-1">
                  {test.derivedMetrics
                    .filter((key) => preview[key] != null)
                    .map((key) => (
                      <li key={key} className="flex justify-between gap-3 text-[13px]">
                        <span className="text-ink-secondary">
                          {t(`metrics.${key}`)}
                          {/* Kennzeichnet Werte, deren Formel diese App
                              festgelegt hat und die noch durch eine belegte
                              zu ersetzen ist (§81). Ohne die Kennzeichnung
                              sähe eine gesetzte Zahl aus wie eine belegte. */}
                          {formulaFor(key)?.source === 'provisional' ? (
                            <span
                              title={t('tests.provisionalHint')}
                              className="ml-1.5 align-middle text-[10px] uppercase tracking-wide text-ink-muted"
                            >
                              {t('tests.provisional')}
                            </span>
                          ) : null}
                        </span>
                        <span className="readout">{formatNumber(preview[key], locale, 2)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <ContextFields
              value={measurementContext}
              onChange={(patch) => setMeasurementContext((c) => ({ ...c, ...patch }))}
            />

            <label className="block border-t border-line pt-3">
              <span className="label-tag">{t('tests.notes')}</span>
              <textarea
                value={notes}
                maxLength={2000}
                rows={3}
                placeholder={t('tests.notesHint')}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 w-full resize-y border border-line bg-surface-sunken px-3 py-2 text-[14px]"
              />
            </label>

            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={blocked || saved}
              onClick={save}
            >
              <Check size={15} strokeWidth={2.5} aria-hidden />
              {saved ? t('tests.saved') : t('tests.save')}
            </Button>
            {blocked && (
              <p className="text-center text-[12px] text-ink-muted" role="status">
                {t('tests.fixErrors')}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </>
  )
}
