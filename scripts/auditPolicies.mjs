/**
 * Prüft die Zugriffsregeln der Datenbank, ohne eine Datenbank zu brauchen.
 *
 * WARUM STATISCH UND NICHT GEGEN EINE ECHTE INSTANZ: die Regeln stehen in
 * Migrationen, und eine Migration ist die einzige Quelle der Wahrheit für
 * das, was in Produktion gilt. Ein Prüflauf gegen eine laufende Datenbank
 * würde prüfen, was jemand dort einmal von Hand eingestellt hat. Diese
 * Prüfung läuft in jeder Pipeline, in jedem Fork, ohne Zugangsdaten — und
 * genau deshalb läuft sie überhaupt.
 *
 * WAS SIE NICHT KANN: sie liest keine Absicht. Ob `can_edit_athlete()` das
 * Richtige tut, steht hier nicht zur Debatte; das prüfen die Tests der
 * Anwendung und der Kopf. Sie fängt die Fehlerklasse, die man beim Schreiben
 * von Policies tatsächlich macht — eine vergessene Prüfung, eine offene
 * Rolle, ein `true` an der falschen Stelle.
 *
 * Die vier Regeln stammen unmittelbar aus dem Befund, der sie ausgelöst hat:
 * `links_update_involved` hatte kein WITH CHECK, und deshalb war `athlete_id`
 * frei wählbar.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'supabase/migrations'

/**
 * Tabellen, deren Inhalt bewusst für alle Angemeldeten lesbar ist. Jede
 * Zeile hier ist eine Entscheidung, keine Ausnahme: Referenzwerte und der
 * Testkatalog sind Nachschlagewerke, keine Nutzerdaten.
 */
const PUBLIC_READ_OK = new Set(['performance_norms', 'test_definitions', 'test_definition_translations'])

/** Funktionen, die absichtlich niemandem direkt gehören (Trigger). */
const TRIGGER_FUNCTIONS = /returns\s+trigger/i

/** Entfernt Dollar-Quoting, damit Funktionskörper die Anweisungstrennung nicht stören. */
function stripBodies(sql) {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, ' BODY ')
}

