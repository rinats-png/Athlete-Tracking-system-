import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { ImageCard } from '@/components/ui/ImageCard'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { testImageUrl } from '@/data/testImages'

/**
 * Team — die Gruppensicht des Trainers an einer Stelle (Produktdoktrin §6).
 *
 * Nur eine Ordnung: die Werkzeuge für Vergleich, Heatmap, Bericht und
 * Nachweis gab es schon; sie stehen jetzt nebeneinander statt verstreut.
 */
const TOOLS = [
  { key: 'heatmap', to: '/trainer/heatmap', image: 'repeated_sprint_bike' },
  { key: 'compare', to: '/trainer/vergleich', image: 'sprint_30m' },
  { key: 'report', to: '/trainer/gruppenbericht', image: 'countermovement_jump' },
  { key: 'proof', to: '/trainer/nachweis', image: 'shuttle_5_10_5' },
] as const

export function TeamHub() {
  const { t } = useTranslation()
  return (
    <div data-testid="team-hub">
      <ScreenHeader eyebrow={t('teamHub.eyebrow')} title={t('teamHub.title')} intro={t('teamHub.intro')} />
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link key={tool.key} to={tool.to} className="block">
            <ImageCard image={testImageUrl(tool.image)} lift>
              <div className="flex min-h-28 flex-col justify-center px-4 py-4">
                <p className="font-display text-[20px] font-bold">{t(`teamHub.tool.${tool.key}.title`)}</p>
                <p className="mt-1 max-w-[28ch] text-[13px] text-ink-secondary">{t(`teamHub.tool.${tool.key}.body`)}</p>
              </div>
            </ImageCard>
          </Link>
        ))}
      </div>
      <Panel className="mt-4">
        <Link to="/profil" className="flex min-h-12 items-center gap-3 px-4 text-[14px]">
          <span className="flex-1">{t('teamHub.manage')}</span>
          <ChevronRight size={16} aria-hidden className="text-ink-muted" />
        </Link>
      </Panel>
    </div>
  )
}
