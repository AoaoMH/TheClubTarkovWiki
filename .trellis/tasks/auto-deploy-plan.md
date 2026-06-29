# 自动部署方案：GitHub Webhook + git pull + build

## 概述

本项目（TheClubTarkovWiki）是一个静态站点，部署在 Ubuntu 24 云服务器上。
当前手动 clone + build 部署，需要改为 GitHub push 后自动更新。

**方案**：服务器运行一个轻量 webhook 接收服务，GitHub push 时触发 webhook，服务器执行 `git pull` + `npm run build`。

**仓库地址**：`https://github.com/AoaoMH/TheClubTarkovWiki.git`

## 需要创建的文件

### 1. `/opt/webhook/server.js` — Webhook 接收服务

创建一个 Node.js HTTP 服务（无外部依赖），监听 9000 端口：

```javascript
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

// ===== 配置 =====
const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET; // 从环境变量读取
const DEPLOY_SCRIPT = '/opt/webhook/deploy.sh';
const LOG_FILE = '/opt/webhook/deploy.log';

function verifySignature(payload, signature) {
  if (!SECRET) {
    console.warn('[WARN] WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(body, signature)) {
      res.writeHead(401);
      res.end('Invalid signature');
      console.log(`[${new Date().toISOString()}] Rejected: invalid signature`);
      return;
    }

    try {
      const payload = JSON.parse(body);
      const branch = payload.ref;
      const pusher = payload.pusher?.name || 'unknown';
      const commits = payload.commits?.length || 0;

      console.log(`[${new Date().toISOString()}] Push by ${pusher}: ${commits} commits to ${branch}`);

      // Only deploy for main branch
      if (branch !== 'refs/heads/main') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'skipped', reason: 'not main branch' }));
        return;
      }

      // Trigger deploy (async, don't block response)
      exec(`bash ${DEPLOY_SCRIPT} >> ${LOG_FILE} 2>&1 &`, (err) => {
        if (err) console.error('Failed to start deploy:', err.message);
      });

      res.writeHead(200);
      res.end(JSON.stringify({ status: 'deploying', commits, pusher }));
    } catch (e) {
      console.error('Parse error:', e.message);
      res.writeHead(400);
      res.end('Bad Request');
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Webhook server listening on 127.0.0.1:${PORT}`);
});
```

**要点**：
- 只监听 `127.0.0.1`（本机），通过 Nginx 反向代理暴露
- 验证 GitHub webhook 签名（HMAC SHA-256）
- 只在 `main` 分支 push 时触发部署
- 部署异步执行，不阻塞 webhook 响应

### 2. `/opt/webhook/deploy.sh` — 部署脚本

```bash
#!/bin/bash
set -euo pipefail

# ===== 配置 =====
PROJECT_DIR="/path/to/TheClubTarkovWiki"  # ← 替换为实际项目路径
DEPLOY_LOCK="/tmp/deploy.lock"

echo "=========================================="
echo "[$(date -Iseconds)] Deploy started"
echo "=========================================="

# Prevent concurrent deploys
if [ -f "$DEPLOY_LOCK" ]; then
  echo "[$(date -Iseconds)] Another deploy is running, skipping."
  exit 0
fi
touch "$DEPLOY_LOCK"
trap "rm -f $DEPLOY_LOCK" EXIT

cd "$PROJECT_DIR"

# Pull latest changes
echo "[$(date -Iseconds)] Pulling latest changes..."
git pull origin main

# Install dependencies (only if package.json changed)
if git diff HEAD@{1} --name-only 2>/dev/null | grep -q "package.json\|package-lock.json"; then
  echo "[$(date -Iseconds)] Dependencies changed, running npm install..."
  npm install --production=false
else
  echo "[$(date -Iseconds)] No dependency changes, skipping npm install."
fi

# Build
echo "[$(date -Iseconds)] Building..."
npm run build

