# 企业报销管理系统技术文档

## 文档信息

| 属性 | 内容 |
|------|------|
| 项目名称 | Expense Claim System |
| 版本 | v1.0.0 |
| 创建日期 | 2026-03-08 |
| 技术栈 | React + TypeScript + Express + SQLite |

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [核心功能模块](#3-核心功能模块)
4. [工作流引擎](#4-工作流引擎)
5. [数据库设计](#5-数据库设计)
6. [API接口规范](#6-api接口规范)
7. [前端组件](#7-前端组件)
8. [部署与运维](#8-部署与运维)
9. [附录](#9-附录)

---

## 1. 项目概述

### 1.1 项目背景

企业报销管理系统是一个用于处理员工费用报销、审批流程的Web应用系统。该系统支持多门户用户角色（员工、财务、管理员），提供从费用提交到审批支付的全流程管理。

### 1.2 项目目标

- 实现费用报销的在线提交与审批
- 配置可自定义的工作流审批引擎
- 支持多角色、多部门的审批层级
- 提供可视化的审批进度追踪
- 实现响应式设计，支持多设备访问

### 1.3 用户角色

| 角色 | 描述 | 权限 |
|------|------|------|
| Claimant (员工) | 提交报销申请 | 提交、查看自己的报销 |
| Finance (财务) | 财务审批 | 审批财务相关请求 |
| Admin (管理员) | 系统配置 | 管理用户、工作流、模板 |

---

## 2. 技术架构

### 2.1 技术栈

#### 前端
- **框架**: React 19 + TypeScript
- **路由**: React Router DOM v7
- **UI组件**: Tailwind CSS v4 + Lucide React
- **流程图**: @xyflow/react (React Flow)
- **状态管理**: React Context + useState

#### 后端
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT + bcrypt
- **文件上传**: Multer

#### 开发工具
- **构建工具**: Vite 6
- **开发服务器**: tsx (TypeScript Execute)
- **测试**: Jest + Playwright

### 2.2 项目结构

```
expense-claim-system/
├── src/
│   ├── components/       # React 组件
│   │   └── Layout.tsx   # 布局组件（侧边栏）
│   ├── pages/           # 页面组件
│   │   ├── AdminPortal.tsx
│   │   ├── AdminTemplates.tsx
│   │   ├── AdminUsers.tsx
│   │   ├── ApprovalDetails.tsx
│   │   ├── ApprovalsPage.tsx
│   │   ├── ClaimDetails.tsx
│   │   ├── Dashboard.tsx
│   │   ├── FinanceDashboard.tsx
│   │   ├── MyReimbursements.tsx
│   │   ├── NewClaim.tsx
│   │   ├── NewRequest.tsx
│   │   ├── RequestDetails.tsx
│   │   └── WorkflowConfiguration.tsx
│   ├── db/              # 数据库
│   │   └── index.ts
│   ├── App.tsx          # 应用入口
│   └── main.tsx
├── server.ts            # Express 服务器
├── package.json
└── docs/               # 文档目录
```

### 2.3 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React + Vite)                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ Dashboard│  │ Claimant│  │ Finance │  │  Admin  │   │
│  │  Page   │  │  Portal │  │  Portal │  │  Portal │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API Layer (Express)                   │
│  /api/claims  /api/requests  /api/auth  /api/workflows│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Business Logic Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Claim Service│  │  Auth Service│  │Workflow Eng │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Data Layer (SQLite)                   │
│   users | claims | requests | approvals | workflows     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 核心功能模块

### 3.1 报销单管理

#### 3.1.1 创建报销单

**接口**: `POST /api/claims`

**请求体**:
```json
{
  "description": "Q1 Travel Expenses",
  "claimant_id": "u1",
  "items": [
    {
      "type": "Travel",
      "description": "Flight to NYC",
      "amount": 500.00,
      "currency": "USD",
      "vendor_id": "v1"
    }
  ]
}
```

#### 3.1.2 状态显示系统

| 状态 | 中文 | 图标 | 颜色 | 触发条件 |
|------|------|------|------|---------|
| Draft | 草稿 | ✏️ Edit3 | 灰色 | 创建未提交 |
| Submitted | 已提交 | 📤 Send | 蓝色 | 提交后 |
| Approval | 审批中 | ⏳ Hourglass | 黄色 | 审批流程中 |
| Approved | 审批通过 | ✅ CircleCheck | 绿色 | 审批通过 |
| Rejected | 审批拒绝 | ❌ CircleX | 红色 | 审批拒绝 |
| Processing Payment | 处理中 | ⏰ Clock | 蓝色 | 付款处理 |
| Paid | 已完成 | ✅ CheckCircle2 | 绿色 | 全部完成 |

### 3.2 审批流程

#### 3.2.1 审批操作

**接口**: 
- `POST /api/requests/:id/approve`
- `POST /api/requests/:id/reject`

**请求体**:
```json
{
  "approver_id": "u1",
  "comments": "Approved for payment"
}
```

### 3.3 模板管理

管理员可以配置邮件通知模板，支持以下变量替换：
- `{{REQUEST_ID}}` - 请求ID
- `{{CLAIMANT_NAME}} - 申请人姓名`
- `{{AMOUNT}}` - 金额
- `{{STATUS}}` - 状态
- `{{COMMENTS}}` - 审批意见
- `{{APPROVER_NAME}}` - 审批人姓名

---

## 4. 工作流引擎

### 4.1 技术选型

**选用库**: @xyflow/react (React Flow)

**选型理由**:
1. React 生态中最流行的流程图可视化库
2. 强大的节点自定义能力
3. 完善的拖拽、连接交互
4. 活跃的社区支持

### 4.2 节点类型

| 节点类型 | 说明 | 配置项 |
|----------|------|--------|
| start | 开始节点 | 标签 |
| approval | 审批节点 | 标签、审批人角色 |
| action | 操作节点 | 标签、执行动作 |
| condition | 条件节点 | 标签、条件表达式 |
| end | 结束节点 | 标签 |

### 4.3 挂接机制

工作流通过 `entity_type` 字段挂接到不同的业务类型：

```sql
entity_type:
  - 'claim'   报销单
  - 'request'  费用请求
  - 'invoice' 发票
```

**挂接流程**:
1. 创建业务单据时，根据 `entity_type` 获取默认工作流
2. 创建工作流实例 (`workflow_instances`)
3. 审批时根据节点配置推进流程

### 4.4 工作流配置页面

**访问路径**: `/admin/workflows`

**功能特性**:
- 可视化流程设计器（拖拽式节点）
- 节点属性编辑（标签、审批人、条件等）
- 工作流管理（创建、编辑、删除、设为默认）
- 预览已配置的工作流

---

## 5. 数据库设计

### 5.1 核心表结构

#### 5.1.1 users - 用户表

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  company_id TEXT,
  avatar TEXT
);
```

#### 5.1.2 claims - 报销单表

```sql
CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  claimant_id TEXT NOT NULL,
  description TEXT NOT NULL,
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'Draft',
  step INTEGER DEFAULT 1,
  workflow_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5.1.3 requests - 费用请求表

```sql
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  claim_id TEXT,
  type TEXT NOT NULL,
  claimant_id TEXT NOT NULL,
  vendor_id TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  attachment_url TEXT,
  step INTEGER DEFAULT 1,
  workflow_id TEXT,
  current_node_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5.1.4 approvals - 审批记录表

```sql
CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  approver_id TEXT NOT NULL,
  status TEXT NOT NULL,
  step INTEGER NOT NULL,
  node_id TEXT,
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 工作流相关表

#### 5.2.1 workflows - 工作流定义表

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5.2.2 workflow_nodes - 工作流节点表

```sql
CREATE TABLE workflow_nodes (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  label TEXT NOT NULL,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  config TEXT,
  approver_role TEXT,
  approver_department TEXT,
  approver_user_id TEXT,
  condition TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5.2.3 workflow_instances - 工作流实例表

```sql
CREATE TABLE workflow_instances (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  current_node_id TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

#### 5.2.4 workflow_history - 工作流历史表

```sql
CREATE TABLE workflow_history (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  comments TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 ER 关系图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │   claims    │       │  requests   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──┐   │ id (PK)     │──┐   │ id (PK)     │
│ name        │   │   │ claimant_id │───┼───│ claim_id    │
│ email       │   │   │ status      │   │   │ claimant_id │
│ role        │   └───│ step        │   │   │ status     │
│ department  │       │ workflow_id │   └───│ step       │
└─────────────┘       └─────────────┘       │ workflow_id │
                                            │ current_node│
┌─────────────┐       ┌─────────────┐       └─────────────┘
│  approvals  │       │ workflows   │
├─────────────┤       ├─────────────┤       ┌─────────────┐
│ id (PK)     │       │ id (PK)     │       │wf_instances│
│ request_id  │───┐   │ name        │       ├─────────────┤
│ approver_id │   │   │ entity_type │       │ id (PK)     │
│ status      │   │   │ is_default  │       │ workflow_id │
│ step        │   │   │ nodes (JSON)│       │ entity_id   │
│ node_id     │───┴───│ edges (JSON)│       │ current_node│
└─────────────┘       └─────────────┘       │ status     │
                                            └─────────────┘
```

---

## 6. API接口规范

### 6.1 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/logout | 用户登出 |

### 6.2 报销单接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/claims | 获取报销单列表 |
| GET | /api/claims/:id | 获取报销单详情 |
| POST | /api/claims | 创建报销单 |
| PUT | /api/claims/:id | 更新报销单 |
| DELETE | /api/claims/:id | 删除报销单 |
| POST | /api/claims/:id/withdraw | 撤回报销单 |

### 6.3 审批接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/requests/:id | 获取请求详情 |
| POST | /api/requests/:id/approve | 审批通过 |
| POST | /api/requests/:id/reject | 审批拒绝 |

### 6.4 工作流接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/workflows | 获取工作流列表 |
| GET | /api/workflows/:id | 获取工作流详情 |
| POST | /api/workflows | 创建工作流 |
| PUT | /api/workflows/:id | 更新工作流 |
| DELETE | /api/workflows/:id | 删除工作流 |
| GET | /api/workflow/todos | 获取待办审批列表 |

---

## 7. 前端组件

### 7.1 Layout 组件

侧边栏布局组件，提供以下功能：

#### 7.1.1 折叠/展开功能

- **控制按钮**: 位于侧边栏顶部
- **动画**: 300ms 过渡动画
- **快捷键**: Alt + S
- **存储**: localStorage 持久化
- **响应式**: 移动端默认收起

#### 7.1.2 导航结构

```
 Claimant Portal (默认)
 ├── Overview (/)
 ├── My Reimbursements (/reimbursements)
 └── Approvals (/approvals)

 Admin Portal (/admin)
 ├── Workflows (/admin)
 ├── Email Templates (/admin/templates)
 ├── Users & Roles (/admin/users)
 └── Global Settings (/admin/settings)
```

### 7.2 ClaimDetails 组件

报销单详情页，展示：
- 报销单基本信息
- 费用明细项
- 审批进度时间线
- 审批历史记录

### 7.3 WorkflowConfiguration 组件

工作流配置页面，提供：
- 可视化流程设计器
- 节点添加/编辑/删除
- 工作流保存/加载

---

## 8. 部署与运维

### 8.1 环境要求

- Node.js 18+
- npm 9+
- SQLite3

### 8.2 启动命令

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 生产构建
npm run build

# 运行测试
npm test
```

### 8.3 服务器配置

- **端口**: 3008
- **静态文件**: /uploads (文件上传目录)
- **数据库**: data.db (SQLite 文件)

### 8.4 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 员工 | david@example.com | password123 |
| 财务 | sarah@example.com | password123 |
| 管理员 | admin@example.com | admin123 |

---

## 9. 附录

### 9.1 术语表

| 术语 | 说明 |
|------|------|
| Claim | 报销单，包含多个费用项 |
| Request | 单一费用请求 |
| Approval | 审批记录 |
| Workflow | 工作流定义 |
| Node | 工作流节点 |
| Entity Type | 业务实体类型 |

### 9.2 依赖版本

```json
{
  "react": "^19.0.0",
  "react-router-dom": "^7.13.1",
  "express": "^4.21.2",
  "better-sqlite3": "^12.4.1",
  "@xyflow/react": "^12.10.1",
  "tailwindcss": "^4.1.14",
  "vite": "^6.2.0",
  "typescript": "~5.8.2"
}
```

### 9.3 更新日志

#### v1.0.0 (2026-03-08)
- 初始版本发布
- 工作流引擎集成 (@xyflow/react)
- 侧边栏折叠功能
- 状态显示系统优化
- 响应式设计完善

---

## 文档版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| 1.0.0 | 2026-03-08 | Tony Gong | 初始文档创建 |

---

*本文档最后更新于 2026-03-08*
