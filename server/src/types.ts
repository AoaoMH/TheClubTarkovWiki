/**
 * Server-side types matching the forge-data.json output from the generator.
 * These mirror the types in generator/src/processors/forge.ts and generator/src/types.ts.
 */

export interface LocalizedText {
  zh: string
  en: string
}

export interface SlotInfo {
  name: string
  id: string
  required: boolean
  filter: string[]
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
  recoilDispersion: number
  recoilCamera: number
  cameraSnap: number
  recoilStableAngleIncreaseStep: number
  recoilStableIndexShot: number
  deviationMax: number
  deviationCurve: number
  malfunctionChance: number
  durabilityBurnRatio: number
  operatingResource: number
  heatFactorByShot: number
  heatFactorGun: number
  coolFactorGun: number
  coolFactorGunMods: number
  hipAccuracyRestorationSpeed: number
  hipAccuracyRestorationDelay: number
  hipInnaccuracyGain: number
  singleFireRate: number
  shotgunDispersion: number
  bHearDist: number
  mountVerticalRecoilMultiplier: number
  mountHorizontalRecoilMultiplier: number
  durability: number
  maxDurability: number
  fireModes: string[]
  weapClass: string
  weapFireType: string
}

export interface ModProps {
  ergonomics: number
  recoilForceUp: number
  recoilForceBack: number
  recoil: number
  accuracy: number
  loudness: number
  effectiveDistance: number
  zooms: string
  sightingRange: number
  sightModType: string
  calibrationDistances: number[]
  velocity: number
  muzzleModType: string
  malfunctionChance: number
  loadUnloadModifier: number
  checkTimeModifier: number
  foldable: boolean
  retractable: boolean
}

export interface ForgeItem {
  id: string
  name: LocalizedText
  shortName: LocalizedText
  image: string | null
  weight: number
  category: string
  typeName: string
  weapon?: WeaponProps
  mod?: ModProps
  slots: SlotInfo[]
  conflictingItems: string[]
  centerOfImpact: number | null
  ammo?: AmmoProps
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
  presets: Record<string, Array<{ slotName: string; itemId: string }>>
  generatedAt: string
}

// --- API Types ---

export interface BuildStats {
  totalErgo: number
  totalWeight: number
  recoilVertical: number | null
  recoilHorizontal: number | null
  sightingRange: number | null
  accuracyMoa: number | null
  // Hidden stats
  fireRate: number | null
  effectiveRange: number | null
  recoilAngle: number | null
  recoilDispersion: number | null
  recoilCamera: number | null
  malfunctionChance: number | null
  durabilityBurnRatio: number | null
  heatFactorGun: number | null
  deviationMax: number | null
  totalRecoilMod: number
  totalAccuracyMod: number
}

export interface ConflictResult {
  valid: boolean
  reasonKey: string | null
  reasonName: string | null
  conflictingItemId: string | null
  conflictingSlotId: string | null
}
