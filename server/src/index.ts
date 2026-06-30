import express from 'express'
import cors from 'cors'
import { forgeData } from './dataLoader.js'
import type { ForgeItem, BuildStats, ConflictResult } from './types.js'

const app = express()
const PORT = process.env.PORT || 3001

// --- Middleware ---
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'],
  credentials: true,
}))
app.use(express.json({ limit: '5mb' }))

// --- Load forge data at startup ---
try {
  forgeData.load()
} catch (err) {
  console.error('Failed to load forge data:', err)
  console.error('Run "npm run generate:data" in the project root first.')
  process.exit(1)
}

// --- Conflict check helper (shared by validate and prices endpoints) ---
function checkConflict(candidateId: string, installedIds: string[], lang: string = 'zh'): ConflictResult {
  const candidate = forgeData.getItem(candidateId)
  if (!candidate) {
    return { valid: true, reasonKey: null, reasonName: null, conflictingItemId: null, conflictingSlotId: null }
  }

  const itemName = (item: ForgeItem) => lang === 'zh' ? item.name.zh : item.name.en

  // Check 1: candidate's conflictingItems vs installed items
  if (candidate.conflictingItems.length > 0) {
    const conflictSet = new Set(candidate.conflictingItems)
    for (const instId of installedIds) {
      if (conflictSet.has(instId)) {
        const conflicting = forgeData.getItem(instId)
        return {
          valid: false,
          reasonKey: 'conflict.incompatibleWith',
          reasonName: conflicting ? itemName(conflicting) : instId,
          conflictingItemId: instId,
          conflictingSlotId: null,
        }
      }
    }
  }

  // Check 2: reverse — installed items' conflictingItems vs candidate
  for (const instId of installedIds) {
    const instItem = forgeData.getItem(instId)
    if (!instItem) continue
    if (instItem.conflictingItems.includes(candidateId)) {
      return {
        valid: false,
        reasonKey: 'conflict.incompatibleWith',
        reasonName: itemName(instItem),
        conflictingItemId: instItem.id,
        conflictingSlotId: null,
      }
    }
  }

  return { valid: true, reasonKey: null, reasonName: null, conflictingItemId: null, conflictingSlotId: null }
}

// --- In-memory price cache (avoids redundant tarkov.dev API calls) ---
interface CachedPrice {
  data: {
    fleaPrice: number | null
    bestBuyPrice: number | null
    bestBuySource: string | null
    bestSellPrice: number | null
    bestSellSource: string | null
  }
  expires: number
}
const priceCache = new Map<string, CachedPrice>()
const PRICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// --- Health check ---
app.get('/api/forge/health', (_req, res) => {
  res.json({
    status: 'ok',
    ...forgeData.stats,
  })
})

// --- Gun init: GET /api/forge/guns/:gunId/init ---
app.get('/api/forge/guns/:gunId/init', (req, res) => {
  const { gunId } = req.params
  const lang = (req.query.lang as string) || 'zh'
  const gun = forgeData.getItem(gunId)

  if (!gun) {
    res.status(404).json({ error: 'Gun not found' })
    return
  }
  if (!gun.weapon) {
    res.status(400).json({ error: 'Item is not a weapon' })
    return
  }

  // Resolve allowed items for each slot
  const slots = gun.slots.map(slot => {
    const allowed = forgeData.getAllowedItems(gunId, slot.name)
    return {
      ...slot,
      allowedItems: allowed.map(item => ({
        id: item.id,
        name: lang === 'zh' ? item.name.zh : item.name.en,
        shortName: lang === 'zh' ? item.shortName.zh : item.shortName.en,
        image: item.image,
        weight: item.weight,
        ergonomicsModifier: item.mod?.ergonomics ?? 0,
        recoil: item.mod?.recoil ?? 0,
        recoilForceUp: item.mod?.recoilForceUp ?? 0,
        recoilForceBack: item.mod?.recoilForceBack ?? 0,
        accuracy: item.mod?.accuracy ?? 0,
        centerOfImpact: item.centerOfImpact,
        sightingRange: item.mod?.sightingRange ?? null,
        conflictingItems: item.conflictingItems,
        magazineCapacity: item.magazineCapacity ?? null,
      })),
    }
  })

  res.json({
    id: gun.id,
    name: lang === 'zh' ? gun.name.zh : gun.name.en,
    shortName: lang === 'zh' ? gun.shortName.zh : gun.shortName.en,
    image: gun.image,
    weight: gun.weight,
    weapon: gun.weapon,
    slots,
    centerOfImpact: gun.centerOfImpact,
    conflictingItems: gun.conflictingItems,
    factoryPreset: forgeData.getPresets(gunId),
  })
})

