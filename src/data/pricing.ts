import type { AppLocale } from '@/i18n/locales'

/**
 * Was KYDON kostet.
 *
 * Hier stehen die Zahlen und was darin enthalten ist. Es wird nichts
 * abgerechnet: es gibt keine Zahlungsabwicklung, keinen Anbieter und keinen
 * Vertrag. Solange das so ist, sagt der Bildschirm es auch — eine Preisliste,
 * die nach einem Kauf aussieht, ohne einen zu ermöglichen, wäre eine Täuschung.
 *
 * SEIT ETAPPE 4 (21.09.2026) GIBT ES DEN BEZAHLWEG: Stripe über die Edge
 * Functions create-checkout, stripe-webhook und billing-portal; die
 * Freischaltungen liegen in `entitlements`, und `src/domain/entitlement.ts`
 * rechnet daraus, wer was darf. Die Schranken sind aber nur SCHARF, wenn der
 * Bezahlweg eingeschaltet ist (`billingEnabled()` in src/lib/billing.ts) —
 * also wenn Stripe eingerichtet ist und die Preise dort liegen. Vorher gilt
 * weiter: Eine Sperre ohne Kaufmöglichkeit nähme allen etwas weg und gäbe
 * niemandem einen Weg zurück. Sperren und Kaufen kommen in einem Zug.
 *
 * FÜNF ATHLETENSTUFEN (docs/ausbau.md §10): Frei, Plus (49), Pro (99),
 * Elite (199), Termin (69 einmalig). Elite kam am 22.09.2026 dazu, als S5
 * gebaut wurde — vorher stand sie mit Absicht NICHT hier: kein Merkmal auf
 * dieser Liste ist ein Versprechen auf später.
 *
 * ELITE IST DIE EINZIGE STUFE MIT EIGENEM RECHTSRAHMEN: Sie schaltet die
 * Gesundheitsschicht frei (Art. 9 DSGVO), verlangt eine eigene Einwilligung
 * je Datenkategorie und gilt erst ab achtzehn. Das ist keine Vorsicht,
 * sondern eine andere Rechtsklasse (docs/rechtspruefung-art9-mdr.md).
 *
 * PLUS VON 29 AUF 49 €: Plus hat mit Tagebuch, Trainingslog und Belastung
 * erheblich mehr Substanz als bei 29 €. Wer bereits zu 29 € zahlt, behält
 * den Preis, solange er zahlt — das regelt die Preis-Kennung bei Stripe,
 * nicht diese Datei.
 *
 * =============================================================================
 * WARUM DAS MODELL AM 13.09.2026 VOLLSTÄNDIG ERSETZT WURDE
 * =============================================================================
 *
 * Vorher: Report-Kontingente für Athleten (29,90 € je Report) und
 * Trainerstufen nach Listenplätzen (39/79/149 € für 8/20/50). Drei Fehler,
 * jeder für sich teuer:
 *
 * 1. DER REPORT WAR AN DIE FALSCHE ZIELGRUPPE GEPREIST. Was zahlt ein Athlet
 *    für ein PDF seiner eigenen Zahlen? Fünf Euro, wenn es hoch kommt. Was
 *    zahlt ein Trainer, der eine Diagnostiksitzung für 120 € verkauft und den
 *    Report als Beleg braucht? Deutlich mehr. Der Preis war B2B, die
 *    Zielgruppe B2C. Zum Vergleich: ein Jahr My Jump Lab kostet 29,99 € — also
 *    so viel wie hier EIN Report, bei einer App, die per Kamera misst.
 *
 * 2. LISTENPLÄTZE SIND BEI PERIODISCHER DIAGNOSTIK DAS FALSCHE MASS. «Bis 8
 *    Athleten» bestraft genau das, was dieses Produkt verspricht: Historie
 *    behalten. Ein Trainer mit 60 Klienten, der zweimal im Jahr misst, hat 60
 *    Datensätze und 120 Messungen — aber keine 60 Dauernutzer. Er hätte für
 *    Speicherplatz gezahlt statt für Nutzung, und die naheliegende Reaktion
 *    wäre gewesen, alte Athleten zu löschen. Ein Preismodell, das zum Löschen
 *    von Messreihen einlädt, arbeitet gegen das eigene Produkt.
 *
 * 3. DIE BEGRÜNDUNG GEGEN EIN ATHLETEN-ABO WAR HALB RICHTIG. Stimmt: Man misst
 *    zwei- bis viermal im Jahr, ein Abo für tägliche Nutzung rechnet sich da
 *    nie. Falsch war der Schluss. Nicht die NUTZUNG ist der Wert, sondern die
 *    HISTORIE — und die wächst mit jeder Messung weiter, auch in den Monaten
 *    dazwischen. Man zahlt nicht für Öffnungen, man zahlt dafür, dass der
 *    Massstab da ist, wenn man ihn braucht.
 *
 * =============================================================================
 * DIE VIER REGELN, AUS DENEN DAS NEUE MODELL FOLGT
 * =============================================================================
 *
 * 1. DER PAYWALL LIEGT NIE BEI DER EHRLICHKEIT.
 *    Messfehlerband, «innerhalb der Schwankung», der eigene Verlauf und der
 *    vollständige Export bleiben dauerhaft kostenlos. Wer dafür zahlen müsste,
 *    bekäme gratis eine schlechtere Lüge — und genau das ist das Gegenteil
 *    dieses Produkts. Die Grenze verläuft zwischen dem Vergleich MIT SICH
 *    SELBST (frei) und der EINORDNUNG UND VORAUSSCHAU (Plus).
 *
 * 2. GEZÄHLT WIRD, WER GEMESSEN WURDE — nicht, wer gespeichert ist.
 *    Der Athletenbestand eines Trainers ist unbegrenzt und kostenlos.
 *    Abgerechnet wird die Zahl der Athleten mit mindestens einer Messung im
 *    Abojahr. Ein Jahr und nicht ein Monat, weil Diagnostik in Wellen läuft:
 *    dreissig Athleten im März, keiner im April. Eine Monatszählung zwänge
 *    jeden in die Stufe seiner Spitzenwoche.
 *
 * 3. REPORTS SIND NICHT GEDECKELT.
 *    Ein Zähler auf Reports erzeugt Reibung im Moment der Wertlieferung: Der
 *    Trainer überlegt, ob er den Report wirklich erzeugen soll. Das ist das
 *    Gegenteil dessen, was man will.
 *
 * 4. DER WIRKSAMKEITSNACHWEIS IST IN JEDER STUFE, AUCH DER KOSTENLOSEN.
 *    Er ist kein Aufpreismerkmal, sondern der Grund, warum ein Trainer bleibt
 *    — und das Einzige, was sonst niemand verkauft. Ihn hinter die höchste
 *    Stufe zu legen hiesse, das beste Argument dem zu verwehren, der es noch
 *    nicht kennt.
 *
 * DREI ZUSAGEN, DIE ÜBER ALLEM STEHEN UND NIE EINGESCHRÄNKT WERDEN
 *
 *   1. Der Export der eigenen Daten ist immer vollständig und kostenlos (§32).
 *      Daten gehören dem Nutzer, nicht der Stufe. Das ist auch der Grund,
 *      warum die Synchronisierung als Merkmal verkauft werden DARF: Sie ist
 *      Bequemlichkeit, kein Druckmittel — wer nicht zahlt, kommt trotzdem
 *      jederzeit vollständig an alles heran.
 *   2. Messen und Auswerten kostet nichts. Bezahlt wird für Einordnung,
 *      Vorausschau und die Betreuung mehrerer Athleten — nicht für den Zugang
 *      zu den eigenen Werten.
 *   3. Keine Werbung, kein Weiterverkauf von Daten, keine Auswertung fremder
 *      Werte für andere Zwecke.
 */

