import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { planMode } from '@/domain/planMode'
import { exerciseImageUrl } from '@/data/exerciseImages'
import { cn } from '@/lib/utils'

/**
 * Weg zum Plan: drei große Karten. Heute läuft der Weg über die Berechnung
 * aus belegten Regeln; Vorlagen und eigener Plan folgen in den nächsten
 * Etappen und stehen bis dahin sichtbar als «folgt» da, ohne Verweis ins Leere.
 */
const WAYS = [
  { key: 'template', image: 'rowing_erg', to: '/plan/vorlagen' },
  { key: 'own', image: 'back_squat', to: null },
  { key: 'computed', image: 'treadmill', to: '/plan/neu' },
] as const

export function PlanWayScreen() {
  const { t } = useTranslation()
  if (planMode(import.meta.env?.VITE_TRAINING_PLAN) === 'off') return <EmptyState title={t('plan.title')} body={t('plan.off')} />
  return (
    <div data-testid="plan-way">
      <ScreenHeader eyebrow={t('planHub.eyebrow')} title={t('planWay.title')} intro={t('planWay.intro')} />
      <div className="space-y-3">
        {WAYS.map((w) => {
          const image = exerciseImageUrl(w.image)
          const body = (
            <div
              className={cn('relative flex min-h-32 items-end overflow-hidden rounded-lg border border-line p-4 text-white', w.to ? '' : 'opacity-80')}
              style={{ backgroundImage: image ? `linear-gradient(90deg, rgba(7,10,13,.9), rgba(7,10,13,.3)), url(${image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#141C21' }}
            >
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-display text-[17px] font-bold">
                  {!w.to && <Lock size={15} aria-hidden />}
                  {t(`planWay.${w.key}.title`)}
                </p>
                <p className="text-[12px] text-white/80">{t(`planWay.${w.key}.sub`)}</p>
                <span className="inline-flex min-h-6 items-center rounded-pill border border-white/40 px-2.5 text-[11px]">{t(w.to ? 'planWay.available' : 'planWay.soon')}</span>
              </div>
            </div>
          )
          return w.to ? (
            <Link key={w.key} to={w.to} data-testid={`way-${w.key}`} className="block">
              {body}
            </Link>
          ) : (
            <div key={w.key} data-testid={`way-${w.key}`} aria-disabled="true">
              {body}
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-[12px] text-ink-muted">{t('planWay.note')}</p>
    </div>
  )
}
