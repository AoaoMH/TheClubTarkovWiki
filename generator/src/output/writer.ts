import fs from 'fs'
import path from 'path'
import { OUTPUT_DATA_PATH } from '../config.js'
import type { WikiItem, WikiCategory, WikiTypeNode } from '../types.js'

/**
 * Write all generated data to the frontend's data directory.
 */
export function writeOutput(
  items: WikiItem[],
  categories: WikiCategory[],
  types: WikiTypeNode[],
  modItemCount: number
): void {
  console.log(`[output] Writing data to ${OUTPUT_DATA_PATH}`)

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DATA_PATH)) {
    fs.mkdirSync(OUTPUT_DATA_PATH, { recursive: true })
  }

  // Write items.json
  const itemsPath = path.join(OUTPUT_DATA_PATH, 'items.json')
  fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2), 'utf-8')
  console.log(`[output] items.json: ${items.length} items (${(fs.statSync(itemsPath).size / 1024 / 1024).toFixed(2)} MB)`)

  // Write categories.json
  const categoriesPath = path.join(OUTPUT_DATA_PATH, 'categories.json')
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8')
  console.log(`[output] categories.json: ${categories.length} categories`)

  // Write types.json
  const typesPath = path.join(OUTPUT_DATA_PATH, 'types.json')
  fs.writeFileSync(typesPath, JSON.stringify(types, null, 2), 'utf-8')
  console.log(`[output] types.json: ${types.length} type nodes`)

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
}
