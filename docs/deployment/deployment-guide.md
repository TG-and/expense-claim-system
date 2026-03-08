# 部署运维文档
## ClaimFlow - 企业费用报销管理系统

**文档版本**: v1.0  
**创建日期**: 2025-03-08  
**运维负责人**: DevOps Team  

---

## 目录

1. [部署概述](#1-部署概述)
2. [环境要求](#2-环境要求)
3. [部署方案](#3-部署方案)
4. [配置管理](#4-配置管理)
5. [监控告警](#5-监控告警)
6. [日志管理](#6-日志管理)
7. [备份恢复](#7-备份恢复)
8. [故障排查](#8-故障排查)
9. [安全加固](#9-安全加固)
10. [性能优化](#10-性能优化)

---

## 1. 部署概述

### 1.1 系统架构

```
┌─────────────────────────────────────────────┐
│           用户/客户端                        │
└─────────────────┬───────────────────────────┘
                  ↓ HTTPS
┌─────────────────────────────────────────────┐
│        负载均衡器 (Nginx/Cloud LB)           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│        应用服务器 (Node.js)                  │
│  ┌────────────────────────────────────────┐ │
│  │  Express Server (Port 3008)            │ │
│  │  - React Static Files                  │ │
│  │  - API Endpoints                       │ │
│  └────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│           数据存储层                         │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ SQLite DB    │  │ File Storage │         │
│  │ (data.db)    │  │ (uploads/)   │         │
│  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
```

### 1.2 部署方式

| 部署方式 | 适用场景 | 复杂度 |
|---------|---------|--------|
| 本地部署 | 开发测试 | 低 |
| Docker 部署 | 生产环境 | 中 |
| Railway 部署 | 云原生环境 | 低 |
| 传统服务器部署 | 企业内部 | 中 |

---

## 2. 环境要求

### 2.1 硬件要求

| 环境 | CPU | 内存 | 存储 | 网络 |
|------|-----|------|------|------|
| 开发环境 | 2 核 | 4 GB | 20 GB | 10 Mbps |
| 测试环境 | 2 核 | 4 GB | 20 GB | 10 Mbps |
| 生产环境 | 4 核 | 8 GB | 100 GB | 100 Mbps |

### 2.2 软件要求

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | ≥ 20.0.0 | 运行时环境 |
| npm | ≥ 10.0.0 | 包管理器 |
| SQLite | ≥ 3.0 | 数据库 |
| Git | ≥ 2.0 | 版本控制 |

### 2.3 操作系统支持

| 操作系统 | 版本 | 支持状态 |
|---------|------|---------|
| Ubuntu | 20.04+ | ✅ 完全支持 |
| CentOS | 7+ | ✅ 完全支持 |
| macOS | 11+ | ✅ 完全支持 |
| Windows | 10+ | ⚠️ 部分支持 |

---

## 3. 部署方案

### 3.1 本地开发部署

#### 3.1.1 环境准备

```bash
# 安装 Node.js (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 验证安装
node -v
npm -v

# 克隆项目
git clone <repository-url>
cd expense-claim-system
```

#### 3.1.2 安装依赖

```bash
# 安装项目依赖
npm install

# 安装开发依赖
npm install -g typescript tsx
```

#### 3.1.3 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm run build:server
npm start
```

#### 3.1.4 访问应用

```
本地访问: http://localhost:3008
健康检查: http://localhost:3008/api/health
```

---

### 3.2 Docker 部署

#### 3.2.1 Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build && npm run build:server

EXPOSE 3008

CMD ["npm", "start"]
```

#### 3.2.2 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: claimflow
    ports:
      - "3008:3008"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3008
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3008/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 3.2.3 部署命令

```bash
# 构建镜像
docker build -t claimflow:latest .

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

### 3.3 Railway 部署

#### 3.3.1 配置文件

**railway.json**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**nixpacks.toml**:
```toml
[phases.setup]
nixPkgs = ["nodejs-20_x"]

[phases.install]
cmds = ["npm ci --only=production"]

[phases.build]
cmds = ["npm run build && npm run build:server"]

[start]
cmd = "npm run start"
```

#### 3.3.2 部署步骤

1. **安装 Railway CLI**:
```bash
npm install -g @railway/cli
```

2. **登录 Railway**:
```bash
railway login
```

3. **初始化项目**:
```bash
railway init
```

4. **配置环境变量**:
```bash
railway variables set JWT_SECRET=your-secret-key
railway variables set NODE_ENV=production
```

5. **部署应用**:
```bash
railway up
```

6. **配置持久化存储**:
   - 在 Railway 控制台添加 Volume
   - Mount path: `/app/data`
   - 大小: 1GB

#### 3.3.3 注意事项

- SQLite 数据库需要持久化存储
- 文件上传目录需要持久化存储
- JWT_SECRET 必须设置强密码
- 建议启用自动部署

---

### 3.4 传统服务器部署

#### 3.4.1 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx
```

#### 3.4.2 应用部署

```bash
# 创建应用目录
sudo mkdir -p /var/www/claimflow
sudo chown -R $USER:$USER /var/www/claimflow

# 克隆代码
cd /var/www/claimflow
git clone <repository-url> .

# 安装依赖
npm ci --only=production

# 构建应用
npm run build
npm run build:server
```

#### 3.4.3 PM2 配置

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'claimflow',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3008
    }
  }]
};
```

#### 3.4.4 启动服务

```bash
# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

#### 3.4.5 Nginx 配置

**/etc/nginx/sites-available/claimflow**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/claimflow/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/claimflow /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 4. 配置管理

### 4.1 环境变量

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| NODE_ENV | 运行环境 | development | 是 |
| PORT | 服务端口 | 3008 | 是 |
| JWT_SECRET | JWT 密钥 | - | 是 |
| DATABASE_URL | 数据库路径 | ./data.db | 否 |

### 4.2 配置文件

**.env.production**:
```bash
NODE_ENV=production
PORT=3008
JWT_SECRET=your-very-secure-secret-key-here
DATABASE_URL=/app/data/data.db
```

### 4.3 配置验证

```typescript
const requiredEnvVars = ['NODE_ENV', 'PORT', 'JWT_SECRET'];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

---

## 5. 监控告警

### 5.1 健康检查

**健康检查端点**: `GET /api/health`

```json
{
  "status": "ok",
  "timestamp": "2025-03-08T10:00:00Z"
}
```

### 5.2 监控指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| CPU 使用率 | CPU 占用百分比 | > 80% |
| 内存使用率 | 内存占用百分比 | > 85% |
| 磁盘使用率 | 磁盘占用百分比 | > 90% |
| 响应时间 | API 响应时间 | > 1000ms |
| 错误率 | HTTP 错误率 | > 5% |

### 5.3 监控工具

#### PM2 监控

```bash
# 查看应用状态
pm2 status

# 查看实时日志
pm2 logs

# 查看监控面板
pm2 monit
```

#### 系统监控

```bash
# CPU 和内存
top
htop

# 磁盘使用
df -h

# 网络连接
netstat -tulpn
```

---

## 6. 日志管理

### 6.1 日志配置

```typescript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 6.2 日志级别

| 级别 | 说明 | 使用场景 |
|------|------|---------|
| error | 错误 | 系统错误,异常 |
| warn | 警告 | 潜在问题 |
| info | 信息 | 正常操作 |
| debug | 调试 | 调试信息 |

### 6.3 日志轮转

```bash
# 安装 logrotate
sudo apt install logrotate

# 配置日志轮转
sudo vim /etc/logrotate.d/claimflow
```

**/etc/logrotate.d/claimflow**:
```
/var/www/claimflow/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 7. 备份恢复

### 7.1 备份策略

| 备份类型 | 频率 | 保留期限 | 存储位置 |
|---------|------|---------|---------|
| 数据库备份 | 每日 | 30 天 | 本地 + 云存储 |
| 文件备份 | 每日 | 30 天 | 本地 + 云存储 |
| 配置备份 | 每周 | 90 天 | 本地 + 云存储 |

### 7.2 备份脚本

**backup.sh**:
```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
APP_DIR="/var/www/claimflow"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
sqlite3 $APP_DIR/data.db ".backup '$BACKUP_DIR/data_$DATE.db'"

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $APP_DIR uploads/

# 备份配置
tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C $APP_DIR .env.production

# 删除旧备份
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 7.3 恢复流程

```bash
#!/bin/bash

BACKUP_FILE=$1
APP_DIR="/var/www/claimflow"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file>"
  exit 1
fi

# 停止应用
pm2 stop claimflow

# 恢复数据库
cp $BACKUP_FILE/data.db $APP_DIR/data.db

# 恢复文件
tar -xzf $BACKUP_FILE/uploads.tar.gz -C $APP_DIR

# 启动应用
pm2 start claimflow

echo "Restore completed"
```

---

## 8. 故障排查

### 8.1 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 应用无法启动 | 端口被占用 | 检查端口占用,修改端口 |
| 数据库连接失败 | 文件权限问题 | 检查文件权限 |
| 内存溢出 | 内存泄漏 | 重启应用,优化代码 |
| 响应缓慢 | 数据库查询慢 | 优化查询,添加索引 |

### 8.2 排查步骤

#### 8.2.1 应用无法启动

```bash
# 检查端口占用
lsof -i :3008

# 检查进程
ps aux | grep node

# 查看错误日志
pm2 logs claimflow --lines 100
```

#### 8.2.2 数据库问题

```bash
# 检查数据库文件
ls -lh data.db

# 检查数据库完整性
sqlite3 data.db "PRAGMA integrity_check;"

# 检查数据库大小
sqlite3 data.db "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();"
```

#### 8.2.3 性能问题

```bash
# 检查系统资源
top
free -h
df -h

# 检查网络连接
netstat -an | grep 3008

# 检查 Node.js 进程
kill -USR2 <pid>  # 生成 CPU profile
```

---

## 9. 安全加固

### 9.1 系统安全

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置防火墙
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 禁用 root 登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 9.2 应用安全

- 使用 HTTPS
- 设置安全头
- 启用 CORS
- 输入验证
- SQL 注入防护
- XSS 防护

### 9.3 数据库安全

- 定期备份
- 访问控制
- 数据加密
- 审计日志

---

## 10. 性能优化

### 10.1 应用优化

- 启用 Gzip 压缩
- 静态资源缓存
- 数据库查询优化
- 使用 CDN

### 10.2 数据库优化

```sql
-- 分析查询性能
EXPLAIN QUERY PLAN SELECT * FROM claims WHERE claimant_id = 'u1';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_claims_claimant ON claims(claimant_id);

-- 优化表
VACUUM;
ANALYZE;
```

### 10.3 系统优化

```bash
# 增加文件描述符限制
ulimit -n 65536

# 优化 TCP 参数
sudo sysctl -w net.core.somaxconn=65535
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535
```

---

## 附录

### A. 快速命令参考

```bash
# 启动应用
pm2 start claimflow

# 停止应用
pm2 stop claimflow

# 重启应用
pm2 restart claimflow

# 查看日志
pm2 logs claimflow

# 查看状态
pm2 status

# 备份数据
./backup.sh

# 恢复数据
./restore.sh <backup_file>
```

### B. 联系方式

- **技术支持**: support@example.com
- **运维团队**: devops@example.com
- **紧急联系**: +1-xxx-xxx-xxxx

### C. 变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|---------|--------|
| v1.0 | 2025-03-08 | 初始版本 | DevOps Team |

---

**文档结束**
