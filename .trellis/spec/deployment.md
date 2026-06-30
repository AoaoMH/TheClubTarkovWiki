# Deployment Spec

## 架构

```
用户 → Nginx:80/443 → 静态文件 (dist/)          # 前端
                   → /api/ → Node.js:3001 (PM2)  # 后端
```

## 数据部署策略

### Git 托管的数据（服务器 git pull 即可）

| 数据 | 路径 | 大小 | 说明 |
|------|------|------|------|
| forge-data.json | `public/data/forge/forge-data.json` | ~4.8MB | 改枪数据（物品+预设+弹药） |
| Wiki 数据 | `public/data/**/*.json` | ~50MB | 分类/摘要/详情/任务 |
| 物品图片 | `public/images/items/` | ~4197 文件 | JPG/WebP |

### 仅本地的数据（不提交 Git）

| 数据 | 路径 | 说明 |
|------|------|------|
| SPT 源文件 | `F:\Tarkov\Client.*\SPT\` | 游戏客户端，仅本地 |
| 生成器源码 | `generator/` | 代码提交，但运行依赖 SPT 本地路径 |

> **Warning**: 服务器上不需要运行 `npm run generate:data`，因为 SPT 源文件仅存在于本地。
> 数据文件（forge-data.json + 图片）已提交到 Git，`git pull` 后直接可用。

## 前端构建

```bash
npm run build    # tsc + vite build → dist/
```

### forgeConfig.ts 生产环境配置

```typescript
// 开发环境：跨域请求 localhost:3001
// 生产环境：同源请求（空字符串），Nginx 反向代理 /api/
API_BASE: import.meta.env.DEV ? 'http://localhost:3001' : ''
```

## Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/theclubwiki/dist;
    index index.html;

    # 前端 SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 后端部署

```bash
# 安装 PM2
npm install -g pm2

# 部署
cd server
npm install --production
pm2 start "npx tsx src/index.ts" --name forge-api
pm2 save
pm2 startup  # 按提示执行返回的命令
```

## 更新流程

```bash
# 1. 拉取代码和数据
git pull

# 2. 构建前端
npm install
npm run build

# 3. 重启后端
cd server && npm install --production
pm2 restart forge-api
```

## 本地开发

```bash
# 一条命令同时启动前后端
npm run dev:all    # 使用 concurrently

# 或分别启动
npm run dev         # 前端 :5173
cd server && npm run dev  # 后端 :3001
```

## .gitignore 确认

以下路径**不能**被 .gitignore 排除：
- `public/data/` — 数据文件
- `public/images/` — 图片资源
- `server/` — 后端代码（不含 node_modules）

以下路径**必须**被 .gitignore 排除：
- `node_modules/`
- `server/node_modules/`
- `dist/`
- `.vite/`
