import { useState, useEffect, useMemo } from 'react'

// These types mirror the generator output types
export interface LocalizedText {
  zh: string
  en: string
}

export interface HealthEffect {
  type: string
  value?: number
  cost?: number
  delay?: number
  duration?: number
}

export interface StimBuff {
  buffType: string
  skillName: string
  value: number
  delay: number
  duration: number
  chance: number
}

export interface ItemEffects {
  healthEffects: HealthEffect[]
  damageEffects: HealthEffect[]
  stimBuffs: StimBuff[]
}

export interface WikiItem {
  id: string
  typeName: string
  category: string
  parentTypeChain: string[]
  handbook: {
    categoryId: string | null
    price: number
  }
  common: {
    name: LocalizedText
    shortName: LocalizedText
    description: LocalizedText
    weight: number
    width: number
    height: number
    rarity: string
    backgroundColor: string
  }
  properties: {
    weapon?: Record<string, unknown>
    ammo?: Record<string, unknown>
    armor?: Record<string, unknown>
    medical?: {
      medEffectType: string
      medUseTime: number
      maxHpResource: number
      hpResourceRate: number
      effects: ItemEffects
    }
    mod?: Record<string, unknown>
    foodDrink?: {
      useTime: number
      effects: ItemEffects
    }
    _raw?: Record<string, unknown>
  }
  slots: Array<{
    name: string
    id: string
    required: boolean
    filter: string[]
  }>
  image: string | null
  isMod: boolean
}

export interface WikiCategory {
  id: string
  parentId: string | null
  name: LocalizedText
  icon: string
  order: number
  itemCount: number
}

interface DataStore {
  items: WikiItem[]
  categories: WikiCategory[]
  loading: boolean
}

let cachedData: DataStore | null = null

export function useItems() {
  const [data, setData] = useState<DataStore>(
    cachedData || { items: [], categories: [], loading: true }
  )

  useEffect(() => {
    if (cachedData) {
      setData(cachedData)
      return
    }

    async function loadData() {
      try {
        const [itemsRes, categoriesRes] = await Promise.all([
          fetch('/data/items.json'),
          fetch('/data/categories.json'),
        ])
        const items: WikiItem[] = await itemsRes.json()
        const categories: WikiCategory[] = await categoriesRes.json()
        const result = { items, categories, loading: false }
        cachedData = result
        setData(result)
      } catch (e) {
        console.error('Failed to load data:', e)
        setData({ items: [], categories: [], loading: false })
      }
    }
    loadData()
  }, [])

  return data
}

export function useSearch(items: WikiItem[], lang: 'zh' | 'en') {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()
    return items.filter(item => {
      const name = item.common.name[lang].toLowerCase()
      const shortName = item.common.shortName[lang].toLowerCase()
      return name.includes(q) || shortName.includes(q)
    }).slice(0, 50) // Limit results
  }, [query, items, lang])

  return { query, setQuery, results }
}

export function useCategoryTree(categories: WikiCategory[]) {
  return useMemo(() => {
    const rootCategories = categories.filter(c => !c.parentId)
    const childMap = new Map<string, WikiCategory[]>()

    for (const cat of categories) {
      if (cat.parentId) {
        const children = childMap.get(cat.parentId) || []
        children.push(cat)
        childMap.set(cat.parentId, children)
      }
    }

    // Sort by order
    for (const [, children] of childMap) {
      children.sort((a, b) => a.order - b.order)
    }
    rootCategories.sort((a, b) => a.order - b.order)

    return { rootCategories, childMap }
  }, [categories])
}

export function useItemsByCategory(items: WikiItem[], categoryId: string | null) {
  return useMemo(() => {
    if (!categoryId) return items
    return items.filter(item => item.handbook.categoryId === categoryId)
  }, [items, categoryId])
}

// Type name Chinese translation (from game locale where available)
export const TYPE_NAME_ZH: Record<string, string> = {
  // === From game locale ===
  AssaultRifle: '突击步枪', Pistol: '手枪', Shotgun: '霰弹枪',
  Smg: '冲锋枪', SniperRifle: '狙击步枪', Revolver: '左轮手枪',
  Ammo: '弹药', Armor: '护甲', FaceCover: '面部装备', Headwear: '头部装备',
  Vest: '背心', Backpack: '背包', Knife: '近战武器', Barrel: '枪管',
  Compass: '指南针', Magazine: '弹匣', Receiver: '机匣', Stock: '枪托',
  Charge: '枪栓', Launcher: '榴弹发射器', Other: '其他', Info: '信息',
  Food: '食物',
  // === Not in game locale - hardcoded ===
  AssaultCarbine: '突击卡宾枪', MarksmanRifle: '精确射手步枪',
  MachineGun: '机枪', GrenadeLauncher: '榴弹发射器',
  SpecialWeapon: '特殊武器', RocketLauncher: '火箭筒',
  AmmoBox: '弹药包', ArmorPlate: '防弹板',
  Visors: '护目镜', MedKit: '急救包', Medical: '医疗物资',
  Drugs: '药品', Stimulator: '注射器', Drink: '饮料',
  Key: '钥匙', Keycard: '门禁卡', KeyMechanical: '机械钥匙',
  BarterItem: '交换物', ThrowWeap: '投掷武器',
  Collimator: '反射瞄准镜', CompactCollimator: '紧凑型瞄准镜',
  OpticScope: '光学瞄准镜', AssaultScope: '突击瞄准镜',
  SpecialScope: '特殊瞄准镜', IronSight: '机械瞄具',
  Silencer: '消音器', FlashHider: '消焰器', Compensator: '制退器',
  MuzzleCombo: '枪口组合', Foregrip: '前握把', Bipod: '脚架',
  CylinderMagazine: '转轮弹匣', Mount: '导轨座',
  Handguard: '护木', Gasblock: '导气管', PistolGrip: '手枪握把',
  Flashlight: '手电筒', LightLaser: '激光指示器',
  TacticalCombo: '战术配件', RailCovers: '导轨盖',
  AuxiliaryMod: '辅助配件', NightVision: '夜视仪',
  ThermalVision: '热成像', Headphones: '耳机',
  RepairKits: '修理包', Multitools: '多功能工具',
  LootContainer: '容器', LockableContainer: '锁箱', Money: '货币',
  Map: '地图',
}

export function getTypeNameZH(typeName: string): string {
  return TYPE_NAME_ZH[typeName] || typeName
}
