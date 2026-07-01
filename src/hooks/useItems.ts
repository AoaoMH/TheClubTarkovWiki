import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchCategories, fetchCategorySummaries, fetchItemDetail, fetchSearchIndex, fetchItemNames } from '@/lib/dataStore'

// ==================== Types ====================

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
    ammoBox?: {
      ammoId: string
      caliber: string
      count: number
    }
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
    headwear?: Record<string, unknown>
    resolvedSlots?: Array<{
      name: string
      filters: Array<{
        id: string
        name: { zh: string; en: string }
        isWikiItem: boolean
      }>
    }>
    resolvedConflicts?: Array<{
      id: string
      name: { zh: string; en: string }
      isWikiItem: boolean
    }>
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
  previewImage: string | null
}

/** Lightweight item summary for list views */
export interface ItemSummary {
  id: string
  typeName: string
  category: string
  handbook: { categoryId: string | null; price: number }
  common: {
    name: LocalizedText
    shortName: LocalizedText
    rarity: string
  }
  image: string | null
  ammo?: {
    caliber: string
    penetrationPower: number
    damage: number
    armorDamage: number
    accuracy: number
    recoil: number
    fragmentationChance: number
    ricochetChance: number
    lightBleedChance: number
    heavyBleedChance: number
    initialSpeed: number
    ballisticCoeficient: number
    projectileCount: number
    tracer: boolean
    tracerColor: string | null
  }
}

// ==================== Hooks ====================

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Load categories only (for sidebar and homepage) */
export function useCategories() {
  const [state, setState] = useState<AsyncState<WikiCategory[]>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState(prev => prev.data ? { ...prev, loading: false } : { data: null, loading: true, error: null })

    fetchCategories()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: String(err) }) })

    return () => { cancelled = true }
  }, [])

  return { categories: state.data || [], loading: state.loading, error: state.error }
}

/** Load item summaries for a specific category */
export function useCategorySummaries(categoryId: string | null) {
  const [state, setState] = useState<AsyncState<ItemSummary[]>>({ data: null, loading: true, error: null })

  useEffect(() => {
    if (!categoryId) {
      setState({ data: [], loading: false, error: null })
      return
    }

    let cancelled = false
    setState(prev => prev.data ? { ...prev, loading: true } : { data: null, loading: true, error: null })

    fetchCategorySummaries(categoryId)
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: String(err) }) })

    return () => { cancelled = true }
  }, [categoryId])

  return { items: state.data || [], loading: state.loading, error: state.error }
}

/** Load a single item's full detail */
export function useItemDetail(itemId: string | null) {
  const [state, setState] = useState<AsyncState<WikiItem>>({ data: null, loading: true, error: null })

  useEffect(() => {
    if (!itemId) {
      setState({ data: null, loading: false, error: null })
      return
    }

    let cancelled = false
    setState(prev => prev.data?.id === itemId ? { ...prev, loading: false } : { data: null, loading: true, error: null })

    fetchItemDetail(itemId)
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: String(err) }) })

    return () => { cancelled = true }
  }, [itemId])

  return { item: state.data, loading: state.loading, error: state.error }
}

/** Lazily load search index (call triggerLoad on search focus) */
export function useSearchIndex() {
  const [state, setState] = useState<AsyncState<ItemSummary[]>>({ data: null, loading: false, error: null })
  const [loaded, setLoaded] = useState(false)

  const triggerLoad = useCallback(() => {
    if (loaded) return
    setLoaded(true)
    setState({ data: null, loading: true, error: null })

    fetchSearchIndex()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(err => setState({ data: null, loading: false, error: String(err) }))
  }, [loaded])

  return { index: state.data || [], loading: state.loading, triggerLoad }
}

/** Search within a list of summaries */
export function useSearch(items: ItemSummary[], lang: 'zh' | 'en') {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()
    return items.filter(item => {
      const name = item.common.name[lang].toLowerCase()
      const shortName = item.common.shortName[lang].toLowerCase()
      return name.includes(q) || shortName.includes(q)
    }).slice(0, 50)
  }, [query, items, lang])

  return { query, setQuery, results }
}

/** Load name lookup for non-wiki items (for slot filters and conflicting items) */
export function useItemNames() {
  const [state, setState] = useState<AsyncState<Record<string, { zh: string; en: string }>>>({
    data: null, loading: false, error: null
  })
  const [loaded, setLoaded] = useState(false)

  const triggerLoad = useCallback(() => {
    if (loaded) return
    setLoaded(true)
    setState({ data: null, loading: true, error: null })
    fetchItemNames()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(err => setState({ data: null, loading: false, error: String(err) }))
  }, [loaded])

  const getName = useCallback((id: string, lang: 'zh' | 'en'): string | null => {
    const entry = state.data?.[id]
    return entry ? entry[lang] : null
  }, [state.data])

  return { getName, triggerLoad, loading: state.loading }
}

/** Load item names map eagerly (for quest/item name resolution) */
export function useItemNamesMap() {
  const [state, setState] = useState<AsyncState<Record<string, { zh: string; en: string }>>>({
    data: null, loading: true, error: null
  })

  useEffect(() => {
    let cancelled = false
    fetchItemNames()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: String(err) }) })
    return () => { cancelled = true }
  }, [])

  return { itemNames: state.data || {}, loading: state.loading }
}

// ==================== Utility Hooks ====================

export function useCategoryTree(categories: WikiCategory[]) {
  return useMemo(() => {
    // Build child map first
    const childMap = new Map<string, WikiCategory[]>()
    for (const cat of categories) {
      if (cat.parentId) {
        const children = childMap.get(cat.parentId) || []
        children.push(cat)
        childMap.set(cat.parentId, children)
      }
    }

    // Compute total item count for subtree (including self)
    const subtreeItemCount = new Map<string, number>()
    function computeSubtree(cat: WikiCategory): number {
      if (subtreeItemCount.has(cat.id)) return subtreeItemCount.get(cat.id)!
      const children = childMap.get(cat.id) || []
      const total = cat.itemCount + children.reduce((sum, child) => sum + computeSubtree(child), 0)
      subtreeItemCount.set(cat.id, total)
      return total
    }
    for (const cat of categories) computeSubtree(cat)

    // Filter out categories with 0 items in entire subtree
    const nonEmptyCategories = categories.filter(c => (subtreeItemCount.get(c.id) || 0) > 0)
    const rootCategories = nonEmptyCategories.filter(c => !c.parentId)

    // Rebuild filtered child map
    const filteredChildMap = new Map<string, WikiCategory[]>()
    for (const cat of nonEmptyCategories) {
      if (cat.parentId) {
        const children = filteredChildMap.get(cat.parentId) || []
        children.push(cat)
        filteredChildMap.set(cat.parentId, children)
      }
    }

    for (const [, children] of filteredChildMap) {
      children.sort((a, b) => a.order - b.order)
    }
    rootCategories.sort((a, b) => a.order - b.order)

    return { rootCategories, childMap: filteredChildMap }
  }, [categories])
}

// ==================== Type Name Translation ====================

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
