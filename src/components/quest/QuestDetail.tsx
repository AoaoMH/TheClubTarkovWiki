import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuestDetail } from '@/hooks/useQuests'
import { useItemNamesMap } from '@/hooks/useItems'
import { useQuestList } from '@/hooks/useQuests'
import type { QuestReward, QuestObjective } from '@/lib/dataStore'

// ==================== Constants ====================

const LOCATION_NAMES: Record<string, { zh: string; en: string }> = {
  'any': { zh: '任意', en: 'Any' }, 'bigmap': { zh: '海关', en: 'Customs' },
  'factory4_day': { zh: '工厂', en: 'Factory' }, 'rezervbase': { zh: '储备站', en: 'Reserve' },
  'lighthouse': { zh: '灯塔', en: 'Lighthouse' }, 'tarkovstreets': { zh: '街区', en: 'Streets of Tarkov' },
  'woods': { zh: '森林', en: 'Woods' }, 'shoreline': { zh: '海岸线', en: 'Shoreline' },
  'interchange': { zh: '立交桥', en: 'Interchange' }, 'laboratory': { zh: '实验室', en: 'The Lab' },
  'sandbox': { zh: '中心区', en: 'Center' },
  '56f40101d2720b2a4d8b45d6': { zh: '海关', en: 'Customs' }, '5704e4dad2720bb55b8b4567': { zh: '储备站', en: 'Reserve' },
  '5704e3c2d2720bac5b8b4567': { zh: '森林', en: 'Woods' }, '5704e5fad2720bc05b8b4567': { zh: '海岸线', en: 'Shoreline' },
  '5704e554d2720bac5b8b456e': { zh: '工厂', en: 'Factory' }, '5714dbc024597771384a510d': { zh: '立交桥', en: 'Interchange' },
  '5714dc692459777137212e12': { zh: '实验室', en: 'The Lab' }, '59fc81d786f774390775787e': { zh: '灯塔', en: 'Lighthouse' },
  '5714db3224597771352c2e45': { zh: '街区', en: 'Streets of Tarkov' }, '653e676a46c22c70f6031b67': { zh: '中心区', en: 'Center' },
}

// Dynamically populated from quest data - avoids prop drilling through ObjectiveRow/ObjContent
let _traderNames: Record<string, string> = {}
const getTraderName = (id: string) => _traderNames[id] || id

const SKILL_NAMES: Record<string, { zh: string; en: string }> = {
  // Core
  'Endurance': { zh: '耐力', en: 'Endurance' }, 'Strength': { zh: '力量', en: 'Strength' },
  'Vitality': { zh: '活力', en: 'Vitality' }, 'Health': { zh: '健康', en: 'Health' },
  'StressResistance': { zh: '抗压', en: 'Stress Resistance' }, 'Metabolism': { zh: '新陈代谢', en: 'Metabolism' },
  // Mental
  'Perception': { zh: '感知', en: 'Perception' }, 'Intellect': { zh: '智力', en: 'Intellect' },
  'Attention': { zh: '注意力', en: 'Attention' }, 'Charisma': { zh: '魅力', en: 'Charisma' },
  'Memory': { zh: '记忆', en: 'Memory' }, 'Surgery': { zh: '手术', en: 'Surgery' },
  // Hideout
  'Crafting': { zh: '制造', en: 'Crafting' }, 'HideoutManagement': { zh: '藏身处管理', en: 'Hideout Management' },
  // Weapon skills
  'WeaponTreatment': { zh: '武器保养', en: 'Weapon Treatment' }, 'RecoilControl': { zh: '后坐力控制', en: 'Recoil Control' },
  'CovertMovement': { zh: '隐蔽行动', en: 'Covert Movement' }, 'Search': { zh: '搜索', en: 'Search' },
  'Sniper': { zh: '狙击手', en: 'Sniper' }, 'Sniping': { zh: '狙击', en: 'Sniping' },
  // Weapon types
  'Assault': { zh: '突击步枪', en: 'Assault' }, 'DMR': { zh: '精确射手步枪', en: 'DMR' },
  'HMG': { zh: '重机枪', en: 'HMG' }, 'LMG': { zh: '轻机枪', en: 'LMG' },
  'SMG': { zh: '冲锋枪', en: 'SMG' }, 'Shotgun': { zh: '霰弹枪', en: 'Shotgun' },
  'Pistol': { zh: '手枪', en: 'Pistol' }, 'Revolver': { zh: '左轮手枪', en: 'Revolver' },
  'Melee': { zh: '近战', en: 'Melee' }, 'Throwables': { zh: '投掷物', en: 'Throwables' },
  'Throwing': { zh: '投掷', en: 'Throwing' }, 'Launcher': { zh: '发射器', en: 'Launcher' },
  'AttachedLauncher': { zh: '挂载发射器', en: 'Attached Launcher' },
  // Gear & combat
  'LightVests': { zh: '轻型护甲', en: 'Light Vests' }, 'HeavyVests': { zh: '重型护甲', en: 'Heavy Vests' },
  'TroubleShooting': { zh: '故障排除', en: 'Troubleshooting' }, 'Immunity': { zh: '免疫力', en: 'Immunity' },
  // Drills
  'AimDrills': { zh: '瞄准训练', en: 'Aim Drills' }, 'MagDrills': { zh: '弹匣训练', en: 'Mag Drills' },
}

