import { useState, useRef, useEffect } from 'react'
import type { BuildStats, AllowedItem } from '@/lib/forgeApi'
import './forge.css'

interface StatsPanelProps {
  stats: BuildStats
  baseStats?: BuildStats | null
  previewItem?: AllowedItem | null
}

export function StatsPanel({ stats, baseStats, previewItem }: StatsPanelProps) {
  const [showHidden, setShowHidden] = useState(false)
  const hiddenRef = useRef<HTMLDivElement>(null)

  const ergoPct = Math.max(0, Math.min(stats.totalErgo, 100))
  const recoilVPct = stats.recoilVertical !== null ? Math.min(Math.round(stats.recoilVertical), 500) / 5 : 0
  const recoilHPct = stats.recoilHorizontal !== null ? Math.min(Math.round(stats.recoilHorizontal), 500) / 5 : 0
  const accuracyPct = stats.accuracyMoa !== null ? Math.max(0, Math.min(100 - stats.accuracyMoa * 10, 100)) : 0

  const armStamina = 233.65 / (stats.totalWeight + 0.83) + 0.185 * stats.totalErgo + 23.16

  const isPreviewing = !!baseStats && !!previewItem
  const ergoDelta = isPreviewing ? stats.totalErgo - baseStats!.totalErgo : 0
  const weightDelta = isPreviewing ? stats.totalWeight - baseStats!.totalWeight : 0

  // Attribute-aware delta colors: green = improvement, red = deterioration
  // Ergo: higher = better → increase = green
  // Recoil: lower = better → decrease = green
  // Accuracy MOA: lower = better → decrease = green
  const ergoDeltaColor = ergoDelta >= 0 ? '#4CAF50' : '#f44336'

  // Recoil deltas: negative = decrease = good = green
  const rvDelta = isPreviewing && baseStats && baseStats.recoilVertical !== null && stats.recoilVertical !== null
    ? stats.recoilVertical - baseStats.recoilVertical : 0
  const rvDeltaColor = rvDelta <= 0 ? '#4CAF50' : '#f44336'

  const rhDelta = isPreviewing && baseStats && baseStats.recoilHorizontal !== null && stats.recoilHorizontal !== null
    ? stats.recoilHorizontal - baseStats.recoilHorizontal : 0
  const rhDeltaColor = rhDelta <= 0 ? '#4CAF50' : '#f44336'

  // Delta bar positions (based on bar fill percentages)
  const baseErgoPct = isPreviewing && baseStats ? Math.max(0, Math.min(baseStats.totalErgo, 100)) : ergoPct
  const ergoDeltaLeft = Math.min(baseErgoPct, ergoPct)
  const ergoDeltaWidth = Math.abs(ergoPct - baseErgoPct)

  const baseRVPct = isPreviewing && baseStats && baseStats.recoilVertical !== null
    ? Math.min(Math.round(baseStats.recoilVertical), 500) / 5 : recoilVPct
  const rvDeltaLeft = Math.min(baseRVPct, recoilVPct)
  const rvDeltaWidth = Math.abs(recoilVPct - baseRVPct)

  const baseRHPct = isPreviewing && baseStats && baseStats.recoilHorizontal !== null
    ? Math.min(Math.round(baseStats.recoilHorizontal), 500) / 5 : recoilHPct
  const rhDeltaLeft = Math.min(baseRHPct, recoilHPct)
  const rhDeltaWidth = Math.abs(recoilHPct - baseRHPct)

  // Accuracy delta: MOA decrease = good = green
  const accDelta = isPreviewing && baseStats && baseStats.accuracyMoa !== null && stats.accuracyMoa !== null
    ? Math.round((stats.accuracyMoa - baseStats.accuracyMoa) * 100) / 100 : 0
  const accDeltaColor = accDelta <= 0 ? '#4CAF50' : '#f44336'
  const baseAccuracyPct = isPreviewing && baseStats && baseStats.accuracyMoa !== null
    ? Math.max(0, Math.min(100 - baseStats.accuracyMoa * 10, 100)) : accuracyPct
  const accDeltaLeft = Math.min(baseAccuracyPct, accuracyPct)
  const accDeltaWidth = Math.abs(accuracyPct - baseAccuracyPct)

  useEffect(() => {
    if (!hiddenRef.current) return
    const el = hiddenRef.current
    if (showHidden) {
      el.style.height = '0'; el.style.opacity = '0'; el.style.overflow = 'hidden'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'height 0.3s ease, opacity 0.25s ease'
        el.style.height = el.scrollHeight + 'px'; el.style.opacity = '1'
        const onDone = () => { el.style.height = ''; el.style.overflow = ''; el.style.opacity = ''; el.style.transition = ''; el.removeEventListener('transitionend', onDone) }
        el.addEventListener('transitionend', onDone)
      }))
    } else {
      el.style.height = el.scrollHeight + 'px'; el.style.opacity = '1'; el.style.overflow = 'hidden'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'height 0.3s ease, opacity 0.25s ease'
        el.style.height = '0'; el.style.opacity = '0'
      }))
    }
  }, [showHidden])

  return (
    <div className="stats-section">
      <div className="section-title stats-title-row">
        <span>当前配置</span>
        <button className={`hidden-stats-btn${showHidden ? ' open' : ''}`} onClick={() => setShowHidden(!showHidden)}>
          <span className="hidden-stats-label">隐藏属性</span>
          <span className="hidden-stats-arrow">▼</span>
        </button>
      </div>

      {/* Ergonomics bar */}
      <div className="stat-bar-row">
        <div className="stat-bar-label">人机</div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill ergo-bar" style={{ width: `${isPreviewing ? baseErgoPct : ergoPct}%` }} />
          {isPreviewing && ergoDelta !== 0 && (
            <div className="delta-bar" style={{
              left: `${ergoDeltaLeft}%`, width: `${ergoDeltaWidth}%`,
              background: ergoDeltaColor, borderRadius: ergoDelta >= 0 ? '0 3px 3px 0' : '3px',
            }} />
          )}
        </div>
        <div className="stat-bar-value">
          {Number.isInteger(stats.totalErgo) ? stats.totalErgo : stats.totalErgo.toFixed(1)}
          {isPreviewing && ergoDelta !== 0 && (
            <span style={{ color: ergoDelta >= 0 ? '#4CAF50' : '#f44336', fontSize: '11px', marginLeft: '2px' }}>
              ({ergoDelta > 0 ? '+' : ''}{ergoDelta})
            </span>
          )}
        </div>
      </div>

      {/* Vertical recoil bar */}
      <div className="stat-bar-row">
        <div className="stat-bar-label">垂直后坐力</div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill recoil-bar" style={{ width: `${isPreviewing ? baseRVPct : recoilVPct}%` }} />
          {isPreviewing && rvDeltaWidth > 0 && (
            <div className="delta-bar" style={{
              left: `${rvDeltaLeft}%`, width: `${rvDeltaWidth}%`,
              background: rvDeltaColor, borderRadius: rvDelta <= 0 ? '3px 3px 3px 0' : '0 3px 3px 3px',
            }} />
          )}
        </div>
        <div className="stat-bar-value">
          {stats.recoilVertical !== null ? Math.round(stats.recoilVertical) : '-'}
          {isPreviewing && rvDelta !== 0 && (
            <span style={{ color: rvDeltaColor, fontSize: '11px', marginLeft: '2px' }}>
              ({rvDelta > 0 ? '+' : ''}{rvDelta})
            </span>
          )}
        </div>
      </div>

      {/* Horizontal recoil bar */}
      <div className="stat-bar-row">
        <div className="stat-bar-label">水平后坐力</div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill recoil-bar" style={{ width: `${isPreviewing ? baseRHPct : recoilHPct}%` }} />
          {isPreviewing && rhDeltaWidth > 0 && (
            <div className="delta-bar" style={{
              left: `${rhDeltaLeft}%`, width: `${rhDeltaWidth}%`,
              background: rhDeltaColor, borderRadius: rhDelta <= 0 ? '3px 3px 3px 0' : '0 3px 3px 3px',
            }} />
          )}
        </div>
        <div className="stat-bar-value">
          {stats.recoilHorizontal !== null ? Math.round(stats.recoilHorizontal) : '-'}
          {isPreviewing && rhDelta !== 0 && (
            <span style={{ color: rhDeltaColor, fontSize: '11px', marginLeft: '2px' }}>
              ({rhDelta > 0 ? '+' : ''}{rhDelta})
            </span>
          )}
        </div>
      </div>

      {/* Accuracy bar */}
      {stats.accuracyMoa !== null && (
        <div className="stat-bar-row">
          <div className="stat-bar-label">精度</div>
          <div className="stat-bar-track">
            <div className="stat-bar-fill accuracy-bar" style={{ width: `${isPreviewing ? baseAccuracyPct : accuracyPct}%` }} />
            {isPreviewing && accDeltaWidth > 0 && (
              <div className="delta-bar" style={{
                left: `${accDeltaLeft}%`, width: `${accDeltaWidth}%`,
                background: accDeltaColor, borderRadius: accDelta <= 0 ? '0 3px 3px 0' : '3px 0 0 3px',
              }} />
            )}
          </div>
          <div className="stat-bar-value">
            {stats.accuracyMoa.toFixed(2)} MOA
            {isPreviewing && accDelta !== 0 && (
              <span style={{ color: accDeltaColor, fontSize: '11px', marginLeft: '2px' }}>
                ({accDelta > 0 ? '+' : ''}{accDelta.toFixed(2)})
              </span>
            )}
          </div>
        </div>
      )}

      <div className="stats-divider" />

      <div className="stat-subsection">
        <div className="stat-row stat-row-weight">
          <span className="stat-label">重量</span>
          <span>
            {stats.totalWeight.toFixed(3)} kg
            {isPreviewing && weightDelta !== 0 && (
              <span style={{ color: weightDelta < 0 ? '#4CAF50' : '#f44336', fontSize: '11px', marginLeft: '2px' }}>
                ({weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(3)})
              </span>
            )}
          </span>
        </div>
        {stats.sightingRange !== null && (
          <div className="stat-row"><span className="stat-label">瞄具有效距离</span><span>{stats.sightingRange} m</span></div>
        )}
        <div className="stat-row"><span className="stat-label">手臂耐力</span><span>
          {armStamina.toFixed(1)}s
          {isPreviewing && (() => {
            const baseArmStam = baseStats ? 233.65 / (baseStats.totalWeight + 0.83) + 0.185 * baseStats.totalErgo + 23.16 : armStamina
            const stamDelta = armStamina - baseArmStam
            if (Math.abs(stamDelta) < 0.1) return null
            return <span style={{ color: stamDelta > 0 ? '#4CAF50' : '#f44336', fontSize: '11px', marginLeft: '2px' }}>({stamDelta > 0 ? '+' : ''}{stamDelta.toFixed(1)})</span>
          })()}
        </span></div>
      </div>

      {/* Hidden stats with animation */}
      <div ref={hiddenRef} style={{ overflow: 'hidden', height: showHidden ? 'auto' : '0', opacity: showHidden ? 1 : 0, transition: 'height 0.3s ease, opacity 0.25s ease' }}>
        <div className="hidden-stats-grid">
          {stats.fireRate !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">射速</span><span className="hidden-stat-value">{stats.fireRate} rpm</span></div>}
          {stats.effectiveRange !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">有效射程</span><span className="hidden-stat-value">{stats.effectiveRange} m</span></div>}
          {stats.recoilAngle !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">后坐力角度</span><span className="hidden-stat-value">{stats.recoilAngle}°</span></div>}
          {stats.recoilDispersion !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">后坐力分散</span><span className="hidden-stat-value">{stats.recoilDispersion}</span></div>}
          {stats.recoilCamera !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">视角后坐力</span><span className="hidden-stat-value">{stats.recoilCamera}</span></div>}
          {stats.malfunctionChance !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">故障率</span><span className="hidden-stat-value">{(stats.malfunctionChance * 100).toFixed(2)}%</span></div>}
          {stats.durabilityBurnRatio !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">耐久消耗</span><span className="hidden-stat-value">{stats.durabilityBurnRatio}</span></div>}
          {stats.heatFactorGun !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">过热系数</span><span className="hidden-stat-value">{stats.heatFactorGun}</span></div>}
          {stats.deviationMax !== null && <div className="hidden-stat-row"><span className="hidden-stat-label">最大偏差</span><span className="hidden-stat-value">{stats.deviationMax}</span></div>}
          <div className="hidden-stat-row"><span className="hidden-stat-label">后坐力修正</span><span className="hidden-stat-value">{stats.totalRecoilMod > 0 ? '+' : ''}{stats.totalRecoilMod}%</span></div>
          <div className="hidden-stat-row"><span className="hidden-stat-label">精度修正</span><span className="hidden-stat-value">{stats.totalAccuracyMod > 0 ? '+' : ''}{stats.totalAccuracyMod}%</span></div>
        </div>
      </div>
    </div>
  )
}
