import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
// @ts-expect-error — Prüfskripte sind bewusst reines JavaScript: sie laufen in
// der Pipeline auch dann, wenn der TypeScript-Bau gerade nicht durchläuft.
import { auditPolicies } from '../scripts/auditPolicies.mjs'
// @ts-expect-error — siehe oben.
import { scanSecrets } from '../scripts/scanSecrets.mjs'
import { openGuest, readDict } from './helpers'
import {
  FREE_ATTEMPTS,
  MAX_DELAY_MS,
  delayForAttempt,
  noteFailure,
  noteSuccess,
  remainingDelayMs,
} from '../src/lib/supabase/throttle'

interface Finding {
  severity: string
  rule: string
  where: string
  message: string
}

const blocking = (f: Finding) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
const show = (findings: Finding[]) =>
  findings.map((f) => `${f.severity} ${f.rule} ${f.where}: ${f.message}`).join('\n')

/**
 * Die Sicherheitsprüfungen, die ohne Server auskommen.
 *
 * Sie stehen hier und nicht nur in der Pipeline, weil eine Prüfung, die man
 * lokal nicht laufen lassen kann, erst auf dem Server auffällt — also nach
 * dem Fehler statt davor.
 *
 * Was hier NICHT geprüft werden kann, steht in `docs/sicherheit.md` unter
 * «Restrisiko»: alles, was eine echte Datenbank mit zwei echten Konten
 * braucht. Die statische Prüfung fängt die Fehlerklasse, sie ersetzt nicht
 * den Nachweis am lebenden System.
 */
test.describe('Zugriffsregeln der Datenbank', () => {
  test('keine Schreibregel ohne Prüfung der neuen Zeile', () => {
    const findings = (auditPolicies() as Finding[]).filter(blocking)
    expect(findings, `blockierende Befunde:\n${show(findings)}`).toEqual([])
  })

  test('die Prüfung erkennt eine fehlende WITH-CHECK-Klausel überhaupt', () => {
    // Ohne diesen Fall wüsste niemand, ob der obige Test etwas prüft oder nur
    // an einer Regel vorbeiliest, die er nicht versteht. Die Migration vom
    // 07.09. hat genau diesen Befund geschlossen; der Beweis, dass er
    // erkennbar war, gehört dazu.
    const source = readFileSync('scripts/auditPolicies.mjs', 'utf-8')
    expect(source).toContain('with-check-required')
    expect(source).toContain('rls-not-enabled')
  })
})

test.describe('Zugangsdaten', () => {
  test('weder im Quelltext noch im gebauten Paket', () => {
    const findings = (scanSecrets({ includeBuild: existsSync('dist') }) as Finding[]).filter(blocking)
    expect(findings, `gefundene Zugangsdaten:\n${show(findings)}`).toEqual([])
  })

  test('nur der publizierbare Schlüssel steht in der Beispielkonfiguration', () => {
    const env = readFileSync('.env.example', 'utf-8')
    expect(env).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
    // Ein Dienstschlüssel im Frontend hebelt jede Zugriffsregel aus, weil er
    // an ihnen vorbeigeht. Er darf hier nicht einmal als Platzhalter stehen.
    expect(env).not.toContain('SERVICE_ROLE')
    expect(env).not.toContain('sb_secret_')
  })

  test('die Umgebungsdatei mit echten Werten ist nicht versioniert', () => {
    const ignore = readFileSync('.gitignore', 'utf-8')
    expect(ignore).toMatch(/^\.env$/m)
    expect(ignore).toMatch(/^\.env\.local$/m)
  })
})

test.describe('Auslieferung', () => {
  const headers = () => readFileSync('public/_headers', 'utf-8')

  test('die Sicherheits-Header stehen vollständig in der Auslieferung', () => {
    const text = headers()
    for (const header of [
      'X-Content-Type-Options: nosniff',
      'X-Frame-Options: DENY',
      'Referrer-Policy:',
      'Permissions-Policy:',
      'Strict-Transport-Security:',
      'Content-Security-Policy:',
      'Cross-Origin-Opener-Policy:',
      'Cross-Origin-Resource-Policy:',
    ]) {
      expect(text, `${header} fehlt in public/_headers`).toContain(header)
    }
  })

  test('die Inhaltsrichtlinie erlaubt keine fremden Skripte und keine Wildcard', () => {
    const csp = headers().match(/Content-Security-Policy: (.+)/)?.[1] ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    // Ein Platzhalter in connect-src würde jedes fremde Supabase-Projekt
    // erlauben — dann schützt die Regel nichts mehr.
    expect(csp).not.toContain('*.supabase.co')
    expect(csp, 'unsafe-eval hebelt die Skriptregel aus').not.toContain('unsafe-eval')
    // 'unsafe-inline' ist NUR bei style-src erlaubt (Diagramme setzen Stile
    // inline). Bei script-src wäre es die Lücke, die die Regel verhindern soll.
    const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? ''
    expect(scriptSrc).not.toContain('unsafe-inline')
  })
})

