import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Die Next-Test-Karte: vollflächig in der Markenfarbe, mit Begründung.
 *
 * Sie ist die einzige Fläche im System, die den Akzent als Fläche trägt.
 * Genau deshalb wirkt sie — gäbe es zwei davon auf einem Bildschirm, wäre
 * keine mehr die Empfehlung.
 *
 * DIE BEGRÜNDUNG IST PFLICHT, nicht Zierde. Eine Empfehlung ohne «warum»
 * ist von einer zufälligen Auswahl nicht zu unterscheiden, und die App hat
 * die Gründe (fehlende Achse, Abstand zur letzten Messung, vorhandene
 * Referenz) ohnehin vorliegen. Deshalb nimmt die Komponente sie als
 * Pflichtfeld entgegen.
 */
export function NextTestCard({
  title,
  reasons,
  to,
  className,
  style,
}: {
  title: string
  reasons: string[]
  to: string
  className?: string
  style?: React.CSSProperties
}) {
  const { t } = useTranslation()
  return (
    <Link
      to={to}
      className={cn(
        'float-lift block rounded-[var(--radius)] bg-accent px-4 py-4 text-accent-ink shadow-elev-2',
        className,
      )}
      style={style}
    >
      <span className="label-tag block text-accent-ink/60">{t('nextTest.eyebrow')}</span>
      <span className="mt-1 flex items-center gap-2 text-[16px] leading-snug font-semibold">
        <span className="min-w-0">{title}</span>
        <ArrowRight size={16} className="shrink-0" aria-hidden />
      </span>
      {reasons.length > 0 && (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-accent-ink/75">
          {reasons.join(' · ')}
        </span>
      )}
    </Link>
  )
}
