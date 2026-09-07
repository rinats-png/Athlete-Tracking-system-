/**
 * Wo die zweisprachigen Inhalte der App liegen.
 *
 * Die Oberfläche spricht über i18next; die INHALTE — Testnamen, Anleitungen,
 * Disziplinen, Achsen, Referenzkohorten, Ausrüstung — liegen als
 * `{ de, en }`-Objekte direkt in den Datenmodulen. Für weitere Sprachen
 * werden diese Objekte beim Laden der Sprache ERGÄNZT, nicht kopiert: die
 * Übersetzung steht in `content/<lang>.json`, mit dem englischen Text als
 * Schlüssel, und `augmentContent` schreibt sie an Ort und Stelle dazu.
 *
 * Warum der englische Text der Schlüssel ist: er ist in jedem Objekt schon
 * da, ohne dass jemand Kennungen pflegen müsste, und derselbe Satz an zwei
 * Stellen bekommt dieselbe Übersetzung.
 *
 * Diese Liste ist die einzige Stelle, die wissen muss, welche Module
 * Inhalte tragen. Die Rechtstexte fehlen absichtlich: ein Impressum oder
 * eine Datenschutzerklärung wird nicht maschinell in sechs Sprachen
 * gebracht — sie bleiben deutsch und englisch, bis eine Fachperson sie
 * geprüft hat.
 */
export async function loadContentRoots(): Promise<unknown[]> {
  // Nachgeladen, nicht fest eingebunden: Referenzen, Vorschriften und
  // Belege gehören nicht ins Startpaket — sie kommen erst mit der Sprache,
  // die sie braucht, oder mit dem Bildschirm, der sie zeigt.
  return Promise.all([
    import('@/data/equipment'),
    import('@/data/equipmentPresets'),
    import('@/data/methodEvidence'),
    import('@/data/operator'),
    import('@/data/pricing'),
    import('@/data/profileAxes'),
    import('@/data/referenceModel'),
    import('@/data/references'),
    import('@/data/referencesExtended'),
    import('@/data/referencesHandbook'),
    import('@/data/sportProfiles'),
    import('@/data/sportProfilesAdditions'),
    import('@/data/sportRationale'),
    import('@/data/testBatteries'),
    import('@/data/testCatalog'),
    import('@/data/testProcedure'),
    import('@/data/testProtocols'),
  ])
}

/** Sprachen, für die Inhalte ergänzt werden können. */
export type ContentTable = Record<string, string>

const augmented = new Set<string>()

/**
 * Trägt die Übersetzung einer Sprache in alle Inhaltsobjekte ein.
 *
 * Idempotent je Sprache. Fehlt ein Eintrag in der Tabelle, bleibt das Feld
 * leer und `pick()` fällt auf Englisch zurück — sichtbar, nicht still.
 */
export async function augmentContent(lang: string, table: ContentTable): Promise<void> {
  if (augmented.has(lang)) return
  const roots = await loadContentRoots()
  const visited = new WeakSet<object>()
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object' || visited.has(node)) return
    visited.add(node)
    if (node instanceof Map) {
      for (const v of node.values()) walk(v)
      return
    }
    const o = node as Record<string, unknown>
    if (typeof o.de === 'string' && typeof o.en === 'string') {
      const translated = table[o.en]
      if (translated) o[lang] = translated
      return
    }
    for (const v of Array.isArray(o) ? o : Object.values(o)) walk(v)
  }
  for (const root of roots) walk(root)
  augmented.add(lang)
}
