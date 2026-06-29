# Generator Spec

Node.js + TypeScript 数据生成器，读取 SPT 客户端数据输出前端所需的 JSON。

## 运行方式

```bash
cd generator
npm install
npx tsx src/index.ts              # 完整生成（含图片下载）
npx tsx src/index.ts --skip-images # 仅数据，跳过图片
npx tsx src/index.ts --images-only # 仅更新图片
```

## 数据流

```
SPT客户端目录 → readers/ → processors/ → output/ → public/data/
tarkov.dev API → images/downloader → public/images/items/
```

## 输出结构（三层模型）

```
public/data/
├── categories.json          # 分类树（含 previewImage: 首个道具图片）
├── summaries/{catId}.json   # 分类道具摘要（ItemSummary 数组，列表用）
├── items/{itemId}.json      # 单道具完整数据（WikiItem，详情用）
├── search-index.json        # 搜索索引（全部 ItemSummary 数组）
├── types.json               # 类型层级树
└── stats.json               # 生成统计信息
```

### ItemSummary 结构

轻量摘要，用于列表卡片和搜索：

```typescript
interface ItemSummary {
  id: string
  typeName: string
  category: string
  handbook: { categoryId: string | null; price: number }
  common: { name: LocalizedText; shortName: LocalizedText; rarity: string }
  image: string | null
  ammo?: { caliber, penetrationPower, damage, armorDamage }  // 弹药页分组/排序用
}
```

### previewImage

分类卡片使用首个道具图片作为预览图。在 `buildCategories()` 中初步填充，
在图片加载完成后（Step 9 写入前）再次更新确保正确。

## 关键文件

| 文件 | 职责 |
|------|------|
| `config.ts` | 所有路径常量（SPT客户端路径、输出路径） |
| `types.ts` | SPT原始类型 + Wiki输出类型定义 |
| `readers/items.ts` | 读取 items.json + globals.json（stim buffs） |
| `readers/handbook.ts` | 读取 handbook.json |
| `readers/locales.ts` | 读取 ch.json + en.json |
| `readers/mods.ts` | 扫描 mods/*/db/CustomItems + CustomLocales |
| `processors/types.ts` | 构建类型继承树 |
| `processors/merge.ts` | 合并 base + mod 数据（clone+override） |
| `processors/normalize.ts` | 属性归一化、类型分类、效果解析 |
| `processors/categories.ts` | 手册分类树 + 硬编码分类名翻译 |
| `images/downloader.ts` | tarkov.dev CDN 图片下载 + 缓存复用 |
| `output/writer.ts` | 写入 JSON 到 public/data/ |

## Mod 数据处理

Mod 道具使用 `itemTplToClone` + `overrideProperties` 模式：
1. 从 base items.json 克隆模板
2. 应用 overrideProperties 覆盖
3. 合并 CustomLocales 翻译
4. 标记 `isMod: true`，图片下载时跳过

## 口径格式

游戏数据中口径为紧凑格式（无点无空格）：`545x39`、`762x39`、`556x45NATO`。
分类映射和显示名映射在前端 `AmmoPage.tsx` 中维护。

## 效果数据

- `effects_health` → 属性变化（能量/水分/治疗状态）
- `effects_damage` → 状态移除/造成
- `StimulatorBuffs` → 引用 globals.json 的 buff 定义（`config.Health.Effects.Stimulator.Buffs`）

## 部署注意事项

> **Warning**: `public/images/items/` 必须提交到 git，不能被 .gitignore 排除。
>
> 服务器通过 `git pull` 获取图片，如果 .gitignore 排除了图片目录，部署后图片会 404。

### previewImage 时序问题

`buildCategories()` 在 Step 6 执行，但图片路径在 Step 8 才填充。
因此 previewImage 需要在 Step 9 写入前再次更新（在 index.ts 中处理）。
