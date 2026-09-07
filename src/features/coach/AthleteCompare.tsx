import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { getTest } from '@/data/testCatalog'
import { compareOnAxes, compareOnTest, comparableTests } from '@/domain/groupCompare'
import type { TestComparison } from '@/domain/groupCompare'
import { axisById } from '@/data/profileAxes'
import { formatDate, formatMeasurement } from '@/lib/format'
import type { AppLocale } from '@/types/domain'
import { pick } from '@/i18n/pick'

/**
 * Athleten nebeneinander (§37, §38).
 *
 * DER GRUND, WARUM ES DIESEN BILDSCHIRM GIBT: ein Trainer wird gefragt, wer
 * im Kader der schnellste ist. Bisher musste er dafür zwölf Profile öffnen
 * und die Zahlen im Kopf behalten.
 *
 * Der teuerste Fehler wäre eine Rangliste, die es nicht gibt: zwei
 * Sprintzeiten von verschiedenem Untergrund, mit verschiedener Zeitnahme,
 * aus verschiedenen Jahreszeiten. Deshalb steht neben jedem Vergleich, wie
 * viele der Ausgewählten den Test überhaupt haben, und darunter, wo die
 * festgehaltenen Bedingungen auseinandergehen.
 */
export function AthleteCompare() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { role, athletes, data } = useAppData()

  const roster = useMemo(() => athletes.filter((a) => !a.archived), [athletes])
  const [picked, setPicked] = useState<string[]>(() => roster.slice(0, 2).map((a) => a.id))

  const selected = useMemo(() => roster.filter((a) => picked.includes(a.id)), [roster, picked])
  const enough = selected.length >= 2

  const axes = useMemo(
    () => (enough ? compareOnAxes(selected, data.profile.disciplineId ?? null) : []),
    [enough, selected, data.profile.disciplineId],
  )
  const comparisons = useMemo(
    () =>
      enough
        ? comparableTests(selected)
            .map((slug) => compareOnTest(slug, selected))
            .filter((c): c is TestComparison => c != null)
        : [],
    [enough, selected],
  )

  if (role !== 'coach' || roster.length < 2) {
    return (
      <>
        <BackLink />
        <EmptyState title={t('compare.title')} body={t('compare.needTwo')} />
      </>
    )
  }

  return (
    <>
      <BackLink />
      <ScreenHeader
        eyebrow={t('coachDash.title')}
        title={t('compare.title')}
        intro={t('compare.intro')}
      />

      <Panel className="mb-4">
        <PanelHeader
          title={t('compare.select')}
          subtitle={t('compare.selected', { count: selected.length })}
        />
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {roster.map((athlete) => {
            const on = picked.includes(athlete.id)
            return (
              <label
                key={athlete.id}
                className={`flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-[13px] ${on ? 'border-[var(--line-strong)]' : 'border-line text-ink-secondary'}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setPicked((prev) =>
                      prev.includes(athlete.id)
                        ? prev.filter((id) => id !== athlete.id)
                        : [...prev, athlete.id],
                    )
                  }
                />
                {athlete.name || athlete.profile.firstName || athlete.id}
              </label>
            )
          })}
        </div>
      </Panel>

      {!enough ? (
        <EmptyState title={t('compare.title')} body={t('compare.needTwo')} />
      ) : (
        <>
          <Panel className="mb-4">
            <PanelHeader title={t('compare.axes')} subtitle={t('compare.axesHint')} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="label-tag px-3 py-2 font-semibold">{t('compare.axes')}</th>
                    {selected.map((a) => (
                      <th key={a.id} className="label-tag px-3 py-2 font-semibold">
                        {a.name || a.profile.firstName || a.id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {axes.map((axis) => (
                    <tr key={axis.axisId} className="border-b border-line/60">
                      <td className="px-3 py-2">{pick(axisById(axis.axisId)?.name, locale) ?? axis.axisId}</td>
                      {axis.scores.map((s) => (
                        <td key={s.athleteId} className="px-3 py-2">
                          {s.score == null ? (
                            <span className="text-[12px] text-ink-muted">{t('compare.notMeasured')}</span>
                          ) : (
                            <span className="readout">{s.score}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {comparisons.length === 0 ? (
            <EmptyState title={t('compare.tests')} body={t('compare.noCommon')} />
          ) : (
            <div className="space-y-4">
              {comparisons.map((comparison) => (
                <TestBlock key={comparison.slug} comparison={comparison} locale={locale} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

function TestBlock({ comparison, locale }: { comparison: TestComparison; locale: AppLocale }) {
  const { t } = useTranslation()
  const test = getTest(comparison.slug)
  if (!test) return null

  return (
    <Panel>
      <PanelHeader
        title={pick(test.name, locale)}
        subtitle={t('compare.coverage', {
          covered: comparison.covered,
          selected: comparison.selected,
        })}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left">
              {(['rank', 'value', 'shareOfBest', 'date'] as const).map((col) => (
                <th key={col} className="label-tag px-3 py-2 font-semibold">
                  {col === 'rank' ? t('compare.rank') : t(`compare.${col}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.entries.map((entry) => {
              const shown = formatMeasurement(entry.value, test.primaryUnit, locale)
              return (
                <tr key={entry.athleteId} className="border-b border-line/60">
                  <td className="px-3 py-2">
                    <span className="readout mr-2">{entry.rank}</span>
                    {entry.name}
                  </td>
                  <td className="readout px-3 py-2">
                    {shown.value}
                    {shown.unit ? ` ${shown.unit}` : ''}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="coverage-bar mr-2 align-middle"
                      style={{ '--coverage': `${entry.shareOfBest}%` } as React.CSSProperties}
                      aria-hidden
                    />
                    <span className="readout text-[12px]">{entry.shareOfBest}</span>
                  </td>
                  <td className="px-3 py-2 text-ink-secondary">
                    {formatDate(entry.performedAt, locale)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {comparison.gaps.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <span className="label-tag">{t('compare.gapsTitle')}</span>
          <ul className="mt-1 space-y-1 text-[12px] text-ink-secondary">
            {comparison.gaps.map((gap) => (
              <li key={gap}>{t(`compare.gaps.${gap}`, { days: comparison.spreadDays })}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

function BackLink() {
  const { t } = useTranslation()
  return (
    <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
      <Link to="/trainer">
        <ArrowLeft size={14} aria-hidden />
        {t('coachDash.title')}
      </Link>
    </Button>
  )
}
