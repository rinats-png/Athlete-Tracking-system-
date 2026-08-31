import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, ArchiveRestore, Plus, Trash2 } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useAppData } from '@/lib/store/AppDataProvider'
import { formatDate } from '@/lib/format'
import type { AppLocale } from '@/types/domain'

/**
 * Rolle des Geräts und Verwaltung der betreuten Athleten.
 *
 * Kunden eines Trainers haben ausdrücklich kein Konto und keine E-Mail: ein
 * Name genügt. Alles Weitere wäre eine personenbezogene Angabe, die BASELINE
 * für seine Aufgabe nicht braucht.
 */
export function CoachSettings({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const {
    role,
    setRole,
    athletes,
    activeAthleteId,
    switchAthlete,
    addAthlete,
    renameAthlete,
    archiveAthlete,
    deleteAthlete,
  } = useAppData()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <Panel>
      <PanelHeader title={t('coach.title')} subtitle={t('coach.hint')} />
      <div className="space-y-4 px-4 py-4">
        <div>
          <SegmentedControl<'solo' | 'coach'>
            label={t('coach.role')}
            value={role}
            onChange={setRole}
            options={[
              { value: 'solo', label: t('coach.roleSolo') },
              { value: 'coach', label: t('coach.roleCoach') },
            ]}
          />
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
            {t(`coach.roleHint.${role}`)}
          </p>
        </div>

        {role === 'coach' && (
          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="label-tag">{t('coach.athletes')}</span>
              <Button variant="ghost" size="sm" onClick={() => addAthlete('')}>
                <Plus size={13} aria-hidden />
                {t('coach.addAthlete')}
              </Button>
            </div>

            <ul className="mt-2 divide-y divide-line border border-line">
              {athletes.map((athlete) => (
                <li key={athlete.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={athlete.name}
                      maxLength={120}
                      placeholder={athlete.profile.firstName || t('coach.unnamed')}
                      aria-label={t('coach.nameOf', {
                        name: athlete.name || t('coach.unnamed'),
                      })}
                      onChange={(e) => renameAthlete(athlete.id, e.target.value)}
                      className="h-11 min-w-0 flex-1 border border-line bg-surface-sunken px-2.5 text-[16px]"
                    />
                    <Button
                      variant={athlete.id === activeAthleteId ? 'primary' : 'outline'}
                      size="sm"
                      disabled={athlete.id === activeAthleteId || athlete.archived}
                      onClick={() => switchAthlete(athlete.id)}
                    >
                      {athlete.id === activeAthleteId ? t('coach.active') : t('coach.select')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t(athlete.archived ? 'coach.restore' : 'coach.archive')}
                      onClick={() => archiveAthlete(athlete.id, !athlete.archived)}
                    >
                      {athlete.archived ? (
                        <ArchiveRestore size={14} aria-hidden />
                      ) : (
                        <Archive size={14} aria-hidden />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('coach.delete')}
                      disabled={athletes.length < 2}
                      onClick={() => setConfirmDelete(athlete.id)}
                    >
                      <Trash2 size={14} aria-hidden />
                    </Button>
                  </div>

                  <p className="mt-1 text-[11px] text-ink-muted">
                    {t('coach.meta', {
                      results: athlete.results.length,
                      assessments: athlete.assessments.length,
                      since: formatDate(athlete.createdAt, locale),
                    })}
                    {athlete.archived && ` · ${t('coach.archived')}`}
                  </p>

                  {confirmDelete === athlete.id && (
                    <div className="mt-2 border-l-2 border-critical bg-critical/10 px-3 py-2">
                      <p className="text-[12px] leading-snug text-ink-secondary">
                        {t('coach.deleteHint', {
                          count: athlete.results.length,
                          name: athlete.name || t('coach.unnamed'),
                        })}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            deleteAthlete(athlete.id)
                            setConfirmDelete(null)
                          }}
                        >
                          {t('coach.deleteConfirm')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                          {t('actions.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
              {t('coach.privacyNote')}
            </p>
          </div>
        )}
      </div>
    </Panel>
  )
}
