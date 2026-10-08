#!/usr/bin/env node
/**
 * Erzeugt die App-Daten der Trainingsbibliothek aus den Rohquellen in
 * `content/library/` (Übungsdatenbank v1.1, Programm-Seed v4).
 *
 *   node scripts/buildLibrary.mjs
 *
 * Ausgabe in `src/data/library/`:
 *   exerciseRegistry.json  — 128 Übungen, Ausführung in Schritte zerlegt,
 *                            Quellen aus dem Fließtext als Liste
 *   programIndex.json      — Regeln, Vorlagen, Intents, Tests, Planköpfe
 *   plans/<PLAN_ID>.json   — Wochen eines Plans (nachgeladen beim Öffnen)
 *
 * Inhalte werden NICHT umformuliert: der Generator ordnet nur um. Fachliche
 * Prüfung bleibt Sache des Reviews; der Prüffall tests/library.spec.ts sichert
 * die Regelkette (Dosis innerhalb der Methodenregel, Intents, Autonomie).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const src = join(root, 'content/library')
const out = join(root, 'src/data/library')

const registry = JSON.parse(readFileSync(join(src, 'kydon_exercise_registry_128_v1_1.json'), 'utf8'))
const seed = JSON.parse(readFileSync(join(src, 'kydon_program_seed_v4.json'), 'utf8'))

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g

/** Fließtext ohne Markdown-Links plus die Links als Quellenliste. */
function splitLinks(text) {
  const sources = []
  const plain = String(text ?? '').replace(LINK, (_, label, url) => {
    sources.push({ label: label.trim(), url })
    return label.trim()
  })
  return { text: plain.replace(/\(\s*(,\s*)*\)/g, '').replace(/\s+([.,;])/g, '$1').trim(), sources }
}

/** «1) … 2) …» → Schritte; Rest nach «Technikpunkte:»/«Häufige Fehler:» gesondert. */
function splitExecution(text) {
  const t = String(text ?? '')
  const cut = (label) => {
    const i = t.indexOf(label)
    return i < 0 ? null : i
  }
  const tech = cut('Technikpunkte:')
  const err = cut('Häufige Fehler:')
  const end = Math.min(...[tech, err, t.length].filter((x) => x != null))
  const steps = t.slice(0, end).split(/\s*\d+\)\s+/).map((s) => s.trim()).filter(Boolean)
  const slice = (from, to) => (from == null ? '' : t.slice(from, to ?? t.length).replace(/^[^:]+:\s*/, '').trim())
  return {
    steps,
    cues: slice(tech, err != null && err > (tech ?? -1) ? err : undefined),
    errors: slice(err),
  }
}

const exercises = registry.map((e) => {
  const transfer = splitLinks(e.transfer)
  const exec = splitExecution(e.execution)
  return {
    id: e.exercise_id,
    name: e.name,
    category: e.category_id,
    section: e.section_title,
    steps: exec.steps,
    cues: exec.cues,
    errors: exec.errors,
    muscles: e.muscles,
    abilities: e.abilities,
    sportsNote: e.sports,
    transfer: transfer.text,
    sources: transfer.sources,
    patterns: e.movement_patterns,
    equipment: e.equipment_ids,
    complexity: e.technical_complexity,
    coachGate: e.coach_gate,
    loadTypes: e.load_types,
    parameters: e.allowed_parameters,
    caution: e.caution_tags,
    regressions: e.regression_options,
    progressions: e.progression_options,
    transferDefault: e.transfer_default,
  }
})

const planHead = (p) => {
  const { weekly, ...head } = p
  return {
    ...head,
    sessionCount: weekly.reduce((n, w) => n + w.sessions.length, 0),
    reducedWeeks: weekly.filter((w) => w.reduced).map((w) => w.week),
  }
}

const index = {
  version: '4.0',
  generated: seed.generated,
  methodRules: seed.method_rules,
  sessionTemplates: seed.session_templates,
  intents: seed.exercise_intent_vocabulary,
  conflictRules: seed.conflict_rules,
  progressionRules: seed.progression_rules,
  retestRules: seed.retest_rules,
  fuelRules: seed.fuel_rules,
  sportIdMap: seed.sport_id_map,
  sportDecisions: seed.sport_decisions,
  tests: seed.test_catalog,
  plans: seed.plans.map(planHead),
}

rmSync(join(out, 'plans'), { recursive: true, force: true })
mkdirSync(join(out, 'plans'), { recursive: true })
writeFileSync(join(out, 'exerciseRegistry.json'), JSON.stringify(exercises))
writeFileSync(join(out, 'programIndex.json'), JSON.stringify(index))
for (const p of seed.plans) writeFileSync(join(out, 'plans', `${p.plan_id}.json`), JSON.stringify(p.weekly))

console.log(`${exercises.length} Übungen, ${index.plans.length} Pläne, ${index.methodRules.length} Regeln, ${index.tests.length} Tests`)