const BOSS_ROLE_NAMES: Record<string, { zh: string; en: string }> = {
  'bossBully': { zh: 'Reshala', en: 'Reshala' },
  'bossKilla': { zh: 'Killa', en: 'Killa' },
  'bossGluhar': { zh: 'Shturman', en: 'Shturman' },
  'bossSanitar': { zh: 'Sanitar', en: 'Sanitar' },
  'bossTagilla': { zh: 'Tagilla', en: 'Tagilla' },
  'bossKnight': { zh: 'Knight', en: 'Knight' },
  'bossZryachiy': { zh: 'Zryachiy', en: 'Zryachiy' },
  'bossBoar': { zh: 'Kaban', en: 'Kaban' },
  'bossBoarSniper': { zh: 'Kaban 狙击手', en: 'Kaban Sniper' },
  'bossKolontay': { zh: 'Kolontay', en: 'Kolontay' },
  'bossKillaAgro': { zh: 'Killa (狂暴)', en: 'Killa (Agro)' },
  // Sectant (cultist) roles
  'sectantWarrior': { zh: '邪教徒战士', en: 'Sectant Warrior' },
  'sectantPriest': { zh: '邪教徒祭司', en: 'Sectant Priest' },
  'sectantPrizrak': { zh: '邪教徒幽灵', en: 'Sectant Prizrak' },
  'sectantPredvestnik': { zh: '邪教徒先驱', en: 'Sectant Predvestnik' },
  'sectantOni': { zh: '邪教徒恶鬼', en: 'Sectant Oni' },
  // Common roles
  'Savage': { zh: 'Scav', en: 'Scav' },
  'assault': { zh: 'Scav', en: 'Scav' },
  'pmcBot': { zh: 'Raider', en: 'Raider' },
  'exUsec': { zh: 'Rogue', en: 'Rogue' },
  'marksman': { zh: '狙击手', en: 'Sniper' },
  'cursedAssault': { zh: '被诅咒的Scav', en: 'Cursed Scav' },
  'followerBully': { zh: 'Reshala小弟', en: 'Reshala Guard' },
  'followerKojaniy': { zh: 'Shturman小弟', en: 'Shturman Guard' },
  'followerSanitar': { zh: 'Sanitar小弟', en: 'Sanitar Guard' },
  'followerTagilla': { zh: 'Tagilla小弟', en: 'Tagilla Guard' },
  'followerZryachiy': { zh: 'Zryachiy小弟', en: 'Zryachiy Guard' },
  'followerBoar': { zh: 'Kaban小弟', en: 'Kaban Guard' },
  'followerBoarClose1': { zh: 'Kaban近卫', en: 'Kaban Close Guard' },
  'followerBoarClose2': { zh: 'Kaban近卫', en: 'Kaban Close Guard' },
  'infectedAssault': { zh: '感染者', en: 'Infected' },
  'infectedPmc': { zh: '感染者PMC', en: 'Infected PMC' },
  'infectedLaborant': { zh: '感染者实验员', en: 'Infected Lab Worker' },
  'infectedTagilla': { zh: '感染者Tagilla', en: 'Infected Tagilla' },
}

