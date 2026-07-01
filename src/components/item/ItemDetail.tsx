import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, HelpCircle, Copy, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { useItemDetail, useCategories, getTypeNameZH } from '@/hooks/useItems'
import type { HealthEffect, StimBuff, ItemEffects } from '@/hooks/useItems'

const AMMO_BULLET_CATEGORY_ID = '5b47574386f77428ca22b33b'

function formatCaliber(caliber: string): string {
  if (!caliber) return ''
  return caliber.replace(/^Caliber/i, '').replace(/(\d+)x(\d+)/, '$1x$2mm')
}

function StatRow({ label, value, unit, showZero }: { label: string; value: string | number; unit?: string; showZero?: boolean }) {
  if (value === undefined || value === null || value === '') return null
  if (!showZero && value === 0) return null
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-border/50 last:border-0 gap-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">
        {value}{unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

function StatRowWithTip({ label, tip, value, unit, showZero }: {
  label: string; tip: string; value: string | number; unit?: string; showZero?: boolean
}) {
  if (value === undefined || value === null || value === '') return null
  if (!showZero && value === 0) return null
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-border/50 last:border-0 gap-3">
      <span className="text-sm text-muted-foreground shrink-0 inline-flex items-center gap-1">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <button><HelpCircle size={13} className="text-muted-foreground/60 hover:text-primary cursor-help transition-colors" /></button>
          </TooltipTrigger>
          <TooltipContent side="top" className="w-56">
            <p>{tip}</p>
          </TooltipContent>
        </Tooltip>
      </span>
      <span className="text-sm font-medium">
        {value}{unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

function ColoredStatRow({ label, value, unit, invertColor, showZero }: {
  label: string; value: number; unit?: string; invertColor?: boolean; showZero?: boolean
}) {
  if (!value && !showZero) return null
  if (showZero && value === undefined) return null
  const sign = value > 0 ? '+' : ''
  // invertColor=true means negative is good (like recoil)
  const isGood = invertColor ? value < 0 : value > 0
  const color = isGood ? 'text-blue-400' : value < 0 ? 'text-red-400' : value > 0 ? 'text-red-400' : ''
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-border/50 last:border-0 gap-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${color}`}>
        {sign}{value}{unit && unit}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="py-0 gap-0">
      <div className="px-4 py-2 bg-secondary/50 border-b border-border">
        <h3 className="text-sm font-semibold leading-none">{title}</h3>
      </div>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )
}

// ArmorType translation
const ARMOR_TYPE_ZH: Record<string, string> = {
  Light: '轻型', Heavy: '重型', Medium: '中型',
}

// ArmorMaterial translation (from game locale)
const ARMOR_MATERIAL_ZH: Record<string, string> = {
  UHMWPE: '超高分子量聚乙烯', Aramid: '芳纶', Combined: '复合材料',
  Titanium: '钛合金', Titan: '钛合金', Steel: '钢', ArmoredSteel: '装甲钢',
  Ceramic: '陶瓷', Aluminium: '铝合金', Glass: '玻璃',
}

// DeafStrength translation
const DEAF_STRENGTH_ZH: Record<string, string> = {
  None: '无', Low: '低', Medium: '中', High: '高',
}

// ArmorZone translation (from game locale collider names)
const ARMOR_ZONE_ZH: Record<string, string> = {
  // Head zones
  ParietalHead: '头顶', BackHead: '后颈', Ears: '耳部', Eyes: '眼部',
  HeadCommon: '脸部', Jaw: '下颚',
  // Body zones
  RibcageUp: '胸腔', RibcageLow: '胃部',
  SpineTop: '上后背', SpineDown: '下后背',
  LeftSideChestDown: '左下身', RightSideChestDown: '右下身',
  LeftSideChestUp: '左腋下', RightSideChestUp: '右腋下',
  NeckFront: '喉部', NeckBack: '脖颈',
  Pelvis: '股沟', PelvisBack: '臀部',
  LeftUpperArm: '左肩', RightUpperArm: '右肩',
  LeftForearm: '左前臂', RightForearm: '右前臂',
  LeftThigh: '左大腿', RightThigh: '右大腿',
  LeftCalf: '左小腿', RightCalf: '右小腿',
  // Plate zone names
  Plate_Granit_SAPI_chest: '前插板', Plate_Granit_SAPI_back: '后插板',
  Plate_Korund_chest: '前插板',
  Plate_Granit_SSAPI_side_left_high: '左插板', Plate_Granit_SSAPI_side_left_low: '左插板',
  Plate_Granit_SSAPI_side_right_high: '右插板', Plate_Granit_SSAPI_side_right_low: '右插板',
  Plate_Korund_side_left_high: '左插板', Plate_Korund_side_left_low: '左插板',
  Plate_Korund_side_right_high: '右插板', Plate_Korund_side_right_low: '右插板',
  Plate_6B13_back: '后插板',
  // Legacy fallbacks
  HeadTop: '头顶', HeadBack: '后脑', HeadSides: '耳部',
  HeadFront: '正面', HeadEars: '耳部', HeadJaw: '下颚',
  HeadEyes: '眼部', HeadNeck: '颈部',
  Chest: '胸部', Back: '背部', Sides: '侧面',
  Stomach: '腹部', LeftArm: '左臂', RightArm: '右臂',
  LeftLeg: '左腿', RightLeg: '右腿',
  Face: '脸部',
}

function translateArmorType(v: string, lang: 'zh' | 'en'): string {
  return lang === 'zh' ? (ARMOR_TYPE_ZH[v] || v) : v
}

function translateArmorMaterial(v: string, lang: 'zh' | 'en'): string {
  return lang === 'zh' ? (ARMOR_MATERIAL_ZH[v] || v) : v
}

function translateDeafStrength(v: string, lang: 'zh' | 'en'): string {
  return lang === 'zh' ? (DEAF_STRENGTH_ZH[v] || v) : v
}

function translateArmorZones(zones: string[], lang: 'zh' | 'en'): string {
  if (!Array.isArray(zones) || zones.length === 0) return ''
  const translated = zones.map(z => lang === 'zh' ? (ARMOR_ZONE_ZH[z] || z) : z)
  // Deduplicate translated zone names
  const unique = [...new Set(translated)]
  return unique.join(' · ')
}

// Fire mode translation (from game locale)
const FIRE_MODE_ZH: Record<string, string> = {
  single: '单发', fullauto: '全自动', burst: '三连发',
  // === Not in game locale ===
  double: '双击', singleBolt: '栓动',
}

function translateFireModes(modes: string[], lang: 'zh' | 'en'): string {
  if (!Array.isArray(modes)) return ''
  return modes.map(m => lang === 'zh' ? (FIRE_MODE_ZH[m] || m) : m).join(', ')
}

// Effect name Chinese mapping (from game locale)
const EFFECT_NAME_ZH: Record<string, string> = {
  // === From game locale ===
  Pain: '疼痛', Fracture: '骨折', Contusion: '脑震荡',
  HeavyBleeding: '大出血', LightBleeding: '轻微出血',
  StressResistance: '抗压', Memory: '记忆', Health: '健康',
  Endurance: '耐力', Strength: '力量', Vitality: '活力',
  Intellect: '智力', Attention: '专注', Charisma: '魅力',
  HandsTremor: '双手颤栗', Painkiller: '止疼药生效中',
  // === Hardcoded (not in game locale) ===
  Energy: '能量', Hydration: '水分', RadExposure: '辐射',
  RemoveAllBloodLosses: '清除全部失血', DamageModifier: '伤害修正',
  Antidote: '解毒', BodyTemperature: '体温',
  DestroyedPart: '部位损毁', Intoxication: '中毒',
}

const SKILL_NAME_ZH: Record<string, string> = {
  // === From game locale ===
  StressResistance: '抗压', Memory: '记忆', Health: '健康',
  Endurance: '耐力', Strength: '力量', Vitality: '活力',
  Intellect: '智力', Attention: '专注', Charisma: '魅力',
  Metabolism: '代谢', EnergyRate: '能量恢复', Immunity: '免疫',
  Energy: '能量', Hydration: '水分', HealthRate: '生命恢复',
  StaminaRate: '耐力恢复', Perception: '感知',
}

const BUFF_TYPE_ZH: Record<string, string> = {
  // === From game locale ===
  HandsTremor: '双手颤栗', StaminaRate: '耐力恢复',
  WeightLimit: '重量限制', HealthRate: '生命恢复',
  Metabolism: '代谢', QuantumTunnelling: '管视效应',
  EnergyRate: '能量恢复', Immunity: '免疫', Energy: '能量',
  // === Hardcoded (not in game locale) ===
  SkillRate: '技能倍率', Painkiller: '止疼药生效中',
  HydrationRate: '水分恢复', Contusion: '脑震荡',
  MaxStamina: '最大耐力', RemoveAllBloodLosses: '清除全部失血',
  DamageModifier: '伤害修正', Antidote: '解毒',
  BodyTemperature: '体温', Pain: '疼痛',
}

function getEffectName(type: string, lang: 'zh' | 'en'): string {
  if (lang === 'zh') return EFFECT_NAME_ZH[type] || type
  return type
}

function getSkillName(name: string, lang: 'zh' | 'en'): string {
  if (lang === 'zh') return SKILL_NAME_ZH[name] || name
  return name
}

function getBuffTypeName(type: string, lang: 'zh' | 'en'): string {
  if (lang === 'zh') return BUFF_TYPE_ZH[type] || type
  return type
}

function EffectRow({ effect, lang, showValue, showCost }: {
  effect: HealthEffect
  lang: 'zh' | 'en'
  showValue?: boolean
  showCost?: boolean
}) {
  const name = getEffectName(effect.type, lang)
  const parts: string[] = []

  // Value with color
  let valueColor = ''
  if (showValue && typeof effect.value === 'number') {
    const sign = effect.value > 0 ? '+' : ''
    valueColor = effect.value > 0 ? 'text-blue-400' : effect.value < 0 ? 'text-red-400' : ''
    parts.push(`${sign}${effect.value}`)
  }
  if (showCost && typeof effect.cost === 'number' && effect.cost > 0) {
    parts.push(lang === 'zh' ? `消耗 ${effect.cost} HP` : `Cost: ${effect.cost} HP`)
  }
  if (typeof effect.delay === 'number' && effect.delay > 0) {
    parts.push(`${effect.delay}${lang === 'zh' ? '秒延迟' : 's delay'}`)
  }
  if (typeof effect.duration === 'number' && effect.duration > 0) {
    parts.push(`${effect.duration}${lang === 'zh' ? '秒持续' : 's duration'}`)
  }
  const detail = parts.join(lang === 'zh' ? '；' : '; ')
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-foreground">{name}</span>
      <span className={`text-sm font-medium text-right ${valueColor}`}>{detail || '✓'}</span>
    </div>
  )
}

function EffectsSection({ effects, lang, mode, t }: {
  effects: ItemEffects
  lang: 'zh' | 'en'
  mode: 'foodDrink' | 'medical'
  t: (key: string) => string
}) {
  const hasHealth = effects.healthEffects.length > 0
  const hasDamage = effects.damageEffects.length > 0
  const hasStim = effects.stimBuffs.length > 0

  if (!hasHealth && !hasDamage && !hasStim) return null

  return (
    <>
      {hasHealth && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-primary/80 mb-2 pb-1 border-b border-primary/20">
            {mode === 'medical' ? t('treatableConditions') : t('statChanges')}
          </h4>
          {effects.healthEffects.map((eff, i) => (
            <EffectRow
              key={i}
              effect={eff}
              lang={lang}
              showValue={mode === 'foodDrink'}
              showCost={mode === 'medical'}
            />
          ))}
        </div>
      )}

      {hasDamage && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-primary/80 mb-2 pb-1 border-b border-primary/20">
            {t('statusRemoval')}
          </h4>
          {effects.damageEffects.map((eff, i) => (
            <EffectRow key={i} effect={eff} lang={lang} />
          ))}
        </div>
      )}

      {/* Stimulator buffs - grouped by delay+duration */}
      {hasStim && (() => {
        // Group buffs by delay+duration
        const buffGroups = new Map<string, StimBuff[]>()
        for (const buff of effects.stimBuffs) {
          const key = `${buff.delay}|${buff.duration}`
          if (!buffGroups.has(key)) buffGroups.set(key, [])
          buffGroups.get(key)!.push(buff)
        }

        return (
          <div className="mt-3">
            <h4 className="text-sm font-semibold text-primary/80 mb-2 pb-1 border-b border-primary/20">
              {t('stimBuffs')}
            </h4>
            {Array.from(buffGroups.entries()).map(([key, buffs], i) => {
              const [delay, duration] = key.split('|').map(Number)
              const prefix: string[] = []
              if (delay && delay > 0) prefix.push(`${delay}${lang === 'zh' ? '秒延迟' : 's delay'}`)
              if (duration && duration > 0) prefix.push(`${duration}${lang === 'zh' ? '秒持续' : 's duration'}`)
              const header = prefix.length > 0 ? prefix.join(lang === 'zh' ? '；' : '; ') + ': ' : ''

              return (
                <div key={i} className="py-2 border-b border-border/30 last:border-0">
                  <p className="text-xs text-muted-foreground mb-1">{header}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {buffs.map((buff, j) => {
                      const skill = getSkillName(buff.skillName, lang) || getBuffTypeName(buff.buffType, lang)
                      const sign = buff.value > 0 ? '+' : ''
                      const valueColor = buff.value > 0 ? 'text-blue-400' : buff.value < 0 ? 'text-red-400' : 'text-foreground'
                      return (
                        <span key={j} className="text-sm">
                          <span className="text-foreground">{skill}</span>
                          {buff.value !== 0 && (
                            <span className={`ml-0.5 font-medium ${valueColor}`}>({sign}{buff.value})</span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </>
  )
}

export function ItemDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const { item, loading } = useItemDetail(id || null)
  const { categories } = useCategories()
  const lang = (i18n.language === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  const category = item?.handbook.categoryId ? categories.find(c => c.id === item.handbook.categoryId) : null

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-32 w-32 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <Empty className="h-64">
        <p className="text-muted-foreground">{t('noResults')}</p>
        <Button asChild variant="outline"><Link to="/"><ArrowLeft size={14} className="mr-1" /> {t('back')}</Link></Button>
      </Empty>
    )
  }

  const { common, properties } = item
  const isWeapon = item.category === 'weapon'
  const isAmmoBox = item.category === 'ammobox'
  const typeNameZH = lang === 'zh' ? getTypeNameZH(item.typeName) : item.typeName
  const copyName = () => {
    navigator.clipboard.writeText(common.name[lang]).then(() => {
      toast.success(t('nameCopied'))
    })
  }

  // Check if mod properties are all zero
  const modAllZero = properties.mod &&
    (properties.mod.ergonomics as number || 0) === 0 &&
    (properties.mod.recoilForceUp as number || 0) === 0 &&
    (properties.mod.recoilForceBack as number || 0) === 0 &&
    (properties.mod.accuracy as number || 0) === 0

  // Raw data for special items
  const raw = properties._raw || {}

  // Headwear resolved slots (pre-resolved by generator with names)
  const resolvedSlots = properties.resolvedSlots || []

  // Slot name translation helper (normalize case: lowercase first char for i18n key)
  const getSlotName = (slotName: string): string => {
    // Try exact match first, then with lowercase first char
    const key = `slot_${slotName}` as const
    const lowerKey = `slot_${slotName.charAt(0).toLowerCase()}${slotName.slice(1)}` as const
    const translated = t(key)
    if (translated !== key) return translated
    const translatedLower = t(lowerKey)
    if (translatedLower !== lowerKey) return translatedLower
    return slotName
  }

  // Conflicting items (pre-resolved by generator with names)
  const resolvedConflicts = properties.resolvedConflicts || []

  // Backpack grids
  const backpackGrids = item.category === 'backpack' && Array.isArray(raw.Grids)
    ? raw.Grids as Array<{ cellsH: number; cellsV: number }>
    : []

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">{t('allItems')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {category && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/category/${category.id}`}>{category.name[lang]}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{common.name[lang]}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
        <div className="w-20 h-20 sm:w-32 sm:h-32 shrink-0 bg-card border border-border rounded-lg flex items-center justify-center p-3 sm:p-4">
          {item.image ? (
            <img src={item.image} alt={common.name[lang]} className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xl sm:text-3xl font-bold text-muted-foreground/30">
              {common.shortName[lang].slice(0, 2)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold mb-1 inline-flex items-center gap-2">
            <span>{common.name[lang]}</span>
            {item.isMod && (
              <Badge variant="secondary">MOD</Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={copyName}
              className="h-6 w-6"
              title={lang === 'zh' ? '复制名称' : 'Copy name'}
            >
              <Copy size={15} />
            </Button>
          </h1>
          <p className="text-sm text-muted-foreground mb-3">{common.shortName[lang]} · {typeNameZH}</p>
          {isWeapon && (
            <Button asChild variant="default" className="mb-3">
              <Link to={`/forge/${item.id}`}>
                <Wrench size={14} className="mr-1" />
                {lang === 'zh' ? '改枪模拟' : 'Modding Lab'}
              </Link>
            </Button>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed">{common.description[lang]}</p>
        </div>
      </div>

      {/* Properties grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Common */}
        <Section title={t('common')}>
          <StatRow label={t('weight')} value={Math.round(common.weight * 1000) / 1000} unit={t('kg')} />
          <StatRow label={t('size')} value={`${common.width}×${common.height}`} />
          <StatRow label={t('rarity')} value={t(`rare_${common.rarity}` as 'rare_Common')} />
          <StatRow label={t('price')} value={item.handbook.price > 0 ? `₽${item.handbook.price.toLocaleString()}` : '-'} />
        </Section>

        {/* Weapon */}
        {properties.weapon && (
          <Section title={t('performance')}>
            <StatRow label={t('caliber')} value={formatCaliber(properties.weapon.caliber as string)} />
            <StatRow label={t('fireRate')} value={properties.weapon.fireRate as number} unit={t('rpm')} />
            <StatRow label={t('effectiveRange')} value={properties.weapon.effectiveRange as number} unit={t('meters')} />
            <StatRow label={t('sightingRange')} value={properties.weapon.sightingRange as number} unit={t('meters')} />
            <StatRow label={t('ergonomics')} value={properties.weapon.ergonomics as number} />
            <StatRow label={t('recoilUp')} value={properties.weapon.recoilForceUp as number} />
            <StatRow label={t('recoilBack')} value={properties.weapon.recoilForceBack as number} />
            <StatRow label={t('singleFireRate')} value={properties.weapon.singleFireRate as number} unit={t('rpm')} />
            <StatRow label={t('shotgunDispersion')} value={properties.weapon.shotgunDispersion as number} unit="°" />
            <StatRow label={t('hearDist')} value={properties.weapon.bHearDist as number} unit={t('meters')} />
            <StatRow label={t('durability')} value={(properties.weapon.maxDurability || properties.weapon.durability) as number} />
            <StatRow label={t('fireModes')} value={translateFireModes(Array.isArray(properties.weapon.fireModes) ? properties.weapon.fireModes as string[] : [], lang)} />
            {/* Weapon ammo info */}
            {(!!(properties.weapon.caliber || properties.weapon.defaultAmmo)) && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-primary/80 mb-2 pb-1 border-b border-primary/20">
                  {t('weaponAmmo')}
                </h4>
                <StatRow label={t('ammoCaliber')} value={formatCaliber(properties.weapon.caliber as string)} />
                <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{t('ammoType')}</span>
                  <Link
                    to={`/category/${AMMO_BULLET_CATEGORY_ID}?caliber=${encodeURIComponent((properties.weapon.caliber as string || '').replace(/^Caliber/i, ''))}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('viewAmmo')}
                  </Link>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Hidden Stats */}
        {properties.weapon && (
          <Section title={t('hiddenStats')}>
            <StatRowWithTip label={t('recoilAngle')} tip={t('tip_recoilAngle')} value={properties.weapon.recoilAngle as number} unit="°" showZero />
            <StatRowWithTip label={t('recoilDispersion')} tip={t('tip_recoilDispersion')} value={properties.weapon.recoilDispersion as number} showZero />
            <StatRowWithTip label={t('recoilCamera')} tip={t('tip_recoilCamera')} value={properties.weapon.recoilCamera as number} showZero />
            <StatRowWithTip label={t('cameraSnap')} tip={t('tip_cameraSnap')} value={properties.weapon.cameraSnap as number} showZero />
            <StatRowWithTip label={t('recoilStableAngleIncreaseStep')} tip={t('tip_recoilStableAngleIncreaseStep')} value={properties.weapon.recoilStableAngleIncreaseStep as number} showZero />
            <StatRowWithTip label={t('recoilStableIndexShot')} tip={t('tip_recoilStableIndexShot')} value={properties.weapon.recoilStableIndexShot as number} showZero />
            <StatRowWithTip label={t('deviationMax')} tip={t('tip_deviationMax')} value={properties.weapon.deviationMax as number} showZero />
            <StatRowWithTip label={t('deviationCurve')} tip={t('tip_deviationCurve')} value={properties.weapon.deviationCurve as number} showZero />
          </Section>
        )}

        {/* Reliability */}
        {properties.weapon && !!(properties.weapon.malfunctionChance || properties.weapon.operatingResource) && (
          <Section title={t('reliability')}>
            <StatRow label={t('malfunctionChance')} value={(properties.weapon.malfunctionChance as number * 100).toFixed(1)} unit="%" showZero />
            <StatRow label={t('durabilityBurnRatio')} value={properties.weapon.durabilityBurnRatio as number} showZero />
            <StatRow label={t('operatingResource')} value={properties.weapon.operatingResource as number} showZero />
          </Section>
        )}

        {/* Overheat */}
        {properties.weapon && !!(properties.weapon.heatFactorByShot || properties.weapon.coolFactorGun) && (
          <Section title={t('overheat')}>
            <StatRow label={t('heatFactorByShot')} value={properties.weapon.heatFactorByShot as number} showZero />
            <StatRow label={t('heatFactorGun')} value={properties.weapon.heatFactorGun as number} showZero />
            <StatRow label={t('coolFactorGun')} value={properties.weapon.coolFactorGun as number} showZero />
            <StatRow label={t('coolFactorGunMods')} value={properties.weapon.coolFactorGunMods as number} showZero />
          </Section>
        )}

        {/* Hip Fire */}
        {properties.weapon && !!(properties.weapon.hipAccuracyRestorationSpeed || properties.weapon.hipInnaccuracyGain) && (
          <Section title={t('hipFire')}>
            <StatRow label={t('hipAccuracyRestorationSpeed')} value={properties.weapon.hipAccuracyRestorationSpeed as number} showZero />
            <StatRow label={t('hipAccuracyRestorationDelay')} value={properties.weapon.hipAccuracyRestorationDelay as number} unit={t('seconds')} showZero />
            <StatRow label={t('hipInnaccuracyGain')} value={properties.weapon.hipInnaccuracyGain as number} showZero />
          </Section>
        )}

        {/* Mounting */}
        {properties.weapon && !!(properties.weapon.mountVerticalRecoilMultiplier || properties.weapon.mountHorizontalRecoilMultiplier) && (
          <Section title={t('mounting')}>
            <StatRow label={t('mountVerticalRecoilMultiplier')} value={(properties.weapon.mountVerticalRecoilMultiplier as number * 100).toFixed(0)} unit="%" showZero />
            <StatRow label={t('mountHorizontalRecoilMultiplier')} value={(properties.weapon.mountHorizontalRecoilMultiplier as number * 100).toFixed(0)} unit="%" showZero />
          </Section>
        )}

        {/* Ammo Box Content */}
        {isAmmoBox && properties.ammoBox && (
          <Section title={t('ammoBoxContent')}>
            <StatRow label={t('ammoCaliber')} value={formatCaliber(properties.ammoBox.caliber)} />
            <StatRow label={t('ammoCount')} value={properties.ammoBox.count} unit={t('ammoBoxRounds')} />
            <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm text-muted-foreground">{t('ammoType')}</span>
              <Link
                to={`/item/${properties.ammoBox.ammoId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t('viewAmmo')}
              </Link>
            </div>
          </Section>
        )}

        {/* Ammo - show for ammo items (not ammobox) */}
        {properties.ammo && !isWeapon && !isAmmoBox && (
          <Section title={t('ammo')}>
            <StatRow label={t('ammoCaliber')} value={formatCaliber((properties.ammo?.caliber as string) || item.typeName)} />
            <StatRow label={t('damage')} value={properties.ammo.damage as number} />
            <StatRow label={t('penetration')} value={properties.ammo.penetrationPower as number} />
            <StatRow label={t('armorDamage')} value={properties.ammo.armorDamage as number} />
            <StatRow label={t('accuracy')} value={properties.ammo.accuracy as number} />
            <StatRow label={t('recoil')} value={properties.ammo.recoil as number} />
            <StatRow label={t('fragmentation')} value={properties.ammo.fragmentationChance as number} unit="%" />
            <StatRow label={t('ricochetChance')} value={properties.ammo.ricochetChance as number} unit="%" />
            <StatRow label={t('lightBleedChance')} value={properties.ammo.lightBleedChance as number} unit="%" showZero />
            <StatRow label={t('heavyBleedChance')} value={properties.ammo.heavyBleedChance as number} unit="%" showZero />
            <StatRow label={t('initialSpeed')} value={properties.ammo.initialSpeed as number} unit="m/s" />
            <StatRow label={t('ballisticCoeficient')} value={properties.ammo.ballisticCoeficient as number} />
            <StatRow label={t('projectileCount')} value={properties.ammo.projectileCount as number} showZero />
          </Section>
        )}

        {/* Armor - not for headwear/facecover */}
        {properties.armor && item.category !== 'headwear' && item.category !== 'facecover' && item.category !== 'weapon' && (
          <Section title={t('performance')}>
            {(properties.armor.armorType as string) && (properties.armor.armorType as string) !== 'None' && (
              <StatRow label={t('armorType')} value={t(`armorType_${properties.armor.armorType}` as 'armorType_Light')} />
            )}
            <StatRow label={t('material')} value={translateArmorMaterial(properties.armor.material as string, lang)} />
            <StatRow label={t('linerClass')} value={properties.armor.baseArmorClass as number} />
            <StatRow label={t('zones')} value={translateArmorZones(properties.armor.zones as string[], lang)} />
            <StatRow label={t('durability')} value={(properties.armor.maxDurability || properties.armor.durability) as number} />
            {(properties.armor.defaultPlateClass as number) > 0 && (
              <StatRow label={t('defaultPlateClass')} value={properties.armor.defaultPlateClass as number} />
            )}
            {Array.isArray(properties.armor.plateZones) && (properties.armor.plateZones as string[]).length > 0 && (
              <StatRow label={t('defaultPlateZones')} value={translateArmorZones(properties.armor.plateZones as string[], lang)} />
            )}
            {Array.isArray(properties.armor.defaultPlates) && (properties.armor.defaultPlates as Array<{id: string; name: {zh: string; en: string}; count: number}>).length > 0 && (
              <div className="flex justify-between items-start py-1.5 border-b border-border/50 gap-3">
                <span className="text-sm text-muted-foreground shrink-0">{t('defaultPlates')}</span>
                <div className="space-y-0.5 text-right">
                  {(properties.armor.defaultPlates as Array<{id: string; name: {zh: string; en: string}; count: number}>).map((p, i) => (
                    <Link key={i} to={`/item/${p.id}`} className="block text-sm font-medium text-primary hover:underline">
                      {p.name.zh} × {p.count}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <ColoredStatRow label={t('movementSpeed')} value={properties.armor.speedPenalty as number} unit="%" />
            <ColoredStatRow label={t('ergonomics')} value={properties.armor.ergonomicsPenalty as number} unit="%" />
            <ColoredStatRow label={t('turnSpeed')} value={properties.armor.mousePenalty as number} unit="%" showZero />
            <StatRow label={t('bluntThroughput')} value={((properties.armor.bluntThroughput as number) * 100).toFixed(1)} unit="%" />
          </Section>
        )}

        {/* Medical */}
        {properties.medical && (
          <Section title={t('medical')}>
            <StatRow label={t('useTime')} value={properties.medical.medUseTime} unit={t('seconds')} />
            <StatRow label={t('maxHp')} value={properties.medical.maxHpResource} />
            {properties.medical.effects && (
              <EffectsSection effects={properties.medical.effects} lang={lang} mode="medical" t={t} />
            )}
          </Section>
        )}

        {/* Mod - only show for non-weapon items */}
        {properties.mod && !isWeapon && (
          <Section title={t('mod')}>
            {modAllZero && !properties.mod.zooms && !properties.mod.velocity && !properties.mod.malfunctionChance ? (
              <p className="text-sm text-muted-foreground text-center py-2">{t('noEffect')}</p>
            ) : (
              <>
                <ColoredStatRow label={t('ergonomics')} value={properties.mod.ergonomics as number} />
                <ColoredStatRow label={t('recoilUp')} value={properties.mod.recoilForceUp as number} invertColor />
                <ColoredStatRow label={t('recoilBack')} value={properties.mod.recoilForceBack as number} invertColor />
                <ColoredStatRow label={t('accuracy')} value={properties.mod.accuracy as number} />
                <ColoredStatRow label={t('velocity')} value={properties.mod.velocity as number} unit="%" showZero />
                {/* Common mod fields */}
                <StatRow label={t('loudness')} value={properties.mod.loudness as number} unit="dB" showZero />
                <StatRow label={t('effectiveDistance')} value={properties.mod.effectiveDistance as number} unit={t('meters')} showZero />
                {properties.mod.muzzleModType && (
                  <StatRow label={t('muzzleModType')} value={t(`muzzleModType_${properties.mod.muzzleModType}` as 'muzzleModType_silencer')} />
                )}
                <StatRow label={t('magMalfunctionChance')} value={properties.mod.malfunctionChance as number} unit="%" showZero />
                {/* Scope */}
                {item.category === 'mod_scope' && (
                  <>
                    <StatRow label={t('zooms')} value={properties.mod.zooms as string} />
                    <StatRow label={t('sightingRange')} value={properties.mod.sightingRange as number} unit={t('meters')} showZero />
                    <StatRow label={t('sightModType')} value={properties.mod.sightModType ? t(`sightModType_${properties.mod.sightModType}` as 'sightModType_optic') : ''} />
                    {Array.isArray(properties.mod.calibrationDistances) && (properties.mod.calibrationDistances as number[]).length > 0 && (
                      <StatRow label={t('calibrationDistances')} value={(properties.mod.calibrationDistances as number[]).join(', ') + ' m'} />
                    )}
                  </>
                )}
                {/* Magazine */}
                {item.category === 'mod_magazine' && (
                  <>
                    <StatRow label={t('loadUnloadModifier')} value={properties.mod.loadUnloadModifier as number} unit="%" showZero />
                    <StatRow label={t('checkTimeModifier')} value={properties.mod.checkTimeModifier as number} unit="%" showZero />
                  </>
                )}
                {/* Stock */}
                {item.category === 'mod_stock' && (
                  <>
                    <StatRow label={t('foldable')} value={properties.mod.foldable ? t('yes') : t('no')} />
                    <StatRow label={t('retractable')} value={properties.mod.retractable ? t('yes') : t('no')} />
                  </>
                )}
              </>
            )}
          </Section>
        )}

        {/* Food/Drink */}
        {properties.foodDrink && (
          <Section title={t('foodDrink')}>
            <StatRow label={t('useTime')} value={properties.foodDrink.useTime} unit={t('seconds')} />
            {properties.foodDrink.effects && (
              <EffectsSection effects={properties.foodDrink.effects} lang={lang} mode="foodDrink" t={t} />
            )}
          </Section>
        )}

        {/* Knife Performance */}
        {item.typeName === 'Knife' && (
          <Section title={lang === 'zh' ? '性能' : 'Performance'}>
            <StatRow label={lang === 'zh' ? '攻击半径' : 'Hit Radius'} value={raw.knifeHitRadius as number} unit="m" />
            <StatRow label={lang === 'zh' ? '挥砍伤害' : 'Slash Damage'} value={raw.knifeHitSlashDam as number} />
            <StatRow label={lang === 'zh' ? '刺击伤害' : 'Stab Damage'} value={raw.knifeHitStabDam as number} />
            <StatRow label={lang === 'zh' ? '挥砍穿透' : 'Slash Penetration'} value={raw.SlashPenetration as number} />
            <StatRow label={lang === 'zh' ? '刺击穿透' : 'Stab Penetration'} value={raw.StabPenetration as number} />
            <StatRow label={t('slashConsumption')} value={raw.PrimaryConsumption as number} />
            <StatRow label={t('stabConsumption')} value={raw.SecondryConsumption as number} />
            <StatRow label={t('deflectionConsumption')} value={raw.DeflectionConsumption as number} />
            <StatRow label={t('slashDistance')} value={raw.PrimaryDistance as number} unit="m" />
            <StatRow label={t('stabDistance')} value={raw.SecondryDistance as number} unit="m" />
            <StatRow label={t('slashRate')} value={((raw.knifeHitSlashRate as number || 0) * 100)} unit="%" />
            <StatRow label={t('stabRate')} value={((raw.knifeHitStabRate as number || 0) * 100)} unit="%" />
          </Section>
        )}

        {/* Grenade Performance */}
        {item.category === 'grenade' && (
          <Section title={t('performance')}>
            <StatRow label={t('throwType')} value={t(`throwType_${raw.ThrowType}` as 'throwType_frag_grenade')} />
            <StatRow label={t('strength')} value={raw.Strength as number} showZero />
            <StatRow label={t('contusionDistance')} value={raw.ContusionDistance as number} unit={t('meters')} showZero />
            <StatRow label={t('explDelay')} value={((raw.ExplDelay as number) || (raw.explDelay as number) || 0)} unit={t('seconds')} />
            <StatRow label={t('emitTime')} value={raw.EmitTime as number} unit={t('seconds')} />
          </Section>
        )}

        {/* Headwear/Facecover Performance */}
        {(item.category === 'headwear' || item.category === 'facecover') && !!(properties.headwear || raw.ArmorType || raw.ArmorMaterial) && (
          <Section title={t('performance')}>
            {((properties.headwear?.armorType ?? raw.ArmorType) as string) && ((properties.headwear?.armorType ?? raw.ArmorType) as string) !== 'None' && (
              <StatRow label={t('armorType')} value={translateArmorType((properties.headwear?.armorType ?? raw.ArmorType) as string, lang)} />
            )}
            <StatRow label={t('material')} value={translateArmorMaterial((properties.headwear?.armorMaterial ?? raw.ArmorMaterial) as string, lang)} />
            <StatRow label={t('linerClass')} value={(properties.headwear?.armorClass ?? raw.armorClass) as number} showZero />
            <StatRow label={t('durability')} value={(properties.headwear?.maxDurability ?? raw.MaxDurability) as number} showZero />
            <StatRow label={t('zones')} value={translateArmorZones((properties.headwear?.zones ?? []) as string[], lang)} />
            <StatRow label={t('ricochet')} value={(properties.headwear?.ricochetChance ?? ((raw.RicochetParams as Record<string, unknown>)?.z)) as number} unit="%" showZero />
            <StatRow label={t('blindnessProtection')} value={(properties.headwear?.blindnessProtection ?? raw.BlindnessProtection) as number} unit="%" showZero />
            <ColoredStatRow label={t('movementSpeed')} value={(properties.headwear?.speedPenalty ?? raw.speedPenaltyPercent) as number} unit="%" showZero />
            <ColoredStatRow label={t('turnSpeed')} value={(properties.headwear?.turnSpeed ?? raw.mousePenalty) as number} unit="%" showZero />
            <ColoredStatRow label={t('ergonomics')} value={(properties.headwear?.ergonomicsPenalty ?? raw.weaponErgonomicPenalty) as number} unit="%" showZero />
            <StatRow label={t('deafness')} value={translateDeafStrength((properties.headwear?.deafStrength ?? raw.DeafStrength) as string, lang)} />
            {raw.BluntThroughput != null && (
              <StatRow label={t('bluntThroughput')} value={((raw.BluntThroughput as number) * 100).toFixed(1)} unit="%" />
            )}
          </Section>
        )}

        {/* Headphones Performance */}
        {item.typeName === 'Headphones' && (
          <Section title={lang === 'zh' ? '性能' : 'Performance'}>
            <StatRow label={lang === 'zh' ? '失真' : 'Distortion'} value={raw.Distortion as number} />
            <StatRow label={lang === 'zh' ? '环境音量' : 'Ambient Volume'} value={raw.AmbientVolume as number} unit="dB" />
            <StatRow label={lang === 'zh' ? '压缩器增益' : 'Compressor Gain'} value={raw.CompressorGain as number} unit="dB" />
            <StatRow label={lang === 'zh' ? '压缩器阈值' : 'Compressor Threshold'} value={raw.CompressorThreshold as number} unit="dB" />
            <StatRow label={t('compressorAttack')} value={raw.CompressorAttack as number} unit="ms" />
            <StatRow label={t('compressorRelease')} value={raw.CompressorRelease as number} unit="ms" />
            <StatRow label={t('highpassFreq')} value={raw.HighpassFreq as number} unit="Hz" />
            <StatRow label={t('lowpassFreq')} value={raw.LowpassFreq as number} unit="Hz" />
            {/* EQ Bands */}
            {[1, 2, 3].map(band => {
              const freq = raw[`EQBand${band}Frequency`] as number | undefined
              const gain = raw[`EQBand${band}Gain`] as number | undefined
              const q = raw[`EQBand${band}Q`] as number | undefined
              if (freq === undefined) return null
              return (
                <div key={band} className="py-1.5 border-b border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">{t('eqBand')} {band}</p>
                  <div className="flex gap-3 text-sm">
                    <span>{t('frequency')}: <span className="font-medium">{freq}Hz</span></span>
                    <span>{t('gain')}: <span className="font-medium">{gain}dB</span></span>
                    <span>{t('qFactor')}: <span className="font-medium">{q}</span></span>
                  </div>
                </div>
              )
            })}
          </Section>
        )}

        {/* Backpack Performance */}
        {item.category === 'backpack' && (
          <Section title={lang === 'zh' ? '性能' : 'Performance'}>
            <ColoredStatRow label={t('movementSpeed')} value={raw.speedPenaltyPercent as number} unit="%" showZero />
            <ColoredStatRow label={t('turnSpeed')} value={raw.mousePenalty as number} unit="%" showZero />
            <ColoredStatRow label={t('ergonomics')} value={raw.weaponErgonomicPenalty as number} unit="%" showZero />
          </Section>
        )}
      </div>

      {/* Full-width sections below the grid */}
      <div className="mt-4 space-y-4">
        {/* Headwear/Facecover Compatible Mods */}
        {(item.category === 'headwear' || item.category === 'facecover') && resolvedSlots.length > 0 && (
          <Section title={lang === 'zh' ? '兼容配件' : 'Compatible Mods'}>
            {resolvedSlots.map((slot, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">{getSlotName(slot.name)}</p>
                <div className="flex flex-wrap gap-1">
                  {slot.filters.map(f => {
                    const displayName = lang === 'zh' ? f.name.zh : f.name.en
                    return f.isWikiItem ? (
                      <Link
                        key={f.id}
                        to={`/item/${f.id}`}
                        className="text-xs text-primary hover:underline px-1.5 py-0.5 bg-secondary rounded"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <span
                        key={f.id}
                        className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary/50 rounded"
                      >
                        {displayName}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Conflicting Items */}
        {resolvedConflicts.length > 0 && (
          <Section title={lang === 'zh' ? '冲突道具' : 'Conflicting Items'}>
            <div className="flex flex-wrap gap-1">
              {resolvedConflicts.map(f => {
                const displayName = lang === 'zh' ? f.name.zh : f.name.en
                return f.isWikiItem ? (
                  <Link
                    key={f.id}
                    to={`/item/${f.id}`}
                    className="text-xs text-destructive hover:underline px-1.5 py-0.5 bg-secondary rounded"
                  >
                    {displayName}
                  </Link>
                ) : (
                  <span
                    key={f.id}
                    className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary/50 rounded"
                  >
                    {displayName}
                  </span>
                )
              })}
            </div>
          </Section>
        )}

        {/* Backpack Space Layout */}
        {item.category === 'backpack' && backpackGrids.length > 0 && (
          <Section title={lang === 'zh' ? '空间布局' : 'Space Layout'}>
            <div className="flex flex-wrap gap-4 justify-center">
              {backpackGrids.map((grid, i) => (
                <div key={i}>
                  <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${grid.cellsH}, 1fr)` }}>
                    {Array.from({ length: grid.cellsH * grid.cellsV }).map((_, j) => (
                      <div key={j} className="w-6 h-6 bg-secondary border border-border/50 rounded-sm" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">{grid.cellsH}×{grid.cellsV}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
