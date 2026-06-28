# SPT Wiki 技术设计文档

## 项目结构

```
TheClubWiki/
├── generator/              # 数据生成器 (Node.js + TypeScript)
│   ├── src/
│   │   ├── index.ts        # 入口
│   │   ├── config.ts       # 配置（SPT客户端路径等）
│   │   ├── readers/
│   │   │   ├── items.ts    # 读取 items.json
│   │   │   ├── handbook.ts # 读取 handbook.json
│   │   │   ├── locales.ts  # 读取 locales (ch/en)
│   │   │   └── mods.ts     # 扫描并读取 mod CustomItems/CustomLocales
│   │   ├── processors/
│   │   │   ├── types.ts    # 道具类型层级解析
│   │   │   ├── merge.ts    # 合并 base + mod 数据
│   │   │   ├── normalize.ts# 属性归一化、按类型分组
│   │   │   └── categories.ts # 手册分类树构建
│   │   ├── images/
│   │   │   └── downloader.ts # 图片下载（SPT服务器API + fallback）
│   │   └── output/
│   │       └── writer.ts   # 输出JSON和图片到前端目录
│   ├── package.json
│   └── tsconfig.json
├── src/                    # React前端
│   ├── App.tsx
│   ├── main.tsx
│   ├── data/               # 生成的JSON数据（由生成器输出）
│   │   ├── items.json      # 所有道具数据
│   │   ├── categories.json # 分类树
│   │   └── types.json      # 类型定义
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      # 主布局（侧边栏+内容区）
│   │   │   ├── Sidebar.tsx        # 分类导航树
│   │   │   └── Header.tsx         # 顶部栏（搜索+语言切换）
│   │   ├── item/
│   │   │   ├── ItemCard.tsx       # 道具卡片（列表视图）
│   │   │   ├── ItemGrid.tsx       # 道具卡片网格
│   │   │   ├── ItemDetail.tsx     # 道具详情页
│   │   │   └── properties/
│   │   │       ├── CommonProps.tsx    # 通用属性
│   │   │       ├── WeaponProps.tsx    # 武器属性
│   │   │       ├── AmmoProps.tsx      # 弹药属性
│   │   │       ├── ArmorProps.tsx     # 护甲属性
│   │   │       ├── MedicalProps.tsx   # 医疗属性
│   │   │       ├── ModProps.tsx       # 改装件属性
│   │   │       └── FoodDrinkProps.tsx # 食物饮料属性
│   │   └── ui/             # shadcn/ui 组件
│   ├── hooks/
│   │   ├── useItems.ts     # 道具数据hook
│   │   └── useLocale.ts    # 语言切换hook
│   ├── i18n/
│   │   ├── index.ts        # i18n配置
│   │   ├── zh.json         # 界面中文翻译
│   │   └── en.json         # 界面英文翻译
│   └── lib/
│       └── utils.ts        # 工具函数
├── public/
│   └── images/
│       ├── items/          # 道具图标（由生成器下载）
│       └── categories/     # 分类图标（由生成器复制）
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── index.html
```

## 数据流设计

### 生成器数据流

```
SPT客户端目录
├── items.json ──────────┐
├── handbook.json ───────┤
├── locales/ch.json ─────┤
├── locales/en.json ─────┤→ 读取 → 合并 → 归一化 → 输出
├── mods/*/CustomItems/ ─┤                           ├─ src/data/items.json
├── mods/*/CustomLocales/┤                           ├─ src/data/categories.json
└── images/handbook/ ────┘                           ├─ src/data/types.json
                                                     ├─ public/images/items/*.png
SPT服务器API (图片)                                   └─ public/images/categories/*.png
```

### 生成器处理流程

1. **读取基础数据**
   - 解析 `items.json` (AsHashTable, 因为有大小写冲突的key)
   - 解析 `handbook.json` 获取分类和价格
   - 解析 `locales/global/ch.json` 和 `en.json`

