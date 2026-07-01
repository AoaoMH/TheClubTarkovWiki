import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useMatch } from 'react-router-dom'
import { Search, Globe, Settings, LogOut, Home, ClipboardList, Package, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from '@/components/ui/navigation-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAuth } from '@/hooks/useAuth'
import { useCategories, useCategoryTree } from '@/hooks/useItems'
import { AdminPanel } from '@/components/admin/AdminPanel'
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

// Categories grouped under "其他" in the dropdown
const MISC_CATEGORY_IDS = new Set([
  '5b5f78b786f77447ed5636af',  // 货币
  '5b47574386f77428ca22b343',  // 地图
  '5b619f1a86f77450a702a6f3',  // 任务物品
  '5b47574386f77428ca22b345',  // 特殊物品
  '5b47574386f77428ca22b341',  // 信息物品
])

function NavItem({
  to,
  active,
  children,
}: {
  to: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
    </Link>
  )
}

/** Collect all leaf descendants of a category (categories with no children in childMap) */
function collectLeaves(
  categoryId: string,
  childMap: Map<string, WikiCategory[]>
): WikiCategory[] {
  const children = childMap.get(categoryId) || []
  if (children.length === 0) return []
  const leaves: WikiCategory[] = []
  for (const child of children) {
    const grandchildren = childMap.get(child.id) || []
    if (grandchildren.length === 0) {
      if (child.itemCount > 0) leaves.push(child)
    } else {
      leaves.push(...collectLeaves(child.id, childMap))
    }
  }
  return leaves
}

function CategoryDropdownColumn({
  category,
  childMap,
  lang,
}: {
  category: WikiCategory
  childMap: Map<string, WikiCategory[]>
  lang: 'zh' | 'en'
}) {
  const leaves = collectLeaves(category.id, childMap)

  return (
    <div className="min-w-[160px]">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
        <Package className="size-3.5 text-muted-foreground" />
        {category.name[lang]}
      </div>
      {leaves.length > 0 && (
        <div className="space-y-0.5 pl-5">
          {leaves.map(leaf => (
            <Link
              key={leaf.id}
              to={`/category/${leaf.id}`}
              className="block text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
            >
              {leaf.name[lang]}
              {leaf.itemCount > 0 && (
                <span className="ml-1 text-muted-foreground/60">({leaf.itemCount})</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function MobileMenuToggle({
  homeActive, questActive, itemsActive,
  lang,
  t, user, logout, toggleLang, setAdminOpen,
}: {
  homeActive: boolean; questActive: boolean; itemsActive: boolean
  lang: 'zh' | 'en'
  t: any
  user: { username: string; role?: string } | null
  logout: () => void; toggleLang: (lng: 'zh' | 'en') => void
  setAdminOpen: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 space-y-3">
          {/* Navigation links */}
          <div className="space-y-1">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                homeActive ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground hover:bg-accent'
              )}
            >
              <Home className="size-4" />
              {t('home', '首页')}
            </Link>
            <Link
              to="/quests"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                questActive ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground hover:bg-accent'
              )}
            >
              <ClipboardList className="size-4" />
              {t('quests', '任务')}
            </Link>
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                itemsActive ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground hover:bg-accent'
              )}
            >
              <Package className="size-4" />
              {t('items', '道具')}
            </Link>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 px-3 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => { toggleLang(lang === 'zh' ? 'en' : 'zh'); setOpen(false) }}
            >
              <Globe className="size-3.5 mr-1" />
              {lang === 'zh' ? 'English' : '中文'}
            </Button>
            {user?.role === 'admin' && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { setAdminOpen(true); setOpen(false) }}>
                <Settings className="size-3.5 mr-1" />
                管理
              </Button>
            )}
            <div className="flex-1" />
            {user ? (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { logout(); setOpen(false) }}>
                <LogOut className="size-3.5 mr-1" />
                {user.username}
              </Button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="text-xs">登录</Button>
              </Link>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function Header({ onSearchClick }: { onSearchClick: () => void }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const [adminOpen, setAdminOpen] = useState(false)
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  // Categories for dropdown
  const { categories, loading } = useCategories()
  const { rootCategories, childMap } = useCategoryTree(categories)

  // Route matching for active nav
  const homeMatch = useMatch('/')
  const questListMatch = useMatch('/quests')
  const questDetailMatch = useMatch('/quest/:id')
  const categoryMatch = useMatch('/category/:id')
  const itemMatch = useMatch('/item/:id')

  const isHomeActive = !!homeMatch
  const isQuestActive = !!questListMatch || !!questDetailMatch
  const isItemsActive = !!categoryMatch || !!itemMatch

  const toggleLang = (lng: 'zh' | 'en') => {
    i18n.changeLanguage(lng)
  }

  const sortedRootCategories = useMemo(() => {
    const orderMap = new Map(ROOT_ORDER.map((id, i) => [id, i]))
    return [...rootCategories].sort((a, b) => {
      const oa = orderMap.get(a.id) ?? 999
      const ob = orderMap.get(b.id) ?? 999
      return oa - ob
    })
  }, [rootCategories])

  // Split into 3 columns, with "其他" group for misc categories
  const WEAPON_MODS_ID = '5b5f71a686f77447ed5636ab'
  const { columns, miscCategories, weaponModCategory } = useMemo(() => {
    const main = sortedRootCategories.filter(c => !MISC_CATEGORY_IDS.has(c.id) && c.id !== WEAPON_MODS_ID)
    const misc = sortedRootCategories.filter(c => MISC_CATEGORY_IDS.has(c.id))
    const weaponMod = sortedRootCategories.find(c => c.id === WEAPON_MODS_ID) || null
    const cols: WikiCategory[][] = [[], [], []]
    main.forEach((cat, i) => {
      const col = cols[i % 3]
      if (col) col.push(cat)
    })
    return {
      columns: cols.filter(c => c.length > 0),
      miscCategories: misc,
      weaponModCategory: weaponMod,
    }
  }, [sortedRootCategories])

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border transition-all duration-200">
      <div className="flex items-center gap-2 px-4 py-2 lg:px-6">
        {/* Left: Title */}
        <Link
          to="/"
          className="text-lg font-bold text-primary hover:text-primary/80 transition-colors shrink-0"
        >
          <span className="hidden sm:inline">The Club Tarkov Wiki</span>
          <span className="sm:hidden">Club Wiki</span>
        </Link>

        {/* Center: Navigation (desktop only) */}
        <nav className="hidden md:flex items-center gap-1 mx-auto">
          <NavItem to="/" active={isHomeActive}>
            <Home className="size-4" />
            {t('home', '首页')}
          </NavItem>

          <NavItem to="/quests" active={isQuestActive}>
            <ClipboardList className="size-4" />
            {t('quests', '任务')}
          </NavItem>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    'text-sm font-medium h-8 px-3',
                    isItemsActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Package className="size-4 mr-0.5" />
                  {t('items', '道具')}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="p-3">
                    {loading ? (
                      <div className="text-sm text-muted-foreground p-4">
                        {t('loading', '加载中...')}
                      </div>
                    ) : (
                      <div className="flex gap-6">
                        {miscCategories.length > 0 && (
                          <div className="min-w-[140px]">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                              <Package className="size-3.5 text-muted-foreground" />
                              {lang === 'zh' ? '其他' : 'Other'}
                            </div>
                            <div className="space-y-0.5 pl-5">
                              {miscCategories.map(cat => (
                                <Link
                                  key={cat.id}
                                  to={`/category/${cat.id}`}
                                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
                                >
                                  {cat.name[lang]}
                                  {cat.itemCount > 0 && (
                                    <span className="ml-1 text-muted-foreground/60">({cat.itemCount})</span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                        {columns.map((col, ci) => (
                          <div key={ci} className="space-y-3">
                            {col.map(cat => (
                              <CategoryDropdownColumn
                                key={cat.id}
                                category={cat}
                                childMap={childMap}
                                lang={lang}
                              />
                            ))}
                          </div>
                        ))}
                        {weaponModCategory && (
                          <CategoryDropdownColumn
                            category={weaponModCategory}
                            childMap={childMap}
                            lang={lang}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right: Search + Actions (desktop) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onSearchClick}
            className="justify-start text-muted-foreground w-[160px]"
          >
            <Search className="size-4 mr-1.5 shrink-0" />
            <span className="truncate">
              {i18n.language === 'zh' ? '搜索...' : 'Search...'}
            </span>
            <Kbd className="ml-auto shrink-0">⌘K</Kbd>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-8">
                <Globe className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleLang('zh')}>
                中文{i18n.language === 'zh' ? ' ✓' : ''}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleLang('en')}>
                English{i18n.language === 'en' ? ' ✓' : ''}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user?.role === 'admin' && (
            <Button variant="outline" size="icon" className="size-8" onClick={() => setAdminOpen(true)}>
              <Settings className="size-4" />
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="max-w-[80px] truncate">{user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="size-4 mr-2" />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">登录</Button>
            </Link>
          )}
        </div>

        {/* Right: Mobile buttons */}
        <div className="flex md:hidden items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onSearchClick}
          >
            <Search className="size-4" />
          </Button>
          <MobileMenuToggle
            homeActive={isHomeActive}
            questActive={isQuestActive}
            itemsActive={isItemsActive}
            lang={lang}
            t={t}
            user={user}
            logout={logout}
            toggleLang={toggleLang}
            setAdminOpen={setAdminOpen}
          />
        </div>
      </div>

      <AdminPanel open={adminOpen} onOpenChange={setAdminOpen} />
    </header>
  )
}
