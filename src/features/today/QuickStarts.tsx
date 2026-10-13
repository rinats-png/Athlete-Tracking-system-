import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, Dumbbell, Footprints, Timer } from 'lucide-react'

/**
 * Sofort los — ohne Plan (Mockup Variante A): Kraft frei, Lauf, Runden,
 * Kamera. Ein Tipp öffnet den jeweiligen Zähler. Liegt auf «Heute» und im
 * Bereich Training. Ein Abschnitt, keine Navigation: die Hauptnavigation ist
 * die Leiste. Auf «Heute» nachgeladen (Startpaket, Grenze 1100 KB).
 */
const ITEMS = [
  { key: 'strength', to: '/plan/frei/neu', icon: Dumbbell },
  { key: 'run', to: '/plan/lauf', icon: Footprints },
  { key: 'clock', to: '/plan/uhr', icon: Timer },
  { key: 'camera', to: '/plan/kamera', icon: Camera },
] as const

export default QuickStarts

export function QuickStarts({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('quickStart.title')} className={className} data-testid="quick-starts">
      <p className="label-tag mb-2">{t('quickStart.title')}</p>
      <ul className="grid grid-cols-4 gap-2">
        {ITEMS.map(({ key, to, icon: Icon }) => (
          <li key={key}>
            <Link to={to} data-testid={`quick-${key}`} className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface px-1 py-2.5 text-center text-[12px] leading-tight font-semibold shadow-[0_1px_2px_rgb(16_26_24/0.06)]">
              <Icon size={20} aria-hidden className="text-accent-text" />
              {t(`quickStart.${key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