2. **构建类型层级**
   - 从 `_type=Node` 的条目构建类型继承树
   - 每个道具通过 `_parent` 链确定其最终类型（Weapon/Armor/Ammo等）

3. **扫描Mod数据**
   - 遍历 `SPT/user/mods/*/db/CustomItems/*.json`
   - 对每个mod道具: 找到 `itemTplToClone` 的基础模板，clone后应用 `overrideProperties`
   - 遍历 `SPT/user/mods/*/db/CustomLocales/*.json` 合并翻译

4. **归一化输出**
   - 过滤掉系统节点类型（Inventory, Pockets, Stash等）
   - 按道具类型分组属性
   - 输出结构化JSON

### 生成的 items.json 数据结构

```typescript
interface WikiItem {
  id: string;              // 道具ID
  type: ItemType;          // 归一化类型 (weapon/ammo/armor/medical/mod/food/...)
  parentType: string;      // 原始类型名 (AssaultRifle, Ammo, Armor, ...)
  handbook: {
    categoryId: string;    // 手册分类ID
    price: number;         // 手册价格
  };
  common: {
    name: { zh: string; en: string };
    shortName: { zh: string; en: string };
    description: { zh: string; en: string };
    weight: number;
    width: number;
    height: number;
    rarity: string;
    backgroundColor: string;
  };
  properties: {
    weapon?: WeaponProps;
    ammo?: AmmoProps;
    armor?: ArmorProps;
    medical?: MedicalProps;
    mod?: ModProps;
    foodDrink?: FoodDrinkProps;
    // ... 其他类型
  };
  slots?: SlotInfo[];       // 配件槽位 (武器/护甲)
  compatibleItems?: string[];// 兼容的道具ID列表
  image: string | null;     // 图片路径
}
```

### 图片获取策略

**优先级1: SPT服务器API**
- SPT服务器运行时，通过 `http://localhost:6969/files/raid/items/{itemId}.png` 下载
- 支持mod道具图片（如果mod有提供bundle且SPT已缓存）

**优先级2: tarkov.dev API**
- 通过GraphQL查询 `items { id iconLink }` 获取原版道具图片URL
- 下载并缓存

**Fallback: 占位图**
- 无法获取图片的mod道具，前端显示带道具名称首字母的占位卡片

## 前端架构

### 路由设计
- `/` — 首页，展示所有分类概览
- `/category/:id` — 分类页，展示该分类下所有道具（卡片网格）
- `/item/:id` — 道具详情页

### 状态管理
- 数据为静态JSON，无需复杂状态管理
- React Context 管理语言切换 (zh/en)
- URL参数管理分类筛选和搜索状态

### 国际化
- 界面文本: react-i18next (zh.json/en.json)
- 道具名称/描述: 直接从数据JSON中取对应语言字段
- 默认语言: 中文

### UI设计

**整体风格**: 暗色军事主题
- 背景: 深灰色系 (#0a0a0a ~ #1a1a1a)
- 强调色: 军绿/战术金
- 卡片: 半透明深色背景 + 微边框
- 字体: 清晰易读的无衬线体

**布局**:
- 顶部: 搜索栏 + 语言切换 + 站名
- 左侧: 分类导航树（可折叠）
- 主内容区: 道具卡片网格 / 道具详情

**道具卡片**:
- 道具图标 (居中)
- 道具名称 (下方)
- 稀有度颜色指示条
- 悬浮时显示简要属性

**道具详情页**:
- 顶部: 大图 + 名称 + 描述 + 通用属性
- 中部: 按类型分组的详细属性表格
- 底部: 配件槽位 / 兼容道具

## 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 生成器语言 | TypeScript (Node.js) | 与前端共用工具链 |
| 图片获取 | SPT API优先 + tarkov.dev fallback | mod支持 + 覆盖率 |
| 路由 | React Router (client-side) | 纯静态SPA |
| 数据格式 | 单个大JSON + 按需加载 | 简单、无需后端 |
| 国际化 | react-i18next | 成熟方案，轻量 |
