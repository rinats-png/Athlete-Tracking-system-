import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { StatTile } from '@/components/ui/StatTile'
import { RangeField } from '@/components/ui/RangeField'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { cockpitOverview, cockpitSignals, decisionEffect, overdueDecisions, type Signal } from '@/domain/cockpit'
import { toDay } from '@/domain/diary'
import { exerciseByKey } from '@/data/exercises'
import { getTest } from '@/data/testCatalog'
import type { StoredDecision } from '@/lib/store/localStore'
import { formatDate, formatNumber } from '@/lib/format'
import { pick } from '@/i18n/pick'
import { DecisionForm } from './DecisionForm'

/**
 * Das Cockpit — Schicht S3 (docs/ausbau.md).
 *
 * Vier Flächen:
 *   Sieben gegen achtundzwanzig   Ø7 und Ø28 nebeneinander, beschreibend
 *   Zum Hinschauen                 die Signale — Hinweise, keine Vorgaben;
 *                                  jedes führt in ein Entscheidungsformular
 *   Entscheidungen                 das Log, offene zuerst, mit der gerechneten
 *                                  Wirkung gegen die Schwankung
 *   Schwellen                      die Parameter, als Regler; ein Mensch setzt sie
 *
 * Dieser Bildschirm ist der Wirksamkeitsnachweis, für den die Schichten S1
 * und S2 gebaut wurden. Er sagt: «Am 14. März entschieden — seitdem Schlaf
 * +11 %, ausserhalb der Schwankung.» Er sagt NIE «das hat gewirkt» — ob es
 * die Entscheidung war, weiss nur der Mensch (§81).
 */
