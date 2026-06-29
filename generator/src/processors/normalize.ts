import { EXCLUDED_TYPES } from '../config.js'
import type {
  SPTItemsMap, SPTItem, Handbook, Locales,
  WikiItem, ItemCategory, SlotInfo,
  WeaponProps, AmmoProps, AmmoBoxProps, ArmorProps, MedicalProps, ModProps, FoodDrinkProps,
  HealthEffect, StimBuff, ItemEffects, StimulatorBuffsMap
} from '../types.js'

interface NormalizeContext {
  items: SPTItemsMap
  handbook: Handbook
  locales: { zh: Locales; en: Locales }
  itemTypeMap: Map<string, string>
  typeChain: (id: string) => string[]
  modItemIds: Set<string>
  stimBuffsMap: StimulatorBuffsMap
}

// Mapping from type names to wiki categories
const TYPE_TO_CATEGORY: Record<string, ItemCategory> = {
  AssaultRifle: 'weapon', AssaultCarbine: 'weapon', Pistol: 'weapon',
  Shotgun: 'weapon', SniperRifle: 'weapon', MarksmanRifle: 'weapon',
  Smg: 'weapon', MachineGun: 'weapon', GrenadeLauncher: 'weapon',
  SpecialWeapon: 'weapon', Revolver: 'weapon', RocketLauncher: 'weapon',
  Ammo: 'ammo', AmmoBox: 'ammobox',
  Armor: 'armor', ArmorPlate: 'armorplate', BuiltInInserts: 'armorplate',
  Headwear: 'headwear', FaceCover: 'facecover', Visors: 'visors',
  Vest: 'vest', Backpack: 'backpack',
  MedKit: 'medical', Medical: 'medical', Drugs: 'drugs', Stimulator: 'stimulator',
  Food: 'food', Drink: 'drink',
  Key: 'key', Keycard: 'keycard', KeyMechanical: 'key',
  BarterItem: 'barter', ThrowWeap: 'grenade', Knife: 'knife',
  Collimator: 'mod_scope', CompactCollimator: 'mod_scope',
  OpticScope: 'mod_scope', AssaultScope: 'mod_scope',
  SpecialScope: 'mod_scope', IronSight: 'mod_scope',
  Silencer: 'mod_muzzle', FlashHider: 'mod_muzzle',
  Compensator: 'mod_muzzle', MuzzleCombo: 'mod_muzzle', Pms: 'mod_muzzle',
  Foregrip: 'mod_foregrip', Bipod: 'mod_foregrip',
  Stock: 'mod_stock', PistolGrip: 'mod_other',
  Charge: 'mod_other', Receiver: 'mod_other',
  Barrel: 'mod_other', Handguard: 'mod_other', Gasblock: 'mod_other',
  Magazine: 'mod_magazine', CylinderMagazine: 'mod_magazine',
  Mount: 'mod_mount', AuxiliaryMod: 'mod_other',
  Flashlight: 'mod_other', LightLaser: 'mod_other',
  TacticalCombo: 'mod_other', RailCovers: 'mod_other',
  Launcher: 'mod_other', Shaft: 'mod_other',
  NightVision: 'special', ThermalVision: 'special',
  Headphones: 'special', Compass: 'special',
  PortableRangeFinder: 'special', RadioTransmitter: 'special',
  Multitools: 'special', RepairKits: 'special', PlantingKits: 'special',
  CultistAmulet: 'special', MarkOfUnknown: 'special',
  LootContainer: 'container', RandomLootContainer: 'container',
  LockableContainer: 'container',
  Map: 'special', Flyer: 'other', Info: 'other',
  Money: 'other', Rocket: 'ammo',
  DialogItem: 'other',
  Battery: 'barter', Electronics: 'barter', BuildingMaterial: 'barter',
  Tool: 'barter', Lubricant: 'barter', Fuel: 'barter',
  HouseholdGoods: 'barter', Jewelry: 'barter', MedicalSupplies: 'barter',
  Other: 'other',
  SpringDrivenCylinder: 'mod_other',
}

