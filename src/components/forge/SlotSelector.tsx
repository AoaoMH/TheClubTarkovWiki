import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { GunSlot, AllowedItem, ItemPrice, ConflictResult } from '@/lib/forgeApi'
import { useForgeStore } from '@/hooks/useForgeStore'
import { validateBuild, fetchPrices } from '@/lib/forgeApi'
import { getFavorites, toggleFavorite } from '@/lib/forgeUtils'
import './forge.css'

/** 渲染对比差值：当前配件值与基准值的差，颜色按好坏方向编码 */
function renderCmpDelta(itemVal: number, baseVal: number, lowerBetter: boolean, fmt: (v: number) => string) {
  const d = itemVal - baseVal
  if (d === 0) return null
  const better = lowerBetter ? d < 0 : d > 0
  return (
    <div className={`cmp-delta ${better ? 'delta-pos' : 'delta-neg'}`}>
      {d > 0 ? '+' : ''}{fmt(d)}
    </div>
  )
}

interface SlotSelectorProps {
  slot: GunSlot
  parentSlotPath?: string
  onClose: () => void
  onHoverItem?: (item: AllowedItem | null) => void
  onConflictHover?: (conflictingItemId: string | null) => void
  compareMode: boolean
  compareBaseline: string | null
  onCompareModeChange: (mode: boolean) => void
  onCompareBaselineChange: (id: string | null) => void
}

type SortKey = 'name' | 'weight' | 'recoil' | 'accuracy' | 'ergo'
type ViewMode = 'list' | 'graph'

const SLOT_NAME_ZH: Record<string, string> = {
  mod_pistol_grip: '握把', mod_pistol_grip_akms: '握把',
  mod_pistolgrip: '握把', mod_pistolgrip_000: '握把', mod_pistolgrip_001: '握把',
  mod_magazine: '弹匣', mod_reciever: '机匣',
  mod_stock: '枪托', mod_stock_000: '枪托', mod_stock_001: '枪托',
  mod_stock_002: '枪托', mod_stock_akms: '枪托', mod_stock_axis: '枪托轴',
  mod_barrel: '枪管', mod_barrel_000: '枪管', mod_handguard: '护木', mod_muzzle: '枪口',
  mod_gas_block: '导气管', mod_scope: '瞄具', mod_scope_000: '瞄具',
  mod_scope_001: '瞄具', mod_scope_002: '瞄具', mod_scope_003: '瞄具',
  mod_mount: '导轨', mod_mount_000: '导轨', mod_mount_001: '导轨', mod_mount_002: '导轨',
  mod_mount_003: '导轨', mod_mount_004: '导轨', mod_mount_005: '导轨', mod_mount_006: '导轨',
  mod_sight_rear: '后照门', mod_sight_front: '准星',
  mod_charge: '拉机柄', mod_charge_001: '拉机柄',
  mod_foregrip: '前握把', mod_bipod: '两脚架',
  mod_tactical: '战术设备', mod_tactical_000: '战术设备', mod_tactical_001: '战术设备',
  mod_tactical_002: '战术设备', mod_tactical_003: '战术设备', mod_tactical_004: '战术设备',
  mod_tactical_005: '战术设备', mod_tactical001: '战术设备', mod_tactical002: '战术设备',
  mod_tactical_2: '战术设备', mod_launcher: '下挂',
  mod_trigger: '扳机', mod_hammer: '击锤', mod_catch: '卡笋', mod_grip: '握把',
  mod_equipment: '装备', mod_equipment_000: '装备', mod_equipment_001: '装备', mod_equipment_002: '装备',
  mod_flashlight: '手电', mod_nvg: '夜视仪',
}

