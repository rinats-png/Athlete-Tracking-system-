import { useState } from 'react'
import { AthleteContext } from './AthleteContext'
import { SportsPanel } from './SportsPanel'
import { GoalPanel } from './GoalPanel'
import { Link } from 'react-router-dom'
import { BodyCompositionPanel } from './BodyCompositionPanel'
import { BrandingSettings } from './BrandingSettings'
import { AthleteNotes } from '@/features/coach/AthleteNotes'
import { CoachSettings } from '@/features/coach/CoachSettings'
import { downloadFile } from '@/lib/export/csv'
import { useTranslation } from 'react-i18next'
import { Download, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/NumberField'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { provisionalFormulas } from '@/domain/formulaRegistry'
import { useAppData } from '@/lib/store/AppDataProvider'
import { ageFromBirthDate, formatDate } from '@/lib/format'
import type { AppLocale, Sex } from '@/types/domain'

export function ProfileScreen() {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'de'
  const { data, saveProfile, saveBiometric, resetAll, loadDemo, exportJson, importJson, mode, backupDue, markExported, recoveredAt } =
    useAppData()

  const latestWeight = data.biometrics.find((b) => b.bodyWeightKg != null)
  const [weight, setWeight] = useState<number | null>(latestWeight?.bodyWeightKg ?? null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const age = ageFromBirthDate(data.profile.birthDate)

  const download = () => {
    downloadFile(
      `baseline-export-${new Date().toISOString().slice(0, 10)}.json`,
      exportJson(),
      'application/json',
    )
    // Erst nach dem Erzeugen der Datei — sonst zählte ein abgebrochener
    // Klick als Sicherung.
    markExported()
  }

  const upload = (file: File) => {
    void file.text().then((text) => {
      // `importJson` liefert einen Befund, kein Wahrheitswert. Die frühere
      // Prüfung `!importJson(text)` war auf ein Objekt immer falsch — ein
      // fehlgeschlagener Import wurde damit stillschweigend geschluckt und
      // der Nutzer glaubte, seine Datei sei eingelesen.
      const outcome = importJson(text)
      setImportError(outcome.ok ? null : `profile.importError.${outcome.error ?? 'unknown'}`)
    })
  }

  return (
    <>
      <header className="mb-4">
        <span className="label-tag">{t('nav.profile')}</span>
        <h1 className="mt-1 font-display text-[30px] leading-none font-bold sm:text-[38px]">
          {t('profile.title')}
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t('profile.person')} subtitle={t('profile.personHint')} />
          <div className="space-y-4 px-4 py-4">
            <label className="block">
              <span className="label-tag">{t('profile.firstName')}</span>
              <input
                value={data.profile.firstName}
                onChange={(e) => saveProfile({ firstName: e.target.value })}
                autoComplete="off"
                className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px] outline-none focus:border-accent"
              />
            </label>

            <div>
              <span className="label-tag">{t('profile.sex')}</span>
              <div className="mt-1.5">
                <SegmentedControl<Sex>
                  label={t('profile.sex')}
                  value={data.profile.sex ?? 'other'}
                  onChange={(sex) => saveProfile({ sex })}
                  options={[
                    { value: 'male', label: t('profile.male') },
                    { value: 'female', label: t('profile.female') },
                    { value: 'other', label: t('profile.otherSex') },
                  ]}
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">
                {t('profile.sexHint')}
              </p>
            </div>

            <label className="block">
              <span className="label-tag">{t('profile.birthDate')}</span>
              <input
                type="date"
                value={data.profile.birthDate ?? ''}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => saveProfile({ birthDate: e.target.value || null })}
                className="mt-1.5 h-11 w-full border border-line bg-surface-sunken px-3 text-[16px]"
              />
              {age != null && (
                <span className="mt-1 block text-[11px] text-ink-muted">
                  {age} {t('dashboard.years')}
                </span>
              )}
            </label>

            <NumberField
              label={t('profile.height')}
              unit="cm"
              value={data.profile.heightCm}
              onChange={(v) => saveProfile({ heightCm: v })}
              min={80}
              max={260}
              step={1}
            />
            <NumberField
              label={t('dashboard.restingHr')}
              unit="bpm"
              value={data.profile.restingHr}
              onChange={(v) => saveProfile({ restingHr: v })}
              min={20}
              max={120}
              step={1}
            />
            <NumberField
              label={t('dashboard.maxHr')}
              unit="bpm"
              value={data.profile.maxHr}
              onChange={(v) => saveProfile({ maxHr: v })}
              min={100}
              max={240}
              step={1}
            />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title={t('profile.bodyWeight')} subtitle={t('profile.bodyWeightHint')} />
            <div className="space-y-3 px-4 py-4">
              <NumberField
                label={t('dashboard.bodyWeight')}
                unit="kg"
                value={weight}
                onChange={setWeight}
                min={20}
                max={400}
                step={0.1}
              />
              <Button
                variant="primary"
                size="md"
                className="w-full"
                disabled={weight == null}
                onClick={() =>
                  weight != null &&
                  saveBiometric({
                    measuredOn: new Date().toISOString().slice(0, 10),
                    bodyWeightKg: weight,
                    bodyFatPercent: null,
                    restingHr: data.profile.restingHr,
                  })
                }
              >
                {t('profile.saveWeight')}
              </Button>

              {data.biometrics.length > 0 && (
                <ul className="border-t border-line pt-2">
                  {data.biometrics.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="flex justify-between py-1 text-[13px]">
                      <span className="text-ink-secondary">
                        {formatDate(entry.measuredOn, locale)}
                      </span>
                      <span className="readout">{entry.bodyWeightKg} kg</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          {/* Offenlegung, welche Zahlen dieser App noch auf einer eigenen
              Festlegung beruhen. Sie steht sichtbar in der App und nicht nur
              im Code: eine gesetzte Zahl sieht sonst aus wie eine belegte
              (§81). */}
          <Panel>
            <PanelHeader
              title={t('profile.provisionalTitle')}
              subtitle={t('profile.provisionalHint')}
            />
            <ul className="space-y-2.5 px-4 py-4">
              {provisionalFormulas().map((f) => (
                <li key={f.metricKey} className="text-[13px] leading-relaxed">
                  <span className="font-semibold">{t(`metrics.${f.metricKey}`)}</span>
                  <span className="block text-ink-secondary">{f.formula}.</span>
                  <span className="block text-[12px] text-ink-muted">{f.note}</span>
                </li>
              ))}
              <li className="border-t border-line pt-2.5 text-[12px] leading-relaxed text-ink-muted">
                {t('profile.provisionalWeights')}
              </li>
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title={t('profile.appearance')} />
            <div className="flex flex-wrap items-center gap-3 px-4 py-4">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title={t('profile.data')} />
            <div className="space-y-3 px-4 py-4">
              <p className="flex gap-2 text-[13px] leading-relaxed text-ink-secondary">
                <ShieldCheck size={16} className="mt-px shrink-0 text-accent-text" aria-hidden />
                <span>{t('profile.privacy')}</span>
              </p>

              <p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  onClick={() => saveProfile({ onboardingCompletedAt: null, onboardingStep: 0 })}
                >
                  {t('profile.redoOnboarding')}
                </Button>
                <span className="block text-[12px] leading-relaxed text-ink-muted">
                  {t('profile.redoOnboardingHint')}
                </span>
              </p>

              <p>
                <Link
                  to="/profil/import"
                  className="-mx-2 inline-flex min-h-11 items-center px-2 text-[13px] underline underline-offset-2"
                >
                  {t('csvImport.title')}
                </Link>
              </p>

              <p>
                <Link
                  to="/preise"
                  className="-mx-2 inline-flex min-h-11 items-center px-2 text-[13px] underline underline-offset-2"
                >
                  {t('pricing.title')}
                </Link>
              </p>

              {recoveredAt != null && (
                <p
                  className="rounded-md border border-line bg-sunken px-3 py-2 text-[13px] leading-relaxed"
                  role="status"
                >
                  {t('profile.recovered', { date: formatDate(recoveredAt, locale) })}
                </p>
              )}

              {backupDue.due && (
                <p
                  className="rounded-md border border-warning/40 bg-sunken px-3 py-2 text-[13px] leading-relaxed"
                  role="status"
                >
                  {t(`profile.backupDue.${backupDue.reason}`, {
                    count: backupDue.unsavedResults,
                    days: backupDue.daysSinceExport ?? 0,
                  })}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={download}>
                  <Download size={14} aria-hidden />
                  {t('profile.export')}
                </Button>

                <label className="inline-flex">
                  <span className="sr-only">{t('profile.import')}</span>
                  <input
                    type="file"
                    accept="application/json"
                    aria-label={t('profile.import')}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) upload(file)
                    }}
                  />
                  {/* min-h-11 = 44 px: dieselbe Trefferfläche wie jeder
                      Knopf. Als <span> im <label> entgeht das Element sonst
                      der Messung. */}
                  <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line-strong px-3 font-display text-[11px] font-semibold tracking-[0.1em] uppercase">
                    <Upload size={14} aria-hidden />
                    {t('profile.import')}
                  </span>
                </label>

                {mode === 'guest' && data.results.length === 0 && (
                  <Button variant="ghost" size="sm" onClick={loadDemo}>
                    {t('profile.loadDemo')}
                  </Button>
                )}
              </div>

              {importError && (
                <p role="alert" className="text-[12px] text-critical">
                  {t(importError)}
                </p>
              )}

              <div className="border-t border-line pt-3">
                {confirmReset ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-ink-secondary">
                      {t('profile.resetConfirm')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetAll()
                        setConfirmReset(false)
                      }}
                    >
                      {t('profile.resetYes')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                      {t('actions.cancel')}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                    <Trash2 size={14} aria-hidden />
                    {t('profile.reset')}
                  </Button>
                )}
              </div>
            </div>
          </Panel>

          <SportsPanel />

          <GoalPanel />

          <Panel>
            <PanelHeader title={t('historyHome.reminders')} />
            <div className="flex flex-wrap gap-2 px-4 py-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/verlauf/erinnerungen">{t('profile.remindersLink')}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/trainer">{t('profile.coachLink')}</Link>
              </Button>
            </div>
          </Panel>

          <AthleteContext />

          <BodyCompositionPanel locale={locale} />

          <AthleteNotes locale={locale} />

          <CoachSettings locale={locale} />

          <BrandingSettings />
        </div>
      </div>
    </>
  )
}
