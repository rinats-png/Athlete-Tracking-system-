import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { InsightCard } from './InsightCard'
import { useInsightRun } from './useInsightRun'
import { useExtraReady } from '@/features/shared/useExtraReady'

/**
 * Die wichtigsten Hinweise auf der Übersicht.
 *
 * Höchstens drei, ohne Belege und ohne Handlungen — die Übersicht fasst
 * zusammen, der Eingang (/hinweise) ist der Ort zum Bearbeiten. Ohne offene
 * Hinweise erscheint die Karte gar nicht: eine leere Fläche «keine Hinweise»
 * auf der Startseite wäre Rauschen.
 */
export function InsightsSummary({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { t } = useTranslation()
  const { run } = useInsightRun()
  const ready = useExtraReady()
  if (!ready || run.active.length === 0) return null
  const fresh = run.active.filter((i) => i.state === 'new').length

  return (
    <Panel className={className} style={style} data-testid="hints-summary">
      <PanelHeader
        title={t('hints.summaryTitle', { count: run.active.length })}
        subtitle={fresh > 0 ? t('hints.summaryNew', { count: fresh }) : t('hints.summarySub')}
      />
      <ul className="divide-y divide-line">
        {run.active.slice(0, 3).map((insight) => (
          <InsightCard key={insight.key} insight={insight} compact />
        ))}
      </ul>
      <div className="border-t border-line px-4 py-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/hinweise">
            {t('hints.openAll')}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </Button>
      </div>
    </Panel>
  )
}
