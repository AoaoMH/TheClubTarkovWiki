import { Routes, Route, useParams, useSearchParams, Link, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { ItemGrid } from '@/components/item/ItemCard'
import { ItemDetail } from '@/components/item/ItemDetail'
import { AmmoView } from '@/components/item/AmmoPage'
import { QuestList } from '@/components/quest/QuestList'
import { QuestDetail } from '@/components/quest/QuestDetail'
import { ForgeWorkbench } from '@/components/forge/ForgeWorkbench'
import { LoginPage } from '@/components/auth/LoginPage'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories, useCategorySummaries } from '@/hooks/useItems'
import { useAuth } from '@/hooks/useAuth'

const AMMO_ROOT_CATEGORY_ID = '5b47574386f77428ca22b346'
const AMMO_BULLET_CATEGORY_ID = '5b47574386f77428ca22b33b'

function HomePage() {
  const { t, i18n } = useTranslation()
  const { categories, loading } = useCategories()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  if (loading) {
    return (
      <div>
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Collect all categories with items for the navigation grid
  const allCategories = categories.filter(c => c.itemCount > 0)

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('categories')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {allCategories.map(cat => (
          <Link
            key={cat.id}
            to={`/category/${cat.id}`}
            className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3
              hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            {cat.previewImage ? (
              <img
                src={cat.previewImage}
                alt=""
                className="w-10 h-10 object-contain shrink-0"
              />
            ) : (
              <div className="w-10 h-10 shrink-0 bg-secondary rounded flex items-center justify-center text-xs text-muted-foreground">
                {cat.itemCount}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {cat.name[lang]}
              </h3>
              <p className="text-xs text-muted-foreground">{cat.itemCount}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function CategoryPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const { categories } = useCategories()
  // When on ammo root category, load bullet subcategory data instead (root has 0 items)
  const effectiveId = id === AMMO_ROOT_CATEGORY_ID ? AMMO_BULLET_CATEGORY_ID : (id || null)
  const { items, loading } = useCategorySummaries(effectiveId)
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'
  const category = categories.find(c => c.id === id)
  const bulletCategory = categories.find(c => c.id === AMMO_BULLET_CATEGORY_ID)
  const displayCategory = id === AMMO_ROOT_CATEGORY_ID ? bulletCategory : category
  const isAmmoCategory = id === AMMO_ROOT_CATEGORY_ID || id === AMMO_BULLET_CATEGORY_ID
  const caliberFilter = searchParams.get('caliber') || undefined

  if (loading) {
    return (
      <div>
        <Skeleton className="h-7 w-48 mb-1" />
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isAmmoCategory) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-1">{displayCategory?.name[lang] || id}</h2>
        {displayCategory && (
          <p className="text-sm text-muted-foreground mb-4">{t('itemCount', { count: displayCategory.itemCount })}</p>
        )}
        <AmmoView items={items} filterCaliber={caliberFilter} />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">{category?.name[lang] || id}</h2>
      {category && (
        <p className="text-sm text-muted-foreground mb-4">{t('itemCount', { count: category.itemCount })}</p>
      )}
      <ItemGrid items={items} showCount={false} />
    </div>
  )
}

function ItemPage() {
  return <ItemDetail />
}

function App() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  // Not logged in → redirect to login (unless already on login page)
  if (!user && !isLoginPage) {
    return <Navigate to="/login" replace />
  }

  // Logged in but on login page → redirect to home
  if (user && isLoginPage) {
    return <Navigate to="/" replace />
  }

  return (
    <Routes>
      {/* Login - standalone full-page route */}
      <Route path="/login" element={<LoginPage />} />
      {/* Forge workbench - standalone full-page route */}
      <Route path="/forge/:gunId" element={<ForgeWorkbench />} />
      {/* Wiki routes - wrapped in AppLayout */}
      <Route path="*" element={
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/quests" element={<QuestList />} />
            <Route path="/quest/:id" element={<QuestDetail />} />
            <Route path="/category/:id" element={<CategoryPage />} />
            <Route path="/item/:id" element={<ItemPage />} />
          </Routes>
        </AppLayout>
      } />
    </Routes>
  )
}

export default App

