import { EXCLUDED_TYPES } from '../config.js'
import type {
  SPTItemsMap, SPTItem, Handbook, Locales,
  WikiItem, ItemCategory, SlotInfo, ResolvedSlot, ItemNameEntry,
  WeaponProps, AmmoProps, AmmoBoxProps, ArmorProps, MedicalProps, ModProps, FoodDrinkProps,
  HeadwearProps, HealthEffect, StimBuff, ItemEffects, StimulatorBuffsMap
} from '../types.js'

export interface NormalizeResult {
  wikiItems: WikiItem[]
  itemNames: Record<string, ItemNameEntry>
}

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
    recoilDispersion: (p.RecolDispersion as number) || 0,
    recoilCamera: (p.RecoilCamera as number) || 0,
    cameraSnap: (p.CameraSnap as number) || 0,
    recoilStableAngleIncreaseStep: (p.RecoilStableAngleIncreaseStep as number) || 0,
    recoilStableIndexShot: (p.RecoilStableIndexShot as number) || 0,
    deviationMax: (p.DeviationMax as number) || 0,
    deviationCurve: (p.DeviationCurve as number) || 0,
    // Reliability
    malfunctionChance: (p.BaseMalfunctionChance as number) || 0,
    durabilityBurnRatio: (p.DurabilityBurnRatio as number) || 0,
    operatingResource: (p.OperatingResource as number) || 0,
    // Overheat
    heatFactorByShot: (p.HeatFactorByShot as number) || 0,
    heatFactorGun: (p.HeatFactorGun as number) || 0,
    coolFactorGun: (p.CoolFactorGun as number) || 0,
    coolFactorGunMods: (p.CoolFactorGunMods as number) || 0,
    // Hip fire
    hipAccuracyRestorationSpeed: (p.HipAccuracyRestorationSpeed as number) || 0,
    hipAccuracyRestorationDelay: (p.HipAccuracyRestorationDelay as number) || 0,
    hipInnaccuracyGain: (p.HipInnaccuracyGain as number) || 0,
    // Extra weapon stats
    singleFireRate: (p.SingleFireRate as number) || 0,
    shotgunDispersion: (p.shotgunDispersion as number) || 0,
    bHearDist: (p.bHearDist as number) || 0,
    // Mounting
    mountVerticalRecoilMultiplier: (p.MountVerticalRecoilMultiplier as number) || 0,
    mountHorizontalRecoilMultiplier: (p.MountHorizontalRecoilMultiplier as number) || 0,
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
    lightBleedChance: ((p.LightBleedingModifier as number) || (p.LightBleedingDelta as number)) || 0,
    heavyBleedChance: ((p.HeavyBleedingModifier as number) || (p.HeavyBleedingDelta as number)) || 0,
    initialSpeed: (p.InitialSpeed as number) || 0,
    ballisticCoeficient: (p.BallisticCoeficient as number) || 0,
    projectileCount: (p.ProjectileCount as number) || 0,
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
    armorClass: Number(p.ArmorClass || p.armorClass || 0),
    durability: (p.Durability as number) || 0,
    maxDurability: (p.MaxDurability as number) || 0,
    material: (p.ArmorMaterial as string) || '',
    zones: Array.isArray(p.armorZone) ? p.armorZone as string[] : [],
    speedPenalty: (p.SpeedPenalty as number) || 0,
    ergonomicsPenalty: (p.ErgonomicsPenalty as number) || 0,
    bluntThroughput: (p.BluntThroughput as number) || 0,
    armorType: (p.ArmorType as string) || '',
    mousePenalty: (p.mousePenalty as number) || 0,
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

  // Serialize Zooms: [[1,4]] → "1-4x", [[1],[4]] → "1x,4x"
  const rawZooms = p.Zooms as number[][] | undefined
  let zooms = ''
  if (Array.isArray(rawZooms) && rawZooms.length > 0) {
    zooms = rawZooms.map((z: number[]) => {
      if (z.length === 2) return `${z[0]}-${z[1]}x`
      return `${z[0]}x`
    }).join(', ')
  }

  // CalibrationDistances (raw is nested like [[50,100,150,200]], flatten it)
  const calDist = Array.isArray(p.CalibrationDistances)
    ? (p.CalibrationDistances as unknown[]).flat() as number[]
    : []

  return {
    ergonomics: (ergo as number) || 0,
    recoilForceUp: (recoilUp as number) || 0,
    recoilForceBack: (recoilBack as number) || 0,
    accuracy: (acc as number) || 0,
    // Common
    loudness: (p.Loudness as number) || 0,
    effectiveDistance: (p.EffectiveDistance as number) || 0,
    // Scope
    zooms,
    sightingRange: (p.SightingRange as number) || 0,
    sightModType: (p.sightModType as string) || '',
    calibrationDistances: calDist,
    // Muzzle
    velocity: (p.Velocity as number) || 0,
    muzzleModType: (p.muzzleModType as string) || '',
    // Magazine
    malfunctionChance: (p.MalfunctionChance as number) || 0,
    loadUnloadModifier: (p.LoadUnloadModifier as number) || 0,
    checkTimeModifier: (p.CheckTimeModifier as number) || 0,
    // Stock
    foldable: p.Foldable === true,
    retractable: p.Retractable === true,
  }
}

