/**
 * Sucht Zugangsdaten im Quelltext und im gebauten Paket.
 *
 * WARUM EIGENES SKRIPT UND KEIN FERTIGES WERKZEUG: die eine Sache, die hier
 * wirklich schiefgehen kann, ist ein Supabase-Dienstschlüssel im Frontend —
 * er hebelt sämtliche Zugriffsregeln aus, weil er an ihnen vorbeigeht. Dieses
 * Muster kennt ein allgemeiner Scanner nicht besser als wir, und ein Scanner,
 * der ohne Netz und ohne Konto läuft, läuft in jeder Pipeline.
 *
 * DER SCHWIERIGE TEIL SIND DIE FEHLALARME. Der publizierbare Schlüssel steht
 * absichtlich im Bundle — er IST öffentlich, die Absicherung liegt in den
 * RLS-Regeln. Und die Supabase-Bibliothek trägt die Zeichenkette
 * `sb_secret_` in ihrem eigenen Quelltext, weil sie prüft, ob ihr jemand
 * versehentlich einen Dienstschlüssel übergeben hat. Beides zu melden hiesse,
 * dass niemand mehr hinschaut. Also: gemeldet wird nur ein Treffer, auf den
 * ein echter Schlüsselkörper folgt.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOTS = ['src', 'supabase', 'scripts', 'tests', 'public']
const BUILD = 'dist'
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'test-results', 'playwright-report', 'fonts'])
const TEXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.sql', '.html', '.css', '.md', '.txt', ''])

/**
 * Jede Regel nennt, was sie sucht UND was sie durchlässt. Ein Muster ohne
 * Ausnahme ist hier wertlos: es feuert beim ersten Lauf und wird abgeschaltet.
 */
const RULES = [
  {
    id: 'supabase-service-role',
    severity: 'CRITICAL',
    // Ein echter Dienstschlüssel: das Präfix MIT Schlüsselkörper.
    pattern: /sb_secret_[A-Za-z0-9_-]{12,}/g,
    note: 'Supabase-Dienstschlüssel — umgeht sämtliche Zugriffsregeln',
  },
  {
    id: 'supabase-legacy-service-jwt',
    severity: 'CRITICAL',
    // Alte Schlüssel sind JWT; die Rolle steht im Nutzdatenteil.
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*/g,
    note: 'JWT mit service_role im Nutzdatenteil',
  },
  {
    id: 'private-key',
    severity: 'CRITICAL',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
    note: 'Privater Schlüssel',
  },
  {
    id: 'stripe-secret',
    severity: 'CRITICAL',
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g,
    note: 'Stripe-Geheimschlüssel',
  },
  {
    id: 'generic-assigned-secret',
    severity: 'HIGH',
    // Eine Zuweisung an einen verräterisch benannten Namen, mit einem Wert,
    // der wie ein Schlüssel aussieht — nicht wie ein Satz.
    pattern:
      /\b(?:api[_-]?key|secret[_-]?key|service[_-]?role[_-]?key|db[_-]?password|jwt[_-]?secret)\b\s*[:=]\s*["'][A-Za-z0-9_\-+/]{20,}["']/gi,
    note: 'Zugangsdatum fest im Quelltext zugewiesen',
  },
]

/** Was ausdrücklich öffentlich sein darf. */
const ALLOWED = [
  // Der publizierbare Schlüssel gehört ins Frontend (siehe .env.example).
  /sb_publishable_[A-Za-z0-9_.-]+/,
]

function* walk(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) yield* walk(full)
    else if (st.isFile() && TEXT.has(extname(entry)) && st.size < 8 * 1024 * 1024) yield full
  }
}

export function scanSecrets({ includeBuild = true } = {}) {
  const findings = []
  const roots = includeBuild ? [...ROOTS, BUILD] : ROOTS
  for (const root of roots) {
    for (const file of walk(root)) {
      const text = readFileSync(file, 'utf-8')
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0
        for (const match of text.matchAll(rule.pattern)) {
          const hit = match[0]
          if (ALLOWED.some((ok) => ok.test(hit))) continue
          const line = text.slice(0, match.index).split('\n').length
          findings.push({
            severity: rule.severity,
            rule: rule.id,
            where: `${file}:${line}`,
            // Nie den ganzen Treffer ausgeben: ein Prüfprotokoll ist selbst
            // ein Ort, an dem ein Schlüssel nicht landen soll.
            message: `${rule.note} (${hit.slice(0, 8)}…, ${hit.length} Zeichen)`,
          })
        }
      }
    }
  }
  return findings
}

if (process.argv[1]?.endsWith('scanSecrets.mjs')) {
  const findings = scanSecrets({ includeBuild: existsSync(BUILD) })
  for (const f of findings) console.log(`${f.severity}  ${f.rule}  ${f.where}\n         ${f.message}`)
  console.log(
    findings.length === 0
      ? `✓ Keine Zugangsdaten gefunden${existsSync(BUILD) ? ' (Quelltext und Paket)' : ' (Quelltext; dist fehlt)'}`
      : `${findings.length} Treffer`,
  )
  process.exit(findings.length === 0 ? 0 : 1)
}
