import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { StatTile } from '@/components/ui/StatTile'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ScreenHeader } from '@/features/shared/ScreenHeader'
import { useLocale } from '@/features/shared/useLocale'
import { useAppData } from '@/lib/store/AppDataProvider'
import { entryOn, rollingMean, toDay } from '@/domain/diary'
import { bmrMifflin, dayMacros, itemMacros, mealMacros, microCoverage, observedTdee, PAL_LEVELS, tdeeFromBmr, MIFFLIN_ERROR_PCT, type Pal } from '@/domain/nutrition'
import { newId } from '@/lib/store/localStore'
import type { StoredMeal, StoredMealItem } from '@/lib/store/localStore'
import { ageFromBirthDate, formatDate, formatNumber } from '@/lib/format'
import { FoodSearch } from './FoodSearch'
import { MacroBar } from './MacroBar'

const SLOTS: StoredMeal['slot'][] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre', 'intra', 'post']

function shift(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000))
}

/**
 * Ernährung — Schicht S4 (docs/ausbau.md).
 *
 * Ein Tag pro Bildschirm, Mahlzeiten als Karten, Lebensmittel als Zeilen
 * mit Gramm und Energie. Darüber die Tagessumme mit dem Makrobalken.
 *
 * DIE REFERENZ IST KEIN ZIEL. Unten steht der Grundumsatz nach Mifflin-St
 * Jeor mit Quelle und Fehler, der Gesamtumsatz mit dem PAL als
 * Selbstauskunft — und, sobald 14 Tage vorliegen, der BEOBACHTETE Umsatz
 * aus Zufuhr und Gewicht. Der beobachtete steht vor dem berechneten:
 * gemessen schlägt geschätzt. Nichts davon sagt, was jemand essen soll
 * (§81, und docs/ausbau.md Abschnitt 4).
 */
