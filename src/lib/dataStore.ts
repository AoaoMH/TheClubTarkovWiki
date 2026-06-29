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
