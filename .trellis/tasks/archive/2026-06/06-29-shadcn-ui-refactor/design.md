# 技术设计：shadcn UI 组件化重构

## 1. shadcn/ui 初始化

### 1.1 components.json 配置

在项目根目录创建 `components.json`：

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- `style: "new-york"` — shadcn 默认风格，紧凑现代
- `rsc: false` — 非 React Server Components（纯 Vite SPA）
- `baseColor: "neutral"` — 与当前暗色主题兼容
- `iconLibrary: "lucide"` — 项目已使用 lucide-react

### 1.2 CSS 变量迁移

当前 `src/index.css` 使用 `@theme` 块直接定义颜色值。shadcn Tailwind v4 标准格式为 `@theme inline` + `:root` 双层结构。

**迁移方案**：

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  /* Sidebar 专用变量 */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

/* 仅暗色主题，值直接定义在 :root */
:root {
  --radius: 0.5rem;
  --background: #0a0a0a;
  --foreground: #e5e5e5;
  --card: #141414;
  --card-foreground: #e5e5e5;
  --popover: #141414;
  --popover-foreground: #e5e5e5;
  --primary: #4a7c59;
  --primary-foreground: #ffffff;
  --secondary: #1e1e1e;
  --secondary-foreground: #e5e5e5;
  --muted: #1e1e1e;
  --muted-foreground: #a3a3a3;
  --accent: #c9a84c;
  --accent-foreground: #0a0a0a;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #2a2a2a;
  --input: #2a2a2a;
  --ring: #4a7c59;
  /* Sidebar 变量 — 复用现有暗色值 */
  --sidebar: #0f0f0f;
  --sidebar-foreground: #e5e5e5;
  --sidebar-primary: #4a7c59;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1e1e1e;
  --sidebar-accent-foreground: #e5e5e5;
  --sidebar-border: #2a2a2a;
  --sidebar-ring: #4a7c59;
}
```

### 1.3 依赖安装

shadcn CLI 会自动安装所需依赖（`@radix-ui/*`、`cmdk`、`sonner`、`vaul` 等）。手动确认清单：

- `@radix-ui/react-slot` — Button
- `@radix-ui/react-tooltip` — Tooltip
- `@radix-ui/react-dropdown-menu` — DropdownMenu
- `@radix-ui/react-collapsible` — Collapsible
- `@radix-ui/react-separator` — Separator
- `@radix-ui/react-scroll-area` — Scroll Area
- `@radix-ui/react-dialog` — Dialog（Command 依赖）
- `cmdk` — Command
- `sonner` — Sonner/Toast
- `lucide-react` — 已安装

## 2. 布局架构重构

### 2.1 当前布局

```
<div className="flex min-h-screen">
  <Sidebar />              {/* 手写 aside */}
  <div className="flex-1">
    <Header />             {/* 手写 header */}
    <main>{children}</main>
  </div>
</div>
```

### 2.2 新布局（shadcn Sidebar 模式）

```
<SidebarProvider>
  <AppSidebar />           {/* shadcn Sidebar 组件 */}
  <SidebarInset>
    <Header />             {/* 精简 Header */}
    <main>{children}</main>
  </SidebarInset>
</SidebarProvider>
```

- `SidebarProvider` — 管理侧边栏状态（开/关、折叠），提供 `useSidebar()` hook
- `AppSidebar` — 封装 shadcn `Sidebar`，内含品牌区 + 分类树导航
- `SidebarInset` — 主内容区域容器，自动响应侧边栏开合

### 2.3 文件结构变更

```
src/components/
├── layout/
│   ├── AppLayout.tsx       # 修改：使用 SidebarProvider + SidebarInset
│   ├── AppSidebar.tsx      # 新增：shadcn Sidebar 封装 + 分类树
│   └── Header.tsx          # 新增：从 AppLayout 拆分，精简 Header
├── item/
│   ├── ItemCard.tsx        # 修改：使用 Card 组件
│   ├── ItemDetail.tsx      # 修改：Breadcrumb + Tooltip + Badge + Card + Skeleton + Sonner
│   └── AmmoPage.tsx        # 基本不变
├── ui/                     # 新增：shadcn 组件目录
│   ├── sidebar.tsx
│   ├── command.tsx
│   ├── dialog.tsx
│   ├── breadcrumb.tsx
│   ├── skeleton.tsx
│   ├── card.tsx
│   ├── tooltip.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── dropdown-menu.tsx
│   ├── sonner.tsx
│   ├── empty.tsx
│   ├── kbd.tsx
│   ├── collapsible.tsx
│   ├── separator.tsx
│   └── scroll-area.tsx
└── search/
    └── SearchCommand.tsx   # 新增：Command Dialog 搜索组件
