# Frontend Directory Structure

```
src/
├── App.tsx                    # 路由定义 + 页面组件（首页/分类/详情）
├── main.tsx                   # 入口，挂载 React + Router + i18n
├── index.css                  # TailwindCSS 主题变量 + 全局样式
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx      # 侧边栏 + 顶栏 + 内容区布局
│   └── item/
│       ├── ItemCard.tsx        # 道具卡片 + ItemGrid 网格（接收 ItemSummary）
│       ├── ItemDetail.tsx      # 道具详情（使用 useItemDetail 加载完整数据）
│       └── AmmoPage.tsx        # 弹药分类视图（使用 summaries 的 ammo 字段）
├── hooks/
│   └── useItems.ts            # 按需加载 hooks + 搜索 + 分类树 + 类型翻译
├── i18n/
│   ├── index.ts               # i18next 配置
│   ├── zh.json                # 中文界面翻译
│   └── en.json                # 英文界面翻译
└── lib/
    ├── utils.ts               # cn() class 合并工具
    └── dataStore.ts           # Promise Map 缓存层（请求去重）

public/
├── data/                      # 生成器输出的 JSON 数据（三层结构）
│   ├── categories.json        # 分类树（含 previewImage）
│   ├── summaries/{catId}.json # 分类道具摘要（ItemSummary 数组）
│   ├── items/{itemId}.json    # 单道具完整数据（WikiItem）
│   ├── search-index.json      # 搜索索引（全部摘要）
│   ├── types.json             # 类型层级
│   └── stats.json             # 生成统计
└── images/
    ├── items/                 # 道具图标（已提交 git）
    └── categories/            # 分类图标（已提交）
```
# Directory Structure

> How frontend code is organized in this project.

---

## Overview

<!--
Document your project's frontend directory structure here.

Questions to answer:
- Where do components live?
- How are features/modules organized?
- Where are shared utilities?
- How are assets organized?
-->

(To be filled by the team)

---

## Directory Layout

```
<!-- Replace with your actual structure -->
src/
├── ...
└── ...
```

---

## Module Organization

<!-- How should new features be organized? -->

(To be filled by the team)

---

## Naming Conventions

<!-- File and folder naming rules -->

(To be filled by the team)

---

## Examples

<!-- Link to well-organized modules as examples -->

(To be filled by the team)
