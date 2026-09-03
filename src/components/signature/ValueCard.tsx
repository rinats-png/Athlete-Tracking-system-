import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Die Wertkarte: Kategorie, grosser Wert, Delta.
 *
 * Der Messwert ist der Held — er steht in der Grösse, die sonst
 * Überschriften bekommen, und die Kategorie darüber ist nur eine Marke.
 *
 * ZUR RICHTUNG DES DELTAS: eine Verschlechterung wird sachlich dargestellt,
 * nicht alarmistisch. Das Designsystem verbietet Alarmtöne für
 * Leistungswerte ausdrücklich — ein Rückgang nach einer Verletzung oder in
 * einer Aufbauphase ist eine Information, kein Fehler. Rot bleibt den
 * Stellen vorbehalten, an denen wirklich etwas nicht stimmt: einer
 * ungültigen Eingabe, einem misslungenen Import.
 */
export function ValueCard({
  label,
  value,
  unit,
  delta,
  deltaTone = 'neutral',
  to,
  className,
  style,
}: {
  label: string
  value: string
  unit?: string | null
  delta?: string | null
  deltaTone?: 'up' | 'down' | 'neutral'
  to?: string
  className?: string
  style?: React.CSSProperties
}) {
  const { t } = useTranslation()
  const body = (
    <>
      <span className="label-tag block truncate">{label}</span>
      <span className="readout mt-0.5 block text-[28px] leading-none font-bold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-[13px] font-medium text-ink-muted">{unit}</span>}
      </span>
      {delta && (
        <span
          className={cn(
            'readout mt-1 block text-[10px]',
            deltaTone === 'up' && 'text-accent-text',
            // Kein Rot: sachlich in der neutralen Farbe der Palette.
            deltaTone === 'down' && 'text-ink-muted',
            deltaTone === 'neutral' && 'text-ink-muted',
          )}
        >
          {delta}
        </span>
      )}
    </>
  )

  const shell = cn('panel float min-w-0 rounded-[var(--radius-md)] px-3.5 py-3', className)

  if (!to) return <div className={shell} style={style}>{body}</div>

  return (
    <Link
      to={to}
      aria-label={t('valueCard.open', { label })}
      className={cn(shell, 'float-lift block')}
      style={style}
    >
      {body}
      <ArrowRight
        size={14}
        aria-hidden
        className="absolute top-3 right-3 text-ink-muted opacity-0 transition-opacity duration-[var(--motion-fast)] group-hover:opacity-100"
      />
    </Link>
  )
}
