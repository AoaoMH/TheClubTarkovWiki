# 任务系统接入 PRD

## 目标
将 SPT 客户端的任务（Quest）系统接入 Wiki，提供任务列表页和详情页，方便玩家查阅所有任务信息。

## 数据来源
- **任务定义**: `SPT_Data/database/templates/quests.json` (558个任务)
- **任务-NPC映射**: 各 Trader 目录下的 `questassort.json`
- **NPC信息**: 各 Trader 的 `base.json` + 国际化 locale
- **任务名/描述翻译**: `locales/global/ch.json` / `en.json`，key格式: `{questId} name` / `{questId} description`
- **奖励物品名**: 通过 `_tpl` 关联 items 数据获取

## 已确认事实

### 任务数据结构
```
Quest {
  _id, QuestName, traderId, type, location, image,
  description (locale key), note (locale key),
  conditions: {
    AvailableForFinish: [...],  // 完成条件
    AvailableForStart: [...],   // 前置条件(含前置任务)
    Fail: [...]
  },
  rewards: {
    Success: [...],   // 完成奖励
    Started: [...],
    Fail: [...]
  }
}
```

### 任务类型 (13种)
Elimination, PickUp, Completion, Discover, Loyalty, Exploration, Multi, Skill, Merchant, WeaponAssembly, Standing, Experience

### NPC (11个)
Prapor, Therapist, Skier, Peacekeeper, Mechanic, Ragman, Jaeger, Fence, Lightkeeper, BTR司机, 竞技场裁判

### 条件类型 (28种)
CounterCreator, Kills, HandoverItem, FindItem, VisitPlace, ExitName, ExitStatus, Level, Quest, Skill, Location, InZone, LeaveItemAtLocation, PlaceBeacon, Shots, Equipment, HealthEffect, HealthBuff, HideoutArea, Time, TraderLoyalty, TraderStanding, SellItemToTrader, UseItem, WeaponAssembly, LaunchFlare, UnderArtilleryFire, GlobalVariableValue

### 奖励类型 (13种)
Experience, TraderStanding, Item, AssortmentUnlock, CustomizationDirect, ProductionScheme, Skill, Achievement, TraderUnlock, NotificationPopup, TraderStandingRestore, Pockets, WebPromoCode

### 前置任务
在 `conditions.AvailableForStart` 中，`conditionType === 'Quest'` 的条目，`target` 为前置任务ID，`status: [4,5]` 表示需完成。

### 后续任务
需要反向查找：遍历所有任务，找到以当前任务为前置的任务。

### 击杀武器限制
在 CounterCreator -> counter.conditions -> Kills 条件中，`weapon` 数组包含武器模板ID列表。

## 已决策

### Q1: 筛选栏布局
**结论**: 第一行放两个 Toggle Group（NPC + 任务类型），第二行放两个 Input（任务名称 + 奖励搜索）。筛选组件使用 shadcn Toggle Group 实现类 antd Radio.Group button 样式。

### Q2: 奖励展示分级
**结论**: 表格中主要展示 Item + Experience + TraderStanding 三类，其余类型用"更多"标签提示，HoverCard/详情页展示完整列表。
- TraderStanding 正值用绿色显示（如 +0.02），负值用红色显示（如 -0.01）

### Q3: 表格组件选型
**结论**: 使用 DataTable（Table + @tanstack/react-table），声明式列定义，内置排序/分页，外部筛选 UI 通过 setGlobalFilter / setColumnFilters 对接。作为后续其他列表页的通用模板。

### Q4: 详情页布局
**结论**: 描述文本紧跟标题下方，不折叠。整体结构：
1. 标题区：任务名称 + NPC 副标题
2. 描述：NPC 任务描述文本
3. 类型/地点 Badge + 信息卡片（奖励、前置/后续任务）
4. 任务目标区域（主体内容，按目标类型分块渲染）

### Q5: 分页策略
**结论**: 默认 50 条/页，可切换 20/50/100。

## 需求

### 导航
- 在侧边栏"首页"下方新增"任务"菜单项

### 任务列表页（新样式模板）
- **筛选栏**:
  - 第一行: NPC Toggle Group + 任务类型 Toggle Group
  - 第二行: 任务名称 Input + 奖励搜索 Input
- **表格**:
  - 任务名称、NPC、任务类型、任务奖励（过多省略+HoverCard展示完整）、操作（详情按钮）

### 任务详情页
- 基础信息: 名称、NPC、类型、奖励
- 任务目标: 根据条件类型分别渲染（击杀含武器列表、上交物品、探索地点等）
- 前置任务: 可点击跳转
- 后续任务: 可点击跳转

## 验收标准
- [ ] 侧边栏显示任务菜单，位于首页下方
- [ ] 列表页展示所有558个任务
- [ ] 4种筛选功能正常工作
- [ ] 详情页正确渲染各类任务目标
- [ ] 前置/后续任务可点击跳转
- [ ] 中英文双语支持
