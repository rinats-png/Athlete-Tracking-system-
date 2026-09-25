import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useBilling } from '@/features/billing/BillingProvider'
import { useAppData } from '@/lib/store/AppDataProvider'
import { useLocale } from '@/features/shared/useLocale'
import { formatDate } from '@/lib/format'
import {
  acceptTeamInvite,
  createTeam,
  createTeamInvite,
  dissolveTeam,
  inviteLink,
  leaveTeam,
  listTeamInvites,
  removeTeamMember,
  renameTeam,
  revokeTeamInvite,
  tokenFromInput,
  writeCarryChoice,
  type TeamError,
  type TeamInvite,
} from '@/lib/coachStatus'
import { syncOnce } from '@/lib/supabase/sync'
import { isBlankPlaceholder } from '@/lib/store/placeholder'

/**
 * Ein Team: mehrere Trainer, ein Bestand.
 *
 * Der Inhaber zahlt, lädt ein und entfernt. Die Trainer im Team arbeiten im
 * Bestand des Inhabers — sie sehen dieselben Athleten, und was sie messen,
 * zählt für die Stufe des Teams (supabase/migrations/20260925110000_teams.sql).
 *
 * BEITRETEN heisst: Dieses Gerät arbeitet ab dem nächsten Abgleich im
 * Teambestand. Was bisher hier lag, geht entweder MIT (und zählt im Team)
 * oder bleibt im eigenen Konto auf dem Server — der Trainer entscheidet das
 * beim Beitritt, nicht die App.
 *
 * VERLASSEN heisst: Die Athleten des Teams verlassen dieses Gerät. Sie
 * gehören dem Team; wer geht, nimmt sie nicht mit.
 */
export function TeamPanel() {
  const { t } = useTranslation()
  const billing = useBilling()
  const { role } = useAppData()
  const coach = billing.coach
  if (!billing.enabled || role !== 'coach' || !coach) return null

  return (
    <Panel data-testid="team-panel">
      <PanelHeader title={t('team.title')} subtitle={t('team.subtitle')} />
      <div className="space-y-4 px-4 py-4 text-[13px] leading-relaxed">
        {coach.team ? coach.team.role === 'owner' ? <OwnerView /> : <MemberView /> : <NoTeamView />}
      </div>
    </Panel>
  )
}

function useAfterTeamChange() {
  const billing = useBilling()
  const { store, mergeAthletes, mergeSeriesRows, replacePool } = useAppData()
  return async () => {
    // Ein Team gibt es nur auf dem Server — der Abgleich ist damit
    // eingeschaltet. Der Beitrittstext sagt das vorher (team.joinPrivacy).
    try {
      localStorage.setItem('kydon.sync.enabled', 'on')
    } catch {
      /* ohne Speicher gilt es für diese Sitzung */
    }
    await billing.refresh()
    // Gleich abgleichen, damit dieses Gerät im richtigen Bestand steht — und
    // nicht erst beim nächsten Tipp auf «Abgleichen».
    await syncOnce(store, mergeAthletes, mergeSeriesRows, replacePool)
  }
}

function ErrorLine({ error }: { error: TeamError | null }) {
  const { t } = useTranslation()
  if (!error) return null
  return (
    <p role="alert" className="text-[12px] text-warning">
      {t(`team.error.${error}`)}
    </p>
  )
}

function NoTeamView() {
  const { t } = useTranslation()
  const billing = useBilling()
  const coach = billing.coach!
  const after = useAfterTeamChange()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<TeamError | null>(null)
  const canCreate = coach.isOwner && coach.seats >= 2

  return (
    <>
      {canCreate ? (
        <div className="space-y-2">
          <p className="text-ink-secondary">{t('team.createHint', { seats: coach.seats })}</p>
          <label className="block">
            <span className="label-tag">{t('team.name')}</span>
            <input className="w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </label>
          <Button
            size="sm"
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError(null)
              const r = await createTeam(name)
              if (!r.ok) setError(r.reason)
              else await after()
              setBusy(false)
            }}
          >
            {t('team.create')}
          </Button>
          <ErrorLine error={error} />
        </div>
      ) : (
        <p className="text-ink-secondary">{t('team.needsTeamPlan')}</p>
      )}
      <div className="border-t border-line pt-4">
        <JoinTeam />
      </div>
    </>
  )
}

