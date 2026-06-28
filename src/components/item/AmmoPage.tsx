import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { WikiItem, WikiCategory } from '@/hooks/useItems'
import { ItemCard } from '@/components/item/ItemCard'

// Caliber values use actual game data format (no dots, no spaces)
const CALIBER_GROUPS: Record<string, string> = {
  // 步枪子弹
  '545x39': 'rifle', '556x45NATO': 'rifle', '68x51': 'rifle', '93x64': 'rifle',
  '762x35': 'rifle', '762x39': 'rifle', '9x39': 'rifle', '127x33': 'rifle', '127x55': 'rifle', '127x99': 'rifle', '127x108': 'rifle',
  // 狙击枪子弹
  '86x70': 'sniper', '366TKM': 'sniper', '762x51': 'sniper',
  '762x54R': 'sniper', '762x67B': 'sniper', '792x57': 'sniper',
  // 手枪/冲锋枪子弹
  '9x33R': 'pistol_smg', '1143x23ACP': 'pistol_smg', '11x33R': 'pistol_smg',
  '46x30': 'pistol_smg', '57x28': 'pistol_smg', '20x1mm': 'pistol_smg',
  '762x25TT': 'pistol_smg', '9x18PM': 'pistol_smg', '9x19PARA': 'pistol_smg',
  '9x21': 'pistol_smg', '784x49': 'pistol_smg',
  // 散弹枪子弹
  '12g': 'shotgun', '20g': 'shotgun', '23x75': 'shotgun',
  // 其他子弹
  '26x75': 'other', '40x46': 'other', '40mmRU': 'other',
  '1036x77': 'other', '30x29': 'other', '25x59': 'other', '725': 'other',
}

function formatCaliber(caliber: string): string {
  if (!caliber) return ''
  return caliber.replace(/^Caliber/i, '')
}

// Display names for caliber values
const CALIBER_DISPLAY: Record<string, string> = {
  '545x39': '5.45x39', '556x45NATO': '5.56x45 NATO', '68x51': '6.8x51', '93x64': '9.3x64',
  '762x35': '7.62x35 (.300 BLK)', '762x39': '7.62x39', '9x39': '9x39',
  '127x33': '.50 BMG', '127x55': '12.7x55', '127x99': '.50 BMG', '127x108': '12.7x108',
  '86x70': '.338 LM', '366TKM': '.366 TKM', '762x51': '7.62x51',
  '762x54R': '7.62x54R', '762x67B': '7.62x67 (.300 WM)', '792x57': '7.92x57',
  '9x33R': '.357 Mag', '1143x23ACP': '.45 ACP', '11x33R': '.50 AE',
  '46x30': '4.6x30', '57x28': '5.7x28', '20x1mm': '20x1',
  '762x25TT': '7.62x25 TT', '9x18PM': '9x18 PM', '9x19PARA': '9x19',
  '9x21': '9x21', '784x49': '7.84x49',
  '12g': '12/70', '20g': '20/70', '23x75': '23x75',
  '26x75': '26x75 信号弹', '40x46': '40x46', '40mmRU': '40mm',
  '1036x77': '火箭弹', '30x29': '30x29', '25x59': '25x59', '725': '7.25',
}

function getAmmoGroup(item: WikiItem): string {
  const caliber = formatCaliber(String(item.properties.ammo?.caliber || item.properties._raw?.ammoCaliber || ''))
  // Try exact match first
  if (CALIBER_GROUPS[caliber]) return CALIBER_GROUPS[caliber]
  // Try partial match
  for (const [key, group] of Object.entries(CALIBER_GROUPS)) {
    if (caliber.includes(key) || key.includes(caliber)) return group
  }
  return 'other'
}

const GROUP_ORDER = ['rifle', 'sniper', 'pistol_smg', 'shotgun', 'other'] as const

const GROUP_LABEL_KEYS: Record<string, string> = {
  rifle: 'rifleAmmo',
  sniper: 'sniperAmmo',
  pistol_smg: 'pistolSmgAmmo',
  shotgun: 'shotgunAmmo',
  other: 'otherAmmo',
}

export function AmmoView({ items, categories: _categories, lang: _lang, filterCaliber }: {
  items: WikiItem[]
  categories: WikiCategory[]
  lang: 'zh' | 'en'
  filterCaliber?: string
}) {
  const { t } = useTranslation()

  const grouped = useMemo(() => {
    // Filter to ammo items only
    let ammoItems = items.filter(item =>
      item.category === 'ammo' || item.typeName === 'Ammo'
    )

    // Apply caliber filter if present
    if (filterCaliber) {
      ammoItems = ammoItems.filter(item => {
        const itemCaliber = formatCaliber((item.properties.ammo?.caliber as string) || '')
        return itemCaliber.toLowerCase().includes(filterCaliber.toLowerCase())
      })
    }

    // Group by weapon type
    const groups: Record<string, Record<string, WikiItem[]>> = {}
    for (const group of GROUP_ORDER) {
      groups[group] = {}
    }

    for (const item of ammoItems) {
      const group = getAmmoGroup(item)
      const caliber = formatCaliber((item.properties.ammo?.caliber as string) || '') || item.typeName || 'Unknown'
      if (!groups[group]) groups[group] = {}
      if (!groups[group][caliber]) groups[group][caliber] = []
      groups[group][caliber].push(item)
    }

    // Sort each caliber group by penetration power
    for (const group of Object.values(groups)) {
      for (const caliber of Object.keys(group)) {
        const arr = group[caliber]
        if (arr) {
          arr.sort((a, b) => {
            const penA = (a.properties.ammo?.penetrationPower as number) || 0
            const penB = (b.properties.ammo?.penetrationPower as number) || 0
            return penA - penB
          })
        }
      }
    }

    return groups
  }, [items, filterCaliber])

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('ammoOverview')}</h1>
        {filterCaliber && (
          <p className="text-sm text-muted-foreground mt-1">
            {t('caliber')}: {filterCaliber}
          </p>
        )}
      </div>

      {/* Groups */}
      {GROUP_ORDER.map(groupKey => {
        const caliberMap = grouped[groupKey] || {}
        const calibers = Object.keys(caliberMap).sort()
        if (calibers.length === 0) return null

        const labelKey = GROUP_LABEL_KEYS[groupKey] || 'otherAmmo'

        return (
          <div key={groupKey} className="mb-8">
            <h2 className="text-xl font-bold text-center text-foreground mb-4 py-2 border-b border-primary/30">
              {t(labelKey)}
            </h2>

            {calibers.map(caliber => (
              <div key={caliber} className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 mt-4">
                  {CALIBER_DISPLAY[caliber] || caliber}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {(caliberMap[caliber] || []).map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
