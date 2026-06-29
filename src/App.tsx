import { Routes, Route, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { ItemGrid } from '@/components/item/ItemCard'
import { ItemDetail } from '@/components/item/ItemDetail'
import { AmmoView } from '@/components/item/AmmoPage'
import { useCategories, useCategorySummaries } from '@/hooks/useItems'

const AMMO_ROOT_CATEGORY_ID = '5b47574386f77428ca22b346'
const AMMO_BULLET_CATEGORY_ID = '5b47574386f77428ca22b33b'

function HomePage() {
  const { t, i18n } = useTranslation()
  const { categories, loading } = useCategories()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t('loading')}</div>
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
  const { t, i18n } = useTranslation()
  const { categories } = useCategories()
  const { items, loading } = useCategorySummaries(id || null)
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'
  const category = categories.find(c => c.id === id)
  const isAmmoCategory = id === AMMO_ROOT_CATEGORY_ID || id === AMMO_BULLET_CATEGORY_ID

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t('loading')}</div>
  }

  if (isAmmoCategory) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-1">{category?.name[lang] || id}</h2>
        {category && (
          <p className="text-sm text-muted-foreground mb-4">{t('itemCount', { count: category.itemCount })}</p>
        )}
        <AmmoView items={items} />
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
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:id" element={<CategoryPage />} />
        <Route path="/item/:id" element={<ItemPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App

