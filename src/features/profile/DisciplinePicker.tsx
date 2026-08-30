import { useTranslation } from 'react-i18next'
import { useAppData } from '@/lib/store/AppDataProvider'
import {
  SPORT_CATEGORIES,
  disciplineById,
  disciplinesFor,
  type SportCategoryId,
} from '@/data/sportProfiles'
import { getTest } from '@/data/testCatalog'
import { provenanceOf } from '@/data/documentCoverage'

/**
 * Sportartauswahl: EIN Menü mit allen Disziplinen, nach Bereichen gruppiert.
 *
 * Vorher standen hier zwei voneinander abhängige Menüs, das zweite gesperrt,
 * bis das erste beantwortet war. Gemessen an der Aufgabe war das falsch: wer
 * das Profil öffnet, sieht dann sieben Oberbegriffe und keine einzige
 * Sportart — «Kampfsport» und «Laufen» sind aber nicht das, was jemand über
 * sich sagen will. Er will «Judo» sagen.
 *
 * Ein natives `<select>` mit `<optgroup>` löst genau das: alle 39 Disziplinen
 * sind auf einmal da, die Bereiche ordnen die Liste, statt sie zu versperren.
 * Auf dem Telefon wird daraus das Systemrad mit Abschnittsüberschriften, auf
 * dem Rechner eine gruppierte Liste, in der die Tastatursuche greift — wer
 * «ju» tippt, landet bei Judo. Beides ohne eine Zeile eigener Bedienlogik.
 *
 * Der Bereich wird aus der Disziplin abgeleitet und nicht mehr gefragt. Eine
 * Angabe, die sich aus einer anderen ergibt, ist keine zweite Frage wert.
 */
export function DisciplinePicker() {
  const { t, i18n } = useTranslation()
  const { data, saveProfile } = useAppData()
  const lang = i18n.language.startsWith('en') ? 'en' : 'de'
  const p = data.profile

  const selected = p.disciplineId ? disciplineById(p.disciplineId) : undefined

  const choose = (id: string) => {
    const discipline = id ? disciplineById(id) : undefined
    // Der Bereich fällt aus der Disziplin ab. Beide Felder bleiben im
    // Bestand, damit eine Auswertung nach Bereich ohne Nachschlagen geht.
    saveProfile({
      disciplineId: discipline?.id ?? null,
      sportCategoryId: discipline?.categoryId ?? null,
    })
  }

  // Kerntests der Disziplin, damit die Auswahl unmittelbar zeigt, was sie
  // bewirkt. Ohne diese Liste ist die Wahl eine Behauptung ohne Folge.
  const coreTests = selected?.coreTests.map((slug) => getTest(slug)).filter((x) => x != null) ?? []

  return (
    <div className="min-w-0 sm:col-span-2">
      <label className="block">
        <span className="label-tag">{t('profile.discipline')}</span>
        {/* min-w-0 ist hier nicht kosmetisch: ohne die Angabe bestimmt die
            längste Option die Mindestbreite des Feldes und damit die des
            ganzen Rasters — die Seite lief auf dem Telefon seitlich über. */}
        <select
          value={p.disciplineId ?? ''}
          aria-label={t('profile.discipline')}
          aria-describedby="discipline-hint"
          onChange={(e) => choose(e.target.value)}
          className="mt-1.5 h-11 w-full min-w-0 border border-line bg-surface-sunken px-2.5 text-[15px]"
        >
          <option value="">{t('profile.noAnswer')}</option>
          {SPORT_CATEGORIES.map((category) => (
            <optgroup key={category.id} label={category.name[lang]}>
              {disciplinesFor(category.id as SportCategoryId).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name[lang]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span id="discipline-hint" className="mt-1 block text-[12px] leading-relaxed text-ink-muted">
          {t('profile.disciplineHint')}
        </span>
      </label>

      {selected ? (
        <div className="mt-3 border border-line bg-surface-sunken px-3 py-3">
          <p className="text-[12px] leading-relaxed text-ink-secondary">
            {selected.rationale[lang]}
          </p>
          {coreTests.length > 0 ? (
            <>
              <p className="label-tag mt-3">
                {t('profile.disciplineTests', { count: coreTests.length })}
              </p>
              <ul className="mt-1.5 space-y-1">
                {coreTests.map((test) => (
                  <li key={test.slug} className="text-[13px] leading-snug">
                    {test.name[lang]}
                    {/* Herkunft direkt an der Zeile: eine Ergänzung dieser App
                        soll nicht wie eine Vorgabe aus der Quellliste aussehen. */}
                    <span className="ml-1.5 text-[11px] text-ink-muted">
                      {provenanceOf(selected.id, test.slug) === 'document'
                        ? t('assessments.fromDocument')
                        : t('assessments.addedForDiscipline')}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                {t('profile.disciplineTestsHint', { count: selected.optionalTests.length })}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
