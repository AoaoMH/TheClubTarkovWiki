import { useState, useMemo, useCallback, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ItemSummary } from '@/hooks/useItems'

// ==================== Constants ====================

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

const CALIBER_TYPE: Record<string, number> = {
  '545x39': 0, '556x45NATO': 0, '68x51': 0, '93x64': 0,
  '762x35': 0, '762x39': 0, '9x39': 0, '127x33': 0, '127x55': 0, '127x99': 0, '127x108': 0,
  '762x25TT': 1, '9x18PM': 1, '9x19PARA': 1, '9x21': 1, '57x28': 1, '46x30': 1,
  '9x33R': 1, '1143x23ACP': 1, '11x33R': 1, '20x1mm': 1, '784x49': 1,
  '12g': 2, '20g': 2, '23x75': 2,
  '26x75': 3, '40x46': 3, '40mmRU': 3, '1036x77': 3, '30x29': 3, '25x59': 3, '725': 3,
  '86x70': 0, '366TKM': 0, '762x51': 0, '762x54R': 0, '762x67B': 0, '792x57': 0,
}

function sortCalibers(cals: string[]): string[] {
  return cals.sort((a, b) => {
    const ta = CALIBER_TYPE[a] ?? 99
    const tb = CALIBER_TYPE[b] ?? 99
    if (ta !== tb) return ta - tb
    return (CALIBER_DISPLAY[a] || a).localeCompare(CALIBER_DISPLAY[b] || b)
  })
}

// Type filter (first level)
const TYPE_FILTERS = [
  { value: 'all', label: 'all' },
  { value: 'rifle', label: 'rifleAmmo' },
  { value: 'sniper', label: 'sniperAmmo' },
  { value: 'pistol_smg', label: 'pistolSmgAmmo' },
  { value: 'shotgun', label: 'shotgunAmmo' },
  { value: 'other', label: 'otherAmmo' },
] as const

function formatCaliber(caliber: string): string {
  if (!caliber) return ''
  return caliber.replace(/^Caliber/i, '')
}

function getAmmoGroup(item: ItemSummary): string {
  const caliber = formatCaliber(item.ammo?.caliber || '')
  if (CALIBER_GROUPS[caliber]) return CALIBER_GROUPS[caliber]
  for (const [key, group] of Object.entries(CALIBER_GROUPS)) {
    if (caliber.includes(key) || key.includes(caliber)) return group
  }
  return 'other'
}

// ==================== Armor Effectiveness ====================

type EffTier = 'vhigh' | 'high' | 'med' | 'low' | 'vlow'

function digitTier(pen: number): EffTier {
  const d = pen % 10
  if (d >= 8) return 'high'
  if (d >= 6) return 'med'
  if (d >= 3) return 'low'
  return 'vlow'
}

function calcEff(pen: number, classIdx: number): EffTier {
  const dur = (classIdx + 1) * 10
  if (pen >= dur) return 'vhigh'
  const prevDur = classIdx * 10
  if (classIdx === 0 || pen >= prevDur) return digitTier(pen)
  return 'vlow'
}

// Background + text colors for armor class effectiveness (matching EFTForge)
const EFF_BG: Record<EffTier, string> = {
  vhigh: 'bg-green-900/40 text-green-300',
  high: 'bg-green-900/25 text-green-400',
  med: 'bg-yellow-900/25 text-yellow-300',
  low: 'bg-orange-900/25 text-orange-300',
  vlow: 'bg-red-900/25 text-red-400',
}

// Penetration icon background color thresholds (darkened versions of SPT-Tooltip text colors)
// Original text colors: FFFFFF, 4CAF50, 2196F3, 9C27B0, FF9800, F44336
// Darkened for subtle icon backgrounds
const PEN_BG_COLORS: Array<{ min: number; bg: string }> = [
  { min: 60, bg: 'bg-[#3d1515]' },   // red (was #F44336)
  { min: 50, bg: 'bg-[#3a2510]' },   // orange (was #FF9800)
  { min: 40, bg: 'bg-[#2a1535]' },   // purple (was #9C27B0)
  { min: 30, bg: 'bg-[#152535]' },   // blue (was #2196F3)
  { min: 20, bg: 'bg-[#1a3d1a]' },   // green (was #4CAF50)
]

function getPenBg(pen: number): string {
  for (const tier of PEN_BG_COLORS) {
    if (pen >= tier.min) return tier.bg
  }
  return 'bg-[#2a2a2a]' // dark gray for < 20
}

