/**
 * Feldphysiologie: Kennzahlen aus Feldtests, jede mit ihrer Primärquelle.
 *
 * WOHER DIESE DATEI KOMMT: aus der Mastertabelle v2 und der dazugehörigen
 * Formelsammlung des Auftraggebers. Jede Formel wurde gegen die
 * Primärliteratur geprüft; übernommen ist, was dort steht — mit dem
 * Gültigkeitsbereich, den die Quelle angibt. Ausserhalb davon gibt es keine
 * Zahl statt einer falschen.
 *
 * WAS BEWUSST FEHLT, und warum (Prüfung 2026-10):
 *
 *   - Ein «glykolytischer Index» aus D′ und Phänotypen nach D′-Schwellen:
 *     in der Literatur nicht gefunden; D′ entspricht nachweislich nicht der
 *     anaeroben Kapazität (Zagatto & Gobatto 2012) und ist selbst wenig
 *     reproduzierbar (CV 13 %, Galbraith 2014; SEM 27 % im 3MT, Busso 2024).
 *   - Profilgrenzen 1,80 / 1,95 für die Speed Reserve Ratio und Fasertypen
 *     daraus: nicht gefunden. Publiziert sind Grenzen nur für männliche
 *     Elite-Mittelstreckler (Sandford 2019) — für alle anderen wären sie
 *     eine Platzhalternorm (§19 Regel 6).
 *   - Bewertungsstufen für den Riegel-Exponenten und für das
 *     Change-of-Direction-Deficit: nicht gefunden.
 *   - Trainingszonen als feste Prozente der CS (65/76/87/96/102/112 %): nicht
 *     gefunden. Belegt ist die Grenze moderat/schwer bei 82 % CS
 *     ({@link csIntensityDomains}).
 *   - Das optimale Kraft-Geschwindigkeits-Profil nach Samozino: die
 *     vorgelegte Näherung (Faktor 2,1) ist nicht die Originalgleichung, und
 *     die Originalgleichung ist hier noch nicht gegen den Anhang von
 *     Samozino 2012 geprüft. Bis dahin: F0, v0 und Pmax, keine Imbalance.
 *
 * Rein: keine React-, Netz- oder Speicherzugriffe (§19 Regel 9).
 */

export const GRAVITY = 9.81

const finite = (...xs: (number | null | undefined)[]): boolean =>
  xs.every((x) => typeof x === 'number' && Number.isFinite(x))

// --- Critical Speed ---------------------------------------------------------

/** Ein maximaler Lauf: Strecke in Metern, Zeit in Sekunden. */
export interface RunPoint {
  meters: number
  seconds: number
}

/**
 * Gültigkeitsbereich des Distanz-Zeit-Modells: maximale Läufe von etwa zwei
 * bis fünfzehn Minuten (Poole et al. 2016; Jones & Vanhatalo 2017). Kürzere
 * Läufe — etwa 400 m — liegen ausserhalb: dort trägt die anaerobe Leistung
 * so viel bei, dass die Gerade nicht mehr hält.
 */
export const CS_MIN_SECONDS = 120
export const CS_MAX_SECONDS = 900

export interface CriticalSpeedFit {
  /** Kritische Geschwindigkeit in m/s. */
  speed: number
  /** D′ in Metern — schlecht reproduzierbar, nur als Rohwert zeigen. */
  reserve: number
  /** Standardfehler der Schätzung in m (nur ab drei Läufen). */
  seeMeters: number | null
  /** Wie viele Läufe in die Rechnung gingen. */
  used: number
  /** Wie viele Läufe ausserhalb von 2–15 min lagen und nicht zählten. */
  excluded: number
}

/**
 * Kritische Geschwindigkeit aus zwei oder mehr maximalen Läufen.
 *
 * Lineares Modell d = CS · t + D′ (Monod & Scherrer 1965; Feldprotokoll mit
 * drei Läufen: Galbraith et al. 2014, CS-Schätzfehler 0,14 m/s). Läufe
 * ausserhalb von 2–15 min zählen nicht. Mit zwei Läufen gibt es keinen
 * Standardfehler — die Gerade geht durch beide Punkte, wie gut sie passt,
 * sagt sie nicht.
 *
 * Keine Zahl, wenn weniger als zwei gültige Läufe, alle gleich lang oder
 * Steigung bzw. Achsenabschnitt negativ sind.
 */