export interface Localized {
  de: string
  en: string
}

// =============================================================================
// Leistungsmerkmale
// =============================================================================

/**
 * Was eine Stufe enthält — als Schlüssel und nicht als Fliesstext.
 *
 * Der Grund ist Prüfbarkeit: So kann ein Prüffall festhalten, dass der
 * kostenlose Kern das Messfehlerband enthält, und diese Zusage bricht nicht
 * still, wenn jemand einen Werbetext umschreibt. Jeder Schlüssel entspricht
 * einer Fähigkeit, die es in der App tatsächlich gibt — kein Merkmal auf
 * dieser Liste ist ein Versprechen auf später.
 */
export type PlanFeature =
  // --- Kostenloser Kern ------------------------------------------------------
  | 'measure' // Alle Tests mit Protokoll und Bedingungen
  | 'history' // Eigener Verlauf, unbegrenzt viele Messungen
  | 'errorBand' // Messfehler und das Urteil «innerhalb der Schwankung»
  | 'ownProfile' // Sechs Achsen gegen die eigene Bestleistung
  | 'export' // Vollständiger Export, immer (§32)
  | 'reminders' // Wiederholungstermine und Kalenderdatei
  | 'diaryLight' // Tagebuch light: Gewicht, Schlaf, Energie, Einheiten
  // --- Plus ------------------------------------------------------------------
  | 'forecast' // Formprognose auf ein Datum, mit Unsicherheitsband
  | 'seasonPlan' // Kontrollpunkte bis zum Wettkampf
  | 'requirementGap' // Welche Achse für die eigene Disziplin am meisten bringt
  | 'percentile' // Perzentil, wo eine belegte Referenz vorliegt
  | 'sync' // Abgleich über mehrere Geräte
  | 'card' // Performance Card zum Teilen
  | 'yearReview' // Jahresrückblick
  | 'multiAthlete' // Mehrere Athleten in einem Konto
  | 'diaryFull' // Volles Tagebuch: alle zuschaltbaren Felder
  | 'trainingLog' // Einheiten mit Sätzen, e1RM, Muskelvolumen
  | 'loadMonitoring' // Wochenlast, Verhältnis 7:28, Blockvergleich
  // --- Pro -------------------------------------------------------------------
  | 'nutrition' // Mahlzeiten, Makros, Referenzumsatz, Open Food Facts
  | 'decisionLog' // Entscheidungen mit Wirkungsprüfung
  | 'cockpit' // Signale mit einstellbaren Schwellen
  // --- Elite -----------------------------------------------------------------
  | 'health' // Gesundheitsschicht: Laborverlauf, Symptome, Zyklus, Medikation (Art. 9)
  | 'peakWeek' // Peak Week als Protokoll
  // --- Termin ----------------------------------------------------------------
  | 'targetStandards' // Zielwerte des konkreten Einstellungstests
  | 'reportPdf' // Druckfertiger Report
  // --- Trainer ---------------------------------------------------------------
  | 'groupTest' // Gruppentestmodus für einen Testtag
  | 'csvImport' // Bestehende Tabellen einlesen
  | 'coachProof' // Wirksamkeitsnachweis
  | 'unlimitedReports' // Reports ohne Deckel
  | 'heatmap' // Gruppen-Heatmap
  | 'plusForAthletes' // Betreute Athleten bekommen Plus
  | 'whiteLabel' // Eigenes Logo im Report
  | 'multiCoach' // Mehrere Trainer in einem Konto

