# 技术设计：EFTForge 改枪工作台迁移

## 架构总览

```
TheClubWiki/
├── src/
│   ├── components/
│   │   ├── item/ItemDetail.tsx       → 添加"改枪"入口按钮
│   │   └── forge/                    → NEW: React 工作台
│   │       ├── ForgeWorkbench.tsx    → 主页面（路由 /forge/:gunId）
│   │       ├── AttachmentGrid.tsx    → 网格视图（移植 attachment-grid.js）
│   │       ├── SlotSelector.tsx      → 配件选择面板（移植 slot-selector.js）
│   │       ├── StatsPanel.tsx        → 属性面板（移植 stats-panel.js）
│   │       ├── TreeView.tsx          → 列表/树视图（移植 tree.js）
│   │       ├── BuildPreview.tsx      → 图片预览（移植 build-preview.js）
│   │       ├── AttachmentGraph.tsx   → 散点图（移植 graph.js）
│   │       ├── BuildManager.tsx      → 改枪状态管理逻辑
│   │       ├── forge.css             → 提取的 EFTForge CSS（~7000行原样）
│   │       └── assets/               → 字体/占位图等静态资源
│   ├── hooks/
│   │   └── useForgeStore.ts          → Zustand 状态 store（移植 state.js）
│   ├── lib/
│   │   └── forgeApi.ts               → 后端 API 客户端（移植 api.js）
│   └── App.tsx                       → 添加 /forge/:gunId 路由
├── server/                           → NEW: Node.js Express 后端
│   ├── src/
│   │   ├── index.ts                  → Express 入口
│   │   ├── dataLoader.ts             → 启动时加载 forge-data.json 到内存
│   │   ├── routes/
│   │   │   ├── items.ts              → 插槽/兼容物品查询
│   │   │   ├── build.ts              → 计算/验证/Combo BFS
│   │   │   ├── imageGen.ts           → Playwright 图片合成代理
│   │   │   ├── presets.ts            → 预设保存/加载
│   │   │   └── prices.ts             → 跳蚤市场数据代理
│   │   └── comboSearch.ts            → Combo BFS 搜索引擎
│   └── package.json
├── generator/
│   └── src/
│       ├── processors/
│       │   └── forge.ts              → NEW: 生成 forge-data.json
│       └── index.ts                  → 集成 forge 输出
└── public/
    └── data/
        └── forge/
            └── forge-data.json       → NEW: 改枪专用合并数据
```

## 数据契约

### forge-data.json 格式

```typescript
interface ForgeItem {
  id: string
  name: { zh: string; en: string }
  shortName: { zh: string; en: string }
  image: string | null
  weight: number
  category: string  // weapon, mod_scope, mod_muzzle, ...
  typeName: string  // AssaultRifle, Silencer, ...
  // 武器基础属性
  weapon?: {
    ergonomics: number
    recoilForceUp: number
    recoilForceBack: number
    caliber: string
    defaultAmmo: string
    fireRate: number
    sightingRange: number
    effectiveRange: number
    // ... 其他 WeaponProps 字段
  }
  // 配件修正属性
  mod?: {
    ergonomics: number
    recoilForceUp: number
    recoilForceBack: number
    accuracy: number
    velocity: number
    loudness: number
    // ... 其他 ModProps 字段
  }
  // 插槽（含兼容物品ID列表）
  slots: Array<{
    name: string
    id: string
    required: boolean
    filter: string[]  // 兼容物品 ID 列表
  }>
  // 冲突物品
  conflictingItems: string[]
  blocksFastSlots: string[]
}

interface ForgeData {
  items: Record<string, ForgeItem>  // id → item
  generatedAt: string
}
```

### 后端 API 端点

| 端点 | 方法 | 说明 | 对应 EFTForge |
|------|------|------|---------------|
| `/api/forge/guns/:gunId/init` | GET | 枪械初始化（基础属性+插槽+工厂配置） | /guns/:id/init |
| `/api/forge/items/:itemId/slots` | GET | 物品插槽查询 | /items/:id/slots |
| `/api/forge/items/slots/batch` | POST | 批量插槽查询 | /items/slots/batch |
| `/api/forge/slots/:slotId/allowed-items` | GET | 插槽兼容物品 | /slots/:id/allowed-items |
| `/api/forge/slots/allowed-items/batch` | POST | 批量兼容物品查询 | /slots/allowed-items/batch |
| `/api/forge/build/calculate` | POST | 计算配装属性 | /build/calculate |
| `/api/forge/build/validate` | POST | 验证冲突 | /build/validate |
| `/api/forge/build/combo-full` | POST | Combo BFS 搜索（SSE流式） | /build/combo-full |
| `/api/forge/build-image` | POST | 图片合成（Playwright） | /build-image |
| `/api/forge/presets` | GET/POST | 预设列表/保存 | 新功能 |
| `/api/forge/presets/:id` | GET/DELETE | 加载/删除预设 | 新功能 |
| `/api/forge/prices/flea` | GET | 跳蚤市场价格代理 | 前端直接调 tarkov.dev |