test.describe('Frontend als öffentlicher Raum', () => {
  test('kein ungeprüftes HTML aus Daten', () => {
    // Die App rendert ausschliesslich über React. Sobald irgendwo HTML aus
    // einer Zeichenkette gesetzt wird, ist jede Notiz eines Athleten ein
    // möglicher Skriptträger.
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${entry.name}`
        if (entry.isDirectory()) walk(full)
        else if (/\.tsx?$/.test(entry.name)) {
          const text = readFileSync(full, 'utf-8')
          if (/dangerouslySetInnerHTML|\.innerHTML\s*=|new Function\(|\beval\(/.test(text)) hits.push(full)
        }
      }
    }
    walk('src')
    expect(hits, 'diese Dateien setzen HTML oder Code aus Daten').toEqual([])
  })

  test('externe Links öffnen ohne Zugriff auf das Ausgangsfenster', () => {
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${entry.name}`
        if (entry.isDirectory()) walk(full)
        else if (/\.tsx$/.test(entry.name)) {
          const text = readFileSync(full, 'utf-8')
          // Jedes target="_blank" braucht in derselben Auszeichnung ein
          // rel mit noopener — sonst kann die geöffnete Seite auf das
          // Ausgangsfenster zugreifen.
          for (const tag of text.match(/<a[\s\S]{0,400}?>/g) ?? []) {
            if (tag.includes('target="_blank"') && !tag.includes('noopener')) hits.push(full)
          }
        }
      }
    }
    walk('src')
    expect(hits, 'diese Dateien öffnen externe Links ohne noopener').toEqual([])
  })
})

/**
 * Das Löschen auf einem geteilten Gerät.
 *
 * Der Prüffall bleibt bewusst am ECHTEN Weg — Knopf, Rückfrage, Bestätigung —
 * statt `wipeDevice()` direkt aufzurufen. Was hier schiefgehen kann, ist
 * nicht die Funktion, sondern der Weg dorthin: eine Rückfrage, die nie
 * erscheint, ein Knopf, der die falsche Sache tut. Genau das prüft er.
 */
test.describe('Gerät leeren beim Abmelden', () => {
  test('es bleibt kein einziger Schlüssel der App zurück', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      // Ein Bestand, wie ihn ein Nutzungstag hinterlässt — quer über die
      // Module, nicht nur der eine Schlüssel, an den man zuerst denkt.
      localStorage.setItem('kydon.equipment', '["barbell"]')
      localStorage.setItem('kydon.sync.v1', '{"seen":{},"lastSyncedAt":null,"conflicts":[]}')
      localStorage.setItem('kydon.device', 'abc12345')
      localStorage.setItem('kydon.notify.lastShown', '1')
    })
    // Über die Navigation statt per `goto`: der Profilbildschirm wird
    // nachgeladen, und ein direkter Aufruf misst dann den Ladezustand.
    await page.getByRole('button', { name: 'PROFIL' }).click()

    await page.getByTestId('sign-out-wipe').click()
    // Ohne Bestätigung passiert nichts: der Weg ist unumkehrbar.
    expect(await page.evaluate(() => localStorage.getItem('kydon.data.v1'))).not.toBeNull()

    await page.getByTestId('sign-out-wipe-confirm').click()
    await page.waitForURL('**/')

    const left = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('kydon.')),
    )
    // `baseline.locale` steht danach wieder da, und zwar zu Recht: das
    // Löschen entfernt sie, die Spracherkennung schreibt beim folgenden
    // Neustart die Sprache des Browsers hinein. Das ist kein Rückstand des
    // vorherigen Nutzers, sondern eine Eigenschaft des Geräts — und sie
    // enthält nichts über ihn. Alles andere muss weg sein.
    expect(left.filter((k) => k !== 'kydon.locale'), 'diese Schlüssel haben das Löschen überlebt')
      .toEqual([])
    const locale = await page.evaluate(() => localStorage.getItem('kydon.locale'))
    expect(locale, 'die verbliebene Sprachmarke ist ein reines Sprachkürzel').toMatch(/^[a-z]{2}$/)
  })

  test('das gewöhnliche Abmelden behält den Bestand', async ({ page }) => {
    // Die Gegenprobe gehört dazu: wäre das Löschen die Vorgabe, verlöre jeder
    // Athlet beim Abmelden seine Messreihe (§32).
    await openGuest(page)
    await page.getByRole('button', { name: 'PROFIL' }).click()
    await page.getByRole('button', { name: readDict('de').auth.signOut, exact: true }).click()
    await page.waitForURL('**/')
    expect(await page.evaluate(() => localStorage.getItem('kydon.data.v1'))).not.toBeNull()
  })
})

