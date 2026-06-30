# Backend Spec

Node.js + Express + TypeScript 后端，为改枪工作台（Forge）提供 API。

## 技术栈

- Express 4 + tsx（开发热重载）
- 数据源：`public/data/forge/forge-data.json`（启动时全量加载到内存 Map）
- 端口：3001（开发），生产通过 Nginx 反向代理

## 目录结构

```
server/
├── package.json          # 独立依赖（express, cors, better-sqlite3）
├── tsconfig.json
└── src/
    ├── index.ts          # Express 应用 + 所有路由
    ├── dataLoader.ts     # 启动时加载 forge-data.json 到内存
    └── types.ts          # 服务端类型定义（镜像 generator/forge.ts）
```

## API 合约

### 健康检查
```
GET /api/forge/health
→ { status: 'ok', totalItems, totalSlots, totalWeapons, generatedAt }
```

### 枪械初始化
```
GET /api/forge/guns/:gunId/init?lang=zh
→ { id, name, shortName, image, weight, weapon, slots[], centerOfImpact, conflictingItems, factoryPreset[] }
```

### 物品插槽
```
GET /api/forge/items/:itemId/slots
→ { itemId, slots: SlotInfo[] }
```

### 插槽兼容物品
```
GET /api/forge/items/:itemId/slots/:slotName/allowed-items?lang=zh
→ { itemId, slotName, items: AllowedItem[] }
```

**关键**：必须用 `itemId + slotName` 查找（非 slotId），因为 SPT 模板克隆导致 slotId 不唯一。

### 属性计算
```
POST /api/forge/build/calculate
Body: { baseItemId, installedIds[], assumeFullMag?, selectedAmmoId? }
→ BuildStats
```

计算公式：
- 后坐力：`baseRecoil * (1 + totalRecoilMod / 100)`
- 精度：`34.36 * centerOfImpact * (1 - totalAccuracyMod / 100)`
- 弹药重量：`assumeFullMag` 时 `totalWeight += ammoWeight × magazineCapacity`

### 冲突检测
```
POST /api/forge/build/validate
Body: { candidateId, installedIds[] }
→ { valid, reasonKey, reasonName, conflictingItemId, conflictingSlotId }
```

四项检测：双向物品冲突 + 双向插槽冲突（全部内存计算，无 DB 查询）。

### 价格代理
```
POST /api/forge/prices
Body: { itemIds[] }
→ { prices: Record<itemId, { fleaPrice, bestBuyPrice, bestBuySource }> }
```

代理 tarkov.dev GraphQL API，批量查询（上限 200）。

### 弹药查询
```
GET /api/forge/ammo/:caliber?lang=zh
→ { caliber, items: AmmoItem[] }
```

## 数据加载

`dataLoader.ts` 在启动时将 `forge-data.json` 加载到内存：
- `itemsMap`: Map<itemId, ForgeItem>
- `slotIndex`: Map<slotId, SlotOwner>（已弃用，改用 itemId+slotName 查找）
- `weapons`: ForgeItem[]
- `presetsMap`: Map<weaponId, FactoryPreset[]>

## 常见错误

### slotId 不唯一

> **Warning**: SPT 数据中 slotId 可能被多个物品共享（模板克隆），不能用作唯一查找键。
>
> 必须使用 `物品ID + 插槽名` 查找兼容物品。

### `push(...arr)` 栈溢出

```typescript
// WRONG — 当数组超过 ~10万项时栈溢出
allResults.push(...parentResults)

// CORRECT — 使用循环
for (const r of parentResults) allResults.push(r)
```

## 部署

详见 [Deployment Guide](../deployment.md)
