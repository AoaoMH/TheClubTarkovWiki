# Generator Spec

Node.js + TypeScript 数据生成器，读取 SPT 客户端数据输出前端所需的 JSON。

## 运行方式

```bash
cd generator
npm install
npx tsx src/index.ts              # 完整生成（含图片下载）
npx tsx src/index.ts --skip-images # 仅数据，跳过图片
npx tsx src/index.ts --images-only # 仅更新图片
```

## 数据流

```
SPT客户端目录 → readers/ → processors/ → output/ → public/data/
tarkov.dev API → images/downloader → public/images/items/
```

## 输出结构（三层模型）

```
public/data/
├── categories.json          # 分类树（含 previewImage: 首个道具图片）
├── summaries/{catId}.json   # 分类道具摘要（ItemSummary 数组，列表用）
├── items/{itemId}.json      # 单道具完整数据（WikiItem，详情用）
├── search-index.json        # 搜索索引（全部 ItemSummary 数组）
├── quests.json              # 任务摘要列表（558个）
├── quests/{questId}.json    # 单任务完整数据
├── types.json               # 类型层级树
└── stats.json               # 生成统计信息
```

### ItemSummary 结构

轻量摘要，用于列表卡片和搜索：

```typescript
interface ItemSummary {
  id: string
  typeName: string
  category: string
  handbook: { categoryId: string | null; price: number }
  common: { name: LocalizedText; shortName: LocalizedText; rarity: string }
  image: string | null
  ammo?: { caliber, penetrationPower, damage, armorDamage }  // 弹药页分组/排序用
}
```

### previewImage

分类卡片使用首个道具图片作为预览图。在 `buildCategories()` 中初步填充，
在图片加载完成后（Step 9 写入前）再次更新确保正确。

## 关键文件

| 文件 | 职责 |
|------|------|
| `config.ts` | 所有路径常量（SPT客户端路径、输出路径） |
| `types.ts` | SPT原始类型 + Wiki输出类型定义 |
| `readers/items.ts` | 读取 items.json + globals.json（stim buffs） |
| `readers/handbook.ts` | 读取 handbook.json |
| `readers/locales.ts` | 读取 ch.json + en.json |
| `readers/mods.ts` | 扫描 mods/*/db/CustomItems + CustomLocales |
| `readers/quests.ts` | 读取 quests.json + traders (base + questassort) |
| `processors/types.ts` | 构建类型继承树 |
| `processors/merge.ts` | 合并 base + mod 数据（clone+override） |
| `processors/normalize.ts` | 属性归一化、类型分类、效果解析 |
| `processors/categories.ts` | 手册分类树 + 硬编码分类名翻译 |
| `processors/quests.ts` | 任务数据解析、CounterCreator合并、名称解析 |
| `images/downloader.ts` | tarkov.dev CDN 图片下载 + 缓存复用 |
| `output/writer.ts` | 写入 JSON 到 public/data/ |

## Mod 数据处理

Mod 道具使用 `itemTplToClone` + `overrideProperties` 模式：
1. 从 base items.json 克隆模板
2. 应用 overrideProperties 覆盖
3. 合并 CustomLocales 翻译
4. 标记 `isMod: true`，图片下载时跳过

## 任务数据提取

详见 [Quest System Contract](../frontend/quest-system.md)

### CounterCreator 合并规则

每个 `CounterCreator` 条件必须合并为 1 个 objective，不能拆分内部条件：
- `Kills` 内部条件 → target + weapons + bodyParts + distance 等主数据
- `Location` 内部条件 → `location` 字段
- `Equipment` 内部条件 → 标记需要装备

### 名称解析

任务目标中的物品 ID 通过 `resolveNamesMap()` 解析为名称，输出到 `targetNames` / `weaponNames` / `requiredItemNames` / `requiredCategoryNames` 字段。

## 口径格式

游戏数据中口径为紧凑格式（无点无空格）：`545x39`、`762x39`、`556x45NATO`。
分类映射和显示名映射在前端 `AmmoPage.tsx` 中维护。

## 护甲数据提取

### 防护区域来源：`armorColliders`

> **Warning**: SPT 数据中 `armorZone` 字段始终为空数组，实际防护区域必须从子组件的 `armorColliders` 读取。

护甲/头盔的防护区域通过 `readChildArmorData()` 从子槽位组件聚合：

| 槽位类型 | `_required` | 数据来源 | 区域字段 |
|----------|------------|----------|----------|
| 软甲（内置） | `true` | `armorColliders` | 身体区域（如 `RibcageUp`、`SpineTop`） |
| 插板（可选） | `false` | `armorPlateColliders` | 插板区域（如 `Plate_Granit_SAPI_chest`） |
| 头盔组件 | `true` | `armorColliders` | 头部区域（如 `ParietalHead`、`Ears`） |

区域名使用游戏内 collider 标识符，翻译映射在前端 `ARMOR_ZONE_ZH` 维护。

### 内衬等级 vs 有效护甲等级

```typescript
// softArmorClass: 仅来自必填槽位（软甲组件）→ 显示为「内衬等级」
// armorClass (effectiveAC): base 和所有子组件的最大值 → 含插板加成
baseArmorClass = Math.max(p.armorClass, childData.softArmorClass)
armorClass = Math.max(p.armorClass, childData.maxArmorClass)
```

### 默认插板提取

可选槽位的第一个 `Filter` 项视为默认插板，提取为 `DefaultPlate`：

```typescript
interface DefaultPlate {
  id: string                          // 插板物品 ID（前端跳转用）
  name: { zh: string; en: string }    // 翻译名称
  armorClass: number                  // 插板护甲等级
  weight: number                      // 插板重量
  count: number                       // 使用数量（同名合并）
}
```

同名插板自动合并 count（如前后用同一插板 → count=2）。

### 总重量计算

插板类护甲的总重 = 基础重量 + 所有默认插板重量：
```typescript
totalWeight = baseWeight + childData.plateWeight
```
前端通用信息中的 weight 使用 `armor.totalWeight || item.common.weight`。

### 惩罚字段双名称

护甲道具的惩罚字段有两种命名，提取时必须兼容：

| 用途 | 字段 A | 字段 B |
|------|--------|--------|
| 移速惩罚 | `SpeedPenalty` | `speedPenaltyPercent` |
| 人机惩罚 | `ErgonomicsPenalty` | `weaponErgonomicPenalty` |
| 转向惩罚 | `mousePenalty` | — |

## JSON 输出格式

所有 JSON 文件使用 `JSON.stringify(data, null, 2)` 格式化输出，保证 git diff 可读。
`search-index.json` 除外（体积大，保持紧凑）。

## 效果数据

- `effects_health` → 属性变化（能量/水分/治疗状态）
- `effects_damage` → 状态移除/造成
- `StimulatorBuffs` → 引用 globals.json 的 buff 定义（`config.Health.Effects.Stimulator.Buffs`）

## 部署注意事项

> **Warning**: `public/images/items/` 必须提交到 git，不能被 .gitignore 排除。
>
> 服务器通过 `git pull` 获取图片，如果 .gitignore 排除了图片目录，部署后图片会 404。

### previewImage 时序问题

`buildCategories()` 在 Step 6 执行，但图片路径在 Step 8 才填充。
因此 previewImage 需要在 Step 9 写入前再次更新（在 index.ts 中处理）。