## 前端设计

### 状态管理：Zustand

EFTForge 的 `state.js` 是一个 ~50 字段的全局对象。用 Zustand 移植：

```typescript
// useForgeStore.ts
interface ForgeState {
  // 枪械与配装
  currentGun: ForgeItem | null
  buildTree: BuildNode | null
  factoryTree: BuildNode | null
  // 缓存
  slotCache: Record<string, Slot[]>
  allowedCache: Record<string, ForgeItem[]>
  // UI 状态
  view: 'grid' | 'list'
  collapsedSlots: Record<string, boolean>
  // 统计
  lastTotalWeight: number
  lastTotalErgo: number
  lastRecoilV: number | null
  lastRecoilH: number | null
  // ... 其余字段
  // Actions
  setGun: (gun: ForgeItem) => void
  installAttachment: (slotId: string, itemId: string) => void
  removeAttachment: (slotId: string) => void
  // ...
}
```

### CSS 策略

- 从 EFTForge `index.html` 提取 `<style>` 内容（~7000行）到 `forge.css`
- 在 `ForgeWorkbench.tsx` 中 `import './forge.css'`
- React JSX 使用相同 class 名，保证 1:1 视觉还原
- 不转换为 Tailwind/shadcn，后续慢慢重构
- 字体文件（Bender.woff2）和占位图复制到 `src/components/forge/assets/`

### 移除内容

- `calculations.js`（EED/过摆公式）→ 完全删除
- `stats-panel.js` 中 EED/过摆/手臂耐力显示 → 删除相关 UI
- `state.js` 中 `lastEED`、`lastOverswing`、`lastArmStamina` → 删除
- 社区功能模块（leaderboard.js, profile.js, news.js）→ 不移植
- 首页武器列表（gun-list.js）→ 不移植，入口改为 ItemDetail 跳转

## 后端设计

### 数据加载

启动时读取 `public/data/forge/forge-data.json`，构建内存索引：
- `itemsMap: Map<string, ForgeItem>` — id → item
- `slotsIndex: Map<string, Slot[]>` — parentItemId → slots
- `allowedIndex: Map<string, ForgeItem[]>` — slotId → allowed items

### Combo BFS 搜索

移植 Python `combo_full` 逻辑到 TypeScript：
1. 加载根插槽的候选物品
2. 递归加载子插槽（最深 4 层），过滤排除项
3. 释放数据引用后纯 CPU BFS 展开
4. 通过 SSE 流式返回进度和结果
5. 内存缓存（500 条 LRU）

### 图片合成

使用 `playwright` npm 包：
1. 启动时初始化持久 Chromium 页面
2. 收到请求：导航到 image-gen.tarkov-changes.com → 注入改枪数据 → 等待渲染 → 返回图片 URL
3. SHA256 缓存（500 条）

### 预设存储

SQLite（better-sqlite3）存储预设：
```sql
CREATE TABLE presets (
  id TEXT PRIMARY KEY,
  gun_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pairs_json TEXT NOT NULL,  -- [["slotId","itemId"], ...]
  ammo_id TEXT,
  client_id TEXT NOT NULL,
  created_at INTEGER
);
```

## 关键权衡

1. **Zustand vs Context+useReducer**：选 Zustand。工作台状态 ~50 字段且高频更新，Context 的全组件重渲染不可接受。
2. **合并 JSON vs 按物品拆分**：选合并文件。后端启动时一次性加载，Combo BFS 需全量数据在内存。文件约 2-5MB，可接受。
3. **Playwright 依赖**：图片合成必须服务端。`playwright` npm 包约 50MB（含浏览器下载），但功能不可替代。
4. **SSE vs WebSocket**：选 SSE。Combo 搜索是单向流式推送，SSE 更简单，Express 原生支持。
