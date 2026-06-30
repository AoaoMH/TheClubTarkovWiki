import type { WikiItem, WeaponProps, ModProps, SlotInfo } from '../types.js'

/**
 * ForgeItem — 改枪工作台专用物品数据
 * 仅包含改枪逻辑所需字段，从 WikiItem 精简提取
 */
export interface ForgeItem {
  id: string
  name: { zh: string; en: string }
  shortName: { zh: string; en: string }
  image: string | null
  weight: number
  category: string
  typeName: string
  /** 武器基础属性（仅武器有） */
  weapon?: WeaponProps
  /** 配件修正属性（仅配件有） */
  mod?: ModProps
  /** 插槽列表（含兼容物品ID） */
  slots: SlotInfo[]
  /** 冲突物品ID列表（来自 SPT ConflictingItems） */
  conflictingItems: string[]
  /** 瞄准中心偏差（影响 MOA 精度计算，来自 SPT CenterOfImpact） */
  centerOfImpact: number | null
  /** 弹药属性（仅弹药有） */
  ammo?: AmmoProps
  /** 弹匣容量（仅弹匣有，来自 SPT Cartridges._max_count） */
  magazineCapacity?: number
}

export interface AmmoProps {
  caliber: string
  damage: number
  penetrationPower: number
  armorDamage: number
  projectileCount: number
  initialSpeed: number
  ballisticCoeficient: number
  tracer: boolean
  tracerColor: string | null
}

export interface ForgeData {
  items: Record<string, ForgeItem>
  /** 工厂预设: weaponId → [{slotName, itemId}] */
  presets: PresetMap
  generatedAt: string
}

export interface FactoryPreset {
  slotName: string  // SPT slot name (e.g. "mod_pistol_grip") or nested path (e.g. "mod_reciever:mod_barrel")
  itemId: string
}

export type PresetMap = Record<string, FactoryPreset[]>

/**
 * 从 WikiItem 数组生成 forge 专用数据
 * 提取改枪所需字段：基础信息、武器/配件属性、插槽、冲突
 */
export function generateForgeData(wikiItems: WikiItem[], presets: PresetMap = {}): ForgeData {
  const items: Record<string, ForgeItem> = {}

  let weaponCount = 0
  let modCount = 0
  let withSlotsCount = 0
  let withConflictsCount = 0

  for (const wiki of wikiItems) {
    // 提取冲突物品列表
    const rawConflicts = wiki.properties._raw?.ConflictingItems
    const conflictingItems: string[] = Array.isArray(rawConflicts)
      ? (rawConflicts as string[])
          .map(id => (typeof id === 'string' ? id.trim() : ''))
          .filter(id => id.length > 0)
      : []

    // 提取瞄准中心偏差（用于 MOA 精度计算）
    const rawCOI = wiki.properties._raw?.CenterOfImpact
    const centerOfImpact = typeof rawCOI === 'number' ? rawCOI : null

    // 提取弹药属性
    const raw = wiki.properties._raw
    const ammoCaliber = raw?.Caliber || raw?.caliber
    const ammoDamage = raw?.Damage
    let ammo: AmmoProps | undefined
    if (typeof ammoCaliber === 'string' && typeof ammoDamage === 'number') {
      ammo = {
        caliber: ammoCaliber,
        damage: ammoDamage,
        penetrationPower: typeof raw?.PenetrationPower === 'number' ? raw.PenetrationPower : 0,
        armorDamage: typeof raw?.ArmorDamage === 'number' ? raw.ArmorDamage : 0,
        projectileCount: typeof raw?.ProjectileCount === 'number' ? raw.ProjectileCount : 1,
        initialSpeed: typeof raw?.InitialSpeed === 'number' ? raw.InitialSpeed : 0,
        ballisticCoeficient: typeof raw?.BallisticCoeficient === 'number' ? raw.BallisticCoeficient : 0,
        tracer: raw?.Tracer === true,
        tracerColor: typeof raw?.TracerColor === 'string' ? raw.TracerColor : null,
      }
    }

    // 提取弹匣容量
    const rawCartridges = raw?.Cartridges
    const magazineCapacity = Array.isArray(rawCartridges) && rawCartridges[0]?._max_count
      ? rawCartridges[0]._max_count as number : undefined

    const forgeItem: ForgeItem = {
      id: wiki.id,
      name: wiki.common.name,
      shortName: wiki.common.shortName,
      image: wiki.image,
      weight: wiki.common.weight,
      category: wiki.category,
      typeName: wiki.typeName,
      weapon: wiki.properties.weapon,
      mod: wiki.properties.mod,
      slots: wiki.slots,
      conflictingItems,
      centerOfImpact,
      ammo,
      magazineCapacity,
    }

    items[wiki.id] = forgeItem

    // 统计
    if (forgeItem.weapon) weaponCount++
    if (forgeItem.mod) modCount++
    if (forgeItem.slots.length > 0) withSlotsCount++
    if (conflictingItems.length > 0) withConflictsCount++
  }

  console.log(`[forge] Generated ${Object.keys(items).length} forge items`)
  console.log(`[forge]   Weapons: ${weaponCount}`)
  console.log(`[forge]   Mods: ${modCount}`)
  console.log(`[forge]   Items with slots: ${withSlotsCount}`)
  console.log(`[forge]   Items with conflicts: ${withConflictsCount}`)
  console.log(`[forge]   Factory presets: ${Object.keys(presets).length} weapons`)

  return {
    items,
    presets,
    generatedAt: new Date().toISOString(),
  }
}
