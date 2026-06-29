import { readItems, readStimulatorBuffs } from './readers/items.js'
import { readHandbook } from './readers/handbook.js'
import { readLocales } from './readers/locales.js'
import { readMods } from './readers/mods.js'
import { buildTypeHierarchy } from './processors/types.js'
import { mergeModItems, mergeModLocales } from './processors/merge.js'
import { normalizeItems } from './processors/normalize.js'
import { buildCategories } from './processors/categories.js'
import { downloadImages, checkServerAvailability, populateCachedImages } from './images/downloader.js'
import { writeOutput } from './output/writer.js'

async function main() {
  const args = process.argv.slice(2)
  const imagesOnly = args.includes('--images-only')
  const skipImages = args.includes('--skip-images')

  console.log('=== SPT Wiki Generator ===\n')
  const startTime = Date.now()

  // Step 1: Read base data
  console.log('--- Step 1: Reading base data ---')
  const baseItems = readItems()
  const handbook = readHandbook()
  const baseLocales = readLocales()
  const stimBuffsMap = readStimulatorBuffs()

  // Step 2: Read mod data
  console.log('\n--- Step 2: Reading mod data ---')
  const mods = readMods()

  // Step 3: Merge mod data into base
  console.log('\n--- Step 3: Merging mod data ---')
  const { items: mergedItems, modItemIds } = mergeModItems(baseItems, mods)
  const mergedLocales = mergeModLocales(baseLocales, mods)

  // Step 4: Build type hierarchy
  console.log('\n--- Step 4: Building type hierarchy ---')
  const { typeNodes, itemTypeMap, typeChain } = buildTypeHierarchy(mergedItems)

  // Step 5: Normalize items to wiki format
  console.log('\n--- Step 5: Normalizing items ---')
  const wikiItems = normalizeItems({
    items: mergedItems,
    handbook,
    locales: mergedLocales,
    itemTypeMap,
    typeChain,
    modItemIds,
    stimBuffsMap,
  })

  // Step 6: Build categories
  console.log('\n--- Step 6: Building categories ---')
  const wikiCategories = buildCategories(handbook, mergedLocales, wikiItems)

  // Step 7: Collect type nodes for output
  const types = Array.from(typeNodes.values())

  // Step 8: Handle images
  if (!skipImages && !imagesOnly) {
    console.log('\n--- Step 7: Downloading images ---')
    const serverAvailable = await checkServerAvailability()
    if (serverAvailable) {
      await downloadImages(wikiItems)
    } else {
      console.log('[images] tarkov.dev API not available, using cached images')
      populateCachedImages(wikiItems)
    }
  } else if (imagesOnly) {
    console.log('\n--- Images-only mode ---')
    const serverAvailable = await checkServerAvailability()
    if (serverAvailable) {
      await downloadImages(wikiItems)
      // Re-write output with updated image paths
      console.log('[images] Updating data files with image paths')
      writeOutput(wikiItems, wikiCategories, types, modItemIds.size)
    } else {
      console.log('[images] tarkov.dev API not available. Check network connection.')
      process.exit(1)
    }
  } else {
    // --skip-images: still populate from cache
    console.log('\n--- Step 7: Checking cached images ---')
    populateCachedImages(wikiItems)
  }

  // Step 9: Write output
  if (!imagesOnly) {
    // Update category preview images now that item images are populated
    for (const cat of wikiCategories) {
      if (cat.itemCount > 0 && !cat.previewImage) {
        const firstItem = wikiItems.find(i => i.handbook.categoryId === cat.id && i.image)
        if (firstItem) cat.previewImage = firstItem.image
      }
    }

    console.log('\n--- Writing output ---')
    writeOutput(wikiItems, wikiCategories, types, modItemIds.size)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n=== Generation complete in ${elapsed}s ===`)
}

main().catch(err => {
  console.error('Generator failed:', err)
  process.exit(1)
})
