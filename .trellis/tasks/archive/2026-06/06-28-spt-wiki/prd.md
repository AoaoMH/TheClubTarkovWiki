# SPT Wiki 项目 PRD

## 目标
为个人塔科夫SPT私服搭建一个完整的道具Wiki网站，展示游戏内所有道具的详细属性和数值。

## 核心价值
- 用户安装了大量mod并修改了数值，网上公开wiki数据与实际游戏不一致
- 需要一个能准确反映本地SPT客户端（含mod）数据的个人wiki

## 架构概述

### 前端（React静态站点）
- 纯静态React项目，部署到云服务器
- 零运行时依赖，不连接SPT服务器
- 所有数据以JSON静态资源形式打包

### 数据生成器（本地工具）
- 独立的Node.js脚本/项目
- 读取SPT客户端数据文件（items.json, handbook.json, locales）
- 扫描mods目录下的CustomItems和CustomLocales
- 通过SPT服务器API下载道具图片，缓存到本地
- 输出结构化的JSON数据 + 图片资源到React项目的指定目录

## 数据源

### 基础数据（SPT客户端）
- `SPT_Data/database/templates/items.json` — ~4462个道具 + 120个类型节点
- `SPT_Data/database/templates/handbook.json` — 游戏内手册分类系统
- `SPT_Data/database/locales/global/ch.json` — 中文翻译
- `SPT_Data/database/locales/global/en.json` — 英文翻译
- `SPT_Data/images/handbook/` — 分类图标

### Mod数据
- `SPT/user/mods/*/db/CustomItems/*.json` — mod新增/修改的道具（clone+override模式）
- `SPT/user/mods/*/db/CustomLocales/*.json` — mod翻译文本
- 已确认有CustomItems的mod: WTT-Armory, WTT-ContentBackport, Lotus

### 图片
- 通过SPT服务器API下载道具图标
- 缓存到本地 `public/images/items/` 目录
- mod道具如无图片，使用占位图

## 已确认需求

### 道具范围
- 所有玩家可拾取/可交互的道具类型
- 包含武器、改装件、护甲、医疗、弹药、交换物、钥匙、食物、背包、特殊物品、投掷武器等
- 包含mod新增的道具（如WTT-Armory的武器）
- mod道具和原版道具统一处理，不做区分
- 不包含纯系统/内部节点（Inventory, Pockets, Stash等）

### 功能要求
- 按游戏手册分类浏览道具
- 显示道具详细属性和数值
- 搜索功能
- 中文/英文切换，默认中文
- 美观的UI样式

### 生成器要求
- 规范化生成流程，可重复执行
- 支持增量更新图片
- 合并基础数据 + 所有mod数据

## 已确认技术选型
- **前端**: React + Vite + TailwindCSS + shadcn/ui
- **主题**: 暗色军事风，契合塔科夫游戏风格
- **设计原则**: 易用便捷、格式合理、数据清晰
- **布局**: 左侧分类导航树 + 道具卡片网格 + 搜索栏

## 待确认
- 部署方式

## 验收标准

- [ ] 生成器运行后，输出的JSON包含所有原版+mod道具（>4462个）
- [ ] mod道具（WTT-Armory武器等）正确出现在对应分类中
- [ ] 前端分类树正确展示游戏内所有手册分类
- [ ] 点击任意道具可查看完整属性详情
- [ ] 武器类道具显示口径、射速、后坐力、配件槽位等
- [ ] 弹药类道具显示伤害、穿甲力、碎片化等
- [ ] 中英文切换正常工作，默认中文
- [ ] 搜索支持中英文名称模糊匹配
- [ ] Vite build 成功，生成纯静态文件可部署
- [ ] 暗色军事风主题，视觉舒适