/**
 * Die Bremse gegen Durchprobieren.
 *
 * Geprüft wird die Rechnung, nicht der Bildschirm: ab wann gewartet wird, dass
 * die Wartezeit wächst, dass sie gedeckelt ist und dass ein Erfolg die Reihe
 * beendet. Der Bildschirm dazu ist eine Fehlermeldung wie jede andere.
 */
test.describe('Anmeldebremse', () => {
  test('die Wartezeit wächst, ist gedeckelt und endet nicht in einer Sperre', () => {
    // Die reine Rechnung, ohne Browser und ohne Speicher.
    expect(delayForAttempt(FREE_ATTEMPTS), 'die ersten Fehlversuche kosten nichts').toBe(0)
    const first = delayForAttempt(FREE_ATTEMPTS + 1)
    const second = delayForAttempt(FREE_ATTEMPTS + 2)
    expect(first, 'nach den freien Versuchen wird gewartet').toBeGreaterThan(0)
    expect(second, 'die Wartezeit wächst').toBeGreaterThan(first)
    // Gedeckelt: eine Bremse, die ins Unendliche wächst, ist eine Sperre —
    // und die trifft am Ende fast immer den Rechtmässigen.
    expect(delayForAttempt(FREE_ATTEMPTS + 50)).toBe(MAX_DELAY_MS)
  })

  test('ein Erfolg beendet die Reihe', () => {
    // `noteFailure`/`noteSuccess` brauchen einen Speicher; hier steht der
    // kleinste, der die Zusage der Schnittstelle erfüllt.
    const store = new Map<string, string>()
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
    const now = Date.now()
    for (let i = 0; i <= FREE_ATTEMPTS + 2; i++) noteFailure(now)
    expect(remainingDelayMs(now), 'nach genug Fehlversuchen wird gewartet').toBeGreaterThan(0)
    noteSuccess()
    expect(remainingDelayMs(now), 'ein Erfolg räumt die Reihe').toBe(0)
    delete (globalThis as { localStorage?: unknown }).localStorage
  })

  test('eine fehlende Verbindung ist kein Fehlversuch', () => {
    // Wer im Zug die Verbindung verliert, soll sich danach nicht erst eine
    // Minute gedulden müssen. Die Bremse zählt nur abgelehnte Passwörter.
    const source = readFileSync('src/lib/supabase/auth.ts', 'utf-8')
    expect(source).toContain("if (reason === 'invalid_credentials') noteFailure()")
  })
})

test.describe('Kontolöschung', () => {
  test('der Dienstschlüssel steht nirgends im Frontend', () => {
    // Die Edge Function ist der einzige Ort, an dem er vorkommen darf — und
    // sie wird nicht ins Bündel gebaut.
    const walk = (dir: string): string[] => {
      const out: string[] = []
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${entry.name}`
        if (entry.isDirectory()) out.push(...walk(full))
        else if (/\.tsx?$/.test(entry.name)) out.push(full)
      }
      return out
    }
    const hits = walk('src').filter((f) =>
      /SERVICE_ROLE|service_role/.test(readFileSync(f, 'utf-8')),
    )
    expect(hits, 'diese Dateien im Frontend nennen den Dienstschlüssel').toEqual([])
  })

  test('die Löschfunktion nimmt keine Kennung aus dem Anfragekörper', () => {
    // Der Kern ihrer Sicherheit: WEN sie löscht, entscheidet das geprüfte
    // Token, nie der Aufrufer. Stünde hier ein Lesen des Körpers, wäre sie
    // ein Endpunkt zum Löschen fremder Konten.
    const fn = readFileSync('supabase/functions/delete-account/index.ts', 'utf-8')
    expect(fn).toContain('auth.getUser()')
    expect(fn, 'die Funktion liest den Anfragekörper').not.toMatch(/req\.json\(\)/)
    expect(fn, 'CORS steht auf einer Wildcard').not.toContain("'Access-Control-Allow-Origin': '*'")
  })
})
