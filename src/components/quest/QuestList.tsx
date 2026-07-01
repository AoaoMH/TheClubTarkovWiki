import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuestList } from '@/hooks/useQuests'
import type { QuestSummary, QuestReward } from '@/lib/dataStore'

// ==================== Constants ====================

const NPC_IDS = [
  { id: '54cb50c76803fa8b248b4571', name: 'Prapor' },
  { id: '54cb57776803fa99248b456e', name: 'Therapist' },
  { id: '58330581ace78e27b8b10cee', name: 'Skier' },
  { id: '5935c25fb3acc3127c3d8cd9', name: 'Peacekeeper' },
  { id: '5a7c2eca46aef81a7ca2145d', name: 'Mechanic' },
  { id: '5ac3b934156ae10c4430e83c', name: 'Ragman' },
  { id: '5c0647fdd443bc2504c2d371', name: 'Jaeger' },
  { id: '579dc571d53a0658a154fbec', name: 'Fence' },
  { id: '638f541a29ffd1183d187f57', name: 'Lightkeeper' },
  { id: '656f0f98d80a697f855d34b1', name: 'BTR' },
  { id: '6617beeaa9cfa777ca915b7c', name: 'Ref' },
]

// Currency item IDs that show inline
const CURRENCY_IDS = new Set([
  '5449016a4bdc2d6f028b456f', // Roubles
  '569668774bdc2da2298b4568', // Euros
  '5696686a4bdc2da3298b456a', // Dollars
  '5d235b4d86f7742e017bc88a', // GP coins
])

const QUEST_TYPES = [
  'Elimination', 'PickUp', 'Completion', 'Discover', 'Loyalty',
  'Exploration', 'Multi', 'Skill', 'Merchant', 'WeaponAssembly', 'Standing', 'Experience',
]

// ==================== Reward Rendering ====================

function isInlineReward(r: QuestReward): boolean {
  if (r.type === 'Experience' || r.type === 'TraderStanding' || r.type === 'TraderStandingRestore') return true
  if (r.type === 'Item' && r.itemId && CURRENCY_IDS.has(r.itemId)) return true
  return false
}

function InlineRewardTag({ reward, lang }: { reward: QuestReward; lang: 'zh' | 'en' }) {
  switch (reward.type) {
    case 'Experience':
      return <Badge variant="secondary" className="text-xs shrink-0">+{reward.value} EXP</Badge>
    case 'TraderStanding':
    case 'TraderStandingRestore': {
      const val = reward.value ?? 0
      const color = val >= 0 ? 'text-green-600' : 'text-red-500'
      const sign = val >= 0 ? '+' : ''
      return (
        <Badge variant="secondary" className={`text-xs shrink-0 ${color}`}>
          {sign}{val} {reward.target ? NPC_IDS.find(n => n.id === reward.target)?.name || '' : ''}
        </Badge>
      )
    }
    case 'Item': {
      const name = reward.itemName ? (lang === 'zh' ? reward.itemName.zh : reward.itemName.en) : (reward.itemId || '?')
      const qty = reward.quantity && reward.quantity > 1 ? ` ×${reward.quantity.toLocaleString()}` : ''
      return <Badge variant="secondary" className="text-xs shrink-0">{name}{qty}</Badge>
    }
    default:
      return null
  }
}

function HoverItemRow({ reward, lang }: { reward: QuestReward; lang: 'zh' | 'en' }) {
  const name = reward.itemName ? (lang === 'zh' ? reward.itemName.zh : reward.itemName.en) : (reward.itemId || '?')
  const qty = ` ×${(reward.quantity ?? 1).toLocaleString()}`

  if (reward.itemId) {
    return (
      <Link to={`/item/${reward.itemId}`} className="text-sm text-primary hover:underline whitespace-nowrap">
        {name}{qty}
      </Link>
    )
  }
  return <span className="text-sm whitespace-nowrap">{name}{qty}</span>
}

