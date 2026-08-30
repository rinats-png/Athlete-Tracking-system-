import { useTranslation } from 'react-i18next'
import { useAppData } from '@/lib/store/AppDataProvider'
import {
  SPORT_CATEGORIES,
  disciplineById,
  disciplinesFor,
  type SportCategoryId,
} from '@/data/sportProfiles'

/**
 * Cluster und Disziplin als zwei abhängige Auswahlmenüs.
 *
 * Bewusste Entscheidungen:
 *
 * — KEINE Vorauswahl. Ein vorbelegtes Feld wird als beantwortet gelesen; die
 *   App hätte dann eine Angabe, die niemand gemacht hat, und würde daraus
 *   Testempfehlungen ableiten.
 * — Das zweite Menü ist deaktiviert MIT BEGRÜNDUNG statt versteckt. Ein Feld,
 *   das erscheint und verschwindet, wirkt wie ein Fehler; ein deaktiviertes
 *   Feld mit Erklärung sagt, was zu tun ist.
 * — Ein Wechsel des Clusters löst die Disziplin. Das wird vorher gefragt,
 *   weil es sonst eine stille Löschung wäre.
 * — Überspringbar. Wer nichts auswählt, verliert nichts ausser dem Vorschlag;
 *   die Freitextfelder darunter bleiben der Weg für alles, was die Liste
 *   nicht kennt.
 *
 * Bewusst native `<select>`: auf dem Telefon ist das Systemrad bedienbarer als
 * jede nachgebaute Liste, und es funktioniert mit Screenreader und Tastatur,
 * ohne dass wir das selbst herstellen müssen.
 */
export function DisciplinePicker() {
  const { t, i18n } = useTranslation()
  const { data, saveProfile } = useAppData()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const p = data.profile

  const categoryId = (p.sportCategoryId ?? '') as SportCategoryId | ''
  const options = categoryId ? disciplinesFor(categoryId) : []
  const selected = p.disciplineId ? disciplineById(p.disciplineId) : undefined

  const changeCategory = (next: string) => {
    // Eine gewählte Disziplin gehört immer zum bisherigen Cluster und wäre
    // danach falsch. Erst fragen, dann lösen.
    if (p.disciplineId && next !== p.sportCategoryId) {
      if (!window.confirm(t('profile.disciplineResetConfirm'))) return
    }
    saveProfile({ sportCategoryId: next || null, disciplineId: null })
  }

  return (
    <>
      <label className="block">
        <span className="label-tag">{t('profile.sportCategory')}</span>
        <select
          value={categoryId}
          aria-label={t('profile.sportCategory')}
          onChange={(e) => changeCategory(e.target.value)}
          className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2.5 text-[15px]"
        >
          <option value="">{t('profile.noAnswer')}</option>
          {SPORT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name[lang]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label-tag">{t('profile.discipline')}</span>
        <select
          value={p.disciplineId ?? ''}
          disabled={options.length === 0}
          aria-label={t('profile.discipline')}
          aria-describedby="discipline-hint"
          onChange={(e) => saveProfile({ disciplineId: e.target.value || null })}
          className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2.5 text-[15px] disabled:opacity-60"
        >
          <option value="">{t('profile.noAnswer')}</option>
          {options.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name[lang]}
            </option>
          ))}
        </select>
        <span id="discipline-hint" className="mt-1 block text-[12px] leading-relaxed text-ink-muted">
          {options.length === 0 ? t('profile.disciplineNeedsCategory') : t('profile.disciplineHint')}
        </span>
      </label>

      {selected ? (
        <p className="text-[12px] leading-relaxed text-ink-muted sm:col-span-2">
          {selected.rationale[lang]}
        </p>
      ) : null}
    </>
  )
}