/** Zerlegt in Anweisungen und wirft Kommentarzeilen weg. */
function statements(sql) {
  return stripBodies(sql)
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function auditPolicies(dir = DIR) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const findings = []
  /** Endzustand je (Tabelle, Name) — eine später neu angelegte Policy ersetzt die frühere. */
  const policies = new Map()
  const rlsTables = new Set()
  const policyTables = new Set()
  const functions = []

  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf-8')
    for (const stmt of statements(sql)) {
      const lower = stmt.toLowerCase()

      const rls = lower.match(/alter table (?:public\.)?(\w+)\s+enable row level security/)
      if (rls) rlsTables.add(rls[1])

      // Namen dürfen mit oder ohne Anführungszeichen stehen. Beides kommt im
      // Bestand vor, und ein Parser, der eine Schreibweise übersieht, prüft
      // eine ganze Migration stillschweigend nicht.
      const drop = lower.match(/^drop policy (?:if exists )?"?([^"\s]+)"? on (?:public\.|storage\.)?(\w+)/)
      if (drop) policies.delete(`${drop[2]}.${drop[1]}`)

      const create = stmt.match(/^create policy\s+"?([^"\s]+)"?\s+on\s+(?:public\.|storage\.)?(\w+)/i)
      if (create) {
        const [, name, table] = create
        policies.set(`${table}.${name}`, { name, table, file, sql: stmt, lower })
        policyTables.add(table)
      }

      const fn = stmt.match(/^create or replace function\s+(?:public\.)?(\w+)/i)
      if (fn) functions.push({ name: fn[1], file, sql: stmt, lower })
    }
  }

  const add = (severity, rule, where, message) =>
    findings.push({ severity, rule, where, message })

  for (const p of policies.values()) {
    const command = (p.lower.match(/\bfor\s+(all|select|insert|update|delete)\b/) ?? [, 'all'])[1]
    const writes = command === 'all' || command === 'insert' || command === 'update'
    const hasCheck = /with check/.test(p.lower)
    const usingClause = p.lower.match(/using\s*\(\s*true\s*\)/)
    const checkClause = p.lower.match(/with check\s*\(\s*true\s*\)/)

    // 1. Schreiben ohne WITH CHECK heisst: die NEUE Zeile wird nicht geprüft.
    //    Bei UPDATE nimmt Postgres dann den USING-Ausdruck — der die alte
    //    Zeile meint. Genau so entstand der kritische Befund.
    if (writes && !hasCheck) {
      add('CRITICAL', 'with-check-required', `${p.table}.${p.name} (${p.file})`,
        `Schreib-Policy für ${command.toUpperCase()} ohne WITH CHECK — die neue Zeile wird nicht geprüft`)
    }

    // 2. `true` beim Schreiben ist keine Regel, sondern ihr Fehlen.
    if (writes && checkClause) {
      add('CRITICAL', 'no-blanket-write', `${p.table}.${p.name} (${p.file})`,
        'WITH CHECK (true) erlaubt jeden Schreibvorgang')
    }

    // 3. Uneingeschränktes Lesen nur dort, wo es eine Entscheidung war.
    if (command === 'select' && usingClause && !PUBLIC_READ_OK.has(p.table)) {
      add('HIGH', 'no-blanket-read', `${p.table}.${p.name} (${p.file})`,
        'USING (true) beim Lesen — die ganze Tabelle ist für alle Angemeldeten sichtbar')
    }

    // 4. Nicht angemeldete Rollen dürfen keine Nutzerdaten sehen.
    if (/\bto\s+(public|anon)\b/.test(p.lower)) {
      add('HIGH', 'no-anon-role', `${p.table}.${p.name} (${p.file})`,
        'Policy gilt für anon/public — sie greift ohne Anmeldung')
    }
  }

  // 5. Eine Tabelle mit RLS und ohne Policy ist für Endnutzer tot; eine
  //    Tabelle mit Policies und ohne RLS ist offen. Der zweite Fall ist der
  //    gefährliche, weil er wie Schutz aussieht.
  for (const table of policyTables) {
    if (!rlsTables.has(table) && table !== 'objects') {
      add('CRITICAL', 'rls-not-enabled', table,
        'Tabelle hat Policies, aber ROW LEVEL SECURITY ist nicht eingeschaltet')
    }
  }
  for (const table of rlsTables) {
    if (!policyTables.has(table)) {
      add('MEDIUM', 'rls-without-policy', table,
        'RLS eingeschaltet, aber keine Policy — die Tabelle ist für Endnutzer unlesbar')
    }
  }

  // 6. SECURITY DEFINER ohne festen search_path ist der klassische Weg zur
  //    Rechteausweitung: der Aufrufer stellt den Suchpfad um und unterschiebt
  //    eine eigene Tabelle.
  for (const fn of functions) {
    if (/security definer/.test(fn.lower) && !/set\s+search_path/.test(fn.lower)) {
      add('HIGH', 'definer-needs-search-path', `${fn.name} (${fn.file})`,
        'SECURITY DEFINER ohne festen search_path')
    }
    // Auch prüfende Funktionen ohne DEFINER: ein beweglicher Suchpfad ist nie
    // gewollt, wenn die Funktion in einer Regel steht.
    if (!/security definer/.test(fn.lower) && TRIGGER_FUNCTIONS.test(fn.lower)
        && !/set\s+search_path/.test(fn.lower) && fn.name !== 'set_updated_at') {
      add('MEDIUM', 'trigger-needs-search-path', `${fn.name} (${fn.file})`,
        'Trigger-Funktion ohne festen search_path')
    }
  }

  return findings
}

const ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

if (process.argv[1]?.endsWith('auditPolicies.mjs')) {
  const findings = auditPolicies()
  findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
  for (const f of findings) console.log(`${f.severity}  ${f.rule}  ${f.where}\n         ${f.message}`)
  const blocking = findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
  console.log(
    findings.length === 0
      ? '✓ Zugriffsregeln: keine Befunde'
      : `${findings.length} Befunde, davon ${blocking.length} blockierend`,
  )
  process.exit(blocking.length === 0 ? 0 : 1)
}
