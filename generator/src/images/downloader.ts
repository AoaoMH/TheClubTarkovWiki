import fs from 'fs'
import path from 'path'
import { OUTPUT_IMAGES_ITEMS_PATH, EXPORTED_ICONS_PATH } from '../config.js'
import type { WikiItem } from '../types.js'

const TARKOV_DEV_GRAPHQL = 'https://api.tarkov.dev/graphql'
const BATCH_SIZE = 50

function progressBar(current: number, total: number, width = 40): string {
  const pct = current / total
  const filled = Math.round(width * pct)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}] ${current}/${total} (${(pct * 100).toFixed(1)}%)`
}

/**
 * Check if a file exists in the exported icons directory.
 */
function getExportedIconPath(itemId: string): string | null {
  const iconPath = path.join(EXPORTED_ICONS_PATH, `${itemId}.png`)
  return fs.existsSync(iconPath) ? iconPath : null
}

/**
 * Fetch all item image URLs from tarkov.dev GraphQL API.
 */
async function fetchImageUrls(): Promise<Map<string, string>> {
  console.log(`[images] Fetching image URLs from tarkov.dev API...`)
  const r = await fetch(TARKOV_DEV_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ items { id iconLink } }' }),
    signal: AbortSignal.timeout(30000),
  })
  const data = await r.json()
  const items = data.data?.items || []
  const map = new Map<string, string>()
  for (const item of items) {
    if (item.iconLink) map.set(item.id, item.iconLink)
  }
  console.log(`[images] tarkov.dev has ${map.size} item images`)
  return map
}

/**
 * Process item images:
 * 1. Copy from exported game icons (highest priority — includes mod items)
 * 2. Download from tarkov.dev for items without exported icons (original items only)
 * 3. Skip already cached images (incremental)
 */
export async function downloadImages(items: WikiItem[]): Promise<void> {
  if (!fs.existsSync(OUTPUT_IMAGES_ITEMS_PATH)) {
    fs.mkdirSync(OUTPUT_IMAGES_ITEMS_PATH, { recursive: true })
  }

  // Check exported icons availability
  const hasExportedIcons = fs.existsSync(EXPORTED_ICONS_PATH)
  let exportedCount = 0
  if (hasExportedIcons) {
    const exportedFiles = fs.readdirSync(EXPORTED_ICONS_PATH).filter(f => f.endsWith('.png'))
    console.log(`[images] Exported game icons available: ${exportedFiles.length} files`)
  } else {
    console.log(`[images] No exported game icons found at ${EXPORTED_ICONS_PATH}`)
  }

  // Get tarkov.dev URLs as fallback
  const imageUrlMap = await fetchImageUrls()

  console.log(`[images] Total wiki items: ${items.length}\n`)

  let exported = 0
  let downloaded = 0
  let skipped = 0
  let failed = 0
  let noIcon = 0

  // First pass: check cached images in output directory
  for (const item of items) {
    for (const ext of ['.webp', '.jpg', '.png']) {
      const imgPath = path.join(OUTPUT_IMAGES_ITEMS_PATH, `${item.id}${ext}`)
      if (fs.existsSync(imgPath)) {
        item.image = `/images/items/${item.id}${ext}`
        skipped++
        break
      }
    }
  }

  // Second pass: copy exported game icons for items without cached images
  if (hasExportedIcons) {
    for (const item of items) {
      if (item.image) continue // already has cached image
      const exportedPath = getExportedIconPath(item.id)
      if (exportedPath) {
        const destPath = path.join(OUTPUT_IMAGES_ITEMS_PATH, `${item.id}.png`)
        fs.copyFileSync(exportedPath, destPath)
        item.image = `/images/items/${item.id}.png`
        exported++
      }
    }
  }

  // Third pass: download remaining items from tarkov.dev (original items only)
  const toDownload = items.filter(item => !item.image && imageUrlMap.has(item.id))
  const noIconItems = items.filter(item => !item.image && !imageUrlMap.has(item.id))
  noIcon = noIconItems.length

  console.log(`[images] Cached: ${skipped}, Exported: ${exported}, To download: ${toDownload.length}, No icon: ${noIcon}\n`)

  if (toDownload.length === 0) {
    console.log(`[images] All available images processed!\n`)
    return
  }

  // Print initial progress
  const total = items.length
  let processed = skipped + exported + noIcon
  process.stdout.write(`\r  ${progressBar(processed, total)} DL:${downloaded} Exp:${exported} Skip:${skipped} Fail:${failed} NoIcon:${noIcon}`)

  // Download in batches
  for (let i = 0; i < toDownload.length; i += BATCH_SIZE) {
    const batch = toDownload.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const url = imageUrlMap.get(item.id)!
        const ext = path.extname(new URL(url).pathname) || '.webp'
        const imgPath = path.join(OUTPUT_IMAGES_ITEMS_PATH, `${item.id}${ext}`)
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          fs.writeFileSync(imgPath, buffer)
          item.image = `/images/items/${item.id}${ext}`
          return 'downloaded'
        }
        return 'failed'
      })
    )

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value === 'downloaded') downloaded++
        else failed++
      } else {
        failed++
      }
    }

    processed = skipped + exported + downloaded + failed + noIcon
    process.stdout.write(`\r  ${progressBar(processed, total)} DL:${downloaded} Exp:${exported} Skip:${skipped} Fail:${failed} NoIcon:${noIcon}  `)
  }

  console.log(`\n\n[images] Complete!`)
  console.log(`  Exported game icons: ${exported}`)
  console.log(`  Downloaded from tarkov.dev: ${downloaded}`)
  console.log(`  Cached (skipped): ${skipped}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  No icon available: ${noIcon}`)
}

/**
 * Check if tarkov.dev API is accessible.
 */
export async function checkServerAvailability(): Promise<boolean> {
  try {
    const response = await fetch(TARKOV_DEV_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ items(limit: 1) { id } }' }),
      signal: AbortSignal.timeout(10000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Populate image paths from cached files without downloading.
 * Used when --skip-images is set to preserve previously downloaded images.
 */
export function populateCachedImages(items: WikiItem[]): void {
  if (!fs.existsSync(OUTPUT_IMAGES_ITEMS_PATH)) return

  let count = 0
  for (const item of items) {
    if (item.image) continue
    for (const ext of ['.webp', '.jpg', '.png']) {
      const imgPath = `${item.id}${ext}`
      if (fs.existsSync(path.join(OUTPUT_IMAGES_ITEMS_PATH, imgPath))) {
        item.image = `/images/items/${imgPath}`
        count++
        break
      }
    }
  }
  console.log(`[images] Populated ${count} image paths from cache`)
}
