# CLAUDE.md

KYDON — Leistungsdiagnostik als PWA für Athleten und Trainer.
Local-first (React 19, Vite, Tailwind 4, localStorage) mit Supabase-Backend.

Antworte dem Nutzer auf **Deutsch**. Code-Kommentare und Doku sind ebenfalls
Deutsch, im Stil der umgebenden Dateien.

## Zuerst lesen

- **[docs/architecture.md](docs/architecture.md)** — verbindlich, besonders:
  - §16 Zuständigkeiten: jede Aufgabe hat genau einen Ort
  - §17 Grenzen: was darf was importieren / aufrufen
  - §18 Datenflüsse
  - §19 Was nie brechen darf
  - §20 Wohin neuer Code gehört
  - §21 Wann anhalten und fragen
- [docs/prd.md](docs/prd.md) — was das Produkt können soll, Pakete, offene Punkte
- Themenseiten in `docs/` (Preise, Sicherheit, Sprachen, Push, Auslieferung …)

## Die harten Regeln (Kurzfassung von §19)

1. Geheimnisse nie im Client oder im Repo.
2. Schemaänderung = Migration in `src/lib/store/schema.ts` + Version +1.
3. Messen funktioniert ohne Netz.
4. Neue Tabelle = RLS in derselben Migration.
5. Freischaltungen schreibt nur der Server (`stripe-webhook`, `change-plan`).
6. Keine Referenzwerte ohne Quelle; keine Platzhalter-Normen.
7. „Besser/schlechter“ nur gegen den Messfehler (`src/domain/change.ts`).
8. Nie mitten am Testtag sperren.
9. Fachlogik nur in `src/domain` (rein, ohne React/Netz/Storage).
10. Jeder Oberflächentext in allen 8 Sprachen.

Müsste eine Aufgabe eine dieser Regeln brechen: **anhalten**, Konflikt
benennen, Folgen zeigen, kleinste regelkonforme Lösung vorschlagen (§21).

## Befehle

```bash
npm run dev                         # Entwicklung
npm run build                       # tsc -b && vite build
npm run lint                        # Typprüfung
npm run security                    # Typen, RLS-Prüfung, Geheimnissuche, npm audit
node scripts/checkLocale.mjs <lang> # Sprachdatei gegen Deutsch prüfen
npx playwright test --project=phone # Prüffälle (gegen den Produktionsbau)
npx playwright test tests/<datei>.spec.ts --project=phone
npm run mockups                     # Bildschirmaufnahmen, keine Prüfung
```

Vor jedem Commit: `npm run lint`, betroffene Prüffälle, bei Sprachtexten
`checkLocale`, bei Migrationen oder Edge Functions `npm run security`.

## Orientierung

| Wo | Was |
|---|---|
| `src/features/<bereich>` | Bildschirme |
| `src/domain` | reine Fachlogik |
| `src/data` | Kataloge: Tests, Sportarten, Referenzen, Preise |
| `src/lib/store` | lokaler Bestand, Schema, Migrationen |
| `src/lib/supabase` | Auth, Sync, Serverzugriffe |
| `src/i18n` | 8 Sprachen |
| `src/styles/theme.css` | Design-Tokens hell/dunkel |
| `supabase/migrations`, `supabase/functions` | Datenbank, Edge Functions |
| `tests/` | Playwright-Prüffälle |
| `landing/` | eigenständige Landingpage (Vite + three.js), eigener Bau |

## Arbeitsweise

- Erst suchen, ob es die Funktion, Store-Methode oder das UI-Element schon
  gibt; erweitern statt neu bauen.
- Kleine, geprüfte Schritte; keine neuen Bibliotheken ohne Rückfrage.
- Nutzerdaten, Preise, RLS und Rechtstexte nur nach Rückfrage ändern.
- Keine Modellnamen in Commits, Code oder Doku.