// --- Item slots: GET /api/forge/items/:itemId/slots ---
app.get('/api/forge/items/:itemId/slots', (req, res) => {
  const { itemId } = req.params
  const item = forgeData.getItem(itemId)

  if (!item) {
    res.status(404).json({ error: 'Item not found' })
    return
  }

  res.json({ itemId, slots: item.slots })
})

// --- Slot allowed items: GET /api/forge/items/:itemId/slots/:slotName/allowed-items ---
app.get('/api/forge/items/:itemId/slots/:slotName/allowed-items', (req, res) => {
  const { itemId, slotName } = req.params
  const lang = (req.query.lang as string) || 'zh'
  const allowed = forgeData.getAllowedItems(itemId, slotName)

  res.json({
    itemId,
    slotName,
    items: allowed.map(item => ({
      id: item.id,
      name: lang === 'zh' ? item.name.zh : item.name.en,
      shortName: lang === 'zh' ? item.shortName.zh : item.shortName.en,
      image: item.image,
      weight: item.weight,
      ergonomicsModifier: item.mod?.ergonomics ?? 0,
      recoil: item.mod?.recoil ?? 0,
      recoilForceUp: item.mod?.recoilForceUp ?? 0,
      recoilForceBack: item.mod?.recoilForceBack ?? 0,
      accuracy: item.mod?.accuracy ?? 0,
      centerOfImpact: item.centerOfImpact,
      sightingRange: item.mod?.sightingRange ?? null,
      conflictingItems: item.conflictingItems,
      magazineCapacity: item.magazineCapacity ?? null,
    })),
  })
})

