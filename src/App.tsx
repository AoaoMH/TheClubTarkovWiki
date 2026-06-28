import { Routes, Route, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { ItemGrid } from '@/components/item/ItemCard'
import { ItemDetail } from '@/components/item/ItemDetail'
import { AmmoView } from '@/components/item/AmmoPage'
import { useItems, useItemsByCategory } from '@/hooks/useItems'

const AMMO_ROOT_CATEGORY_ID = '5b47574386f77428ca22b346'
const AMMO_BULLET_CATEGORY_ID = '5b47574386f77428ca22b33b'

function HomePage() {
  const { t } = useTranslation()
  const { items, loading } = useItems()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t('loading')}</div>
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('allItems')}</h2>
      <ItemGrid items={items} />
    </div>
  )
}

function CategoryPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const { items, categories, loading } = useItems()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'
  const filteredItems = useItemsByCategory(items, id || null)
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
        <AmmoView items={items} categories={categories} lang={lang} />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">{category?.name[lang] || id}</h2>
      {category && (
        <p className="text-sm text-muted-foreground mb-4">{t('itemCount', { count: category.itemCount })}</p>
      )}
      <ItemGrid items={filteredItems} showCount={false} />
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
