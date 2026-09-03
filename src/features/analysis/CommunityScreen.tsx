import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { ScreenHeader } from '@/features/shared/ScreenHeader'

/**
 * Community-Benchmark (Konzept §28) — als Platzhalter, der sagt, was er ist.
 *
 * Ein anonymisierter Vergleich braucht einen Server. Den gibt es nicht, und
 * eine Seite, die so tut, als gäbe es ihn, wäre eine Zahl ohne Herkunft.
 * Also steht hier: keine Daten, so wird es aussehen, das sind die Regeln.
 */
export function CommunityScreen() {
  const { t } = useTranslation()
  return (
    <>
      <ScreenHeader eyebrow={t('community.eyebrow')} title={t('community.title')} intro={t('community.body')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel ticked>
          <PanelHeader title={t('community.status')} />
          <div className="flex gap-3 px-4 py-4">
            <Users size={22} className="shrink-0 text-ink-muted" aria-hidden />
            <p className="text-[14px] leading-relaxed text-ink-secondary">{t('community.statusBody')}</p>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title={t('community.example')} />
          <p className="readout px-4 py-4 text-[15px] text-ink-secondary">{t('community.exampleLine')}</p>
        </Panel>
        <Panel className="lg:col-span-2">
          <PanelHeader title={t('community.principles')} />
          <ul className="space-y-2 px-4 py-4 text-[13px] leading-relaxed text-ink-secondary">
            <li>{t('community.principle1')}</li>
            <li>{t('community.principle2')}</li>
            <li>{t('community.principle3')}</li>
          </ul>
        </Panel>
      </div>
    </>
  )
}