function getCategory(typeName: string, chain: string[]): ItemCategory {
  if (TYPE_TO_CATEGORY[typeName]) return TYPE_TO_CATEGORY[typeName]
  // Check parent chain
  for (const parent of chain) {
    if (TYPE_TO_CATEGORY[parent]) return TYPE_TO_CATEGORY[parent]
  }
  return 'other'
}

function getLocale(id: string, suffix: string, locales: Locales, fallback: string): string {
  return locales[`${id} ${suffix}`] || fallback
}

function extractSlots(item: SPTItem): SlotInfo[] {
  const slots = item._props.Slots
  if (!Array.isArray(slots)) return []
  return slots
    .filter((s: Record<string, unknown>) => s._name && typeof s._name === 'string')
    .map((s: Record<string, unknown>) => ({
      name: s._name as string,
      id: (s._id as string) || '',
      required: s._required === true,
      filter: extractSlotFilter(s),
    }))
}

function extractSlotFilter(slot: Record<string, unknown>): string[] {
  const filters: string[] = []
  const props = slot._props as Record<string, unknown> | undefined
  if (props?.filters && Array.isArray(props.filters)) {
    for (const f of props.filters as Record<string, unknown>[]) {
      if (Array.isArray(f.Filter)) {
        filters.push(...f.Filter as string[])
      }
    }
  }
  return filters
}

function extractWeaponProps(item: SPTItem): WeaponProps | undefined {
  const p = item._props
  if (!p.ammoCaliber && !p.bFirerate) return undefined
  return {
    caliber: ((p.ammoCaliber as string) || '').replace(/^Caliber/i, ''),
    defaultAmmo: (p.defAmmo as string) || '',
    fireRate: (p.bFirerate as number) || 0,
    effectiveRange: (p.bEffDist as number) || 0,
    sightingRange: (p.SightingRange as number) || 0,
    ergonomics: (p.Ergonomics as number) || 0,
    recoilForceUp: (p.RecoilForceUp as number) || 0,
    recoilForceBack: (p.RecoilForceBack as number) || 0,
    recoilAngle: (p.RecoilAngle as number) || 0,
    durability: (p.Durability as number) || 0,
    maxDurability: (p.MaxDurability as number) || 0,
    fireModes: Array.isArray(p.weapFireType) ? p.weapFireType as string[] : [],
    weapClass: (p.weapClass as string) || '',
    weapFireType: Array.isArray(p.weapFireType) ? (p.weapFireType as string[]).join(', ') : String(p.weapFireType || ''),
  }
}

function extractAmmoProps(item: SPTItem): AmmoProps | undefined {
  const p = item._props
  if (!p.Damage && !p.PenetrationPower) return undefined
  return {
    caliber: ((p.Caliber as string) || '').replace(/^Caliber/i, ''),
    damage: (p.Damage as number) || 0,
    penetrationPower: (p.PenetrationPower as number) || 0,
    armorDamage: (p.ArmorDamage as number) || 0,
    accuracy: (p.Accuracy as number) || 0,
    recoil: (p.Recoil as number) || 0,
    fragmentationChance: (p.FragmentationChance as number) || 0,
    ricochetChance: (p.RicochetChance as number) || 0,
    lightBleedChance: (p.LightBleedingModifier as number) || 0,
    heavyBleedChance: (p.HeavyBleedingModifier as number) || 0,
    initialSpeed: (p.InitialSpeed as number) || 0,
  }
}

function extractAmmoBoxProps(item: SPTItem): AmmoBoxProps | undefined {
  const p = item._props
  const stackSlots = p.StackSlots as Array<{
    _max_count?: number
    _props?: { filters?: Array<{ Filter?: string[] }> }
  }> | undefined
  if (!Array.isArray(stackSlots) || stackSlots.length === 0) return undefined
  const slot = stackSlots[0]
  const filters = slot?._props?.filters
  if (!Array.isArray(filters) || filters.length === 0) return undefined
  const ammoId = filters[0]?.Filter?.[0]
  if (!ammoId) return undefined
  return {
    ammoId,
    caliber: ((p.ammoCaliber as string) || '').replace(/^Caliber/i, ''),
    count: (slot._max_count as number) || 0,
  }
}

