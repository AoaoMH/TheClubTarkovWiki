# Quest System Contract

## 1. Scope / Trigger

任务系统接入 Wiki，涵盖 Generator 数据提取 + 前端列表页/详情页 + 侧边栏导航。

## 2. Data Architecture

### Generator Pipeline

```
quests.json (SPT templates) → readers/quests.ts → processors/quests.ts → output/writer.ts
traders/*/questassort.json → readers/quests.ts (quest-to-trader mapping)
traders/*/base.json → readers/quests.ts (trader info)
locales/global/{ch,en}.json → quest name/description/item name resolution
```

### Output Structure

```
public/data/
├── quests.json              # 558 quest summaries (list page) ~50KB
└── quests/{questId}.json    # Individual quest detail ~1-5KB each
```

### QuestSummary (列表页)

```typescript
interface QuestSummary {
  id: string
  name: { zh: string; en: string }
  traderId: string
  traderName: { zh: string; en: string }
  type: string                    // Elimination, PickUp, Completion, etc.
  location: string                // location ID or "any"
  rewards: QuestReward[]
}
```

### QuestDetail (详情页, extends QuestSummary)

```typescript
interface QuestDetail extends QuestSummary {
  description: { zh: string; en: string }
  objectives: QuestObjective[]
  prerequisites: Array<{ id: string; name: { zh: string; en: string } }>
  followUps: Array<{ id: string; name: { zh: string; en: string } }>
  image: string | null
  isKey: boolean
}
```

### QuestReward

```typescript
interface QuestReward {
  type: string        // Experience | TraderStanding | Item | AssortmentUnlock | ...
  value?: number
  itemId?: string
  itemName?: { zh: string; en: string }
  quantity?: number   // 始终有值，最少为 1
  target?: string     // trader ID / skill name / achievement ID
}
```

### QuestObjective

```typescript
interface QuestObjective {
  type: string                  // outer type: Elimination, HandoverItem, WeaponAssembly, etc.
  description: string           // "Elimination: Kills" or "Exploration: VisitPlace"
  value?: number                // count
  target?: string | string[]    // enemy/item/location IDs
  targetNames?: Record<string, { zh: string; en: string }>
  weapons?: string[]            // weapon template IDs
  weaponNames?: Record<string, { zh: string; en: string }>
  location?: string             // for CounterCreator with Location inner condition
  requirements?: Array<{ stat: string; compare: string; value: number }>  // WeaponAssembly
  requiredItems?: string[]
  requiredItemNames?: Record<string, { zh: string; en: string }>
  requiredCategories?: string[]
  requiredCategoryNames?: Record<string, { zh: string; en: string }>
  bodyParts?: string[]
  enemyRoles?: string[]
  onlyFoundInRaid?: boolean
  distance?: { compareMethod: string; value: number }
  daytime?: { from: number; to: number }
}
```

## 3. Contracts

### CounterCreator Merging (CRITICAL)

> **Warning**: 每个 CounterCreator 必须合并为 **1 个 objective**，不能拆分为多个。

```typescript
// ❌ Wrong: 每个 inner condition 创建独立 objective
for (const inner of innerConditions) {
  objectives.push({ type: objectiveType, description: `${objectiveType}: ${inner.conditionType}`, ... })
}

// ✅ Correct: 一个 CounterCreator = 一个 objective，内部条件合并
const obj = { type: objectiveType, value: cond.value }
for (const inner of innerConditions) {
  if (inner.conditionType === 'Kills') { obj.target = inner.target; obj.weapons = inner.weapon; ... }
  else if (inner.conditionType === 'Location') { obj.location = inner.target }
  else if (inner.conditionType === 'Equipment') { /* mark equipment req */ }
}
objectives.push(obj)
```

### Item Name Resolution Chain

Generator 中所有物品名称使用 `resolveItemName()` 统一解析：

```typescript
function resolveItemName(id, itemNames, locales) {
  // 1. 优先查 itemNames map（非 Wiki 物品）
  if (itemNames[id]) return itemNames[id]
  // 2. 回退到 locale 查找
  return locales.zh[`${id} Name`] || locales.zh[`${id} ShortName`] || id
}
```

前端 `getName()` 查找链：
```
targetNames → weaponNames → requiredItemNames → requiredCategoryNames → itemNames map → raw ID
```

### Quest Type Mapping (13 types)

