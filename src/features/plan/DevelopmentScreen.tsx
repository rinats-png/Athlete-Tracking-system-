import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { AREA_IMAGES, sessionImage } from '@/data/visuals'
import { Thumb } from '@/components/ui/PhotoCard'
import { InfoNote } from '@/components/ui/InfoNote'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planMode } from '@/domain/planMode'
import { developmentOf } from '@/domain/development'
import { verdictLine } from '@/features/plan/planText'
import { getTest } from '@/data/testCatalog'
import { pick } from '@/i18n/pick'
import { formatDate } from '@/lib/format'

/** Langzeitentwicklung (Trainingsbereich Etappe 14): Blöcke nebeneinander, Beständigkeit je Woche. Keine Prognose. */
export function DevelopmentScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data, trainingBlocks } = useAppData()
  const today = new Date().toISOString().slice(0, 10)
  const dev = useMemo(() => developmentOf(trainingBlocks, data.results, today), [trainingBlocks, data.results, today])

  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  if (trainingBlocks.length === 0) return <EmptyState title={t('dev.title')} body={t('dev.none')} action={<Link to="/plan/waehlen" className="text-accent-text underline">{t('planHub.empty.cta')}</Link>} />
  const max = Math.max(1, ...dev.weeks.map((w) => w.done))
  const testName = (slug: string) => pick(getTest(slug)?.name, locale) ?? slug

  return (
    <div data-testid="plan-development">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('dev.title')} intro={t('dev.intro')} image={AREA_IMAGES.development} />

      <Panel className="mb-4" data-testid="dev-weeks">
        <PanelHeader title={t('dev.weeksTitle', { n: dev.weeks.length })} subtitle={t('dev.total', { n: dev.totalDone })} />
        <ul className="space-y-1.5 px-4 pb-4">
          {dev.weeks.map((w) => (
            <li key={w.weekStart} className="flex items-center gap-3 text-[12px]" data-testid={`dev-week-${w.weekStart}`} data-done={w.done}>
              <span className="w-14 shrink-0 text-ink-secondary">{formatDate(w.weekStart, locale)}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-pill bg-surface-sunken" aria-hidden>
                <span className="block h-full rounded-pill bg-accent" style={{ width: `${(w.done / max) * 100}%` }} />
              </span>
              <span className="w-6 text-right">{w.done}</span>
            </li>
          ))}
        </ul>
        <InfoNote text={t('dev.weeksNote')} className="border-t border-line px-4" />
      </Panel>

      <Panel data-testid="dev-blocks">
        <PanelHeader title={t('dev.blocksTitle')} />
        <ul>
          {dev.blocks.map(({ block, report, measured, open }) => (
            <li key={block.id} className="flex gap-3 border-t border-line px-4 py-3 first:border-t-0" data-testid={`dev-block-${block.id}`}>
              <Thumb src={block.sessions.find((x) => !x.removed) ? sessionImage(block.sessions.find((x) => !x.removed)!) : AREA_IMAGES.development} />
              <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-bold">{block.name || t(`plan.phase.${block.phase}`)}<span className="ml-2 text-[12px] font-normal text-ink-secondary">{t(block.status === 'active' ? 'dev.active' : 'dev.closed')}</span></p>
              <p className="text-[12px] text-ink-secondary">{formatDate(block.startDay, locale)} · {t('tpl.weeksTotal', { n: block.weeks })} · {t('block.report.count', { done: report.done, planned: report.planned })}</p>
              {report.metrics.length === 0 ? (
                <p className="mt-1 text-[13px] text-ink-secondary">{t('block.report.noMetrics')}</p>
              ) : (
                <ul className="mt-1 text-[13px]">
                  {report.metrics.map((m) => (
                    <li key={m.metric} data-testid={`dev-metric-${block.id}-${m.metric}`}><span className="font-medium">{testName(m.metric)}</span>: {verdictLine(m, report.finished, t, locale)}</li>
                  ))}
                </ul>
              )}
              {open > 0 && measured > 0 && <p className="mt-1 text-[11px] text-ink-muted">{t('dev.partial', { measured, open })}</p>}
              </div>
            </li>
          ))}
        </ul>
        <InfoNote text={t('dev.note')} className="border-t border-line px-4" />
      </Panel>
    </div>
  )
}
