import { useForgeStore } from '@/hooks/useForgeStore'
import type { GunSlot } from '@/lib/forgeApi'
import { AG_OVERRIDES } from './agOverrides'
import './forge.css'

// --- Grid layout constants (from EFTForge attachment-grid.js) ---
const GUN_COL = 7
const STOCK_COL = 10

const LEFT_ORDER = ['Receiver', 'Handguard', 'Catch', 'Barrel', 'Gas Block', 'Muzzle']
const TOP_MAP: Record<string, number> = { Scope: 8, Mount: 8, 'Rear Sight': 9 }
const BOTTOM_MAP: Record<string, number> = { Magazine: 8, 'Pistol Grip': 9 }
const BOTTOM_LEFT = new Set(['Bipod', 'Foregrip'])
const EXTRAS = new Set(['Grip', 'Shroud', 'Trigger', 'Chamber', 'Hammer'])

const SLOT_DISPLAY: Record<string, string> = {
  mod_pistol_grip: 'Pistol Grip', mod_pistol_grip_akms: 'Pistol Grip',
  mod_pistolgrip: 'Pistol Grip', mod_pistolgrip_000: 'Pistol Grip', mod_pistolgrip_001: 'Pistol Grip',
  mod_magazine: 'Magazine', mod_reciever: 'Receiver',
  mod_stock: 'Stock', mod_stock_000: 'Stock', mod_stock_001: 'Stock',
  mod_stock_002: 'Stock', mod_stock_akms: 'Stock', mod_stock_axis: 'Stock Axis',
  mod_barrel: 'Barrel', mod_barrel_000: 'Barrel', mod_handguard: 'Handguard', mod_muzzle: 'Muzzle',
  mod_gas_block: 'Gas Block', mod_scope: 'Scope', mod_scope_000: 'Scope', mod_scope_001: 'Scope',
  mod_scope_002: 'Scope', mod_scope_003: 'Scope',
  mod_mount: 'Mount', mod_mount_000: 'Mount', mod_mount_001: 'Mount', mod_mount_002: 'Mount',
  mod_mount_003: 'Mount', mod_mount_004: 'Mount', mod_mount_005: 'Mount', mod_mount_006: 'Mount',
  mod_sight_rear: 'Rear Sight', mod_sight_front: 'Front Sight',
  mod_charge: 'Ch. Handle', mod_charge_001: 'Ch. Handle', mod_foregrip: 'Foregrip',
  mod_bipod: 'Bipod', mod_tactical: 'Tactical', mod_tactical_000: 'Tactical', mod_tactical_001: 'Tactical',
  mod_tactical_002: 'Tactical', mod_tactical_003: 'Tactical', mod_tactical_004: 'Tactical',
  mod_tactical_005: 'Tactical', mod_tactical001: 'Tactical', mod_tactical002: 'Tactical',
  mod_tactical_2: 'Tactical', mod_launcher: 'Ubgl',
  mod_trigger: 'Trigger', mod_hammer: 'Hammer', mod_catch: 'Catch', mod_grip: 'Grip',
  mod_equipment: 'Equipment', mod_equipment_000: 'Equipment', mod_equipment_001: 'Equipment', mod_equipment_002: 'Equipment',
  mod_flashlight: 'Flashlight', mod_nvg: 'NVG',
}

const SLOT_DISPLAY_ZH: Record<string, string> = {
  'Pistol Grip': '握把', 'Magazine': '弹匣', 'Receiver': '机匣',
  'Stock': '枪托', 'Stock Axis': '枪托轴', 'Barrel': '枪管', 'Handguard': '护木',
  'Muzzle': '枪口', 'Gas Block': '导气管', 'Scope': '瞄具',
  'Mount': '导轨', 'Rear Sight': '后照门', 'Front Sight': '准星',
  'Ch. Handle': '拉机柄', 'Foregrip': '前握把', 'Bipod': '两脚架',
  'Tactical': '战术设备', 'Ubgl': '下挂', 'Trigger': '扳机',
  'Hammer': '击锤', 'Catch': '卡笋', 'Grip': '握把',
  'Equipment': '装备', 'Flashlight': '手电', 'NVG': '夜视仪',
}

