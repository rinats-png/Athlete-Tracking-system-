/**
 * Löschen ganzer Athleten im Abgleich — die reine Entscheidung, ohne Netz.
 *
 * Gelöscht wird mit Grabstein (`athlete_documents.deleted_at`, Migration
 * 20261011100000_document_tombstones). Diese Funktion sagt für einen Abgleich:
 *
 * - welche Athleten lokal zu entfernen sind, weil ein anderes Gerät sie
 *   gelöscht hat (Grabstein auf dem Server, lokal noch da);
 * - welche Grabsteine dieses Gerät schreiben muss (lokal gelöscht, auf dem
 *   Server noch lebendig);
 * - welche vorgemerkten Löschungen erledigt sind;
 * - welche Serverdokumente NICHT als «neu» geholt werden dürfen — sonst käme
 *   ein gelöschter Athlet beim nächsten Abgleich zurück.
 *
 * Der Grabstein gewinnt. Wer einen Athleten löscht, meint das; eine Änderung,
 * die ein zweites Gerät offline daran gemacht hat, geht mit ihm.
 */
export interface RemoteDocHead {
  athlete_id: string
  deleted_at: string | null
}

export interface DeletionPlan {
  dropLocally: string[]
  pushTombstones: { id: string; at: string }[]
  clearPending: string[]
  skipPull: Set<string>
}

export function planDeletions(remote: RemoteDocHead[], localIds: string[], pending: Record<string, string>): DeletionPlan {
  const local = new Set(localIds)
  const byId = new Map(remote.map((r) => [r.athlete_id, r]))
  const plan: DeletionPlan = { dropLocally: [], pushTombstones: [], clearPending: [], skipPull: new Set(Object.keys(pending)) }

  for (const r of remote) {
    if (!r.deleted_at) continue
    plan.skipPull.add(r.athlete_id)
    if (r.athlete_id in pending) plan.clearPending.push(r.athlete_id)
    else if (local.has(r.athlete_id)) plan.dropLocally.push(r.athlete_id)
  }
  for (const [id, at] of Object.entries(pending)) {
    const row = byId.get(id)
    if (!row) plan.clearPending.push(id)
    else if (!row.deleted_at) plan.pushTombstones.push({ id, at })
  }
  return plan
}
