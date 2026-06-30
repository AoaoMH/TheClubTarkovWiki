/**
 * Save/Share dialog for forge workbench.
 * Three sections: save preset, copy config code, saved presets list.
 * Replaces old inline preset dialog + share button.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { encodeSparkCode } from '@/lib/sparkCode'
import {
  getPresetsForGun,
  savePreset,
  overwritePreset,
  deletePreset,
  type SavedPreset,
} from '@/lib/presetApi'
import type { GunInitData, GunSlot } from '@/lib/forgeApi'

interface SaveShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gunId: string
  gunData: GunInitData
  installedAttachments: Record<string, string>
  childSlotsMap: Record<string, GunSlot[]>
  onLoadPreset: (attachments: Record<string, string>) => void
}

export function SaveShareDialog({
  open,
  onOpenChange,
  gunId,
  gunData,
  installedAttachments,
  childSlotsMap,
  onLoadPreset,
}: SaveShareDialogProps) {
  const { user } = useAuth()
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState<SavedPreset[]>([])
  const [loadingPresets, setLoadingPresets] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch presets when dialog opens
  const fetchPresets = useCallback(async () => {
    if (!user || !gunId) {
      setPresets([])
      return
    }
    setLoadingPresets(true)
    try {
      const list = await getPresetsForGun(gunId)
      setPresets(list)
    } catch {
      setPresets([])
    } finally {
      setLoadingPresets(false)
    }
  }, [user, gunId])

  useEffect(() => {
    if (open) {
      fetchPresets()
      setPresetName(gunData.name)
    }
  }, [open, fetchPresets, gunData.name])

  // Save preset
  const handleSave = async () => {
    if (!user) {
      toast.error('请先登录')
      return
    }
    if (!presetName.trim()) return

    setSaving(true)
    try {
      await savePreset(presetName.trim(), gunId, gunData.name, installedAttachments)
      toast.success('预设保存成功')
      await fetchPresets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // Copy config code (WBM format)
  const handleCopyCode = async () => {
    try {
      const code = encodeSparkCode(gunId, gunData, childSlotsMap, installedAttachments)
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('配置码已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  // Load preset into workbench
  const handleLoad = (preset: SavedPreset) => {
    onLoadPreset(preset.attachments)
    onOpenChange(false)
    toast.success(`已加载预设: ${preset.name}`)
  }

  // Overwrite preset with current build
  const handleOverwrite = async (preset: SavedPreset) => {
    try {
      await overwritePreset(preset.id, installedAttachments)
      toast.success(`已覆盖预设: ${preset.name}`)
      await fetchPresets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '覆盖失败')
    }
  }

  // Delete preset
  const handleDelete = async (preset: SavedPreset) => {
    try {
      await deletePreset(preset.id)
      toast.success(`已删除预设: ${preset.name}`)
      await fetchPresets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>保存 / 分享</DialogTitle>
        </DialogHeader>

        {/* Section 1: Save Preset */}
        <div className="space-y-2">
          <label className="text-sm font-medium">保存预设</label>
          {user ? (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="预设名称..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
                maxLength={60}
                className="flex-1"
              />
              <Button
                onClick={handleSave}
                disabled={saving || !presetName.trim()}
                size="sm"
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">登录后可保存预设</span>
              <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}>
                <Button size="sm" variant="outline">登录</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Section 2: Copy Config Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">分享配置</label>
          <Button
            onClick={handleCopyCode}
            variant="outline"
            className="w-full"
          >
            {copied ? '已复制' : '复制配置码'}
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Section 3: Saved Presets */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            已保存预设
            {presets.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({presets.length})</span>
            )}
          </label>

          {!user ? (
            <p className="text-sm text-muted-foreground py-2">登录后查看已保存预设</p>
          ) : loadingPresets ? (
            <p className="text-sm text-muted-foreground py-2">加载中...</p>
          ) : presets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">暂无保存的预设</p>
          ) : (
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-2 rounded-md border border-border p-2"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start text-sm"
                    onClick={() => handleLoad(preset)}
                  >
                    {preset.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOverwrite(preset)}
                    className="text-xs"
                  >
                    覆盖
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(preset)}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
