import type { SPTItemsMap, SPTItem, ModCustomItemsMap, Locales } from '../types.js'
import type { ModData } from '../readers/mods.js'

/**
 * Merge mod custom items into the base items map.
 * For each custom item:
 * 1. Clone the base template (itemTplToClone)
 * 2. Override with custom properties
 * 3. Set new ID and parent
 */
export function mergeModItems(
  baseItems: SPTItemsMap,
  mods: ModData[]
): { items: SPTItemsMap; modItemIds: Set<string> } {
  const items = { ...baseItems }
  const modItemIds = new Set<string>()

  for (const mod of mods) {
    for (const [itemId, customItem] of Object.entries(mod.items)) {
      const baseTemplate = items[customItem.itemTplToClone]
      if (!baseTemplate) {
        console.warn(`[merge] Template ${customItem.itemTplToClone} not found for mod item ${itemId} in ${mod.name}`)
        continue
      }

      // Deep clone the base item
      const cloned: SPTItem = JSON.parse(JSON.stringify(baseTemplate))
      cloned._id = itemId
      cloned._parent = customItem.parentId || baseTemplate._parent

      // Apply override properties
      if (customItem.overrideProperties) {
        cloned._props = { ...cloned._props, ...customItem.overrideProperties }

        // Handle Slots override specially (replace entirely if provided)
        if (customItem.overrideProperties.Slots) {
          cloned._props.Slots = customItem.overrideProperties.Slots
        }
      }

      items[itemId] = cloned
      modItemIds.add(itemId)
    }
  }

  console.log(`[merge] Total items after merge: ${Object.keys(items).length} (added ${modItemIds.size} mod items)`)
  return { items, modItemIds }
}

/**
 * Merge mod locales into base locales.
 */
export function mergeModLocales(
  baseLocales: { zh: Locales; en: Locales },
  mods: ModData[]
): { zh: Locales; en: Locales } {
  const zh = { ...baseLocales.zh }
  const en = { ...baseLocales.en }

  for (const mod of mods) {
    Object.assign(zh, mod.locales.zh)
    Object.assign(en, mod.locales.en)
  }

  console.log(`[merge] Locales merged: zh=${Object.keys(zh).length} en=${Object.keys(en).length}`)
  return { zh, en }
}
