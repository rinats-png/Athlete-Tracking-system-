/**
 * Minderjährig nach Geburtsdatum (Entscheidung des Inhabers, 5. Oktober 2026).
 * Ohne Geburtsdatum gilt: nicht bekannt, also nicht gesperrt; dann trägt die
 * Zusicherung des Trainers (Zuweisung). Die Grenze ist das 18. Lebensjahr.
 */
export function isMinor(birthDate: string | null | undefined, today: string): boolean {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age--
  return age < 18
}
