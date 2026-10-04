import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { TRAINING_RULES, TRAINING_SOURCES } from '../src/data/trainingRules'
import { eligibleRules, planMode, ruleUsable, specificityFor, validateRegistry } from '../src/domain/trainingRules'
import { INTENTS, type EvidenceRule } from '../src/domain/trainingTypes'
import { getTest } from '../src/data/testCatalog'

/** Etappe 9b: Fundament der Training Engine — Register, Gate, Prüfstatus. */

const reviewed = (r: EvidenceRule): EvidenceRule => ({ ...r, review: { state: 'reviewed', reviewer: 'Fachperson', reviewedOn: '2026-10-10', note: 'geprüft' } })

test.describe('Regelregister', () => {
  test('das Register ist stimmig: Quellen, Grenzen, Familien, Phasen, Messung am Blockende', () => {
    expect(validateRegistry()).toEqual([])
  })
  test('jede Regel hat eine bekannte Intention und eine Messung, die es im Katalog gibt', () => {
    for (const r of TRAINING_RULES) {
      expect(INTENTS).toContain(r.intent)
      expect(getTest(r.retestMetric), `${r.id}: ${r.retestMetric}`).toBeTruthy()
    }
  })
  test('alle Regeln sind zunächst ungeprüft, alle Quellen ohne Volltextprüfung (Ausgangszustand)', () => {
    for (const r of TRAINING_RULES) expect(r.review.state).toBe('unreviewed')
    for (const s of Object.values(TRAINING_SOURCES)) expect(s.fullTextChecked).toBe(false)
  })
  test('die Prüfung erkennt kaputte Regeln', () => {
    const base = TRAINING_RULES[0]
    expect(validateRegistry([{ ...base, evidence: { ...base.evidence, sourceIds: [] } }])).toContain('vo2_4x4: keine Quelle')
    expect(validateRegistry([{ ...base, evidence: { ...base.evidence, sourceIds: ['gibt_es_nicht'] } }]).join()).toMatch(/Quelle gibt_es_nicht fehlt/)
    expect(validateRegistry([base, base]).join()).toMatch(/doppelte Kennung/)
    // geprüft, aber Quelle nicht im Volltext gelesen: nicht zulässig
    expect(validateRegistry([reviewed(base)]).join()).toMatch(/ohne Volltextprüfung/)
  })
})

test.describe('Gate (Nachtrag 1, Punkt 4)', () => {
  const rule = TRAINING_RULES[0]
  test('Schalter: nur preview und on schalten etwas ein', () => {
    expect(planMode(undefined)).toBe('off')
    expect(planMode('x')).toBe('off')
    expect(planMode('preview')).toBe('preview')
    expect(planMode('on')).toBe('live')
  })
  test('ungeprüfte Regel: nur in der Vorschau, nie live, nie aus', () => {
    expect(ruleUsable(rule, 'off')).toBe(false)
    expect(ruleUsable(rule, 'live')).toBe(false)
    expect(ruleUsable(rule, 'preview')).toBe(true)
  })
  test('geprüfte Regel geht live; verbotene und unzureichende Regeln nie', () => {
    expect(ruleUsable(reviewed(rule), 'live')).toBe(true)
    expect(ruleUsable({ ...reviewed(rule), safety: { ...rule.safety, forbiddenForAutoPrescription: true } }, 'preview')).toBe(false)
    expect(ruleUsable({ ...rule, evidence: { ...rule.evidence, strength: 'INSUFFICIENT' } }, 'preview')).toBe(false)
  })
  test('Auswahl nach Familie, Phase, Intention und Trainingsalter', () => {
    const q = { family: 'hybrid' as const, phase: 'BUILD' as const, intent: 'VO2MAX' as const, mode: 'preview' as const, trainingAgeYears: 3 }
    expect(eligibleRules(q).map((r) => r.id)).toEqual(['vo2_4x4'])
    expect(eligibleRules({ ...q, phase: 'TAPER' })).toEqual([])
    expect(eligibleRules({ ...q, intent: 'MAX_SPEED' })).toEqual([])
    expect(eligibleRules({ ...q, trainingAgeYears: 0 })).toEqual([])
    expect(eligibleRules({ ...q, trainingAgeYears: null })).toEqual([])
    expect(eligibleRules({ ...q, mode: 'live' })).toEqual([])
    expect(eligibleRules({ ...q, mode: 'off' })).toEqual([])
  })
  test('Spezifität: fehlender Eintrag gilt als extrapoliert, nie als direkt', () => {
    expect(specificityFor(rule, 'hybrid')).toBe('EXTRAPOLATED')
    expect(specificityFor({ ...rule, evidence: { ...rule.evidence, specificity: {} } }, 'combat_striking')).toBe('EXTRAPOLATED')
  })
})

test('Wächter: der Vorschauschalter steht nicht in der Produktions-Vorlage', () => {
  // `.env.example` ist die Vorlage für Prüfläufe; ein Produktivbau setzt den Schalter nicht.
  const env = readFileSync('.env.example', 'utf-8')
  expect(env).not.toMatch(/^VITE_TRAINING_PLAN=on/m)
})
