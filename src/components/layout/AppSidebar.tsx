import { useMemo, useEffect, useRef, useState } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Package } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useCategories, useCategoryTree, useItemDetail } from '@/hooks/useItems'
import type { WikiCategory } from '@/hooks/useItems'

const ROOT_ORDER = [
  '5b5f78dc86f77409407a7f8e',
  '5b47574386f77428ca22b346',
  '5b47574386f77428ca22b33f',
  '5b47574386f77428ca22b342',
  '5b47574386f77428ca22b344',
  '5b5f71a686f77447ed5636ab',
  '5b47574386f77428ca22b340',
  '5b47574386f77428ca22b33e',
  '5b5f78b786f77447ed5636af',
  '5b47574386f77428ca22b343',
  '5b619f1a86f77450a702a6f3',
  '5b47574386f77428ca22b345',
  '5b47574386f77428ca22b341',
]

function CategoryMenuItem({
  category,
  childMap,
  lang,
  activeCategoryId,
  ancestorIds,
}: {
  category: WikiCategory
  childMap: Map<string, WikiCategory[]>
  lang: 'zh' | 'en'
  activeCategoryId: string | null
  ancestorIds: Set<string>
}) {
  const categoryMatch = useMatch('/category/:id')
  const urlId = categoryMatch?.params?.id
  const children = childMap.get(category.id) || []
  const hasChildren = children.length > 0
  const isActive = urlId === category.id || activeCategoryId === category.id
  const shouldExpand = isActive || ancestorIds.has(category.id)
  const [open, setOpen] = useState(shouldExpand)

  useEffect(() => {
    if (shouldExpand) setOpen(true)
  }, [shouldExpand])

  if (hasChildren) {
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/cat">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex items-center w-full gap-2 px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer',
              'hover:bg-accent hover:text-accent-foreground',
              isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground'
            )}
          >
            <Package className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate flex-1 text-left">{category.name[lang]}</span>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/cat:rotate-90" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
            {children.map(child => (
              <CategoryMenuSubItem
                key={child.id}
                category={child}
                childMap={childMap}
                lang={lang}
                activeCategoryId={activeCategoryId}
                ancestorIds={ancestorIds}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Link
      to={`/category/${category.id}`}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground'
      )}
    >
      <Package className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate flex-1">{category.name[lang]}</span>
      {category.itemCount > 0 && (
        <span className="text-xs text-muted-foreground shrink-0">{category.itemCount}</span>
      )}
    </Link>
  )
}

function CategoryMenuSubItem({
  category,
  childMap,
  lang,
  activeCategoryId,
  ancestorIds,
}: {
  category: WikiCategory
  childMap: Map<string, WikiCategory[]>
  lang: 'zh' | 'en'
  activeCategoryId: string | null
  ancestorIds: Set<string>
}) {
  const categoryMatch = useMatch('/category/:id')
  const urlId = categoryMatch?.params?.id
  const activeRef = useRef<HTMLDivElement>(null)
  const children = childMap.get(category.id) || []
  const hasChildren = children.length > 0
  const isActive = urlId === category.id || activeCategoryId === category.id
  const shouldExpand = isActive || ancestorIds.has(category.id)
  const [subOpen, setSubOpen] = useState(shouldExpand)

  useEffect(() => {
    if (shouldExpand) setSubOpen(true)
  }, [shouldExpand])

  useEffect(() => {
    if (isActive && activeRef.current) {
      setTimeout(() => {
        activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 150)
    }
  }, [isActive])

  if (hasChildren) {
    return (
      <div ref={isActive ? activeRef : undefined}>
        <Collapsible open={subOpen} onOpenChange={setSubOpen} className="group/subcat">
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center w-full gap-2 px-2 py-1 text-xs rounded-md transition-colors cursor-pointer',
                'hover:bg-accent hover:text-accent-foreground',
                isActive ? 'bg-accent/50 text-accent-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              <span className="truncate flex-1 text-left">{category.name[lang]}</span>
              {category.itemCount > 0 && (
                <span className="text-xs text-muted-foreground/60 shrink-0">{category.itemCount}</span>
              )}
              <ChevronRight className="size-3 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/subcat:rotate-90" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
              {children.map(child => (
                <CategoryMenuSubItem
                  key={child.id}
                  category={child}
                  childMap={childMap}
                  lang={lang}
                  activeCategoryId={activeCategoryId}
                  ancestorIds={ancestorIds}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  return (
    <div ref={isActive ? activeRef : undefined}>
      <Link
        to={`/category/${category.id}`}
        className={cn(
          'flex items-center gap-2 px-2 py-1 text-xs rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive ? 'bg-accent/50 text-accent-foreground font-medium' : 'text-muted-foreground'
        )}
      >
        <span className="truncate flex-1">{category.name[lang]}</span>
        {category.itemCount > 0 && (
          <span className="text-xs text-muted-foreground/60 shrink-0">{category.itemCount}</span>
        )}
      </Link>
    </div>
  )
}

export function CategorySidebar() {
  const { i18n } = useTranslation()
  const { categories, loading } = useCategories()
  const { rootCategories, childMap } = useCategoryTree(categories)

  // Detect active category from URL (category page) or from item detail (item page)
  const categoryMatch = useMatch('/category/:id')
  const itemMatch = useMatch('/item/:id')
  const urlCategoryId = categoryMatch?.params?.id || null
  const itemId = itemMatch?.params?.id || null
  const { item } = useItemDetail(itemId)

  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  // Active category: prefer URL category ID, fallback to item's handbook category
  const activeCategoryId = urlCategoryId || item?.handbook.categoryId || null

  const ancestorIds = useMemo(() => {
    if (!activeCategoryId) return new Set<string>()
    const ancestors = new Set<string>()
    let parentId: string | null = activeCategoryId
    while (parentId) {
      const cat = categories.find(c => c.id === parentId)
      if (!cat || !cat.parentId) break
      ancestors.add(cat.parentId)
      parentId = cat.parentId
    }
    return ancestors
  }, [activeCategoryId, categories])

  const sortedRootCategories = useMemo(() => {
    const orderMap = new Map(ROOT_ORDER.map((id, i) => [id, i]))
    return [...rootCategories].sort((a, b) => {
      const oa = orderMap.get(a.id) ?? 999
      const ob = orderMap.get(b.id) ?? 999
      return oa - ob
    })
  }, [rootCategories])

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 transition-all duration-200">
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-2 space-y-0.5">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))
          ) : (
            sortedRootCategories.map(cat => (
              <CategoryMenuItem
                key={cat.id}
                category={cat}
                childMap={childMap}
                lang={lang}
                activeCategoryId={activeCategoryId}
                ancestorIds={ancestorIds}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