const STAT_NAMES: Record<string, { zh: string; en: string }> = {
  'ergonomics': { zh: '人机工效', en: 'Ergonomics' }, 'recoil': { zh: '后坐力总和', en: 'Total Recoil' },
  'effectiveDistance': { zh: '有效距离', en: 'Effective Distance' }, 'durability': { zh: '耐久度', en: 'Durability' },
  'magazineCapacity': { zh: '弹匣容量', en: 'Magazine Capacity' }, 'height': { zh: '高度', en: 'Height' },
  'width': { zh: '宽度', en: 'Width' }, 'weight': { zh: '重量', en: 'Weight' },
  'muzzleVelocity': { zh: '枪口初速', en: 'Muzzle Velocity' },
}

const CURRENCY_IDS = new Set([
  '5449016a4bdc2d6f028b456f', '569668774bdc2da2298b4568',
  '5696686a4bdc2da3298b456a', '5d235b4d86f7742e017bc88a',
])

function getSkillName(n: string, l: 'zh' | 'en') { return SKILL_NAMES[n]?.[l] || n }
function getStatName(s: string, l: 'zh' | 'en') { return STAT_NAMES[s]?.[l] || s }
function getLocName(id: string, l: 'zh' | 'en') { return LOCATION_NAMES[id]?.[l] || id }
function getBossRoleName(role: string, l: 'zh' | 'en') { return BOSS_ROLE_NAMES[role]?.[l] || role }

// ==================== Tree branch line ====================

function TreeBranch({ children, isLast = false }: { children: React.ReactNode; isLast?: boolean }) {
  return (
    <div className="relative ml-2 pl-3 text-xs text-muted-foreground">
      {/* Vertical line: only from top to center (or full if not last) */}
      <span
        className="absolute left-0 top-0 w-px"
        style={{
          height: isLast ? '50%' : '100%',
          background: 'var(--border)',
          backgroundImage: 'repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 3px, transparent 3px, transparent 6px)',
        }}
      />
      {/* Horizontal connector */}
      <span className="absolute left-0 top-1/2 w-2.5" style={{ borderTop: '1px dashed var(--border)' }} />
      {children}
    </div>
  )
}

// ==================== Reward Rendering ====================

function isInlineReward(r: QuestReward): boolean {
  return r.type === 'Experience' || r.type === 'TraderStanding' || r.type === 'TraderStandingRestore' ||
    (r.type === 'Item' && !!r.itemId && CURRENCY_IDS.has(r.itemId))
}

function RewardBadge({ reward, lang }: { reward: QuestReward; lang: 'zh' | 'en' }) {
  if (reward.type === 'Experience') return <Badge variant="secondary" className="shrink-0">+{reward.value} EXP</Badge>
  if (reward.type === 'TraderStanding' || reward.type === 'TraderStandingRestore') {
    const val = reward.value ?? 0
    return <Badge variant="secondary" className={`shrink-0 ${val >= 0 ? 'text-green-600' : 'text-red-500'}`}>{val >= 0 ? '+' : ''}{val} {getTraderName(reward.target || '')}</Badge>
  }
  if (reward.type === 'Item') {
    const name = reward.itemName ? (lang === 'zh' ? reward.itemName.zh : reward.itemName.en) : '?'
    return <Badge variant="secondary" className="shrink-0">{name} ×{(reward.quantity ?? 1).toLocaleString()}</Badge>
  }
  return null
}