/** Der kostenlose Kern. Steht als eigene Liste, weil er eine Zusage ist. */
export const FREE_CORE: readonly PlanFeature[] = [
  'measure',
  'history',
  'errorBand',
  'ownProfile',
  'export',
  'reminders',
  'diaryLight',
]

/**
 * Das Produkt, das der Bezahlweg für eine Stufe kennt — der Wert in
 * `entitlements.product`. Die kostenlosen Stufen haben keins.
 */
export type EntitlementProduct = 'athlete_plus' | 'athlete_pro' | 'athlete_elite' | 'athlete_termin' | 'coach_start' | 'coach_team' | 'coach_pro'

// =============================================================================
// Einzelnutzung
// =============================================================================

export type AthletePlanId = 'free' | 'plus' | 'pro' | 'elite' | 'termin'

export interface AthletePlan {
  id: AthletePlanId
  /** `once` gilt bis zum eingetragenen Termin, nicht für ein Jahr. */
  billing: 'free' | 'yearly' | 'once'
  /** Jahrespreis in Euro. `null` beim kostenlosen und beim Einmalkauf. */
  yearlyEur: number | null
  /**
   * Monatlich kündbar — bewusst so gestellt, dass das Jahr die klare Wahl
   * ist. Das ist kein Trick, solange beide Preise nebeneinander stehen: Wer
   * drei Monate testen will, soll das können, ohne ein Jahr zu binden.
   */
  monthlyEur: number | null
  /** Einmalpreis. Nur beim Termin-Pass. */
  onceEur: number | null
  /** Wie viele Athleten in diesem Konto geführt werden dürfen. */
  athletes: number
  name: Localized
  features: readonly PlanFeature[]
  /** Was der Bezahlweg dafür freischaltet. null = nicht kaufbar (kostenlos). */
  product: EntitlementProduct | null
}

