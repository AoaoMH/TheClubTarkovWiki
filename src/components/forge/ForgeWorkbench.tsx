import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useForgeStore } from '@/hooks/useForgeStore'
import { fetchGunInit, calculateBuild, fetchItemSlots, fetchAllowedItems, fetchAmmo } from '@/lib/forgeApi'
import type { GunSlot, AmmoItem, AllowedItem, BuildStats } from '@/lib/forgeApi'
import { AttachmentGrid } from './AttachmentGrid'
import { TreeView } from './TreeView'
import { SlotSelector } from './SlotSelector'
import { StatsPanel } from './StatsPanel'
import { BuildHistory, getShareUrl, getPresetsForGun, savePreset, deletePreset } from '@/lib/forgeUtils'
import './forge.css'

const buildHistory = new BuildHistory()

// Default weapon stats for hover preview baseline
const EMPTY_PREVIEW: BuildStats | null = null

export function ForgeWorkbench() {
  const { gunId } = useParams<{ gunId: string }>()
  const [searchParams] = useSearchParams()
  const {
    gunData, loading, error, stats,
    setGunId, setGunData, setLoading, setError, setStats,
    installedAttachments, childSlotsMap,
    installAttachment, removeAttachment, setChildSlots, removeChildSlots,
  } = useForgeStore()

  const [activeSlot, setActiveSlot] = useState<{ slot: GunSlot; parentSlotPath?: string; slotPath: string } | null>(null)
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const [showShareToast, setShowShareToast] = useState(false)
  const [showPresetDialog, setShowPresetDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [savedPresets, setSavedPresets] = useState(() => gunId ? getPresetsForGun(gunId) : [])
  const [ammoList, setAmmoList] = useState<AmmoItem[]>([])
  const [selectedAmmoId, setSelectedAmmoId] = useState<string | null>(null)
  const [assumeFullMag, setAssumeFullMag] = useState(true)
  const [ammoDropdownOpen, setAmmoDropdownOpen] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [previewStats, setPreviewStats] = useState<BuildStats | null>(EMPTY_PREVIEW)
  const [previewItem, setPreviewItem] = useState<AllowedItem | null>(null)
  const [conflictHighlightId, setConflictHighlightId] = useState<string | null>(null)

  // Panel resizer state
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const resizerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem('forge_panel_width') || '660')
    return saved >= 660 ? saved : 660
  })

  const prevGunId = useRef<string | null>(null)
  const prevAttachments = useRef<Record<string, string>>({})

  // Panel resizer drag handlers
  const onResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftPanelRef.current?.offsetWidth || 660
    const container = containerRef.current
    if (!container) return
    const maxWidth = container.offsetWidth - 720 - 16

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    resizerRef.current?.classList.add('dragging')

    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.min(maxWidth, Math.max(660, startW + (ev.clientX - startX)))
      setPanelWidth(newWidth)
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      resizerRef.current?.classList.remove('dragging')
      localStorage.setItem('forge_panel_width', String(leftPanelRef.current?.offsetWidth || 660))
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  // Hover preview: compute simulated stats when hovering over an attachment
  // Key: must SUBTRACT the currently installed item's modifiers before adding the hovered item's,
  // because hovering simulates REPLACING the installed item, not stacking on top of it.
  const handleHoverItem = useCallback((item: AllowedItem | null) => {
    if (!item) {
      setPreviewStats(null)
      setPreviewItem(null)
      return
    }
    setPreviewItem(item)
    if (stats) {
      // Find the currently installed item in the active slot to subtract its modifiers
      const currentSlotPath = activeSlot?.slotPath
      const installedItemId = currentSlotPath ? installedAttachments[currentSlotPath] : undefined
      const currentInstalledItem = installedItemId
        ? activeSlot?.slot.allowedItems.find(i => i.id === installedItemId)
        : undefined

      // Subtract old item's modifiers, then add hovered item's modifiers (replacement)
      const oldRecoil = currentInstalledItem?.recoil ?? 0
      const oldAccuracy = currentInstalledItem?.accuracy ?? 0
      const oldErgo = currentInstalledItem?.ergonomicsModifier ?? 0
      const oldWeight = currentInstalledItem?.weight ?? 0

      const newRecoilMod = stats.totalRecoilMod - oldRecoil + item.recoil
      const newAccMod = stats.totalAccuracyMod - oldAccuracy + item.accuracy

      // Recoil: baseRecoilV * (1 + totalRecoilMod/100)
      // ratio = (100 + newMod) / (100 + oldMod)
      const recoilRatio = (100 + newRecoilMod) / (100 + stats.totalRecoilMod)
      const newRecoilV = stats.recoilVertical !== null ? Math.round(stats.recoilVertical * recoilRatio) : null
      const newRecoilH = stats.recoilHorizontal !== null ? Math.round(stats.recoilHorizontal * recoilRatio) : null

      // Accuracy: 34.36 * COI * (1 - accMod/100)
      // ratio = (100 - newAccMod) / (100 - oldAccMod)
      let newAccuracyMoa = stats.accuracyMoa
      if (stats.accuracyMoa !== null && newAccMod !== stats.totalAccuracyMod) {
        const accRatio = (100 - newAccMod) / (100 - stats.totalAccuracyMod)
        newAccuracyMoa = Math.round(stats.accuracyMoa * accRatio * 100) / 100
      }

      setPreviewStats({
        ...stats,
        totalRecoilMod: newRecoilMod,
        totalAccuracyMod: newAccMod,
        totalErgo: Math.round((stats.totalErgo - oldErgo + item.ergonomicsModifier) * 100) / 100,
        totalWeight: Math.round((stats.totalWeight - oldWeight + item.weight) * 1000) / 1000,
        recoilVertical: newRecoilV,
        recoilHorizontal: newRecoilH,
        accuracyMoa: newAccuracyMoa,
      })
    }
  }, [stats, activeSlot, installedAttachments])

  // Conflict highlight: flash the conflicting part in the workbench on hover
  const handleConflictHover = useCallback((conflictingItemId: string | null) => {
    setConflictHighlightId(conflictingItemId)
  }, [])

  // Load gun init data when gunId changes
  useEffect(() => {
    if (!gunId) return
    if (prevGunId.current === gunId) return
    prevGunId.current = gunId

    useForgeStore.getState().reset()
    buildHistory.clear()
    setGunId(gunId)
    setLoading(true)
    setError(null)
    setSavedPresets(getPresetsForGun(gunId))

    fetchGunInit(gunId, 'zh')
      .then((data) => {
        setGunData(data)
        setLoading(false)
        const sharedBuild = searchParams.get('build')
        if (sharedBuild) {
          import('@/lib/forgeUtils').then(({ decodeBuild }) => {
            const build = decodeBuild(sharedBuild)
            if (build && build.attachments) {
              for (const [slotPath, itemId] of Object.entries(build.attachments)) {
                installAttachment(slotPath, itemId)
              }
            }
          })
        } else if (data.factoryPreset && data.factoryPreset.length > 0) {
          for (const pair of data.factoryPreset) {
            if (!pair.slotName.includes(':')) {
              installAttachment(pair.slotName, pair.itemId)
            }
          }
        }
      })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gunId])

  // Track attachment changes for undo/redo
  useEffect(() => {
    const current = useForgeStore.getState().installedAttachments
    if (prevAttachments.current && Object.keys(prevAttachments.current).length >= 0) {
      const changed = JSON.stringify(prevAttachments.current) !== JSON.stringify(current)
      if (changed && prevGunId.current === gunId) {
        buildHistory.pushState(prevAttachments.current)
        setUndoCount(buildHistory.canUndo() ? 1 : 0)
        setRedoCount(0)
      }
    }
    prevAttachments.current = { ...current }
  }, [installedAttachments])

  // Fetch child slots when attachments change
  useEffect(() => {
    if (!gunData) return
    for (const [slotPath, itemId] of Object.entries(installedAttachments)) {
      if (!childSlotsMap[slotPath]) {
        fetchItemSlots(itemId).then((res) => {
          if (res.slots && res.slots.length > 0) {
            Promise.all(
              res.slots.map(slot =>
                fetchAllowedItems(itemId, slot.name, 'zh').then(r => ({ ...slot, allowedItems: r.items }))
              )
            ).then(slotsWithItems => setChildSlots(slotPath, slotsWithItems))
          } else {
            setChildSlots(slotPath, [])
          }
        }).catch(() => setChildSlots(slotPath, []))
      }
    }
    for (const key of Object.keys(childSlotsMap)) {
      if (!installedAttachments[key]) removeChildSlots(key)
    }
  }, [installedAttachments, gunData])

  // Recalculate stats
  useEffect(() => {
    if (!gunId || !gunData) return
    const installedIds = Object.values(installedAttachments)
    calculateBuild(gunId, installedIds, assumeFullMag, selectedAmmoId).then(setStats).catch(() => {})
  }, [installedAttachments, gunId, gunData, assumeFullMag, selectedAmmoId])

  // Fetch ammo list
  useEffect(() => {
    if (!gunData?.weapon?.caliber) return
    fetchAmmo(gunData.weapon.caliber, 'zh').then(items => {
      setAmmoList(items)
      if (gunData.weapon?.defaultAmmo) setSelectedAmmoId(gunData.weapon.defaultAmmo)
      else if (items[0]) setSelectedAmmoId(items[0].id)
    }).catch(() => {})
  }, [gunData])

  const handleUndo = useCallback(() => {
    const current = useForgeStore.getState().installedAttachments
    const prev = buildHistory.undo(current)
    if (prev) {
      useForgeStore.setState({ installedAttachments: { ...prev } })
      setUndoCount(buildHistory.canUndo() ? 1 : 0)
      setRedoCount(buildHistory.canRedo() ? 1 : 0)
      prevAttachments.current = { ...prev }
    }
  }, [])

  const handleRedo = useCallback(() => {
    const current = useForgeStore.getState().installedAttachments
    const next = buildHistory.redo(current)
    if (next) {
      useForgeStore.setState({ installedAttachments: { ...next } })
      setUndoCount(buildHistory.canUndo() ? 1 : 0)
      setRedoCount(buildHistory.canRedo() ? 1 : 0)
      prevAttachments.current = { ...next }
    }
  }, [])

  const handleShare = useCallback(() => {
    if (!gunId) return
    const url = getShareUrl(gunId, installedAttachments)
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    })
  }, [gunId, installedAttachments])

  const handleReset = useCallback(() => {
    if (!gunId) return
    useForgeStore.getState().reset()
    buildHistory.clear()
    prevGunId.current = null
    prevAttachments.current = {}
    setUndoCount(0); setRedoCount(0)
    setTimeout(() => {
      prevGunId.current = null
      setGunId(gunId); setLoading(true); setError(null)
      fetchGunInit(gunId, 'zh').then((data) => {
        setGunData(data); setLoading(false)
        if (data.factoryPreset && data.factoryPreset.length > 0) {
          for (const pair of data.factoryPreset) {
            if (!pair.slotName.includes(':')) installAttachment(pair.slotName, pair.itemId)
          }
        }
      }).catch((err) => { setError(err.message); setLoading(false) })
    }, 0)
  }, [gunId])

  const handleStrip = useCallback(() => {
    const current = useForgeStore.getState().installedAttachments
    for (const key of Object.keys(current)) removeAttachment(key)
  }, [])

  const handleSavePreset = useCallback(() => {
    if (!gunId || !gunData || !presetName.trim()) return
    savePreset(presetName.trim(), gunId, gunData.name, installedAttachments)
    setSavedPresets(getPresetsForGun(gunId))
    setPresetName(''); setShowPresetDialog(false)
  }, [gunId, gunData, presetName, installedAttachments])

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = getPresetsForGun(gunId || '').find(p => p.id === presetId)
    if (!preset) return
    const current = useForgeStore.getState().installedAttachments
    for (const key of Object.keys(current)) removeAttachment(key)
    setTimeout(() => {
      for (const [slotPath, itemId] of Object.entries(preset.attachments)) installAttachment(slotPath, itemId)
    }, 50)
  }, [gunId])

  const handleDeletePreset = useCallback((presetId: string) => {
    deletePreset(presetId)
    setSavedPresets(getPresetsForGun(gunId || ''))
  }, [gunId])

  if (loading) return (<div className="forge-root forge-loading"><div className="forge-loading-text">加载工作台...</div></div>)
  if (error) return (<div className="forge-root forge-loading"><div className="forge-error-text">错误: {error}</div><Link to={`/item/${gunId}`} className="forge-back-link">← 返回物品页</Link></div>)
  if (!gunData) return null

  // Collect all slots - filter out child slots with no installed item AND no allowed items
  // (matches original EFTForge collectAllVisibleSlots behavior)
  const allSlots: { slot: GunSlot; slotPath: string; parentSlotPath?: string }[] = []
  for (const slot of gunData.slots) allSlots.push({ slot, slotPath: slot.name })
  for (const [parentPath, childSlots] of Object.entries(childSlotsMap)) {
    for (const childSlot of childSlots) {
      // Skip slots with no installed item and no allowed items (empty filter)
      const childPath = `${parentPath}:${childSlot.name}`
      const hasInstalled = !!installedAttachments[childPath]
      const hasAllowedItems = childSlot.allowedItems && childSlot.allowedItems.length > 0
      if (!hasInstalled && !hasAllowedItems) continue
      allSlots.push({ slot: childSlot, slotPath: childPath, parentSlotPath: parentPath })
    }
  }

  // Active slot path for highlight
  const activeSlotPath = activeSlot
    ? (activeSlot.parentSlotPath ? `${activeSlot.parentSlotPath}:${activeSlot.slot.name}` : activeSlot.slot.name)
    : null

  // Stats to display: preview if hovering, otherwise actual
  const displayStats = previewStats || stats

  return (
    <div className="forge-root">
      <div className="forge-topbar">
        <Link to={`/item/${gunId}`} className="forge-back-link">← 返回</Link>
        <div className="forge-topbar-divider" />
        <h2 className="forge-topbar-title">{gunData.name}</h2>
      </div>

      <div className="container" ref={containerRef}>
        {/* LEFT PANEL */}
        <div className="left-panel" ref={leftPanelRef} style={{ width: `${panelWidth}px` }}>
          <div id="left-build-area">
            <div id="build-controls">
              <button className="back-button" onClick={handleReset}>↺ 重置</button>
              <button className="back-button" onClick={handleStrip}>✂ 清空</button>
              <button className="back-button" onClick={handleShare}>🔗 分享</button>
              <button className="back-button" onClick={() => setShowPresetDialog(!showPresetDialog)}>💾 预设</button>
            </div>

            {/* Preset dialog */}
            {showPresetDialog && (
              <div style={{ margin: '8px 20px 8px 0', padding: '12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <input type="text" placeholder="预设名称..." value={presetName} onChange={e => setPresetName(e.target.value)} className="forge-search-input" style={{ margin: 0, flex: 1 }} />
                  <button className="back-button" onClick={handleSavePreset} style={{ width: 'auto', margin: 0, fontSize: '12px', padding: '5px 10px' }}>保存</button>
                </div>
                {savedPresets.length > 0 && (
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {savedPresets.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid #222' }}>
                        <button className="back-button" onClick={() => handleLoadPreset(p.id)} style={{ width: 'auto', margin: 0, fontSize: '12px', padding: '3px 8px', flex: 1, textAlign: 'left' }}>{p.name}</button>
                        <button onClick={() => handleDeletePreset(p.id)} style={{ background: 'none', border: 'none', color: '#f44', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {savedPresets.length === 0 && <div style={{ color: '#555', fontSize: '12px', textAlign: 'center', padding: '8px' }}>暂无保存的预设</div>}
              </div>
            )}

            {/* Stats panel with mag controls inside (matching original #stats structure) */}
            <div id="stats">
              {/* Mag controls + ammo selector (above stats content, matching original) */}
              {ammoList.length > 0 && (
              <div className="mag-controls">
                <button
                  className={`compare-toggle${assumeFullMag ? ' active' : ''}`}
                  onClick={() => setAssumeFullMag(!assumeFullMag)}
                >
                  装满弹匣
                  <span className="compare-toggle-track"><span className="compare-toggle-knob" /></span>
                </button>
                <div className={`custom-select-wrapper${assumeFullMag ? '' : ' ammo-disabled'}${ammoDropdownOpen ? ' open' : ''}`}>
                  <div className="custom-select-trigger" onClick={() => assumeFullMag && setAmmoDropdownOpen(!ammoDropdownOpen)}>
                    {(() => {
                      const sorted = [...ammoList].sort((a, b) => a.ammo.penetrationPower - b.ammo.penetrationPower)
                      const selected = sorted.find(a => a.id === selectedAmmoId) || sorted[0]
                      return selected ? `${selected.name} - ${selected.ammo.damage}伤/${selected.ammo.penetrationPower}穿 ${selected.weight.toFixed(3)}kg${selected.ammo.tracer ? ' ★' : ''}` : ''
                    })()}
                  </div>
                  <select
                    value={selectedAmmoId || ''}
                    onChange={e => setSelectedAmmoId(e.target.value)}
                    disabled={!assumeFullMag}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                  >
                    {[...ammoList].sort((a, b) => a.ammo.penetrationPower - b.ammo.penetrationPower).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} - {a.ammo.damage}伤/{a.ammo.penetrationPower}穿 {a.weight.toFixed(3)}kg{a.ammo.tracer ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="custom-select-list">
                    {[...ammoList].sort((a, b) => a.ammo.penetrationPower - b.ammo.penetrationPower).map((a, i) => (
                      <div
                        key={a.id}
                        className={`custom-select-option${a.id === selectedAmmoId ? ' selected' : ''}`}
                        style={{ ['--i' as string]: i, animationDelay: `${i * 25}ms` }}
                        onClick={() => { setSelectedAmmoId(a.id); setAmmoDropdownOpen(false) }}
                      >
                        {a.name} - {a.ammo.damage}伤/{a.ammo.penetrationPower}穿 {a.weight.toFixed(3)}kg{a.ammo.tracer ? ' ★' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

              {/* Stats content */}
              {displayStats && (
                <StatsPanel
                  stats={displayStats}
                  baseStats={previewStats ? stats : null}
                  previewItem={previewItem}
                />
              )}
            </div>

            {/* Workbench / grid or tree view */}
            <div id="slots">
              {gunData.slots.length > 0 ? (
                <div className="stats-section">
                  <div className="section-title">
                    <span>工作台</span>
                    <span className="tree-swipe-hint">右键移除</span>
                    <span className="undo-redo-group">
                      <button className="back-button" onClick={handleUndo} disabled={undoCount === 0} style={{ opacity: undoCount === 0 ? 0.4 : 1, width: 'auto', fontSize: '12px', padding: '2px 7px', margin: 0 }}>↶ 撤销</button>
                      <button className="back-button" onClick={handleRedo} disabled={redoCount === 0} style={{ opacity: redoCount === 0 ? 0.4 : 1, width: 'auto', fontSize: '12px', padding: '2px 7px', margin: 0 }}>↷ 重做</button>
                    </span>
                    <span className="tree-view-toggle">
                      <button
                        className={`toggle-btn${view === 'grid' ? ' active' : ''}`}
                        onClick={() => setView('grid')}
                      >☷</button>
                      <button
                        className={`toggle-btn${view === 'list' ? ' active' : ''}`}
                        onClick={() => setView('list')}
                      >☰</button>
                    </span>
                  </div>
                  {view === 'grid' ? (
                    <AttachmentGrid
                      slots={allSlots}
                      activeSlotPath={activeSlotPath}
                      highlightItemId={conflictHighlightId}
                      onSlotClick={(slot, parentSlotPath) => {
                        const slotPath = parentSlotPath ? `${parentSlotPath}:${slot.name}` : slot.name
                        setActiveSlot({ slot, parentSlotPath, slotPath })
                      }}
                      onSlotRemove={(slotPath) => removeAttachment(slotPath)}
                    />
                  ) : (
                    <TreeView
                      slots={allSlots}
                      activeSlotPath={activeSlotPath}
                      highlightItemId={conflictHighlightId}
                      onSlotClick={(slot, parentSlotPath) => {
                        const slotPath = parentSlotPath ? `${parentSlotPath}:${slot.name}` : slot.name
                        setActiveSlot({ slot, parentSlotPath, slotPath })
                      }}
                      onSlotRemove={(slotPath) => removeAttachment(slotPath)}
                    />
                  )}
                </div>
              ) : (
                <div className="forge-no-slots">该武器没有改装槽位。</div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL RESIZER */}
        <div className="panel-resizer" ref={resizerRef} onMouseDown={onResizerMouseDown}>
          <div className="panel-resizer-handle" />
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          {activeSlot ? (
            <SlotSelector
              key={activeSlot.slotPath}
              slot={activeSlot.slot}
              parentSlotPath={activeSlot.parentSlotPath}
              onClose={() => { setActiveSlot(null); setConflictHighlightId(null) }}
              onHoverItem={handleHoverItem}
              onConflictHover={handleConflictHover}
            />
          ) : (
            <div className="attachment-placeholder">
              <div className="placeholder-inner">
                {gunData.image && <img className="gun-display-image" src={gunData.image} alt={gunData.name} />}
                <div className="gun-display-name">{gunData.name}</div>
                <strong><em>选择一个槽位开始改装...</em></strong>
                <span className="placeholder-sub"><strong><em>右键点击配件可移除</em></strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showShareToast && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#2a2a2a', color: '#f5c542', padding: '10px 20px', borderRadius: '6px', border: '1px solid #f5c542', fontSize: '13px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          ✓ 分享链接已复制到剪贴板
        </div>
      )}
    </div>
  )
}
