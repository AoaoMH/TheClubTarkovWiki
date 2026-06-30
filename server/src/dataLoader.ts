import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ForgeData, ForgeItem, SlotInfo } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Path to forge-data.json (project root / public / data / forge)
const FORGE_DATA_PATH = path.resolve(__dirname, '..', '..', 'public', 'data', 'forge', 'forge-data.json')

export interface SlotOwner {
  itemId: string
  slot: SlotInfo
}

class ForgeDataStore {
  private itemsMap = new Map<string, ForgeItem>()
  private slotIndex = new Map<string, SlotOwner>()
  private weapons: ForgeItem[] = []
  private presetsMap = new Map<string, Array<{ slotName: string; itemId: string }>>()
  private generatedAt = ''

  load(): void {
    console.log(`[dataLoader] Loading forge data from ${FORGE_DATA_PATH}`)

    if (!fs.existsSync(FORGE_DATA_PATH)) {
      throw new Error(`Forge data file not found: ${FORGE_DATA_PATH}. Run 'npm run generate:data' first.`)
    }

    const raw = fs.readFileSync(FORGE_DATA_PATH, 'utf-8')
    const data: ForgeData = JSON.parse(raw)

    this.itemsMap.clear()
    this.slotIndex.clear()
    this.weapons = []
    this.generatedAt = data.generatedAt

    let slotCount = 0

    for (const item of Object.values(data.items)) {
      this.itemsMap.set(item.id, item)

      if (item.weapon) {
        this.weapons.push(item)
      }

      // Build slot index: slotId → { itemId, slot }
      for (const slot of item.slots) {
        this.slotIndex.set(slot.id, { itemId: item.id, slot })
        slotCount++
      }
    }

    // Load presets
    if (data.presets) {
      for (const [weaponId, pairs] of Object.entries(data.presets)) {
        this.presetsMap.set(weaponId, pairs)
      }
    }

    console.log(`[dataLoader] Loaded ${this.itemsMap.size} items, ${slotCount} slots, ${this.weapons.length} weapons, ${this.presetsMap.size} presets`)
    console.log(`[dataLoader] Data generated at: ${this.generatedAt}`)
  }

  getItem(id: string): ForgeItem | undefined {
    return this.itemsMap.get(id)
  }

  getItems(ids: string[]): ForgeItem[] {
    return ids
      .map(id => this.itemsMap.get(id))
      .filter((item): item is ForgeItem => item !== undefined)
  }

  getSlots(itemId: string): SlotInfo[] {
    return this.itemsMap.get(itemId)?.slots ?? []
  }

  getSlotOwner(slotId: string): SlotOwner | undefined {
    return this.slotIndex.get(slotId)
  }

/** Get allowed items for a slot by parent item ID and slot name */
  getAllowedItems(itemId: string, slotName: string): ForgeItem[] {
    const item = this.itemsMap.get(itemId)
    if (!item) return []
    const slot = item.slots.find(s => s.name === slotName)
    if (!slot) return []
    return slot.filter
      .map(id => this.itemsMap.get(id))
      .filter((item): item is ForgeItem => item !== undefined)
  }

  getWeapons(): ForgeItem[] {
    return this.weapons
  }

  getPresets(weaponId: string): Array<{ slotName: string; itemId: string }> {
    return this.presetsMap.get(weaponId) ?? []
  }

  /** Search for ammo items by caliber (case-insensitive partial match) */
  searchByCaliber(caliber: string): ForgeItem[] {
    const lower = caliber.toLowerCase()
    const results: ForgeItem[] = []
    for (const item of this.itemsMap.values()) {
      if (item.ammo && item.ammo.caliber.toLowerCase().includes(lower)) {
        results.push(item)
      }
    }
    // Sort by damage descending
    results.sort((a, b) => (b.ammo?.damage ?? 0) - (a.ammo?.damage ?? 0))
    return results
  }

  get size(): number {
    return this.itemsMap.size
  }

  get stats() {
    return {
      totalItems: this.itemsMap.size,
      totalSlots: this.slotIndex.size,
      totalWeapons: this.weapons.length,
      generatedAt: this.generatedAt,
    }
  }
}

export const forgeData = new ForgeDataStore()