export function SlotSelector({ slot, parentSlotPath, onClose, onHoverItem, onConflictHover, compareMode, compareBaseline, onCompareModeChange, onCompareBaselineChange }: SlotSelectorProps) {
  const { installedAttachments, installAttachment } = useForgeStore()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('recoil')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [conflictError, setConflictError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(() => getFavorites())
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [prices, setPrices] = useState<Record<string, ItemPrice>>({})
  const [conflicts, setConflicts] = useState<Record<string, ConflictResult>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [hoveredItem, setHoveredItem] = useState<AllowedItem | null>(null)

  // Graph state — metrics match original EFTForge
  // recoilPercent = recoil × 100 (percentage), lowerBetter = true
  // ergonomicsModifier = ergo value, lowerBetter = false (higher = better)
  // weight, lowerBetter = true
  const [graphXMetric, setGraphXMetric] = useState<'recoilPercent' | 'ergonomicsModifier' | 'weight' | 'magazineCapacity'>('recoilPercent')
  const [graphYMetric, setGraphYMetric] = useState<'ergonomicsModifier' | 'recoilPercent' | 'weight' | 'magazineCapacity'>('ergonomicsModifier')
  const [showLabels, setShowLabels] = useState(() => localStorage.getItem('forge_graph_labels') !== '0')
  const [showCrosshair, setShowCrosshair] = useState(() => localStorage.getItem('forge_graph_crosshair') !== '0')
  const [showHints, setShowHints] = useState(() => localStorage.getItem('forge_graph_hints') !== '0')
  const iconScale = 1.3
  const [mousePos, setMousePos] = useState<{x: number; y: number} | null>(null)
  // Chart zoom/pan: viewDomain null = default (fit data); a concrete window = zoomed/panned
  const [viewDomain, setViewDomain] = useState<{ x0: number; x1: number; y0: number; y1: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ px: number; py: number; view: { x0: number; x1: number; y0: number; y1: number } } | null>(null)
  const sliderDragRef = useRef(false)
  const dragMovedRef = useRef(false)
  // Latest zoom helpers for the native (non-passive) wheel listener
  const zoomStateRef = useRef<any>(null)

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
  // Reset zoom/pan when slot or axes change
  useEffect(() => { setViewDomain(null) }, [slot.name, graphXMetric, graphYMetric])

  // Fetch prices + conflict info when slot or installed attachments change
  useEffect(() => {
    if (slot.allowedItems.length === 0) return
    const ids = slot.allowedItems.map(i => i.id)
    // Exclude current slot's item from conflict check (it's being replaced)
    const currentSlotPath = parentSlotPath ? `${parentSlotPath}:${slot.name}` : slot.name
    const installedIds = Object.entries(installedAttachments)
      .filter(([path]) => path !== currentSlotPath)
      .map(([, id]) => id)
    fetchPrices(ids, installedIds.length > 0 ? installedIds : undefined)
      .then(({ prices: p, conflicts: c }) => {
        setPrices(p)
        setConflicts(c)
      })
      .catch(() => {})
  }, [slot, installedAttachments, parentSlotPath])

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
    // Conflict-free items first, then favorited items
    items.sort((a, b) => {
      const ca = conflicts[a.id] ? 1 : 0
      const cb = conflicts[b.id] ? 1 : 0
      if (ca !== cb) return ca - cb
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
  }, [slot.allowedItems, search, sortKey, sortDir, filterFavorites, favorites, conflicts])

  // 对比基准配件（仅在对比模式且已设定基准时存在，基准必定来自当前槽位列表）
  const baselineItem = compareMode && compareBaseline
    ? slot.allowedItems.find(i => i.id === compareBaseline) ?? null
    : null

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const arrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const handleInstall = useCallback(async (item: AllowedItem) => {
    // In compare mode, set baseline instead of installing
    if (compareMode) {
      onCompareBaselineChange(item.id)
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
  }, [installedAttachments, installAttachment, slotPath, compareMode, onCompareBaselineChange])

  const handleToggleFav = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    toggleFavorite(itemId)
    setFavorites(getFavorites())
  }

  // Trigger slide-in animation on view switch
  const switchView = (mode: ViewMode) => {
    if (mode === viewMode) return
    setViewMode(mode)
    // 切换到图表视图时自动关闭对比（图表无对比模式，避免状态残留影响列表）
    if (mode === 'graph') {
      onCompareModeChange(false)
      onCompareBaselineChange(null)
    }
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
  const hasCapacity = sortedItems.some(i => i.magazineCapacity != null)
  // Column order: 1=name 2=price 3=weight 4=recoil 5=acc 6=ergo 7=capacity 8=spacer
  const tableClasses = [
    'attachment-table',
    !hasPrice ? 'hide-col-price' : '',
    !hasWeight ? 'hide-col-weight' : '',
    !hasRecoil ? 'hide-col-recoil' : '',
    !hasAccuracy ? 'hide-col-acc' : '',
    !hasErgo ? 'hide-col-ergo' : '',
    !hasCapacity ? 'hide-col-capacity' : '',
  ].filter(Boolean).join(' ')

  // Filter out conflicted items for graph view
  const graphItems = sortedItems.filter(item => !conflicts[item.id])

  // --- Graph calculations (matching original EFTForge) ---
  // Metric definitions: lowerBetter means axis is reversed (right/up = better)
  const GRAPH_METRICS: Record<string, { label: string; lowerBetter: boolean; getValue: (i: AllowedItem) => number; fmt: (v: number) => string }> = {
    recoilPercent: { label: '后坐力修正%', lowerBetter: true, getValue: i => i.recoil * 100, fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
    ergonomicsModifier: { label: '人机', lowerBetter: false, getValue: i => i.ergonomicsModifier, fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}` },
    weight: { label: '重量', lowerBetter: true, getValue: i => i.weight, fmt: v => v.toFixed(2) },
    magazineCapacity: { label: '弹匣', lowerBetter: false, getValue: i => i.magazineCapacity ?? 0, fmt: v => String(v) },
  }
  const xDef = GRAPH_METRICS[graphXMetric]!
  const yDef = GRAPH_METRICS[graphYMetric]!
  const svgW = 520, svgH = graphH, ml = 46, mr = 20, mt = 18, mb = 40
  const plotW = svgW - ml - mr, plotH = svgH - mt - mb
  const xVals = graphItems.map(i => xDef.getValue(i))
  const yVals = graphItems.map(i => yDef.getValue(i))
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

  // Base (fit-data) domain; viewDomain holds the current zoom/pan window (null = default)
  const base = { x0: dxMin, x1: dxMax, y0: dyMin, y1: dyMax }
  const view = viewDomain ?? base
  const invX = (vv: typeof base, px: number) => xDef.lowerBetter
    ? vv.x1 - (px - ml) / plotW * (vv.x1 - vv.x0)
    : vv.x0 + (px - ml) / plotW * (vv.x1 - vv.x0)
  const invY = (vv: typeof base, py: number) => yDef.lowerBetter
    ? vv.y0 + (py - mt) / plotH * (vv.y1 - vv.y0)
    : vv.y1 - (py - mt) / plotH * (vv.y1 - vv.y0)

  // Axis direction: lowerBetter = reversed (low value on right for X, low value on top for Y inversed)
  const toX = xDef.lowerBetter
    ? (v: number) => ml + (view.x1 - v) / (view.x1 - view.x0) * plotW  // reversed: low=right
    : (v: number) => ml + (v - view.x0) / (view.x1 - view.x0) * plotW   // normal: high=right
  const toY = yDef.lowerBetter
    ? (v: number) => mt + (v - view.y0) / (view.y1 - view.y0) * plotH     // normal: low=bottom
    : (v: number) => mt + (1 - (v - view.y0) / (view.y1 - view.y0)) * plotH // reversed: high=top

  const ZOOM_MIN = 1, ZOOM_MAX = 4
  const zoomLevel = (base.x1 - base.x0) / (view.x1 - view.x0)
  const clampView = (v: typeof base) => {
    const bxR = base.x1 - base.x0, byR = base.y1 - base.y0
    let { x0, x1, y0, y1 } = v
    const minRx = bxR / 30, minRy = byR / 30
    if (x1 - x0 < minRx) { const c = (x0 + x1) / 2; x0 = c - minRx / 2; x1 = c + minRx / 2 }
    if (y1 - y0 < minRy) { const c = (y0 + y1) / 2; y0 = c - minRy / 2; y1 = c + minRy / 2 }
    if (x1 - x0 > bxR) { const c = (x0 + x1) / 2; x0 = c - bxR / 2; x1 = c + bxR / 2 }
    if (y1 - y0 > byR) { const c = (y0 + y1) / 2; y0 = c - byR / 2; y1 = c + byR / 2 }
    if (x0 < base.x0) { x1 += base.x0 - x0; x0 = base.x0 }
    if (x1 > base.x1) { x0 -= x1 - base.x1; x1 = base.x1 }
    if (y0 < base.y0) { y1 += base.y0 - y0; y0 = base.y0 }
    if (y1 > base.y1) { y0 -= y1 - base.y1; y1 = base.y1 }
    x0 = Math.max(base.x0, x0); x1 = Math.min(base.x1, x1)
    y0 = Math.max(base.y0, y0); y1 = Math.min(base.y1, y1)
    return { x0, x1, y0, y1 }
  }
  const zoomAroundPoint = (vv: typeof base, cx: number, cy: number, f: number) => ({
    x0: cx - (cx - vv.x0) / f, x1: cx + (vv.x1 - cx) / f,
    y0: cy - (cy - vv.y0) / f, y1: cy + (vv.y1 - cy) / f,
  })
  const setZoomCentered = (z: number) => {
    const zc = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
    setViewDomain(prev => {
      const vv = prev ?? base
      const cx = (vv.x0 + vv.x1) / 2, cy = (vv.y0 + vv.y1) / 2
      const bxR = base.x1 - base.x0, byR = base.y1 - base.y0
      return clampView({ x0: cx - bxR / (2 * zc), x1: cx + bxR / (2 * zc), y0: cy - byR / (2 * zc), y1: cy + byR / (2 * zc) })
    })
  }
  const resetView = () => setViewDomain(null)
  zoomStateRef.current = { base, invX, invY, clampView, zoomAroundPoint }
  // Native non-passive wheel listener so preventDefault actually stops page scroll
  useEffect(() => {
    const el = graphWrapRef.current
    if (!el || viewMode !== 'graph') return
    const handler = (e: WheelEvent) => {
      const s = zoomStateRef.current
      if (!s) return
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width * svgW
      const py = (e.clientY - rect.top) / rect.height * svgH
      if (px < ml || px > ml + plotW || py < mt || py > mt + plotH) return
      e.preventDefault()
      const f = e.deltaY > 0 ? 1 / 1.12 : 1.12
      setViewDomain(prev => {
        const vv = prev ?? s.base
        const cx = s.invX(vv, px), cy = s.invY(vv, py)
        return s.clampView(s.zoomAroundPoint(vv, cx, cy, f))
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [viewMode, graphH])

  // Click on dot = switch to list view and scroll to row (NOT install)
  const [scrollToItemId, setScrollToItemId] = useState<string | null>(null)
  const handleDotClick = useCallback((item: AllowedItem) => {
    if (dragMovedRef.current) return
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
  const btnCount = 4 // crosshair / labels / hints / reset
  // Zoom slider geometry (full-height track below the buttons)
  const sliderTop = btnStartY + btnCount * btnSpacing + 6
  const sliderBot = mt + plotH - 8
  const zFromY = (py: number) => {
    const t = Math.min(1, Math.max(0, (sliderBot - py) / (sliderBot - sliderTop)))
    return ZOOM_MIN + t * (ZOOM_MAX - ZOOM_MIN)
  }

  // --- Adaptive (collision-aware) label placement ---
  // The yellow node stays at the exact data position (cx,cy); the icon + name are
  // placed nearby then pushed apart by a small force-directed pass so labels
  // never overlap each other or cover any node — they "escape" into free space
  // (up/down/left/right), like the hand-drawn reference.
  const iconSize = 14 * iconScale
  const fontSize = 4.5 * iconScale
  const nameH = showLabels ? fontSize + 2 : 0
  const labelNodes = graphItems.map(item => {
    const nameW = showLabels ? item.shortName.length * fontSize * 0.55 : 0
    const boxW = Math.max(iconSize, nameW)
    const boxH = iconSize + nameH + 1
    const r = Math.max(boxW, boxH) / 2 + 1
    return { id: item.id, cx: toX(xDef.getValue(item)), cy: toY(yDef.getValue(item)), r }
  })
  const cenX = labelNodes.length ? labelNodes.reduce((s, n) => s + n.cx, 0) / labelNodes.length : 0
  const cenY = labelNodes.length ? labelNodes.reduce((s, n) => s + n.cy, 0) / labelNodes.length : 0
  const minOff = iconSize / 2 + 4
  const labelPos = labelNodes.map((n, i) => {
    let dx = n.cx - cenX, dy = n.cy - cenY
    const d = Math.hypot(dx, dy)
    if (d < 1) { const a = (i * 2.39996) % (Math.PI * 2); dx = Math.cos(a); dy = Math.sin(a) }
    else { dx /= d; dy /= d }
    return { ...n, lx: n.cx + dx * minOff, ly: n.cy + dy * minOff }
  })
  for (let it = 0; it < 45; it++) {
    // label <-> label repulsion
    for (let i = 0; i < labelPos.length; i++) {
      const a = labelPos[i]!
      for (let j = i + 1; j < labelPos.length; j++) {
        const b = labelPos[j]!
        let dx = b.lx - a.lx, dy = b.ly - a.ly
        let dist = Math.hypot(dx, dy)
        const md = a.r + b.r
        if (dist < md) {
          if (dist < 0.01) { dx = 1; dy = 0.1; dist = 1 }
          const push = (md - dist) / 2
          const ux = dx / dist, uy = dy / dist
          a.lx -= ux * push; a.ly -= uy * push
          b.lx += ux * push; b.ly += uy * push
        }
      }
    }
    // label <-> node repulsion (keep every label off every node, incl. its own)
    for (let i = 0; i < labelPos.length; i++) {
      const a = labelPos[i]!
      for (let k = 0; k < labelNodes.length; k++) {
        const nk = labelNodes[k]!
        let dx = a.lx - nk.cx, dy = a.ly - nk.cy
        let dist = Math.hypot(dx, dy)
        const md = a.r + 2.5
        if (dist < md) {
          if (dist < 0.01) { dx = (i === k ? 1 : 0.5); dy = 0.1; dist = Math.hypot(dx, dy) || 1 }
          const push = md - dist
          a.lx += (dx / dist) * push; a.ly += (dy / dist) * push
        }
      }
    }
    // weak spring toward own node so labels don't drift away in dense clusters
    for (let i = 0; i < labelPos.length; i++) {
      const a = labelPos[i]!
      a.lx += (a.cx - a.lx) * 0.012
      a.ly += (a.cy - a.ly) * 0.012
    }
    // clamp to plot area
    for (let i = 0; i < labelPos.length; i++) {
      const b = labelPos[i]!
      b.lx = Math.max(ml + b.r, Math.min(ml + plotW - b.r, b.lx))
      b.ly = Math.max(mt + b.r, Math.min(mt + plotH - b.r, b.ly))
    }
  }
  const labelMap: Record<string, { lx: number; ly: number }> = {}
  for (const b of labelPos) labelMap[b.id] = { lx: b.lx, ly: b.ly }

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
            onClick={() => { onCompareModeChange(!compareMode); onCompareBaselineChange(null) }}
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
        <button className="att-table-close-btn" onClick={onClose}>×</button>
      </div>

      {/* Compare hint */}
      {compareMode && (
        <div style={{ padding: '4px 16px', fontSize: '12px', color: '#00c8b4', background: '#0d2420', borderBottom: '1px solid #00c8b433' }}>
          {compareBaseline ? '已设置基准 — 点击其他配件更换基准' : '对比模式 — 点击一个配件设为基准'}
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
                    <th>弹匣</th>
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
                      <td colSpan={7} style={{ color: '#00c8b4', fontSize: '11px' }}>← 基准</td>
                    </tr>
                  )}
                  {sortedItems.map(item => {
                    const isInstalled = installedItemId === item.id
                    const isBaseline = compareBaseline === item.id
                    const price = prices[item.id]
                    const conflict = conflicts[item.id]
                    const isConflicted = !!conflict
                    const showDelta = !!(baselineItem && !isBaseline)
                    return (
                      <tr
                        key={item.id}
                        data-item-id={item.id}
                        onClick={() => { if (!isConflicted) handleInstall(item) }}
                        className={`att-row${isInstalled ? ' attachment-row-installed' : ''}${isBaseline ? ' compare-baseline' : ''}${isConflicted ? ' conflict-row' : ''}`}
                        title={isConflicted ? `与${conflict.reasonName}冲突` : undefined}
                        onMouseEnter={() => {
                          if (isConflicted) {
                            onConflictHover?.(conflict!.conflictingItemId)
                          } else if (!isInstalled) {
                            setHoveredItem(item); onHoverItem?.(item)
                          } else {
                            onHoverItem?.(null)
                          }
                        }}
                        onMouseLeave={() => { setHoveredItem(null); onHoverItem?.(null); onConflictHover?.(null) }}
                      >
                        <td>
                          <div className="attachment-name-wrapper">
                            <button
                              className={`att-fav-btn${favorites.has(item.id) ? ' active' : ''}`}
                              onClick={(e) => handleToggleFav(e, item.id)}
                            >★</button>
                            <div className="attachment-icon-wrapper">
                              {item.image && <img className="attachment-icon" src={item.image} alt="" ref={el => { if (el?.complete) el.classList.add('loaded') }} onLoad={e => e.currentTarget.classList.add('loaded')} />}
                            </div>
                            <div className="att-name-and-rating">
                              <div className="attachment-name-text">
                                <div className="att-item-name">{item.name}</div>
                                <div className="att-item-shortname">{item.shortName}</div>
                              </div>
                              {isConflicted && (
                                <div className="att-conflict-label">⚠ 与{conflict!.reasonName}冲突</div>
                              )}
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
                        <td>
                          <div>{item.weight.toFixed(3)}kg</div>
                          {showDelta && renderCmpDelta(item.weight, baselineItem!.weight, true, v => v.toFixed(3))}
                        </td>
                        <td style={{ color: item.recoil < 0 ? '#4CAF50' : item.recoil > 0 ? '#f44336' : '#888' }}>
                          <div>{item.recoil !== 0 ? `${item.recoil > 0 ? '+' : ''}${item.recoil}%` : '-'}</div>
                          {showDelta && renderCmpDelta(item.recoil, baselineItem!.recoil, true, v => `${v}%`)}
                        </td>
                        <td style={{ color: item.accuracy > 0 ? '#4CAF50' : item.accuracy < 0 ? '#f44336' : '#888' }}>
                          <div>{item.accuracy !== 0 ? `${item.accuracy > 0 ? '+' : ''}${item.accuracy}%` : '-'}</div>
                          {showDelta && renderCmpDelta(item.accuracy, baselineItem!.accuracy, false, v => `${v}%`)}
                        </td>
                        <td style={{ color: item.ergonomicsModifier > 0 ? '#4CAF50' : item.ergonomicsModifier < 0 ? '#f44336' : '#888' }}>
                          <div>{item.ergonomicsModifier !== 0 ? `${item.ergonomicsModifier > 0 ? '+' : ''}${item.ergonomicsModifier}` : '-'}</div>
                          {showDelta && renderCmpDelta(item.ergonomicsModifier, baselineItem!.ergonomicsModifier, false, v => `${v}`)}
                        </td>
                        <td>
                          <div>{item.magazineCapacity ?? '-'}</div>
                          {showDelta && item.magazineCapacity != null && baselineItem!.magazineCapacity != null && renderCmpDelta(item.magazineCapacity, baselineItem!.magazineCapacity, false, v => `${v}`)}
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
                {Object.entries(GRAPH_METRICS).map(([key, def]) => (key === 'magazineCapacity' && !hasCapacity) ? null : <option key={key} value={key}>{def.label}</option>)}
              </select>
            </label>
            <label style={{ color: '#888' }}>
              Y: <select value={graphYMetric} onChange={e => setGraphYMetric(e.target.value as typeof graphYMetric)} style={{ background: '#1a1a1a', color: '#eee', border: '1px solid #333', borderRadius: '3px', padding: '2px 4px' }}>
                {Object.entries(GRAPH_METRICS).map(([key, def]) => (key === 'magazineCapacity' && !hasCapacity) ? null : <option key={key} value={key}>{def.label}</option>)}
              </select>
            </label>
          </div>

          {/* SVG fills remaining space */}
          <div ref={graphWrapRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <svg
              className={`att-graph-svg${hoveredItem ? ' has-hover' : ''}`}
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'crosshair' }}
              onMouseDown={(e) => {
                if (e.button !== 0) return
                const rect = e.currentTarget.getBoundingClientRect()
                const px = (e.clientX - rect.left) / rect.width * svgW
                const py = (e.clientY - rect.top) / rect.height * svgH
                if (px < ml || px > ml + plotW || py < mt || py > mt + plotH) return
                dragRef.current = { px, py, view: { ...view } }
                dragMovedRef.current = false
                setDragging(true)
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const sx = (e.clientX - rect.left) / rect.width * svgW
                const sy = (e.clientY - rect.top) / rect.height * svgH
                setMousePos({ x: sx, y: sy })
                if (sliderDragRef.current) { setZoomCentered(zFromY(sy)); return }
                const d = dragRef.current
                if (!d) return
                if (Math.hypot(sx - d.px, sy - d.py) > 4) dragMovedRef.current = true
                const shiftX = invX(d.view, d.px) - invX(d.view, sx)
                const shiftY = invY(d.view, d.py) - invY(d.view, sy)
                setViewDomain(clampView({ x0: d.view.x0 + shiftX, x1: d.view.x1 + shiftX, y0: d.view.y0 + shiftY, y1: d.view.y1 + shiftY }))
              }}
              onMouseUp={() => { dragRef.current = null; sliderDragRef.current = false; setDragging(false) }}
              onMouseLeave={() => { setMousePos(null); setHoveredItem(null); onHoverItem?.(null); dragRef.current = null; sliderDragRef.current = false; setDragging(false) }}
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
                const xv = view.x0 + (view.x1 - view.x0) * i / 4
                const yv = view.y0 + (view.y1 - view.y0) * i / 4
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
              {view.x0 < 0 && view.x1 > 0 && (
                <line x1={toX(0)} y1={mt} x2={toX(0)} y2={mt + plotH} stroke="#363636" strokeWidth="0.8" strokeDasharray="4,3" />
              )}
              {view.y0 < 0 && view.y1 > 0 && (
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
                  <text x={ml + 4} y={mt + plotH - 20}>滚轮缩放 · 拖动平移</text>
                  <text x={ml + 4} y={mt + plotH - 10}>点击定位列表</text>
                </g>
              )}

              {/* Data points — node stays at exact (cx,cy); icon+label are placed adaptively and joined by a leader */}
              <g clipPath="url(#plot-clip)">
                {graphItems.map(item => {
                  const xv = xDef.getValue(item)
                  const yv = yDef.getValue(item)
                  const cx = toX(xv)
                  const cy = toY(yv)
                  if (cx < ml || cx > ml + plotW || cy < mt || cy > mt + plotH) return null
                  const isHovered = hoveredItem?.id === item.id
                  const lp = labelMap[item.id] || { lx: cx, ly: cy }
                  const lx = lp.lx, ly = lp.ly
                  const nameAbove = ly < cy
                  const edgeY = nameAbove ? ly + iconSize / 2 : ly - iconSize / 2
                  return (
                    <g
                      key={item.id}
                      className={`att-graph-dot${isHovered ? ' graph-dot-hovered' : ''}`}
                      onMouseEnter={() => { setHoveredItem(item); onHoverItem?.(item) }}
                      onMouseLeave={() => { setHoveredItem(null); onHoverItem?.(null) }}
                      onClick={() => handleDotClick(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Leader line: node -> elbow -> icon (adapts to label direction) */}
                      <polyline
                        className="graph-leader"
                        points={`${cx},${cy} ${lx},${cy} ${lx},${edgeY}`}
                        style={{ opacity: isHovered ? 0.95 : 0.4 }}
                      />
                      {/* Yellow node — accurate position, rendered on top, never covered by icon */}
                      <circle className="graph-dot-ring" cx={cx} cy={cy} r="4.5" fill="none" stroke="#f5c542" strokeWidth="0.8" strokeOpacity={isHovered ? 0.55 : 0} />
                      <circle cx={cx} cy={cy} r="1.5" fill={isHovered ? '#ffe566' : '#f5c542'} />
                      {/* Label: icon (reference) + short name, placed in free space */}
                      <g transform={`translate(${lx - iconSize / 2},${ly - iconSize / 2})`}>
                        {item.image && <image className="graph-label-icon" href={item.image} x={0} y={0} width={iconSize} height={iconSize} preserveAspectRatio="xMidYMid meet" filter="url(#icon-shadow)" opacity={isHovered ? 1 : 0.85} />}
                        {showLabels && <text className="graph-item-name" x={iconSize / 2} y={nameAbove ? -2 : iconSize + 7} textAnchor="middle" fontSize={fontSize}>{item.shortName}</text>}
                      </g>
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
                  { active: zoomLevel > 1.001, onClick: resetView, icon: '⟲', label: '复位' },
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

              {/* Zoom slider — full-height vertical track on right side */}
              <g>
                {(() => {
                  const sliderX = btnX
                  const t = (zoomLevel - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)
                  const thumbY = sliderBot - t * (sliderBot - sliderTop)
                  return (
                    <>
                      <line x1={sliderX} y1={sliderTop} x2={sliderX} y2={sliderBot} stroke="#252525" strokeWidth="1" />
                      <line x1={sliderX} y1={thumbY} x2={sliderX} y2={sliderBot} stroke="#444" strokeWidth="1" />
                      {/* clickable + wheel-scrollable track */}
                      <rect x={sliderX - 4} y={sliderTop} width="8" height={Math.max(0, sliderBot - sliderTop)} fill="transparent" pointerEvents="all"
                        onWheel={(e) => { e.preventDefault(); setZoomCentered(zoomLevel * (e.deltaY > 0 ? 1 / 1.12 : 1.12)) }}
                        onClick={(e) => { const r = e.currentTarget.ownerSVGElement?.getBoundingClientRect(); if (!r) return; const py = (e.clientY - r.top) / r.height * svgH; setZoomCentered(zFromY(py)) }}
                      />
                      <circle
                        cx={sliderX} cy={thumbY} r="2.5" fill="#444" stroke="#666" strokeWidth="0.5"
                        style={{ cursor: 'grab' }}
                        pointerEvents="all"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); sliderDragRef.current = true; setDragging(true) }}
                        onWheel={(e) => { e.preventDefault(); setZoomCentered(zoomLevel * (e.deltaY > 0 ? 1 / 1.12 : 1.12)) }}
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