// Sanitize tracer color string (e.g. "tracerRed" -> "red")
const VALID_TRACER_COLORS = ['red', 'green', 'yellow']
function sanitizeTracerColor(color: string | null): string | null {
  if (!color) return null
  if (/^#[0-9a-fA-F]{3,6}$/.test(color)) return color
  const lower = color.toLowerCase().replace(/^tracer/i, '')
  return VALID_TRACER_COLORS.includes(lower) ? lower : null
}

// ==================== Sort Logic ====================

type SortCol = 'name' | 'damage' | 'penetrationPower' | 'armorDamage' | 'fragmentationChance' |
  'ricochetChance' | 'accuracy' | 'recoil' | 'lightBleedChance' | 'heavyBleedChance' | 'initialSpeed'

function sortVal(item: ItemSummary, col: SortCol, lang: 'zh' | 'en'): number | string {
  const a = item.ammo
  if (!a) return 0
  switch (col) {
    case 'name':
      return lang === 'zh' ? item.common.name.zh : item.common.name.en
    case 'damage':
      return a.damage * (a.projectileCount || 1)
    default:
      return (a as unknown as Record<string, number>)[col] ?? 0
  }
}

// ==================== Cell Renderers ====================

function DeltaCell({ value, invert }: { value: number; invert?: boolean }) {
  if (!value) return null
  const pct = Math.round(value * 100)
  if (pct === 0) return null
  const text = `${pct > 0 ? '+' : ''}${pct}%`
  const good = invert ? pct < 0 : pct > 0
  const color = good ? 'text-blue-400' : 'text-red-400'
  return <span className={color}>{text}</span>
}

function BleedCell({ value }: { value: number }) {
  if (!value) return null
  const pct = Math.round(value * 100)
  if (pct === 0) return null
  return <span>{pct > 0 ? '+' : ''}{pct}%</span>
}

function PctCell({ value }: { value: number }) {
  if (!value) return null
  const pct = Math.round(value * 100)
  if (pct === 0) return null
  return <span>{pct}%</span>
}

// ==================== Main Component ====================

export function AmmoView({ items, filterCaliber }: {
  items: ItemSummary[]
  filterCaliber?: string
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  const [typeFilter, setTypeFilter] = useState('all')
  const [caliberFilter, setCaliberFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('penetrationPower')
  const [sortAsc, setSortAsc] = useState(true)

  // If filterCaliber is passed from URL, use it directly
  const effectiveType = filterCaliber ? null : typeFilter

  // Reset caliber sub-filter when type changes
  const handleTypeChange = useCallback((v: string) => {
    setTypeFilter(v || 'all')
    setCaliberFilter('all')
  }, [])

  const handleSort = useCallback((col: SortCol) => {
    if (sortCol === col) {
      setSortAsc(prev => !prev)
    } else {
      setSortCol(col)
      setSortAsc(true)
    }
  }, [sortCol])

  // Compute available calibers for current type selection
  const availableCalibers = useMemo(() => {
    const ammoItems = items.filter(item =>
      (item.category === 'ammo' || item.typeName === 'Ammo') && item.ammo
    )
    let filtered = ammoItems
    if (effectiveType && effectiveType !== 'all') {
      filtered = filtered.filter(item => getAmmoGroup(item) === effectiveType)
    }
    const calSet = new Set<string>()
    for (const item of filtered) {
      const cal = formatCaliber(item.ammo?.caliber || '')
      if (cal) calSet.add(cal)
    }
    return sortCalibers([...calSet])
  }, [items, effectiveType])

  // Process and group ammo items
  const { groups } = useMemo(() => {
    let ammoItems = items.filter(item =>
      (item.category === 'ammo' || item.typeName === 'Ammo') && item.ammo
    )

    // Apply type filter
    if (effectiveType && effectiveType !== 'all') {
      ammoItems = ammoItems.filter(item => getAmmoGroup(item) === effectiveType)
    }

    // Apply caliber sub-filter
    if (caliberFilter !== 'all') {
      ammoItems = ammoItems.filter(item => {
        const cal = formatCaliber(item.ammo?.caliber || '')
        return cal === caliberFilter
      })
    }

    // Apply URL caliber filter
    if (filterCaliber) {
      ammoItems = ammoItems.filter(item => {
        const c = formatCaliber(item.ammo?.caliber || '')
        return c.toLowerCase().includes(filterCaliber.toLowerCase())
      })
    }

    // Apply search
    if (search.trim()) {
      const s = search.toLowerCase()
      ammoItems = ammoItems.filter(item =>
        item.common.name.zh.toLowerCase().includes(s) ||
        item.common.name.en.toLowerCase().includes(s) ||
        item.common.shortName.zh.toLowerCase().includes(s) ||
        item.common.shortName.en.toLowerCase().includes(s)
      )
    }

    // Group by caliber
    const caliberMap = new Map<string, ItemSummary[]>()
    for (const item of ammoItems) {
      const cal = formatCaliber(item.ammo?.caliber || '') || 'Unknown'
      if (!caliberMap.has(cal)) caliberMap.set(cal, [])
      caliberMap.get(cal)!.push(item)
    }

    // Sort within each caliber
    for (const arr of caliberMap.values()) {
      arr.sort((a, b) => {
        const va = sortVal(a, sortCol, lang)
        const vb = sortVal(b, sortCol, lang)
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        if (typeof va === 'string') {
          const cmp = va.localeCompare(vb as string)
          return sortAsc ? cmp : -cmp
        }
        return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number)
      })
    }

    const sortedCals = sortCalibers([...caliberMap.keys()])
    const groups = sortedCals.map(cal => ({
      caliber: cal,
      display: CALIBER_DISPLAY[cal] || cal,
      items: caliberMap.get(cal) || [],
    }))

    return { groups }
  }, [items, effectiveType, filterCaliber, caliberFilter, search, sortCol, sortAsc, lang])

  const SortHeader = ({ col, label, className, tip }: {
    col: SortCol; label: string; className?: string; tip?: string
  }) => {
    const isActive = sortCol === col
    const arrow = isActive ? (sortAsc ? ' ↑' : ' ↓') : ''
    const content = (
      <span
        className={`cursor-pointer select-none hover:text-foreground transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
        onClick={() => handleSort(col)}
      >
        {label}{arrow}
      </span>
    )
    if (tip) {
      return (
        <TableHead className={className}>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>{tip}</TooltipContent>
          </Tooltip>
        </TableHead>
      )
    }
    return <TableHead className={className}>{content}</TableHead>
  }

  // i18n column labels matching EFTForge
  const tCol = (key: string) => t(`ammoCol.${key}`)
  const tTip = (key: string) => t(`ammoTip.${key}`)

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="space-y-3">
        {/* Row 1: Type filter + Search */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('type')}</label>
            <ToggleGroup
              type="single"
              value={typeFilter}
              onValueChange={handleTypeChange}
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
            >
              {TYPE_FILTERS.map(f => (
                <ToggleGroupItem key={f.value} value={f.value} className="text-xs">
                  {t(f.label)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div>
            <Input
              placeholder={t('ammo.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </div>

        {/* Row 2: Caliber sub-filter (only when a specific type is selected) */}
        {typeFilter !== 'all' && availableCalibers.length > 1 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('caliber')}</label>
            <ToggleGroup
              type="single"
              value={caliberFilter}
              onValueChange={v => setCaliberFilter(v || 'all')}
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
            >
              <ToggleGroupItem value="all" className="text-xs">{t('all')}</ToggleGroupItem>
              {availableCalibers.map(cal => (
                <ToggleGroupItem key={cal} value={cal} className="text-xs">
                  {CALIBER_DISPLAY[cal] || cal}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
      </div>

      {filterCaliber && (
        <p className="text-sm text-muted-foreground">
          {t('caliber')}: {CALIBER_DISPLAY[filterCaliber] || filterCaliber}
        </p>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <SortHeader col="name" label={tCol('name')} />
              <SortHeader col="damage" label={tCol('dmg')} className="text-right w-14" tip={tTip('dmg')} />
              <SortHeader col="penetrationPower" label={tCol('pen')} className="text-right w-12" tip={tTip('pen')} />
              <SortHeader col="armorDamage" label={tCol('armorDmg')} className="text-right w-14" tip={tTip('armorDmg')} />
              <SortHeader col="fragmentationChance" label={tCol('frag')} className="text-right w-12" tip={tTip('frag')} />
              <SortHeader col="ricochetChance" label={tCol('rico')} className="text-right w-12" tip={tTip('rico')} />
              <SortHeader col="accuracy" label={tCol('acc')} className="text-right w-12" tip={tTip('acc')} />
              <SortHeader col="recoil" label={tCol('recoil')} className="text-right w-12" tip={tTip('recoil')} />
              <SortHeader col="lightBleedChance" label={tCol('ltBleed')} className="text-right w-14" tip={tTip('ltBleed')} />
              <SortHeader col="heavyBleedChance" label={tCol('hvBleed')} className="text-right w-14" tip={tTip('hvBleed')} />
              <SortHeader col="initialSpeed" label={tCol('velocity')} className="text-right w-14" tip={tTip('velocity')} />
              {[1, 2, 3, 4, 5, 6].map(c => (
                <TableHead key={c} className="text-center text-xs w-12">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">{c}</span>
                    </TooltipTrigger>
                    <TooltipContent>{tTip(`class${c}`)}</TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map(group => (
              <Fragment key={group.caliber}>
                {/* Caliber group header */}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={18} className="font-semibold text-sm text-muted-foreground py-1.5">
                    {group.display}
                  </TableCell>
                </TableRow>
                {/* Data rows */}
                {group.items.map(item => {
                  const a = item.ammo!
                  const pellets = a.projectileCount || 1
                  const name = lang === 'zh' ? item.common.name.zh : item.common.name.en
                  const shortName = lang === 'zh' ? item.common.shortName.zh : item.common.shortName.en
                  const pen = a.penetrationPower ?? 0
                  const isSubsonic = a.initialSpeed != null && a.initialSpeed < 343

                  return (
                    <TableRow key={item.id}>
                      {/* Icon with pen-color background */}
                      <TableCell className={`w-10 p-1 ${getPenBg(a.penetrationPower)}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="w-7 h-7 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-7 h-7 bg-secondary rounded-sm" />
                          )}
                          <span className="text-[9px] text-muted-foreground leading-tight text-center max-w-[40px] truncate">
                            {shortName}
                          </span>
                        </div>
                      </TableCell>
                      {/* Name */}
                      <TableCell className="max-w-[180px] whitespace-normal break-words">
                        <Link to={`/item/${item.id}`} className="hover:text-primary hover:underline transition-colors text-sm font-medium">
                          {name}
                        </Link>
                        {isSubsonic && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <sup className="text-[10px] text-muted-foreground font-semibold cursor-help ml-0.5">S</sup>
                            </TooltipTrigger>
                            <TooltipContent>{t('ammo.sup.subsonic')}</TooltipContent>
                          </Tooltip>
                        )}
                        {a.tracer && (() => {
                          const tc = sanitizeTracerColor(a.tracerColor)
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <sup
                                  className="text-[10px] font-semibold cursor-help ml-0.5"
                                  style={tc ? { color: tc } : undefined}
                                >T</sup>
                              </TooltipTrigger>
                              <TooltipContent>{tc ? t(`ammo.sup.tracer.${tc}`) : t('ammo.sup.tracer')}</TooltipContent>
                            </Tooltip>
                          )
                        })()}
                      </TableCell>
                      {/* Damage */}
                      <TableCell className="text-right text-sm w-14">
                        {pellets > 1 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{pellets}×{a.damage}</span>
                            </TooltipTrigger>
                            <TooltipContent>{t('damage')}: {pellets * a.damage}</TooltipContent>
                          </Tooltip>
                        ) : a.damage || null}
                      </TableCell>
                      {/* Pen */}
                      <TableCell className="text-right text-sm w-12">
                        {a.penetrationPower || null}
                      </TableCell>
                      {/* Armor Dmg */}
                      <TableCell className="text-right text-sm w-14">{a.armorDamage || null}</TableCell>
                      {/* Frag */}
                      <TableCell className="text-right text-sm w-12"><PctCell value={a.fragmentationChance ?? 0} /></TableCell>
                      {/* Rico */}
                      <TableCell className="text-right text-sm w-12"><PctCell value={a.ricochetChance ?? 0} /></TableCell>
                      {/* Acc */}
                      <TableCell className="text-right text-sm w-12"><DeltaCell value={a.accuracy ?? 0} /></TableCell>
                      {/* Recoil */}
                      <TableCell className="text-right text-sm w-12"><DeltaCell value={a.recoil ?? 0} invert /></TableCell>
                      {/* Lt Bleed */}
                      <TableCell className="text-right text-sm w-14"><BleedCell value={a.lightBleedChance ?? 0} /></TableCell>
                      {/* Hv Bleed */}
                      <TableCell className="text-right text-sm w-14"><BleedCell value={a.heavyBleedChance ?? 0} /></TableCell>
                      {/* Velocity */}
                      <TableCell className="text-right text-sm w-14">{a.initialSpeed ? Math.round(a.initialSpeed) : null}</TableCell>
                      {/* Armor Class 1-6 */}
                      {[0, 1, 2, 3, 4, 5].map(ci => {
                        const tier = calcEff(pen, ci)
                        return (
                          <TableCell key={ci} className={`text-center text-xs w-12 py-1 ${EFF_BG[tier]}`}>
                            {t(`ammoEff.${tier}`)}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </Fragment>
            ))}
            {groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={18} className="text-center text-muted-foreground py-8">
                  {t('noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