```

## 3. 组件设计

### 3.1 AppSidebar — 侧边栏

```
<Sidebar>
  <SidebarHeader>
    <Link to="/">品牌 Logo: The Club Tarkov Wiki</Link>
  </SidebarHeader>
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>导航</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <Link to="/"><Home /> 首页</Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
    <SidebarGroup>
      <SidebarGroupLabel>分类</SidebarGroupLabel>
      <SidebarMenu>
        {sortedRootCategories.map(cat => (
          <CategoryMenuItem key={cat.id} category={cat} ... />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
</Sidebar>
```

**分类树实现**：
- 有子分类的节点使用 `SidebarMenuButton` + `Collapsible`（可折叠）
- 叶子节点（有道具的分类）直接 `Link` 到 `/category/:id`
- 每个根分类显示对应图标（使用 `category.icon` 字段映射到 lucide 图标或分类图片）
- 活跃状态通过 `useParams()` + `SidebarMenuButton isActive` 属性

**CategoryMenuItem 递归组件**：
```
function CategoryMenuItem({ category, childMap, lang, depth }) {
  const children = childMap.get(category.id) || []
  const hasChildren = children.length > 0

  if (hasChildren) {
    return (
      <Collapsible asChild>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              {category.name[lang]}
              <ChevronRight />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {children.map(child => (
                <CategoryMenuItem key={child.id} ... depth={depth+1} />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={`/category/${category.id}`}>
          {category.name[lang]}
          {category.itemCount > 0 && <SidebarMenuBadge>{category.itemCount}</SidebarMenuBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
```

### 3.2 SearchCommand — 搜索命令面板

```
function SearchCommand() {
  const [open, setOpen] = useState(false)
  const { index, loading, triggerLoad } = useSearchIndex()
  const { query, setQuery, results } = useSearch(index, lang)
  const navigate = useNavigate()

  // Ctrl+K 全局监听
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        triggerLoad()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [triggerLoad])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('search')} value={query} onValueChange={setQuery} />
      <CommandList>
        {loading && <CommandLoading>{t('loading')}</CommandLoading>}
        {results.length === 0 && query.trim() && (
          <CommandEmpty>{t('noResults')}</CommandEmpty>
        )}
        {results.map(item => (
          <CommandItem key={item.id} onSelect={() => { navigate(`/item/${item.id}`); setOpen(false) }}>
            <img src={item.image} ... />
            <span>{item.common.name[lang]}</span>
            <span className="text-muted-foreground">{getTypeNameZH(item.typeName)}</span>
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
```

### 3.3 Header — 顶部导航

```
function Header() {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
      <div className="flex items-center gap-3 px-4 py-2">
        {/* 移动端侧边栏触发 */}
        <SidebarTrigger className="lg:hidden" />

        {/* 搜索触发按钮 */}
        <Button variant="outline" onClick={() => setCommandOpen(true)}
          className="flex-1 max-w-xl justify-start text-muted-foreground">
          <Search size={16} className="mr-2" />
          {t('search')}
          <Kbd className="ml-auto">Ctrl K</Kbd>
        </Button>

        {/* 语言切换 DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Globe size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => i18n.changeLanguage('zh')}>中文</DropdownMenuItem>
            <DropdownMenuItem onClick={() => i18n.changeLanguage('en')}>English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

### 3.4 Breadcrumb — 面包屑

在 ItemDetail 内容区顶部替换手写面包屑：

```
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink asChild>
        <Link to="/">{t('allItems')}</Link>
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink asChild>
        <Link to={`/category/${category.id}`}>{category.name[lang]}</Link>
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>{common.name[lang]}</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### 3.5 Skeleton — 加载状态

**首页加载骨架**：
```
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
  {Array.from({ length: 12 }).map((_, i) => (
    <Skeleton key={i} className="h-24 rounded-lg" />
  ))}
</div>
```

**道具详情加载骨架**：
```
<div className="space-y-4">
  <Skeleton className="h-32 w-32 rounded-lg" />
  <Skeleton className="h-8 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Skeleton className="h-48 rounded-lg" />
    <Skeleton className="h-48 rounded-lg" />
  </div>
</div>
```

### 3.6 Card — 统一卡片

**ItemCard 使用 Card**：
```
<Card className="group overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all">
  <div className={`h-0.5 ${rarityColor}`} />
  <CardContent className="p-3">
    {/* 图片 */}
    {/* 名称 + 价格 */}
  </CardContent>
</Card>
```

**ItemDetail Section 使用 Card**：
```
function Section({ title, children }) {
  return (
    <Card>
      <CardHeader className="px-4 py-2.5 bg-secondary/50 border-b">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )
}
```

### 3.7 Tooltip — 属性提示

替换 StatRowWithTip 中的手写 group-hover：
```
<Tooltip>
  <TooltipTrigger asChild>
    <button><HelpCircle size={13} /></button>
  </TooltipTrigger>
  <TooltipContent>
    <p className="w-56">{tip}</p>
  </TooltipContent>
</Tooltip>
```

### 3.8 其他组件

- **Badge**：`<Badge variant="secondary">MOD</Badge>` 替换手写 span
- **Sonner**：在 `main.tsx` 添加 `<Toaster />`，复制时 `toast.success('已复制')` 替换图标切换
- **Empty**：`<Empty description={t('noResults')} />` 替换纯文本
- **Button**：所有手写 `<button>` 替换为 `<Button variant="...">`
- **Separator**：内容区域间的分隔线
- **Scroll Area**：侧边栏内嵌使用（Sidebar 组件内置）

## 4. 兼容性与迁移注意

1. **Tailwind CSS v4 + shadcn**：使用 `@theme inline` 而非 `@theme`，确保 shadcn 组件能正确解析 CSS 变量
2. **React 19**：shadcn 已支持 React 19，无需特殊处理
3. **Sidebar 状态持久化**：shadcn Sidebar 使用 cookie/localStorage 持久化开合状态，需确认在 SPA 中正常工作
4. **现有 CSS 变量值不变**：颜色值保持当前暗色主题值，仅改变声明方式
5. **硬编码颜色保留**：`text-blue-400`、`text-red-400` 等颜色语义不变（这些是 Tailwind 原生色，不依赖 CSS 变量）
6. **SidebarProvider 需包裹整个应用**：在 `AppLayout` 中提供
7. **Toaster 需挂载到根**：在 `main.tsx` 或 `App.tsx` 中添加 `<Toaster />`

## 5. 关于 shadcn MCP

用户询问是否配置 shadcn MCP 服务器。shadcn 提供了 MCP server 允许 AI 助手浏览和安装组件，但在本项目中我们已明确知道需要哪些组件，直接使用 `npx shadcn@latest add` CLI 命令安装即可，无需额外配置 MCP。如果后续需要探索更多组件，可以再配置。
