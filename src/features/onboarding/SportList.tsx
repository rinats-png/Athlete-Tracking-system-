import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search } from 'lucide-react'
import { SPORT_CATEGORIES, DISCIPLINES, coreSlugs, type Discipline } from '@/data/sportProfiles'
import { cn } from '@/lib/utils'

/**
 * Die Sportartenliste — alle Disziplinen, nach Bereichen gruppiert, mit
 * Suche über Name und Zweitnamen.
 *
 * Einmal gebaut, an drei Stellen benutzt: Hauptsportart im Einstieg, weitere
 * Sportarten im Einstieg, Sportartwechsel im Profil. Eine Liste, die an
 * jeder Stelle etwas anders sortiert oder anders sucht, wäre drei Listen.
 */
export function SportList({
  selected,
  onToggle,
  multiple = false,
  exclude = [],
  autoFocus = false,
}: {
  selected: string[]
  onToggle: (id: string) => void
  multiple?: boolean
  exclude?: string[]
  autoFocus?: boolean
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const pool = DISCIPLINES.filter((d) => !exclude.includes(d.id))
    if (!needle) return pool
    return pool.filter((d) =>
      [d.name.de, d.name.en, ...(d.aliases ?? [])].join(' ').toLowerCase().includes(needle),
    )
  }, [query, exclude])

  const row = (discipline: Discipline) => {
    const active = selected.includes(discipline.id)
    return (
      <li key={discipline.id}>
        <button
          type="button"
          onClick={() => onToggle(discipline.id)}
          aria-pressed={active}
          className={cn(
            'flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent-quiet',
            active && 'bg-accent-quiet',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {multiple && (
              <span
                aria-hidden
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center border',
                  active ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong',
                )}
              >
                {active && <Check size={13} strokeWidth={3} />}
              </span>
            )}
            <span className="truncate text-[15px] font-medium">{discipline.name[lang]}</span>
          </span>
          <span className="shrink-0 text-[12px] text-ink-muted">
            {t('tests.coreCount', { count: coreSlugs(discipline).length })}
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <label className="flex h-12 shrink-0 items-center gap-2 border border-line bg-surface-sunken px-3">
        <Search size={16} className="shrink-0 text-ink-muted" aria-hidden />
        <span className="sr-only">{t('onboarding.sport.search')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('onboarding.sport.searchPlaceholder')}
          className="h-full w-full min-w-0 bg-transparent text-[16px] outline-none"
          autoFocus={autoFocus}
        />
      </label>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto border border-line bg-surface">
        {SPORT_CATEGORIES.map((category) => {
          const inCategory = matches.filter((d) => d.categoryId === category.id)
          if (inCategory.length === 0) return null
          return (
            <section key={category.id}>
              <h3 className="label-tag sticky top-0 border-y border-line bg-surface-sunken px-4 py-1.5 first:border-t-0">
                {category.name[lang]}
              </h3>
              <ul>{inCategory.map(row)}</ul>
            </section>
          )
        })}
        {matches.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-ink-secondary">
            {t('onboarding.sport.noMatch', { query })}
          </p>
        )}
      </div>
    </div>
  )
}
