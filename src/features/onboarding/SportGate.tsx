import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAppData } from '@/lib/store/AppDataProvider'
import { SPORT_CATEGORIES, DISCIPLINES, disciplineById, coreSlugs } from '@/data/sportProfiles'
import { cn } from '@/lib/utils'

/**
 * Erster Schritt nach dem Eintritt: die Sportart.
 *
 * WARUM ALS TOR UND NICHT ALS HINWEIS
 *
 * Ohne Sportart schlägt die App eine allgemeine Batterie vor. Wer damit
 * beginnt, misst Dinge, die für seine Disziplin wenig aussagen — und merkt es
 * erst, wenn Monate an Messungen zusammengekommen sind, die sich nicht
 * vergleichen lassen. Die Frage kostet einen Fingertipp; sie später zu
 * stellen kostet einen Datensatz.
 *
 * KEINE SACKGASSE
 *
 * «Allgemein» ist eine gleichwertige Wahl und steht als eigene Schaltfläche
 * da, nicht als Kleingedrucktes. Wer eine Sportart betreibt, die nicht in der
 * Liste steht, oder einfach seinen Fitnesszustand messen will, kommt damit
 * genauso weiter — er bekommt die allgemeine Batterie und kann die Sportart
 * jederzeit im Testbereich nachtragen.
 *
 * Das Tor erscheint genau einmal je Gerät. Es merkt sich nicht die Wahl,
 * sondern nur, dass die Frage gestellt wurde — sonst stünde es nach jedem
 * Wechsel auf «keine Angabe» wieder da.
 */

const ASKED_KEY = 'baseline.sportAsked'

export function sportWasAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    // Kein Speicher (privater Modus): dann wird die Frage einmal je Sitzung
    // gestellt. Besser als sie zu unterschlagen.
    return false
  }
}

function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* siehe oben */
  }
}

export function SportGate({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation()
  const { data, saveProfile } = useAppData()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return DISCIPLINES
    return DISCIPLINES.filter((d) =>
      [d.name.de, d.name.en, ...(d.aliases ?? [])].join(' ').toLowerCase().includes(needle),
    )
  }, [query])

  const choose = (id: string | null) => {
    const discipline = id ? disciplineById(id) : undefined
    saveProfile({
      disciplineId: discipline?.id ?? null,
      sportCategoryId: discipline?.categoryId ?? null,
    })
    markAsked()
    onDone()
  }

  const current = data.profile.disciplineId

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="shrink-0 border-b-2 border-ink pb-4">
        <span className="label-tag">{t('gate.step')}</span>
        <h1 className="mt-1.5 font-display text-[32px] leading-none font-bold uppercase sm:text-[42px]">
          {t('gate.title')}
        </h1>
        <p className="mt-2.5 max-w-[52ch] text-[14px] leading-relaxed text-ink-secondary">
          {t('gate.body')}
        </p>
      </header>

      <label className="mt-4 flex h-12 shrink-0 items-center gap-2 border border-line bg-surface-sunken px-3">
        <Search size={16} className="shrink-0 text-ink-muted" aria-hidden />
        <span className="sr-only">{t('tests.searchSport')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tests.searchSportPlaceholder')}
          className="h-full w-full min-w-0 bg-transparent text-[16px] outline-none"
          autoFocus
        />
      </label>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto border border-line bg-plane">
        {SPORT_CATEGORIES.map((category) => {
          const inCategory = matches.filter((d) => d.categoryId === category.id)
          if (inCategory.length === 0) return null
          return (
            <section key={category.id}>
              <h2 className="label-tag sticky top-0 border-y border-line bg-surface-sunken px-4 py-1.5 first:border-t-0">
                {category.name[lang]}
              </h2>
              <ul>
                {inCategory.map((discipline) => (
                  <li key={discipline.id}>
                    <button
                      type="button"
                      onClick={() => choose(discipline.id)}
                      className={cn(
                        'flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent-quiet',
                        discipline.id === current && 'bg-accent/12',
                      )}
                    >
                      <span className="text-[15px] font-medium">{discipline.name[lang]}</span>
                      <span className="shrink-0 text-[12px] text-ink-muted">
                        {t('tests.coreCount', { count: coreSlugs(discipline).length })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
        {matches.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-ink-secondary">
            {t('gate.noMatch', { query })}
          </p>
        )}
      </div>

      {/* Gleichwertig, nicht kleingedruckt: wer keine der 39 Disziplinen
          betreibt, soll nicht das Gefühl haben, die App sei nichts für ihn. */}
      <div className="mt-3 shrink-0">
        <Button variant="outline" className="w-full" onClick={() => choose(null)}>
          {t('gate.general')}
        </Button>
        <p className="mt-2 text-center text-[12px] leading-relaxed text-ink-muted">
          {t('gate.generalHint')}
        </p>
      </div>
    </div>
  )
}
