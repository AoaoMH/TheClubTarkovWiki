import fs from 'fs'
import path from 'path'
import { OUTPUT_IMAGES_ITEMS_PATH } from '../config.js'
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
 * Download item images using tarkov.dev CDN URLs.
 * Skips already downloaded images (incremental).
 * Skips mod items (isMod === true) as they have no online images.
 */
export async function downloadImages(items: WikiItem[]): Promise<void> {
  // Step 1: Get image URLs from tarkov.dev API
  const imageUrlMap = await fetchImageUrls()

  // Filter out mod items — they won't have online images
  const downloadableItems = items.filter(item => !item.isMod)
  const modSkipped = items.length - downloadableItems.length

  console.log(`[images] Total wiki items: ${items.length}, Downloadable (non-mod): ${downloadableItems.length}, Mod skipped: ${modSkipped}, Concurrency: ${BATCH_SIZE}\n`)

  if (!fs.existsSync(OUTPUT_IMAGES_ITEMS_PATH)) {
    fs.mkdirSync(OUTPUT_IMAGES_ITEMS_PATH, { recursive: true })
  }

  let downloaded = 0
  let skipped = 0
  let failed = 0
  let noUrl = 0

  // First pass: check cached images
  for (const item of downloadableItems) {
    for (const ext of ['.webp', '.jpg', '.png']) {
      const imgPath = path.join(OUTPUT_IMAGES_ITEMS_PATH, `${item.id}${ext}`)
      if (fs.existsSync(imgPath)) {
        item.image = `/images/items/${item.id}${ext}`
        skipped++
        break
      }
    }
  }

  // Items that need downloading
  const toDownload = downloadableItems.filter(item => !item.image && imageUrlMap.has(item.id))
  const noUrlItems = downloadableItems.filter(item => !item.image && !imageUrlMap.has(item.id))
  noUrl = noUrlItems.length

  console.log(`[images] Cached: ${skipped}, To download: ${toDownload.length}, No URL (placeholder): ${noUrl}\n`)

  if (toDownload.length === 0) {
    console.log(`[images] All available images already cached!\n`)
    return
  }

  // Print initial progress
  const total = downloadableItems.length
  let processed = skipped + noUrl
  process.stdout.write(`\r  ${progressBar(processed, total)} DL:${downloaded} Skip:${skipped} Fail:${failed} NoURL:${noUrl}`)

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

    processed = skipped + downloaded + failed + noUrl
    process.stdout.write(`\r  ${progressBar(processed, total)} DL:${downloaded} Skip:${skipped} Fail:${failed} NoURL:${noUrl}  `)
  }

  console.log(`\n\n[images] Complete!`)
  console.log(`  Downloaded: ${downloaded}`)
  console.log(`  Cached (skipped): ${skipped}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  No image URL (placeholder): ${noUrl}`)
  console.log(`  Mod items (skipped): ${modSkipped}`)
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