const PLACEHOLDER_MAP: Record<string, string> = {
  Barrel: 'mod_barrel.png', Muzzle: 'mod_muzzle.png', Stock: 'mod_stock.png',
  Handguard: 'mod_handguard.png', Scope: 'mod_scope.png', 'Front Sight': 'mod_sight_front.png',
  'Rear Sight': 'mod_sight_rear.png', 'Pistol Grip': 'mod_pistol_grip.png',
  Magazine: 'mod_magazine.png', 'Gas Block': 'mod_gas_block.png', Foregrip: 'mod_foregrip.png',
  'Ch. Handle': 'mod_charge.png', Mount: 'mod_mount_000.png', Tactical: 'mod_tactical_000.png',
  Bipod: 'mod_bipod.png', Receiver: 'mod_reciever.png', Ubgl: 'mod_launcher.png',
  Trigger: 'mod_trigger.png', Hammer: 'mod_hammer.png', Catch: 'mod_catch.png',
}

interface VPos { col: number; vrow: number; extras: boolean }
interface FinalPos { col: number; row: number; extras: boolean }

interface GridSlotEntry {
  slot: GunSlot
  slotPath: string
  parentSlotPath?: string
  parentItemId?: string // The gun ID for top-level, or parent attachment ID for nested
}

function computeGridPositions(
  entries: GridSlotEntry[],
  gunId: string
): { positions: FinalPos[]; gunRow: number; totalRows: number } {
  const slotNames = entries.map(e => SLOT_DISPLAY[e.slot.name] || e.slot.name)
  const virtualPos: VPos[] = []
  const occupied = new Set<string>()

  // Pre-pass: reserve all fixed override positions
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry) continue
    const parentItemId = entry.parentItemId || gunId
    const overrideKey = `${entry.slot.id}@${parentItemId}`
    const ov = AG_OVERRIDES[overrideKey]
    if (ov && !ov.flexible) {
      occupied.add(`${ov.col},${ov.vrow}`)
    }
  }

  function placeAt(col: number, vrow: number): VPos {
    const key = `${col},${vrow}`
    if (!occupied.has(key)) { occupied.add(key); return { col, vrow, extras: false } }
    return { col: 0, vrow: 0, extras: true }
  }
  function placeUp(col: number, startVrow: number): VPos {
    for (let v = startVrow; v >= startVrow - 30; v--) { const r = placeAt(col, v); if (!r.extras) return r }
    return { col: 0, vrow: 0, extras: true }
  }
  function placeDown(col: number, startVrow: number): VPos {
    for (let v = startVrow; v <= startVrow + 30; v++) { const r = placeAt(col, v); if (!r.extras) return r }
    return { col: 0, vrow: 0, extras: true }
  }

  const allNames = new Set(slotNames)
  const leftQueue = LEFT_ORDER.filter(n => allNames.has(n))
  const leftColMap: Record<string, number> = {}
  leftQueue.forEach((name, i) => { leftColMap[name] = GUN_COL - 1 - i })

  let muzzleCol: number
  if (leftColMap['Muzzle'] != null) muzzleCol = leftColMap['Muzzle']
  else if (leftQueue.length > 0) {
    const outermostCol = leftColMap[leftQueue[leftQueue.length - 1] ?? ''] ?? GUN_COL
    muzzleCol = Math.max(1, outermostCol - 1)
  }
  else muzzleCol = GUN_COL - 1

  let tacticalCount = 0
  let bottomLeftVcol = GUN_COL
  // Track positions by slotPath for parent-relative placement
  const posBySlotPath = new Map<string, { col: number; vrow: number }>()

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry) continue
    const name = slotNames[i] || entry.slot.name

    // 1. Check manual override first
    const parentItemId = entry.parentItemId || gunId
    const overrideKey = `${entry.slot.id}@${parentItemId}`
    const ov = AG_OVERRIDES[overrideKey]
    if (ov) {
      if (ov.flexible) {
        // Flexible overrides use placeDown to find available position
        const r = placeDown(ov.col, ov.vrow)
        virtualPos.push(r)
        if (!r.extras && entry.slotPath) posBySlotPath.set(entry.slotPath, { col: r.col, vrow: r.vrow })
        continue
      }
      // Fixed override - use directly without collision check (already reserved)
      virtualPos.push({ col: ov.col, vrow: ov.vrow, extras: false })
      if (entry.slotPath) posBySlotPath.set(entry.slotPath, { col: ov.col, vrow: ov.vrow })
      continue
    }

    // 2. Automatic placement (matching original EFTForge fall-through behavior)
    // Name-based checks first for ALL slots; parent-relative as fallback
    let vPos: VPos | null = null
    const isBaseGunSlot = !entry.parentSlotPath

    if (EXTRAS.has(name)) {
      vPos = { col: 0, vrow: 0, extras: true }
    }

    // Left side queue (no isBaseGunSlot guard - matches original)
    if (!vPos && name in leftColMap) {
      const r = placeAt(leftColMap[name] ?? 0, 0)
      if (!r.extras) vPos = r
    }

    // Ch. Handle
    if (!vPos && name === 'Ch. Handle') {
      const primary = placeAt(STOCK_COL, -1)
      vPos = primary.extras ? placeAt(bottomLeftVcol--, 1) : primary
    }

    // Stock (base gun slot only)
    if (!vPos && name === 'Stock' && isBaseGunSlot) {
      vPos = placeAt(STOCK_COL, 0)
    }

    // Tactical (base gun slot only)
    if (!vPos && name === 'Tactical' && isBaseGunSlot) {
      tacticalCount++
      vPos = placeAt(GUN_COL, -tacticalCount)
    }

    // Top row: Scope, Mount, Rear Sight (base gun slot only)
    if (!vPos && name in TOP_MAP && isBaseGunSlot) {
      vPos = placeUp(TOP_MAP[name] ?? 8, -1)
    }

    // Bottom row: Magazine, Pistol Grip (base gun slot only)
    if (!vPos && name in BOTTOM_MAP && isBaseGunSlot) {
      vPos = placeDown(BOTTOM_MAP[name] ?? 8, 1)
    }

    // Bottom-left: Bipod, Foregrip (base gun slot only)
    if (!vPos && BOTTOM_LEFT.has(name) && isBaseGunSlot) {
      vPos = placeAt(bottomLeftVcol--, 1)
    }

    // Front Sight
    if (!vPos && name === 'Front Sight') {
      vPos = placeAt(muzzleCol, -1)
    }

    // Parent-relative placement (fallback for child slots whose name-based position was occupied)
    if (!vPos && entry.parentSlotPath) {
      const pPos = posBySlotPath.get(entry.parentSlotPath)
      if (pPos) {
        if (pPos.vrow < 0) {
          vPos = placeUp(pPos.col, pPos.vrow - 1)
        } else if (pPos.vrow > 0) {
          vPos = placeDown(pPos.col, pPos.vrow + 1)
        } else {
          if (pPos.col < GUN_COL) {
            if (name === 'Mount') vPos = placeDown(Math.max(1, pPos.col - 1), 1)
            else if (name === 'Scope' || name === 'Tactical') vPos = placeUp(pPos.col, -1)
            else vPos = placeDown(pPos.col, 1)
          } else {
            vPos = placeDown(pPos.col, 1)
          }
        }
      }
    }

    // Everything else: extras
    if (!vPos) {
      vPos = { col: 0, vrow: 0, extras: true }
    }

    virtualPos.push(vPos)
    if (!vPos.extras && entry.slotPath) posBySlotPath.set(entry.slotPath, { col: vPos.col, vrow: vPos.vrow })
  }

  const validVrows = virtualPos.filter(v => !v.extras).map(v => v.vrow)
  const minVrow = validVrows.length > 0 ? Math.min(...validVrows, 0) : 0
  const maxVrow = validVrows.length > 0 ? Math.max(...validVrows, 0) : 0
  const totalRows = maxVrow - minVrow + 1
  const gunRow = 0 - minVrow + 1

  const positions: FinalPos[] = virtualPos.map(vp => {
    if (vp.extras) return { col: 0, row: 0, extras: true }
    return { col: vp.col, row: vp.vrow - minVrow + 1, extras: false }
  })

  return { positions, gunRow, totalRows }
}

