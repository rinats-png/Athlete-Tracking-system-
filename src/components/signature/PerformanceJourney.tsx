import { useTranslation } from 'react-i18next'
import { useLocale } from '@/features/shared/useLocale'
import { getTest } from '@/data/testCatalog'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { JourneyNode } from '@/domain/journey'

/**
 * Die Performance Journey — das dritte Signature-Element.
 *
 * Eine waagerechte Zeitachse mit Ereignisknoten. Die Linie zeichnet sich von
 * links, dann erscheinen die Knoten der Reihe nach: die Bewegung ist die
 * Zeit selbst, nicht Zierde.
 *
 * Sie SCROLLT waagerecht und wird nicht gestaucht. Sechs Knoten auf eine
 * Telefonbreite zu quetschen macht die Beschriftungen unlesbar, und dann
 * ist die ganze Darstellung wertlos — lieber schieben.
 */
export function PerformanceJourney({
  nodes,
  className,
}: {
  nodes: JourneyNode[]
  className?: string
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  if (nodes.length < 2) return null

  return (
    <div className={cn('overflow-x-auto', className)}>
      <ol className="relative flex min-w-[520px] items-start pt-1">
        <span
          aria-hidden
          className="journey-line absolute top-2 right-3 left-3 h-px origin-left"
          style={{ background: 'linear-gradient(90deg, var(--line-strong), var(--accent))' }}
        />
        {nodes.map((node, i) => {
          const test = node.testSlug ? getTest(node.testSlug) : undefined
          const now = node.kind === 'now'
          return (
            <li
              key={`${node.kind}-${node.on}-${i}`}
              className="journey-node relative flex-1 px-1 text-center"
              style={{ animationDelay: `${300 + i * 260}ms` }}
            >
              <span
                aria-hidden
                className={cn(
                  'relative z-10 mx-auto block size-3 rounded-pill border-[1.5px]',
                  now
                    ? 'border-accent bg-accent ring-4 ring-accent-quiet'
                    : 'border-line-strong bg-surface-raised',
                )}
              />
              <span
                className={cn(
                  'mt-2 block text-[8px] leading-snug tracking-[0.1em] uppercase',
                  now ? 'font-bold text-ink' : 'text-ink-muted',
                )}
              >
                {t(`journey.kind.${node.kind}`)}
              </span>
              <span className="mt-0.5 block text-[9px] text-ink-muted">
                {formatDate(node.on, locale)}
              </span>
              {test && (
                <span className="readout mt-0.5 block text-[9px] text-accent-text">
                  {test.shortName[locale]}
                  {node.value != null && ` · ${formatNumber(node.value, locale, 1)}`}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
