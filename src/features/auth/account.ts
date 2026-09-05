import { COACH_TIERS, REPORT_BUNDLES } from '@/data/pricing'

/**
 * Das Konto dieses Geräts.
 *
 * WAS DAS IST — UND WAS ES AUSDRÜCKLICH NICHT IST
 *
 * BASELINE hat keinen Server. `src/lib/supabase/client.ts` liegt bereit, wird
 * aber nirgends aufgerufen, und die CSP steht auf `connect-src 'self'` — es
 * gibt nichts, wogegen geprüft werden könnte. Diese Anmeldung ist deshalb ein
 * GESTALTETES TOR, keine Sicherung: sie ordnet den Einstieg, sie schützt
 * nichts. Der Anmeldebildschirm sagt das, bevor jemand ein Passwort eintippt,
 * das er anderswo auch benutzt.
 *
 * DESHALB WIRD KEIN PASSWORT GESPEICHERT. Ein Passwort im Gerät, das nichts
 * prüft, wäre das Schlechteste aus beiden Welten: ein Geheimnis im Speicher,
 * das keinen Zugang bewacht. Das Feld nimmt die Eingabe entgegen und
 * vergisst sie mit dem Absenden.
 *
 * Das Konto liegt neben dem Bestand und nicht darin: es ist eine Eigenschaft
 * dieses Geräts, keine Messung. Wer seinen Bestand exportiert, exportiert
 * keine Zugangsdaten (§50).
 */

export type AccountRole = 'athlete' | 'coach'

export interface Account {
  /** Anzeigename. Alles, was BASELINE über die Person festhält. */
  name: string
  /**
   * E-Mail, nur als Kennung der Anmeldung. Sie wird nirgendwohin geschickt —
   * es gibt keinen Empfänger.
   */
  email: string
  role: AccountRole
  /**
   * Gewählte Stufe: eine Kennung aus `data/pricing.ts`, oder null, wenn
   * niemand eine gewählt hat. Abgerechnet wird nichts; die Wahl prägt nur,
   * was die App anbietet.
   */
  planId: string | null
  createdAt: string
}

const KEY = 'baseline.account.v1'

/** Alle Stufen, die bei der Registrierung wählbar sind. */
export function plansForRole(role: AccountRole): { id: string; label: string; price: string }[] {
  if (role === 'coach') {
    return COACH_TIERS.map((tier) => ({
      id: tier.id,
      label: tier.name.de,
      price: `${tier.monthlyEur} € / Monat · ${tier.athletes} Plätze`,
    }))
  }
  return REPORT_BUNDLES.map((bundle) => ({
    id: bundle.id,
    label: bundle.name.de,
    price: `${bundle.priceEur} €`,
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