interface AttachmentGridProps {
  slots: GridSlotEntry[]
  activeSlotPath?: string | null
  highlightItemId?: string | null
  onSlotClick: (slot: GunSlot, parentSlotPath?: string) => void
  onSlotRemove?: (slotPath: string) => void
}

export function AttachmentGrid({ slots, activeSlotPath, highlightItemId, onSlotClick, onSlotRemove }: AttachmentGridProps) {
  const { gunData, gunId, installedAttachments } = useForgeStore()
  if (!gunData) return null

  // Add parentItemId to each entry
  const entriesWithParent: GridSlotEntry[] = slots.map(s => ({
    ...s,
    parentItemId: s.parentSlotPath ? (installedAttachments[s.parentSlotPath] || undefined) : (gunId || undefined),
  }))

  const displayNames = entriesWithParent.map(e => SLOT_DISPLAY[e.slot.name] || e.slot.name)
  const { positions, gunRow, totalRows } = computeGridPositions(entriesWithParent, gunId || '')

  const gridSlots = slots.map((entry, i) => ({
    entry,
    displayZh: SLOT_DISPLAY_ZH[displayNames[i] ?? ''] ?? displayNames[i] ?? entry.slot.name,
    pos: positions[i] ?? { col: 0, row: 0, extras: true },
  })).filter(s => !s.pos.extras)

  const extraSlots = slots.map((entry, i) => ({
    entry,
    displayZh: SLOT_DISPLAY_ZH[displayNames[i] ?? ''] ?? displayNames[i] ?? entry.slot.name,
  })).filter((_, i) => positions[i]?.extras)

  return (
    <div className="attachment-grid-wrapper">
      <div className="attachment-grid" style={{ gridTemplateRows: `repeat(${totalRows}, 66px)` }}>
        {/* Gun cell */}
        <div className="ag-gun-cell" style={{ gridColumn: '7 / 10', gridRow: String(gunRow) }}>
          {gunData.image && <img src={gunData.image} alt={gunData.name} />}
          <div className="ag-label ag-gun-label">{gunData.shortName}</div>
        </div>

        {/* Grid slots */}
        {gridSlots.map(({ entry, displayZh, pos }) => (
          <SlotCell
            key={entry.slotPath}
            slot={entry.slot}
            displayZh={displayZh}
            pos={pos}
            installedItemId={installedAttachments[entry.slotPath]}
            isActive={activeSlotPath === entry.slotPath}
            highlightItemId={highlightItemId}
            onClick={() => onSlotClick(entry.slot, entry.parentSlotPath)}
            onRemove={onSlotRemove ? () => onSlotRemove(entry.slotPath) : undefined}
          />
        ))}
      </div>

      {/* Extras row */}
      {extraSlots.length > 0 && (
        <div className="ag-extras">
          {extraSlots.map(({ entry, displayZh }) => (
            <SlotCell
              key={entry.slotPath}
              slot={entry.slot}
              displayZh={displayZh}
              pos={{ col: 0, row: 0, extras: true }}
              installedItemId={installedAttachments[entry.slotPath]}
              isActive={activeSlotPath === entry.slotPath}
              highlightItemId={highlightItemId}
              onClick={() => onSlotClick(entry.slot, entry.parentSlotPath)}
              onRemove={onSlotRemove ? () => onSlotRemove(entry.slotPath) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SlotCell({ slot, displayZh, pos, installedItemId, isActive, highlightItemId, onClick, onRemove }: {
  slot: GunSlot; displayZh: string; pos: FinalPos; installedItemId?: string; isActive?: boolean; highlightItemId?: string | null; onClick: () => void; onRemove?: () => void
}) {
  const installedItem = installedItemId ? slot.allowedItems.find(a => a.id === installedItemId) : null
  const gridStyle: React.CSSProperties = pos.extras ? {} : { gridColumn: String(pos.col), gridRow: String(pos.row) }
  const phFile = PLACEHOLDER_MAP[slot.name] || PLACEHOLDER_MAP[SLOT_DISPLAY[slot.name] || '']

  return (
    <div
      className={`tree-slot ag-cell${installedItem ? ' has-item' : ''}${isActive ? ' active-slot' : ''}${installedItemId && highlightItemId === installedItemId ? ' conflict-flash' : ''}`}
      style={gridStyle}
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); if (installedItem && onRemove) onRemove() }}
    >
      <div className={`tree-slot-inner${installedItem ? ' swipe-removable' : ''}`}>
        <div className="tree-slot-item">
          {installedItem ? (
            <>
              {installedItem.image && <img className="ag-icon" src={installedItem.image} alt="" />}
              <div className="slot-shortname">{installedItem.shortName}</div>
            </>
          ) : (
            phFile ? (
              <img className="slot-placeholder-img ag-empty" src={new URL(`./assets/images/slot_placeholders/${phFile}`, import.meta.url).href} alt="" />
            ) : (
              <div className="empty-slot">+</div>
            )
          )}
        </div>
      </div>
      <div className="ag-label">{displayZh}</div>
    </div>
  )
}
