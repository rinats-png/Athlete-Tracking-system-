import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { meaningLines } from '@/domain/meaning'
import { compareOnTest } from '@/domain/groupCompare'
import { getTest } from '@/data/testCatalog'
import { formatMeasurement } from '@/lib/format'
import type { Rating } from '@/domain/rating'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Was ein Messwert bedeutet, in Sätzen.
 *
 * Steht bewusst ÜBER der Referenztabelle und nicht darunter: wer eine Zahl
 * sieht, die er nicht einordnen kann, liest keine Tabelle mehr. Der Satz
 * muss vor der Tabelle kommen, nicht als ihre Fussnote.
 */
export function MeaningPanel({ result, rating }: { result: StoredResult; rating: Rating }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data } = useAppData()
  const profile = data.profile

  const lines = useMemo(
    () =>
      meaningLines({
        result,
        rating,
        results: data.results,
        locale,
        nextInput: {
          disciplineId: profile.disciplineId,
          additionalDisciplineIds: profile.additionalDisciplineIds,
          goalKey: profile.goalKey,
          sex: profile.sex,
          birthDate: profile.birthDate,
          reminderIntervalDays: profile.reminderIntervalDays,
          results: data.results,
        },
      }),
    [result, rating, data.results, locale, profile],
  )

  if (lines.length === 0) return null

  return (
    <Panel ticked className="lg:col-span-2">
      <PanelHeader title={t('meaning.title')} subtitle={t('meaning.hint')} />
      <ol className="divide-y divide-line">
        {lines.map((line) => (
          <li key={line.key} className="px-4 py-3">
            <p className="text-[13px] leading-relaxed">
              {t(`meaning.${line.key}`, { ...line.params, text: line.text ?? '' })}
            </p>
            {line.to && (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link to={line.to}>{t('meaning.nextGo')}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/**
 * Die Einordnung im eigenen Kader.
 *
 * DER GRUND, WARUM ES DAS GIBT: 68 der 82 Tests haben keine publizierte
 * Referenz. Gegen eine Norm lässt sich dort nichts sagen — gegen die eigenen
 * zwölf Kadermitglieder sehr wohl. Das ist keine Wissenschaft und darf auch
 * nicht so aussehen; es ist aber ehrlich, und für den, der danebensteht, ist
 * es die nähere Frage.
 *
 * Nur im Trainermodus: im Einzelmodus gibt es keine Gruppe, und ein «Rang 1
 * von 1» wäre eine Auszeichnung für Alleinsein.
 */
export function GroupStandingPanel({ result }: { result: StoredResult }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { role, athletes, activeAthleteId } = useAppData()

  const roster = useMemo(() => athletes.filter((a) => !a.archived), [athletes])
  const comparison = useMemo(
    () => (role === 'coach' ? compareOnTest(result.testSlug, roster) : null),
    [role, roster, result.testSlug],
  )

  if (role !== 'coach' || roster.length < 2) return null
  const test = getTest(result.testSlug)
  if (!test) return null

  const mine = comparison?.entries.find((e) => e.athleteId === activeAthleteId) ?? null
  const values = comparison?.entries.map((e) => e.value) ?? []
  const sorted = [...values].sort((a, b) => a - b)
  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2

  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title={t('meaning.group.title')} subtitle={t('meaning.group.hint')} />
      <div className="px-4 py-3">
        {mine == null || comparison == null || comparison.covered < 2 ? (
          <p className="text-[13px] text-ink-secondary">{t('meaning.group.alone')}</p>
        ) : (
          <>
            <p className="readout text-[20px]">
              {t('meaning.group.rank', { rank: mine.rank, count: comparison.covered })}
            </p>
            {median != null && (
              <p className="mt-1 text-[13px] text-ink-secondary">
                {t('meaning.group.median', {
                  median: (() => {
                    const shown = formatMeasurement(median, test.primaryUnit, locale)
                    return `${shown.value}${shown.unit ? ` ${shown.unit}` : ''}`
                  })(),
                })}
              </p>
            )}
            {comparison.gaps.length > 0 && (
              <ul className="mt-2 space-y-1 text-[12px] text-ink-muted">
                {comparison.gaps.map((gap) => (
                  <li key={gap}>{t(`compare.gaps.${gap}`, { days: comparison.spreadDays })}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}
