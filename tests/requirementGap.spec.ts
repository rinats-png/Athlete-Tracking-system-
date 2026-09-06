import { expect, test } from '@playwright/test'
import {
  OPEN_AXIS_MAX_SCORE,
  OPEN_AXIS_MIN_REQUIREMENT,
  biggestLever,
  requirementGap,
} from '../src/domain/requirementGap'
import { disciplineById } from '../src/data/sportProfiles'
import type { RadarAxis } from '../src/types/domain'

/**
 * Die Anforderungslücke sagt, WO die Zeit hingehört — und nie, was dort zu
 * tun ist. Diese Fälle bewachen, dass die Rangfolge aus Anforderung UND Luft
 * nach oben entsteht, dass Ungemessenes nie als schwach zählt, und dass
 * Kennzahlachsen ohne Gewicht nicht eingereiht werden.
 */

const axis = (axisId: string, score: number | null, testCount = 2): RadarAxis => {
  const known = ['endurance', 'max_strength', 'relative_strength', 'strength_endurance', 'power', 'agility']
  return {
    axisId,
    dimension: (known.includes(axisId) ? axisId : null) as RadarAxis['dimension'],
    score,
    testCount: score == null ? 0 : testCount,
    latestPerformedAt: score == null ? null : '2026-04-01T09:00:00.000Z',
    hasData: score != null,
  }
}

test.describe('Anforderungslücke', () => {
  test('ohne Disziplin gibt es nichts einzureihen', () => {
    const gap = requirementGap([axis('endurance', 40), axis('power', 60)], null)
    expect(gap.disciplineId).toBeNull()
    expect(gap.ranked).toHaveLength(0)
  })

  test('die Rangfolge folgt Anforderung mal Luft nach oben, nicht dem niedrigsten Wert', () => {
    // 5 km: Ausdauer 1.0, Kraftausdauer 0.4, Schnellkraft 0.3 — die Achsen
    // der Disziplin sind Ausdauer, Laufökonomie und Schnellkraft.
    const run = disciplineById('run_5k_discipline')!
    expect(run.dimensionWeights.endurance).toBe(1)
    expect(run.dimensionWeights.power).toBe(0.3)

    // Schnellkraft ist der niedrigste Wert — aber die Disziplin verlangt sie
    // kaum. Die Ausdauer mit höchster Anforderung trägt den grösseren Hebel.
    const gap = requirementGap([axis('endurance', 55), axis('power', 20)], 'run_5k_discipline')
    expect(biggestLever(gap)?.axisId).toBe('endurance')
    const lever = (id: string) => gap.ranked.find((r) => r.axisId === id)!.leverage
    expect(lever('endurance')).toBeCloseTo(1 * (100 - 55), 1)
    expect(lever('power')).toBeCloseTo(0.3 * (100 - 20), 1)
    expect(lever('endurance')).toBeGreaterThan(lever('power')!)
  })

  test('ungemessene Achsen zählen nicht als schwach, sie stehen als offene Frage', () => {
    const gap = requirementGap([axis('relative_strength', 55), axis('strength_endurance', null)], 'judo')
    expect(gap.ranked.map((r) => r.axisId)).not.toContain('strength_endurance')
    expect(gap.unmeasured.map((r) => r.axisId)).toContain('strength_endurance')
  })

  test('Kennzahlachsen ohne Anforderungshöhe werden nicht eingereiht', () => {
    // Judo führt «grip» und «fight_endurance» als Kennzahlachsen.
    const gap = requirementGap([axis('grip', 40), axis('relative_strength', 50)], 'judo')
    expect(gap.ranked.map((r) => r.axisId)).not.toContain('grip')
    expect(gap.unweighted.map((r) => r.axisId)).toContain('grip')
    expect(gap.unweighted[0].requirement).toBeNull()
  })

  test('offen heisst hohe Anforderung und Perzentil unter der Referenzmitte — beides muss zutreffen', () => {
    const below = requirementGap(
      [
        axis('endurance', OPEN_AXIS_MAX_SCORE - 1), // Anforderung 1.0 → offen
        axis('power', 20), // Anforderung 0.3 < 0.7 → nicht offen, trotz P20
      ],
      'run_5k_discipline',
    )
    const open = (gap: ReturnType<typeof requirementGap>, id: string) => gap.ranked.find((r) => r.axisId === id)!.open
    expect(open(below, 'endurance')).toBe(true)
    expect(open(below, 'power')).toBe(false)
    expect(below.openCount).toBe(1)

    // Genau an der Schwelle: nicht offen.
    const at = requirementGap([axis('endurance', OPEN_AXIS_MAX_SCORE)], 'run_5k_discipline')
    expect(open(at, 'endurance')).toBe(false)
    expect(OPEN_AXIS_MIN_REQUIREMENT).toBeGreaterThan(0.3)
  })

  test('die Belegstärke folgt der Zahl der Messungen', () => {
    const gap = requirementGap([axis('relative_strength', 50, 1), axis('power', 50, 3)], 'judo')
    const ev = (id: string) => gap.ranked.find((r) => r.axisId === id)!.evidence
    expect(ev('relative_strength')).toBe('weak')
    expect(ev('power')).toBe('strong')
  })
})
