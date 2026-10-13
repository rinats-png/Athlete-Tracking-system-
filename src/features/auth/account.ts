import { ATHLETE_PLANS, COACH_TIERS } from '@/data/pricing'

/**
 * Das Konto auf diesem Gerät.
 *
 * WAS DAS IST: die Gerätekopie des Kontos — Name, Rolle, Stufe, AV-Vertrag —,
 * damit «Heute» auch ohne Netz richtig startet. Die Wahrheit liegt auf dem
 * Server (Supabase Auth und `accounts`); angemeldet ist, wer dort eine
 * Sitzung hat (`lib/supabase/session`). OHNE KONTO KEIN ZUGANG: die App lässt
 * erst herein, wenn beides da ist, diese Kopie und eine Sitzung (App.tsx).
 *
 * KEIN PASSWORT IM GERÄT. Das Passwort geht an Supabase und wird dort als
 * Hash abgelegt; hier landet es nie.
 *
 * Das Konto liegt neben dem Bestand und nicht darin: es ist eine Eigenschaft
 * dieses Geräts, keine Messung. Wer seinen Bestand exportiert, exportiert
 * keine Zugangsdaten (§50).
 */

export type AccountRole = 'athlete' | 'coach'

export interface Account {
  /** Anzeigename. Alles, was KYDON über die Person festhält. */
  name: string
  /**
   * E-Mail der Anmeldung, wie sie das Konto auf dem Server trägt. Hier nur
   * zur Anzeige; geschickt wird sie von hier aus nirgendwohin.
   */
  email: string
  role: AccountRole
  /**
   * Gewählte Stufe: eine Kennung aus `data/pricing.ts`, oder null, wenn
   * niemand eine gewählt hat. Freigeschaltet wird nur über den Server
   * (Regel 5); die Wahl hier prägt, was die App anbietet.
   */
  planId: string | null
  createdAt: string
  /**
   * Annahme des Vertrags zur Auftragsverarbeitung (nur Trainerkonten):
   * Zeitpunkt und angenommene Fassung. null = nicht angenommen. Der
   * Serverstand in `accounts` ist die Wahrheit; das hier ist die Kopie
   * für das Gerät, damit der Hinweis auch ohne Netz richtig steht.
   */
  dpaAcceptedAt: string | null
  dpaVersion: string | null
}

const KEY = 'kydon.account.v1'

/**
 * Alle Stufen, die bei der Registrierung wählbar sind.
 *
 * Die kostenlose Stufe steht mit dabei und zuerst — nicht als Restposten
 * hinter den bezahlten. Wer sich anmeldet, soll sehen dürfen, dass er nichts
 * zahlen muss, statt es erst nach dem Scrollen zu finden. Abgerechnet wird
 * erst über den Bezahlweg; die Wahl hier prägt nur, was die App anbietet.
 */
export function plansForRole(role: AccountRole): { id: string; label: string; price: string }[] {
  if (role === 'coach') {
    return COACH_TIERS.map((tier) => ({
      id: tier.id,
      label: tier.name.de,
      price:
        tier.yearlyEur == null
          ? `kostenlos · bis ${tier.athletesPerYear} gemessene Athleten im Jahr`
          : `${tier.yearlyEur} € / Jahr · bis ${tier.athletesPerYear} gemessene Athleten`,
    }))
  }
  return ATHLETE_PLANS.map((plan) => ({
    id: plan.id,
    label: plan.name.de,
    price:
      plan.billing === 'free'
        ? 'kostenlos, dauerhaft'
        : plan.billing === 'once'
          ? `${plan.onceEur} € einmalig · bis zum Termin`
          : `${plan.yearlyEur} € / Jahr`,
  }))
}

/** Gehört diese Kennung zu der Rolle? Schützt vor einem Bestand von Hand. */
export function planBelongsToRole(planId: string | null, role: AccountRole): boolean {
  if (planId == null) return true
  return plansForRole(role).some((plan) => plan.id === planId)
}

export function readAccount(): Account | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Account>
    if (typeof parsed?.name !== 'string' || (parsed.role !== 'athlete' && parsed.role !== 'coach')) {
      return null
    }
    const role = parsed.role
    return {
      name: parsed.name.slice(0, 80),
      email: typeof parsed.email === 'string' ? parsed.email.slice(0, 160) : '',
      role,
      // Eine Stufe, die nicht zur Rolle gehört, wird verworfen statt
      // angezeigt: sonst stünde beim Athleten eine Trainerstufe.
      planId:
        typeof parsed.planId === 'string' && planBelongsToRole(parsed.planId, role)
          ? parsed.planId
          : null,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      dpaAcceptedAt: typeof parsed.dpaAcceptedAt === 'string' ? parsed.dpaAcceptedAt : null,
      dpaVersion: typeof parsed.dpaVersion === 'string' ? parsed.dpaVersion : null,
    }
  } catch {
    // Ein beschädigter Eintrag führt zur Anmeldung, nicht zu einem Absturz.
    return null
  }
}

export function writeAccount(account: Account): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(account))
  } catch {
    /* Ohne Speicher gilt die Anmeldung für diese Sitzung. */
  }
}

export function clearAccount(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* Nichts zu räumen. */
  }
}

/** Die Annahme des AV-Vertrags am Konto festhalten (Gerätekopie). */
export function writeDpaAcceptance(acceptedAt: string | null, version: string | null): void {
  const account = readAccount()
  if (!account) return
  writeAccount({ ...account, dpaAcceptedAt: acceptedAt, dpaVersion: version })
}