function RewardRow({ reward, lang }: { reward: QuestReward; lang: 'zh' | 'en' }) {
  if (reward.type === 'Item') {
    const name = reward.itemName ? (lang === 'zh' ? reward.itemName.zh : reward.itemName.en) : (reward.itemId || '?')
    const qty = reward.quantity ?? 1
    return <div className="text-sm">{reward.itemId ? <Link to={`/item/${reward.itemId}`} className="text-primary hover:underline">{name} ×{qty.toLocaleString()}</Link> : <span>{name} ×{qty.toLocaleString()}</span>}</div>
  }
  if (reward.type === 'Skill') return <div className="text-sm">{getSkillName(reward.target || '', lang)} +{reward.value}</div>
  if (reward.type === 'TraderUnlock') return <div className="text-sm text-muted-foreground">{lang === 'zh' ? '解锁商人' : 'Unlock'}: {getTraderName(reward.target || '')}</div>
  if (reward.type === 'AssortmentUnlock' || reward.type === 'ProductionScheme') {
    const name = reward.itemName ? (lang === 'zh' ? reward.itemName.zh : reward.itemName.en) : (reward.itemId || '')
    const label = lang === 'zh' ? (reward.type === 'AssortmentUnlock' ? '解锁商品' : '制造配方') : reward.type
    return <div className="text-sm"><span className="text-muted-foreground">{label}: </span>{reward.itemId ? <Link to={`/item/${reward.itemId}`} className="text-primary hover:underline">{name}</Link> : name}</div>
  }
  if (reward.type === 'Achievement') return <div className="text-sm text-muted-foreground">{lang === 'zh' ? '成就' : 'Achievement'}: {reward.target}</div>
  return null
}

// ==================== Objective: left type + right content ====================

function getObjTypeLabel(obj: QuestObjective, lang: 'zh' | 'en', t: any): string {
  const cond = obj.description?.split(': ')[1] || null
  switch (obj.type) {
    case 'Elimination': case 'Counter': return t('kill')
    case 'HandoverItem': return t('handoverItem')
    case 'FindItem': return t('findItem')
    case 'VisitPlace': case 'InZone': return t('visitPlace')
    case 'Exploration':
      if (cond === 'VisitPlace' || cond === 'InZone') return t('visitPlace')
      if (cond === 'ExitStatus' || cond === 'ExitName') return lang === 'zh' ? '撤离' : 'Extract'
      if (cond === 'Location') return lang === 'zh' ? '指定地点' : 'Location'
      return lang === 'zh' ? '探索' : 'Explore'
    case 'Completion':
      if (cond === 'Location') return lang === 'zh' ? '指定地点' : 'Location'
      if (cond === 'ExitStatus' || cond === 'ExitName') return lang === 'zh' ? '撤离' : 'Extract'
      if (cond === 'VisitPlace' || cond === 'InZone') return t('visitPlace')
      if (cond === 'Kills') return t('kill')
      if (cond === 'LaunchFlare') return t('launchFlare')
      if (cond === 'UnderArtilleryFire') return lang === 'zh' ? '炮火存活' : 'Artillery'
      if (cond === 'HealthEffect') return lang === 'zh' ? '保持健康' : 'Healthy'
      if (cond?.startsWith('Arena')) return lang === 'zh' ? '竞技场' : 'Arena'
      return lang === 'zh' ? '完成' : 'Complete'
    case 'Discover':
      if (cond === 'VisitPlace') return lang === 'zh' ? '发现' : 'Discover'
      if (cond === 'ExitStatus') return lang === 'zh' ? '发现撤离点' : 'Discover'
      return lang === 'zh' ? '发现' : 'Discover'
    case 'Experience': return cond === 'ExitStatus' ? (lang === 'zh' ? '撤离' : 'Extract') : (lang === 'zh' ? '获取经验' : 'Gain XP')
    case 'ExitName': case 'ExitStatus': return lang === 'zh' ? '撤离点' : 'Extract'
    case 'LeaveItemAtLocation': return t('leaveItemAtLocation')
    case 'PlaceBeacon': return t('placeBeacon')
    case 'LaunchFlare': return t('launchFlare')
    case 'WeaponAssembly': return t('weaponAssembly')
    case 'Skill': return t('skill')
    case 'TraderStanding': case 'TraderLoyalty': return lang === 'zh' ? '商人声望' : 'Standing'
    case 'Avoid': return lang === 'zh' ? '避免' : 'Avoid'
    default: return obj.type
  }
}

