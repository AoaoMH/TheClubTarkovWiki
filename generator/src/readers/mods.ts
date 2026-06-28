import fs from 'fs'
import path from 'path'
import { MODS_PATH } from '../config.js'
import type { ModCustomItemsMap, Locales } from '../types.js'

export interface ModData {
  name: string
  items: ModCustomItemsMap
  locales: { zh: Locales; en: Locales }
}

/**
 * Scan all mod directories for CustomItems and CustomLocales.
 */
export function readMods(): ModData[] {
  console.log(`[mods] Scanning mods directory: ${MODS_PATH}`)
  const mods: ModData[] = []

  if (!fs.existsSync(MODS_PATH)) {
    console.log(`[mods] Mods directory not found, skipping`)
    return mods
  }

  const modDirs = fs.readdirSync(MODS_PATH, { withFileTypes: true })
    .filter(d => d.isDirectory())

  for (const modDir of modDirs) {
    const modPath = path.join(MODS_PATH, modDir.name)
    const customItemsPath = path.join(modPath, 'db', 'CustomItems')
    const customLocalesPath = path.join(modPath, 'db', 'CustomLocales')

    // Read CustomItems
    const items: ModCustomItemsMap = {}
    if (fs.existsSync(customItemsPath)) {
      const files = fs.readdirSync(customItemsPath).filter(f => f.endsWith('.json'))
      for (const file of files) {
        try {
          let raw = fs.readFileSync(path.join(customItemsPath, file), 'utf-8')
          // Strip BOM if present
          if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)
          const data = JSON.parse(raw) as ModCustomItemsMap
          Object.assign(items, data)
        } catch (e) {
          console.warn(`[mods] Failed to parse ${modDir.name}/CustomItems/${file}:`, e)
        }
      }
    }

    // Read CustomLocales
    const locales: { zh: Locales; en: Locales } = { zh: {}, en: {} }
    if (fs.existsSync(customLocalesPath)) {
      const chFile = path.join(customLocalesPath, 'ch.json')
      const enFile = path.join(customLocalesPath, 'en.json')
      if (fs.existsSync(chFile)) {
        try {
          locales.zh = JSON.parse(fs.readFileSync(chFile, 'utf-8'))
        } catch (e) {
          console.warn(`[mods] Failed to parse ${modDir.name}/CustomLocales/ch.json:`, e)
        }
      }
      if (fs.existsSync(enFile)) {
        try {
          locales.en = JSON.parse(fs.readFileSync(enFile, 'utf-8'))
        } catch (e) {
          console.warn(`[mods] Failed to parse ${modDir.name}/CustomLocales/en.json:`, e)
        }
      }
    }

    const itemCount = Object.keys(items).length
    if (itemCount > 0) {
      console.log(`[mods] ${modDir.name}: ${itemCount} custom items, zh=${Object.keys(locales.zh).length} en=${Object.keys(locales.en).length} locale keys`)
      mods.push({ name: modDir.name, items, locales })
    }
  }

  const totalModItems = mods.reduce((sum, m) => sum + Object.keys(m.items).length, 0)
  console.log(`[mods] Total: ${mods.length} mods with items, ${totalModItems} custom items`)
  return mods
}
