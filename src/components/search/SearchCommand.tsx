import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Crosshair, Shield, Shirt } from 'lucide-react'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { useSearchIndex, useSearch, getTypeNameZH } from '@/hooks/useItems'

const PRESET_ITEMS = [
  { id: 'home', label: { zh: '首页', en: 'Home' }, icon: Home, path: '/' },
  { id: '5b5f78fc86f77409407a7f90', label: { zh: '突击步枪', en: 'Assault Rifles' }, icon: Crosshair, path: '/category/5b5f78fc86f77409407a7f90' },
  { id: '5b5f701386f774093f2ecf0f', label: { zh: '防弹衣', en: 'Body Armor' }, icon: Shield, path: '/category/5b5f701386f774093f2ecf0f' },
  { id: '5b5f6f8786f77447ed563642', label: { zh: '战术胸挂', en: 'Tactical Rigs' }, icon: Shirt, path: '/category/5b5f6f8786f77447ed563642' },
]

export function SearchCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'
  const { index, loading, triggerLoad } = useSearchIndex()
  const { query, setQuery, results } = useSearch(index, lang)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        triggerLoad()
        onOpenChange(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [triggerLoad, onOpenChange])

  useEffect(() => {
    if (open) {
      triggerLoad()
    }
  }, [open, triggerLoad])

  const handleSelect = (path: string) => {
    navigate(path)
    onOpenChange(false)
    setQuery('')
  }

  const handleItemSelect = (itemId: string) => {
    navigate(`/item/${itemId}`)
    onOpenChange(false)
    setQuery('')
  }

  const showPresets = !query.trim() && !loading

  return (
    <CommandDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery('') }}>
      <CommandInput placeholder={t('search')} value={query} onValueChange={setQuery} />
      <CommandList>
        {loading && (
          <div className="p-2 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {showPresets && (
          <CommandGroup heading={lang === 'zh' ? '热门' : 'Popular'}>
            {PRESET_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.id}
                  value={item.label[lang]}
                  onSelect={() => handleSelect(item.path)}
                  className="gap-3"
                >
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <span>{item.label[lang]}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
        {!loading && query.trim() && results.length === 0 && (
          <CommandEmpty>{t('noResults')}</CommandEmpty>
        )}
        {!loading && results.length > 0 && (
          <CommandGroup>
            {results.map(item => (
              <CommandItem
                key={item.id}
                value={`${item.common.name[lang]} ${item.common.shortName[lang]} ${item.id}`}
                onSelect={() => handleItemSelect(item.id)}
                className="gap-3"
              >
                {item.image ? (
                  <img src={item.image} alt="" className="w-8 h-8 rounded object-contain bg-secondary shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground shrink-0">
                    {item.common.shortName[lang].charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{item.common.name[lang]}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.common.shortName[lang]}</div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{getTypeNameZH(item.typeName)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