export function NutritionScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { meals, saveMeal, deleteMeal, diary, nutrition, saveNutrition, data, role } = useAppData()
  const today = toDay(new Date())
  const [day, setDay] = useState(today)
  const [adding, setAdding] = useState<StoredMeal['slot'] | null>(null)

  const dayMeals = useMemo(() => meals.filter((m) => m.day === day).sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)), [meals, day])
  const totals = useMemo(() => dayMacros(meals, day), [meals, day])
  const coverage = microCoverage(meals, day)

  const weight = entryOn(diary, day)?.weightKg ?? rollingMean(diary, 'weightKg', day, 7).mean
  const bmr = bmrMifflin({ weightKg: weight, heightCm: data.profile.heightCm, ageYears: ageFromBirthDate(data.profile.birthDate), sex: data.profile.sex })
  const tdee = tdeeFromBmr(bmr, nutrition.pal)
  const observed = useMemo(() => observedTdee(meals, diary, today), [meals, diary, today])
  const intake28 = useMemo(() => {
    const days: number[] = []
    for (let i = 0; i < 28; i++) {
      const k = dayMacros(meals, shift(today, -i)).kcal
      if (k > 0) days.push(k)
    }
    return days.length ? { mean: days.reduce((a, b) => a + b, 0) / days.length, n: days.length } : null
  }, [meals, today])

  const addItem = (slot: StoredMeal['slot'], item: StoredMealItem) => {
    const existing = dayMeals.find((m) => m.slot === slot)
    const now = new Date().toISOString()
    saveMeal(existing ? { ...existing, items: [...existing.items, item], updatedAt: now } : { id: newId(), day, slot, items: [item], note: '', createdAt: now, updatedAt: now })
    setAdding(null)
  }
  const removeItem = (meal: StoredMeal, itemId: string) => {
    const items = meal.items.filter((i) => i.id !== itemId)
    if (items.length === 0) deleteMeal(meal.id)
    else saveMeal({ ...meal, items, updatedAt: new Date().toISOString() })
  }

  return (
    <>
      <ScreenHeader eyebrow={t('nutrition.eyebrow')} title={t('nutrition.title')} intro={role === 'coach' ? t('nutrition.introCoach') : t('nutrition.intro')} />

      {/* --- Der Tag ---------------------------------------------------- */}
      <Panel ticked float className="mb-4">
        <div className="flex items-center justify-between gap-2 border-b border-line px-2 py-2">
          <Button variant="ghost" size="icon" aria-label={t('diary.prevDay')} onClick={() => setDay(shift(day, -1))}>
            <ChevronLeft size={18} aria-hidden />
          </Button>
          <div className="text-center">
            <p className="font-display text-[18px] font-bold uppercase tracking-[0.06em]">{day === today ? t('diary.today') : day === shift(today, -1) ? t('diary.yesterday') : formatDate(`${day}T12:00:00Z`, locale)}</p>
            {day !== today && (
              <button type="button" onClick={() => setDay(today)} className="text-[11px] text-accent-text underline-offset-2 hover:underline">
                {t('diary.backToToday')}
              </button>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label={t('diary.nextDay')} disabled={day >= today} onClick={() => setDay(shift(day, 1))}>
            <ChevronRight size={18} aria-hidden />
          </Button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
          <StatTile label={t('nutrition.day.kcal')} value={formatNumber(totals.kcal, locale, 0)} unit="kcal" emphasis />
          <StatTile label={t('nutrition.macros.protein')} value={formatNumber(totals.protein, locale, 0)} unit="g" />
          <StatTile label={t('nutrition.macros.carbs')} value={formatNumber(totals.carbs, locale, 0)} unit="g" />
          <StatTile label={t('nutrition.macros.fat')} value={formatNumber(totals.fat, locale, 0)} unit="g" meta={t('nutrition.day.fiber', { g: formatNumber(totals.fiber, locale, 0) })} />
        </div>
        <div className="border-t border-line px-4 py-3">
          <MacroBar macros={totals} />
          <p className="mt-2 text-[11px] text-ink-muted" data-testid="micro-coverage">
            {coverage.total > 0 ? t('nutrition.day.coverage', { covered: coverage.covered, total: coverage.total }) : t('nutrition.day.empty')}
          </p>
        </div>
      </Panel>

      {/* --- Mahlzeiten ------------------------------------------------ */}
      <div className="mb-4 space-y-3">
        {SLOTS.map((slot) => {
          const meal = dayMeals.find((m) => m.slot === slot)
          if (!meal && adding !== slot) {
            // Leere Slots als schmale Reihe von Knöpfen — nicht sieben leere Karten.
            return null
          }
          const m = meal ? mealMacros(meal) : null
          return (
            <Panel key={slot} data-testid={`meal-${slot}`}>
              <PanelHeader title={t(`nutrition.slots.${slot}`)} subtitle={m ? t('nutrition.meal.sum', { kcal: formatNumber(m.kcal, locale, 0), protein: formatNumber(m.protein, locale, 0), carbs: formatNumber(m.carbs, locale, 0), fat: formatNumber(m.fat, locale, 0) }) : undefined} />
              {meal && (
                <ul className="divide-y divide-line">
                  {meal.items.map((item) => {
                    const im = itemMacros(item)
                    return (
                      <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[14px]">
                            {item.name}
                            <span className="ml-2 text-[10px] tracking-wide text-ink-muted uppercase">{t(`nutrition.source.${item.source}`)}</span>
                          </p>
                          <p className="readout text-[12px] text-ink-muted">
                            {item.grams} g · {formatNumber(im.kcal, locale, 0)} kcal · P {formatNumber(im.protein, locale, 0)} · KH {formatNumber(im.carbs, locale, 0)} · F {formatNumber(im.fat, locale, 0)}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" aria-label={`${t('nutrition.meal.remove')}: ${item.name}`} onClick={() => removeItem(meal, item.id)}>
                          <Trash2 size={14} aria-hidden />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="px-4 py-3">
                {adding === slot ? (
                  <>
                    <FoodSearch onAdd={(item) => addItem(slot, item)} />
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAdding(null)}>
                      {t('actions.close')}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setAdding(slot)}>
                    {t('nutrition.meal.addFood')}
                  </Button>
                )}
              </div>
            </Panel>
          )
        })}
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('nutrition.meal.newSlot')}>
          {SLOTS.filter((s) => !dayMeals.some((m) => m.slot === s) && adding !== s).map((slot) => (
            <Button key={slot} variant="outline" size="sm" onClick={() => setAdding(slot)}>
              + {t(`nutrition.slots.${slot}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* --- Referenz, kein Ziel ------------------------------------------ */}
      <Panel className="mb-4" data-testid="nutrition-reference">
        <PanelHeader title={t('nutrition.reference.title')} subtitle={t('nutrition.reference.why')} />
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatTile
            label={t('nutrition.reference.observed')}
            value={observed ? formatNumber(observed.tdee, locale, 0) : '—'}
            unit={observed ? 'kcal' : undefined}
            emphasis={observed != null}
            meta={observed ? t('nutrition.reference.observedMeta', { days: observed.days, delta: formatNumber(observed.weightDelta, locale, 1) }) : t('nutrition.reference.observedNeeds', { days: 14 })}
          />
          <StatTile label={t('nutrition.reference.tdee')} value={tdee != null ? formatNumber(tdee, locale, 0) : '—'} unit={tdee != null ? 'kcal' : undefined} meta={bmr != null ? t('nutrition.reference.tdeeMeta', { bmr: formatNumber(bmr, locale, 0), pal: nutrition.pal }) : t('nutrition.reference.missing')} />
          <StatTile label={t('nutrition.reference.intake')} value={intake28 ? formatNumber(intake28.mean, locale, 0) : '—'} unit={intake28 ? 'kcal' : undefined} meta={intake28 ? t('nutrition.reference.intakeMeta', { n: intake28.n }) : t('nutrition.day.empty')} />
        </div>
        <div className="border-t border-line px-4 py-3">
          <SegmentedControl
            label={t('nutrition.reference.pal')}
            value={String(nutrition.pal)}
            onChange={(v) => saveNutrition({ pal: Number(v) as Pal })}
            options={PAL_LEVELS.map((p) => ({ value: String(p), label: t(`nutrition.reference.palLevels.${String(p).replace('.', '_')}`), hint: String(p) }))}
            className="flex-wrap"
          />
          <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">{t('nutrition.reference.formula', { error: MIFFLIN_ERROR_PCT })}</p>
          <p className="mt-1 text-[11px] text-ink-muted">{t('nutrition.reference.noTarget')}</p>
        </div>
      </Panel>

      <Panel>
        <div className="px-4 py-3">
          <p className="text-[12px] leading-relaxed text-ink-secondary">{t('nutrition.links.why')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/tagebuch">
                {t('diary.title')}
                <ArrowRight size={14} aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/cockpit">
                {t('cockpit.title')}
                <ArrowRight size={14} aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/gesundheit">
                {t('health.title')}
                <ArrowRight size={14} aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </Panel>
    </>
  )
}
