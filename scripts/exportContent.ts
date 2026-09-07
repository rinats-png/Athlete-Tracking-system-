/**
 * Sammelt alle zweisprachigen Inhalte ({ de, en }) aus den Datenmodulen und
 * schreibt sie als Übersetzungsspeicher, englischer Text als Schlüssel.
 * Aufruf: npx tsx scripts/exportContent.ts out.json
 */
import { writeFileSync } from 'node:fs'
import { loadContentRoots } from '../src/i18n/contentRegistry'

const seen = new Map<string, string>()
const visited = new WeakSet<object>()
function walk(node: unknown): void {
  if (!node || typeof node !== 'object') return
  if (visited.has(node as object)) return
  visited.add(node as object)
  if (node instanceof Map) { for (const v of node.values()) walk(v); return }
  const o = node as Record<string, unknown>
  if (typeof o.de === 'string' && typeof o.en === 'string') {
    if (!seen.has(o.en)) seen.set(o.en, o.de)
    return
  }
  for (const v of Array.isArray(o) ? o : Object.values(o)) walk(v)
}
for (const root of await loadContentRoots()) walk(root)
const out: Record<string, { de: string; en: string }> = {}
for (const [en, de] of seen) out[en] = { en, de }
writeFileSync(process.argv[2] ?? 'content.export.json', JSON.stringify(out, null, 2))
const chars = [...seen.keys()].reduce((s, k) => s + k.length, 0)
console.log(`${seen.size} Einträge, ${chars} Zeichen Englisch`)