// --- Build calculate: POST /api/forge/build/calculate ---
app.post('/api/forge/build/calculate', (req, res) => {
  const { baseItemId, installedIds, assumeFullMag, selectedAmmoId } = req.body as {
    baseItemId: string; installedIds: string[]; assumeFullMag?: boolean; selectedAmmoId?: string | null
  }

  if (!baseItemId || !Array.isArray(installedIds)) {
    res.status(400).json({ error: 'baseItemId and installedIds are required' })
    return
  }

  const baseItem = forgeData.getItem(baseItemId)
  if (!baseItem) {
    res.status(404).json({ error: 'Base item not found' })
    return
  }

  const baseErgo = baseItem.weapon?.ergonomics ?? 0
  const baseWeight = baseItem.weight
  const baseRecoilV = baseItem.weapon?.recoilForceUp ?? null
  const baseRecoilH = baseItem.weapon?.recoilForceBack ?? null
  const baseSightingRange = baseItem.weapon?.sightingRange ?? null
  const baseCOI = baseItem.centerOfImpact

  let totalErgo = baseErgo
  let totalWeight = baseWeight
  let totalRecoilMod = 0
  let totalAccuracyMod = 0
  let barrelCOI: number | null = null
  let effectiveSightingRange = baseSightingRange

  for (const attId of installedIds) {
    const att = forgeData.getItem(attId)
    if (!att) continue

    totalErgo += att.mod?.ergonomics ?? 0
    totalWeight += att.weight
    totalRecoilMod += att.mod?.recoil ?? 0
    totalAccuracyMod += att.mod?.accuracy ?? 0

    if (!att.weapon && att.centerOfImpact !== null) {
      barrelCOI = att.centerOfImpact
    }

    if (att.mod?.sightingRange && att.mod.sightingRange > 0) {
      if (effectiveSightingRange === null || att.mod.sightingRange > effectiveSightingRange) {
        effectiveSightingRange = att.mod.sightingRange
      }
    }
  }

  let recoilV = baseRecoilV
  let recoilH = baseRecoilH
  if (recoilV !== null) {
    recoilV = Math.round(recoilV * (1 + totalRecoilMod / 100))
  }
  if (recoilH !== null) {
    recoilH = Math.round(recoilH * (1 + totalRecoilMod / 100))
  }

  const effectiveCOI = barrelCOI !== null ? barrelCOI : baseCOI
  let accuracyMoa: number | null = null
  if (effectiveCOI !== null) {
    accuracyMoa = Math.round(34.36 * effectiveCOI * (1 - totalAccuracyMod / 100) * 100) / 100
  }

  // Ammo weight: if assumeFullMag and ammo selected, add ammo weight × magazine capacity
  if (assumeFullMag && selectedAmmoId) {
    const ammoItem = forgeData.getItem(selectedAmmoId)
    if (ammoItem && ammoItem.ammo) {
      for (const attId of installedIds) {
        const att = forgeData.getItem(attId)
        if (att?.magazineCapacity) {
          totalWeight += (ammoItem.weight || 0) * att.magazineCapacity
        }
      }
    }
  }

  const stats: BuildStats = {
    totalErgo: Math.round(totalErgo * 100) / 100,
    totalWeight: Math.round(totalWeight * 1000) / 1000,
    recoilVertical: recoilV,
    recoilHorizontal: recoilH,
    sightingRange: effectiveSightingRange,
    accuracyMoa,
    fireRate: baseItem.weapon?.fireRate ?? null,
    effectiveRange: baseItem.weapon?.effectiveRange ?? null,
    recoilAngle: baseItem.weapon?.recoilAngle ?? null,
    recoilDispersion: baseItem.weapon?.recoilDispersion ?? null,
    recoilCamera: baseItem.weapon?.recoilCamera ?? null,
    malfunctionChance: baseItem.weapon?.malfunctionChance ?? null,
    durabilityBurnRatio: baseItem.weapon?.durabilityBurnRatio ?? null,
    heatFactorGun: baseItem.weapon?.heatFactorGun ?? null,
    deviationMax: baseItem.weapon?.deviationMax ?? null,
    totalRecoilMod: Math.round(totalRecoilMod * 100) / 100,
    totalAccuracyMod: Math.round(totalAccuracyMod * 100) / 100,
  }

  res.json(stats)
})

// --- Build validate: POST /api/forge/build/validate ---
app.post('/api/forge/build/validate', (req, res) => {
  const { candidateId, installedIds } = req.body as { candidateId: string; installedIds: string[] }

  if (!candidateId || !Array.isArray(installedIds)) {
    res.status(400).json({ error: 'candidateId and installedIds are required' })
    return
  }

  const candidate = forgeData.getItem(candidateId)
  if (!candidate) {
    res.status(404).json({ error: 'Candidate item not found' })
    return
  }

  const lang = (req.query.lang as string) || 'zh'
  res.json(checkConflict(candidateId, installedIds, lang))
})

