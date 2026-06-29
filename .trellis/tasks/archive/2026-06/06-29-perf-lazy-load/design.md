# 技术设计：按需加载与请求去重

## 架构概览

```
Generator (writer.ts)                 Frontend (React)
┌──────────────────────┐             ┌──────────────────────────┐
│ items[] ──► split    │             │ dataStore (module cache) │
│   ├─ summaries/      │             │  ├─ categories: loaded   │
│   │  {catId}.json    │────fetch───►│  ├─ summaries: per-cat   │
│   ├─ items/          │             │  ├─ items: per-id        │
│   │  {itemId}.json   │────fetch───►│  └─ searchIndex: lazy    │
│   └─ search-index.json│───fetch───►│                          │
│ categories.json       │             │ useCategories()          │
│ types.json            │             │ useCategorySummaries(id) │
│ stats.json            │             │ useItemDetail(id)        │
└──────────────────────┘             │ useSearchIndex()         │
                                     └──────────────────────────┘
```

## 1. Generator 输出变更

### 1.1 Summary 数据结构

```typescript
interface ItemSummary {
  id: string
  typeName: string
  category: string
  handbook: { categoryId: string | null; price: number }
  common: {
    name: { zh: string; en: string }
    shortName: { zh: string; en: string }
    rarity: string
  }
  image: string | null
  // AmmoPage 额外需要的字段
  ammo?: {
    caliber: string
    penetrationPower: number
    damage: number
    armorDamage: number
  }
}
```

### 1.2 输出文件结构

```
public/data/
├── categories.json          (不变)
├── types.json               (不变)
├── stats.json               (不变)
├── search-index.json        (新增 - 所有道具摘要，用于搜索)
├── summaries/               (新增目录)
│   ├── {categoryId1}.json
│   ├── {categoryId2}.json
│   └── ...
└── items/                   (新增目录)
    ├── {itemId1}.json
    ├── {itemId2}.json
    └── ...
```

### 1.3 writer.ts 改动

- 移除 `items.json` 输出
- 新增按 `handbook.categoryId` 分组输出 summaries
- 新增逐个输出 items
- 新增 search-index.json（所有 ItemSummary 数组）

## 2. 前端数据层重构

### 2.1 数据缓存模块 (`src/lib/dataStore.ts`)

模块级缓存，非 React 状态：

```typescript
const cache = new Map<string, Promise<unknown>>()

function fetchOnce<T>(key: string, url: string): Promise<T> {
  if (cache.has(key)) return cache.get(key) as Promise<T>
  const promise = fetch(url).then(r => r.json())
  cache.set(key, promise)
  return promise
}
```

关键：使用 `Promise` 缓存而非结果缓存，确保并发调用同一 URL 时只发出一个请求。

### 2.2 新 Hooks

| Hook | 加载数据 | 使用位置 |
|---|---|---|
| `useCategories()` | categories.json | Sidebar, HomePage |
| `useCategorySummaries(catId)` | summaries/{catId}.json | CategoryPage, AmmoPage |
| `useItemDetail(itemId)` | items/{itemId}.json | ItemDetail |
| `useSearchIndex()` | search-index.json | Header (on focus) |

每个 hook 内部使用 `useRef` + `useState` + `fetchOnce()` 实现去重。

### 2.3 废弃旧 Hook

- `useItems()` → 拆分为上述 4 个 hook
- `useSearch()` → 改用 `useSearchIndex()`
- `useItemsByCategory()` → 不再需要（summaries 已按分类）

## 3. 页面重构

### 3.1 HomePage
改为分类导航网格：展示所有有道具的分类卡片（图标 + 名称 + 数量），仅依赖 `useCategories()`。

### 3.2 CategoryPage
- 使用 `useCategorySummaries(categoryId)` 加载当前分类摘要
- ItemCard 适配 `ItemSummary` 类型（已有 name、shortName、image、price、rarity）
- 弹药分类使用 AmmoView 适配 summaries

### 3.3 ItemDetail
- 使用 `useItemDetail(itemId)` 加载单个道具完整数据
- 类型保持 `WikiItem`，无需大改

### 3.4 Header 搜索
- 首次 focus 搜索框时才加载 `search-index.json`
- 搜索结果展示使用 `ItemSummary` 数据

### 3.5 Sidebar
- 仅使用 `useCategories()`，不触发任何道具数据加载

## 4. 去重机制

- `fetchOnce()` 使用 Promise Map 缓存，保证同一 URL 只发一次请求
- React StrictMode 下 effect 执行两次不会导致重复请求（因为第二次调用命中缓存）
- 组件卸载后重新挂载也命中缓存（模块级）

## 5. 兼容性

- 移除 `public/data/items.json`，旧链接失效（纯静态站无外链风险）
- `src/data/` 下的副本同步更新或移除
- 构建产物 `dist/` 在下次 build 时自动更新
