import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { GunSlot, AllowedItem, ItemPrice } from '@/lib/forgeApi'
import { useForgeStore } from '@/hooks/useForgeStore'
import { validateBuild, fetchPrices } from '@/lib/forgeApi'
import { getFavorites, toggleFavorite } from '@/lib/forgeUtils'
import './forge.css'

interface SlotSelectorProps {
  slot: GunSlot
  parentSlotPath?: string
  onClose: () => void
  onHoverItem?: (item: AllowedItem | null) => void
}

type SortKey = 'name' | 'weight' | 'recoil' | 'accuracy' | 'ergo'
type ViewMode = 'list' | 'graph'

const SLOT_NAME_ZH: Record<string, string> = {
  mod_pistol_grip: '握把', mod_magazine: '弹匣', mod_reciever: '机匣',
  mod_stock: '枪托', mod_stock_000: '枪托', mod_stock_001: '枪托',
  mod_barrel: '枪管', mod_handguard: '护木', mod_muzzle: '枪口',
  mod_gas_block: '导气管', mod_scope: '瞄具', mod_scope_000: '瞄具',
  mod_scope_001: '瞄具', mod_mount: '导轨', mod_mount_000: '导轨',
  mod_mount_001: '导轨', mod_mount_002: '导轨',
  mod_sight_rear: '后照门', mod_sight_front: '准星',
  mod_charge: '拉机柄', mod_charge_001: '拉机柄',
  mod_foregrip: '前握把', mod_bipod: '两脚架',
  mod_tactical_000: '战术设备', mod_tactical_001: '战术设备',
  mod_tactical_002: '战术设备', mod_launcher: '下挂',
  mod_trigger: '扳机', mod_hammer: '击锤', mod_catch: '卡笋', mod_grip: '握把',
}

