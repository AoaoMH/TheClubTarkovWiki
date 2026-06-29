# 实施计划：按需加载与请求去重

## Task 1: Generator 输出重构

修改 `generator/src/output/writer.ts`：
1. 新增 `ItemSummary` 类型（在 types.ts 或 writer.ts 内）
2. 创建 `data/summaries/` 和 `data/items/` 目录
3. 遍历 `wikiItems` 生成：
   - 按 `handbook.categoryId` 分组的 summaries 文件
   - 每个 item 的独立文件
   - `search-index.json`（所有摘要的合集）
4. 移除旧的 `items.json` 输出
5. 保留 `categories.json`、`types.json`、`stats.json`

**涉及文件**:
- `generator/src/output/writer.ts` — 主要改动
- `generator/src/types.ts` — 新增 `ItemSummary` 类型

**验证**: 运行 generator，检查输出目录结构和文件大小

## Task 2: 前端数据缓存层

创建 `src/lib/dataStore.ts`：
- `fetchOnce<T>(key, url)` — Promise Map 缓存的 fetch 封装
- 导出各数据获取函数：
  - `fetchCategories()` — 加载 categories.json
  - `fetchCategorySummaries(categoryId)` — 加载 summaries/{categoryId}.json
  - `fetchItemDetail(itemId)` — 加载 items/{itemId}.json
  - `fetchSearchIndex()` — 加载 search-index.json

**涉及文件**:
- `src/lib/dataStore.ts` — 新建

## Task 3: 前端 Hooks 重构

重写 `src/hooks/useItems.ts`：
- 新增 `ItemSummary` 前端类型
- 实现 `useCategories()` — 仅加载 categories
- 实现 `useCategorySummaries(categoryId)` — 按需加载分类摘要
- 实现 `useItemDetail(itemId)` — 按需加载单道具
- 实现 `useSearchIndex()` — 延迟加载搜索索引
- 保留 `useCategoryTree()`、`getTypeNameZH()` 等工具函数
- 移除旧的 `useItems()`、`useSearch()`、`useItemsByCategory()`

**涉及文件**:
- `src/hooks/useItems.ts` — 重写

## Task 4: 页面组件适配

### 4.1 App.tsx
- `HomePage` 改为分类导航页（使用 `useCategories()`）
- `CategoryPage` 改用 `useCategorySummaries(id)`
- `ItemPage` 保持不变（`ItemDetail` 内部改动）

### 4.2 ItemCard.tsx
- `ItemCard` 适配 `ItemSummary` 类型
- `ItemGrid` 适配 `ItemSummary[]` 类型

### 4.3 AmmoPage.tsx
- 改用 `useCategorySummaries(AMMO_CATEGORY_ID)` 代替全量 items
- 适配 `ItemSummary` 类型（使用 `summary.ammo` 字段分组排序）

### 4.4 ItemDetail.tsx
- 改用 `useItemDetail(itemId)` 加载完整数据
- 移除对 `useItems()` 的依赖

### 4.5 AppLayout.tsx
- `Sidebar` 改用 `useCategories()`
- `Header` 搜索改用 `useSearchIndex()`（focus 时加载）

**涉及文件**:
- `src/App.tsx`
- `src/components/item/ItemCard.tsx`
- `src/components/item/AmmoPage.tsx`
- `src/components/item/ItemDetail.tsx`
- `src/components/layout/AppLayout.tsx`

## Task 5: 运行 Generator 生成新数据

```bash
cd generator && npm run build && node dist/index.js --skip-images
```

**验证**:
- `public/data/summaries/` 目录下有分类文件
- `public/data/items/` 目录下有单道具文件
- `public/data/search-index.json` 存在
- 旧的 `items.json` 不再输出

## Task 6: 前端构建与测试

```bash
npm run build
```

**验证**:
- TypeScript 编译无错误
- 首页加载仅 categories.json（< 50KB）
- 分类页仅加载对应 summaries 文件
- 详情页仅加载单个 item 文件
- 搜索功能正常
- 无重复请求（DevTools Network 面板检查）
