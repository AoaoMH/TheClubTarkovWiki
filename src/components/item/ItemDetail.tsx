import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, HelpCircle, Copy, Check } from 'lucide-react'
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
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
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
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
        {label}
        <span className="relative group inline-block">
          <HelpCircle size={13} className="text-muted-foreground/60 hover:text-primary cursor-help transition-colors" />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-2.5 py-1.5 rounded-md bg-popover border border-border shadow-lg text-xs text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {tip}
          </span>
        </span>
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
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${color}`}>
        {sign}{value}{unit && unit}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-2.5 bg-secondary/50 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// ArmorType translation
const ARMOR_TYPE_ZH: Record<string, string> = {
  Light: '轻型', Heavy: '重型', Medium: '中型',
}

// ArmorMaterial translation (from game locale)
const ARMOR_MATERIAL_ZH: Record<string, string> = {
  UHMWPE: 'UHMWPE', Aramid: '芳纶', Combined: '复合材料',
  Titanium: '钛合金', Steel: '钢', Ceramic: '陶瓷',
  Aluminium: '铝合金', Glass: '玻璃',
}

// DeafStrength translation
const DEAF_STRENGTH_ZH: Record<string, string> = {
  None: '无', Low: '低', Medium: '中', High: '高',
}

// ArmorZone translation (from game locale)
const ARMOR_ZONE_ZH: Record<string, string> = {
  HeadTop: '头顶', HeadBack: '后脑', HeadSides: '侧面',
  HeadFront: '正面', HeadEars: '耳朵', HeadJaw: '下巴',
  HeadEyes: '眼部', HeadNeck: '颈部',
  Chest: '胸部', Back: '背部', Sides: '侧面',
  Stomach: '腹部', LeftArm: '左臂', RightArm: '右臂',
  LeftLeg: '左腿', RightLeg: '右腿',
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
  return zones.map(z => lang === 'zh' ? (ARMOR_ZONE_ZH[z] || z) : z).join(', ')
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
  const [copied, setCopied] = useState(false)

  const category = item?.handbook.categoryId ? categories.find(c => c.id === item.handbook.categoryId) : null

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t('loading')}</div>
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t('noResults')}</p>
        <Link to="/" className="text-primary text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> {t('back')}
        </Link>
      </div>
    )
  }

  const { common, properties } = item
  const isWeapon = item.category === 'weapon'
  const isAmmoBox = item.category === 'ammobox'
  const typeNameZH = lang === 'zh' ? getTypeNameZH(item.typeName) : item.typeName
  const copyName = () => {
    navigator.clipboard.writeText(common.name[lang]).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
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
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">{t('allItems')}</Link>
        {category && (
          <>
            <span>/</span>
            <Link to={`/category/${category.id}`} className="hover:text-primary">
              {category.name[lang]}
            </Link>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex gap-6 mb-6">
        <div className="w-32 h-32 shrink-0 bg-card border border-border rounded-lg flex items-center justify-center p-4">
          {item.image ? (
            <img src={item.image} alt={common.name[lang]} className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-3xl font-bold text-muted-foreground/30">
              {common.shortName[lang].slice(0, 2)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-1 inline-flex items-center gap-2">
            <span>{common.name[lang]}</span>
            {item.isMod && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                MOD
              </span>
            )}
            <button
              onClick={copyName}
              className="text-muted-foreground/50 hover:text-primary transition-colors"
              title={lang === 'zh' ? '复制名称' : 'Copy name'}
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={15} />}
            </button>
          </h1>
          <p className="text-sm text-muted-foreground mb-3">{common.shortName[lang]} · {typeNameZH}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{common.description[lang]}</p>
        </div>
      </div>

      {/* Properties grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Common */}
        <Section title={t('common')}>
          <StatRow label={t('weight')} value={common.weight} unit={t('kg')} />
          <StatRow label={t('size')} value={`${common.width}×${common.height}`} />
          <StatRow label={t('rarity')} value={t(`rare_${common.rarity}` as 'rare_Common')} />
          <StatRow label={t('price')} value={item.handbook.price > 0 ? `₽${item.handbook.price.toLocaleString()}` : '-'} />
        </Section>

        {/* Weapon */}
        {properties.weapon && (
          <Section title={t('weapon')}>
            <StatRow label={t('caliber')} value={formatCaliber(properties.weapon.caliber as string)} />
            <StatRow label={t('fireRate')} value={properties.weapon.fireRate as number} unit={t('rpm')} />
            <StatRow label={t('effectiveRange')} value={properties.weapon.effectiveRange as number} unit={t('meters')} />
            <StatRow label={t('sightingRange')} value={properties.weapon.sightingRange as number} unit={t('meters')} />
            <StatRow label={t('ergonomics')} value={properties.weapon.ergonomics as number} />
            <StatRow label={t('recoilUp')} value={properties.weapon.recoilForceUp as number} />
            <StatRow label={t('recoilBack')} value={properties.weapon.recoilForceBack as number} />
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
            <StatRow label={t('initialSpeed')} value={properties.ammo.initialSpeed as number} unit="m/s" />
          </Section>
        )}

        {/* Armor - not for headwear */}
        {properties.armor && item.category !== 'headwear' && (
          <Section title={t('armor')}>
            <StatRow label={t('armorClass')} value={properties.armor.armorClass as number} />
            <StatRow label={t('durability')} value={(properties.armor.maxDurability || properties.armor.durability) as number} />
            <StatRow label={t('material')} value={translateArmorMaterial(properties.armor.material as string, lang)} />
            <StatRow label={t('zones')} value={translateArmorZones(properties.armor.zones as string[], lang)} />
            <ColoredStatRow label={t('speedPenalty')} value={properties.armor.speedPenalty as number} unit="%" />
            <ColoredStatRow label={t('ergoPenalty')} value={properties.armor.ergonomicsPenalty as number} unit="%" />
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
            {modAllZero ? (
              <p className="text-sm text-muted-foreground text-center py-2">{t('noEffect')}</p>
            ) : (
              <>
                <ColoredStatRow label={t('ergonomics')} value={properties.mod.ergonomics as number} />
                <ColoredStatRow label={t('recoilUp')} value={properties.mod.recoilForceUp as number} invertColor />
                <ColoredStatRow label={t('recoilBack')} value={properties.mod.recoilForceBack as number} invertColor />
                <ColoredStatRow label={t('accuracy')} value={properties.mod.accuracy as number} />
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
          </Section>
        )}

        {/* Headwear Performance */}
        {item.category === 'headwear' && !!(properties.headwear || raw.ArmorType || raw.ArmorMaterial) && (
          <Section title={t('performance')}>
            <StatRow label={t('armorClass')} value={(properties.headwear?.armorClass ?? raw.armorClass) as number} showZero />
            <StatRow label={t('type')} value={translateArmorType((properties.headwear?.armorType ?? raw.ArmorType) as string, lang)} />
            <StatRow label={t('material')} value={translateArmorMaterial((properties.headwear?.armorMaterial ?? raw.ArmorMaterial) as string, lang)} />
            <StatRow label={t('durability')} value={(properties.headwear?.maxDurability ?? raw.MaxDurability) as number} showZero />
            <StatRow label={t('zones')} value={translateArmorZones((properties.headwear?.zones ?? []) as string[], lang)} />
            <StatRow label={t('ricochet')} value={(properties.headwear?.ricochetChance ?? ((raw.RicochetParams as Record<string, unknown>)?.z)) as number} unit="%" showZero />
            <StatRow label={t('blindnessProtection')} value={(properties.headwear?.blindnessProtection ?? raw.BlindnessProtection) as number} unit="%" showZero />
            <ColoredStatRow label={t('movementSpeed')} value={(properties.headwear?.speedPenalty ?? raw.speedPenaltyPercent) as number} unit="%" showZero />
            <ColoredStatRow label={t('turnSpeed')} value={(properties.headwear?.turnSpeed ?? raw.mousePenalty) as number} unit="%" showZero />
            <ColoredStatRow label={t('ergonomics')} value={(properties.headwear?.ergonomicsPenalty ?? raw.weaponErgonomicPenalty) as number} unit="%" showZero />
            <StatRow label={t('deafness')} value={translateDeafStrength((properties.headwear?.deafStrength ?? raw.DeafStrength) as string, lang)} />
          </Section>
        )}

        {/* Headphones Performance */}
        {item.typeName === 'Headphones' && (
          <Section title={lang === 'zh' ? '性能' : 'Performance'}>
            <StatRow label={lang === 'zh' ? '失真' : 'Distortion'} value={raw.Distortion as number} />
            <StatRow label={lang === 'zh' ? '环境音量' : 'Ambient Volume'} value={raw.AmbientVolume as number} unit="dB" />
            <StatRow label={lang === 'zh' ? '压缩器增益' : 'Compressor Gain'} value={raw.CompressorGain as number} unit="dB" />
            <StatRow label={lang === 'zh' ? '压缩器阈值' : 'Compressor Threshold'} value={raw.CompressorThreshold as number} unit="dB" />
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
        {/* Headwear Compatible Mods */}
        {item.category === 'headwear' && resolvedSlots.length > 0 && (
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
