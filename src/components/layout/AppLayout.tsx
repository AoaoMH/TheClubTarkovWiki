import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Globe, Menu, X, ChevronRight, ChevronDown, Home } from 'lucide-react'
import { useCategories, useCategoryTree, useSearchIndex, useSearch, getTypeNameZH } from '@/hooks/useItems'
import type { WikiCategory } from '@/hooks/useItems'

// 菜单固定顺序
const ROOT_ORDER = [
  '5b5f78dc86f77409407a7f8e', // 武器
  '5b47574386f77428ca22b346', // 弹药
  '5b47574386f77428ca22b33f', // 装备
  '5b47574386f77428ca22b342', // 钥匙
  '5b47574386f77428ca22b344', // 医疗物资
  '5b47574386f77428ca22b340', // 补给品
  '5b5f71a686f77447ed5636ab', // 武器零件&配件
  '5b47574386f77428ca22b33e', // 交换物
  '5b5f78b786f77447ed5636af', // 货币
  '5b47574386f77428ca22b343', // 地图
  '5b619f1a86f77450a702a6f3', // 任务物品
  '5b47574386f77428ca22b345', // 特殊物品
  '5b47574386f77428ca22b341', // 信息物品
]

function CategoryNode({ category, childMap, lang, depth = 0 }: {
  category: WikiCategory
  childMap: Map<string, WikiCategory[]>
  lang: 'zh' | 'en'
  depth?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const { id } = useParams()
  const children = childMap.get(category.id) || []
  const isActive = id === category.id
  const hasChildren = children.length > 0

  const baseClass = `flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors`
  const activeClass = isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'

  const content = (
    <>
      {hasChildren && (
        <span className="shrink-0 p-0.5">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      )}
      {!hasChildren && <span className="w-[18px]" />}
      <span className="truncate flex-1">{category.name[lang]}</span>
      {!hasChildren && category.itemCount > 0 && (
        <span className="text-xs text-muted-foreground shrink-0">{category.itemCount}</span>
      )}
    </>
  )

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`${baseClass} ${activeClass} w-full cursor-pointer`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {content}
        </button>
      ) : (
        <Link
          to={`/category/${category.id}`}
          className={`${baseClass} ${activeClass}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {content}
        </Link>
      )}
      {expanded && hasChildren && (
        <div>
          {children.map(child => (
            <CategoryNode key={child.id} category={child} childMap={childMap} lang={lang} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { t, i18n } = useTranslation()
  const { categories } = useCategories()
  const { rootCategories, childMap } = useCategoryTree(categories)
  const [mobileOpen, setMobileOpen] = useState(false)
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  // 按指定顺序排列根分类
  const sortedRootCategories = useMemo(() => {
    const orderMap = new Map(ROOT_ORDER.map((id, i) => [id, i]))
    return [...rootCategories].sort((a, b) => {
      const oa = orderMap.get(a.id) ?? 999
      const ob = orderMap.get(b.id) ?? 999
      return oa - ob
    })
  }, [rootCategories])

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Link to="/" className="text-primary font-bold text-lg">
          The Club Tarkov Wiki
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-1 space-y-0.5">
        <Link
          to="/"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors
            text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Home size={14} className="shrink-0" />
          <span>{t('home', '首页')}</span>
        </Link>
        {sortedRootCategories.map(cat => (
          <CategoryNode key={cat.id} category={cat} childMap={childMap} lang={lang} />
        ))}
      </nav>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-card border border-border rounded-md"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border h-screen sticky top-0 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-background/80" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full bg-card border-r border-border">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}

export function Header() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'
  const { index, loading: indexLoading, triggerLoad } = useSearchIndex()
  const { query, setQuery, results } = useSearch(index, lang)
  const [showResults, setShowResults] = useState(false)
  const navigate = useNavigate()

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  }

  const handleFocus = () => {
    triggerLoad()
    setShowResults(true)
  }

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-3 px-4 py-2 lg:px-6">
        <div className="lg:hidden w-10" /> {/* Space for mobile menu button */}

        {/* Search */}
        <div className="flex-1 max-w-xl relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder={t('search')}
              value={query}
              onChange={e => { setQuery(e.target.value); setShowResults(true) }}
              onFocus={handleFocus}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm
                placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Search results dropdown */}
          {showResults && query.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
              {indexLoading ? (
                <div className="p-3 text-sm text-muted-foreground">{t('loading')}</div>
              ) : results.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">{t('noResults')}</div>
              ) : (
                results.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { navigate(`/item/${item.id}`); setShowResults(false); setQuery('') }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary text-left transition-colors"
                  >
                    {item.image ? (
                      <img src={item.image} alt="" className="w-8 h-8 rounded object-contain bg-secondary" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                        {item.common.shortName[lang].charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{item.common.name[lang]}</div>
                      <div className="text-xs text-muted-foreground">{item.common.shortName[lang]}</div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{getTypeNameZH(item.typeName)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-lg text-sm
            hover:bg-secondary/80 transition-colors"
        >
          <Globe size={16} />
          <span>{i18n.language === 'zh' ? '中' : 'EN'}</span>
        </button>
      </div>
    </header>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
