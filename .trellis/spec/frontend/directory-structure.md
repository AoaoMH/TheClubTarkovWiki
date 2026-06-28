# Frontend Directory Structure

```
src/
├── App.tsx                    # 路由定义 + 页面组件
├── main.tsx                   # 入口，挂载 React + Router + i18n
├── index.css                  # TailwindCSS 主题变量 + 全局样式
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx      # 侧边栏 + 顶栏 + 内容区布局
│   └── item/
│       ├── ItemCard.tsx        # 道具卡片 + ItemGrid 网格
│       ├── ItemDetail.tsx      # 道具详情（通用+类型特化）
│       └── AmmoPage.tsx        # 弹药分类视图（AmmoView）
├── hooks/
│   └── useItems.ts            # 数据加载 + 搜索 + 分类树 + 类型翻译
├── i18n/
│   ├── index.ts               # i18next 配置
│   ├── zh.json                # 中文界面翻译
│   └── en.json                # 英文界面翻译
└── lib/
    └── utils.ts               # cn() class 合并工具

public/
├── data/                      # 生成器输出的 JSON 数据
│   ├── items.json             # 道具数据（~30MB）
│   ├── categories.json        # 分类树
│   ├── types.json             # 类型层级
│   └── stats.json             # 生成统计
└── images/
    ├── items/                 # 道具图标（本地生成，不提交git）
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
