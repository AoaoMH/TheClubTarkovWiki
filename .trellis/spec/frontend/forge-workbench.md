# Forge Workbench Frontend Spec

改枪工作台前端，从 EFTForge 迁移，React/TypeScript 重写复用原始 CSS。

## 入口与路由

- 路由：`/forge/:gunId`（独立于 AppLayout 的全屏体验）
- 入口：`ItemDetail.tsx` 中武器类型显示"改枪模拟"按钮
- 状态管理：Zustand (`useForgeStore`)

## 组件结构

```
src/components/forge/
├── ForgeWorkbench.tsx    # 主页面（路由组件）
├── AttachmentGrid.tsx    # 网格视图（CSS Grid 布局）
├── TreeView.tsx          # 列表/树视图
├── SlotSelector.tsx      # 配件选择器（列表+图表切换）
├── StatsPanel.tsx        # 属性面板（进度条+hover预览）
├── agOverrides.ts        # 1012个手动槽位定位覆盖
├── forge.css             # 从 EFTForge 提取的原始 CSS（~7000行）
└── assets/               # 字体+占位图
```

## CSS 规范

### Tailwind 类名冲突

> **Warning**: Tailwind 的 `.container` 工具类设置 `max-width: 1280px`，与 forge.css 的 `.container` 冲突。
>
> 必须使用 `.forge-root .container` 选择器覆盖：
> ```css
> .forge-root .container {
>   max-width: none;
>   width: 100%;
> }
> ```

### forge.css 作用域

- `html, body` 样式改为 `.forge-root` 作用域
- 禁止在 forge 组件中使用内联 style（必须用 forge.css 类名）
- 新增样式追加到 forge.css 末尾，标注 `/* FORGE PAGE SPECIFIC */`

## 网格定位算法

`AttachmentGrid.tsx` 中的 `computeGridPositions()`：
1. 检查 `_AG_OVERRIDES`（1012个手动覆盖）
2. 按 slot display name 匹配位置（左队列/上/下/底部/extras）
3. 父级相对定位：嵌套插槽根据父级位置向下/上扩展
4. 碰撞检测：`placeAt(col, vrow)` 自动避开已占用位置

### 关键常量

```
GUN_COL = 7        // 枪械在第7列
STOCK_COL = 10     // 枪托在第10列
LEFT_ORDER = ['Receiver', 'Handguard', 'Catch', 'Barrel', 'Gas Block', 'Muzzle']
EXTRAS = Set(['Grip', 'Shroud', 'Trigger', 'Chamber', 'Hammer'])
```

## 图表视图（散点图）

`SlotSelector.tsx` 中的 graph 模式：

### 数据映射
- X 轴：`recoilPercent` = `recoil × 100`（后坐力修正百分比，lowerBetter）
- Y 轴：`ergonomicsModifier`（人机修正值，higherBetter）
- 坐标轴方向反转：`lowerBetter` 的指标低值在右/上（右上方=更好）

### SVG 内嵌控件
- 三个控制按钮：⊕ 准线 / A 标签 / ? 提示
- 垂直缩放滑块（1.0~2.0，步进 0.05）
- 所有状态 localStorage 持久化

### 交互
- 悬停：hovered 点高亮，其他点 `opacity: 0.2`（`.has-hover` CSS 类）
- 点击：切换到列表视图 + 滚动定位到对应行（`data-item-id` + `scrollIntoView`）
- 图标：使用本地图片（`item.image`），尺寸 14px，不遮挡黄点
- Tooltip：SVG 内 `<g>` 元素，跟随数据点位置

### 对比模式
- 仅列表视图有对比按钮（图表视图中隐藏）
- 点击配件设为基准（不安装），基准行高亮（青色）
- 图表本身无对比模式（数据本身就是相对修正值）

## 属性面板

`StatsPanel.tsx`：
- 进度条：人机/垂直后坐力/水平后坐力（`.stat-bar-row` / `.stat-bar-fill`）
- hover 预览：鼠标悬停配件时实时计算属性变化
- 颜色语义：后坐力降低=绿色，增加=红色；人机增加=绿色，减少=红色
- 手臂耐力：`233.65 / (weight + 0.83) + 0.185 * ergo + 23.16`
- 隐藏属性：展开/折叠（CSS 动画过渡）

## 弹药选择器

- 位置：`#stats` 内，属性面板上方
- 装满弹匣开关（`.compare-toggle`）+ 弹药下拉（`.custom-select-wrapper`）
- 装满弹匣时：重量 = 弹药重量 × 弹匣容量（后端计算）
- 弹药按穿透力排序，显示全名+伤害/穿透+重量

## 功能范围（已移除）

以下功能已从迁移范围中移除：
- 图片合成预览（BuildPreview）— 依赖外部 Playwright 服务，过于复杂
- Combo BFS 搜索 — 用户决定移除
- 社区功能（评分/评论/排行榜）
- EvoErgo(EED)/过摆 — 竞技场属性，本项目无此数据

## 保留的功能

- 网格视图 + 树状视图（切换）
- 配件选择器（列表+图表切换）
- 属性计算 + hover 预览
- 冲突检测
- 弹药选择 + 装满弹匣重量
- 价格显示（tarkov.dev 代理）
- 工厂预设自动加载
- 撤销/重做
- 分享链接（LZ-String 压缩）
- 收藏（localStorage）
- 预设保存（localStorage）
- 右键拆除配件
