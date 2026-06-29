import { useMemo, useEffect, useRef, useState } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Home, Package } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useCategories, useCategoryTree, useItemDetail } from '@/hooks/useItems'
import type { WikiCategory } from '@/hooks/useItems'

const ROOT_ORDER = [
  '5b5f78dc86f77409407a7f8e',
  '5b47574386f77428ca22b346',
  '5b47574386f77428ca22b33f',
  '5b47574386f77428ca22b342',
  '5b47574386f77428ca22b344',
  '5b47574386f77428ca22b340',
  '5b5f71a686f77447ed5636ab',
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
      <Collapsible asChild open={open} onOpenChange={setOpen} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              <Package className="size-4" />
              <span>{category.name[lang]}</span>
              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
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
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={`/category/${category.id}`}>
          <Package className="size-4" />
          <span>{category.name[lang]}</span>
        </Link>
      </SidebarMenuButton>
      {category.itemCount > 0 && (
        <SidebarMenuBadge>{category.itemCount}</SidebarMenuBadge>
      )}
    </SidebarMenuItem>
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
  const activeRef = useRef<HTMLLIElement>(null)
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
      <Collapsible asChild open={subOpen} onOpenChange={setSubOpen} className="group/collapsible-sub">
        <SidebarMenuSubItem ref={isActive ? activeRef : undefined}>
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton>
              <span>{category.name[lang]}</span>
              {category.itemCount > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {category.itemCount}
                </span>
              )}
              <ChevronRight className="size-3 transition-transform group-data-[state=open]/collapsible-sub:rotate-90" />
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
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
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuSubItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuSubItem ref={isActive ? activeRef : undefined}>
      <SidebarMenuSubButton asChild isActive={isActive}>
        <Link to={`/category/${category.id}`}>
          <span>{category.name[lang]}</span>
          {category.itemCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {category.itemCount}
            </span>
          )}
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

export function AppSidebar() {
  const { t, i18n } = useTranslation()
  const { categories, loading } = useCategories()
  const { rootCategories, childMap } = useCategoryTree(categories)
  const itemMatch = useMatch('/item/:id')
  const itemId = itemMatch?.params?.id || null
  const { item } = useItemDetail(itemId)
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  const activeCategoryId = item?.handbook.categoryId || null

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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-primary font-bold">
              <Link to="/">
                <span className="text-lg">The Club Tarkov Wiki</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation', '导航')}</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/">
                  <Home className="size-4" />
                  <span>{t('home', '首页')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t('categories', '分类')}</SidebarGroupLabel>
          <SidebarMenu>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
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
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
