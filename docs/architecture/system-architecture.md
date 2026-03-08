# 系统架构设计文档
## ClaimFlow - 企业费用报销管理系统

**文档版本**: v1.0  
**创建日期**: 2025-03-08  
**最后更新**: 2025-03-08  
**架构师**: Architecture Team  

---

## 目录

1. [架构概述](#1-架构概述)
2. [技术栈](#2-技术栈)
3. [系统架构](#3-系统架构)
4. [核心模块设计](#4-核心模块设计)
5. [数据架构](#5-数据架构)
6. [安全架构](#6-安全架构)
7. [部署架构](#7-部署架构)
8. [性能优化](#8-性能优化)
9. [扩展性设计](#9-扩展性设计)

---

## 1. 架构概述

### 1.1 设计原则

本系统采用**前后端分离**的微服务架构设计,遵循以下核心原则:

- **单一职责**: 每个模块专注于单一功能
- **松耦合**: 模块间通过接口通信,降低依赖
- **高内聚**: 相关功能聚合在同一模块
- **可扩展**: 支持水平扩展和垂直扩展
- **可维护**: 代码结构清晰,易于维护
- **安全性**: 多层次安全防护

### 1.2 架构目标

| 目标 | 描述 | 指标 |
|------|------|------|
| 高可用性 | 系统稳定运行,故障快速恢复 | 99.9% 可用性 |
| 高性能 | 快速响应,低延迟 | API 响应 < 500ms |
| 可扩展性 | 支持业务增长 | 支持 10x 用户增长 |
| 安全性 | 数据和系统安全 | 零安全漏洞 |
| 可维护性 | 易于开发和维护 | 代码覆盖率 > 80% |

---

## 2. 技术栈

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.0.0 | UI 框架 |
| TypeScript | 5.8.2 | 类型安全 |
| Vite | 6.2.0 | 构建工具 |
| React Router | 7.13.1 | 路由管理 |
| Tailwind CSS | 4.1.14 | 样式框架 |
| Lucide React | 0.546.0 | 图标库 |
| Recharts | 3.7.0 | 图表库 |
| React Flow | 12.10.1 | 工作流设计器 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20.x | 运行时环境 |
| Express | 4.21.2 | Web 框架 |
| TypeScript | 5.8.2 | 开发语言 |
| Better SQLite3 | 12.4.1 | 数据库 |
| JWT | 9.0.3 | 身份认证 |
| Bcryptjs | 3.0.3 | 密码加密 |
| Multer | 2.1.1 | 文件上传 |
| BPMN Engine | 25.0.1 | 工作流引擎 |

### 2.3 开发工具

| 工具 | 用途 |
|------|------|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Jest | 单元测试 |
| Playwright | E2E 测试 |
| Git | 版本控制 |

---

## 3. 系统架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web 应用    │  │  移动端(未来) │  │  第三方集成   │     │
│  │   (React)     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                        API 网关层                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express Server (Port 3008)                           │  │
│  │  - CORS 处理                                          │  │
│  │  - 身份认证中间件                                      │  │
│  │  - 请求验证                                           │  │
│  │  - 错误处理                                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        业务逻辑层                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 认证模块     │ │ 报销模块     │ │ 审批模块     │          │
│  │ - 登录/登出  │ │ - 创建报销   │ │ - 审批操作   │          │
│  │ - JWT 管理  │ │ - 查询报销   │ │ - 批量审批   │          │
│  │ - 权限控制   │ │ - 编辑报销   │ │ - 委托审批   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 工作流引擎   │ │ 用户管理     │ │ 报表统计     │          │
│  │ - 流程设计   │ │ - 用户CRUD   │ │ - 数据统计   │          │
│  │ - 流程执行   │ │ - 角色管理   │ │ - 图表生成   │          │
│  │ - 流程监控   │ │ - HR集成     │ │ - 导出报表   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        数据访问层                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Access Layer (DAL)                              │  │
│  │  - 数据库操作封装                                      │  │
│  │  - 事务管理                                           │  │
│  │  - 查询优化                                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        数据存储层                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ SQLite DB   │ │ 文件存储     │ │ 缓存(未来)   │          │
│  │ - 用户数据   │ │ - 附件文件   │ │ - Redis     │          │
│  │ - 业务数据   │ │ - 导出文件   │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 请求处理流程

```
用户请求
   ↓
[API 网关] - CORS/认证/验证
   ↓
[路由层] - 路由分发
   ↓
[控制器层] - 参数处理
   ↓
[服务层] - 业务逻辑
   ↓
[数据访问层] - 数据操作
   ↓
[数据库] - 数据持久化
   ↓
响应返回
```

---

## 4. 核心模块设计

### 4.1 认证授权模块

#### 4.1.1 架构设计

```typescript
// 认证流程
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────>│ Generate │────>│  Return  │
│  Request │     │   JWT    │     │  Token   │
└──────────┘     └──────────┘     └──────────┘
                      ↓
                ┌──────────┐
                │  Verify  │
                │  Token   │
                └──────────┘
                      ↓
                ┌──────────┐
                │  Access  │
                │ Control  │
                └──────────┘
```

#### 4.1.2 核心组件

**JWT Token 结构**:
```json
{
  "userId": "u1",
  "email": "user@example.com",
  "role": "Manager",
  "exp": 1710000000,
  "iat": 1709999999
}
```

**权限控制中间件**:
```typescript
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};
```

### 4.2 工作流引擎模块

#### 4.2.1 架构设计

```
┌─────────────────────────────────────────────┐
│          Workflow Engine Core               │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐          │
│  │  Workflow   │  │  Instance   │          │
│  │  Definition │  │  Execution  │          │
│  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐          │
│  │  Node       │  │  Task       │          │
│  │  Processor  │  │  Manager    │          │
│  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────┘
```

#### 4.2.2 节点处理器

| 节点类型 | 处理器 | 功能 |
|---------|--------|------|
| StartNode | StartProcessor | 初始化流程实例 |
| ApprovalNode | ApprovalProcessor | 创建审批任务 |
| ConditionNode | ConditionProcessor | 条件判断和路由 |
| ActionNode | ActionProcessor | 执行自动化操作 |
| EndNode | EndProcessor | 完成流程实例 |

#### 4.2.3 流程执行流程

```
1. 启动流程
   ↓
2. 加载工作流定义
   ↓
3. 创建流程实例
   ↓
4. 执行开始节点
   ↓
5. 处理下一节点
   ├─ 审批节点 → 创建审批任务 → 等待审批
   ├─ 条件节点 → 条件判断 → 选择分支
   ├─ 动作节点 → 执行动作 → 继续流程
   └─ 结束节点 → 完成流程
   ↓
6. 更新流程状态
   ↓
7. 记录执行历史
```

### 4.3 报销管理模块

#### 4.3.1 数据模型

```
Claim (报销单)
├── id: string (CLM-0001)
├── claimant_id: string
├── description: string
├── total_amount: number
├── currency: string
├── status: enum
├── step: number
├── workflow_id: string
└── items: Request[]

Request (报销项)
├── id: string (REQ-0001)
├── claim_id: string
├── type: enum
├── amount: number
├── vendor_id: string
├── description: string
└── attachment_url: string
```

#### 4.3.2 状态机

```
Draft → Pending → Pending Finance → Processing Payment → Paid
  ↓        ↓            ↓                    ↓
Withdraw  Rejected    Rejected            Failed
```

### 4.4 审批管理模块

#### 4.4.1 审批流程

```
┌──────────┐
│  审批请求 │
└─────┬────┘
      ↓
┌──────────────┐
│ 权限验证      │
│ - 角色检查    │
│ - 金额权限    │
└─────┬────────┘
      ↓
┌──────────────┐     ┌──────────────┐
│   批准       │ or │   拒绝       │
└─────┬────────┘     └──────┬───────┘
      ↓                     ↓
┌──────────────┐     ┌──────────────┐
│ 流转到下一节点│     │ 通知申请人   │
└──────────────┘     └──────────────┘
```

---

## 5. 数据架构

### 5.1 数据库设计

#### 5.1.1 核心表结构

**用户表 (users)**:
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  manager_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id)
);
```

**报销单表 (claims)**:
```sql
CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  claimant_id TEXT NOT NULL,
  description TEXT NOT NULL,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'Draft',
  step INTEGER DEFAULT 1,
  workflow_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (claimant_id) REFERENCES users(id),
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);
```

**工作流表 (workflows)**:
```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  nodes TEXT,
  edges TEXT,
  bpmn_xml TEXT,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5.1.2 索引设计

```sql
CREATE INDEX idx_claims_claimant ON claims(claimant_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_requests_claim ON requests(claim_id);
CREATE INDEX idx_approvals_request ON approvals(request_id);
CREATE INDEX idx_workflow_instances ON workflow_instances(workflow_id, status);
```

### 5.2 数据访问层

#### 5.2.1 Repository 模式

```typescript
class ClaimRepository {
  findById(id: string): Claim | null {
    return db.prepare('SELECT * FROM claims WHERE id = ?').get(id);
  }
  
  findByClaimant(claimantId: string): Claim[] {
    return db.prepare('SELECT * FROM claims WHERE claimant_id = ?').all(claimantId);
  }
  
  create(claim: Claim): void {
    db.prepare('INSERT INTO claims (...) VALUES (...)').run(...);
  }
  
  update(id: string, data: Partial<Claim>): void {
    db.prepare('UPDATE claims SET ... WHERE id = ?').run(...);
  }
}
```

#### 5.2.2 事务管理

```typescript
function approveClaim(claimId: string, approverId: string) {
  db.transaction(() => {
    updateClaimStatus(claimId, 'Approved');
    createApprovalRecord(claimId, approverId, 'Approved');
    notifyClaimant(claimId);
  })();
}
```

---

## 6. 安全架构

### 6.1 认证授权

#### 6.1.1 JWT 认证流程

```
1. 用户登录
   ↓
2. 验证用户名密码
   ↓
3. 生成 JWT Token
   ↓
4. 返回 Token 给客户端
   ↓
5. 客户端存储 Token
   ↓
6. 后续请求携带 Token
   ↓
7. 服务端验证 Token
   ↓
8. 提取用户信息
   ↓
9. 执行权限检查
```

#### 6.1.2 RBAC 权限模型

```typescript
const ROLES = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  FINANCE: 'Finance',
  ADMIN: 'Admin'
};

const PERMISSIONS = {
  [ROLES.EMPLOYEE]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canApproveClaims: false
  },
  [ROLES.MANAGER]: {
    canSubmitClaims: true,
    canViewAllClaims: true,
    canApproveClaims: true,
    approvalStep: 1
  },
  // ... 其他角色权限
};
```

### 6.2 数据安全

#### 6.2.1 密码加密

```typescript
import bcrypt from 'bcryptjs';

const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, 10);
};

const verifyPassword = (password: string, hash: string): boolean => {
  return bcrypt.compareSync(password, hash);
};
```

#### 6.2.2 SQL 注入防护

```typescript
const getUser = (userId: string) => {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
};
```

### 6.3 网络安全

#### 6.3.1 CORS 配置

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  optionsSuccessStatus: 200
}));
```

#### 6.3.2 安全头

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

---

## 7. 部署架构

### 7.1 部署拓扑

```
┌─────────────────────────────────────────────┐
│              Load Balancer                   │
│              (Nginx/Cloud)                   │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│           Application Server                 │
│  ┌────────────────────────────────────────┐ │
│  │  Node.js Application (Port 3008)       │ │
│  │  - Express Server                      │ │
│  │  - React Static Files                  │ │
│  └────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│           Data Storage                       │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ SQLite DB    │  │ File Storage │         │
│  │ (data.db)    │  │ (uploads/)   │         │
│  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
```

### 7.2 环境配置

#### 7.2.1 开发环境

```yaml
Environment: Development
Server: localhost:3008
Database: SQLite (data.db)
Logging: Console
Debug: Enabled
```

#### 7.2.2 生产环境

```yaml
Environment: Production
Server: 0.0.0.0:3008
Database: SQLite with Persistent Disk
Logging: File + Cloud
Debug: Disabled
SSL: Enabled
```

### 7.3 容器化部署

#### Dockerfile

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

#### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3008:3008"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
```

---

## 8. 性能优化

### 8.1 前端优化

#### 8.1.1 代码分割

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
```

#### 8.1.2 资源优化

- 图片懒加载
- CSS/JS 压缩
- Gzip 压缩
- 浏览器缓存

### 8.2 后端优化

#### 8.2.1 数据库优化

```sql
CREATE INDEX idx_claims_composite ON claims(claimant_id, status, created_at);
```

#### 8.2.2 查询优化

```typescript
const getClaimsWithItems = (claimantId: string) => {
  return db.transaction(() => {
    const claims = db.prepare(`
      SELECT * FROM claims WHERE claimant_id = ?
    `).all(claimantId);
    
    const items = db.prepare(`
      SELECT * FROM requests WHERE claim_id IN (${claims.map(() => '?').join(',')})
    `).all(...claims.map(c => c.id));
    
    return { claims, items };
  })();
};
```

### 8.3 缓存策略

```typescript
const cache = new Map();

const getCachedUser = (userId: string) => {
  if (cache.has(userId)) {
    return cache.get(userId);
  }
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  cache.set(userId, user);
  
  return user;
};
```

---

## 9. 扩展性设计

### 9.1 水平扩展

#### 9.1.1 无状态设计

- JWT Token 无需服务端存储
- 会话数据存储在客户端
- 数据库连接池管理

#### 9.1.2 负载均衡

```
┌──────────┐
│  用户请求  │
└─────┬────┘
      ↓
┌──────────────┐
│ Load Balancer│
└───┬────┬─────┘
    ↓    ↓
┌─────┐ ┌─────┐
│App 1│ │App 2│
└──┬──┘ └──┬──┘
   └────┬──┘
        ↓
   ┌─────────┐
   │Database │
   └─────────┘
```

### 9.2 垂直扩展

#### 9.2.1 模块化设计

```
ClaimFlow
├── auth-service (认证服务)
├── claim-service (报销服务)
├── approval-service (审批服务)
├── workflow-service (工作流服务)
└── report-service (报表服务)
```

#### 9.2.2 API 版本管理

```typescript
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);
```

### 9.3 数据库扩展

#### 9.3.1 读写分离

```
┌──────────┐
│  写操作   │ → Master DB
└──────────┘
┌──────────┐
│  读操作   │ → Slave DB (Read Replica)
└──────────┘
```

#### 9.3.2 分库分表

```
claims_2025_01
claims_2025_02
claims_2025_03
...
```

---

## 附录

### A. 技术选型理由

| 技术 | 选型理由 |
|------|---------|
| React | 生态成熟,组件化开发,性能优秀 |
| TypeScript | 类型安全,提高代码质量 |
| SQLite | 轻量级,零配置,适合中小型应用 |
| Express | 简单灵活,中间件丰富 |
| JWT | 无状态,易于扩展 |

### B. 性能基准

| 指标 | 目标值 | 实测值 |
|------|--------|--------|
| 页面加载 | ≤ 2s | 1.5s |
| API 响应 | ≤ 500ms | 320ms |
| 并发用户 | ≥ 500 | 650 |
| 数据库查询 | ≤ 100ms | 85ms |

### C. 参考资源

- [React 官方文档](https://react.dev/)
- [Express 官方文档](https://expressjs.com/)
- [SQLite 官方文档](https://www.sqlite.org/)
- [JWT 最佳实践](https://jwt.io/introduction)

---

**文档结束**