/**
 * 49 € im Jahr, und nicht 49,90 €.
 *
 * Runde Zahlen passen zu einer Marke, die Präzision verkauft; krumme Preise
 * signalisieren Rabattlogik. Plus lag bei 29 € auf Höhe von My Jump Lab
 * (29,99 €/Jahr); mit Tagebuch, Trainingslog und Belastung ist es ein
 * anderes Produkt und steht bei 49 €. Pro (99 €) legt Ernährung, Cockpit und
 * Decision-Log darauf — das ist die Stufe für den, der täglich einträgt.
 *
 * Der Termin-Pass (69 €) ist teurer als das ganze Jahr Plus (49 €), und
 * das ist richtig: Er ist
 * kein kürzeres Plus, sondern ein anderes Bündel. Wer in acht Wochen zur
 * Einstellungsprüfung antritt, vergleicht nicht mit einer Fitness-App, sondern
 * mit einem Vorbereitungskurs für 150 €.
 */
const PLUS_FEATURES: readonly PlanFeature[] = [
  ...FREE_CORE,
  'forecast',
  'seasonPlan',
  'requirementGap',
  'percentile',
  'sync',
  'card',
  'yearReview',
  'multiAthlete',
  'diaryFull',
  'trainingLog',
  'loadMonitoring',
]

const PRO_FEATURES: readonly PlanFeature[] = [...PLUS_FEATURES, 'nutrition', 'decisionLog', 'cockpit']

export const ATHLETE_PLANS: readonly AthletePlan[] = [
  {
    id: 'free',
    billing: 'free',
    yearlyEur: null,
    monthlyEur: null,
    onceEur: null,
    athletes: 1,
    name: { de: 'Kydon', en: 'Kydon' },
    features: FREE_CORE,
    product: null,
  },
  {
    id: 'plus',
    billing: 'yearly',
    yearlyEur: 49,
    monthlyEur: 4.9,
    onceEur: null,
    athletes: 3,
    name: { de: 'Kydon Plus', en: 'Kydon Plus' },
    features: PLUS_FEATURES,
    product: 'athlete_plus',
  },
  {
    id: 'pro',
    billing: 'yearly',
    yearlyEur: 99,
    monthlyEur: 9.9,
    onceEur: null,
    athletes: 3,
    name: { de: 'Kydon Pro', en: 'Kydon Pro' },
    features: PRO_FEATURES,
    product: 'athlete_pro',
  },
  {
    id: 'elite',
    billing: 'yearly',
    yearlyEur: 199,
    monthlyEur: 19.9,
    onceEur: null,
    athletes: 3,
    name: { de: 'Kydon Elite', en: 'Kydon Elite' },
    features: [...PRO_FEATURES, 'health', 'peakWeek'],
    product: 'athlete_elite',
  },
  {
    id: 'termin',
    billing: 'once',
    yearlyEur: null,
    monthlyEur: null,
    onceEur: 69,
    athletes: 3,
    name: { de: 'Kydon Termin', en: 'Kydon Date' },
    features: [...PLUS_FEATURES, 'targetStandards', 'reportPdf'],
    product: 'athlete_termin',
  },
]

/**
 * Der Name sagt, WAS gemessen wird, nicht was dabei herauskommt.
 *
 * «Prüfungsvorbereitung» hiesse, ein Ergebnis in Aussicht zu stellen — und die
 * App trifft weder eine Trainings- noch eine Eignungsaussage (§81, §82). Ein
 * Termin ist ein Datum, auf das man misst. Mehr behauptet der Pass nicht, und
 * die Zielwerte erscheinen als amtliche Anforderung mit Quelle, nie als
 * Prognose über das Bestehen.
 */