export function CockpitScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { diary, workouts, decisions, saveDecision, cockpit, saveCockpit, data, role } = useAppData()
  const today = toDay(new Date())
  const [editing, setEditing] = useState<Partial<StoredDecision> | null>(null)
  const [reviewing, setReviewing] = useState<{ id: string; actual: string } | null>(null)

  const overview = useMemo(() => cockpitOverview(diary, today), [diary, today])
  const signals = useMemo(() => cockpitSignals(diary, workouts, cockpit, today), [diary, workouts, cockpit, today])
  const overdue = useMemo(() => overdueDecisions(decisions, today), [decisions, today])
  const sorted = useMemo(
    () => [...decisions].sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.decidedOn.localeCompare(a.decidedOn)),
    [decisions],
  )

  const signalText = (s: Signal) => {
    const v = Object.fromEntries(Object.entries(s.values).map(([k, x]) => [k, typeof x === 'number' ? formatNumber(x, locale, k === 'kg' ? 1 : k.startsWith('pct') || k === 'limit' ? 1 : 1) : x]))
    if (s.key === 'plateau' && s.exerciseKey) {
      const def = exerciseByKey(s.exerciseKey)
      return t('cockpit.signals.plateau', { ...v, exercise: def ? pick(def.name, locale) : s.exerciseKey })
    }
    return t(`cockpit.signals.${s.key}`, v)
  }
  const metricName = (d: StoredDecision) => {
    if (!d.metric) return null
    if (d.metric.kind === 'diary') return t(`diary.metrics.${d.metric.key}`)
    if (d.metric.kind === 'exercise') return `${pick(exerciseByKey(d.metric.key)?.name, locale) ?? d.metric.key} (e1RM)`
    return pick(getTest(d.metric.key)?.name, locale) ?? d.metric.key
  }
  const pair = (p: { recent: { mean: number | null; n: number }; base: { mean: number | null; n: number } }, digits: number) =>
    p.base.mean == null ? t('cockpit.overview.noBase') : t('cockpit.overview.vs28', { value: formatNumber(p.base.mean, locale, digits) })

  return (
    <>
      <ScreenHeader eyebrow={t('cockpit.eyebrow')} title={t('cockpit.title')} intro={role === 'coach' ? t('cockpit.introCoach') : t('cockpit.intro')} />

      {/* --- Sieben gegen achtundzwanzig --------------------------------- */}
      <Panel className="mb-4">
        <PanelHeader title={t('cockpit.overview.title')} subtitle={t('cockpit.overview.why')} />
        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
          <StatTile label={t('cockpit.overview.sleep')} value={formatNumber(overview.sleep.recent.mean, locale, 1)} unit="h" meta={pair(overview.sleep, 1)} />
          <StatTile label={t('cockpit.overview.energy')} value={formatNumber(overview.energy.recent.mean, locale, 1)} meta={pair(overview.energy, 1)} />
          <StatTile label={t('cockpit.overview.weight')} value={formatNumber(overview.weight.recent.mean, locale, 1)} unit="kg" meta={pair(overview.weight, 1)} />
          <StatTile
            label={t('cockpit.overview.load')}
            value={formatNumber(overview.load.recent, locale, 0)}
            unit="AU"
            meta={overview.load.baseWeekly > 0 ? t('cockpit.overview.vs28', { value: formatNumber(overview.load.baseWeekly, locale, 0) }) : t('cockpit.overview.noBase')}
          />
        </div>
        <p className="border-t border-line px-4 py-2 text-[12px] text-ink-muted">
          {t('cockpit.overview.completeness', { pct: Math.round(overview.completeness * 100) })}
          {overview.ratio != null && ` · ${t('diary.stats.ratio', { ratio: formatNumber(overview.ratio, locale, 2) })}`}
        </p>
      </Panel>

      {/* --- Zum Hinschauen ---------------------------------------------- */}
      <Panel ticked className="mb-4" data-testid="cockpit-signals">
        <PanelHeader title={t('cockpit.signals.title')} subtitle={t('cockpit.signals.why')} />
        {signals.length === 0 && overdue.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-ink-secondary">{t('cockpit.signals.none')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {overdue.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                <span>{t('cockpit.signals.reviewDue', { date: formatDate(`${d.reviewOn}T12:00:00Z`, locale), decision: d.decision.slice(0, 60) })}</span>
                <Button variant="outline" size="sm" onClick={() => setReviewing({ id: d.id, actual: d.actual })}>
                  {t('cockpit.decision.review')}
                </Button>
              </li>
            ))}
            {signals.map((s, i) => (
              <li key={`${s.key}-${s.exerciseKey ?? i}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                <span>{signalText(s)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      trigger: s.key,
                      metric: s.key === 'plateau' && s.exerciseKey ? { kind: 'exercise', key: s.exerciseKey } : s.key === 'sleep_below_baseline' ? { kind: 'diary', key: 'sleepHours' } : s.key === 'energy_below_baseline' ? { kind: 'diary', key: 'energy' } : s.key === 'stress_above_baseline' ? { kind: 'diary', key: 'stress' } : s.key === 'weight_change_fast' ? { kind: 'diary', key: 'weightKg' } : s.key === 'adherence_low' ? { kind: 'diary', key: 'adherence' } : null,
                    })
                  }
                >
                  <Plus size={13} aria-hidden />
                  {t('cockpit.decision.record')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-ink-muted">{t('cockpit.signals.noAdvice')}</p>
      </Panel>

      {/* --- Formular ------------------------------------------------------ */}
      {editing && (
        <Panel ticked float className="mb-4 px-4 py-4">
          <DecisionForm
            initial={editing}
            workouts={workouts}
            results={data.results}
            onSave={(d) => {
              saveDecision(d)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </Panel>
      )}

      {/* --- Entscheidungen ---------------------------------------------- */}
      <Panel className="mb-4">
        <PanelHeader
          title={t('cockpit.log.title')}
          subtitle={t('cockpit.log.why')}
          action={
            !editing && (
              <Button variant="primary" size="sm" onClick={() => setEditing({})}>
                <Plus size={13} aria-hidden />
                {t('cockpit.decision.new')}
              </Button>
            )
          }
        />
        {sorted.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-ink-secondary">{t('cockpit.log.empty')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((d) => {
              const effect = decisionEffect(d, diary, workouts, data.results, today)
              const name = metricName(d)
              return (
                <li key={d.id} className="px-4 py-3" data-testid="decision">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap gap-2 text-[11px] tracking-wide text-ink-muted uppercase">
                        <span>{formatDate(`${d.decidedOn}T12:00:00Z`, locale)}</span>
                        <span>· {t(`cockpit.areas.${d.area}`)}</span>
                        <span>· {t(`cockpit.triggers.${d.trigger}`)}</span>
                        <span className={d.status === 'open' ? 'text-accent-text' : ''}>· {t(`cockpit.status.${d.status}`)}</span>
                      </p>
                      <p className="mt-1 text-[15px] leading-snug">{d.decision}</p>
                      {d.expected && <p className="mt-1 text-[12px] text-ink-secondary">{t('cockpit.decision.expected')}: {d.expected}</p>}
                      {d.actual && <p className="mt-1 text-[12px] text-ink-secondary">{t('cockpit.decision.actual')}: {d.actual}</p>}
                      {name && (
                        <p className="mt-1.5 text-[12px] text-ink-secondary" data-testid="decision-effect">
                          <span className="label-tag mr-1">{name}</span>
                          {effect == null || effect.verdict === 'insufficient'
                            ? t('cockpit.effect.insufficient', { before: effect?.before?.n ?? 0, after: effect?.after?.n ?? 0 })
                            : t(`cockpit.effect.${effect.verdict}`, {
                                before: formatNumber(effect.before!.mean, locale, 1),
                                after: formatNumber(effect.after!.mean, locale, 1),
                                pct: formatNumber(Math.abs(effect.changePercent ?? 0), locale, 1),
                                noise: formatNumber(effect.typicalErrorPercent ?? 0, locale, 1),
                              })}
                        </p>
                      )}
                    </div>
                    {d.status === 'open' && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" aria-label={`${t('cockpit.decision.edit')}: ${d.decision.slice(0, 40)}`} onClick={() => setEditing(d)}>
                          <Pencil size={14} aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`${t('cockpit.decision.review')}: ${d.decision.slice(0, 40)}`} onClick={() => setReviewing({ id: d.id, actual: d.actual })}>
                          <Check size={14} aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`${t('cockpit.decision.discard')}: ${d.decision.slice(0, 40)}`} onClick={() => saveDecision({ ...d, status: 'discarded' })}>
                          <X size={14} aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>
                  {reviewing?.id === d.id && (
                    <div className="mt-3 border border-line bg-surface-sunken p-3">
                      <label className="block text-[13px]">
                        <span className="label-tag">{t('cockpit.decision.actual')}</span>
                        <textarea
                          aria-label={t('cockpit.decision.actual')}
                          rows={2}
                          maxLength={600}
                          value={reviewing.actual}
                          onChange={(e) => setReviewing({ id: d.id, actual: e.target.value })}
                          className="mt-1.5 w-full border border-line bg-surface px-3 py-2 text-[15px]"
                        />
                      </label>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            saveDecision({ ...d, actual: reviewing.actual, status: 'reviewed', reviewedAt: new Date().toISOString() })
                            setReviewing(null)
                          }}
                        >
                          {t('cockpit.decision.markReviewed')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setReviewing(null)}>
                          {t('actions.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {/* --- Schwellen ------------------------------------------------------ */}
      <Panel>
        <PanelHeader title={t('cockpit.thresholds.title')} subtitle={t('cockpit.thresholds.why')} />
        <div className="grid gap-5 px-4 py-4 sm:grid-cols-2">
          <RangeField label={t('cockpit.thresholds.sleepDropPct')} value={cockpit.sleepDropPct} onChange={(v) => saveCockpit({ sleepDropPct: v })} min={5} max={40} step={1} unit="%" />
          <RangeField label={t('cockpit.thresholds.energyDropPct')} value={cockpit.energyDropPct} onChange={(v) => saveCockpit({ energyDropPct: v })} min={5} max={40} step={1} unit="%" />
          <RangeField label={t('cockpit.thresholds.stressRisePct')} value={cockpit.stressRisePct} onChange={(v) => saveCockpit({ stressRisePct: v })} min={5} max={60} step={1} unit="%" />
          <RangeField label={t('cockpit.thresholds.weightChangePctWeek')} value={cockpit.weightChangePctWeek} onChange={(v) => saveCockpit({ weightChangePctWeek: v })} min={0.25} max={3} step={0.25} unit="%" />
          <RangeField label={t('cockpit.thresholds.adherenceBelow')} value={cockpit.adherenceBelow} onChange={(v) => saveCockpit({ adherenceBelow: v })} min={2} max={5} step={0.5} unit="/5" />
          <RangeField label={t('cockpit.thresholds.minCompletenessPct')} value={cockpit.minCompletenessPct} onChange={(v) => saveCockpit({ minCompletenessPct: v })} min={30} max={100} step={5} unit="%" />
        </div>
      </Panel>
    </>
  )
}
