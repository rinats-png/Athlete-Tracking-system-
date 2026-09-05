import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FORMED_SECONDS, ParticleGate, type GatePhase } from '@/components/signature/ParticleGate'
import { plansForRole, writeAccount, type Account, type AccountRole } from './account'

/**
 * Das Tor.
 *
 * DER ABLAUF, DEN DIESER BILDSCHIRM TRÄGT:
 *
 *   Partikel als Kugel  →  sie wandern auf den Umriss der Fläche  →  die
 *   Anmeldung steht  →  nach dem Absenden zerfällt der Umriss wieder in
 *   Partikel  →  danach übernimmt die Sequenz.
 *
 * WAS DIESER BILDSCHIRM NICHT LEISTET, UND WARUM ER ES SAGT: es gibt keinen
 * Server. Die Eingabe wird nicht geprüft, das Passwort nicht gespeichert und
 * nichts übertragen. Das steht als Hinweis auf der Fläche — wie beim
 * Preisbildschirm, der sagt, dass noch nichts gekauft werden kann. Eine
 * Anmeldemaske, die Schutz vortäuscht, wäre die eine Sache, die man an einem
 * Anmeldebildschirm nicht tun darf: sie verleitet dazu, ein Passwort
 * einzutippen, das anderswo etwas bewacht.
 *
 * Die Partikel zeichnen nur den Rahmen. Das Formular darüber ist gewöhnliches
 * DOM mit Beschriftungen und Tastaturbedienung — Eingabefelder aus Partikeln
 * wären weder bedienbar noch vorlesbar.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type Pane = 'signin' | 'register'
type Step = 'role' | 'plan' | 'details'

export function AuthScreen({ onSignedIn }: { onSignedIn: (account: Account) => void }) {
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<GatePhase>('gather')
  const [pane, setPane] = useState<Pane>('signin')
  /*
   * Der Inhalt erscheint ERST, wenn die Punkte den Umriss erreicht haben.
   *
   * Stünde das Formular schon da, während die Punkte noch fliegen, sammelten
   * sie sich nur um etwas Fertiges herum — die Anmeldung setzt sich dann
   * nicht aus ihnen zusammen, sie bekommt einen Rahmen dazu. Der Unterschied
   * ist der ganze Entwurf.
   *
   * Bei reduzierter Bewegung steht beides sofort: dort gibt es keine
   * Wanderung, auf die zu warten wäre.
   */
  const [formed, setFormed] = useState(() => prefersReducedMotion())
  useEffect(() => {
    if (formed) return
    const timer = window.setTimeout(() => setFormed(true), FORMED_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [formed])

  /**
   * Erst zerfallen, dann weitergeben. Die Auflösung ist kein Schmuck nach der
   * Anmeldung, sondern der Übergang in die Sequenz — deshalb wartet der
   * Aufrufer sie ab.
   */
  const leave = (account: Account) => {
    writeAccount(account)
    setPhase('scatter')
    window.setTimeout(() => onSignedIn(account), 1150)
  }

  const leaving = phase === 'scatter'

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <ParticleGate phase={phase} targetRef={cardRef} />

      <div
        ref={cardRef}
        // Der Inhalt verschwindet beim Zerfall etwas früher als die Punkte:
        // sonst stünde Schrift in einem Rahmen, den es nicht mehr gibt.
        className={`relative w-full max-w-[26rem] transition-opacity duration-700 ${
          leaving || !formed ? 'opacity-0' : 'opacity-100'
        }`}
        // Solange die Fläche unsichtbar ist, ist sie auch nicht bedienbar:
        // ein Feld, in das man tippen kann, ohne es zu sehen, wäre eine Falle.
        inert={!formed || leaving}
        // Für Prüfungen und Aufnahmen: der Zustand des Übergangs ist von
        // aussen ablesbar, ohne auf eine Zeitspanne zu wetten.
        data-state={leaving ? 'leaving' : formed ? 'formed' : 'forming'}
      >
        <div className="px-6 py-8 sm:px-8">
          <p className="label-tag">{t('auth.eyebrow')}</p>
          <h1 className="font-display mt-2 text-[30px] leading-none font-bold tracking-[0.1em] uppercase">
            BASELINE
          </h1>
          <p className="mt-2 max-w-[36ch] text-[13px] leading-relaxed text-ink-secondary">
            {t('auth.claim')}
          </p>

          <div
            role="status"
            className="mt-4 border-l-2 border-warning bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-ink-secondary"
          >
            {t('auth.noBackend')}
          </div>

          <div className="mt-5 flex gap-2" role="tablist" aria-label={t('auth.eyebrow')}>
            <Button
              type="button"
              role="tab"
              size="sm"
              variant={pane === 'signin' ? 'primary' : 'outline'}
              aria-selected={pane === 'signin'}
              onClick={() => setPane('signin')}
            >
              {t('auth.signIn')}
            </Button>
            <Button
              type="button"
              role="tab"
              size="sm"
              variant={pane === 'register' ? 'primary' : 'outline'}
              aria-selected={pane === 'register'}
              onClick={() => setPane('register')}
            >
              {t('auth.register')}
            </Button>
          </div>

          {pane === 'signin' ? <SignInPane onDone={leave} /> : <RegisterPane onDone={leave} />}
        </div>
      </div>
    </main>
  )
}

