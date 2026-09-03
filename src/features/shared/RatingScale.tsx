import { useTranslation } from 'react-i18next'
import { RATING_LEVELS, type RatingLevel } from '@/domain/rating'
import { cn } from '@/lib/utils'

/**
 * Die Skala Schwach → Durchschnitt → Gut → Sehr gut → Elite (Konzept §15).
 *
 * Fünf gleich breite Felder, das erreichte ist gefüllt. Bewusst keine
 * Farbampel: Rot für «Schwach» hiesse, ein Athlet unter dem Mittel seiner
 * Kohorte sei ein Problem. Er ist unter dem Mittel — mehr sagt die Zahl nicht.
 */
export function RatingScale({ level, compact = false }: { level: RatingLevel | null; compact?: boolean }) {
  const { t } = useTranslation()
  const reached = level ? RATING_LEVELS.indexOf(level) : -1
  return (
    <div role="img" aria-label={`${t('rating.scaleLabel')}: ${level ? t(`rating.levels.${level}`) : t('rating.none')}`}>
      <div className="grid grid-cols-5 gap-1">
        {RATING_LEVELS.map((step, index) => (
          <div
            key={step}
            className={cn(
              'h-2 border',
              index <= reached ? 'border-accent bg-accent' : 'border-line bg-surface-sunken',
              index === reached && 'ring-2 ring-accent/40',
            )}
          />
        ))}
      </div>
      {!compact && (
        <div className="mt-1 grid grid-cols-5 gap-1">
          {RATING_LEVELS.map((step, index) => (
            <span
              key={step}
              className={cn(
                'truncate text-[10px] uppercase tracking-wide',
                index === reached ? 'font-semibold text-ink' : 'text-ink-muted',
              )}
            >
              {t(`rating.levels.${step}`)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Die Stufe als Wort, für Listen. */
export function RatingWord({ level, className }: { level: RatingLevel | null; className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={cn('label-tag', level ? 'text-accent-text' : 'text-ink-muted', className)}>
      {level ? t(`rating.levels.${level}`) : '—'}
    </span>
  )
}
