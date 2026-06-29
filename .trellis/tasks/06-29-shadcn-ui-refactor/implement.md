# 执行计划：shadcn UI 组件化重构

## 实施顺序

### Task 1: shadcn/ui 初始化与 CSS 迁移

**目标**：建立 shadcn/ui 基础设施

**步骤**：
1. 创建 `components.json`（见 design.md §1.1）
2. 运行 `npx shadcn@latest init` 确认配置（可能需要 `--yes` 跳过交互）
3. 迁移 `src/index.css`：从 `@theme` 改为 `@theme inline` + `:root`（见 design.md §1.2）
4. 添加 `--color-destructive-foreground` 和 sidebar 系列变量
5. 安装所有 15 个组件：
   ```bash
   npx shadcn@latest add sidebar command dialog breadcrumb skeleton card tooltip badge button dropdown-menu sonner empty kbd collapsible separator scroll-area
   ```
6. 确认 `src/components/ui/` 目录下所有组件文件存在
7. 确认 `package.json` 中新增了 `@radix-ui/*`、`cmdk`、`sonner` 等依赖

**验证**：
- `npm run build` 无报错
- `src/components/ui/` 下有 17 个 .tsx 文件

**风险**：shadcn CLI 可能因 Tailwind v4 配置差异报错，需手动调整 CSS 格式

---

### Task 2: 布局重构 — SidebarProvider + SidebarInset

**目标**：将 AppLayout 改为 shadcn Sidebar 模式

**文件**：`src/components/layout/AppLayout.tsx`

**步骤**：
1. 将现有 `AppLayout.tsx` 中的 `Sidebar` 和 `Header` 组件导出保留，但重构 `AppLayout` 函数
2. `AppLayout` 改为：
   ```tsx
   <SidebarProvider>
     <AppSidebar />
     <SidebarInset>
       <Header />
       <main className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full">
         {children}
       </main>
     </SidebarInset>
   </SidebarProvider>
   ```
3. 删除旧的 `Sidebar` 函数（被 `AppSidebar` 替代）
4. 保留旧 `Header` 函数临时使用（Task 4 中重构）

**验证**：
- `npm run dev` 页面加载，侧边栏显示（即使内容未完善）
- 移动端汉堡菜单可用

---

### Task 3: AppSidebar — 分类树导航

**目标**：用 shadcn Sidebar 组件实现完整分类树

**新文件**：`src/components/layout/AppSidebar.tsx`

**步骤**：
1. 创建 `AppSidebar` 组件，使用 `Sidebar`、`SidebarHeader`、`SidebarContent`、`SidebarGroup`、`SidebarMenu`
2. `SidebarHeader` 放品牌标题 `The Club Tarkov Wiki`（Link to `/`）
3. `SidebarContent` 放两个 `SidebarGroup`：
   - 导航组：首页链接
   - 分类组：排序后的根分类列表
4. 创建 `CategoryMenuItem` 递归组件（见 design.md §3.1）：
   - 有子分类：`Collapsible` + `SidebarMenuSub`
   - 无子分类：`SidebarMenuButton asChild` + `Link`
   - 活跃状态：`useParams()` 匹配 + `isActive`
   - 道具数量：`SidebarMenuBadge`
5. 保留 `ROOT_ORDER` 常量和排序逻辑不变
6. 使用 `Scroll Area`（Sidebar 内置）替代手动 overflow
7. 移动端 Sheet 由 Sidebar 组件自动处理

**验证**：
- 侧边栏显示所有分类，可展开/折叠子分类
- 点击叶子分类跳转到 `/category/:id`
- 当前分类高亮
- 移动端汉堡菜单打开侧边栏 Sheet

---

### Task 4: Header + SearchCommand — 搜索命令面板

**目标**：精简 Header + Ctrl+K 搜索

**新文件**：`src/components/search/SearchCommand.tsx`、`src/components/layout/Header.tsx`

**步骤**：
1. 创建 `SearchCommand` 组件（见 design.md §3.2）：
   - `useState` 控制 open
   - `useEffect` 监听 `Ctrl+K`（`e.ctrlKey && e.key === 'k'`）
   - 使用 `useSearchIndex` + `useSearch` hooks（不变）
   - `CommandDialog` + `CommandInput` + `CommandList` + `CommandItem`
   - 选中时 `navigate('/item/:id')` + `setOpen(false)`
   - 加载中显示 `CommandLoading`（可用 Spinner 或 Skeleton）
2. 创建 `Header` 组件（见 design.md §3.3）：
   - `SidebarTrigger`（移动端）
   - 搜索触发 `Button`（outline variant，显示搜索图标 + "搜索..." + `Kbd` 显示 Ctrl K）
   - 点击打开 `SearchCommand`
   - 语言切换 `DropdownMenu`（中文 / English）