function HoverOtherRow({ reward, lang }: { reward: QuestReward; lang: 'zh' | 'en' }) {
  if (reward.type === 'AssortmentUnlock' || reward.type === 'ProductionScheme') {
    const name = reward.itemName ? (lang === 'zh' ? reward.itemName.zh : reward.itemName.en) : (reward.itemId || '')
    const label = lang === 'zh' ? (reward.type === 'AssortmentUnlock' ? '解锁商品' : '制造配方') : reward.type
    if (reward.itemId) {
      return <span className="text-sm whitespace-nowrap"><span className="text-muted-foreground">{label}: </span><Link to={`/item/${reward.itemId}`} className="text-primary hover:underline">{name}</Link></span>
    }
    return <span className="text-sm whitespace-nowrap"><span className="text-muted-foreground">{label}: </span>{name}</span>
  }
  if (reward.type === 'Skill') {
    return <span className="text-sm whitespace-nowrap">{reward.target} +{reward.value}</span>
  }
  if (reward.type === 'TraderUnlock') {
    const npcName = NPC_IDS.find(n => n.id === reward.target)?.name || reward.target || ''
    return <span className="text-sm text-muted-foreground whitespace-nowrap">{lang === 'zh' ? '解锁商人' : 'Unlock'}: {npcName}</span>
  }
  if (reward.type === 'Achievement') {
    return <span className="text-sm text-muted-foreground whitespace-nowrap">{lang === 'zh' ? '成就' : 'Achievement'}: {reward.target}</span>
  }
  return <span className="text-sm text-muted-foreground whitespace-nowrap">{reward.type}{reward.target ? `: ${reward.target}` : ''}</span>
}