export function criticalSpeedFromRuns(runs: RunPoint[]): CriticalSpeedFit | null {
  const valid = runs.filter((r) => finite(r.meters, r.seconds) && r.meters > 0 && r.seconds > 0)
  const used = valid.filter((r) => r.seconds >= CS_MIN_SECONDS && r.seconds <= CS_MAX_SECONDS)
  if (used.length < 2) return null
  const n = used.length
  const mt = used.reduce((a, r) => a + r.seconds, 0) / n
  const md = used.reduce((a, r) => a + r.meters, 0) / n
  const sxx = used.reduce((a, r) => a + (r.seconds - mt) ** 2, 0)
  if (sxx === 0) return null
  const sxy = used.reduce((a, r) => a + (r.seconds - mt) * (r.meters - md), 0)
  const speed = sxy / sxx
  const reserve = md - speed * mt
  if (!(speed > 0) || reserve < 0) return null
  let seeMeters: number | null = null
  if (n >= 3) {
    const ss = used.reduce((a, r) => a + (r.meters - (speed * r.seconds + reserve)) ** 2, 0)
    seeMeters = Math.sqrt(ss / (n - 2))
  }
  return { speed, reserve, seeMeters, used: n, excluded: valid.length - n }
}

/**
 * 3-Minuten-All-Out-Lauf (Pettitt, Jamnick & Clark 2012).
 *
 * CS = mittlere Geschwindigkeit der letzten 30 s; D′ = Strecke über CS
 * während der 180 s. CS ist gut reproduzierbar (SEM 1,3–2,2 %, Busso 2024),
 * D′ nicht (SEM 27 %) — D′ steht deshalb nur als Rohwert da.
 */
export function threeMinuteAllOut(totalMeters: number, metersAt150s: number): { speed: number; reserve: number } | null {
  if (!finite(totalMeters, metersAt150s) || totalMeters <= metersAt150s || metersAt150s <= 0) return null
  const speed = (totalMeters - metersAt150s) / 30
  const reserve = totalMeters - speed * 180
  if (!(speed > 0) || reserve < 0) return null
  return { speed, reserve }
}

/**
 * Intensitätsbereiche relativ zur CS.
 *
 * Belegt ist die Grenze zwischen moderater und schwerer Intensität bei
 * 82,3 % CS (95-%-KI 81,1–83,6; Metaanalyse über 26 Studien, Hunter et al.
 * 2024) und CS selbst als Grenze zur sehr schweren Intensität (Poole 2016).
 * CS liegt im Mittel etwa 8 % über dem MLSS (Nixon et al. 2021) — sie ist
 * nicht dasselbe.
 */
export const CS_MODERATE_UPPER_FRACTION = 0.823

export interface IntensityDomains {
  /** Obergrenze «moderat» in m/s. */
  moderateUpper: number
  /** CS in m/s: Obergrenze «schwer», darüber «sehr schwer». */
  heavyUpper: number
}

export function csIntensityDomains(speed: number): IntensityDomains | null {
  if (!(speed > 0)) return null
  return { moderateUpper: speed * CS_MODERATE_UPPER_FRACTION, heavyUpper: speed }
}

/**
 * Vorhergesagte Zeit über eine Strecke aus CS und D′: t = (d − D′) / CS.
 *
 * Nur im Gültigkeitsbereich des Modells (2–15 min); über 3600 m wurden die
 * Zeiten systematisch um 6–8 % unterschätzt (Busso 2024). Ausserhalb: null.
 */
export function predictedTimeFromCs(meters: number, speed: number, reserve: number): number | null {
  if (!finite(meters, speed, reserve) || speed <= 0 || meters <= reserve) return null
  const t = (meters - reserve) / speed
  return t >= CS_MIN_SECONDS && t <= CS_MAX_SECONDS ? t : null
}

// --- Aerobe Geschwindigkeit und VO2max-Schätzung ---------------------------

