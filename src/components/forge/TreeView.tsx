import { useForgeStore } from '@/hooks/useForgeStore'
import type { GunSlot } from '@/lib/forgeApi'
import './forge.css'

const SLOT_DISPLAY_ZH: Record<string, string> = {
  mod_pistol_grip: '握把',
  mod_pistol_grip_akms: '握把',
  mod_pistolgrip: '握把',
  mod_pistolgrip_000: '握把',
  mod_pistolgrip_001: '握把',
  mod_magazine: '弹匣',
  mod_reciever: '机匣',
  mod_stock: '枪托',
  mod_stock_000: '枪托',
  mod_stock_001: '枪托',
  mod_stock_002: '枪托',
  mod_stock_akms: '枪托',
  mod_stock_axis: '枪托轴',
  mod_barrel: '枪管',
  mod_barrel_000: '枪管',
  mod_handguard: '护木',
  mod_muzzle: '枪口',
  mod_gas_block: '导气管',
  mod_scope: '瞄具',
  mod_scope_000: '瞄具',
  mod_scope_001: '瞄具',
  mod_scope_002: '瞄具',
  mod_scope_003: '瞄具',
  mod_mount: '导轨',
  mod_mount_000: '导轨',
  mod_mount_001: '导轨',
  mod_mount_002: '导轨',
  mod_mount_003: '导轨',
  mod_mount_004: '导轨',
  mod_mount_005: '导轨',
  mod_mount_006: '导轨',
  mod_sight_rear: '后照门',
  mod_sight_front: '准星',
  mod_charge: '拉机柄',
  mod_charge_001: '拉机柄',
  mod_foregrip: '前握把',
  mod_bipod: '两脚架',
  mod_tactical: '战术设备',
  mod_tactical_000: '战术设备',
  mod_tactical_001: '战术设备',
  mod_tactical_002: '战术设备',
  mod_tactical_003: '战术设备',
  mod_tactical_004: '战术设备',
  mod_tactical_005: '战术设备',
  mod_tactical001: '战术设备',
  mod_tactical002: '战术设备',
  mod_tactical_2: '战术设备',
  mod_launcher: '下挂',
  mod_trigger: '扳机',
  mod_hammer: '击锤',
  mod_catch: '卡笋',
  mod_grip: '握把',
  mod_equipment: '装备',
  mod_equipment_000: '装备',
  mod_equipment_001: '装备',
  mod_equipment_002: '装备',
  mod_flashlight: '手电',
  mod_nvg: '夜视仪',
}

const PLACEHOLDER_MAP: Record<string, string> = {
  Barrel: 'mod_barrel.png',
  Muzzle: 'mod_muzzle.png',
  Stock: 'mod_stock.png',
  Handguard: 'mod_handguard.png',
  Scope: 'mod_scope.png',
  'Front Sight': 'mod_sight_front.png',
  'Rear Sight': 'mod_sight_rear.png',
  'Pistol Grip': 'mod_pistol_grip.png',
  Magazine: 'mod_magazine.png',
  'Gas Block': 'mod_gas_block.png',
  Foregrip: 'mod_foregrip.png',
  'Ch. Handle': 'mod_charge.png',
  Mount: 'mod_mount_000.png',
  Tactical: 'mod_tactical_000.png',
  Bipod: 'mod_bipod.png',
  Receiver: 'mod_reciever.png',
  Ubgl: 'mod_launcher.png',
}

const SLOT_DISPLAY: Record<string, string> = {
  mod_pistol_grip: 'Pistol Grip',
  mod_pistol_grip_akms: 'Pistol Grip',
  mod_pistolgrip: 'Pistol Grip',
  mod_pistolgrip_000: 'Pistol Grip',
  mod_pistolgrip_001: 'Pistol Grip',
  mod_magazine: 'Magazine',
  mod_reciever: 'Receiver',
  mod_stock: 'Stock',
  mod_stock_000: 'Stock',
  mod_stock_001: 'Stock',
  mod_stock_002: 'Stock',
  mod_stock_akms: 'Stock',
  mod_stock_axis: 'Stock Axis',
  mod_barrel: 'Barrel',
  mod_barrel_000: 'Barrel',
  mod_handguard: 'Handguard',
  mod_muzzle: 'Muzzle',
  mod_gas_block: 'Gas Block',
  mod_scope: 'Scope',
  mod_scope_000: 'Scope',
  mod_scope_001: 'Scope',
  mod_scope_002: 'Scope',
  mod_scope_003: 'Scope',
  mod_mount: 'Mount',
  mod_mount_000: 'Mount',
  mod_mount_001: 'Mount',
  mod_mount_002: 'Mount',
  mod_mount_003: 'Mount',
  mod_mount_004: 'Mount',
  mod_mount_005: 'Mount',
  mod_mount_006: 'Mount',
  mod_sight_rear: 'Rear Sight',
  mod_sight_front: 'Front Sight',
  mod_charge: 'Ch. Handle',
  mod_charge_001: 'Ch. Handle',
  mod_foregrip: 'Foregrip',
  mod_bipod: 'Bipod',
  mod_tactical: 'Tactical',
  mod_tactical_000: 'Tactical',
  mod_tactical_001: 'Tactical',
  mod_tactical_002: 'Tactical',
  mod_tactical_003: 'Tactical',
  mod_tactical_004: 'Tactical',
  mod_tactical_005: 'Tactical',
  mod_tactical001: 'Tactical',
  mod_tactical002: 'Tactical',
  mod_tactical_2: 'Tactical',
  mod_launcher: 'Ubgl',
  mod_trigger: 'Trigger',
  mod_hammer: 'Hammer',
  mod_catch: 'Catch',
  mod_grip: 'Grip',
  mod_equipment: 'Equipment',
  mod_equipment_000: 'Equipment',
  mod_equipment_001: 'Equipment',
  mod_equipment_002: 'Equipment',
  mod_flashlight: 'Flashlight',
  mod_nvg: 'NVG',
}

