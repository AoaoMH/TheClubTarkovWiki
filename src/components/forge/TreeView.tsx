import { useForgeStore } from '@/hooks/useForgeStore'
import type { GunSlot } from '@/lib/forgeApi'
import './forge.css'

const SLOT_DISPLAY_ZH: Record<string, string> = {
  mod_pistol_grip: '握把', mod_magazine: '弹匣', mod_reciever: '机匣',
  mod_stock: '枪托', mod_stock_000: '枪托', mod_stock_001: '枪托',
  mod_barrel: '枪管', mod_handguard: '护木', mod_muzzle: '枪口',
  mod_gas_block: '导气管', mod_scope: '瞄具', mod_scope_000: '瞄具',
  mod_scope_001: '瞄具', mod_mount: '导轨', mod_mount_000: '导轨',
  mod_mount_001: '导轨', mod_mount_002: '导轨',
  mod_sight_rear: '后照门', mod_sight_front: '准星',
  mod_charge: '拉机柄', mod_charge_001: '拉机柄',
  mod_foregrip: '前握把', mod_bipod: '两脚架',
  mod_tactical_000: '战术设备', mod_tactical_001: '战术设备',
  mod_tactical_002: '战术设备', mod_launcher: '下挂',
  mod_trigger: '扳机', mod_hammer: '击锤', mod_catch: '卡笋', mod_grip: '握把',
}

const PLACEHOLDER_MAP: Record<string, string> = {
  Barrel: 'mod_barrel.png', Muzzle: 'mod_muzzle.png', Stock: 'mod_stock.png',
  Handguard: 'mod_handguard.png', Scope: 'mod_scope.png', 'Front Sight': 'mod_sight_front.png',
  'Rear Sight': 'mod_sight_rear.png', 'Pistol Grip': 'mod_pistol_grip.png',
  Magazine: 'mod_magazine.png', 'Gas Block': 'mod_gas_block.png', Foregrip: 'mod_foregrip.png',
  'Ch. Handle': 'mod_charge.png', Mount: 'mod_mount_000.png', Tactical: 'mod_tactical_000.png',
  Bipod: 'mod_bipod.png', Receiver: 'mod_reciever.png', Ubgl: 'mod_launcher.png',
}

const SLOT_DISPLAY: Record<string, string> = {
  mod_pistol_grip: 'Pistol Grip', mod_magazine: 'Magazine', mod_reciever: 'Receiver',
  mod_stock: 'Stock', mod_stock_000: 'Stock', mod_stock_001: 'Stock', mod_barrel: 'Barrel',
  mod_handguard: 'Handguard', mod_muzzle: 'Muzzle', mod_gas_block: 'Gas Block',
  mod_scope: 'Scope', mod_scope_000: 'Scope', mod_scope_001: 'Scope',
  mod_mount: 'Mount', mod_mount_000: 'Mount', mod_mount_001: 'Mount', mod_mount_002: 'Mount',
  mod_sight_rear: 'Rear Sight', mod_sight_front: 'Front Sight',
  mod_charge: 'Ch. Handle', mod_charge_001: 'Ch. Handle', mod_foregrip: 'Foregrip',
  mod_bipod: 'Bipod', mod_tactical_000: 'Tactical', mod_tactical_001: 'Tactical',
  mod_tactical_002: 'Tactical', mod_launcher: 'Ubgl',
  mod_trigger: 'Trigger', mod_hammer: 'Hammer', mod_catch: 'Catch', mod_grip: 'Grip',
}

interface TreeSlotEntry {
  slot: GunSlot
  slotPath: string
  parentSlotPath?: string
}

interface TreeViewProps {
  slots: TreeSlotEntry[]
  activeSlotPath?: string | null
  onSlotClick: (slot: GunSlot, parentSlotPath?: string) => void
  onSlotRemove?: (slotPath: string) => void
}

interface TreeNode {
  entry: TreeSlotEntry
  children: TreeNode[]
  depth: number
}

export function TreeView({ slots, activeSlotPath, onSlotClick, onSlotRemove }: TreeViewProps) {
  const { installedAttachments, gunData } = useForgeStore()
  if (!gunData) return null

  // Build tree structure from flat slot list
  const buildTree = (): TreeNode[] => {
    const topLevel = slots.filter(s => !s.parentSlotPath)
    const result: TreeNode[] = []
    for (const entry of topLevel) {
      result.push(buildNode(entry, 0))
    }
    return result
  }

  const buildNode = (entry: TreeSlotEntry, depth: number): TreeNode => {
    const childSlots = slots.filter(s => s.parentSlotPath === entry.slotPath)
    return {
      entry,
      depth,
      children: childSlots.map(c => buildNode(c, depth + 1)),
    }
  }

  const tree = buildTree()

  return (
    <div className="tree-content">
      {tree.map(node => (
        <TreeNodeItem
          key={node.entry.slotPath}
          node={node}
          installedAttachments={installedAttachments}
          activeSlotPath={activeSlotPath}
          allSlots={slots}
          onSlotClick={onSlotClick}
          onSlotRemove={onSlotRemove}
        />
      ))}
    </div>
  )
}

function TreeNodeItem({ node, installedAttachments, activeSlotPath, allSlots, onSlotClick, onSlotRemove }: {
  node: TreeNode
  installedAttachments: Record<string, string>
  activeSlotPath?: string | null
  allSlots: TreeSlotEntry[]
  onSlotClick: (slot: GunSlot, parentSlotPath?: string) => void
  onSlotRemove?: (slotPath: string) => void
}) {
  const { entry, depth, children } = node
  const installedItemId = installedAttachments[entry.slotPath]
  const installedItem = installedItemId ? entry.slot.allowedItems.find(a => a.id === installedItemId) : null
  const hasChildren = children.length > 0
  const isActive = activeSlotPath === entry.slotPath
  const slotNameZh = SLOT_DISPLAY_ZH[entry.slot.name] || entry.slot.name
  const displayName = SLOT_DISPLAY[entry.slot.name] || entry.slot.name
  const phFile = PLACEHOLDER_MAP[displayName]

  return (
    <>
      <div
        className={`tree-slot${isActive ? ' active-slot' : ''} depth-${depth}`}
        data-slot-id={entry.slot.id}
        data-depth={depth}
        data-slot-name={entry.slot.name}
        onClick={() => onSlotClick(entry.slot, entry.parentSlotPath)}
        onContextMenu={(e) => { e.preventDefault(); if (installedItem && onSlotRemove) onSlotRemove(entry.slotPath) }}
      >
        <div className="tree-slot-inner">
          <div className={`tree-slot-name${hasChildren ? ' collapsible' : ''}`}>
            {hasChildren ? '▼' : ''} {slotNameZh}
          </div>
          <div className="tree-slot-item">
            {installedItem ? (
              <div className="tree-slot-icon">
                {installedItem.image && <img src={installedItem.image} alt="" />}
                <div className="slot-shortname">{installedItem.shortName}</div>
              </div>
            ) : (
              phFile ? (
                <img className="slot-placeholder-img" src={new URL(`./assets/images/slot_placeholders/${phFile}`, import.meta.url).href} alt="" />
              ) : (
                <div className="empty-slot">+</div>
              )
            )}
          </div>
        </div>
      </div>
      {hasChildren && (
        <div className="tree-children">
          {children.map(child => (
            <TreeNodeItem
              key={child.entry.slotPath}
              node={child}
              installedAttachments={installedAttachments}
              activeSlotPath={activeSlotPath}
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
