import fs from 'fs'
import { ITEMS_FILE, GLOBALS_FILE } from '../config.js'
import type { SPTItemsMap, StimulatorBuffsMap } from '../types.js'

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
