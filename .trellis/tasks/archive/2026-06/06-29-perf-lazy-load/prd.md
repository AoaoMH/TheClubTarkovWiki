# 性能优化：按需加载与请求去重

## Goal

重构数据加载架构，将全量加载改为按需加载，消除重复请求，大幅降低首屏数据量和加载时间。

## 当前问题（已确认）

1. **全量加载 30.44MB items.json**：进入任何页面都一次性加载全部 4000+ 道具数据
2. **重复请求 bug**：`useItems()` 被多处调用，React 18 StrictMode 下 effect 执行两次，导致请求 3 次（~100MB）
3. **搜索依赖全量数据**：Header 搜索框需要全量 items 才能工作
4. **categories.json (0.02MB) 与 items.json 捆绑加载**：侧边栏只需分类数据却触发全部加载

## 已确认决策

1. **生成器侧拆分**：修改 generator 按分类输出独立 JSON 文件
2. **两层数据模型**：列表摘要（summaries）+ 单道具详情（items）分离
3. **首页改为分类导航页**：仅展示分类卡片，不加载道具数据

## Requirements

1. **Generator 输出新数据结构**：
   - `data/categories.json` — 保持不变
   - `data/summaries/{categoryId}.json` — 每个分类的道具轻量摘要
   - `data/items/{itemId}.json` — 单个道具完整数据
   - `data/search-index.json` — 轻量搜索索引（id, name, shortName, image, typeName）
2. **前端按需加载**：
   - 首页仅加载 categories.json
   - 分类页加载对应 summaries 文件
   - 详情页加载单个 item 文件
   - 搜索加载 search-index.json
3. **请求去重**：使用 React Context + 缓存机制，确保同一数据不会重复请求
4. **已加载数据缓存**：返回已访问的分类时直接使用缓存，不重复请求

## Acceptance Criteria

- [ ] 首页加载数据量 < 50KB（仅 categories.json）
- [ ] 分类页加载数据量 < 2MB（单个 summaries 文件）
- [ ] 详情页加载数据量 < 100KB（单个 item 文件）
- [ ] 搜索索引 < 3MB
- [ ] 同一会话内不会重复请求已加载的数据
- [ ] React StrictMode 下不会导致重复请求
- [ ] 现有功能（分类浏览、搜索、弹药页、详情页）全部正常工作

## Out of Scope

- 服务器端渲染 (SSR)
- 数据压缩（gzip 由部署环境处理）
- 图片加载优化（已有独立图片文件）

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