export function SlotSelector({ slot, parentSlotPath, onClose, onHoverItem }: SlotSelectorProps) {
  const { installedAttachments, installAttachment, removeAttachment } = useForgeStore()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('recoil')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [conflictError, setConflictError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(() => getFavorites())
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareBaseline, setCompareBaseline] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, ItemPrice>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [hoveredItem, setHoveredItem] = useState<AllowedItem | null>(null)

  // Graph state — metrics match original EFTForge
  // recoilPercent = recoil × 100 (percentage), lowerBetter = true
  // ergonomicsModifier = ergo value, lowerBetter = false (higher = better)
  // weight, lowerBetter = true
  const [graphXMetric, setGraphXMetric] = useState<'recoilPercent' | 'ergonomicsModifier' | 'weight'>('recoilPercent')
  const [graphYMetric, setGraphYMetric] = useState<'ergonomicsModifier' | 'recoilPercent' | 'weight'>('ergonomicsModifier')
  const [showLabels, setShowLabels] = useState(() => localStorage.getItem('forge_graph_labels') !== '0')
  const [showCrosshair, setShowCrosshair] = useState(() => localStorage.getItem('forge_graph_crosshair') !== '0')
  const [showHints, setShowHints] = useState(() => localStorage.getItem('forge_graph_hints') !== '0')
  const [iconScale, setIconScale] = useState(() => parseFloat(localStorage.getItem('forge_graph_icon_scale') || '1.3'))
  const [mousePos, setMousePos] = useState<{x: number; y: number} | null>(null)

  // Animation ref
  const tableRef = useRef<HTMLTableElement | null>(null)
  const graphRef = useRef<HTMLDivElement | null>(null)
  const graphWrapRef = useRef<HTMLDivElement | null>(null)
  const [graphH, setGraphH] = useState(400)

  // Track container size for dynamic SVG height
  useEffect(() => {
    if (viewMode !== 'graph' || !graphWrapRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width
        const h = e.contentRect.height
        if (w > 0 && h > 0) {
          const svgW = 520
          const calcH = Math.max(Math.round(svgW * h / w), 180)
          setGraphH(calcH)
        }
      }
    })
    ro.observe(graphWrapRef.current)
    return () => ro.disconnect()
  }, [viewMode])

  // Persist graph settings
  useEffect(() => { localStorage.setItem('forge_graph_labels', showLabels ? '1' : '0') }, [showLabels])
  useEffect(() => { localStorage.setItem('forge_graph_crosshair', showCrosshair ? '1' : '0') }, [showCrosshair])
  useEffect(() => { localStorage.setItem('forge_graph_hints', showHints ? '1' : '0') }, [showHints])
  useEffect(() => { localStorage.setItem('forge_graph_icon_scale', String(iconScale)) }, [iconScale])

  // Fetch prices when slot changes
  useEffect(() => {
    if (slot.allowedItems.length === 0) return
    const ids = slot.allowedItems.map(i => i.id)
    fetchPrices(ids).then(setPrices).catch(() => {})
  }, [slot])

  const slotPath = parentSlotPath ? `${parentSlotPath}:${slot.name}` : slot.name
  const slotNameZh = SLOT_NAME_ZH[slot.name] || slot.name
  const installedItemId = installedAttachments[slotPath]

  const sortedItems = useMemo(() => {
    let items = [...slot.allowedItems]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.shortName.toLowerCase().includes(q))
    }
    if (filterFavorites) {
      items = items.filter(i => favorites.has(i.id))
    }
    // Favorited items sort first
    items.sort((a, b) => {
      const fa = favorites.has(a.id) ? 0 : 1
      const fb = favorites.has(b.id) ? 0 : 1
      if (fa !== fb) return fa - fb
      let diff = 0
      switch (sortKey) {
        case 'name': diff = a.shortName.localeCompare(b.shortName); break
        case 'weight': diff = a.weight - b.weight; break
        case 'recoil': diff = a.recoil - b.recoil; break
        case 'accuracy': diff = b.accuracy - a.accuracy; break
        case 'ergo': diff = b.ergonomicsModifier - a.ergonomicsModifier; break
      }
      return sortDir === 'asc' ? diff : -diff
    })
    return items
  }, [slot.allowedItems, search, sortKey, sortDir, filterFavorites, favorites])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const arrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const handleInstall = useCallback(async (item: AllowedItem) => {
    // In compare mode, set baseline instead of installing
    if (compareMode) {
      setCompareBaseline(item.id)
      return
    }
    const installedIds = Object.values(installedAttachments)
    try {
      const result = await validateBuild(item.id, installedIds)
      if (!result.valid) {
        setConflictError(`${result.reasonName || '冲突'} 不兼容`)
        setTimeout(() => setConflictError(null), 3000)
        return
      }
    } catch { /* allow install even if validate fails */ }
    setConflictError(null)
    installAttachment(slotPath, item.id)
  }, [installedAttachments, installAttachment, slotPath, compareMode])

  const handleToggleFav = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    toggleFavorite(itemId)
    setFavorites(getFavorites())
  }

  // Trigger slide-in animation on view switch
  const switchView = (mode: ViewMode) => {
    if (mode === viewMode) return
    setViewMode(mode)
    // Trigger animation on next render
    requestAnimationFrame(() => {
      const el = mode === 'list' ? tableRef.current : graphRef.current
      if (el) {
        el.classList.remove('table-slide-in')
        void el.offsetWidth
        el.classList.add('table-slide-in')
        el.addEventListener('animationend', () => el.classList.remove('table-slide-in'), { once: true })
      }
    })
  }

  // Dynamic column visibility
  const hasRecoil = sortedItems.some(i => i.recoil !== 0)
  const hasAccuracy = sortedItems.some(i => i.accuracy !== 0)
  const hasErgo = sortedItems.some(i => i.ergonomicsModifier !== 0)
  const hasWeight = sortedItems.some(i => i.weight > 0)
  const hasPrice = Object.keys(prices).length > 0
  // Column order: 1=name 2=price 3=weight 4=recoil 5=acc 6=ergo 7=spacer
  const tableClasses = [
    'attachment-table',
    !hasPrice ? 'hide-col-price' : '',
    !hasWeight ? 'hide-col-weight' : '',
    !hasRecoil ? 'hide-col-recoil' : '',
    !hasAccuracy ? 'hide-col-acc' : '',
    !hasErgo ? 'hide-col-ergo' : '',
  ].filter(Boolean).join(' ')

  // --- Graph calculations (matching original EFTForge) ---
  // Metric definitions: lowerBetter means axis is reversed (right/up = better)
  const GRAPH_METRICS: Record<string, { label: string; lowerBetter: boolean; getValue: (i: AllowedItem) => number; fmt: (v: number) => string }> = {
    recoilPercent: { label: '后坐力修正%', lowerBetter: true, getValue: i => i.recoil * 100, fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
    ergonomicsModifier: { label: '人机', lowerBetter: false, getValue: i => i.ergonomicsModifier, fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}` },
    weight: { label: '重量', lowerBetter: true, getValue: i => i.weight, fmt: v => v.toFixed(2) },
  }
  const xDef = GRAPH_METRICS[graphXMetric]!
  const yDef = GRAPH_METRICS[graphYMetric]!
  const svgW = 520, svgH = graphH, ml = 46, mr = 20, mt = 18, mb = 40
  const plotW = svgW - ml - mr, plotH = svgH - mt - mb
  const xVals = sortedItems.map(i => xDef.getValue(i))
  const yVals = sortedItems.map(i => yDef.getValue(i))
  let dxMin = xVals.length > 0 ? Math.min(...xVals) : 0
  let dxMax = xVals.length > 0 ? Math.max(...xVals) : 1
  let dyMin = yVals.length > 0 ? Math.min(...yVals) : 0
  let dyMax = yVals.length > 0 ? Math.max(...yVals) : 1
  const xRange = dxMax - dxMin || 1
  const yRange = dyMax - dyMin || 1
  dxMin -= xRange * 0.08; dxMax += xRange * 0.08
  dyMin -= yRange * 0.10; dyMax += yRange * 0.10
  // Expand to include 0 if close
  if (dxMin > 0 && dxMin < xRange * 0.2) dxMin = 0
  if (dxMax < 0 && dxMax > -xRange * 0.2) dxMax = 0
  if (dyMin > 0 && dyMin < yRange * 0.2) dyMin = 0
  if (dyMax < 0 && dyMax > -yRange * 0.2) dyMax = 0

  // Axis direction: lowerBetter = reversed (low value on right for X, low value on top for Y inversed)
  const toX = xDef.lowerBetter
    ? (v: number) => ml + (dxMax - v) / (dxMax - dxMin) * plotW  // reversed: low=right
    : (v: number) => ml + (v - dxMin) / (dxMax - dxMin) * plotW   // normal: high=right
  const toY = yDef.lowerBetter
    ? (v: number) => mt + (v - dyMin) / (dyMax - dyMin) * plotH     // normal: low=bottom
    : (v: number) => mt + (1 - (v - dyMin) / (dyMax - dyMin)) * plotH // reversed: high=top

  // Click on dot = switch to list view and scroll to row (NOT install)
  const [scrollToItemId, setScrollToItemId] = useState<string | null>(null)
  const handleDotClick = useCallback((item: AllowedItem) => {
    setScrollToItemId(item.id)
    switchView('list')
  }, [switchView])

  useEffect(() => {
    if (scrollToItemId && viewMode === 'list' && tableRef.current) {
      requestAnimationFrame(() => {
        const row = tableRef.current?.querySelector(`tr[data-item-id="${scrollToItemId}"]`)
        if (row instanceof HTMLElement) {
          row.scrollIntoView({ block: 'center', behavior: 'smooth' })
          row.classList.add('graph-row-highlight')
          setTimeout(() => row.classList.remove('graph-row-highlight'), 1000)
        }
        setScrollToItemId(null)
      })
    }
  }, [scrollToItemId, viewMode])

  // SVG control button positions (right side)
  const btnX = svgW - 14
  const btnStartY = mt + 8
  const btnSpacing = 20

  return (
    <div className="attachment-table-container">
      {/* Header — matching original .att-table-header structure */}
      <div className="att-table-header">
        <h3>选择配件 <strong>{slotNameZh}</strong></h3>
        {/* Right-aligned toggles */}
        <div className="att-table-header-toggles">
          {/* Favorites filter toggle */}
          <button
            id="favorites-filter-btn"
            className={`compare-toggle${filterFavorites ? ' active' : ''}`}
            onClick={() => setFilterFavorites(!filterFavorites)}
          >
            ★
            <span className="compare-toggle-track"><span className="compare-toggle-knob" /></span>
          </button>
          {/* Compare mode toggle — hidden in graph view (matching original) */}
          <button
            id="compare-toggle-btn"
            className={`compare-toggle${compareMode ? ' active' : ''}`}
            onClick={() => { setCompareMode(!compareMode); setCompareBaseline(null) }}
            style={{ display: viewMode === 'graph' ? 'none' : '' }}
          >
            对比
            <span className="compare-toggle-track"><span className="compare-toggle-knob" /></span>
          </button>
          {/* List / Graph toggle group */}
          <div className="combo-view-btns">
            <button className={`toggle-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => switchView('list')}>列表</button>
            <button className={`toggle-btn${viewMode === 'graph' ? ' active' : ''}`} onClick={() => switchView('graph')}>图表</button>
          </div>
        </div>
        {installedItemId && viewMode === 'list' && (
          <button className="att-uninstall-btn" onClick={() => { removeAttachment(slotPath); setConflictError(null) }}>卸下</button>
        )}
        <button className="att-table-close-btn" onClick={onClose}>×</button>
      </div>

      {/* Compare hint */}
      {compareMode && (
        <div style={{ padding: '4px 16px', fontSize: '12px', color: '#00c8b4', background: '#0d2420', borderBottom: '1px solid #00c8b433' }}>
          {compareBaseline ? '对比基准已设定 — 点击其他配件查看差异' : '对比模式 — 点击一个配件作为基准'}
        </div>
      )}

      {/* Conflict error */}
      {conflictError && (
        <div style={{ padding: '6px 16px', color: '#f44', fontSize: '12px', background: '#2a1111' }}>{conflictError}</div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <>
          {/* Search */}
          <div style={{ display: 'flex', gap: '8px', margin: '8px 16px', flexShrink: 0 }}>
            <input
              type="text" placeholder="搜索配件..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="forge-search-input"
              style={{ margin: 0, flex: 1 }}
            />
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            {sortedItems.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#555' }}>没有找到匹配的配件</div>
            ) : (
              <table ref={tableRef} className={tableClasses}>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('name')}>名称{arrow('name')}</th>
                    <th>价格</th>
                    <th onClick={() => toggleSort('weight')}>重量{arrow('weight')}</th>
                    <th onClick={() => toggleSort('recoil')}>后坐力{arrow('recoil')}</th>
                    <th onClick={() => toggleSort('accuracy')}>精度{arrow('accuracy')}</th>
                    <th onClick={() => toggleSort('ergo')}>人机{arrow('ergo')}</th>
                    <td></td>
                  </tr>
                </thead>
                <tbody>
                  {/* Compare baseline ghost row */}
                  {compareMode && compareBaseline && !sortedItems.find(i => i.id === compareBaseline) && (
                    <tr style={{ opacity: 0.5, borderBottom: '1px dashed #00c8b4' }}>
                      <td>
                        <div className="attachment-name-wrapper">
                          <div className="attachment-icon-wrapper" style={{ width: '48px', height: '48px' }} />
                          <span style={{ color: '#00c8b4' }}>基准配件 (其他插槽)</span>
                        </div>
                      </td>
                      <td colSpan={6} style={{ color: '#00c8b4', fontSize: '11px' }}>← 基准</td>
                    </tr>
                  )}
                  {sortedItems.map(item => {
                    const isInstalled = installedItemId === item.id
                    const isBaseline = compareBaseline === item.id
                    const price = prices[item.id]
                    return (
                      <tr
                        key={item.id}
                        data-item-id={item.id}
                        onClick={() => handleInstall(item)}
                        className={`att-row${isInstalled ? ' attachment-row-installed' : ''}${isBaseline ? ' compare-baseline' : ''}`}
                        onMouseEnter={() => { if (!isInstalled) { setHoveredItem(item); onHoverItem?.(item) } else onHoverItem?.(null) }}
                        onMouseLeave={() => { setHoveredItem(null); onHoverItem?.(null) }}
                      >
                        <td>
                          <div className="attachment-name-wrapper">
                            <button
                              className={`att-fav-btn${favorites.has(item.id) ? ' active' : ''}`}
                              onClick={(e) => handleToggleFav(e, item.id)}
                            >★</button>
                            <div className="attachment-icon-wrapper">
                              {item.image && <img className="attachment-icon" src={item.image} alt="" />}
                            </div>
                            <div className="att-name-and-rating">
                              <div className="attachment-name-text">
                                <span>{item.shortName}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {price?.fleaPrice ? (
                            <div className="att-price-wrap">
                              <span className="att-price-flea">跳蚤</span>
                              <span>{price.fleaPrice.toLocaleString()}₽</span>
                            </div>
                          ) : price?.bestBuyPrice ? (
                            <div className="att-price-wrap">
                              <span>{price.bestBuyPrice.toLocaleString()}₽</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td>{item.weight.toFixed(3)}kg</td>
                        <td style={{ color: item.recoil < 0 ? '#4CAF50' : item.recoil > 0 ? '#f44336' : '#888' }}>
                          {item.recoil !== 0 ? `${item.recoil > 0 ? '+' : ''}${item.recoil}%` : '-'}
                        </td>
                        <td style={{ color: item.accuracy > 0 ? '#4CAF50' : item.accuracy < 0 ? '#f44336' : '#888' }}>
                          {item.accuracy !== 0 ? `${item.accuracy > 0 ? '+' : ''}${item.accuracy}%` : '-'}
                        </td>
                        <td style={{ color: item.ergonomicsModifier > 0 ? '#4CAF50' : item.ergonomicsModifier < 0 ? '#f44336' : '#888' }}>
                          {item.ergonomicsModifier !== 0 ? `${item.ergonomicsModifier > 0 ? '+' : ''}${item.ergonomicsModifier}` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* GRAPH VIEW — 1:1 matching original EFTForge graph.js */}
      {viewMode === 'graph' && (
        <div ref={graphRef} className="att-graph-container" style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Axis selectors — compact bar */}
          <div style={{ display: 'flex', gap: '8px', margin: '4px 0', fontSize: '11px', flexShrink: 0 }}>
            <label style={{ color: '#888' }}>
              X: <select value={graphXMetric} onChange={e => setGraphXMetric(e.target.value as typeof graphXMetric)} style={{ background: '#1a1a1a', color: '#eee', border: '1px solid #333', borderRadius: '3px', padding: '2px 4px' }}>
                {Object.entries(GRAPH_METRICS).map(([key, def]) => <option key={key} value={key}>{def.label}</option>)}
              </select>
            </label>
            <label style={{ color: '#888' }}>
              Y: <select value={graphYMetric} onChange={e => setGraphYMetric(e.target.value as typeof graphYMetric)} style={{ background: '#1a1a1a', color: '#eee', border: '1px solid #333', borderRadius: '3px', padding: '2px 4px' }}>
                {Object.entries(GRAPH_METRICS).map(([key, def]) => <option key={key} value={key}>{def.label}</option>)}
              </select>
            </label>
          </div>

          {/* SVG fills remaining space */}
          <div ref={graphWrapRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <svg
              className={`att-graph-svg${hoveredItem ? ' has-hover' : ''}`}
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const sx = (e.clientX - rect.left) / rect.width * svgW
                const sy = (e.clientY - rect.top) / rect.height * svgH
                setMousePos({ x: sx, y: sy })
              }}
              onMouseLeave={() => { setMousePos(null); setHoveredItem(null); onHoverItem?.(null) }}
            >
              <defs>
                <filter id="icon-shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#000" floodOpacity="0.7" />
                </filter>
                <clipPath id="plot-clip"><rect x={ml} y={mt} width={plotW} height={plotH} /></clipPath>
              </defs>

              {/* Plot background */}
              <rect x={ml} y={mt} width={plotW} height={plotH} fill="#0d0d0d" rx="2" />

              {/* Grid lines */}
              {Array.from({ length: 5 }, (_, i) => {
                const xv = dxMin + (dxMax - dxMin) * i / 4
                const yv = dyMin + (dyMax - dyMin) * i / 4
                return (
                  <g key={i}>
                    <line x1={toX(xv)} y1={mt} x2={toX(xv)} y2={mt + plotH} stroke="#222" strokeWidth="0.5" />
                    <line x1={ml} y1={toY(yv)} x2={ml + plotW} y2={toY(yv)} stroke="#222" strokeWidth="0.5" />
                    <text x={toX(xv)} y={mt + plotH + 12} textAnchor="middle" fill="#555" fontSize="8">{xDef.fmt(xv)}</text>
                    <text x={ml - 4} y={toY(yv) + 3} textAnchor="end" fill="#555" fontSize="8">{yDef.fmt(yv)}</text>
                  </g>
                )
              })}
              {/* Zero axis (dashed) */}
              {dxMin < 0 && dxMax > 0 && (
                <line x1={toX(0)} y1={mt} x2={toX(0)} y2={mt + plotH} stroke="#363636" strokeWidth="0.8" strokeDasharray="4,3" />
              )}
              {dyMin < 0 && dyMax > 0 && (
                <line x1={ml} y1={toY(0)} x2={ml + plotW} y2={toY(0)} stroke="#363636" strokeWidth="0.8" strokeDasharray="4,3" />
              )}

              {/* Plot border */}
              <rect x={ml} y={mt} width={plotW} height={plotH} fill="none" stroke="#2a2a2a" strokeWidth="1" rx="2" />

              {/* Axis titles */}
              <text x={ml + plotW / 2} y={svgH - 4} textAnchor="middle" fill="#888" fontSize="10">{xDef.label}</text>
              <text x={12} y={mt + plotH / 2} textAnchor="middle" fill="#888" fontSize="10" transform={`rotate(-90, 12, ${mt + plotH / 2})`}>{yDef.label}</text>

              {/* Crosshair (when enabled and mouse in plot area) */}
              {showCrosshair && mousePos && mousePos.x > ml && mousePos.x < ml + plotW && mousePos.y > mt && mousePos.y < mt + plotH && (
                <g pointerEvents="none">
                  <line x1={ml} y1={mousePos.y} x2={mousePos.x - 3} y2={mousePos.y} stroke="#444" strokeWidth="0.5" strokeDasharray="2,2" />
                  <line x1={mousePos.x + 3} y1={mousePos.y} x2={ml + plotW} y2={mousePos.y} stroke="#444" strokeWidth="0.5" strokeDasharray="2,2" />
                  <line x1={mousePos.x} y1={mt} x2={mousePos.x} y2={mousePos.y - 3} stroke="#444" strokeWidth="0.5" strokeDasharray="2,2" />
                  <line x1={mousePos.x} y1={mousePos.y + 3} x2={mousePos.x} y2={mt + plotH} stroke="#444" strokeWidth="0.5" strokeDasharray="2,2" />
                </g>
              )}

              {/* Hints watermark */}
              {showHints && (
                <g pointerEvents="none" fontSize="7" fill="#3a3a3a">
                  <text x={ml + 4} y={mt + plotH - 20}>Ctrl+滚轮 缩放</text>
                  <text x={ml + 4} y={mt + plotH - 10}>点击定位列表</text>
                </g>
              )}

              {/* Data points */}
              <g clipPath="url(#plot-clip)">
                {sortedItems.map(item => {
                  const xv = xDef.getValue(item)
                  const yv = yDef.getValue(item)
                  const cx = toX(xv)
                  const cy = toY(yv)
                  const isHovered = hoveredItem?.id === item.id
                  const iconSize = 14 * iconScale
                  return (
                    <g
                      key={item.id}
                      className={`att-graph-dot${isHovered ? ' graph-dot-hovered' : ''}`}
                      onMouseEnter={() => { setHoveredItem(item); onHoverItem?.(item) }}
                      onMouseLeave={() => { setHoveredItem(null); onHoverItem?.(null) }}
                      onClick={() => handleDotClick(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      {item.image && <image href={item.image} x={cx - iconSize / 2} y={cy - iconSize / 2} width={iconSize} height={iconSize} preserveAspectRatio="xMidYMid meet" filter="url(#icon-shadow)" opacity={isHovered ? 1 : 0.8} />}
                      {showLabels && <text className="graph-item-name" x={cx} y={cy - iconSize / 2 - 2} textAnchor="middle" fontSize={4.5 * iconScale}>{item.shortName}</text>}
                      {/* Dot and ring rendered AFTER image so they're visible on top */}
                      <circle className="graph-dot-ring" cx={cx} cy={cy} r="4.5" fill="none" stroke="#f5c542" strokeWidth="0.8" strokeOpacity={isHovered ? 0.55 : 0} />
                      <circle cx={cx} cy={cy} r="1.5" fill={isHovered ? '#ffe566' : '#f5c542'} />
                    </g>
                  )
                })}
              </g>

              {/* SVG tooltip — follows hovered item position */}
              {hoveredItem && (() => {
                const xv = xDef.getValue(hoveredItem)
                const yv = yDef.getValue(hoveredItem)
                const tx = toX(xv)
                const ty = toY(yv)
                const tipW = 100
                const tipH = 32
                const tipX = tx + tipW > ml + plotW ? tx - tipW - 4 : tx + 8
                const tipY = ty - tipH < mt ? ty + 8 : ty - tipH - 4
                return (
                  <g pointerEvents="none">
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} fill="#1a1a1a" stroke="#333" strokeWidth="0.5" rx="2" />
                    <text x={tipX + 4} y={tipY + 9} fill="#f5c542" fontSize="7" fontWeight="bold">{hoveredItem.shortName}</text>
                    <text x={tipX + 4} y={tipY + 18} fill="#888" fontSize="6">{xDef.label}: <tspan fill="#eee">{xDef.fmt(xv)}</tspan></text>
                    <text x={tipX + 4} y={tipY + 26} fill="#888" fontSize="6">{yDef.label}: <tspan fill="#eee">{yDef.fmt(yv)}</tspan></text>
                  </g>
                )
              })()}

              {/* Control buttons — SVG embedded on right side */}
              {(() => {
                const btns = [
                  { active: showCrosshair, onClick: () => setShowCrosshair(!showCrosshair), icon: '⊕', label: '准线' },
                  { active: showLabels, onClick: () => setShowLabels(!showLabels), icon: 'A', label: '标签' },
                  { active: showHints, onClick: () => setShowHints(!showHints), icon: '?', label: '提示' },
                ]
                return btns.map((btn, i) => {
                  const by = btnStartY + i * btnSpacing
                  return (
                    <g key={i} onClick={btn.onClick} style={{ cursor: 'pointer' }}>
                      <rect x={btnX - 6} y={by - 7} width="12" height="14" fill={btn.active ? '#1a1400' : '#111'} stroke={btn.active ? '#554400' : '#222'} strokeWidth="0.5" rx="2" />
                      <text x={btnX} y={by + 2} textAnchor="middle" fill={btn.active ? '#f5c542' : '#555'} fontSize="7">{btn.icon}</text>
                    </g>
                  )
                })
              })()}

              {/* Scale slider — vertical track on right side */}
              <g>
                {(() => {
                  const sliderX = btnX
                  const sliderTop = btnStartY + 3 * btnSpacing + 4
                  const sliderBot = sliderTop + 40
                  const thumbY = sliderBot - (iconScale - 1.0) / 1.0 * (sliderBot - sliderTop)
                  return (
                    <>
                      <line x1={sliderX} y1={sliderTop} x2={sliderX} y2={sliderBot} stroke="#252525" strokeWidth="1" />
                      <line x1={sliderX} y1={thumbY} x2={sliderX} y2={sliderBot} stroke="#444" strokeWidth="1" />
                      <circle
                        cx={sliderX} cy={thumbY} r="2.5" fill="#444" stroke="#666" strokeWidth="0.5"
                        style={{ cursor: 'grab' }}
                        pointerEvents="all"
                        onWheel={(e) => { e.preventDefault(); const delta = e.deltaY > 0 ? -0.05 : 0.05; setIconScale(s => Math.min(2.0, Math.max(1.0, Math.round((s + delta) * 20) / 20))) }}
                      />
                    </>
                  )
                })()}
              </g>
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
