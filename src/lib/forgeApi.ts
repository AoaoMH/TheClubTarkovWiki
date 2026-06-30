/**
 * Forge API client.
 * Adapted from EFTForge frontend/modules/api.js
 */
import { forgeConfig } from './forgeConfig'

const base = () => forgeConfig.API_BASE

// --- Types matching server response ---

export interface AllowedItem {
  id: string
  name: string
  shortName: string
  image: string | null
  weight: number
  ergonomicsModifier: number
  recoil: number
  recoilForceUp: number
  recoilForceBack: number
  accuracy: number
  centerOfImpact: number | null
  sightingRange: number | null
  conflictingItems: string[]
}

export interface GunSlot {
  name: string
  id: string
  required: boolean
  filter: string[]
  allowedItems: AllowedItem[]
}

export interface GunInitData {
  id: string
  name: string
  shortName: string
  image: string | null
  weight: number
  weapon: {
    caliber: string
    defaultAmmo: string
    fireRate: number
    effectiveRange: number
    sightingRange: number
    ergonomics: number
    recoilForceUp: number
    recoilForceBack: number
    fireModes: string[]
    [key: string]: unknown
  }
  slots: GunSlot[]
  centerOfImpact: number | null
  conflictingItems: string[]
  factoryPreset: Array<{ slotName: string; itemId: string }>
}

export interface BuildStats {
  totalErgo: number
  totalWeight: number
  recoilVertical: number | null
  recoilHorizontal: number | null
  sightingRange: number | null
  accuracyMoa: number | null
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

// --- API functions ---

export async function fetchGunInit(gunId: string, lang: 'zh' | 'en' = 'zh'): Promise<GunInitData> {
  const res = await fetch(`${base()}/api/forge/guns/${gunId}/init?lang=${lang}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

export async function fetchItemSlots(itemId: string): Promise<{ itemId: string; slots: GunSlot[] }> {
  const res = await fetch(`${base()}/api/forge/items/${itemId}/slots`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

export async function fetchAllowedItems(
  itemId: string,
  slotName: string,
  lang: 'zh' | 'en' = 'zh'
): Promise<{ itemId: string; slotName: string; items: AllowedItem[] }> {
  const res = await fetch(`${base()}/api/forge/items/${itemId}/slots/${slotName}/allowed-items?lang=${lang}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

export async function calculateBuild(
  baseItemId: string,
  installedIds: string[],
  assumeFullMag?: boolean,
  selectedAmmoId?: string | null
): Promise<BuildStats> {
  const res = await fetch(`${base()}/api/forge/build/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseItemId, installedIds, assumeFullMag, selectedAmmoId }),
  })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

export async function validateBuild(candidateId: string, installedIds: string[]): Promise<ConflictResult> {
  const res = await fetch(`${base()}/api/forge/build/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, installedIds }),
  })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

export interface ItemPrice {
  fleaPrice: number | null
  bestBuyPrice: number | null
  bestBuySource: string | null
  bestSellPrice: number | null
  bestSellSource: string | null
}

export async function fetchPrices(
  itemIds: string[],
  installedIds?: string[]
): Promise<{ prices: Record<string, ItemPrice>; conflicts: Record<string, ConflictResult> }> {
  const res = await fetch(`${base()}/api/forge/prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemIds, installedIds }),
  })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  const data = await res.json()
  return { prices: data.prices || {}, conflicts: data.conflicts || {} }
}

export interface AmmoItem {
  id: string
  name: string
  shortName: string
  image: string | null
  weight: number
  ammo: {
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
}

export async function fetchAmmo(caliber: string, lang: 'zh' | 'en' = 'zh'): Promise<AmmoItem[]> {
  const res = await fetch(`${base()}/api/forge/ammo/${encodeURIComponent(caliber)}?lang=${lang}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  const data = await res.json()
  return data.items || []
}