const field = 'w-full border border-line bg-surface-sunken px-3 py-2 text-[16px]'

function SignInPane({ onDone }: { onDone: (account: Account) => void }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        /*
         * Der Name wird aus dem Teil vor dem @ gebildet, nicht abgefragt:
         * wer sich anmeldet, hat seinen Namen bei der Registrierung schon
         * genannt, und ein zweites Mal danach zu fragen wäre eine Frage ohne
         * Empfänger. Das Passwort geht nirgendwohin (siehe `account.ts`).
         */
        onDone({
          name: email.split('@')[0] || t('auth.defaultName'),
          email,
          role: 'athlete',
          planId: null,
          createdAt: new Date().toISOString(),
        })
      }}
    >
      <label className="block">
        <span className="label-tag">{t('auth.email')}</span>
        <input
          className={field}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label-tag">{t('auth.password')}</span>
        <input className={field} type="password" autoComplete="current-password" required />
        <span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">
          {t('auth.passwordNotStored')}
        </span>
      </label>
      <Button type="submit" size="lg" variant="primary" className="w-full justify-center">
        {t('auth.signIn')}
        <ArrowRight size={15} aria-hidden />
      </Button>
    </form>
  )
}

/**
 * Die Registrierung in drei Schritten: Rolle, Stufe, Zugang.
 *
 * Die Stufe wird gemerkt und prägt, was die App anbietet — abgerechnet wird
 * nichts, und der Hinweis dazu steht am Schritt selbst. Wer keine Stufe
 * wählen will, überspringt sie: eine erzwungene Kaufentscheidung vor dem
 * ersten Messwert wäre eine Zumutung.
 */
function RegisterPane({ onDone }: { onDone: (account: Account) => void }) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState<AccountRole>('athlete')
  const [planId, setPlanId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  if (step === 'role') {
    return (
      <div className="mt-5 space-y-3">
        <p className="text-[13px] leading-relaxed text-ink-secondary">{t('auth.roleQuestion')}</p>
        {(['athlete', 'coach'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="block w-full border border-line px-4 py-3 text-left hover:border-accent hover:bg-accent-quiet"
            onClick={() => {
              setRole(option)
              // Eine Stufe der anderen Rolle darf nicht stehen bleiben.
              setPlanId(null)
              setStep('plan')
            }}
          >
            <span className="text-[15px] font-medium">{t(`auth.role.${option}`)}</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-secondary">
              {t(`auth.roleHint.${option}`)}
            </span>
          </button>
        ))}
      </div>
    )
  }

  if (step === 'plan') {
    return (
      <div className="mt-5 space-y-3">
        <p className="text-[13px] leading-relaxed text-ink-secondary">{t('auth.planQuestion')}</p>
        {plansForRole(role).map((plan) => (
          <button
            key={plan.id}
            type="button"
            aria-pressed={planId === plan.id}
            className={`flex w-full items-center justify-between gap-3 border px-4 py-3 text-left ${
              planId === plan.id ? 'border-accent bg-accent-quiet' : 'border-line hover:border-accent'
            }`}
            onClick={() => setPlanId(plan.id)}
          >
            <span>
              <span className="text-[15px] font-medium">{plan.label}</span>
              <span className="readout mt-0.5 block text-[12px] tabular-nums text-ink-secondary">
                {plan.price}
              </span>
            </span>
            {planId === plan.id && <Check size={16} className="shrink-0 text-accent-text" aria-hidden />}
          </button>
        ))}
        <p className="text-[11px] leading-relaxed text-ink-muted">{t('auth.planNotYet')}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="primary" onClick={() => setStep('details')}>
            {t('auth.next')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setPlanId(null)
              setStep('details')
            }}
          >
            {t('auth.planSkip')}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setStep('role')}>
            {t('auth.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        onDone({
          name: name.trim() || t('auth.defaultName'),
          email,
          role,
          planId,
          createdAt: new Date().toISOString(),
        })
      }}
    >
      <label className="block">
        <span className="label-tag">{t('auth.name')}</span>
        <input
          className={field}
          autoComplete="name"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label-tag">{t('auth.email')}</span>
        <input
          className={field}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label-tag">{t('auth.password')}</span>
        <input className={field} type="password" autoComplete="new-password" required />
        <span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">
          {t('auth.passwordNotStored')}
        </span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="lg" variant="primary" className="justify-center">
          {t('auth.createAccount')}
          <ArrowRight size={15} aria-hidden />
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={() => setStep('plan')}>
          {t('auth.back')}
        </Button>
      </div>
    </form>
  )
}
