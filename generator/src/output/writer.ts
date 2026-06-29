import fs from 'fs'
import path from 'path'
import { OUTPUT_DATA_PATH } from '../config.js'
import type { WikiItem, WikiCategory, WikiTypeNode, ItemSummary, ItemNameEntry } from '../types.js'
import type { WikiQuestSummary, WikiQuestDetail } from '../processors/quests.js'

/**
 * Extract a lightweight summary from a WikiItem for list views and search.
 */
function toSummary(item: WikiItem): ItemSummary {
  const summary: ItemSummary = {
    id: item.id,
    typeName: item.typeName,
    category: item.category,
    handbook: item.handbook,
    common: {
      name: item.common.name,
      shortName: item.common.shortName,
      rarity: item.common.rarity,
    },
    image: item.image,
  }

  // Include ammo-specific fields for AmmoPage grouping/sorting
  if (item.properties.ammo) {
    summary.ammo = {
      caliber: item.properties.ammo.caliber,
      penetrationPower: item.properties.ammo.penetrationPower,
      damage: item.properties.ammo.damage,
      armorDamage: item.properties.ammo.armorDamage,
    }
  }

  return summary
}

/**
 * Write all generated data to the frontend's data directory.
 * Outputs:
 *   - categories.json, types.json, stats.json (unchanged)
 *   - search-index.json (all summaries for search)
 *   - summaries/{categoryId}.json (per-category item summaries)
 *   - items/{itemId}.json (individual full item data)
 */
export function writeOutput(
  items: WikiItem[],
  categories: WikiCategory[],
  types: WikiTypeNode[],
  modItemCount: number,
  itemNames: Record<string, ItemNameEntry>,
  questSummaries?: WikiQuestSummary[],
  questDetails?: Map<string, WikiQuestDetail>
): void {
  console.log(`[output] Writing data to ${OUTPUT_DATA_PATH}`)

  // Ensure output directories
  if (!fs.existsSync(OUTPUT_DATA_PATH)) {
    fs.mkdirSync(OUTPUT_DATA_PATH, { recursive: true })
  }

  const summariesDir = path.join(OUTPUT_DATA_PATH, 'summaries')
  const itemsDir = path.join(OUTPUT_DATA_PATH, 'items')

  // Clean and recreate directories
  if (fs.existsSync(summariesDir)) {
    for (const f of fs.readdirSync(summariesDir)) {
      fs.unlinkSync(path.join(summariesDir, f))
    }
  } else {
    fs.mkdirSync(summariesDir, { recursive: true })
  }

  if (fs.existsSync(itemsDir)) {
    for (const f of fs.readdirSync(itemsDir)) {
      fs.unlinkSync(path.join(itemsDir, f))
    }
  } else {
    fs.mkdirSync(itemsDir, { recursive: true })
  }

  // Remove old items.json if it exists
  const oldItemsPath = path.join(OUTPUT_DATA_PATH, 'items.json')
  if (fs.existsSync(oldItemsPath)) {
    fs.unlinkSync(oldItemsPath)
    console.log('[output] Removed old items.json')
  }

  // Build summaries and group by categoryId
  const allSummaries: ItemSummary[] = []
  const groupedSummaries = new Map<string, ItemSummary[]>()

  for (const item of items) {
    const summary = toSummary(item)
    allSummaries.push(summary)

    const catId = item.handbook.categoryId || '_uncategorized'
    const group = groupedSummaries.get(catId) || []
    group.push(summary)
    groupedSummaries.set(catId, group)
  }

  // Write search-index.json
  const searchIndexPath = path.join(OUTPUT_DATA_PATH, 'search-index.json')
  fs.writeFileSync(searchIndexPath, JSON.stringify(allSummaries), 'utf-8')
  console.log(`[output] search-index.json: ${allSummaries.length} summaries (${(fs.statSync(searchIndexPath).size / 1024).toFixed(0)} KB)`)

  // Write per-category summaries
  for (const [catId, summaries] of groupedSummaries) {
    const filePath = path.join(summariesDir, `${catId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(summaries, null, 2), 'utf-8')
  }
  console.log(`[output] summaries/: ${groupedSummaries.size} category files`)

  // Write individual item files
  for (const item of items) {
    const filePath = path.join(itemsDir, `${item.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(item, null, 2), 'utf-8')
  }
  console.log(`[output] items/: ${items.length} individual files`)

  // Write categories.json
  const categoriesPath = path.join(OUTPUT_DATA_PATH, 'categories.json')
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8')
  console.log(`[output] categories.json: ${categories.length} categories`)

  // Write types.json
  const typesPath = path.join(OUTPUT_DATA_PATH, 'types.json')
  fs.writeFileSync(typesPath, JSON.stringify(types, null, 2), 'utf-8')
  console.log(`[output] types.json: ${types.length} type nodes`)

  // Write item-names.json (name lookup for non-wiki items)
  const itemNamesPath = path.join(OUTPUT_DATA_PATH, 'item-names.json')
  fs.writeFileSync(itemNamesPath, JSON.stringify(itemNames, null, 2), 'utf-8')
  console.log(`[output] item-names.json: ${Object.keys(itemNames).length} entries (${(fs.statSync(itemNamesPath).size / 1024).toFixed(0)} KB)`)

  // Write stats
  const stats = {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    totalCategories: categories.length,
    totalTypes: types.length,
    modItems: modItemCount,
    categoriesBreakdown: categories
      .filter(c => c.itemCount > 0)
      .sort((a, b) => b.itemCount - a.itemCount)
      .map(c => ({ name: c.name.en, count: c.itemCount })),
  }
  const statsPath = path.join(OUTPUT_DATA_PATH, 'stats.json')
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8')
  console.log(`[output] stats.json written`)

  console.log(`\n[output] Done! Summary:`)
  console.log(`  Total items: ${items.length}`)
  console.log(`  Categories with items: ${categories.filter(c => c.itemCount > 0).length}`)
  console.log(`  Mod items: ${modItemCount}`)

  // Write quest data
  if (questSummaries && questSummaries.length > 0) {
    const questsDir = path.join(OUTPUT_DATA_PATH, 'quests')

    // Clean and recreate quests directory
    if (fs.existsSync(questsDir)) {
      for (const f of fs.readdirSync(questsDir)) {
        fs.unlinkSync(path.join(questsDir, f))
      }
    } else {
      fs.mkdirSync(questsDir, { recursive: true })
    }

    // Write quests.json (list summaries)
    const questsListPath = path.join(OUTPUT_DATA_PATH, 'quests.json')
    fs.writeFileSync(questsListPath, JSON.stringify(questSummaries), 'utf-8')
    console.log(`[output] quests.json: ${questSummaries.length} quest summaries`)

    // Write individual quest detail files
    if (questDetails) {
      for (const [questId, detail] of questDetails) {
        const filePath = path.join(questsDir, `${questId}.json`)
        fs.writeFileSync(filePath, JSON.stringify(detail, null, 2), 'utf-8')
      }
      console.log(`[output] quests/: ${questDetails.size} individual files`)
    }
  }
}

