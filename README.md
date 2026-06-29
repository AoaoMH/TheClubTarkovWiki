# The Club Tarkov Wiki

塔科夫 SPT 私服个人道具百科网站。基于本地 SPT 客户端数据（含 mod）生成，部署为纯静态站点。


## 技术栈

- **前端**: React 19 + TypeScript + Vite 6 + TailwindCSS 4
- **数据生成器**: Node.js + TypeScript (tsx)
- **国际化**: i18next (中文/英文)

## 项目结构

```
TheClubTarkovWiki/
├── generator/              # 数据生成器（本地运行，需要SPT客户端）
│   └── src/
├── src/                    # React 前端源码
│   ├── components/
│   ├── hooks/
│   ├── i18n/
│   └── lib/
├── public/
│   ├── data/               # 生成的 JSON 数据（已提交）
│   │   ├── items.json      # 道具数据（~30MB，含原始属性）
│   │   ├── categories.json # 分类数据
│   │   ├── types.json      # 类型层级
│   │   └── stats.json      # 统计信息
│   └── images/
│       ├── items/          # 道具图标（未提交，本地生成）
│       └── categories/     # 分类图标（已提交）
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 部署（服务器端）

### 前置要求

- Node.js >= 20
- npm >= 10
- Git

### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/AoaoMH/TheClubTarkovWiki.git
cd TheClubTarkovWiki

# 2. 安装依赖
npm install

# 3. 构建生产版本
npm run build

# 4. 构建产物在 dist/ 目录
ls dist/
```

### 使用 Nginx 部署

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/TheClubTarkovWiki/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|webp|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # JSON 数据缓存（更新数据后需清除缓存）
    location /data/ {
        expires 1h;
        add_header Cache-Control "public";
    }
}
```

### 使用 Caddy 部署（更简单）

```bash
# 安装 Caddy 后，在项目目录创建 Caddyfile
cat > Caddyfile << 'EOF'
your-domain.com {
    root * /path/to/TheClubTarkovWiki/dist
    file_server
    try_files {path} /index.html
}
EOF

# 启动
caddy start
```

### 使用 PM2 + serve 快速部署

```bash
npm install -g serve pm2

# 构建
npm run build

# 用 PM2 管理
pm2 serve dist 3000 --name tarkov-wiki --spa
pm2 save
pm2 startup
```

## 本地开发

```bash
# 安装依赖
npm install

# 开发服务器（热更新）
npm run dev

# 类型检查
npx tsc --noEmit

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 数据生成（本地 Windows 机器）

数据生成器需要在能访问 SPT 客户端目录的本地机器上运行。

### 前置要求

- SPT 客户端已安装
- Node.js >= 20

### 生成数据（不含图片）

```bash
cd generator
npm install
npm run generate -- --skip-images
```

### 生成数据 + 下载图片

需要网络连接（从 tarkov.dev CDN 下载道具图标）：

```bash
cd generator
npm run generate
```

### 仅更新图片（数据不变）

```bash
cd generator
npm run generate:images
```

### 生成器配置

编辑 `generator/src/config.ts` 修改 SPT 客户端路径：

```typescript
export const SPT_CLIENT_PATH = 'F:\\Tarkov\\Client.0.16.9.0.40087'
```

### 更新数据后的部署流程

```bash
# 1. 本地生成数据
cd generator && npm run generate -- --skip-images

# 2. 提交数据
cd ..
git add public/data/
git commit -m "chore: update generated data"
git push

# 3. 服务器上拉取并重新构建
git pull
npm run build
```

## 数据来源

- **基础数据**: SPT 客户端 `SPT_Data/database/` 目录
- **Mod 数据**: 自动扫描 `SPT/user/mods/*/db/CustomItems/` 和 `CustomLocales/`
- **道具图片**: [tarkov.dev](https://tarkov.dev) CDN（原版道具），mod 道具使用占位符
- **分类图标**: SPT 客户端 `SPT_Data/images/handbook/` 目录

## 命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建结果 |
| `npm run generate` | 生成数据+下载图片 |
| `npm run generate:data` | 仅生成数据（跳过图片） |
| `npm run generate:images` | 仅更新图片 |

## License

Personal project - not for commercial use.