export const TERMIN_NAMES_NO_OUTCOME = true

export function athletePlan(id: AthletePlanId): AthletePlan {
  return ATHLETE_PLANS.find((plan) => plan.id === id)!
}

/**
 * Was eine Stufe gegenüber der kostenlosen zusätzlich bringt.
 *
 * Die Preisseite zeigt genau das — nicht die Gesamtliste. Eine Tabelle, in der
 * neben «Plus» sechs Häkchen stehen, die der kostenlose Teil auch hat, sieht
 * nach mehr aus und sagt weniger.
 */
export function extraFeatures(plan: AthletePlan): PlanFeature[] {
  return plan.features.filter((feature) => !FREE_CORE.includes(feature))
}

/** Was ein Jahr monatliche Zahlung kostet — der Vergleich gehört sichtbar hin. */
export function yearlyCostOfMonthly(plan: AthletePlan): number | null {
  return plan.monthlyEur == null ? null : plan.monthlyEur * 12
}

// =============================================================================
// Trainer
// =============================================================================

export type CoachTierId = 'coach_free' | 'coach_start' | 'coach_team' | 'coach_pro'

export interface CoachTier {
  id: CoachTierId
  yearlyEur: number | null
  monthlyEur: number | null
  /**
   * Athleten mit MINDESTENS EINER MESSUNG im Abojahr. Der Bestand ist davon
   * unberührt und unbegrenzt.
   */
  athletesPerYear: number
  /** Wie viele Menschen im selben Konto arbeiten dürfen. */
  coachSeats: number
  name: Localized
  features: readonly PlanFeature[]
  /** Was der Bezahlweg dafür freischaltet. null bei der kostenlosen Stufe. */
  product: EntitlementProduct | null
}

const COACH_BASE: readonly PlanFeature[] = [
  'measure',
  'history',
  'errorBand',
  'ownProfile',
  'export',
  'reminders',
  'diaryLight',
  'groupTest',
  'csvImport',
  'coachProof',
  'unlimitedReports',
  'reportPdf',
]

/**
 * Die Staffel ist degressiv: 5,96 € je Athlet bei Start, 4,65 € bei Team,
 * 2,80 € bei Pro — jeweils für ein ganzes Jahr.
 *
 * Der Massstab dahinter ist die Rechnung des Trainers, nicht unsere: Er
 * verkauft eine Diagnostiksitzung für 80 bis 150 €. Bleibt der Anteil unter
 * zehn Prozent, rechnet niemand nach. Bei Start sind es rund sechs Prozent
 * einer einzigen Sitzung — pro Athlet und Jahr.
 *
 * Zum Vergleich: TeamBuildr verlangt 90 $ im Monat für 50 Athleten im BESTAND,
 * also über 1.000 $ im Jahr. Ein Trainer mit hundert Klienten, der sechzig
 * davon jährlich misst, zahlt dort das Dreifache von Team — und misst mit
 * Kydon, während er dort programmiert. Die Stufen gewinnen überall dort, wo
 * EPISODISCH gemessen wird, und das ist bei Diagnostik immer der Fall.
 */
export const COACH_TIERS: readonly CoachTier[] = [
  {
    id: 'coach_free',
    yearlyEur: null,
    monthlyEur: null,
    athletesPerYear: 3,
    coachSeats: 1,
    name: { de: 'Coach Free', en: 'Coach Free' },
    features: COACH_BASE,
    product: null,
  },
  {
    id: 'coach_start',
    yearlyEur: 149,
    monthlyEur: 15,
    athletesPerYear: 25,
    coachSeats: 1,
    name: { de: 'Coach Start', en: 'Coach Start' },
    features: [...COACH_BASE, 'heatmap', 'plusForAthletes'],
    product: 'coach_start',
  },
  {
    id: 'coach_team',
    yearlyEur: 349,
    monthlyEur: 35,
    athletesPerYear: 75,
    coachSeats: 3,
    name: { de: 'Coach Team', en: 'Coach Team' },
    features: [...COACH_BASE, 'heatmap', 'plusForAthletes', 'whiteLabel', 'multiCoach'],
    product: 'coach_team',
  },
  {
    id: 'coach_pro',
    yearlyEur: 699,
    monthlyEur: 69,
    athletesPerYear: 250,
    coachSeats: 10,
    name: { de: 'Coach Pro', en: 'Coach Pro' },
    features: [...COACH_BASE, 'heatmap', 'plusForAthletes', 'whiteLabel', 'multiCoach'],
    product: 'coach_pro',
  },
]