/** Mittlere Geschwindigkeit in km/h aus Strecke und Zeit. */
export function speedKmh(meters: number, seconds: number): number | null {
  if (!finite(meters, seconds) || meters <= 0 || seconds <= 0) return null
  return (meters / seconds) * 3.6
}

/**
 * VO2max aus der Endgeschwindigkeit im 30-15 Intermittent Fitness Test.
 *
 *   VO2max = 28,3 − 2,15·G − 0,741·A − 0,0357·M + 0,0586·A·V + 1,03·V
 *
 * G = 1 Männer, 2 Frauen; A = Alter in Jahren; M = Körpermasse in kg;
 * V = V_IFT in km/h (Buchheit 2008). Gegen Spiroergometrie bei Fussballern:
 * Standardfehler 4,9 ml/kg/min, Bias +4,1 (2025, PMID 41178987) — ein
 * Schätzwert, kein Messwert.
 */
export const IFT_VO2MAX_SEE = 4.9

export function vo2maxFromIft(
  vIftKmh: number,
  ageYears: number | null,
  bodyMassKg: number | null,
  sex: 'male' | 'female' | null,
): number | null {
  if (!finite(vIftKmh, ageYears, bodyMassKg) || sex == null) return null
  const g = sex === 'male' ? 1 : 2
  const a = ageYears as number
  const m = bodyMassKg as number
  return 28.3 - 2.15 * g - 0.741 * a - 0.0357 * m + 0.0586 * a * vIftKmh + 1.03 * vIftKmh
}

// --- Schnelligkeit ---------------------------------------------------------

/**
 * Anaerobic Speed Reserve und Speed Reserve Ratio (Sandford et al. 2019,
 * 2021): ASR = MSS − MAS, SRR = MSS / MAS. Nur die Zahlen — Profilgrenzen
 * gibt es publiziert nur für männliche Elite-Mittelstreckler.
 */
export function speedReserve(mssMs: number, masMs: number): { asr: number; srr: number } | null {
  if (!finite(mssMs, masMs) || mssMs <= 0 || masMs <= 0 || mssMs <= masMs) return null
  return { asr: mssMs - masMs, srr: mssMs / masMs }
}

// --- Sprung und Reaktivkraft -----------------------------------------------

/**
 * Sprunghöhe aus der Flugzeit: h = g · t² / 8 (Bosco, Luhtanen & Komi 1983).
 * Gilt nur, wenn Absprung- und Landehaltung gleich sind. Ergebnis in cm.
 */
export function jumpHeightFromFlightTime(flightSeconds: number): number | null {
  if (!finite(flightSeconds) || flightSeconds <= 0 || flightSeconds > 1.5) return null
  return ((GRAVITY * flightSeconds ** 2) / 8) * 100
}

/**
 * Reactive Strength Index: Sprunghöhe / Bodenkontaktzeit, in m/s
 * (Young 1995; Reliabilität CV 2–3 %, Markwick et al. 2015).
 */
export function reactiveStrengthIndex(jumpHeightCm: number, contactMs: number): number | null {
  if (!finite(jumpHeightCm, contactMs) || jumpHeightCm <= 0 || contactMs <= 0) return null
  return jumpHeightCm / 100 / (contactMs / 1000)
}

/**
 * Eccentric Utilization Ratio: CMJ-Höhe / SJ-Höhe (McGuigan et al. 2006).
 * Ein Verhältnis, keine Bewertung — eine Reliabilität ist nicht belegt.
 */
export function eccentricUtilizationRatio(cmjCm: number, sjCm: number): number | null {
  if (!finite(cmjCm, sjCm) || cmjCm <= 0 || sjCm <= 0) return null
  return cmjCm / sjCm
}

/**
 * Mittlere mechanische Leistung im Dauersprungtest nach Bosco, in W/kg:
 *
 *   P = g² · Tf · Ttot / (4 · n · (Ttot − Tf))
 *
 * Tf = Summe der Flugzeiten, Ttot = Testdauer, n = Zahl der Sprünge
 * (Bosco, Luhtanen & Komi 1983).
 */