// --- Price proxy + batch conflict check: POST /api/forge/prices ---
// Fetches flea market prices from tarkov.dev GraphQL API for given item IDs.
// If installedIds is provided, also returns conflict info for each candidate.
app.post('/api/forge/prices', async (req, res) => {
  const { itemIds, installedIds } = req.body as { itemIds: string[]; installedIds?: string[] }

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    res.json({ prices: {}, conflicts: {} })
    return
  }

  const batch = itemIds.slice(0, 200)
  const now = Date.now()

  const prices: Record<string, { fleaPrice: number | null; bestBuyPrice: number | null; bestBuySource: string | null; bestSellPrice: number | null; bestSellSource: string | null }> = {}

  // --- Price fetching with in-memory cache ---
  const uncachedIds: string[] = []
  for (const id of batch) {
    const cached = priceCache.get(id)
    if (cached && cached.expires > now) {
      prices[id] = cached.data
    } else {
      uncachedIds.push(id)
    }
  }

  if (uncachedIds.length > 0) {
    try {
      const query = `
        query {
          items(ids: [${uncachedIds.map(id => `"${id}"`).join(',')}]) {
            id
            name
            shortName
            sellFor {
              price
              source
              currency
            }
            buyFor {
              price
              source
              currency
            }
          }
        }
      `

      const response = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        res.status(502).json({ error: 'Failed to fetch prices from tarkov.dev' })
        return
      }

      const data = await response.json()
      const items = data?.data?.items || []
      const fetchedIds = new Set(items.map((i: any) => i.id))

      for (const item of items) {
        const sellFor = item.sellFor || []
        const buyFor = item.buyFor || []

        const fleaSell = sellFor.find((s: any) => s.source === 'fleaMarket')
        const fleaPrice = fleaSell ? fleaSell.price : null

        const sortedBuy = [...buyFor].sort((a: any, b: any) => a.price - b.price)
        const bestBuy = sortedBuy[0]

        const sortedSell = [...sellFor].sort((a: any, b: any) => b.price - a.price)
        const bestSell = sortedSell[0]

        const priceData = {
          fleaPrice,
          bestBuyPrice: bestBuy ? bestBuy.price : null,
          bestBuySource: bestBuy ? bestBuy.source : null,
          bestSellPrice: bestSell ? bestSell.price : null,
          bestSellSource: bestSell ? bestSell.source : null,
        }

        prices[item.id] = priceData
        priceCache.set(item.id, { data: priceData, expires: now + PRICE_CACHE_TTL })
      }

      // Cache null results for items not found on tarkov.dev
      for (const id of uncachedIds) {
        if (!fetchedIds.has(id)) {
          const nullData = { fleaPrice: null, bestBuyPrice: null, bestBuySource: null, bestSellPrice: null, bestSellSource: null }
          prices[id] = nullData
          priceCache.set(id, { data: nullData, expires: now + PRICE_CACHE_TTL })
        }
      }
    } catch (err) {
      console.error('[prices] Error fetching prices:', err)
      res.status(500).json({ error: 'Internal server error' })
      return
    }
  }

  // --- Batch conflict checking ---
  const conflicts: Record<string, ConflictResult> = {}
  if (Array.isArray(installedIds) && installedIds.length > 0) {
    const lang = (req.query.lang as string) || 'zh'
    for (const id of batch) {
      const result = checkConflict(id, installedIds, lang)
      if (!result.valid) {
        conflicts[id] = result
      }
    }
  }

  res.json({ prices, conflicts })
})

// --- Ammo by caliber: GET /api/forge/ammo/:caliber ---
app.get('/api/forge/ammo/:caliber', (req, res) => {
  const { caliber } = req.params
  const lang = (req.query.lang as string) || 'zh'

  // Search for ammo items matching the caliber
  const ammoItems = forgeData.searchByCaliber(caliber)

  res.json({
    caliber,
    items: ammoItems.map(item => ({
      id: item.id,
      name: lang === 'zh' ? item.name.zh : item.name.en,
      shortName: lang === 'zh' ? item.shortName.zh : item.shortName.en,
      image: item.image,
      weight: item.weight,
      ammo: item.ammo,
    })),
  })
})

// --- Start server ---
app.listen(Number(PORT), () => {
  console.log(`\n[server] EFTForge API running at http://localhost:${PORT}`)
  console.log(`[server] Health: http://localhost:${PORT}/api/forge/health`)
  console.log(`[server] CORS: localhost:5173, localhost:4173`)
})