function ObjContent({ obj, lang, itemNames, t }: {
  obj: QuestObjective; lang: 'zh' | 'en'
  itemNames: Record<string, { zh: string; en: string }>; t: any
}) {
  const getName = (id: string) => obj.targetNames?.[id]?.[lang] || obj.weaponNames?.[id]?.[lang] || obj.requiredItemNames?.[id]?.[lang] || obj.requiredCategoryNames?.[id]?.[lang] || itemNames[id]?.[lang] || id
  const renderTargets = (targets: string | string[] | undefined) => {
    if (!targets) return null
    const arr = Array.isArray(targets) ? targets : [targets]
    return arr.map((id, i) => <span key={i}>{i > 0 && ', '}<Link to={`/item/${id}`} className="text-primary hover:underline">{getName(id)}</Link></span>)
  }
  const cond = obj.description?.split(': ')[1] || null

  switch (obj.type) {
    case 'Elimination':
    case 'Counter': {
      const hasEnemy = obj.enemyRoles && obj.enemyRoles.length > 0
      const locInfo = obj.location ? getLocName(obj.location.split(',')[0] ?? '', lang) : null
      // Build all branches: enemy roles + weapons + bodyParts + distance
      const enemyBranches = hasEnemy
        ? obj.enemyRoles!.map((r, i) => ({ key: `en-${i}`, node: <>{getBossRoleName(r, lang)}</> }))
        : []
      const weaponBranches = (obj.weapons || []).map((id, i) => ({
        key: `wp-${i}`,
        node: <Link to={`/item/${id}`} className="text-primary hover:underline">{getName(id)}</Link>
      }))
      const otherBranches = [
        ...(obj.bodyParts?.length ? [{ key: 'b', node: <>{t('bodyParts')}: {obj.bodyParts.join(', ')}</> }] : []),
        ...(obj.distance?.value ? [{ key: 'd', node: <>{t('distance')}: {obj.distance.compareMethod} {obj.distance.value}m</> }] : []),
      ]
      const allBranches = [
        ...enemyBranches,
        ...(weaponBranches.length > 0 ? [{ key: 'wl', node: <>{lang === 'zh' ? '限定武器' : 'Required weapons'}</>, isCategory: true }, ...weaponBranches.map(w => ({ ...w, isCategory: false }))] : []),
        ...otherBranches,
      ]
      const target = hasEnemy
        ? (lang === 'zh' ? '击杀下列任意目标' : 'Kill any of')
        : (hasEnemy ? '' : (lang === 'zh' ? '任意目标' : 'any target'))
      return (
        <div className="space-y-1">
          <div>{target} × {obj.value || 1}{locInfo && <span className="text-muted-foreground ml-1">@ {locInfo}</span>}</div>
          {allBranches.map((b, i) => <TreeBranch key={b.key} isLast={i === allBranches.length - 1 && !('isCategory' in b && b.isCategory)}>{b.node}</TreeBranch>)}
        </div>
      )
    }
    case 'HandoverItem':
    case 'FindItem': {
      const targets = obj.target ? (Array.isArray(obj.target) ? obj.target : [obj.target]) : []
      if (targets.length <= 3) {
        return <div>{renderTargets(obj.target)} × {obj.value || 1}{obj.onlyFoundInRaid && <span className="text-xs text-muted-foreground ml-1">({t('onlyFoundInRaid')})</span>}</div>
      }
      return (
        <div className="space-y-1">
          <div>{lang === 'zh' ? '上交以下任意物品' : 'Handover any of'} × {obj.value || 1}{obj.onlyFoundInRaid && <span className="text-xs text-muted-foreground ml-1">({t('onlyFoundInRaid')})</span>}</div>
          {targets.map((id, i) => (
            <TreeBranch key={i} isLast={i === targets.length - 1}>
              <Link to={`/item/${id}`} className="text-primary hover:underline">{getName(id)}</Link>
            </TreeBranch>
          ))}
        </div>
      )
    }
    case 'VisitPlace':
    case 'InZone':
      return <div>{obj.target ? getLocName(String(Array.isArray(obj.target) ? obj.target[0] : obj.target), lang) : ''} × {obj.value || 1}</div>
    case 'Exploration':
      if (cond === 'VisitPlace' || cond === 'InZone') return <div>{obj.target ? getLocName(String(Array.isArray(obj.target) ? obj.target[0] : obj.target), lang) : ''} × {obj.value || 1}</div>
      if (cond === 'ExitStatus' || cond === 'ExitName') return <div>{lang === 'zh' ? '成功撤离' : 'Extract'}</div>
      if (cond === 'Location') return <div>{obj.target ? getLocName(String(Array.isArray(obj.target) ? obj.target[0] : obj.target), lang) : ''}</div>
      return <div>{obj.target ? getLocName(String(Array.isArray(obj.target) ? obj.target[0] : obj.target), lang) : ''}</div>
    case 'Completion':
      if (cond === 'Location') return <div>{obj.target ? getLocName(String(Array.isArray(obj.target) ? obj.target[0] : obj.target), lang) : ''}</div>
      if (cond === 'ExitStatus' || cond === 'ExitName') return <div>{lang === 'zh' ? '成功撤离' : 'Extract'}</div>
      if (cond === 'VisitPlace' || cond === 'InZone') return <div>{obj.target ? getLocName(String(Array.isArray(obj.target) ? obj.target[0] : obj.target), lang) : ''}</div>
      if (cond === 'Kills') return <div>× {obj.value || 1}</div>
      if (cond === 'LaunchFlare') return <div>-</div>
      if (cond === 'UnderArtilleryFire') return <div>{lang === 'zh' ? '在炮火中存活' : 'Survive'}</div>
      if (cond === 'HealthEffect') return <div>{lang === 'zh' ? '保持健康' : 'Stay healthy'}</div>
      return <div>{renderTargets(obj.target)} {obj.value ? `× ${obj.value}` : ''}</div>
    case 'Discover':
      if (cond === 'VisitPlace') return <div>{obj.target ? getLocName(String(Array.isArray(obj.target) ? obj.target[0] : obj.target), lang) : ''}</div>
      return <div>-</div>
    case 'Experience':
      if (cond === 'ExitStatus') return <div>{lang === 'zh' ? '成功撤离' : 'Extract'}</div>
      return <div>-</div>
    case 'ExitName':
    case 'ExitStatus':
      return <div>{lang === 'zh' ? '从指定撤离点撤离' : 'Specific exit'}</div>
    case 'LeaveItemAtLocation': {
      const targets = obj.target ? (Array.isArray(obj.target) ? obj.target : [obj.target]) : []
      if (targets.length <= 1) {
        return <div>{renderTargets(obj.target)} × {obj.value || 1}</div>
      }
      return (
        <div className="space-y-1">
          <div>{lang === 'zh' ? '以下任一物品' : 'Any of'} × {obj.value || 1}</div>
          {targets.map((id, i) => (
            <TreeBranch key={i} isLast={i === targets.length - 1}>
              <Link to={`/item/${id}`} className="text-primary hover:underline">{getName(id)}</Link>
            </TreeBranch>
          ))}
        </div>
      )
    }
    case 'PlaceBeacon':
    case 'LaunchFlare':
      return <div>{renderTargets(obj.target)}</div>
    case 'WeaponAssembly': {
      const targetId = String(Array.isArray(obj.target) ? obj.target[0] : obj.target)
      const allBranches = [
        ...(obj.requirements || []).map((r, i) => ({ key: `req-${i}`, node: <>{getStatName(r.stat, lang)} {r.compare === '>=' ? '≥' : '≤'} {r.value}</> })),
        ...(obj.requiredItems || []).map((id, i) => ({ key: `ri-${i}`, node: <>{lang === 'zh' ? '必须安装' : 'Must include'}: <Link to={`/item/${id}`} className="text-primary hover:underline">{getName(id)}</Link></> })),
        ...(obj.requiredCategories || []).map((catId, i) => ({ key: `rc-${i}`, node: <>{lang === 'zh' ? '必须安装' : 'Must include'}: {obj.requiredCategoryNames?.[catId]?.[lang] || catId}</> })),
      ]
      return (
        <div className="space-y-1">
          <div><Link to={`/item/${targetId}`} className="text-primary hover:underline">{getName(targetId)}</Link></div>
          {allBranches.map((b, i) => <TreeBranch key={b.key} isLast={i === allBranches.length - 1}>{b.node}</TreeBranch>)}
        </div>
      )
    }
    case 'Skill':
      return <div>{obj.target ? getSkillName(String(obj.target), lang) : ''}{lang === 'zh' ? ' 达到 ' : ' level '}{obj.value || 0}{lang === 'zh' ? ' 级' : ''}</div>
    case 'TraderStanding':
    case 'TraderLoyalty':
      return <div>{obj.target ? getTraderName(String(obj.target)) : ''}</div>
    case 'Avoid': {
      const cond2 = obj.description?.split(': ')[1] || ''
      if (cond2 === 'Shots' || cond2 === 'Elimination') {
        const hasRole = obj.enemyRoles && obj.enemyRoles.length > 0
        const target = hasRole ? obj.enemyRoles!.map(r => getBossRoleName(r, lang)).join('/') : (lang === 'zh' ? '任意目标' : 'any target')
        const locInfo2 = obj.location ? getLocName(obj.location.split(',')[0] ?? '', lang) : null
        return (
          <div className="text-red-500">
            <span>{lang === 'zh' ? '不要射击' : 'Do not shoot'} {target}</span>
            {locInfo2 && <span className="text-muted-foreground ml-1">@ {locInfo2}</span>}
          </div>
        )
      }
      // Default: Kills fail condition
      const hasRole = obj.enemyRoles && obj.enemyRoles.length > 0
      const target = hasRole ? obj.enemyRoles!.map(r => getBossRoleName(r, lang)).join('/') : (obj.target ? renderTargets(obj.target) : (lang === 'zh' ? '任意目标' : 'any target'))
      return (
        <div className="text-red-500">
          <span>{lang === 'zh' ? '不要击杀' : 'Do not kill'} {target}</span>
        </div>
      )
    }
    default:
      return <div>{obj.value ? `× ${obj.value}` : '-'}</div>
  }
}

