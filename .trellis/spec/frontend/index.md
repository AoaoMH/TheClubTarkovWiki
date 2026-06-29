# Frontend Spec

React 19 + Vite 6 + TypeScript + TailwindCSS 4 静态站点。

## 技术约束

- 纯静态 SPA，零运行时后端依赖
- 数据按需加载（三层模型），不一次性加载全部数据
- 国际化使用 i18next（zh/en 双语，默认中文）
- 路径别名 `@/*` → `./src/*`

## 数据架构（三层按需加载）

### 数据结构

```
public/data/
├── categories.json          # 分类树（含 previewImage）~21KB
├── summaries/{catId}.json   # 分类道具摘要（列表用）~100KB/分类
├── items/{itemId}.json      # 单道具完整数据（详情用）~10-25KB/个
├── search-index.json        # 搜索索引（全部摘要）~1.7MB
├── quests.json              # 任务摘要列表（558个）~50KB
├── quests/{questId}.json    # 单任务完整数据（详情用）
├── types.json               # 类型层级
└── stats.json               # 生成统计
```

### 数据加载 Hooks

```typescript
// src/lib/dataStore.ts — Promise Map 缓存层，保证同一 URL 只请求一次
fetchOnce<T>(key, url): Promise<T>

// src/hooks/useItems.ts
const { categories, loading } = useCategories()           // 首页 + 侧边栏
const { items, loading } = useCategorySummaries(catId)     // 分类列表页
const { item, loading } = useItemDetail(itemId)            // 道具详情页
const { index, triggerLoad } = useSearchIndex()            // 搜索（懒加载）
```

### 去重机制

`dataStore.ts` 使用 `Map<string, Promise>` 缓存，确保：
- React StrictMode 下 effect 执行两次不会重复请求
- 多个组件同时请求同一数据只发一次网络请求
- 已加载数据缓存在模块级，组件重新挂载时命中缓存

### ItemSummary 类型

列表页使用轻量摘要，不含完整 properties/slots/description：

```typescript
interface ItemSummary {
  id, typeName, category, handbook, common: { name, shortName, rarity }, image
  ammo?: { caliber, penetrationPower, damage, armorDamage }  // 弹药页额外字段
}
```

### 类型翻译
道具类型名使用 `getTypeNameZH()` 函数翻译，映射表维护在 `src/hooks/useItems.ts`。

### 颜色语义
数值颜色遵循语义规范：
- 增益值（正=好）：蓝色 `text-blue-400`
- 惩罚值（负=坏）：红色 `text-red-400`
- 反向属性（如后坐力，负=好）：使用 `ColoredStatRow` 的 `invertColor` prop

### 翻译映射表维护规范

前端使用多层翻译机制：

1. **i18n JSON 文件**（`src/i18n/zh.json` + `en.json`）：通用 UI 文案和类型名
2. **组件内映射表**（`ItemDetail.tsx` 中的 `*_ZH` 常量）：游戏内枚举值的翻译

#### 组件内映射表清单

| 常量名 | 用途 | 数据源 |
|---------|------|--------|
| `ARMOR_ZONE_ZH` | 防护区域 collider 名 | 游戏 locale `Armor Zone *` |
| `ARMOR_MATERIAL_ZH` | 护甲材质 | 游戏枚举 `ArmorMaterial` |
| `ARMOR_TYPE_ZH` | 护甲类型 | 游戏枚举 `ArmorType` |
| `DEAF_STRENGTH_ZH` | 听力减弱等级 | 游戏枚举 `DeafStrength` |
| `FIRE_MODE_ZH` | 射击模式 | 游戏枚举 `weapFireType` |

#### 维护原则

- **同一属性全局统一翻译**：如「移动速度」不能在不同模块翻译为「移速惩罚」
- **新增游戏枚举值时**：同时检查映射表是否需要新增翻译
- **材质翻译必须完整**：包括 `UHMWPE` → 「超高分子量聚乙烯」、`ArmoredSteel` → 「装甲钢」等
- **区域翻译去重**：`translateArmorZones()` 自动对翻译结果去重（多个 collider 可能翻译为同一中文）

### 组件结构
- `components/layout/` — 布局组件（AppLayout, Sidebar, Header）
- `components/item/` — 道具展示组件（ItemCard, ItemGrid, ItemDetail, AmmoPage）
- `lib/` — 工具函数（cn class合并）
- `i18n/` — 国际化配置和翻译文件
- `hooks/` — 自定义 hooks（useItems）

## 跨层开发实践

- 不主动运行测试（除非任务明确要求）→ [Development Workflow](../development-workflow.md)
- 不擅自开启新端口运行项目（除非用户明确要求）→ [Development Workflow](../development-workflow.md)

# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | To fill |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | To fill |
| [Quest System](./quest-system.md) | Quest data contracts, CounterCreator rules, display patterns | ✅ Active |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | To fill |
| [State Management](./state-management.md) | Local state, global state, server state | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Type Safety](./type-safety.md) | Type patterns, validation | To fill |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.
