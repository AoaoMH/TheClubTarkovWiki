# 实现计划：EFTForge 改枪工作台迁移

## 实现顺序

### 阶段1：数据基础

- [ ] **T1: generator 添加 forge 数据输出**
  - 在 `generator/src/processors/` 新建 `forge.ts`
  - 从已 normalize 的 SPT 数据中提取 forge 专用字段（id/name/slots/weapon/mod/conflicts）
  - 输出 `public/data/forge/forge-data.json`（合并文件）
  - 在 `generator/src/index.ts` 集成 forge 输出步骤
  - 验证：`npm run generate:data` 后检查 forge-data.json 是否生成

- [ ] **T2: 从 EFTForge 提取 CSS 和静态资源**
  - 从 `EFTForge/frontend/index.html` 的 `<style>` 提取 CSS → `src/components/forge/forge.css`
  - 复制字体文件 → `src/components/forge/assets/fonts/`
  - 复制插槽占位图 → `src/components/forge/assets/images/slot_placeholders/`
  - 移除 CSS 中社区/首页/导航相关样式（仅保留工作台相关）
  - 验证：CSS 文件可正常 import

### 阶段2：Node.js 后端

- [ ] **T3: 搭建 Express 后端骨架**
  - 在项目根目录新建 `server/` 目录
  - `server/package.json`：express, cors, better-sqlite3, playwright, tsx, typescript
  - `server/src/index.ts`：Express 应用 + CORS + 路由挂载
  - `server/src/dataLoader.ts`：启动时加载 forge-data.json 到内存 Map
  - 验证：`cd server && npx tsx src/index.ts` 启动成功，`GET /api/forge/health` 返回 200

- [ ] **T4: 实现核心查询 API**
  - `server/src/routes/items.ts`：gun init、item slots、slot allowed-items（含批量）
  - 移植 EFTForge `main.py` 的 `_compute_stats`、`_check_conflicts` 逻辑
  - `server/src/routes/build.ts`：build calculate、build validate
  - 验证：`GET /api/forge/guns/:gunId/init` 返回正确枪械数据

- [ ] **T5: 实现 Combo BFS 搜索**
  - `server/src/comboSearch.ts`：移植 Python `combo_full` 的 BFS 逻辑
  - SSE 流式响应（进度 + 结果）
  - 500 条 LRU 缓存
  - 验证：`POST /api/forge/build/combo-full` 返回流式结果

- [ ] **T6: 实现图片合成代理**
  - `server/src/routes/imageGen.ts`：Playwright 持久页面 + 导航注入 + 截图
  - SHA256 缓存（500 条）
  - 验证：`POST /api/forge/build-image` 返回图片 URL

- [ ] **T7: 实现预设保存和价格代理**
  - `server/src/routes/presets.ts`：SQLite CRUD（better-sqlite3）
  - `server/src/routes/prices.ts`：代理 tarkov.dev GraphQL 跳蚤价格
  - 验证：预设保存/加载正常，跳蚤价格可查询

### 阶段3：前端工作台核心

- [ ] **T8: React 路由和状态骨架**
  - `src/App.tsx`：添加 `/forge/:gunId` 路由
  - `src/components/forge/ForgeWorkbench.tsx`：主页面组件
  - `src/hooks/useForgeStore.ts`：Zustand store（移植 state.js，移除 EED/过摆字段）
  - `src/lib/forgeApi.ts`：API 客户端（移植 api.js，指向 Node.js 后端）
  - `src/lib/forgeConfig.ts`：配置（移植 config.js，API_BASE 等）
  - 验证：从 ItemDetail 点击"改枪"跳转到 /forge/:gunId，页面加载不报错

- [ ] **T9: ItemDetail 添加入口**
  - `src/components/item/ItemDetail.tsx`：武器类型物品添加"改枪模拟"按钮
  - 仅 `category === 'weapon'` 时显示
  - 验证：按钮仅对武器显示，点击跳转正确

- [ ] **T10: 网格视图（AttachmentGrid）**
  - 移植 `attachment-grid.js`（2114行）→ `AttachmentGrid.tsx`
  - CSS Grid 布局、插槽占位图、已装配件显示
  - 点击插槽打开选择器
  - 验证：枪械网格视图正确渲染，插槽可点击

- [ ] **T11: 配件选择器（SlotSelector）**
  - 移植 `slot-selector.js`（2467行）→ `SlotSelector.tsx`
  - 配件列表、排序、搜索、收藏星标
  - 价格芯片显示
  - 安装/卸下交互
  - 验证：选择配件后正确安装到插槽，属性实时更新

- [ ] **T12: 属性面板（StatsPanel）**
  - 移植 `stats-panel.js`（1159行）→ `StatsPanel.tsx`
  - 人机/后坐力/重量/瞄准距离等实时计算
  - 移除 EED/过摆/手臂耐力相关 UI
  - 隐藏属性展开
  - 验证：安装配件后属性数值正确更新

- [ ] **T13: 列表/树视图（TreeView）**
  - 移植 `tree.js`（705行）→ `TreeView.tsx`
  - 递归配件树、折叠/展开
  - 验证：树视图正确显示配件层级

### 阶段4：前端高级功能

- [ ] **T14: 改枪状态管理（BuildManager）**
  - 移植 `build-manager.js`（2728行）核心逻辑
  - 配装序列化/反序列化（LZ-String 压缩）
  - 撤销/重做历史
  - 分享链接生成/解析
  - 验证：撤销重做正常，分享链接可生成和加载

- [ ] **T15: 图片预览（BuildPreview）**
  - 移植 `build-preview.js`（574行）→ `BuildPreview.tsx`
  - 调用后端图片合成 API
  - 预览开关、加载状态
  - 验证：安装配件后合成图片正确显示

- [ ] **T16: Combo 计算器和散点图**
  - 移植 `graph.js`（1633行）→ `AttachmentGraph.tsx`
  - Combo BFS 结果展示、散点图渲染
  - 验证：Combo 搜索可触发，结果正确排序

- [ ] **T17: 价格系统**
  - 跳蚤/trader 价格显示
  - PvP/PvE 切换
  - 商人等级限制
  - 验证：价格正确显示，最便宜来源自动选择

- [ ] **T18: 预设保存 UI**
  - 预设保存/加载/删除界面
  - 验证：预设可保存和重新加载

## 验证命令

```bash
# 生成数据
npm run generate:data

# 启动后端
cd server && npx tsx src/index.ts

# 启动前端
npm run dev

# 类型检查
npx tsc --noEmit
```

## 风险点

1. **attachment-grid.js（2114行）和 slot-selector.js（2467行）是最复杂的模块**，直接 DOM 操作 → React 移植需仔细处理生命周期和事件绑定
2. **Combo BFS 的 Python→TypeScript 移植**需保证算法等价性，可用 EFTForge 测试用例交叉验证
3. **Playwright 在 Node.js 中的持久页面管理**需注意浏览器进程生命周期和异常恢复
4. **CSS 提取后可能与项目现有 Tailwind 样式冲突**，需确保 forge.css 作用域隔离（可加 CSS 前缀或使用 Shadow DOM）
5. **forge-data.json 体积**：~5000 物品 × ~1KB = ~5MB，后端启动加载需 1-2 秒

## 回滚点

- T1 完成后：forge 数据独立生成，不影响现有 wiki 功能
- T8 完成后：路由和骨架就绪，可独立验证
- T13 完成后：核心改枪功能可用（无高级功能）
- 每个阶段完成后可独立验证，不影响已完成的 wiki 功能
