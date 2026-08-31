import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EQUIPMENT, type EquipmentId } from '@/data/equipment'
import type { AppLocale } from '@/types/domain'

const STORAGE_KEY = 'baseline.equipment'

/**
 * Was jemand an Ausrüstung hat.
 *
 * Bewusst neben dem Datenbestand gehalten und nicht im Athletenprofil: es
 * ist eine Eigenschaft des Ortes, nicht des Menschen. Wer im Verein misst
 * und zu Hause noch einmal, hat zwei Ausstattungen und dasselbe Profil.
 * Ausserdem ist es keine personenbezogene Angabe (§50) — sie gehört nicht
 * in eine Ausleitung des Athleten.
 */
export function readOwnedEquipment(): Set<EquipmentId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    const known = new Set(EQUIPMENT.map((item) => item.id))
    return new Set(parsed.filter((id): id is EquipmentId => known.has(id as EquipmentId)))
  } catch {
    // Kein Speicher, kein Filter — der Katalog bleibt vollständig.
    return new Set()
  }
}

function writeOwnedEquipment(owned: Set<EquipmentId>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...owned]))
  } catch {
    // Ohne Speicher gilt die Auswahl nur für diese Sitzung. Das ist besser
    // als ein Absturz beim Antippen eines Hakens.
  }
}

interface EquipmentFilterProps {
  owned: Set<EquipmentId>
  onChange: (owned: Set<EquipmentId>) => void
  locale: AppLocale
}

export function EquipmentFilter({ owned, onChange, locale }: EquipmentFilterProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    writeOwnedEquipment(owned)
  }, [owned])

  const toggle = (id: EquipmentId) => {
    const next = new Set(owned)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  return (
    <Panel className="mb-4">
      <PanelHeader
        title={t('tests.equipmentFilter')}
        subtitle={t('tests.equipmentFilterHint')}
        action={
          <Button variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? t('tests.equipmentHide') : t('tests.equipmentShow')}
          </Button>
        }
      />
      <div className="px-4 py-3">
        <p className="text-[12px] text-ink-muted">
          {t('tests.equipmentSelected', { count: owned.size, total: EQUIPMENT.length })}
        </p>
        {open && (
          <>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {EQUIPMENT.map((item) => (
                <li key={item.id} className="min-w-0">
                  <label className="flex min-h-11 items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0"
                      checked={owned.has(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                    <span className="min-w-0">{item.name[locale]}</span>
                  </label>
                </li>
              ))}
            </ul>
            {owned.size > 0 && (
              <Button variant="ghost" className="mt-2" onClick={() => onChange(new Set())}>
                {t('tests.equipmentClear')}
              </Button>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}