function RewardsCell({ rewards, lang }: { rewards: QuestReward[]; lang: 'zh' | 'en' }) {
  const inlineRewards = rewards.filter(isInlineReward)
  const itemRewards = rewards.filter(r => r.type === 'Item' && r.itemId && !CURRENCY_IDS.has(r.itemId))
  const otherRewards = rewards.filter(r =>
    !isInlineReward(r) && r.type !== 'Item' && r.type !== 'NotificationPopup' && r.type !== 'WebPromoCode' && r.type !== 'CustomizationDirect' && r.type !== 'Pockets'
  )
  const hoverItems = [...itemRewards, ...otherRewards]

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {inlineRewards.map((r, i) => (
        <InlineRewardTag key={i} reward={r} lang={lang} />
      ))}
      {hoverItems.length > 0 && (
        <HoverCard openDelay={0}>
          <HoverCardTrigger asChild>
            <Badge variant="outline" className="text-xs cursor-pointer shrink-0">
              +{hoverItems.length}
            </Badge>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-fit min-w-[160px] p-3">
            <div className="flex flex-col gap-1.5">
              {itemRewards.map((r, i) => (
                <HoverItemRow key={i} reward={r} lang={lang} />
              ))}
              {otherRewards.map((r, i) => (
                <HoverOtherRow key={`o-${i}`} reward={r} lang={lang} />
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  )
}

// ==================== Main Component ====================

export function QuestList() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'
  const { quests, loading } = useQuestList()
  const navigate = useNavigate()

  // Filter states
  const [npcFilter, setNpcFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [nameSearch, setNameSearch] = useState('')
  const [rewardSearch, setRewardSearch] = useState('')

  // Table state
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageSize: 50, pageIndex: 0 })
  const { pageSize, pageIndex } = pagination

  // Filtered data
  const filteredData = useMemo(() => {
    let result = quests

    if (npcFilter !== 'all') {
      result = result.filter(q => q.traderId === npcFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter(q => q.type === typeFilter)
    }

    if (nameSearch.trim()) {
      const search = nameSearch.toLowerCase()
      result = result.filter(q =>
        q.name.zh.toLowerCase().includes(search) ||
        q.name.en.toLowerCase().includes(search)
      )
    }

    if (rewardSearch.trim()) {
      const search = rewardSearch.toLowerCase()
      result = result.filter(q =>
        q.rewards.some(r => {
          if (r.itemName) {
            return r.itemName.zh.toLowerCase().includes(search) ||
              r.itemName.en.toLowerCase().includes(search)
          }
          if (r.itemId) return r.itemId.includes(search)
          return false
        })
      )
    }

    return result
  }, [quests, npcFilter, typeFilter, nameSearch, rewardSearch])

  // Column definitions
  const columns = useMemo<ColumnDef<QuestSummary>[]>(() => [
    {
      accessorKey: 'name',
      header: t('questName'),
      cell: ({ row }) => {
        const q = row.original
        return (
          <span className="font-medium">
            {lang === 'zh' ? q.name.zh : q.name.en}
          </span>
        )
      },
      sortingFn: (rowA, rowB) => {
        const a = lang === 'zh' ? rowA.original.name.zh : rowA.original.name.en
        const b = lang === 'zh' ? rowB.original.name.zh : rowB.original.name.en
        return a.localeCompare(b)
      },
    },
    {
      accessorKey: 'traderName',
      header: t('npc'),
      cell: ({ row }) => {
        const name = lang === 'zh' ? row.original.traderName.zh : row.original.traderName.en
        return <span className="text-sm">{name}</span>
      },
    },
    {
      accessorKey: 'type',
      header: t('questType'),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {t(`questType_${row.original.type}`, row.original.type)}
        </Badge>
      ),
    },
    {
      id: 'rewards',
      header: t('questRewards'),
      cell: ({ row }) => (
        <RewardsCell rewards={row.original.rewards} lang={lang} />
      ),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button asChild size="sm" variant="ghost">
          <Link to={`/quest/${row.original.id}`}>
            {t('details')}
          </Link>
        </Button>
      ),
      enableSorting: false,
    },
  ], [lang, t])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, pagination: { pageSize, pageIndex } },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (loading) {
    return (
      <div>
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t('quests')}</h2>

      {/* Filter Bar */}
      <div className="space-y-3">
        {/* Row 1: NPC + Type Toggle Groups */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('npc')}</label>
            <ToggleGroup
              type="single"
              value={npcFilter}
              onValueChange={v => setNpcFilter(v || 'all')}
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
            >
              <ToggleGroupItem value="all" className="text-xs">{t('all')}</ToggleGroupItem>
              {NPC_IDS.map(npc => (
                <ToggleGroupItem key={npc.id} value={npc.id} className="text-xs">
                  {npc.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('questType')}</label>
            <ToggleGroup
              type="single"
              value={typeFilter}
              onValueChange={v => setTypeFilter(v || 'all')}
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
            >
              <ToggleGroupItem value="all" className="text-xs">{t('all')}</ToggleGroupItem>
              {QUEST_TYPES.map(type => (
                <ToggleGroupItem key={type} value={type} className="text-xs">
                  {t(`questType_${type}`, type)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* Row 2: Search Inputs */}
        <div className="flex gap-3">
          <Input
            placeholder={t('searchQuestName')}
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder={t('searchReward')}
            value={rewardSearch}
            onChange={e => setRewardSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredData.length} / {quests.length} {t('quests')}
      </p>

      {/* Data Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                      (header.column.id === 'type' || header.column.id === 'actions') && 'hidden md:table-cell'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/quest/${row.original.id}`)}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className={cn(
                      (cell.column.id === 'type' || cell.column.id === 'actions') && 'hidden md:table-cell'
                    )}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  {t('noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span>{t('perPage')}</span>
          <ToggleGroup
            type="single"
            value={String(pageSize)}
            onValueChange={v => { if (v) setPagination(prev => ({ ...prev, pageSize: Number(v), pageIndex: 0 })) }}
            variant="outline"
            size="sm"
          >
            {[20, 50, 100].map(size => (
              <ToggleGroupItem key={size} value={String(size)} className="text-xs px-2">
                {size}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span>{t('rows')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            →
          </Button>
        </div>
      </div>
    </div>
  )
}
