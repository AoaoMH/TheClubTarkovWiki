# Component Guidelines

## 道具详情页（ItemDetail.tsx）

核心组件，根据道具类型动态展示不同属性区域。使用 `useItemDetail(itemId)` 加载单个道具的完整数据。

### 通用结构
```tsx
<Section title={t('common')}>
  <StatRow label={...} value={...} unit={...} />
</Section>
```

### StatRow 布局规范

所有行布局使用统一的 flex 模式，左侧标签固定不换行，右侧内容右对齐并可换行：

```tsx
<div className="flex justify-between items-baseline py-1.5 border-b border-border/50 last:border-0 gap-3">
  <span className="text-sm text-muted-foreground shrink-0">{label}</span>
  <span className="text-sm font-medium text-right">{value}</span>
</div>
```

关键点：
- `shrink-0`：左侧标签不被挤压
- `text-right`：右侧内容右对齐
- `gap-3`：左右间距
- `items-baseline`：基线对齐

### 护甲/头盔统一术语

护甲（armor）和头盔（headwear）使用相同的 i18n key，禁止使用不同的翻译：

| 属性 | i18n key | 中文 | 组件 |
|------|----------|------|------|
| 移动速度 | `movementSpeed` | 移动速度 | `ColoredStatRow` |
| 人机工效 | `ergonomics` | 人机工效 | `ColoredStatRow` |
| 转向速度 | `turnSpeed` | 转向速度 | `ColoredStatRow` |
| 内衬材质 | `material` | 内衬材质 | `StatRow` |
| 内衬等级 | `linerClass` | 内衬等级 | `StatRow` |
| 防护区域 | `zones` | 防护区域 | `StatRow` |

> **Warning**: 禁止使用 `speedPenalty`、`ergoPenalty`、`turnPenalty` 等旧 key。所有模块同一属性必须用同一 i18n key。

### 护甲类型过滤

`armorType` 为 `None` 时不显示该行：
```tsx
{(armorType as string) && (armorType as string) !== 'None' && (
  <StatRow label={t('armorType')} value={...} />
)}
```

### 默认插板显示

默认插板使用可点击链接，右侧对齐，每个插板独立一行：

```tsx
<div className="flex justify-between items-start py-1.5 border-b border-border/50 gap-3">
  <span className="text-sm text-muted-foreground shrink-0">{t('defaultPlates')}</span>
  <div className="space-y-0.5 text-right">
    {plates.map((p, i) => (
      <Link key={i} to={`/item/${p.id}`} className="block text-sm font-medium text-primary hover:underline">
        {p.name.zh} × {p.count}
      </Link>
    ))}
  </div>
</div>
```

### 类型特化展示
通过 `item.category` 和 `item.typeName` 判断展示哪些 section：
- 武器 → 武器属性 + 弹药链接
- 弹药 → 弹药属性
- 护甲/胸挂 → 「性能」section（内衬材质/等级/防护区域/默认插板）
- 头盔/面罩 → 「性能」section（同上 + 跳弹/失明防护/听力）
- 耳机 → 性能栏 + 冲突道具
- 背包 → 性能栏 + 空间布局网格
- 近战 → 攻击属性
- 医疗 → 使用效果
- 食物/饮料 → 效果（属性变化/状态移除/兴奋剂增益）
- 改装件 → ColoredStatRow（人机/后坐力/精度/弹速）

> **Warning**: 护甲和头盔的 section 标题统一使用「性能」，禁止使用「护甲」作为 section 标题。
> 面罩类（facecover）不显示单独的护甲 section，所有属性在「性能」中展示。

### 原始属性访问
道具的 `_raw` 字段包含原始游戏数据，用于特殊类型展示：
```tsx
const raw = item.properties._raw || {}
raw.speedPenaltyPercent  // 移速惩罚
raw.knifeHitSlashDam     // 挥砍伤害
```

### 效果展示（EffectsSection）
按三组显示：属性变化、状态移除、兴奋剂增益。
兴奋剂增益按 delay+duration 分组，每组内列出所有 buff。

## 弹药视图（AmmoPage.tsx）

`AmmoView` 组件接受 items/categories/lang/filterCaliber props。

### 分组逻辑
使用 `CALIBER_GROUPS` 硬编码映射（游戏数据格式如 `545x39` 非 `5.45x39`）。
显示名通过 `CALIBER_DISPLAY` 映射转换。

### 排序
每个口径内按穿甲力（penetrationPower）从低到高排序。

## 颜色规范

| 属性 | 正=蓝(好) | 负=红(坏) | invertColor |
|------|-----------|-----------|-------------|
| 人机工效 | ✓ | ✓ | 否 |
| 后坐力 | ✗ | ✗ | 是 |
| 精度 | ✓ | ✓ | 否 |
| 移动速度 | ✓ | ✓ | 否 |
| 转向速度 | ✓ | ✓ | 否 |
| 效果数值 | ✓ | ✓ | 否 |
# Component Guidelines

> How components are built in this project.

---

## Overview

<!--
Document your project's component conventions here.

Questions to answer:
- What component patterns do you use?
- How are props defined?
- How do you handle composition?
- What accessibility standards apply?
-->

(To be filled by the team)

---

## Component Structure

<!-- Standard structure of a component file -->

(To be filled by the team)

---

## Props Conventions

<!-- How props should be defined and typed -->

(To be filled by the team)

---

## Styling Patterns

<!-- How styles are applied (CSS modules, styled-components, Tailwind, etc.) -->

## 道具卡片（ItemCard.tsx + ItemGrid）

列表视图组件，接收 `ItemSummary` 类型（不是 `WikiItem`）：

```tsx
<ItemCard item={summary} />   // summary: ItemSummary
<ItemGrid items={summaries} /> // summaries: ItemSummary[]
```

ItemSummary 只包含卡片展示所需字段：name、shortName、image、rarity、price。
完整道具数据（WikiItem）仅在 ItemDetail 中使用。

## 首页分类导航

首页使用 `useCategories()` 加载分类树，通过 `cat.previewImage` 展示首个道具图片作为预览。
如果 previewImage 为 null，显示道具数量占位。
