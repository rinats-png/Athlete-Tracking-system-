// Prüft ein Wörterbuch gegen das deutsche Original und die Inhaltstabelle
// gegen den englischen Export. Aufruf: node scripts/checkLocale.mjs fr
import { readFileSync, existsSync } from 'node:fs'

const lang = process.argv[2]
if (!lang) {
  console.error('Sprache fehlt, z. B. fr')
  process.exit(2)
}
const read = (p) => JSON.parse(readFileSync(p, 'utf-8'))
const flatten = (o, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}
const placeholders = (s) => (String(s).match(/\{\{[^}]+\}\}/g) ?? []).sort().join(' ')
let errors = 0
const fail = (msg) => {
  errors++
  console.log('✘', msg)
}

for (const part of ['', '.extra']) {
  const ref = flatten(read(`src/i18n/de${part}.json`))
  const file = `src/i18n/${lang}${part}.json`
  if (!existsSync(file)) {
    fail(`${file} fehlt`)
    continue
  }
  const got = flatten(read(file))
  for (const key of Object.keys(ref)) {
    if (!(key in got)) fail(`${file}: Schlüssel fehlt: ${key}`)
    else if (typeof got[key] !== typeof ref[key]) fail(`${file}: Typ weicht ab: ${key}`)
    else if (typeof got[key] === 'string') {
      if (got[key].trim() === '' && ref[key].trim() !== '') fail(`${file}: leer: ${key}`)
      if (placeholders(got[key]) !== placeholders(ref[key]))
        fail(`${file}: Platzhalter weichen ab: ${key} — erwartet ${placeholders(ref[key]) || '(keine)'}, gefunden ${placeholders(got[key]) || '(keine)'}`)
    }
  }
  for (const key of Object.keys(got)) if (!(key in ref)) fail(`${file}: Schlüssel zu viel: ${key}`)
  console.log(`${file}: ${Object.keys(ref).length} Schlüssel geprüft`)
}

// Deutsch und Englisch brauchen keine Inhaltstabelle: beide stehen im Code,
// und Englisch IST die Ausweichsprache der Inhalte. `content/en.json` ist der
// Export, gegen den die übrigen Sprachen geprüft werden — keine Übersetzung.
const exportFile = process.argv[3] ?? 'src/i18n/content/en.json'
const contentFile = `src/i18n/content/${lang}.json`
if (lang === 'de' || lang === 'en') {
  console.log(`${lang}: keine Inhaltstabelle nötig — die Inhalte stehen im Code`)
} else if (!existsSync(contentFile)) fail(`${contentFile} fehlt`)
else {
  const source = read(exportFile)
  const table = read(contentFile)
  const keys = Object.keys(source)
  let missing = 0
  for (const en of keys) {
    const t = table[en]
    if (typeof t !== 'string' || t.trim() === '') {
      missing++
      if (missing <= 10) fail(`${contentFile}: fehlt: ${en.slice(0, 70)}`)
    } else if (placeholders(t) !== placeholders(en)) fail(`${contentFile}: Platzhalter: ${en.slice(0, 60)}`)
  }
  if (missing > 10) fail(`${contentFile}: … und ${missing - 10} weitere fehlen`)
  for (const en of Object.keys(table)) if (!(en in source)) fail(`${contentFile}: unbekannter Schlüssel: ${en.slice(0, 70)}`)
  console.log(`${contentFile}: ${keys.length - missing} von ${keys.length} Inhalten übersetzt`)
}

console.log(errors === 0 ? `✓ ${lang}: alles stimmig` : `${errors} Befunde für ${lang}`)
process.exit(errors === 0 ? 0 : 1)
