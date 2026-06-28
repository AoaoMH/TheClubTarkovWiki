# SPT Wiki 实施计划

## Task 1: 项目初始化
- [ ] 使用 Vite 初始化 React + TypeScript 项目
- [ ] 安装依赖: tailwindcss, @tailwindcss/vite, react-router-dom, react-i18next, i18next, lucide-react
- [ ] 安装并配置 shadcn/ui (dark theme)
- [ ] 配置 TailwindCSS 暗色主题
- [ ] 创建基本目录结构

## Task 2: 数据生成器 - 核心框架
- [ ] 初始化 `generator/` 项目 (package.json, tsconfig.json)
- [ ] 实现 config.ts (SPT客户端路径配置)
- [ ] 实现 items.ts reader (读取 items.json, AsHashTable)
- [ ] 实现 handbook.ts reader (读取 handbook.json)
- [ ] 实现 locales.ts reader (读取 ch.json + en.json)
- [ ] 实现类型层级构建 (types.ts processor)

## Task 3: 数据生成器 - Mod支持
- [ ] 实现 mods.ts reader (扫描 CustomItems + CustomLocales)
- [ ] 实现 merge.ts (clone + override 合并逻辑)
- [ ] 实现 normalize.ts (属性归一化、过滤系统节点)
- [ ] 实现 categories.ts (手册分类树构建)

## Task 4: 数据生成器 - 输出与图片
- [ ] 实现 writer.ts (输出 items.json, categories.json, types.json)
- [ ] 实现 images/downloader.ts (SPT API + tarkov.dev fallback)
- [ ] 实现增量更新逻辑 (跳过已存在的图片)
- [ ] 实现 index.ts 主流程编排
- [ ] 配置 CLI 入口: `npm run generate`

## Task 5: 生成器验证
- [ ] 运行生成器，验证输出数据完整性
- [ ] 检查道具数量是否包含所有mod道具
- [ ] 验证分类树结构正确
- [ ] 验证图片下载正常

## Task 6: 前端 - 布局框架
- [ ] 实现 AppLayout (侧边栏 + 顶栏 + 内容区)
- [ ] 实现 Header (搜索栏 + 语言切换按钮)
- [ ] 实现 Sidebar (分类导航树, 可折叠)
- [ ] 配置 React Router 路由
- [ ] 配置 i18n (zh/en 界面翻译)

## Task 7: 前端 - 道具展示
- [ ] 实现 ItemCard 组件 (道具卡片)
- [ ] 实现 ItemGrid 组件 (卡片网格布局)
- [ ] 实现分类页 (/category/:id)
- [ ] 实现搜索功能 (中英文名称模糊搜索)

## Task 8: 前端 - 道具详情页
- [ ] 实现 ItemDetail 通用信息区
- [ ] 实现 WeaponProps (武器属性展示)
- [ ] 实现 AmmoProps (弹药属性展示)
- [ ] 实现 ArmorProps (护甲属性展示)
- [ ] 实现 MedicalProps (医疗属性展示)
- [ ] 实现 ModProps (改装件属性展示)
- [ ] 实现 FoodDrinkProps (食物饮料属性展示)
- [ ] 实现配件槽位可视化

## Task 9: 前端 - 样式打磨
- [ ] 暗色军事主题调色
- [ ] 稀有度颜色系统
- [ ] 响应式布局适配
- [ ] 占位图组件 (无图片时的fallback)
- [ ] 加载状态和空状态处理

## Task 10: 集成测试与部署准备
- [ ] 端到端验证: 生成数据 → 前端展示
- [ ] 构建优化 (代码分割、图片压缩)
- [ ] Vite build 验证
- [ ] 部署配置