/**
 * Beitreten mit Code oder Link. Auch als eigener Bildschirm (/team/beitreten),
 * wenn jemand den Link öffnet — dann steht der Code schon im Feld.
 */
export function JoinTeam({ initialCode = '' }: { initialCode?: string }) {
  const { t } = useTranslation()
  const { athletes } = useAppData()
  const after = useAfterTeamChange()
  const [code, setCode] = useState(initialCode)
  const [carry, setCarry] = useState<'carry' | 'keep' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<TeamError | null>(null)
  const [joined, setJoined] = useState<string | null>(null)
  const own = athletes.filter((a) => !isBlankPlaceholder(a)).length
  const token = tokenFromInput(code)

  if (joined != null) {
    return (
      <p role="status" className="border-l-2 border-good bg-good/10 px-3 py-2" data-testid="team-joined">
        {t('team.joined', { name: joined || t('team.unnamed') })}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="label-tag">{t('team.join')}</p>
      <p className="text-ink-secondary">{t('team.joinHint')}</p>
      <input
        className="w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]"
        value={code}
        placeholder={t('team.codePlaceholder')}
        onChange={(e) => setCode(e.target.value)}
        aria-label={t('team.join')}
      />
      {own > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-ink-secondary">{t('team.carryQuestion', { count: own })}</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="carry" className="mt-1" checked={carry === 'carry'} onChange={() => setCarry('carry')} />
            <span>{t('team.carryYes')}</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="carry" className="mt-1" checked={carry === 'keep'} onChange={() => setCarry('keep')} />
            <span>{t('team.carryNo')}</span>
          </label>
        </fieldset>
      )}
      <p className="text-[12px] text-ink-muted">{t('team.joinPrivacy')}</p>
      <Button
        size="sm"
        variant="primary"
        disabled={busy || !token || (own > 0 && carry == null)}
        onClick={async () => {
          setBusy(true)
          setError(null)
          writeCarryChoice(own > 0 && carry === 'carry' ? 'carry' : 'keep')
          const r = await acceptTeamInvite(token)
          if (!r.ok) {
            setError(r.reason)
            setBusy(false)
            return
          }
          await after()
          setJoined(r.data?.name ?? '')
          setBusy(false)
        }}
      >
        {t('team.joinButton')}
      </Button>
      <ErrorLine error={error} />
    </div>
  )
}

