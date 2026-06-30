import express from 'express'
import cors from 'cors'
import { forgeData } from './dataLoader.js'
import type { ForgeItem, BuildStats, ConflictResult, SlotInfo } from './types.js'
import { db } from './db.js' // Initialize SQLite database (users, sessions, presets)
import { requireAuth } from './auth.js'
import { authRouter } from './routes/auth.js'
import { presetsRouter } from './routes/presets.js'
import { adminRouter } from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3001

// --- Middleware ---
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'],
  credentials: true,
}))
app.use(express.json({ limit: '5mb' }))

// --- Global auth: all routes require login except auth routes ---
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/')) return next()
  requireAuth(req, res, next)
})

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
    factoryChildSlots: (() => {
      const presets = forgeData.getPresets(gunId)
      if (!presets || presets.length === 0) return {}
      const attachments: Record<string, string> = {}
      for (const p of presets) attachments[p.slotName] = p.itemId
      return buildChildSlots(attachments)
    })(),
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

// --- Helper: calculate build stats from gun + installed IDs ---
function calculateBuildStats(baseItemId: string, installedIds: string[]): {
  ergo: number; recoilVertical: number | null; recoilHorizontal: number | null;
  accuracyMoa: number | null; sightingRange: number | null; totalWeight: number;
  magazineCapacity: number | null
} | null {
  const baseItem = forgeData.getItem(baseItemId)
  if (!baseItem) return null

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
  let magazineCapacity: number | null = null

  for (const attId of installedIds) {
    const att = forgeData.getItem(attId)
    if (!att) continue
    totalErgo += att.mod?.ergonomics ?? 0
    totalWeight += att.weight
    totalRecoilMod += att.mod?.recoil ?? 0
    totalAccuracyMod += att.mod?.accuracy ?? 0
    if (!att.weapon && att.centerOfImpact !== null) barrelCOI = att.centerOfImpact
    if (att.mod?.sightingRange && att.mod.sightingRange > 0) {
      if (effectiveSightingRange === null || att.mod.sightingRange > effectiveSightingRange) {
        effectiveSightingRange = att.mod.sightingRange
      }
    }
    if (att.magazineCapacity != null) {
      magazineCapacity = att.magazineCapacity
    }
  }

  let recoilV = baseRecoilV
  let recoilH = baseRecoilH
  if (recoilV !== null) recoilV = Math.round(recoilV * (1 + totalRecoilMod / 100))
  if (recoilH !== null) recoilH = Math.round(recoilH * (1 + totalRecoilMod / 100))

  const effectiveCOI = barrelCOI !== null ? barrelCOI : baseCOI
  let accuracyMoa: number | null = null
  if (effectiveCOI !== null) {
    accuracyMoa = Math.round(34.36 * effectiveCOI * (1 - totalAccuracyMod / 100) * 100) / 100
  }

  return {
    ergo: Math.round(totalErgo * 100) / 100,
    recoilVertical: recoilV,
    recoilHorizontal: recoilH,
    accuracyMoa,
    sightingRange: effectiveSightingRange,
    totalWeight: Math.round(totalWeight * 1000) / 1000,
    magazineCapacity,
  }
}

// --- Helper: build childSlots map for a set of attachments ---
// For each installed item, returns its slots with allowedItems populated.
// This lets the frontend skip all fetchItemSlots + fetchAllowedItems calls.
function buildChildSlots(attachments: Record<string, string>): Record<string, Array<{
  name: string; id: string; required: boolean; filter: string[]; allowedItems: any[]
}>> {
  const childSlots: Record<string, Array<{ name: string; id: string; required: boolean; filter: string[]; allowedItems: any[] }>> = {}
  for (const [slotPath, itemId] of Object.entries(attachments)) {
    const item = forgeData.getItem(itemId)
    if (!item || !item.slots || item.slots.length === 0) {
      childSlots[slotPath] = []
      continue
    }
    childSlots[slotPath] = item.slots.map(slot => {
      const allowed = forgeData.getAllowedItems(itemId, slot.name)
      return {
        name: slot.name,
        id: slot.id,
        required: slot.required,
        filter: slot.filter,
        allowedItems: allowed.map(allowedItem => ({
          id: allowedItem.id,
          name: allowedItem.name.zh,
          shortName: allowedItem.shortName.zh,
          image: allowedItem.image,
          weight: allowedItem.weight,
          ergonomicsModifier: allowedItem.mod?.ergonomics ?? 0,
          recoil: allowedItem.mod?.recoil ?? 0,
          recoilForceUp: allowedItem.mod?.recoilForceUp ?? 0,
          recoilForceBack: allowedItem.mod?.recoilForceBack ?? 0,
          accuracy: allowedItem.mod?.accuracy ?? 0,
          centerOfImpact: allowedItem.centerOfImpact,
          sightingRange: allowedItem.mod?.sightingRange ?? null,
          conflictingItems: allowedItem.conflictingItems,
          magazineCapacity: allowedItem.magazineCapacity ?? null,
        })),
      }
    })
  }
  return childSlots
}

