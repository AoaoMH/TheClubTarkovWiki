# EFTForge 改枪工作台迁移

## 目标与用户价值

将 EFTForge（F:\HTML\Tarkov\EFTForge）的改枪工作台主要功能迁移到当前 TheClubWiki 项目中，从枪械详情页入口跳转到改枪页面，实现近 1:1 的布局和交互还原。

## 已确认事实（代码库验证）

### EFTForge 源项目
- **前端**：原生 JS（ES2022），~15K 行，26 个模块，直接 DOM 操作 + CSS Grid 布局
- **后端**：Python FastAPI（4937 行 main.py），SQLite，从 tarkov.dev GraphQL 同步数据
- 改枪工作台核心模块：attachment-grid.js(2114行)、slot-selector.js(2467行)、build-manager.js(2728行)、stats-panel.js(1159行)、tree.js(705行)、graph.js(1633行)、build-preview.js(574行)
- 计算公式（EED/过摆/手臂耐力）简单，前后端均有实现（calculations.js 仅 29 行）
- 社区功能（评分、社区配装、评论、个人资料、排行榜）不需要迁移
- 图片生成使用 Playwright 代理（image-gen.tarkov-changes.com）

### 当前项目数据基础
- 每个物品 JSON 已包含 `slots`（SlotInfo[]，含 `filter` 兼容物品 ID 列表）→ 递归插槽解析可行
- 每个物品 JSON 已包含 `properties._raw`（完整 SPT 原始数据，含 `ConflictingItems`）→ 冲突检测可行
- 武器基础属性（properties.weapon）和配件修正属性（properties.mod）均已提取
- 所有配件类型均有独立 JSON 文件
- 三级按需加载 + Promise 去重缓存架构（dataStore.ts）已就绪
- 生成器（generator/）处理 SPT 原始数据 → 静态 JSON

### 需移除的内容
- EvoErgo（EED）和过摆（overswing）相关代码——竞技场属性，本项目无此数据
- 社区功能（评分、发布、评论、个人资料、排行榜）
- 首页武器列表（入口改为枪械详情页跳转）

## 需求

1. 从枪械详情页（ItemDetail.tsx）添加入口，点击跳转到改枪页面
2. 改枪页面近 1:1 还原 EFTForge 工作台布局和交互
3. 移除 EvoErgo/过摆属性相关内容
4. 适配当前项目的数据源（静态 JSON）和本地化体系

## 已确认决策

### 决策1：架构方案
- **前端**：将 EFTForge 工作台完全重写为 React/TypeScript 组件，复用原始 CSS 和 HTML 结构（不适配 shadcn/本项目 UI），功能优先，样式后续慢慢重构
- **后端**：新建轻量 Node.js 后端（非迁移 Python），处理：改枪配置预设保存、跳蚤市场数据代理、Combo 计算、图片合成代理
- **入口**：React 路由 /forge/:gunId，从 ItemDetail 枪械详情页跳转
- 理由：React 组件更可维护，原始 CSS/结构复用可保证 1:1 还原

### 决策2：功能范围
- **全部保留**：网格视图、列表视图、插槽选择器、属性计算、冲突检测、图片合成预览、Combo 计算器+散点图、价格系统、分享链接+收藏+撤销重做
- **移除**：EvoErgo(EED)/过摆、社区平台、首页武器列表、数据追踪器、新闻公告

### 决策3：数据策略
- **独立改枪数据**：在 generator 中额外生成改枪专用数据文件，不混入 wiki items JSON
- 原因：①当前 items JSON 中的槽位是旧迁移残留，重跑 generator 会消失；②混入会增加 wiki 前端无效负载
- forge 数据需包含：id/name(中英)/shortName/image/weight/slots(含filter)/weapon属性/mod属性/conflicts(_raw.ConflictingItems)
- ID 和命名与 wiki 保持一致

### 决策4：后端框架
- **Express + tsx**：与项目现有 tsx 工作流一致，SSE 流式最简单，生态成熟

### Combo 计算器技术评估
- EFTForge 原实现：服务端 Python + SQLite，加载所有兼容物品到内存后纯 CPU BFS（可运行数秒）
- 推荐方案：Node.js 服务端计算，启动时加载 forge 数据到内存

### 图片合成技术评估
- EFTForge 原实现：服务端 Playwright（无头 Chromium），代理 image-gen.tarkov-changes.com
- 性能：首次 5-30秒，缓存命中毫秒级，Chromium 常驻 ~100-300MB 内存
- 推荐方案：Node.js 后端添加 Playwright，或客户端直接调用外部服务（若 CORS 允许）

## 待确认问题

所有架构问题已在 design.md 中解决：
1. ✅ forge 数据格式 → 合并文件 forge-data.json
2. ✅ React 状态管理 → Zustand
3. ✅ CSS 策略 → 复制 EFTForge CSS 原样
4. ✅ 预设存储 → SQLite (better-sqlite3)
5. ✅ 图片合成 → Node.js Playwright

## 验收标准

1. 从任意枪械详情页点击"改枪模拟"可跳转到 /forge/:gunId 工作台页面
2. 工作台网格视图正确渲染枪械插槽布局，插槽可点击打开选择器
3. 配件选择器可搜索/排序/安装/卸下配件，安装后属性实时更新
4. 属性面板显示人机/后坐力(垂直+水平)/重量/瞄准距离，不含 EED/过摆/手臂耐力
5. 列表视图正确显示递归配件树
6. 图片预览：安装配件后可生成合成枪械图片
7. Combo 计算器：可搜索合法配件组合并按属性排序
8. 价格系统：显示跳蚤/trader 价格，支持 PvP/PvE 切换
9. 预设保存：可保存/加载/删除配装预设
10. 分享链接：可生成 LZ-String 压缩 URL 分享码
11. 撤销/重做：支持配装操作历史回退
12. 收藏：配件星标收藏，localStorage 持久化
13. 新增依赖：zustand（状态管理）、lz-string（压缩）
14. forge-data.json 独立生成，不影响 wiki 现有 items JSON
15. Node.js 后端独立运行，不影响 wiki 前端构建

## 范围外

- EFTForge 首页武器列表
- 社区平台（发布/浏览/评分/评论/排行榜/个人资料）
- 数据追踪器（Stat Tracker）
- 新闻/公告系统