interface TreeSlotEntry {
  slot: GunSlot
  slotPath: string
  parentSlotPath?: string
}

interface TreeViewProps {
  slots: TreeSlotEntry[]
  activeSlotPath?: string | null
  highlightItemId?: string | null
  onSlotClick: (slot: GunSlot, parentSlotPath?: string) => void
  onSlotRemove?: (slotPath: string) => void
}

interface TreeNode {
  entry: TreeSlotEntry
  children: TreeNode[]
  depth: number
}

export function TreeView({
  slots,
  activeSlotPath,
  highlightItemId,
  onSlotClick,
  onSlotRemove,
}: TreeViewProps) {
  const { installedAttachments, gunData } = useForgeStore()
  if (!gunData) return null

  // Build tree structure from flat slot list
  const buildTree = (): TreeNode[] => {
    const topLevel = slots.filter((s) => !s.parentSlotPath)
    const result: TreeNode[] = []
    for (const entry of topLevel) {
      result.push(buildNode(entry, 0))
    }
    return result
  }

  const buildNode = (entry: TreeSlotEntry, depth: number): TreeNode => {
    const childSlots = slots.filter((s) => s.parentSlotPath === entry.slotPath)
    return {
      entry,
      depth,
      children: childSlots.map((c) => buildNode(c, depth + 1)),
    }
  }

  const tree = buildTree()

  return (
    <div className="tree-content">
      {tree.map((node) => (
        <TreeNodeItem
          key={node.entry.slotPath}
          node={node}
          installedAttachments={installedAttachments}
          activeSlotPath={activeSlotPath}
          highlightItemId={highlightItemId}
          allSlots={slots}
          onSlotClick={onSlotClick}
          onSlotRemove={onSlotRemove}
        />
      ))}
    </div>
  )
}

function TreeNodeItem({
  node,
  installedAttachments,
  activeSlotPath,
  highlightItemId,
  allSlots,
  onSlotClick,
  onSlotRemove,
}: {
  node: TreeNode
  installedAttachments: Record<string, string>
  activeSlotPath?: string | null
  highlightItemId?: string | null
  allSlots: TreeSlotEntry[]
  onSlotClick: (slot: GunSlot, parentSlotPath?: string) => void
  onSlotRemove?: (slotPath: string) => void
}) {
  const { entry, depth, children } = node
  const installedItemId = installedAttachments[entry.slotPath]
  const installedItem = installedItemId
    ? entry.slot.allowedItems.find((a) => a.id === installedItemId)
    : null
  const hasChildren = children.length > 0
  const isActive = activeSlotPath === entry.slotPath
  const slotNameZh = SLOT_DISPLAY_ZH[entry.slot.name] || entry.slot.name
  const displayName = SLOT_DISPLAY[entry.slot.name] || entry.slot.name
  const phFile = PLACEHOLDER_MAP[displayName]

  return (
    <>
      <div
        className={`tree-slot${isActive ? ' active-slot' : ''}${installedItemId && highlightItemId === installedItemId ? ' conflict-flash' : ''} depth-${depth}`}
        data-slot-id={entry.slot.id}
        data-depth={depth}
        data-slot-name={entry.slot.name}
        onClick={() => onSlotClick(entry.slot, entry.parentSlotPath)}
        onContextMenu={(e) => {
          e.preventDefault()
          if (installedItem && onSlotRemove) onSlotRemove(entry.slotPath)
        }}
      >
        <div className="tree-slot-inner">
          <div className={`tree-slot-name${hasChildren ? ' collapsible' : ''}`}>
            {hasChildren ? '▼' : ''} {slotNameZh}
          </div>
          <div className="tree-slot-item">
            {installedItem ? (
              <div className="tree-slot-icon">
                {installedItem.image && (
                  <img
                    src={installedItem.image}
                    alt=""
                    ref={(el) => {
                      if (el?.complete) el.classList.add('loaded')
                    }}
                    onLoad={(e) => e.currentTarget.classList.add('loaded')}
                  />
                )}
                <div className="slot-shortname">{installedItem.shortName}</div>
              </div>
            ) : phFile ? (
              <img
                className="slot-placeholder-img"
                src={
                  new URL(
                    `./assets/images/slot_placeholders/${phFile}`,
                    import.meta.url,
                  ).href
                }
                alt=""
              />
            ) : (
              <div className="empty-slot">+</div>
            )}
          </div>
        </div>
      </div>
      {hasChildren && (
        <div className="tree-children">
          {children.map((child) => (
            <TreeNodeItem
              key={child.entry.slotPath}
              node={child}
              installedAttachments={installedAttachments}
              activeSlotPath={activeSlotPath}
              highlightItemId={highlightItemId}
              allSlots={allSlots}
              onSlotClick={onSlotClick}
              onSlotRemove={onSlotRemove}
            />
          ))}
        </div>
      )}
    </>
  )
}