function extractHeadwearProps(item: SPTItem, items: SPTItemsMap): HeadwearProps | undefined {
  const p = item._props
  // Only process items that have headwear-related properties
  const armorType = (p.ArmorType as string) || ''
  const armorMaterial = (p.ArmorMaterial as string) || ''
  const hasHeadwearProps = armorType || armorMaterial || p.DeafStrength ||
    p.BlindnessProtection !== undefined || p.speedPenaltyPercent !== undefined

  if (!hasHeadwearProps) return undefined

  // Compute effective armor class: check child armor components if base is 0
  let armorClass = Number(p.armorClass || p.ArmorClass || 0)
  let durability = (p.Durability as number) || 0
  let maxDurability = (p.MaxDurability as number) || 0
  let zones: string[] = Array.isArray(p.armorZone) ? p.armorZone as string[] : []

  // Check child armor slots for effective values
  const armorSlotNames = ['Helmet_top', 'Helmet_back', 'Helmet_ears', 'Helmet_eyes', 'Helmet_jaw']
  const slots = item._props.Slots as Array<Record<string, unknown>> | undefined
  if (Array.isArray(slots)) {
    for (const slot of slots) {
      const slotName = slot._name as string
      if (!armorSlotNames.includes(slotName)) continue
      const slotProps = slot._props as Record<string, unknown> | undefined
      if (!slotProps?.filters) continue
      for (const f of slotProps.filters as Array<Record<string, unknown>>) {
        if (!Array.isArray(f.Filter)) continue
        for (const filterId of f.Filter as string[]) {
          const childItem = items[filterId]
          if (!childItem) continue
          const cp = childItem._props
          const childAC = Number(cp.armorClass || cp.ArmorClass || 0)
          if (childAC > armorClass) armorClass = childAC
          const childDur = (cp.MaxDurability as number) || 0
          if (childDur > maxDurability) {
            maxDurability = childDur
            durability = (cp.Durability as number) || childDur
          }
          const childZones = Array.isArray(cp.armorZone) ? cp.armorZone as string[] : []
          for (const z of childZones) {
            if (!zones.includes(z)) zones.push(z)
          }
        }
      }
    }
  }

  // Ricochet chance from RicochetParams.z
  const ricochetParams = p.RicochetParams as Record<string, number> | undefined
  const ricochetChance = ricochetParams?.z ?? 0

  return {
    armorClass,
    durability,
    maxDurability,
    armorType,
    armorMaterial,
    zones,
    ricochetChance,
    blindnessProtection: (p.BlindnessProtection as number) || 0,
    speedPenalty: (p.speedPenaltyPercent as number) || 0,
    turnSpeed: (p.mousePenalty as number) || 0,
    ergonomicsPenalty: (p.weaponErgonomicPenalty as number) || 0,
    deafStrength: (p.DeafStrength as string) || '',
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
export function normalizeItems(ctx: NormalizeContext): NormalizeResult {
  const { items, handbook, locales, itemTypeMap, typeChain, modItemIds, stimBuffsMap } = ctx

  // Build handbook item lookup
  const handbookItemMap = new Map<string, { categoryId: string; price: number }>()
  for (const hi of handbook.Items) {
    handbookItemMap.set(hi.Id, { categoryId: hi.ParentId, price: hi.Price })
  }

  // Build name lookup for ALL SPT items (including excluded ones) - use full Name
  function getItemName(id: string): { zh: string; en: string } {
    const item = items[id]
    if (!item) return { zh: id.slice(0, 8), en: id.slice(0, 8) }
    const zh = getLocale(id, 'Name', locales.zh, (item._props.Name as string) || item._name)
    const en = getLocale(id, 'Name', locales.en, (item._props.Name as string) || item._name)
    return { zh, en }
  }

  // Collect all Node IDs (abstract types)
  const nodeIds = new Set<string>()
  for (const [id, item] of Object.entries(items)) {
    if (item._type === 'Node') nodeIds.add(id)
  }

  const wikiItems: WikiItem[] = []
  const wikiItemIds = new Set<string>()
  let skipped = 0

  // First pass: build wiki items and collect wiki item IDs
  for (const [id, item] of Object.entries(items)) {
    if (nodeIds.has(id)) { skipped++; continue }
    const typeName = itemTypeMap.get(id) || 'Unknown'
    const chain = typeChain(id)
    if (EXCLUDED_TYPES.has(typeName)) { skipped++; continue }
    wikiItemIds.add(id)
  }

  // Second pass: build wiki items with resolved slots
  for (const [id, item] of Object.entries(items)) {
    if (nodeIds.has(id)) continue
    const typeName = itemTypeMap.get(id) || 'Unknown'
    const chain = typeChain(id)
    if (EXCLUDED_TYPES.has(typeName)) continue

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
    const hw = category === 'headwear' ? extractHeadwearProps(item, items) : undefined
    if (wpn) properties.weapon = wpn
    if (ammo) properties.ammo = ammo
    if (ammoBox) properties.ammoBox = ammoBox
    if (armor) properties.armor = armor
    if (med) properties.medical = med
    if (mod) properties.mod = mod
    if (fd) properties.foodDrink = fd
    if (hw) properties.headwear = hw

    const slots = extractSlots(item)
    const isMod = modItemIds.has(id)

    // Resolve headwear slots with translated names
    if (category === 'headwear' && slots.length > 0) {
      properties.resolvedSlots = slots.map(slot => ({
        name: slot.name,
        filters: slot.filter.map(filterId => ({
          id: filterId,
          name: getItemName(filterId),
          isWikiItem: wikiItemIds.has(filterId),
        })),
      }))
    }

    // Resolve conflicting items with translated names
    const rawConflicts = item._props.ConflictingItems as string[] | undefined
    if (Array.isArray(rawConflicts) && rawConflicts.length > 0) {
      properties.resolvedConflicts = rawConflicts
        .map((cid: string) => cid.trim())
        .filter((cid: string) => cid.length > 0)
        .map((cid: string) => ({
          id: cid,
          name: getItemName(cid),
          isWikiItem: wikiItemIds.has(cid),
        }))
    }

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

  // Collect all referenced non-wiki IDs and build name lookup
  const referencedNonWikiIds = new Set<string>()
  for (const wi of wikiItems) {
    // From resolvedSlots (non-wiki filter items)
    if (wi.properties.resolvedSlots) {
      for (const slot of wi.properties.resolvedSlots) {
        for (const f of slot.filters) {
          if (!f.isWikiItem) referencedNonWikiIds.add(f.id)
        }
      }
    }
  }

  const itemNames: Record<string, ItemNameEntry> = {}
  for (const id of referencedNonWikiIds) {
    const name = getItemName(id)
    itemNames[id] = { zh: name.zh, en: name.en }
  }

  console.log(`[normalize] ${wikiItems.length} wiki items (${skipped} skipped nodes/excluded)`)
  console.log(`[normalize] ${Object.keys(itemNames).length} non-wiki item names resolved`)
  return { wikiItems, itemNames }
}