function extractArmorProps(item: SPTItem): ArmorProps | undefined {
  const p = item._props
  if (!p.ArmorClass && !p.armorClass) return undefined
  return {
    armorClass: (p.ArmorClass || p.armorClass || 0) as number,
    durability: (p.Durability as number) || 0,
    maxDurability: (p.MaxDurability as number) || 0,
    material: (p.ArmorMaterial as string) || '',
    zones: Array.isArray(p.armorZone) ? p.armorZone as string[] : [],
    speedPenalty: (p.SpeedPenalty as number) || 0,
    ergonomicsPenalty: (p.ErgonomicsPenalty as number) || 0,
  }
}

/**
 * Parse effects_health into HealthEffect[] (stat changes like Energy/Hydration, or healing costs like Fracture).
 */
function parseHealthEffects(raw: unknown): HealthEffect[] {
  if (!raw || typeof raw !== 'object') return []
  const effects: HealthEffect[] = []
  for (const [type, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const entry = val as Record<string, unknown>
    const effect: HealthEffect = { type }
    if (typeof entry.value === 'number') effect.value = entry.value
    if (typeof entry.cost === 'number') effect.cost = entry.cost
    if (typeof entry.delay === 'number') effect.delay = entry.delay
    if (typeof entry.duration === 'number') effect.duration = entry.duration
    effects.push(effect)
  }
  return effects
}

/**
 * Parse effects_damage into HealthEffect[] (status removal like Pain, RadExposure).
 */
function parseDamageEffects(raw: unknown): HealthEffect[] {
  if (!raw || typeof raw !== 'object') return []
  const effects: HealthEffect[] = []
  for (const [type, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const entry = val as Record<string, unknown>
    const effect: HealthEffect = { type }
    if (typeof entry.delay === 'number') effect.delay = entry.delay
    if (typeof entry.duration === 'number') effect.duration = entry.duration
    effects.push(effect)
  }
  return effects
}

/**
 * Resolve StimulatorBuffs reference ID into StimBuff[] using the buffs map from globals.json.
 */
function resolveStimBuffs(stimBuffsRef: unknown, stimBuffsMap: StimulatorBuffsMap): StimBuff[] {
  if (!stimBuffsRef || typeof stimBuffsRef !== 'string') return []
  const buffEntries = stimBuffsMap[stimBuffsRef]
  if (!buffEntries || !Array.isArray(buffEntries)) return []
  return buffEntries.map(entry => ({
    buffType: entry.BuffType || '',
    skillName: entry.SkillName || '',
    value: entry.Value ?? 0,
    delay: entry.Delay ?? 0,
    duration: entry.Duration ?? 0,
    chance: entry.Chance ?? 1,
  }))
}

function buildItemEffects(
  item: SPTItem,
  stimBuffsMap: StimulatorBuffsMap
): ItemEffects {
  return {
    healthEffects: parseHealthEffects(item._props.effects_health),
    damageEffects: parseDamageEffects(item._props.effects_damage),
    stimBuffs: resolveStimBuffs(item._props.StimulatorBuffs, stimBuffsMap),
  }
}

function extractMedicalProps(item: SPTItem, stimBuffsMap: StimulatorBuffsMap): MedicalProps | undefined {
  const p = item._props
  // Only match true medical items - they have medEffectType or medUseTime
  if (!p.medEffectType && !p.medUseTime) return undefined
  return {
    medEffectType: (p.medEffectType as string) || '',
    medUseTime: (p.medUseTime as number) || 0,
    maxHpResource: (p.MaxHpResource as number) || 0,
    hpResourceRate: (p.hpResourceRate as number) || 0,
    effects: buildItemEffects(item, stimBuffsMap),
  }
}

function extractModProps(item: SPTItem): ModProps | undefined {
  const p = item._props
  const ergo = p.ergonomics ?? p.Ergonomics
  const recoilUp = p.RecoilForceUp ?? p.recoilForceUp
  const recoilBack = p.RecoilForceBack ?? p.recoilForceBack
  const acc = p.Accuracy ?? p.accuracy
  if (ergo === undefined && recoilUp === undefined && acc === undefined) return undefined
  return {
    ergonomics: (ergo as number) || 0,
    recoilForceUp: (recoilUp as number) || 0,
    recoilForceBack: (recoilBack as number) || 0,
    accuracy: (acc as number) || 0,
  }
}

function extractFoodDrinkProps(item: SPTItem, stimBuffsMap: StimulatorBuffsMap): FoodDrinkProps | undefined {
  const p = item._props
  // Food/drink items have foodUseTime or foodEffectType
  if (!p.foodUseTime && !p.foodEffectType) return undefined
  return {
    useTime: (p.foodUseTime as number) || 0,
    effects: buildItemEffects(item, stimBuffsMap),
  }
}

/**
 * Normalize all items into wiki output format.
 */
export function normalizeItems(ctx: NormalizeContext): WikiItem[] {
  const { items, handbook, locales, itemTypeMap, typeChain, modItemIds, stimBuffsMap } = ctx

  // Build handbook item lookup
  const handbookItemMap = new Map<string, { categoryId: string; price: number }>()
  for (const hi of handbook.Items) {
    handbookItemMap.set(hi.Id, { categoryId: hi.ParentId, price: hi.Price })
  }

  // Collect all Node IDs (abstract types)
  const nodeIds = new Set<string>()
  for (const [id, item] of Object.entries(items)) {
    if (item._type === 'Node') nodeIds.add(id)
  }

  const wikiItems: WikiItem[] = []
  let skipped = 0

  for (const [id, item] of Object.entries(items)) {
    // Skip Node entries (abstract type definitions)
    if (nodeIds.has(id)) {
      skipped++
      continue
    }

    const typeName = itemTypeMap.get(id) || 'Unknown'
    const chain = typeChain(id)

    // Skip excluded abstract/system types
    if (EXCLUDED_TYPES.has(typeName)) {
      skipped++
      continue
    }

    const category = getCategory(typeName, chain)
    const handbookInfo = handbookItemMap.get(id)

    // Get localized text
    const nameZh = getLocale(id, 'Name', locales.zh, item._props.Name as string || item._name)
    const nameEn = getLocale(id, 'Name', locales.en, item._props.Name as string || item._name)
    const shortNameZh = getLocale(id, 'ShortName', locales.zh, (item._props.ShortName as string) || nameZh)
    const shortNameEn = getLocale(id, 'ShortName', locales.en, (item._props.ShortName as string) || nameEn)
    const descZh = getLocale(id, 'Description', locales.zh, (item._props.Description as string) || '')
    const descEn = getLocale(id, 'Description', locales.en, (item._props.Description as string) || '')

    // Extract type-specific properties
    const properties: WikiItem['properties'] = {
      _raw: item._props,
    }
    const wpn = category === 'ammobox' ? undefined : extractWeaponProps(item)
    const ammo = extractAmmoProps(item)
    const ammoBox = category === 'ammobox' ? extractAmmoBoxProps(item) : undefined
    const armor = extractArmorProps(item)
    const med = extractMedicalProps(item, stimBuffsMap)
    const mod = extractModProps(item)
    const fd = extractFoodDrinkProps(item, stimBuffsMap)
    if (wpn) properties.weapon = wpn
    if (ammo) properties.ammo = ammo
    if (ammoBox) properties.ammoBox = ammoBox
    if (armor) properties.armor = armor
    if (med) properties.medical = med
    if (mod) properties.mod = mod
    if (fd) properties.foodDrink = fd

    const slots = extractSlots(item)
    const isMod = modItemIds.has(id)

    wikiItems.push({
      id,
      typeName,
      category,
      parentTypeChain: chain,
      handbook: {
        categoryId: handbookInfo?.categoryId || null,
        price: handbookInfo?.price || 0,
      },
      common: {
        name: { zh: nameZh, en: nameEn },
        shortName: { zh: shortNameZh, en: shortNameEn },
        description: { zh: descZh, en: descEn },
        weight: (item._props.Weight as number) || 0,
        width: (item._props.Width as number) || 1,
        height: (item._props.Height as number) || 1,
        rarity: (item._props.RarityPvE as string) || 'Common',
        backgroundColor: (item._props.BackgroundColor as string) || 'default',
      },
      properties,
      slots,
      image: null, // Will be set by image downloader
      isMod,
    })
  }

  console.log(`[normalize] ${wikiItems.length} wiki items (${skipped} skipped nodes/excluded)`)
  return wikiItems
}
