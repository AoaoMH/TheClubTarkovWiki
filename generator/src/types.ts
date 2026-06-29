// ============ SPT Raw Data Types ============

export interface SPTItem {
  _id: string
  _name: string
  _parent: string
  _type: 'Item' | 'Node'
  _props: Record<string, unknown>
}

export interface SPTItemsMap {
  [id: string]: SPTItem
}

export interface HandbookCategory {
  Id: string
  ParentId: string | null
  Order: string
  Icon: string
  Color?: string
}

export interface HandbookItem {
  Id: string
  ParentId: string
  Price: number
}

export interface Handbook {
  Categories: HandbookCategory[]
  Items: HandbookItem[]
}

export interface Locales {
  [key: string]: string // e.g. "itemId Name": "翻译名称"
}

// ============ Mod Data Types ============

export interface ModCustomItem {
  itemTplToClone: string
  parentId: string
  handbookParentId: string
  overrideProperties: Record<string, unknown>
}

export interface ModCustomItemsMap {
  [id: string]: ModCustomItem
}

// ============ Effect Types ============

export interface HealthEffect {
  type: string // Energy, Hydration, Pain, Fracture, etc.
  value?: number // for stat changes
  cost?: number // for medical healing cost
  delay?: number
  duration?: number
}

export interface StimBuff {
  buffType: string // SkillRate, HandsTremor, etc.
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

// ============ Wiki Output Types ============

export type ItemCategory =
  | 'weapon'
  | 'ammo'
  | 'ammobox'
  | 'armor'
  | 'armorplate'
  | 'helmet'
  | 'facecover'
  | 'headwear'
  | 'visors'
  | 'vest'
  | 'backpack'
  | 'medical'
  | 'drugs'
  | 'stimulator'
  | 'food'
  | 'drink'
  | 'key'
  | 'keycard'
  | 'barter'
  | 'mod_scope'
  | 'mod_muzzle'
  | 'mod_foregrip'
  | 'mod_stock'
  | 'mod_magazine'
  | 'mod_mount'
  | 'mod_other'
  | 'grenade'
  | 'knife'
  | 'special'
  | 'container'
  | 'other'

export interface LocalizedText {
  zh: string
  en: string
}

export interface WikiItemCommon {
  name: LocalizedText
  shortName: LocalizedText
  description: LocalizedText
  weight: number
  width: number
  height: number
  rarity: string
  backgroundColor: string
}

export interface WeaponProps {
  caliber: string
  defaultAmmo: string
  fireRate: number
  effectiveRange: number
  sightingRange: number
  ergonomics: number
  recoilForceUp: number
  recoilForceBack: number
  recoilAngle: number
  durability: number
  maxDurability: number
  fireModes: string[]
  weapClass: string
  weapFireType: string
}

export interface AmmoProps {
  caliber: string
  damage: number
  penetrationPower: number
  armorDamage: number
  accuracy: number
  recoil: number
  fragmentationChance: number
  ricochetChance: number
  lightBleedChance: number
  heavyBleedChance: number
  initialSpeed: number
}

export interface AmmoBoxProps {
  ammoId: string
  caliber: string
  count: number
}

export interface ArmorProps {
  armorClass: number
  durability: number
  maxDurability: number
  material: string
  zones: string[]
  speedPenalty: number
  ergonomicsPenalty: number
}

export interface MedicalProps {
  medEffectType: string
  medUseTime: number
  maxHpResource: number
  hpResourceRate: number
  effects: ItemEffects
}

export interface ModProps {
  ergonomics: number
  recoilForceUp: number
  recoilForceBack: number
  accuracy: number
}

export interface FoodDrinkProps {
  useTime: number
  effects: ItemEffects
}

export interface SlotInfo {
  name: string
  id: string
  required: boolean
  filter: string[] // compatible item IDs
}

export interface WikiItem {
  id: string
  typeName: string // original _name from SPT (e.g. AssaultRifle, Ammo, etc.)
  category: ItemCategory
  parentTypeChain: string[] // chain from item to root
  handbook: {
    categoryId: string | null
    price: number
  }
  common: WikiItemCommon
  properties: {
    weapon?: WeaponProps
    ammo?: AmmoProps
    ammoBox?: AmmoBoxProps
    armor?: ArmorProps
    medical?: MedicalProps
    mod?: ModProps
    foodDrink?: FoodDrinkProps
    _raw?: Record<string, unknown>
  }
  slots: SlotInfo[]
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
  /** First item's image in this category, for preview cards */
  previewImage: string | null
}

export interface WikiTypeNode {
  id: string
  name: string
  parentId: string
  children: string[]
}

export interface WikiData {
  items: WikiItem[]
  categories: WikiCategory[]
  types: WikiTypeNode[]
  generatedAt: string
  stats: {
    totalItems: number
    totalCategories: number
    modItems: number
  }
}

/** Lightweight item summary for list views and search index */
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
  /** Extra fields for AmmoPage grouping/sorting */
  ammo?: {
    caliber: string
    penetrationPower: number
    damage: number
    armorDamage: number
  }
}

// ============ Globals Types ============

export interface StimulatorBuffEntry {
  BuffType: string
  SkillName: string
  Value: number
  Delay: number
  Duration: number
  Chance: number
}

export interface StimulatorBuffsMap {
  [buffId: string]: StimulatorBuffEntry[]
}
