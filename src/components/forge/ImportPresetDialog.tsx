/**
 * Import / Preset dialog with sortable stats table.
 * Top: spark code import input.
 * Below: unified table (own presets pinned first, then others).
 * Columns: 名称 | 人机 | 垂直后坐力 | 水平后坐力 | 精度(MOA) | 瞄具有效距离 | 弹匣 | 重量 | 操作
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { apiFetch } from '@/lib/apiFetch'
import { forgeConfig } from '@/lib/forgeConfig'
import { decodeSparkCodeToAttachments } from '@/lib/sparkCode'
import type { GunSlot } from '@/lib/forgeApi'

const apiBase = () => forgeConfig.API_BASE

interface PresetStats {
  ergo: number
  recoilVertical: number | null
  recoilHorizontal: number | null
  accuracyMoa: number | null
  sightingRange: number | null
  magazineCapacity: number | null
  totalWeight: number
}

interface PresetWithStats {
  id: string
  name: string
  author: string
  isOwn: boolean
  canDelete: boolean
  stats: PresetStats | null
  attachments: Record<string, string>
  childSlots?: Record<string, GunSlot[]>
}

type SortKey = keyof PresetStats
type SortDir = 'asc' | 'desc'

interface ImportPresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gunId: string
  onLoadPreset: (attachments: Record<string, string>, childSlots?: Record<string, GunSlot[]>) => void
}

function formatStat(value: number | null, decimals: number = 0): string {
  if (value === null || value === undefined) return '-'
  return value.toFixed(decimals)
}

export function ImportPresetDialog({
  open,
  onOpenChange,
  gunId,
  onLoadPreset,
}: ImportPresetDialogProps) {
  const [presets, setPresets] = useState<PresetWithStats[]>([])
  const [loading, setLoading] = useState(false)
  const [importCode, setImportCode] = useState('')
  const [importing, setImporting] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('recoilVertical')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const fetchPresets = useCallback(async () => {
    if (!gunId) return
    setLoading(true)
    try {
      const res = await apiFetch(`${apiBase()}/api/forge/guns/${gunId}/presets`)
      if (!res.ok) return
      const data = await res.json()
      setPresets(data.presets || [])
    } catch {
      setPresets([])
    } finally {
      setLoading(false)
    }
  }, [gunId])

  useEffect(() => {
    if (open) {
      fetchPresets()
      setImportCode('')
    }
  }, [open, fetchPresets])

  // Sort: own presets first (sorted), then others (sorted)
  const sortedPresets = useMemo(() => {
    const sortFn = (a: PresetWithStats, b: PresetWithStats) => {
      const aVal = a.stats?.[sortKey] ?? null
      const bVal = b.stats?.[sortKey] ?? null
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    }

    const own = presets.filter(p => p.isOwn).sort(sortFn)
    const others = presets.filter(p => !p.isOwn).sort(sortFn)
    return [...own, ...others]
  }, [presets, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleLoad = (preset: PresetWithStats) => {
    onLoadPreset(preset.attachments, preset.childSlots)
    onOpenChange(false)
    toast.success(`已加载方案: ${preset.name}`)
  }

  const handleImportCode = async () => {
    if (!importCode.trim()) return
    setImporting(true)
    try {
      const result = await decodeSparkCodeToAttachments(importCode.trim())
      if (!result) {
        toast.error('配置码解析失败，请检查格式')
        return
      }
      if (result.gunId !== gunId) {
        toast.error('配置码对应的武器与当前武器不匹配')
        return
      }
      onLoadPreset(result.attachments, result.childSlots)
      onOpenChange(false)
      toast.success('配置码导入成功')
      setImportCode('')
    } catch {
      toast.error('导入失败，请检查配置码')
    } finally {
      setImporting(false)
    }
  }

  const sortableCols: { key: SortKey; label: string }[] = [
    { key: 'ergo', label: '人机' },
    { key: 'recoilVertical', label: '垂直后坐力' },
    { key: 'recoilHorizontal', label: '水平后坐力' },
    { key: 'accuracyMoa', label: '精度(MOA)' },
    { key: 'sightingRange', label: '瞄具有效距离' },
    { key: 'magazineCapacity', label: '弹匣' },
    { key: 'totalWeight', label: '重量' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入 / 预设</DialogTitle>
        </DialogHeader>

        {/* Spark code import */}
        <div className="flex gap-2">
          <textarea
            placeholder="粘贴改枪码..."
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            className="flex-1 min-h-[60px] max-h-[100px] text-xs rounded-md border border-input bg-transparent px-3 py-2 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            disabled={importing}
          />
          <Button
            onClick={handleImportCode}
            disabled={importing || !importCode.trim()}
            size="sm"
            className="text-xs whitespace-nowrap"
          >
            {importing ? '导入中...' : '导入改枪码'}
          </Button>
        </div>

        {/* Presets table */}
        <div className="border border-border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">名称</TableHead>
                {sortableCols.map(col => (
                  <TableHead
                    key={col.key}
                    className="text-xs cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                ))}
                <TableHead className="text-xs text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-4">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : sortedPresets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-4">
                    暂无方案
                  </TableCell>
                </TableRow>
              ) : (
                sortedPresets.map(preset => (
                  <TableRow key={preset.id} className={preset.isOwn ? 'bg-primary/5' : ''}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {preset.author}{preset.isOwn && ' (我)'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{formatStat(preset.stats?.ergo ?? null)}</TableCell>
                    <TableCell className="text-xs">{formatStat(preset.stats?.recoilVertical ?? null)}</TableCell>
                    <TableCell className="text-xs">{formatStat(preset.stats?.recoilHorizontal ?? null)}</TableCell>
                    <TableCell className="text-xs">{formatStat(preset.stats?.accuracyMoa ?? null, 2)}</TableCell>
                    <TableCell className="text-xs">{formatStat(preset.stats?.sightingRange ?? null)}</TableCell>
                    <TableCell className="text-xs">{formatStat(preset.stats?.magazineCapacity ?? null)}</TableCell>
                    <TableCell className="text-xs">{formatStat(preset.stats?.totalWeight ?? null, 3)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleLoad(preset)}
                      >
                        加载
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