function Members({ canRemove }: { canRemove: boolean }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const billing = useBilling()
  const team = billing.coach!.team!
  const [error, setError] = useState<TeamError | null>(null)
  return (
    <div>
      <p className="label-tag">{t('team.members', { count: team.members.length, seats: billing.coach!.seats })}</p>
      <ul className="mt-1 divide-y divide-line border border-line">
        {team.members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-2 px-3 py-2">
            <span>
              {m.name || t('team.unnamed')}
              <span className="ml-2 text-[12px] text-ink-muted">
                {m.role === 'owner' ? t('team.roleOwner') : t('team.roleCoach')} · {t('team.since', { date: formatDate(m.joinedAt, locale) })}
              </span>
            </span>
            {canRemove && m.role === 'coach' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const r = await removeTeamMember(m.userId)
                  if (!r.ok) setError(r.reason)
                  else void billing.refresh()
                }}
              >
                {t('team.remove')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {billing.coach!.seats < team.members.length && <p className="mt-1 text-[12px] text-warning">{t('team.overSeats')}</p>}
      <ErrorLine error={error} />
    </div>
  )
}

function OwnerView() {
  const { t } = useTranslation()
  const locale = useLocale()
  const billing = useBilling()
  const coach = billing.coach!
  const team = coach.team!
  const [name, setName] = useState(team.name)
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<TeamError | null>(null)
  const [askDissolve, setAskDissolve] = useState(false)
  const after = useAfterTeamChange()
  const free = coach.seats - team.members.length - invites.length

  useEffect(() => {
    void listTeamInvites().then(setInvites)
  }, [team.openInvites])

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block grow">
          <span className="label-tag">{t('team.name')}</span>
          <input className="w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        <Button size="sm" variant="outline" disabled={name === team.name} onClick={async () => {
          const r = await renameTeam(name)
          if (r.ok) void billing.refresh()
          else setError(r.reason)
        }}>
          {t('team.rename')}
        </Button>
      </div>

      <Members canRemove />

      <div className="space-y-2 border-t border-line pt-4">
        <p className="label-tag">{t('team.invite')}</p>
        <p className="text-ink-secondary">{free > 0 ? t('team.inviteHint', { count: free }) : t('team.noSeats')}</p>
        {free > 0 && (
          <>
            <label className="block">
              <span className="label-tag">{t('team.inviteEmail')}</span>
              <input type="email" className="w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <Button size="sm" variant="primary" onClick={async () => {
              setError(null)
              const r = await createTeamInvite(email.trim() || null)
              if (!r.ok) {
                setError(r.reason)
                return
              }
              setLink(inviteLink(window.location.origin, r.data))
              setEmail('')
              setInvites(await listTeamInvites())
            }}>
              {t('team.createInvite')}
            </Button>
          </>
        )}
        {link && (
          <div className="space-y-1 border-l-2 border-accent px-3 py-2" data-testid="team-invite-link">
            <p>{t('team.linkReady')}</p>
            <pre className="readout overflow-auto border border-line bg-surface-sunken px-2 py-1 text-[12px] whitespace-pre-wrap break-all">{link}</pre>
            <Button size="sm" variant="ghost" className="-ml-3" onClick={() => void navigator.clipboard?.writeText(link)}>
              {t('team.copy')}
            </Button>
            <p className="text-[12px] text-ink-muted">{t('team.linkOnce')}</p>
          </div>
        )}
        {invites.length > 0 && (
          <ul className="divide-y divide-line border border-line">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-ink-secondary">
                  {i.email ?? t('team.inviteOpen')} · {t('team.until', { date: formatDate(i.expiresAt, locale) })}
                </span>
                <Button size="sm" variant="ghost" onClick={async () => {
                  await revokeTeamInvite(i.id)
                  setInvites(await listTeamInvites())
                  void billing.refresh()
                }}>
                  {t('team.revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line pt-4">
        <p className="text-[12px] text-ink-muted">{t('team.countingNote')}</p>
        {!askDissolve ? (
          <Button size="sm" variant="ghost" className="-ml-3 mt-2" onClick={() => setAskDissolve(true)}>
            {t('team.dissolve')}
          </Button>
        ) : (
          <div className="panel mt-2 space-y-2 border border-critical p-3" role="alertdialog">
            <p>{t('team.dissolveConfirm')}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => {
                await dissolveTeam()
                setAskDissolve(false)
                await after()
              }}>
                {t('team.dissolve')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAskDissolve(false)}>
                {t('coachPlan.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
      <ErrorLine error={error} />
    </>
  )
}

function MemberView() {
  const { t } = useTranslation()
  const billing = useBilling()
  const team = billing.coach!.team!
  const after = useAfterTeamChange()
  const [ask, setAsk] = useState(false)
  const [error, setError] = useState<TeamError | null>(null)
  return (
    <>
      <p>{t('team.memberOf', { name: team.name || t('team.unnamed') })}</p>
      <p className="text-ink-secondary">{t('team.memberHint')}</p>
      <Members canRemove={false} />
      {!ask ? (
        <Button size="sm" variant="ghost" className="-ml-3" onClick={() => setAsk(true)}>
          {t('team.leave')}
        </Button>
      ) : (
        <div className="panel space-y-2 border border-critical p-3" role="alertdialog">
          <p>{t('team.leaveConfirm')}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => {
              const r = await leaveTeam()
              if (!r.ok) {
                setError(r.reason)
                return
              }
              setAsk(false)
              await after()
            }}>
              {t('team.leave')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsk(false)}>
              {t('coachPlan.cancel')}
            </Button>
          </div>
        </div>
      )}
      <ErrorLine error={error} />
    </>
  )
}