function ObjectiveRow({ obj, lang, itemNames, t }: {
  obj: QuestObjective; lang: 'zh' | 'en'
  itemNames: Record<string, { zh: string; en: string }>; t: any
}) {
  const typeLabel = getObjTypeLabel(obj, lang, t)
  return (
    <div className="flex items-start gap-0 text-sm">
      <div className="shrink-0 font-medium text-muted-foreground mt-0.5">{typeLabel}</div>
      {/* Horizontal dashed connector */}
      <div className="flex-1 mx-2 min-w-[20px] mt-3" style={{ borderTop: '1px dashed var(--border)' }} />
      <div className="shrink-0">
        <ObjContent obj={obj} lang={lang} itemNames={itemNames} t={t} />
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export function QuestDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'
  const { quest, loading } = useQuestDetail(id || null)
  const { itemNames } = useItemNamesMap()
  const { quests: allQuests } = useQuestList()

  // Populate trader names from quest data (dynamic, includes mod traders)
  useMemo(() => {
    const names: Record<string, string> = {}
    for (const q of allQuests) {
      if (!names[q.traderId]) names[q.traderId] = lang === 'zh' ? q.traderName.zh : q.traderName.en
    }
    _traderNames = names
  }, [allQuests, lang])

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /><Skeleton className="h-20 w-full" /></div>
  if (!quest) return <div className="text-muted-foreground">{t('noResults')}</div>

  const locName = quest.locationName || { zh: quest.location, en: quest.location }
  const rewards = quest.rewards.filter(r =>
    r.type !== 'NotificationPopup' && r.type !== 'WebPromoCode' && r.type !== 'CustomizationDirect' && r.type !== 'Pockets'
  )
  const inlineRewards = rewards.filter(isInlineReward)
  const otherRewards = rewards.filter(r => !isInlineReward(r))

  const relatedQuests = [
    ...quest.prerequisites.map(p => ({ ...p, relType: 'prereq' as const, full: allQuests.find(q => q.id === p.id) })),
    ...quest.followUps.map(f => ({ ...f, relType: 'followup' as const, full: allQuests.find(q => q.id === f.id) })),
  ]

  return (
    <div className="space-y-4">
      {/* Header: title + badges inline bottom-aligned */}
      <div className="flex items-end flex-wrap gap-2">
        <h2 className="text-xl font-bold">{lang === 'zh' ? quest.name.zh : quest.name.en}</h2>
        <Badge variant="outline" className="mb-0.5">{t(`questType_${quest.type}`, quest.type)}</Badge>
        <Badge variant="outline" className="mb-0.5">{lang === 'zh' ? locName.zh : locName.en}</Badge>
        {quest.isKey && <Badge variant="secondary" className="mb-0.5">🔑</Badge>}
      </div>
      <p className="text-sm text-muted-foreground -mt-2">{lang === 'zh' ? quest.traderName.zh : quest.traderName.en}</p>

      {/* Description */}
      <p className="text-sm leading-relaxed whitespace-pre-line">{lang === 'zh' ? quest.description.zh : quest.description.en}</p>

      {/* Objectives + Rewards: 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Objectives */}
        {quest.objectives.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-2">{t('objectives')}</h3>
            <Card className="py-0 gap-0">
              <CardContent className="p-4 flex flex-col gap-3">
                {quest.objectives.map((obj, i) => <ObjectiveRow key={i} obj={obj} lang={lang} itemNames={itemNames} t={t} />)}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Right: Rewards */}
        {rewards.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-2">{t('questRewards')}</h3>
            <Card className="py-0 gap-0">
              <CardContent className="p-4 flex flex-col gap-2">
                {inlineRewards.length > 0 && (
                  <div className="flex flex-wrap gap-1">{inlineRewards.map((r, i) => <RewardBadge key={i} reward={r} lang={lang} />)}</div>
                )}
                {otherRewards.map((r, i) => <RewardRow key={`o-${i}`} reward={r} lang={lang} />)}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Prerequisites / Follow-ups */}
      {relatedQuests.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-2">{lang === 'zh' ? '前置 / 后续' : 'Prerequisites / Follow-ups'}</h3>
          <Card className="py-0 gap-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]"></TableHead>
                  <TableHead>{t('questName')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('npc')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('questType')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('questRewards')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedQuests.map(rq => {
                  const q = rq.full
                  return (
                    <TableRow key={rq.id}>
                      <TableCell className="w-[70px]">
                        <Badge variant="outline" className={`text-xs ${rq.relType === 'prereq' ? 'border-blue-500 text-blue-500' : 'border-amber-500 text-amber-500'}`}>
                          {rq.relType === 'prereq' ? (lang === 'zh' ? '前置' : 'Pre') : (lang === 'zh' ? '后续' : 'Next')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{lang === 'zh' ? rq.name.zh : rq.name.en}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{q ? (lang === 'zh' ? q.traderName.zh : q.traderName.en) : '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {q && <Badge variant="outline" className="text-xs">{t(`questType_${q.type}`, q.type)}</Badge>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 items-center">
                          {q?.rewards?.filter(isInlineReward).map((r, i) => <RewardBadge key={i} reward={r} lang={lang} />)}
                          {(() => {
                            const hiddenRewards = q?.rewards?.filter(r =>
                              (r.type === 'Item' && r.itemId && !CURRENCY_IDS.has(r.itemId)) ||
                              r.type === 'AssortmentUnlock' || r.type === 'ProductionScheme'
                            ) || []
                            if (hiddenRewards.length === 0) return null
                            return (
                              <HoverCard openDelay={0}>
                                <HoverCardTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-pointer shrink-0">+{hiddenRewards.length}</Badge>
                                </HoverCardTrigger>
                                <HoverCardContent side="top" className="w-fit min-w-[160px] p-3">
                                  <div className="flex flex-col gap-1.5">
                                    {hiddenRewards.map((r, i) => {
                                      if (r.type === 'Item') {
                                        const name = r.itemName ? (lang === 'zh' ? r.itemName.zh : r.itemName.en) : (r.itemId || '?')
                                        const qty = ` ×${(r.quantity ?? 1).toLocaleString()}`
                                        return r.itemId ? <Link key={i} to={`/item/${r.itemId}`} className="text-sm text-primary hover:underline whitespace-nowrap">{name}{qty}</Link> : <span key={i} className="text-sm whitespace-nowrap">{name}{qty}</span>
                                      }
                                      if (r.type === 'AssortmentUnlock' || r.type === 'ProductionScheme') {
                                        const name = r.itemName ? (lang === 'zh' ? r.itemName.zh : r.itemName.en) : ''
                                        const label = lang === 'zh' ? (r.type === 'AssortmentUnlock' ? '解锁商品' : '制造配方') : r.type
                                        return <span key={i} className="text-sm whitespace-nowrap"><span className="text-muted-foreground">{label}: </span>{r.itemId ? <Link to={`/item/${r.itemId}`} className="text-primary hover:underline">{name}</Link> : name}</span>
                                      }
                                      return null
                                    })}
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/quest/${rq.id}`}>{t('details')}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