export function boscoPowerWkg(totalFlightSeconds: number, testSeconds: number, jumps: number): number | null {
  if (!finite(totalFlightSeconds, testSeconds, jumps) || jumps <= 0 || totalFlightSeconds <= 0) return null
  if (testSeconds <= totalFlightSeconds) return null
  return (GRAVITY ** 2 * totalFlightSeconds * testSeconds) / (4 * jumps * (testSeconds - totalFlightSeconds))
}

/**
 * Treppensprint nach Margaria (1966) bzw. Kalamen (1968): P = m · g · h / t,
 * in Watt. h = Höhenunterschied zwischen den Messstufen, t = Zeit dazwischen.
 */
export function stairPowerWatts(bodyMassKg: number, heightM: number, seconds: number): number | null {
  if (!finite(bodyMassKg, heightM, seconds) || bodyMassKg <= 0 || heightM <= 0 || seconds <= 0) return null
  return (bodyMassKg * GRAVITY * heightM) / seconds
}

/**
 * Kraft-Geschwindigkeits-Profil im Squat Jump (Samozino et al. 2008, 2014).
 *
 * Je Last: F = m·g·(h/hPO + 1), v = √(g·h/2), mit m = Körpermasse + Last,
 * h = Sprunghöhe, hPO = Abdruckweg. Aus mindestens zwei Lasten die Gerade
 * F(v): F0 = Achsenabschnitt, v0 = −F0/Sfv, Pmax = F0·v0/4 — in N/kg und
 * W/kg relativ zur Körpermasse.
 *
 * Der Messfehler ist gross (Sfv CV 14–30 %, Lindberg 2021); die Werte sind
 * für den Verlauf eines Athleten gedacht, nicht als Diagnose.
 */
export interface FvProfile {
  f0NPerKg: number
  v0Ms: number
  pmaxWPerKg: number
  slope: number
}

export function samozinoJumpProfile(
  bodyMassKg: number,
  pushOffM: number,
  points: { addedKg: number; jumpHeightCm: number }[],
): FvProfile | null {
  if (!finite(bodyMassKg, pushOffM) || bodyMassKg <= 0 || pushOffM <= 0) return null
  const fv = points
    .filter((p) => finite(p.addedKg, p.jumpHeightCm) && p.addedKg >= 0 && p.jumpHeightCm > 0)
    .map((p) => {
      const h = p.jumpHeightCm / 100
      const m = bodyMassKg + p.addedKg
      return { f: m * GRAVITY * (h / pushOffM + 1), v: Math.sqrt((GRAVITY * h) / 2) }
    })
  if (fv.length < 2) return null
  const n = fv.length
  const mv = fv.reduce((a, p) => a + p.v, 0) / n
  const mf = fv.reduce((a, p) => a + p.f, 0) / n
  const sxx = fv.reduce((a, p) => a + (p.v - mv) ** 2, 0)
  if (sxx === 0) return null
  const slope = fv.reduce((a, p) => a + (p.v - mv) * (p.f - mf), 0) / sxx
  const f0 = mf - slope * mv
  if (!(slope < 0) || !(f0 > 0)) return null
  const v0 = -f0 / slope
  return {
    f0NPerKg: f0 / bodyMassKg,
    v0Ms: v0,
    pmaxWPerKg: (f0 * v0) / 4 / bodyMassKg,
    slope: slope / bodyMassKg,
  }
}

// --- Herz-Kreislauf --------------------------------------------------------

/**
 * Ruffier-Index (P0 + P1 + P2 − 200) / 10 und Ruffier-Dickson-Index
 * ((P1 − 70) + 2·(P2 − P0)) / 10 nach 30 Kniebeugen in 45 s.
 *
 * Nur die Indizes: Klassengrenzen sind in der Primärliteratur nicht
 * auffindbar, und der Zusammenhang mit der Ausdauerleistungsfähigkeit ist
 * schwach (r = −0,40, Sartor et al. 2016).
 */
export function ruffierIndices(p0: number, p1: number, p2: number): { ruffier: number; dickson: number } | null {
  if (!finite(p0, p1, p2) || p0 <= 0 || p1 <= 0 || p2 <= 0) return null
  return { ruffier: (p0 + p1 + p2 - 200) / 10, dickson: (p1 - 70 + 2 * (p2 - p0)) / 10 }
}
