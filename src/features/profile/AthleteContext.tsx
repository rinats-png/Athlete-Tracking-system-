import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useAppData } from '@/lib/store/AppDataProvider'
import { PERFORMANCE_LEVELS, DOMINANT_SIDES } from '@/types/domain'
import { DisciplinePicker } from './DisciplinePicker'

/**
 * Sportlicher Kontext des Athleten.
 *
 * Alles freiwillig, und das steht auch da. Ein Pflichtfeld, das jemand nicht
 * beantworten kann, führt zu erfundenen Angaben — und erfundener Kontext ist
 * schlimmer als fehlender, weil er unsichtbar in jede Einordnung einfliesst.
 *
 * Die Felder sind danach sortiert, was für die Auswertung tatsächlich zählt:
 * Leistungsniveau zuerst, weil es den Referenzvergleich einordnet, danach der
 * Rest, der den Bericht lesbarer macht.
 */
export function AthleteContext() {
  const { t } = useTranslation()
  const { data, saveProfile } = useAppData()
  const p = data.profile

  return (
    <Panel>
      <PanelHeader title={t('profile.context')} subtitle={t('profile.contextHint')} />
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 [&>*]:min-w-0">
        <label className="block sm:col-span-2">
          <span className="label-tag">{t('profile.performanceLevel')}</span>
          <select
            value={p.performanceLevel ?? ''}
            onChange={(e) =>
              saveProfile({
                performanceLevel: (e.target.value || null) as typeof p.performanceLevel,
              })
            }
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2.5 text-[16px]"
          >
            <option value="">{t('profile.noAnswer')}</option>
            {PERFORMANCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`profile.level.${level}`)}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-[12px] leading-relaxed text-ink-muted">
            {p.performanceLevel
              ? t(`profile.levelHint.${p.performanceLevel}`)
              : t('profile.levelWhy')}
          </span>
        </label>

        <DisciplinePicker />

        <label className="block">
          <span className="label-tag">{t('profile.sport')}</span>
          <input
            type="text"
            value={p.sport}
            maxLength={60}
            placeholder={t('profile.sportPlaceholder')}
            onChange={(e) => saveProfile({ sport: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>

        <label className="block">
          <span className="label-tag">{t('profile.position')}</span>
          <input
            type="text"
            value={p.position}
            maxLength={60}
            placeholder={t('profile.positionPlaceholder')}
            onChange={(e) => saveProfile({ position: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>

        <label className="block">
          <span className="label-tag">{t('profile.trainingAge')}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={70}
            step={1}
            value={p.trainingAgeYears ?? ''}
            onChange={(e) =>
              saveProfile({
                trainingAgeYears: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
          <span className="mt-1 block text-[12px] text-ink-muted">
            {t('profile.trainingAgeHint')}
          </span>
        </label>

        <label className="block">
          <span className="label-tag">{t('profile.sessionsPerWeek')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={21}
            step={1}
            value={p.sessionsPerWeek ?? ''}
            onChange={(e) =>
              saveProfile({
                sessionsPerWeek: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="label-tag">{t('profile.dominantSide')}</span>
          <select
            value={p.dominantSide ?? ''}
            onChange={(e) =>
              saveProfile({ dominantSide: (e.target.value || null) as typeof p.dominantSide })
            }
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-2.5 text-[16px]"
          >
            <option value="">{t('profile.noAnswer')}</option>
            {DOMINANT_SIDES.map((side) => (
              <option key={side} value={side}>
                {t(`profile.side.${side}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="label-tag">{t('profile.goal')}</span>
          <input
            type="text"
            value={p.goal}
            maxLength={300}
            placeholder={t('profile.goalPlaceholder')}
            onChange={(e) => saveProfile({ goal: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="label-tag">{t('profile.constraints')}</span>
          <input
            type="text"
            value={p.constraints}
            maxLength={300}
            placeholder={t('profile.constraintsPlaceholder')}
            onChange={(e) => saveProfile({ constraints: e.target.value })}
            className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
          />
          {/* Ausdrücklich Freitext und keine Diagnoseliste: BASELINE bewertet
              keine Krankheitsbilder und sammelt keine Gesundheitsdaten. */}
          <span className="mt-1 block text-[12px] leading-relaxed text-ink-muted">
            {t('profile.constraintsHint')}
          </span>
        </label>
      </div>
    </Panel>
  )
}
