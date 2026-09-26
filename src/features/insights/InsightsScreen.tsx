import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import type { InsightCategory } from '@/domain/insightEngine'
import { InsightCard } from './InsightCard'
import { useInsightRun } from './useInsightRun'

/**
 * Hinweise — der Eingang der Insight Engine (Master-Spezifikation I, «Insights Inbox»).
 *
 * Priorisiert und ohne Dubletten: zuerst, was ein Gespräch verdient
 * («Review»), dann Auffälliges, dann Informationen. Jeder Hinweis nennt die
 * Regel, die ihn erzeugt hat, und die Daten, auf denen er steht.
 *
 * Neue Hinweise werden beim Öffnen als «gesehen» vermerkt — einmal, beim
 * ersten Zeigen, damit das Zeichen «neu» auf der Übersicht verschwindet.
 */
export function InsightsScreen() {
  const { t } = useTranslation()
  const { run, act } = useInsightRun()

  // Einmal je Aufruf: alles, was neu angezeigt wird, gilt als gesehen.
  const marked = useRef(false)
  useEffect(() => {
    if (marked.current) return
    marked.current = true
    for (const insight of run.active) if (insight.state === 'new') act(insight, 'seen')
  }, [run.active, act])

  const groups = useMemo(() => {
    const order: InsightCategory[] = ['decision', 'load', 'recovery', 'performance', 'durability', 'adaptation', 'nutrition', 'data_quality']
    return order
      .map((category) => ({ category, items: run.active.filter((i) => i.category === category) }))
      .filter((g) => g.items.length > 0)
  }, [run.active])

  return (
    <>
      <ScreenHeader eyebrow={t('hints.eyebrow')} title={t('hints.title')} intro={t('hints.intro')} />

      {run.active.length === 0 ? (
        <EmptyState title={t('hints.emptyTitle')} body={t('hints.emptyBody')} />
      ) : (
        groups.map((g) => (
          <Panel key={g.category} className="mb-4" data-testid={`hints-${g.category}`}>
            <PanelHeader title={t(`hints.category.${g.category}`)} />
            <ul className="divide-y divide-line">
              {g.items.map((insight) => (
                <InsightCard key={insight.key} insight={insight} onAction={(a) => act(insight, a)} />
              ))}
            </ul>
          </Panel>
        ))
      )}

      {run.acknowledged.length > 0 && (
        <Panel className="mb-4">
          <PanelHeader title={t('hints.done')} subtitle={t('hints.doneWhy')} />
          <ul className="divide-y divide-line opacity-80">
            {run.acknowledged.map((insight) => (
              <InsightCard key={insight.key} insight={insight} compact />
            ))}
          </ul>
        </Panel>
      )}

      <p className="mb-6 max-w-[62ch] text-[12px] leading-relaxed text-ink-muted">
        {run.suppressed > 0 && `${t('hints.suppressed', { count: run.suppressed })} `}
        {t('hints.noAdvice')}
      </p>
    </>
  )
}
