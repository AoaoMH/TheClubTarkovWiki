/**
 * Data fetching layer with Promise-based deduplication cache.
 * Ensures the same URL is never fetched more than once per session.
 */

const cache = new Map<string, Promise<unknown>>()

function fetchOnce<T>(key: string, url: string): Promise<T> {
  const existing = cache.get(key)
  if (existing) return existing as Promise<T>
  const promise = fetch(url).then(r => {
    if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`)
    return r.json()
  })
  cache.set(key, promise)
  return promise
}

// --- Public API ---

export function fetchCategories() {
  return fetchOnce<import('@/hooks/useItems').WikiCategory[]>('categories', '/data/categories.json')
}

export function fetchCategorySummaries(categoryId: string) {
  return fetchOnce<import('@/hooks/useItems').ItemSummary[]>(
    `summaries:${categoryId}`,
    `/data/summaries/${categoryId}.json`
  )
}

export function fetchItemDetail(itemId: string) {
  return fetchOnce<import('@/hooks/useItems').WikiItem>(
    `item:${itemId}`,
    `/data/items/${itemId}.json`
  )
}

export function fetchSearchIndex() {
  return fetchOnce<import('@/hooks/useItems').ItemSummary[]>('search-index', '/data/search-index.json')
}

export function fetchItemNames() {
  return fetchOnce<Record<string, { zh: string; en: string }>>('item-names', '/data/item-names.json')
}

// --- Quest API ---

export interface QuestReward {
  type: string
  value?: number
  itemId?: string
  itemName?: { zh: string; en: string }
  quantity?: number
  target?: string
}

export interface QuestSummary {
  id: string
  name: { zh: string; en: string }
  traderId: string
  traderName: { zh: string; en: string }
  type: string
  location: string
  locationName: { zh: string; en: string }
  rewards: QuestReward[]
}

export interface QuestObjective {
  type: string
  description: string
  value?: number
  target?: string | string[]
  targetNames?: Record<string, { zh: string; en: string }>
  weapons?: string[]
  weaponNames?: Record<string, { zh: string; en: string }>
  weaponCalibers?: string[]
  bodyParts?: string[]
  enemyRoles?: string[]
  onlyFoundInRaid?: boolean
  location?: string
  distance?: { compareMethod: string; value: number }
  daytime?: { from: number; to: number }
  requirements?: Array<{ stat: string; compare: string; value: number }>
  requiredItems?: string[]
  requiredItemNames?: Record<string, { zh: string; en: string }>
  requiredCategories?: string[]
  requiredCategoryNames?: Record<string, { zh: string; en: string }>
  isFailCondition?: boolean
}

export interface QuestDetail extends QuestSummary {
  description: { zh: string; en: string }
  objectives: QuestObjective[]
  prerequisites: Array<{ id: string; name: { zh: string; en: string } }>
  followUps: Array<{ id: string; name: { zh: string; en: string } }>
  image: string | null
  isKey: boolean
}

export function fetchQuestList() {
  return fetchOnce<QuestSummary[]>('quests-list', '/data/quests.json')
}

export function fetchQuestDetail(questId: string) {
  return fetchOnce<QuestDetail>(
    `quest:${questId}`,
    `/data/quests/${questId}.json`
  )
}