export function coachTier(id: CoachTierId): CoachTier {
  return COACH_TIERS.find((tier) => tier.id === id)!
}

/** Das Produkt zu einer Stufe — null, wenn sie nichts kostet. */
export function productOfPlan(id: AthletePlanId | CoachTierId): EntitlementProduct | null {
  return ATHLETE_PLANS.find((p) => p.id === id)?.product ?? COACH_TIERS.find((c) => c.id === id)?.product ?? null
}

/** Preis je gemessenem Athleten und Jahr. Null bei der kostenlosen Stufe. */
export function perAthleteYearEur(tier: CoachTier): number | null {
  return tier.yearlyEur == null ? null : tier.yearlyEur / tier.athletesPerYear
}

/** Was zwölf Monatszahlungen kosten — der Aufpreis gehört sichtbar hin. */
export function yearlyCostOfMonthlyCoach(tier: CoachTier): number | null {
  return tier.monthlyEur == null ? null : tier.monthlyEur * 12
}

/**
 * Die kleinste Stufe, die diese Zahl gemessener Athleten trägt.
 *
 * `null` heisst: mehr, als die Stufen abdecken. Dann führt der Weg zur
 * Anfrage, nicht zu einem hochgerechneten Preis, den niemand zugesagt hat.
 */
export function coachTierFor(athletesMeasured: number): CoachTier | null {
  return COACH_TIERS.find((tier) => athletesMeasured <= tier.athletesPerYear) ?? null
}

/** Ein Jahr in Tagen — der Zeitraum, über den gezählt wird. */
export const BILLING_WINDOW_DAYS = 365

/**
 * Wie viele Athleten im zurückliegenden Jahr gemessen wurden.
 *
 * Bewusst auf die kleinste denkbare Form der Eingabe geschnitten — eine Liste
 * von Athleten mit Zeitpunkten. So hängt die Preislogik nicht am
 * Bestandsschema, und ein Prüffall braucht keine halbe App, um sie zu
 * belegen.
 *
 * Gezählt werden ATHLETEN, nicht Messungen: Wer zehnmal gemessen wurde, zählt
 * einmal. Das ist der Unterschied zwischen «wie viele Menschen betreust du»
 * und «wie fleissig bist du», und nur die erste Frage darf den Preis
 * bestimmen — sonst bestraft die Rechnung gründliches Messen.
 */
export function athletesMeasuredInWindow(
  athletes: readonly { results: readonly { performedAt: string }[] }[],
  asOf: Date = new Date(),
  windowDays: number = BILLING_WINDOW_DAYS,
): number {
  const from = asOf.getTime() - windowDays * 86_400_000
  return athletes.filter((athlete) =>
    athlete.results.some((result) => {
      const at = Date.parse(result.performedAt)
      return Number.isFinite(at) && at >= from && at <= asOf.getTime()
    }),
  ).length
}

/**
 * Athleten in der Betreuung eines zahlenden Trainers brauchen kein eigenes
 * Plus: Sie bekommen es über ihn. Sonst zahlte dieselbe Person zweimal — und
 * für den Trainer ist es das stärkste Argument, das er seinen Klienten machen
 * kann.
 */
export const COACH_INCLUDES_ATHLETE_PLUS = true

// =============================================================================
// Vereine und Einrichtungen
// =============================================================================