3. 在 `AppLayout` 中将 `SearchCommand` 渲染在 `Header` 内或 `SidebarInset` 内
4. 删除旧 `Header` 函数中的手写搜索输入框和下拉结果

**验证**：
- Header 显示搜索按钮（带 Ctrl K 提示）和语言切换
- Ctrl+K 打开 Command Dialog
- 输入搜索词，显示结果列表
- 键盘上下选择 + Enter 跳转道具详情
- 语言切换正常工作

---

### Task 5: ItemDetail 组件化

**目标**：替换 ItemDetail 中的手写组件

**文件**：`src/components/item/ItemDetail.tsx`

**步骤**：
1. **Breadcrumb**：替换手写面包屑（L417-427）为 shadcn `Breadcrumb`（见 design.md §3.4）
2. **Skeleton**：替换 `loading` 分支（L355-357）为骨架屏
3. **Card**：替换 `Section` 组件（L70-79）为 shadcn `Card` + `CardHeader` + `CardContent`
4. **Tooltip**：替换 `StatRowWithTip` 中的手写 tooltip（L37-43）为 shadcn `Tooltip`
5. **Badge**：替换 MOD 标签（L445-448）为 `<Badge variant="secondary">MOD</Badge>`
6. **Sonner**：替换复制名称反馈（L374-379）为 `toast.success()`，删除 `copied` state
7. **Button**：替换返回按钮和复制按钮为 shadcn `Button`
8. **Empty**：替换 `!item` 空状态（L359-368）为 `<Empty>`

**保留不变**：
- 所有 StatRow、ColoredStatRow、EffectRow 的业务逻辑和布局
- 所有翻译映射表（`*_ZH` 常量）
- 所有属性展示条件判断
- 颜色语义（`text-blue-400`、`text-red-400`）

**验证**：
- 道具详情页正常渲染所有属性区域
- 面包屑正确显示路径
- 加载时显示骨架屏
- Tooltip hover 正常显示
- MOD 标签使用 Badge 样式
- 复制名称显示 Toast 通知
- 返回按钮使用 Button 组件

---

### Task 6: ItemCard + 首页组件化

**目标**：替换卡片和无结果状态

**文件**：`src/components/item/ItemCard.tsx`、`src/App.tsx`

**步骤**：
1. `ItemCard`：外层换为 shadcn `Card`，内部结构和样式保留
2. `ItemGrid` 空状态：替换为 `<Empty description={t('noResults')} />`
3. `HomePage` 加载状态：替换为 Skeleton 网格
4. `HomePage` 分类卡片：保持手写（分类卡片与 shadcn Card 差异较大，可选用 Card）

**验证**：
- 道具列表卡片正常显示
- 空状态显示 Empty 组件
- 首页加载显示骨架屏

---

### Task 7: 全局收尾

**目标**：Toaster 挂载 + 最终验证

**步骤**：
1. 在 `src/main.tsx` 或 `src/App.tsx` 中添加 `<Toaster />` 组件
2. 在 `src/index.css` 中保留自定义滚动条样式（与 Scroll Area 共存）
3. 检查所有 `Button` 替换是否完整（语言切换、搜索触发、移动端菜单等）
4. 检查 `Separator` 使用位置（内容区域间分隔）
5. 删除不再使用的旧代码（手写搜索下拉、手写 overlay 等）

**验证**：
- `npm run build` 无 TypeScript 错误
- `npm run dev` 全功能测试：
  - 首页加载 + 分类导航
  - 侧边栏展开/折叠 + 导航
  - Ctrl+K 搜索 + 键盘选择
  - 道具详情页所有属性区域
  - 语言切换
  - 移动端侧边栏
  - 复制名称 Toast
  - Tooltip hover
  - 面包屑导航

---

## 验证命令

```bash
# TypeScript 编译检查
npm run build

# 开发服务器
npm run dev

# shadcn 组件列表确认
ls src/components/ui/
```

## 风险文件

| 文件 | 风险 | 回滚点 |
|---|---|---|
| `src/index.css` | CSS 变量格式迁移可能导致样式失效 | 保留旧 `@theme` 块备份 |
| `src/components/layout/AppLayout.tsx` | 布局结构大改 | 保留旧文件 git 版本 |
| `src/components/item/ItemDetail.tsx` | 大量组件替换，可能遗漏 | 逐个 section 替换，每次验证 |
| `package.json` | 新增依赖可能冲突 | `git checkout package.json` |

## 预估工作量

- Task 1（初始化）：1 次对话
- Task 2（布局重构）：1 次对话
- Task 3（AppSidebar）：1-2 次对话
- Task 4（Header + Search）：1-2 次对话
- Task 5（ItemDetail）：2-3 次对话（最大文件）
- Task 6（ItemCard + 首页）：1 次对话
- Task 7（收尾验证）：1 次对话
