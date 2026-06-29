import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import type { ItemSummary } from '@/hooks/useItems'

const RARITY_COLORS: Record<string, string> = {
  Common: 'bg-gray-500',
  Rare: 'bg-blue-500',
  Superrare: 'bg-purple-500',
  UltraRare: 'bg-yellow-500',
  Not_exist: 'bg-gray-700',
}

export function ItemCard({ item }: { item: ItemSummary }) {
  const { i18n } = useTranslation()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'
  const rarityColor = RARITY_COLORS[item.common.rarity] || 'bg-gray-500'

  return (
    <Card className="group overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all p-0">
      <Link to={`/item/${item.id}`}>
        {/* Rarity bar */}
        <div className={`h-0.5 ${rarityColor}`} />

        {/* Image */}
        <div className="aspect-square p-3 flex items-center justify-center bg-secondary/30">
          {item.image ? (
            <img
              src={item.image}
              alt={item.common.name[lang]}
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground/30">
              {item.common.shortName[lang].slice(0, 2)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5">
          <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {item.common.name[lang]}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{item.common.shortName[lang]}</span>
            {item.handbook.price > 0 && (
              <span className="text-xs text-yellow-500">₽{item.handbook.price.toLocaleString()}</span>
            )}
          </div>
        </div>
      </Link>
    </Card>
  )
}

export function ItemGrid({ items, showCount = true }: { items: ItemSummary[]; showCount?: boolean }) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return (
      <Empty className="h-64">
        <p className="text-muted-foreground">{t('noResults')}</p>
      </Empty>
    )
  }

  return (
    <>
      {showCount && <p className="text-sm text-muted-foreground mb-4">{t('itemCount', { count: items.length })}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
        {items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </>
  )
}
