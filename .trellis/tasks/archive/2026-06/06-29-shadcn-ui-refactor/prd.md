# shadcn UI 组件化重构与整体样式优化

## Goal

将项目从手写 Tailwind UI 升级为基于 shadcn/ui 组件库的现代化界面，重点优化左侧菜单、顶部导航、搜索体验、加载状态和面包屑导航，整体提升视觉品质和交互体验。

## 已确认事实（代码库检查）

1. **项目未真正安装 shadcn/ui**：没有 `components.json`、没有 `src/components/ui/` 目录、没有 `@radix-ui/*` 等核心依赖
2. **已有基础设施**：`cn()` 工具函数已存在于 `src/lib/utils.ts`；CSS 变量命名已遵循 shadcn 约定（`--color-background` 等）
3. **技术栈**：React 19 + Vite 6 + TypeScript 5.7 + Tailwind CSS v4 + i18next
4. **当前主题**：仅暗色主题，无浅色主题切换
5. **现有组件全部手写**：
   - `AppLayout.tsx`：手写 Sidebar（aside + nav + button）和 Header（手写搜索 input + 下拉）
   - `ItemDetail.tsx`：手写面包屑（Link + span）、手写 Tooltip（group-hover）、手写 Section/Card
   - `ItemCard.tsx`：手写卡片
   - `AmmoPage.tsx`：手写分组布局
6. **加载状态**：全部为纯文本 `t('loading')`，无 Skeleton/Spinner
7. **搜索**：手写 input + 下拉结果，无键盘快捷键，无 Command palette
8. **移动端侧边栏**：手写 overlay，无 Sheet 组件

## Requirements

### 已确认决策

1. **侧边栏**：使用 shadcn Sidebar 组件完全重构（折叠/展开、图标导航、键盘导航、Sheet 移动端抽屉）
2. **主题**：仅暗色主题，不增加浅色切换
3. **搜索**：Header 中放搜索触发按钮（显示 Ctrl+K 提示），点击或 Ctrl+K 打开 Command Dialog 全屏搜索面板
4. **快捷键**：仅 Ctrl+K（不覆盖浏览器 Ctrl+F）
5. **顶部导航**：精简 Header（搜索触发按钮 + 语言切换 DropdownMenu），面包屑用 shadcn Breadcrumb 放在内容区顶部
6. **组件清单**：全部采纳 15 个 shadcn 组件

### 组件采用清单

| shadcn 组件 | 替换位置 | 说明 |
|---|---|---|
| Sidebar | AppLayout 侧边栏 | 完整侧边栏框架，含 Sheet 移动端、Scroll Area |
| Command + Dialog | Header 搜索 | Command Dialog + Ctrl+K 触发 |
| Breadcrumb | ItemDetail 面包屑 | 替换手写 Link+span |
| Skeleton | App.tsx、ItemDetail 加载状态 | 替换纯文本"加载中" |
| Card | ItemCard、ItemDetail Section | 统一卡片样式 |
| Tooltip | ItemDetail StatRowWithTip | 替换手写 group-hover |
| Badge | ItemDetail MOD 标签 | 统一标签样式 |
| Button | 全局按钮 | 统一按钮变体 |
| DropdownMenu | 语言切换 | 替换手写 toggle 按钮 |
| Sonner (Toast) | ItemDetail 复制名称反馈 | 替换图标切换 |
| Empty | 无结果状态 | 替换纯文本提示 |
| Kbd | 搜索触发按钮快捷键提示 | 显示 Ctrl+K |
| Collapsible | 侧边栏分类树 | 替换手写 expand/collapse |
| Separator | 视觉分隔 | 内容区分隔线 |
| Scroll Area | 侧边栏滚动 | 美化滚动条 |

### 业务逻辑保护约束

- 所有数据 hooks（`useItems.ts`）不变
- 所有翻译映射表和 i18n 配置不变
- 所有业务规则（分类排序、弹药分组、属性展示逻辑）不变
- 颜色语义规范不变（正=蓝 `text-blue-400`、负=红 `text-red-400`）
- StatRow 布局规范不变（flex justify-between、shrink-0、text-right）
- Section 标题规范不变（护甲/头盔统一"性能"）

## Acceptance Criteria

- [ ] `components.json` 配置完成，`npx shadcn@latest add <component>` 可正常安装组件
- [ ] `src/components/ui/` 目录存在，包含所有 15 个组件
- [ ] 左侧菜单使用 shadcn Sidebar 组件，支持折叠/展开、图标、键盘导航
- [ ] 移动端侧边栏使用 Sheet 抽屉，滑动动画流畅
- [ ] 顶部 Header 包含搜索触发按钮（显示 Ctrl+K 提示）和语言切换 DropdownMenu
- [ ] Ctrl+K 打开 Command Dialog 搜索面板，支持键盘上下选择 + Enter 跳转
- [ ] ItemDetail 面包屑使用 shadcn Breadcrumb 组件
- [ ] 所有加载状态使用 Skeleton 骨架屏，不再出现纯文本"加载中"
- [ ] ItemDetail Tooltip 使用 shadcn Tooltip 组件
- [ ] ItemCard 和 ItemDetail Section 使用 shadcn Card 组件
- [ ] MOD 标签使用 shadcn Badge 组件
- [ ] 复制名称反馈使用 Sonner Toast
- [ ] 无结果状态使用 shadcn Empty 组件
- [ ] 搜索触发按钮快捷键提示使用 shadcn Kbd 组件
- [ ] `npm run build` 无 TypeScript 错误
- [ ] `npm run dev` 页面正常渲染，所有功能可正常使用

## Out of Scope

- 不增加浅色/亮色主题切换
- 不修改数据生成器（`generator/` 目录）
- 不修改数据 hooks 的业务逻辑（`useItems.ts`）
- 不修改翻译映射表内容
- 不增加新页面或新路由
- 不配置 shadcn MCP 服务器（使用 CLI 直接安装即可）
