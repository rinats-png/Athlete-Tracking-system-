import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/features/shared/useLocale'
import { searchCoreFoods, type CoreFood } from '@/data/foods'
import { lookupBarcode, searchOpenFoodFacts, OFF_ATTRIBUTION, type OffFood } from '@/lib/openFoodFacts'
import { formatNumber } from '@/lib/format'
import { newId } from '@/lib/store/localStore'
import type { StoredMealItem } from '@/lib/store/localStore'
import { cn } from '@/lib/utils'

const GRAM_CHIPS = [30, 50, 100, 150, 200, 250]

/**
 * Lebensmittel suchen und mit Grammzahl übernehmen — ohne Tabelle.
 *
 * ZWEI QUELLEN, EINE REIHENFOLGE: Der Kern (245 geprüfte Einträge, ohne
 * Netz) antwortet beim Tippen. Open Food Facts kommt erst auf Tipp und
 * nur mit Netz — jeder Treffer von dort trägt seine Herkunft am Chip.
 *
 * Die Grammzahl kommt über Chips (30 … 250 g) oder das Feld. Ein Chip
 * ist ein Tipp; eine Zahl tippen sind vier. Die üblichen Portionen sind
 * Chips, der Rest ist das Feld.
 */
export function FoodSearch({ onAdd }: { onAdd: (item: StoredMealItem) => void }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [grams, setGrams] = useState(100)
  const [picked, setPicked] = useState<{ kind: 'core'; food: CoreFood } | { kind: 'off'; food: OffFood } | null>(null)
  const [online, setOnline] = useState<{ state: 'idle' } | { state: 'loading' } | { state: 'done'; foods: OffFood[] } | { state: 'failed'; reason: 'offline' | 'error' }>({ state: 'idle' })
  const abort = useRef<AbortController | null>(null)
  const core = useMemo(() => searchCoreFoods(query), [query])

  useEffect(() => {
    setOnline({ state: 'idle' })
    abort.current?.abort()
  }, [query])

  const searchOnline = async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setOnline({ state: 'loading' })
    const isCode = /^\d{8,14}$/.test(query.trim())
    const r = isCode ? await lookupBarcode(query, ctrl.signal) : await searchOpenFoodFacts(query, ctrl.signal)
    if (ctrl.signal.aborted) return
    setOnline(r.ok ? { state: 'done', foods: r.foods } : { state: 'failed', reason: r.reason })
  }

  const add = () => {
    if (!picked || grams <= 0) return
    const id = newId()
    if (picked.kind === 'core') {
      const f = picked.food
      onAdd({ id, foodKey: f.key, name: f.name, source: 'core', grams, per100: { kcal: f.per100.kcal, protein: f.per100.protein, fat: f.per100.fat, carbs: f.per100.carbs, fiber: f.per100.fiber }, barcode: null })
    } else {
      const f = picked.food
      onAdd({ id, foodKey: null, name: f.brand ? `${f.name} (${f.brand})` : f.name, source: 'off', grams, per100: { kcal: f.per100.kcal, protein: f.per100.protein, fat: f.per100.fat, carbs: f.per100.carbs, fiber: f.per100.fiber }, barcode: f.code })
    }
    setPicked(null)
    setQuery('')
    setGrams(100)
  }

  const per100 = picked ? picked.food.per100 : null
  const preview = per100 ? (per100.kcal * grams) / 100 : null

  return (
    <div className="border border-dashed border-line-strong p-3" data-testid="food-search">
      <label className="block text-[13px]">
        <span className="label-tag">{t('nutrition.search.label')}</span>
        <input
          type="search"
          aria-label={t('nutrition.search.label')}
          placeholder={t('nutrition.search.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPicked(null)
          }}
          className="mt-1.5 min-h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
        />
      </label>

      {query.trim() && !picked && (
        <div className="mt-2 flex flex-wrap gap-2" role="listbox" aria-label={t('nutrition.search.core')}>
          {core.map((f) => (
            <button key={f.key} type="button" role="option" aria-selected={false} onClick={() => setPicked({ kind: 'core', food: f })} className="min-h-11 rounded-pill border border-line px-3 text-left text-[12px] hover:border-accent hover:bg-accent-quiet">
              {f.name}
              <span className="readout ml-1.5 text-[11px] text-ink-muted">{f.per100.kcal} kcal</span>
            </button>
          ))}
          {core.length === 0 && <p className="text-[12px] text-ink-muted">{t('nutrition.search.noneCore')}</p>}
        </div>
      )}

      {query.trim().length >= 3 && !picked && (
        <div className="mt-3">
          {online.state === 'idle' && (
            <Button variant="ghost" size="sm" className="-ml-3" onClick={searchOnline}>
              <Globe size={13} aria-hidden />
              {t('nutrition.search.online')}
            </Button>
          )}
          {online.state === 'loading' && <p className="text-[12px] text-ink-muted" aria-live="polite">{t('nutrition.search.loading')}</p>}
          {online.state === 'failed' && <p className="text-[12px] text-ink-secondary" role="status">{t(`nutrition.search.${online.reason}`)}</p>}
          {online.state === 'done' && (
            <>
              <p className="label-tag">{t('nutrition.search.offResults')}</p>
              <div className="mt-1.5 flex flex-wrap gap-2" role="listbox" aria-label={t('nutrition.search.offResults')}>
                {online.foods.length === 0 && <p className="text-[12px] text-ink-muted">{t('nutrition.search.noneOff')}</p>}
                {online.foods.map((f) => (
                  <button key={f.code} type="button" role="option" aria-selected={false} onClick={() => setPicked({ kind: 'off', food: f })} className="min-h-11 rounded-pill border border-line px-3 text-left text-[12px] hover:border-accent hover:bg-accent-quiet">
                    {f.name}
                    {f.brand && <span className="ml-1 text-ink-muted">· {f.brand}</span>}
                    <span className="readout ml-1.5 text-[11px] text-ink-muted">{Math.round(f.per100.kcal)} kcal</span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-muted">{OFF_ATTRIBUTION} · {t('nutrition.search.offQuality')}</p>
            </>
          )}
        </div>
      )}

      {picked && (
        <div className="mt-3 border border-line bg-surface-sunken p-3" data-testid="food-picked">
          <p className="text-[14px]">
            {picked.kind === 'core' ? picked.food.name : `${picked.food.name}${picked.food.brand ? ` (${picked.food.brand})` : ''}`}
            <span className="ml-2 text-[11px] tracking-wide text-ink-muted uppercase">{picked.kind === 'core' ? t('nutrition.source.core') : t('nutrition.source.off')}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('nutrition.search.portion')}>
            {GRAM_CHIPS.map((g) => (
              <button key={g} type="button" aria-pressed={grams === g} onClick={() => setGrams(g)} className={cn('readout min-h-11 rounded-pill border px-3 text-[13px]', grams === g ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-accent')}>
                {g} g
              </button>
            ))}
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={5000}
              aria-label={t('nutrition.search.grams')}
              value={grams}
              onChange={(e) => setGrams(Math.max(0, Number(e.target.value) || 0))}
              className="readout min-h-11 w-24 border border-line bg-surface px-2 text-[16px]"
            />
          </div>
          <p className="mt-2 text-[12px] text-ink-secondary" data-testid="food-preview">
            {preview != null && per100
              ? t('nutrition.search.preview', { kcal: formatNumber(preview, locale, 0), protein: formatNumber((per100.protein * grams) / 100, locale, 1), carbs: formatNumber((per100.carbs * grams) / 100, locale, 1), fat: formatNumber((per100.fat * grams) / 100, locale, 1) })
              : ''}
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="primary" size="sm" disabled={grams <= 0} onClick={add}>
              <Plus size={13} aria-hidden />
              {t('nutrition.search.add')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