| Game Type | zh | en |
|-----------|-----|-----|
| Elimination | 击杀 | Elimination |
| PickUp | 拾取 | Pick Up |
| Completion | 交付 | Completion |
| Discover | 发现 | Discover |
| Loyalty | 忠诚 | Loyalty |
| Exploration | 探索 | Exploration |
| Multi | 综合 | Multi |
| Skill | 技能 | Skill |
| Merchant | 商人 | Merchant |
| WeaponAssembly | 武器组装 | Weapon Assembly |
| Standing | 声望 | Standing |
| Experience | 经验 | Experience |

### Location ID Mapping

Common location IDs that must be mapped in both generator (quest processor) and frontend:

| ID | zh | en |
|----|-----|-----|
| any | 任意 | Any |
| bigmap | 海关 | Customs |
| factory4_day | 工厂 | Factory |
| rezervbase | 储备站 | Reserve |
| lighthouse | 灯塔 | Lighthouse |
| tarkovstreets | 街区 | Streets of Tarkov |
| woods | 森林 | Woods |
| shoreline | 海岸线 | Shoreline |
| interchange | 立交桥 | Interchange |
| laboratory | 实验室 | The Lab |
| sandbox | 中心区 | Center |

### Currency Item IDs (inline display)

```typescript
const CURRENCY_IDS = new Set([
  '5449016a4bdc2d6f028b456f', // Roubles
  '569668774bdc2da2298b4568', // Euros
  '5696686a4bdc2da3298b456a', // Dollars (注意: 298b 不是 2b8b)
  '5d235b4d86f7742e017bc88a', // GP coins
])
```

## 4. Validation & Error Matrix

| Condition | Behavior |
|-----------|----------|
| Quest has no objectives | Objectives section hidden |
| Quest has no rewards | Rewards section hidden |
| Quest has no prereqs/followups | Table section hidden |
| Item ID not in itemNames map | Fall back to locale lookup |
| Locale key not found | Display raw ID |
| CounterCreator with no Kills condition | Description set to last inner condition type |
| requiredCategories has IDs not in locale | Display raw category ID |

## 5. Good / Base / Bad Cases

### Good: WeaponAssembly objective
```json
{
  "type": "WeaponAssembly",
  "target": ["66992b349950f5f4cd06029f"],
  "targetNames": { "66992b349950f5f4cd06029f": { "zh": "IWI UZI 9x19冲锋枪", "en": "IWI UZI 9x19 submachine gun" } },
  "requirements": [{ "stat": "ergonomics", "compare": ">=", "value": 60 }],
  "requiredCategories": ["550aa4cd4bdc2dd8348b456c"],
  "requiredCategoryNames": { "550aa4cd4bdc2dd8348b456c": { "zh": "消音器", "en": "Silencer" } }
}
```

### Bad: CounterCreator split into multiple objectives
```json
[
  { "type": "Elimination", "description": "Elimination: Kills", "value": 12 },
  { "type": "Elimination", "description": "Elimination: Location", "value": 12 },
  { "type": "Elimination", "description": "Elimination: Equipment", "value": 12 }
]
```
→ Should be ONE objective with `location` field set.

## 6. Tests Required

- [ ] Generator: CounterCreator with 3 inner conditions → 1 objective
- [ ] Generator: WeaponAssembly with containsItems → requiredItems + requiredItemNames populated
- [ ] Frontend: Quest list shows 558 quests with correct NPC/type filters
- [ ] Frontend: Quest detail objectives show tree branches for weapons
- [ ] Frontend: Prerequisites table matches outer table columns exactly

## 7. Wrong vs Correct

### Reward Display

#### Wrong
```tsx
// All rewards shown inline, items not collapsed
{rewards.map(r => <RewardBadge reward={r} />)}
```

#### Correct
```tsx
// Inline: EXP + Standing + Currency badges
// Collapsed: Items + Unlocks in HoverCard with +N trigger
{inlineRewards.map(r => <RewardBadge reward={r} />)}
{hoverItems.length > 0 && <HoverCard openDelay={0}>+{hoverItems.length}</HoverCard>}
```

### Objective Display

#### Wrong
```tsx
// Weapons shown as comma-separated inline text
<div>{t('weapons')}: {weapons.map(w => getName(w)).join(', ')}</div>
```

#### Correct
```tsx
// Weapons shown as tree branches under "限定武器" category
<TreeBranch isCategory>限定武器</TreeBranch>
{weapons.map((w, i) => <TreeBranch isLast={i === weapons.length - 1}>{getName(w)}</TreeBranch>)}
```
