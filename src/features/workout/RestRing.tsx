import { useTranslation } from 'react-i18next'
import { formatClock } from '@/domain/workoutClock'

/**
 * Satzpause als Ring (Mockup «Pause als Ring»): aus dem Augenwinkel lesbar,
 * ±15 s, der nächste Satz als Vorschau, ein grosser Knopf zum Überspringen.
 * Deckt den Bildschirm ab, bleibt aber ein Dialog ohne Fokusfalle: die
 * Knöpfe sind die einzigen Bedienelemente.
 */
export function RestRing({ leftS, totalS, next, onAdjust, onSkip }: {
  leftS: number
  totalS: number
  next: string | null
  onAdjust: (deltaS: number) => void
  onSkip: () => void
}) {
  const { t } = useTranslation()
  const r = 45
  const c = 2 * Math.PI * r
  const frac = totalS > 0 ? Math.min(1, Math.max(0, leftS / totalS)) : 0
  return (
    <div role="dialog" aria-modal="false" aria-label={t('workout.rest.title')} data-testid="setlog-rest" className="fixed inset-0 z-[60] flex flex-col items-center bg-[#08231A] px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#E9EFEB]">
      <p className="label-tag !text-[#7FE5B5]">{t('workout.rest.title')}</p>
      <div className="relative mt-6 grid size-[min(300px,72vw)] place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#173B2E" strokeWidth="5" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#7FE5B5" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
        </svg>
        <div className="text-center">
          <p className="readout font-display text-[clamp(72px,24vw,104px)] leading-none font-bold" data-testid="rest-clock" aria-live="off">{formatClock(leftS)}</p>
          <p className="label-tag mt-1 !text-[#A9B7B0]">{t('workout.rest.of', { total: formatClock(totalS) })}</p>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={() => onAdjust(-15)} data-testid="rest-minus" className="min-h-13 w-24 rounded-pill border border-[#2B5446] text-[16px] font-semibold">−15 s</button>
        <button type="button" onClick={() => onAdjust(15)} data-testid="rest-plus" className="min-h-13 w-24 rounded-pill border border-[#2B5446] text-[16px] font-semibold">+15 s</button>
      </div>
      {next && (
        <div className="mt-6 w-full max-w-md rounded-2xl bg-white/5 px-4 py-3">
          <p className="label-tag !text-[#A9B7B0]">{t('workout.rest.next')}</p>
          <p className="mt-0.5 text-[17px] font-semibold" data-testid="rest-next">{next}</p>
        </div>
      )}
      <p className="mt-4 text-[13px] text-[#A9B7B0]">{t('workout.rest.sound')}</p>
      <button type="button" onClick={onSkip} data-testid="setlog-rest-skip" className="mt-auto min-h-16 w-full max-w-md rounded-pill bg-[#7FE5B5] text-[18px] font-semibold text-[#08231A]">
        {t('workout.rest.skip')}
      </button>
    </div>
  )
}