echo "[$(date -Iseconds)] Deploy completed successfully!"
echo "=========================================="
```

**要点**：
- 部署锁防止并发执行
- 只在 `package.json` 变更时才 `npm install`（加速部署）
- `set -euo pipefail` 确保失败时立即退出
- 日志带时间戳便于排查

### 3. `/etc/systemd/system/webhook.service` — Systemd 服务

```ini
[Unit]
Description=GitHub Webhook Deploy Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/webhook
ExecStart=/usr/bin/node /opt/webhook/server.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/webhook/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/webhook /path/to/TheClubTarkovWiki /tmp

[Install]
WantedBy=multi-user.target
```

### 4. `/opt/webhook/.env` — 环境变量

```
WEBHOOK_SECRET=你生成一个随机字符串放这里
```

生成命令：`openssl rand -hex 32`

### 5. Nginx 配置片段 — 反向代理 webhook

在你的 Nginx 站点配置中添加：

```nginx
# GitHub Webhook
location /webhook/deploy {
    # 只允许 GitHub webhook IP 段
    allow 192.30.252.0/22;
    allow 185.199.108.0/22;
    allow 140.82.112.0/20;
    allow 143.55.64.0/20;
    deny all;

    proxy_pass http://127.0.0.1:9000/deploy;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 实施步骤（按顺序执行）

### Step 1: 创建目录和文件

```bash
sudo mkdir -p /opt/webhook
```

创建上述 4 个文件（server.js、deploy.sh、.env、webhook.service）。

**重要**：修改 `deploy.sh` 中的 `PROJECT_DIR` 为实际项目路径。
**重要**：修改 `.env` 中的 `WEBHOOK_SECRET` 为随机字符串。
**重要**：修改 `webhook.service` 中的 `ReadWritePaths` 包含实际项目路径。

### Step 2: 设置权限

```bash
sudo chmod +x /opt/webhook/deploy.sh
sudo chown -R www-data:www-data /opt/webhook

# 确保 www-data 用户可以 git pull 和 npm build 项目目录
# 方法1: 将 www-data 加入你的用户组（推荐）
sudo usermod -aG your_user www-data
chmod g+rwX /path/to/TheClubTarkovWiki -R

# 方法2: 或者直接用你的用户运行 webhook service
# 修改 webhook.service 中的 User=your_user
```

### Step 3: 配置 git 安全目录

```bash
# 如果 webhook 以 www-data 运行但项目属于你的用户，需要：
sudo -u www-data git config --global --add safe.directory /path/to/TheClubTarkovWiki
```

### Step 4: 添加 Nginx 配置

将上面的 Nginx location 块添加到你站点的 server 配置中，然后：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable webhook
sudo systemctl start webhook
sudo systemctl status webhook
```

### Step 6: 配置 GitHub Webhook

1. 打开 `https://github.com/AoaoMH/TheClubTarkovWiki/settings/hooks`
2. 点击 **Add webhook**
3. 填写：
   - **Payload URL**: `https://你的域名/webhook/deploy`
   - **Content type**: `application/json`
   - **Secret**: 与 `.env` 中相同的字符串
   - **Events**: 选 **Just the push event**
4. 点击 **Add webhook**

### Step 7: 验证

```bash
# 查看 webhook 服务日志
sudo journalctl -u webhook -f

# 查看部署日志
cat /opt/webhook/deploy.log
```

在 GitHub 上做一个小改动 push，观察是否自动触发部署。

## 故障排查

| 问题 | 检查 |
|---|---|
| Webhook 401 | 检查 Secret 是否一致 |
| Webhook 不触发 | 检查 GitHub webhook 页面是否有红色错误标记 |
| Deploy 失败 | 查看 `/opt/webhook/deploy.log` |
| git pull 权限错误 | 检查 `safe.directory` 和文件权限 |
| npm build 失败 | 确认 Node.js 版本和 PATH |

## 安全注意事项

- webhook 服务只监听 `127.0.0.1`，外部无法直接访问
- Nginx 层限制只允许 GitHub IP 段访问 `/webhook/deploy`
- HMAC 签名验证确保请求来自 GitHub
- 部署锁防止并发部署冲突
- systemd 安全加固（NoNewPrivileges, ProtectSystem）
