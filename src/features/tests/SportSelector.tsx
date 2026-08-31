import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import { SPORT_CATEGORIES, DISCIPLINES, disciplineById } from '@/data/sportProfiles'
import { cn } from '@/lib/utils'

/**
 * Sportartwahl als Einstieg in den Testbereich.
 *
 * WARUM DAS HIER STEHT UND NICHT NUR IM PROFIL
 *
 * Der Testbereich war nach Fähigkeiten geordnet — Ausdauer, Kraft,
 * Schnellkraft. Das ist die Sicht der Trainingswissenschaft, nicht die des
 * Athleten. Wer die App öffnet, denkt «ich mache Judo», nicht «ich brauche
 * heute Kraftausdauer». Solange die Sportart ein Feld unter vielen im Profil
 * war, hat sie niemand gefunden, und der Testbereich sah aus wie ein
 * allgemeiner Fitnesskatalog.
 *
 * Deshalb steht die Wahl jetzt oben im Testbereich, sichtbar und offen: alle
 * 39 Sportarten als antippbare Liste mit Suchfeld, nicht als aufklappbares
 * Menü. Ein Menü verbirgt seine Einträge, bis man es öffnet — genau das war
 * das Problem.
 *
 * Gespeichert wird im selben Profilfeld wie zuvor. Es gibt weiterhin genau
 * einen Ort für diese Angabe; nur der Weg dorthin ist jetzt der, den die
 * Leute tatsächlich gehen.
 */
export function SportSelector({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const { data, saveProfile } = useAppData()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const selected = data.profile.disciplineId ? disciplineById(data.profile.disciplineId) : undefined

  // Bei getroffener Wahl bleibt die Liste zu — sie hat ihren Zweck erfüllt.
  const [open, setOpen] = useState(!selected)
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return DISCIPLINES
    return DISCIPLINES.filter((d) => {
      const haystack = [d.name.de, d.name.en, ...(d.aliases ?? [])].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }, [query])

  const choose = (id: string) => {
    const discipline = disciplineById(id)
    saveProfile({
      disciplineId: discipline?.id ?? null,
      sportCategoryId: discipline?.categoryId ?? null,
    })
    setOpen(false)
    setQuery('')
  }

  if (selected && !open) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 border border-line bg-plane px-4 py-3',
          compact && 'py-2.5',
        )}
      >
        <div className="min-w-0">
          <span className="label-tag">{t('tests.yourSport')}</span>
          <p className="mt-0.5 font-display text-[20px] leading-none font-bold uppercase">
            {selected.name[lang]}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t('tests.changeSport')}
        </Button>
      </div>
    )
  }

  return (
    <div className="border border-line bg-plane">
      <div className="border-b border-line px-4 py-3">
        <span className="label-tag">{t('tests.chooseSport')}</span>
        <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
          {t('tests.chooseSportHint')}
        </p>
        <label className="mt-2.5 flex h-11 items-center gap-2 border border-line bg-surface-sunken px-3">
          <Search size={15} className="shrink-0 text-ink-muted" aria-hidden />
          <span className="sr-only">{t('tests.searchSport')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tests.searchSportPlaceholder')}
            className="h-full w-full min-w-0 bg-transparent text-[16px] outline-none"
          />
        </label>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {SPORT_CATEGORIES.map((category) => {
          const inCategory = matches.filter((d) => d.categoryId === category.id)
          if (inCategory.length === 0) return null
          return (
            <section key={category.id}>
              {/* Die Cluster ordnen die Liste, sie versperren sie nicht:
                  jede Sportart ist ohne weiteren Schritt antippbar. */}
              <h3 className="label-tag sticky top-0 border-y border-line bg-surface-sunken px-4 py-1.5">
                {category.name[lang]}
              </h3>
              <ul>
                {inCategory.map((discipline) => {
                  const isSelected = discipline.id === selected?.id
                  return (
                    <li key={discipline.id}>
                      <button
                        type="button"
                        onClick={() => choose(discipline.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          'flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isSelected ? 'bg-accent/12' : 'hover:bg-accent-quiet',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium">
                            {discipline.name[lang]}
                          </span>
                          <span className="block text-[12px] text-ink-muted">
                            {t('tests.coreCount', { count: discipline.coreTests.length })}
                          </span>
                        </span>
                        {isSelected && (
                          <Check size={16} className="shrink-0 text-accent-text" aria-hidden />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        {matches.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-ink-secondary">
            {t('tests.noSportMatch', { query })}
          </p>
        )}
      </div>

      {selected && (
        <div className="border-t border-line px-4 py-2.5">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t('actions.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}
