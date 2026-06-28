# Frontend Spec

React 19 + Vite 6 + TypeScript + TailwindCSS 4 静态站点。

## 技术约束

- 纯静态 SPA，零运行时后端依赖
- 所有数据从 `public/data/*.json` 静态加载
- 国际化使用 i18next（zh/en 双语，默认中文）
- 路径别名 `@/*` → `./src/*`

## 关键模式

### 数据加载
所有组件通过 `useItems()` hook 获取数据，数据缓存在模块级变量中避免重复 fetch。

```typescript
// src/hooks/useItems.ts
const { items, categories, loading } = useItems()
```

### 类型翻译
道具类型名使用 `getTypeNameZH()` 函数翻译，映射表维护在 `src/hooks/useItems.ts`。

### 颜色语义
数值颜色遵循语义规范：
- 增益值（正=好）：蓝色 `text-blue-400`
- 惩罚值（负=坏）：红色 `text-red-400`
- 反向属性（如后坐力，负=好）：使用 `ColoredStatRow` 的 `invertColor` prop

### 组件结构
- `components/layout/` — 布局组件（AppLayout, Sidebar, Header）
- `components/item/` — 道具展示组件（ItemCard, ItemGrid, ItemDetail, AmmoPage）
- `lib/` — 工具函数（cn class合并）
- `i18n/` — 国际化配置和翻译文件
- `hooks/` — 自定义 hooks（useItems）
# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | To fill |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | To fill |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | To fill |
| [State Management](./state-management.md) | Local state, global state, server state | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Type Safety](./type-safety.md) | Type patterns, validation | To fill |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.