// --- Community presets: GET /api/forge/guns/:gunId/presets ---
// Returns all users' presets for a specific gun (with author + calculated stats)
app.get('/api/forge/guns/:gunId/presets', (req, res) => {
  const { gunId } = req.params
  const currentUserId = req.user!.id
  const isAdmin = req.user!.role === 'admin'

  const rows = db.prepare(`
    SELECT p.id, p.name, p.gun_id, p.gun_name, p.attachments_json, p.user_id, p.created_at, p.updated_at, u.username as author
    FROM presets p
    JOIN users u ON p.user_id = u.id
    WHERE p.gun_id = ?
    ORDER BY p.updated_at DESC
  `).all(gunId) as Array<{
    id: string; name: string; gun_id: string; gun_name: string;
    attachments_json: string; user_id: number; created_at: number; updated_at: number; author: string
  }>

  const presets = rows.map(r => {
    const attachments = JSON.parse(r.attachments_json) as Record<string, string>
    const installedIds = Object.values(attachments)
    const stats = calculateBuildStats(r.gun_id, installedIds)
    return {
      id: r.id,
      name: r.name,
      author: r.author,
      isOwn: r.user_id === currentUserId,
      canDelete: r.user_id === currentUserId || isAdmin,
      stats,
      attachments,
      childSlots: buildChildSlots(attachments),
    }
  })

  res.json({ presets })
})

// --- Decode spark code: POST /api/forge/build/decode-spark ---
// Decodes WBM config code to { gunId, attachments } using in-memory forgeData (zero network calls)
app.post('/api/forge/build/decode-spark', (req, res) => {
  const { code } = req.body as { code?: string }
  if (!code) {
    res.status(400).json({ error: '缺少配置码' })
    return
  }

  const text = code.trim()

  // Extract base64 data via regex
  let base64Data: string | null = null
  const match = text.match(/SPT-ProjectSpark-WBM-([A-Za-z0-9+/=]+)/)
  if (match && match[1]) {
    base64Data = match[1]
  } else {
    const token = text.split(/\s/).find(t => /^[A-Za-z0-9+/=]+$/.test(t))
    if (token) base64Data = token
  }
  if (!base64Data) {
    res.status(400).json({ error: '无效的配置码格式' })
    return
  }

  // Decode base64 to bytes
  let data: Buffer
  try {
    data = Buffer.from(base64Data, 'base64')
  } catch {
    res.status(400).json({ error: 'Base64解码失败' })
    return
  }

  // Validate: 15 bytes per node
  if (data.length % 15 !== 0) {
    res.status(400).json({ error: '数据长度异常' })
    return
  }

  const nodeCount = data.length / 15

  // Parse nodes
  interface DecodedNode {
    tpl: string
    parentIndex: number // -1 for root
    slotIndex: number   // 0 for root, 1-based for children
  }
  const nodes: DecodedNode[] = []

  for (let i = 0; i < nodeCount; i++) {
    const offset = i * 15
    const tpl = data.subarray(offset, offset + 12).toString('hex')
    const parentIndex = data[offset + 13] ?? 0
    const slotIndex = data[offset + 14] ?? 0
    nodes.push({
      tpl,
      parentIndex: parentIndex === 255 ? -1 : parentIndex,
      slotIndex: slotIndex === 255 ? 0 : slotIndex,
    })
  }

  if (nodes.length === 0) {
    res.status(400).json({ error: '空配置码' })
    return
  }

  const gunId = nodes[0]!.tpl
  const attachments: Record<string, string> = {}
  const slotPaths: string[] = new Array(nodes.length).fill('')

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i]!
    const parentIdx = node.parentIndex
    const parentNode = nodes[parentIdx]
    if (!parentNode) continue

    const parentSlotPath = slotPaths[parentIdx] ?? ''

    // Get parent's slots from in-memory forgeData (synchronous, zero network)
    let parentSlots: SlotInfo[]
    if (parentIdx === 0) {
      // Parent is root gun
      const gun = forgeData.getItem(parentNode.tpl)
      parentSlots = gun?.slots ?? []
    } else {
      const parentItem = forgeData.getItem(parentNode.tpl)
      parentSlots = parentItem?.slots ?? []
    }

    // slotIndex is 1-based
    const slot = parentSlots[node.slotIndex - 1]
    if (!slot) continue

    const slotPath = parentSlotPath ? `${parentSlotPath}:${slot.name}` : slot.name
    slotPaths[i] = slotPath
    attachments[slotPath] = node.tpl
  }

  const childSlots = buildChildSlots(attachments)

  res.json({ gunId, attachments, childSlots })
})

// --- Auth / Presets / Admin routes ---
app.use('/api/auth', authRouter)
app.use('/api/presets', presetsRouter)
app.use('/api/admin', adminRouter)

// --- Start server ---
app.listen(Number(PORT), () => {
  console.log(`\n[server] EFTForge API running at http://localhost:${PORT}`)
  console.log(`[server] Health: http://localhost:${PORT}/api/forge/health`)
  console.log(`[server] CORS: localhost:5173, localhost:4173`)
  console.log(`[server] Auth: /api/auth/* | Presets: /api/presets/* | Admin: /api/admin/*`)
})