/**
 * Zwei Wege, beide auf Anfrage — oberhalb von Coach Pro.
 *
 * Der Unterschied ist nicht die Grösse, sondern ob mit der Diagnostik Geld
 * verdient wird. Ein Landesstützpunkt mit 300 Athleten und ehrenamtlichen
 * Trainern ist etwas anderes als ein Studio mit 40 Kunden, das
 * Leistungsdiagnostik als Dienstleistung verkauft.
 *
 * DIE EINSTUFUNG NIMMT DIE APP NICHT VOR. Sie nennt die Merkmale, die
 * Anfragende selbst zuordnen; geprüft wird im Gespräch anhand von Unterlagen
 * (Vereinsregister, Freistellungsbescheid). Eine Software, die aufgrund
 * eingetippter Angaben entscheidet, wer gemeinnützig ist, würde eine
 * Rechtsfrage zu einer Formularfrage machen.
 */
export type InstitutionTrack = 'nonprofit' | 'commercial'

export interface InstitutionProfile {
  track: InstitutionTrack
  name: Localized
  /** Woran man erkennt, dass dieser Weg der richtige ist. */
  criteria: Localized[]
}

export const INSTITUTION_PROFILES: InstitutionProfile[] = [
  {
    track: 'nonprofit',
    name: { de: 'Verein und Verband', en: 'Club and federation' },
    criteria: [
      {
        de: 'Eingetragener Verein oder Verband, als gemeinnützig anerkannt.',
        en: 'Registered club or federation, recognised as non-profit.',
      },
      {
        de: 'Die Betreuung liegt überwiegend bei ehrenamtlichen oder nebenberuflichen Trainern.',
        en: 'Coaching is mostly done by volunteer or part-time coaches.',
      },
      {
        de: 'Die Diagnostik wird nicht als eigene Leistung verkauft — sie gehört zum Training.',
        en: 'Diagnostics is not sold as a service of its own — it belongs to training.',
      },
    ],
  },
  {
    track: 'commercial',
    name: { de: 'Gewerbliche Nutzung', en: 'Commercial use' },
    criteria: [
      {
        de: 'Studio, Leistungszentrum, Praxis oder Agentur mit hauptamtlichem Personal.',
        en: 'Studio, performance centre, practice or agency with full-time staff.',
      },
      {
        de: 'Leistungsdiagnostik wird Kunden gegen Entgelt angeboten.',
        en: 'Performance diagnostics is offered to clients for a fee.',
      },
      {
        de: 'Der Report geht mit eigenem Logo an zahlende Kunden.',
        en: 'The report goes to paying clients under your own branding.',
      },
    ],
  },
]

/**
 * Angaben, aus denen die Anfrage besteht. Bewusst wenige und bewusst keine
 * personenbezogenen über Athleten (§50): für ein Preisgespräch genügt, wer
 * fragt, wie viele Athleten gemessen werden und welcher Weg gemeint ist.
 */
export interface EnquiryDraft {
  track: InstitutionTrack
  organisation: string
  athletes: number | null
  coaches: number | null
  note: string
}

export const ENQUIRY_EMAIL = 'preise@kydon.app'

/**
 * Aus den Angaben einen Text bauen, den der Anfragende selbst verschickt.
 *
 * Kein Versand aus der App heraus: Der Text wird kopiert oder in die eigene
 * Mail eingefügt — damit sieht der Absender vorher, was er über sich
 * preisgibt.
 */
export function buildEnquiryText(draft: EnquiryDraft, locale: AppLocale): string {
  const profile = INSTITUTION_PROFILES.find((p) => p.track === draft.track)!
  const lines =
    locale === 'de'
      ? [
          'Preisanfrage KYDON',
          '',
          `Art der Nutzung: ${profile.name.de}`,
          `Organisation: ${draft.organisation || '—'}`,
          `Gemessene Athleten im Jahr: ${draft.athletes ?? '—'}`,
          `Trainer: ${draft.coaches ?? '—'}`,
          '',
          draft.note || '',
        ]
      : [
          'KYDON pricing enquiry',
          '',
          `Type of use: ${profile.name.en}`,
          `Organisation: ${draft.organisation || '—'}`,
          `Athletes measured per year: ${draft.athletes ?? '—'}`,
          `Coaches: ${draft.coaches ?? '—'}`,
          '',
          draft.note || '',
        ]
  return lines.join('\n').trim()
}
