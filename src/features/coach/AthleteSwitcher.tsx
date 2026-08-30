import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, LayoutList, Plus, Users } from 'lucide-react'
import { useAppData } from '@/lib/store/AppDataProvider'
import { cn } from '@/lib/utils'

/**
 * Athletenwechsel in der Kopfzeile.
 *
 * Sichtbar nur im Trainermodus. Im Einzelmodus wäre eine Auswahl mit genau
 * einem Eintrag ein Bedienelement ohne Funktion — und ein Trainerwerkzeug im
 * Weg eines Athleten, der nur seine eigenen Werte führt.
 *
 * Wer gerade betrachtet wird, muss dauerhaft sichtbar sein: eine Messung, die
 * beim falschen Kunden landet, ist im Nachhinein kaum zu erkennen.
 */
export function AthleteSwitcher() {
  const { t } = useTranslation()
  const { role, athletes, activeAthleteId, switchAthlete, addAthlete } = useAppData()
  const [open, setOpen] = useState(false)

  if (role !== 'coach') return null

  const visible = athletes.filter((a) => !a.archived)
  const active = athletes.find((a) => a.id === activeAthleteId)
  const label = (athlete: (typeof athletes)[number]) =>
    athlete.name || athlete.profile.firstName || t('coach.unnamed')

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex min-h-11 max-w-[46vw] items-center gap-1.5 border border-line px-2.5 text-[13px] transition-colors hover:bg-surface-sunken sm:max-w-none"
      >
        <Users size={14} className="shrink-0 text-ink-muted" aria-hidden />
        <span className="truncate">{active ? label(active) : t('coach.unnamed')}</span>
        <ChevronDown size={14} className="shrink-0 text-ink-muted" aria-hidden />
      </button>

      {open && (
        <>
          {/* Klick daneben schliesst — ohne Fokusfalle, die Tastaturnutzer
              einsperrt. */}
          <button
            type="button"
            aria-label={t('actions.close')}
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label={t('coach.athletes')}
            className="absolute right-0 z-40 mt-1 max-h-[60vh] w-64 overflow-y-auto border border-line bg-plane shadow-lg"
          >
            {visible.map((athlete) => (
              <li key={athlete.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={athlete.id === activeAthleteId}
                  onClick={() => {
                    switchAthlete(athlete.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-2 px-3 text-left text-[14px] transition-colors hover:bg-surface-sunken',
                    athlete.id === activeAthleteId && 'bg-accent/10',
                  )}
                >
                  <Check
                    size={14}
                    aria-hidden
                    className={cn(
                      'shrink-0',
                      athlete.id === activeAthleteId ? 'text-accent-text' : 'invisible',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{label(athlete)}</span>
                  <span className="shrink-0 text-[11px] text-ink-muted tabular-nums">
                    {athlete.results.length}
                  </span>
                </button>
              </li>
            ))}
            <li className="border-t border-line">
              <Link
                to="/trainer"
                onClick={() => setOpen(false)}
                className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-[14px] transition-colors hover:bg-surface-sunken"
              >
                <LayoutList size={14} className="shrink-0" aria-hidden />
                {t('coachDash.title')}
              </Link>
            </li>
            <li className="border-t border-line">
              <button
                type="button"
                onClick={() => {
                  addAthlete('')
                  setOpen(false)
                }}
                className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-[14px] transition-colors hover:bg-surface-sunken"
              >
                <Plus size={14} className="shrink-0" aria-hidden />
                {t('coach.addAthlete')}
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  )
}
