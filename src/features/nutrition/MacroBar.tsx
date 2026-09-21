import { useTranslation } from 'react-i18next'
import type { Macros } from '@/domain/nutrition'

/**
 * Die Energie eines Tages als EIN Balken in drei Teilen: Protein, Kohlen-
 * hydrate, Fett — als Anteil an den Kalorien (4 / 4 / 9).
 *
 * Kein Ziel darunter, kein «Soll». Der Balken zeigt, woraus die Energie
 * bestand. Drei Töne der Marke in Abstufung, keine Ampel: Fett ist nicht
 * rot, Protein ist nicht grün.
 */
export function MacroBar({ macros }: { macros: Macros }) {
  const { t } = useTranslation()
  const p = macros.protein * 4
  const c = macros.carbs * 4
  const f = macros.fat * 9
  const total = p + c + f
  if (total <= 0) return <div className="h-3 bg-surface-sunken" aria-hidden />
  const seg = (v: number) => `${(v / total) * 100}%`
  const label = `${t('nutrition.macros.protein')} ${Math.round((p / total) * 100)} %, ${t('nutrition.macros.carbs')} ${Math.round((c / total) * 100)} %, ${t('nutrition.macros.fat')} ${Math.round((f / total) * 100)} %`
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden" role="img" aria-label={label}>
        <div style={{ width: seg(p), background: 'var(--accent)' }} />
        <div style={{ width: seg(c), background: 'var(--accent)', opacity: 0.6 }} />
        <div style={{ width: seg(f), background: 'var(--accent)', opacity: 0.3 }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tracking-wide text-ink-muted uppercase">
        <span>{t('nutrition.macros.protein')} {Math.round((p / total) * 100)} %</span>
        <span>{t('nutrition.macros.carbs')} {Math.round((c / total) * 100)} %</span>
        <span>{t('nutrition.macros.fat')} {Math.round((f / total) * 100)} %</span>
      </div>
    </div>
  )
}
