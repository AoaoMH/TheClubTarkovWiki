import fs from 'fs'
import { ITEMS_FILE, GLOBALS_FILE, ITEM_PRESETS_FILE } from '../config.js'
import type { SPTItemsMap, StimulatorBuffsMap } from '../types.js'
import type { FactoryPreset, PresetMap } from '../processors/forge.js'

/**
 * Read items.json from SPT database.
 * Uses JSON.parse (not ConvertFrom-Json) which handles duplicate keys
 * by keeping the last occurrence.
 */
export function readItems(): SPTItemsMap {
  console.log(`[items] Reading ${ITEMS_FILE}`)
  const raw = fs.readFileSync(ITEMS_FILE, 'utf-8')
  const data = JSON.parse(raw) as SPTItemsMap
  const count = Object.keys(data).length
  console.log(`[items] Loaded ${count} items`)
  return data
}

/**
 * Read globals.json from SPT database and extract stimulator buffs.
 * Path: config.Health.Effects.Stimulator.Buffs.{buffId}
 */
export function readStimulatorBuffs(): StimulatorBuffsMap {
  if (!fs.existsSync(GLOBALS_FILE)) {
    console.warn(`[globals] ${GLOBALS_FILE} not found, stimulator buffs will be empty`)
    return {}
  }
  console.log(`[globals] Reading ${GLOBALS_FILE}`)
  const raw = fs.readFileSync(GLOBALS_FILE, 'utf-8')
  const data = JSON.parse(raw)
  const buffs = data?.config?.Health?.Effects?.Stimulator?.Buffs
  if (!buffs || typeof buffs !== 'object') {
    console.warn('[globals] No Stimulator.Buffs found in globals.json')
    return {}
  }
  const count = Object.keys(buffs).length
  console.log(`[globals] Loaded ${count} stimulator buff definitions`)
  return buffs as StimulatorBuffsMap
}

/**
 * Read ItemPresets from the Profile Editor's exported database.
 * Returns a map of weaponId -> array of {slotName, itemId} pairs.
 */
export function readItemPresets(): PresetMap {
  if (!fs.existsSync(ITEM_PRESETS_FILE)) {
    console.warn(`[presets] ${ITEM_PRESETS_FILE} not found, factory presets will be empty`)
    return {}
  }
  console.log(`[presets] Reading ${ITEM_PRESETS_FILE}`)
  const raw = fs.readFileSync(ITEM_PRESETS_FILE, 'utf-8')
  const data = JSON.parse(raw) as Record<string, {
    _encyclopedia: string
    _items: Array<{ _id: string; _tpl: string; parentId?: string; slotId?: string }>
  }>

  const presets: PresetMap = {}
  let count = 0

  for (const preset of Object.values(data)) {
    const weaponId = preset._encyclopedia
    if (!weaponId) continue

    // Find the gun's instance _id (first item)
    const gunItem = preset._items.find(i => i._tpl === weaponId)
    if (!gunItem) continue
    const gunInstanceId = gunItem._id

    // Extract top-level attachments (parentId === gun's instance id)
    const pairs: FactoryPreset[] = []
    for (const item of preset._items) {
      if (item.parentId === gunInstanceId && item.slotId && item._tpl) {
        pairs.push({ slotName: item.slotId, itemId: item._tpl })
      }
    }

    // Also extract nested attachments (attachments on other attachments)
    // Build a parent map: instanceId -> {slotId, _tpl, parentId}
    const instanceMap = new Map<string, { slotId?: string; _tpl: string; parentId?: string }>()
    for (const item of preset._items) {
      instanceMap.set(item._id, { slotId: item.slotId, _tpl: item._tpl, parentId: item.parentId })
    }
    // Walk up the parent chain to find the root attachment's slotId on the gun
    for (const item of preset._items) {
      if (item.parentId === gunInstanceId || !item.parentId) continue
      // Walk up to find the top-level parent that's directly on the gun
      let current = item
      const chain: string[] = []
      while (current.parentId && current.parentId !== gunInstanceId) {
        chain.unshift(current.slotId || '')
        const parent = instanceMap.get(current.parentId)
        if (!parent) break
        current = { _id: '', _tpl: parent._tpl, parentId: parent.parentId, slotId: parent.slotId }
      }
      if (current.parentId === gunInstanceId && current.slotId) {
        // This is a nested attachment; store with full path
        const fullPath = [current.slotId, ...chain].join(':')
        pairs.push({ slotName: fullPath, itemId: item._tpl })
      }
    }

    if (pairs.length > 0) {
      presets[weaponId] = pairs
      count++
    }
  }

  console.log(`[presets] Loaded ${count} weapon presets (from ${Object.keys(data).length} total presets)`)
  return presets
}
