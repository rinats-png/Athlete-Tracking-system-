import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { PanelHeader } from '@/components/ui/Panel'
import { ImageCard } from '@/components/ui/ImageCard'
import { sessionImage } from '@/data/visuals'
import { useAppData } from '@/lib/store/AppDataProvider'
import { planEnabled } from '@/domain/planMode'
import { openSessionsOn } from '@/domain/trainingBlock'
import { sessionName } from '@/features/plan/planText'

/**
 * Fuel und Plan verknüpft (Trainingsbereich Etappe 13): die heute geplanten
 * Einheiten stehen über der Verpflegung, damit klar ist, wofür gegessen und
 * getrunken wird. Die Karte nennt nur, was im Plan steht (Name, Dauer, wo eine
 * Regel sie festlegt); sie rechnet keine Mengen und gibt keine Empfehlung.
 */
export function FuelPlanned({ day }: { day: string }) {
  const { t } = useTranslation()
  const { trainingBlocks } = useAppData()
  if (!planEnabled()) return null
  const block = trainingBlocks.find((b) => b.status === 'active')
  const sessions = block ? openSessionsOn(block, day) : []
  if (sessions.length === 0) return null
  return (
    <ImageCard image={sessionImage(sessions[0])} lift className="mb-4" data-testid="fuel-planned">
      <PanelHeader title={t('fuelPlan.title')} subtitle={t('fuelPlan.sub')} />
      <ul className="px-4 pb-1">
        {sessions.map((s) => (
          <li key={s.id} className="border-t border-line py-2 text-[14px] first:border-t-0" data-testid={`fuel-planned-${s.id}`}>
            {sessionName(s, t)}
            {s.plannedDurationMin != null && <span className="text-ink-secondary"> · {t('cal.minutes', { n: s.plannedDurationMin })}</span>}
            {s.highIntensity && <span className="text-ink-secondary"> · {t('cal.key')}</span>}
          </li>
        ))}
      </ul>
      <Link to="/plan/heute" data-testid="fuel-to-player" className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[14px]">
        {t('fuelPlan.toPlayer')}
        <ArrowRight size={18} aria-hidden />
      </Link>
    </ImageCard>
  )
}
