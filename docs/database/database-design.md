# 数据库设计文档
## ClaimFlow - 企业费用报销管理系统

**文档版本**: v1.0  
**数据库类型**: SQLite  
**创建日期**: 2025-03-08  
**最后更新**: 2025-03-08  
**数据库文件**: data.db  

---

## 目录

1. [数据库概述](#1-数据库概述)
2. [ER 图](#2-er-图)
3. [数据表设计](#3-数据表设计)
4. [索引设计](#4-索引设计)
5. [数据关系](#5-数据关系)
6. [数据字典](#6-数据字典)
7. [数据迁移](#7-数据迁移)
8. [数据备份](#8-数据备份)

---

## 1. 数据库概述

### 1.1 数据库选型

本项目选用 **SQLite** 作为数据库管理系统,主要考虑以下因素:

| 因素 | 说明 |
|------|------|
| 轻量级 | 零配置,无需独立服务器进程 |
| 易部署 | 单文件数据库,便于迁移和备份 |
| 性能 | 对于中小型应用性能足够 |
| 可靠性 | ACID 事务支持 |
| 成本 | 开源免费,降低部署成本 |

### 1.2 数据库架构

```
┌─────────────────────────────────────────────┐
│           Application Layer                 │
│  ┌────────────────────────────────────────┐ │
│  │  Data Access Layer (DAL)               │ │
│  │  - Repository Pattern                  │ │
│  │  - Transaction Management              │ │
│  └────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│           SQLite Database                   │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Core Tables  │  │ Workflow     │         │
│  │ - users      │  │ - workflows  │         │
│  │ - claims     │  │ - instances  │         │
│  │ - requests   │  │ - tasks      │         │
│  │ - approvals  │  │ - history    │         │
│  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Support      │  │ System       │         │
│  │ - vendors    │  │ - audit_logs │         │
│  │ - departments│  │ - sync_log   │         │
│  │ - companies  │  │ - notifs     │         │
│  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
```

### 1.3 数据库统计

| 统计项 | 数量 |
|--------|------|
| 数据表 | 16 |
| 索引 | 12 |
| 外键关系 | 15 |
| 视图 | 0 |
| 触发器 | 0 |

---

## 2. ER 图

### 2.1 核心实体关系图

```
┌─────────────┐
│   users     │
│  (用户表)    │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐       ┌─────────────┐
│   claims    │←──────│  requests   │
│  (报销单)    │  1:N  │  (报销项)    │
└──────┬──────┘       └──────┬──────┘
       │                     │
       │                     │ 1:N
       │                     ↓
       │              ┌─────────────┐
       │              │ approvals   │
       │              │  (审批记录)  │
       │              └─────────────┘
       │
       │ N:1
       ↓
┌─────────────┐
│ workflows   │
│  (工作流)    │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌──────────────────┐
│ workflow_instances│
│   (工作流实例)     │
└──────┬───────────┘
       │
       │ 1:N
       ↓
┌─────────────┐
│workflow_tasks│
│ (工作流任务)  │
└─────────────┘
```

### 2.2 完整实体关系图

```
users ──────┬────── claims ─────── requests ─────── approvals
            │           │                │
            │           │                └── vendors
            │           │
            │           └── workflows ──── workflow_instances
            │                                  │
            │                                  └── workflow_tasks
            │                                  │
            │                                  └── workflow_history
            │
            ├── departments
            │
            ├── companies
            │
            ├── notifications
            │
            ├── audit_logs
            │
            └── hr_sync_log
```

---

## 3. 数据表设计

### 3.1 用户管理表

#### 3.1.1 users (用户表)

**表说明**: 存储系统用户信息

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 用户唯一标识 (主键) |
| name | TEXT | 100 | 是 | - | 用户姓名 |
| email | TEXT | 255 | 是 | - | 邮箱地址 (唯一) |
| password | TEXT | 255 | 是 | - | 密码 (bcrypt 加密) |
| role | TEXT | 50 | 是 | - | 用户角色 |
| department | TEXT | 100 | 否 | NULL | 所属部门 |
| company_id | TEXT | 50 | 否 | NULL | 所属公司 ID |
| avatar | TEXT | 10 | 否 | NULL | 头像 (姓名缩写) |
| manager_id | TEXT | 50 | 否 | NULL | 直属上级 ID |
| job_title | TEXT | 100 | 否 | NULL | 职位名称 |
| employee_number | TEXT | 50 | 否 | NULL | 员工编号 (唯一) |
| hire_date | DATE | - | 否 | NULL | 入职日期 |
| cost_center | TEXT | 50 | 否 | NULL | 成本中心 |
| location | TEXT | 100 | 否 | NULL | 工作地点 |
| is_active | INTEGER | 1 | 是 | 1 | 是否激活 (0/1) |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 更新时间 |

**主键**: id  
**外键**: 
- manager_id → users(id)
- company_id → companies(id)

**索引**:
- idx_users_email (email)
- idx_users_employee_number (employee_number)
- idx_users_manager (manager_id)

**角色枚举**:
- Employee: 普通员工
- Manager: 部门经理
- Finance: 财务人员
- Finance Lead: 财务主管
- Admin: 系统管理员

---

#### 3.1.2 departments (部门表)

**表说明**: 存储部门信息

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 部门唯一标识 (主键) |
| name | TEXT | 100 | 是 | - | 部门名称 |
| code | TEXT | 20 | 是 | - | 部门代码 (唯一) |
| parent_id | TEXT | 50 | 否 | NULL | 上级部门 ID |
| manager_id | TEXT | 50 | 否 | NULL | 部门经理 ID |
| head_count | INTEGER | - | 是 | 0 | 部门人数 |
| budget | REAL | - | 是 | 0 | 部门预算 |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |

**主键**: id  
**外键**:
- parent_id → departments(id)
- manager_id → users(id)

---

#### 3.1.3 companies (公司表)

**表说明**: 存储公司信息

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 公司唯一标识 (主键) |
| name | TEXT | 100 | 是 | - | 公司名称 |
| code | TEXT | 20 | 是 | - | 公司代码 (唯一) |

**主键**: id

---

### 3.2 报销管理表

#### 3.2.1 claims (报销单表)

**表说明**: 存储报销单信息

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 报销单号 (主键, CLM-XXXX) |
| claimant_id | TEXT | 50 | 是 | - | 申请人 ID |
| description | TEXT | - | 是 | - | 报销说明 |
| total_amount | REAL | - | 是 | - | 报销总金额 |
| currency | TEXT | 10 | 是 | 'USD' | 币种 |
| status | TEXT | 50 | 是 | 'Draft' | 当前状态 |
| step | INTEGER | - | 是 | 1 | 当前步骤 |
| workflow_id | TEXT | 50 | 否 | NULL | 工作流 ID |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 更新时间 |

**主键**: id  
**外键**:
- claimant_id → users(id)
- workflow_id → workflows(id)

**索引**:
- idx_claims_claimant (claimant_id)
- idx_claims_status (status)
- idx_claims_created (created_at)

**状态枚举**:
- Draft: 草稿
- Pending: 待审批
- Pending Finance: 待财务审批
- Processing Payment: 处理付款
- Approved: 已批准
- Paid: 已支付
- Rejected: 已拒绝
- Withdrawn: 已撤回

---

#### 3.2.2 requests (报销项表)

**表说明**: 存储报销项明细

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 报销项 ID (主键, REQ-XXXX) |
| claim_id | TEXT | 50 | 否 | NULL | 所属报销单 ID |
| type | TEXT | 50 | 是 | - | 报销类型 |
| claimant_id | TEXT | 50 | 是 | - | 申请人 ID |
| vendor_id | TEXT | 50 | 否 | NULL | 供应商 ID |
| amount | REAL | - | 是 | - | 报销金额 |
| currency | TEXT | 10 | 是 | - | 币种 |
| status | TEXT | 50 | 是 | - | 当前状态 |
| description | TEXT | - | 否 | NULL | 报销说明 |
| attachment_url | TEXT | 255 | 否 | NULL | 附件 URL |
| step | INTEGER | - | 是 | 1 | 当前步骤 |
| workflow_id | TEXT | 50 | 否 | NULL | 工作流 ID |
| current_node_id | TEXT | 50 | 否 | NULL | 当前节点 ID |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 更新时间 |

**主键**: id  
**外键**:
- claim_id → claims(id)
- claimant_id → users(id)
- vendor_id → vendors(id)
- workflow_id → workflows(id)

**索引**:
- idx_requests_claim (claim_id)
- idx_requests_claimant (claimant_id)
- idx_requests_status (status)

**类型枚举**:
- Travel: 差旅
- Entertainment: 招待
- Procurement: 采购
- Other: 其他

---

#### 3.2.3 approvals (审批记录表)

**表说明**: 存储审批记录

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 审批记录 ID (主键) |
| request_id | TEXT | 50 | 是 | - | 报销项 ID |
| approver_id | TEXT | 50 | 是 | - | 审批人 ID |
| status | TEXT | 50 | 是 | - | 审批状态 |
| step | INTEGER | - | 是 | - | 审批步骤 |
| node_id | TEXT | 50 | 否 | NULL | 工作流节点 ID |
| comments | TEXT | - | 否 | NULL | 审批意见 |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 更新时间 |

**主键**: id  
**外键**:
- request_id → requests(id)
- approver_id → users(id)

**索引**:
- idx_approvals_request (request_id)
- idx_approvals_approver (approver_id)

**状态枚举**:
- Approved: 已批准
- Rejected: 已拒绝
- Pending: 待审批

---

#### 3.2.4 vendors (供应商表)

**表说明**: 存储供应商信息

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 供应商 ID (主键) |
| name | TEXT | 100 | 是 | - | 供应商名称 |
| code | TEXT | 20 | 是 | - | 供应商代码 (唯一) |
| region | TEXT | 50 | 否 | NULL | 地区 |
| status | TEXT | 50 | 否 | NULL | 状态 |

**主键**: id

---

### 3.3 工作流引擎表

#### 3.3.1 workflows (工作流定义表)

**表说明**: 存储工作流定义

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 工作流 ID (主键, wf-X) |
| name | TEXT | 100 | 是 | - | 工作流名称 |
| description | TEXT | - | 否 | NULL | 工作流描述 |
| entity_type | TEXT | 50 | 是 | - | 实体类型 |
| is_default | INTEGER | 1 | 是 | 0 | 是否默认工作流 |
| is_active | INTEGER | 1 | 是 | 1 | 是否激活 |
| nodes | TEXT | - | 否 | NULL | 节点定义 (JSON) |
| edges | TEXT | - | 否 | NULL | 连线定义 (JSON) |
| bpmn_xml | TEXT | - | 否 | NULL | BPMN XML 定义 |
| version | INTEGER | - | 是 | 1 | 版本号 |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 更新时间 |

**主键**: id

**索引**:
- idx_workflows_entity (entity_type, is_active)

---

#### 3.3.2 workflow_nodes (工作流节点表)

**表说明**: 存储工作流节点信息

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 节点 ID (主键) |
| workflow_id | TEXT | 50 | 是 | - | 工作流 ID |
| node_type | TEXT | 50 | 是 | - | 节点类型 |
| label | TEXT | 100 | 是 | - | 节点标签 |
| position_x | REAL | - | 是 | 0 | X 坐标 |
| position_y | REAL | - | 是 | 0 | Y 坐标 |
| config | TEXT | - | 否 | NULL | 节点配置 (JSON) |
| approver_role | TEXT | 50 | 否 | NULL | 审批人角色 |
| approver_department | TEXT | 100 | 否 | NULL | 审批人部门 |
| approver_user_id | TEXT | 50 | 否 | NULL | 审批人 ID |
| condition | TEXT | - | 否 | NULL | 条件表达式 |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |

**主键**: id  
**外键**:
- workflow_id → workflows(id) ON DELETE CASCADE

**节点类型枚举**:
- start: 开始节点
- approval: 审批节点
- condition: 条件节点
- action: 动作节点
- end: 结束节点

---

#### 3.3.3 workflow_instances (工作流实例表)

**表说明**: 存储工作流执行实例

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 实例 ID (主键) |
| workflow_id | TEXT | 50 | 是 | - | 工作流 ID |
| entity_type | TEXT | 50 | 是 | - | 实体类型 |
| entity_id | TEXT | 50 | 是 | - | 实体 ID |
| claimant_id | TEXT | 50 | 否 | NULL | 申请人 ID |
| current_node_id | TEXT | 50 | 否 | NULL | 当前节点 ID |
| status | TEXT | 50 | 是 | 'running' | 实例状态 |
| variables | TEXT | - | 否 | NULL | 流程变量 (JSON) |
| started_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 开始时间 |
| completed_at | DATETIME | - | 否 | NULL | 完成时间 |

**主键**: id  
**外键**:
- workflow_id → workflows(id)

**索引**:
- idx_instances_workflow (workflow_id, status)
- idx_instances_entity (entity_type, entity_id)

**状态枚举**:
- running: 运行中
- completed: 已完成
- cancelled: 已取消
- rejected: 已拒绝

---

#### 3.3.4 workflow_tasks (工作流任务表)

**表说明**: 存储工作流审批任务

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 任务 ID (主键) |
| instance_id | TEXT | 50 | 是 | - | 实例 ID |
| node_id | TEXT | 50 | 是 | - | 节点 ID |
| node_label | TEXT | 100 | 否 | NULL | 节点标签 |
| assignee_id | TEXT | 50 | 是 | - | 受让人 ID |
| status | TEXT | 50 | 是 | 'pending' | 任务状态 |
| comments | TEXT | - | 否 | NULL | 审批意见 |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 更新时间 |
| completed_at | DATETIME | - | 否 | NULL | 完成时间 |

**主键**: id  
**外键**:
- instance_id → workflow_instances(id)
- assignee_id → users(id)

**索引**:
- idx_tasks_assignee (assignee_id, status)

**状态枚举**:
- pending: 待处理
- approved: 已批准
- rejected: 已拒绝
- cancelled: 已取消

---

#### 3.3.5 workflow_history (工作流历史表)

**表说明**: 存储工作流执行历史

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 历史 ID (主键) |
| instance_id | TEXT | 50 | 是 | - | 实例 ID |
| node_id | TEXT | 50 | 是 | - | 节点 ID |
| action | TEXT | 50 | 是 | - | 操作类型 |
| actor_id | TEXT | 50 | 否 | NULL | 操作人 ID |
| comments | TEXT | - | 否 | NULL | 操作备注 |
| timestamp | DATETIME | - | 是 | CURRENT_TIMESTAMP | 操作时间 |

**主键**: id  
**外键**:
- instance_id → workflow_instances(id)

**操作类型枚举**:
- start: 启动流程
- approve: 批准
- reject: 拒绝
- delegate: 委托
- cancel: 取消

---

#### 3.3.6 approval_levels (审批层级表)

**表说明**: 存储审批层级配置

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 层级 ID (主键) |
| name | TEXT | 100 | 是 | - | 层级名称 |
| level_order | INTEGER | - | 是 | - | 层级顺序 |
| approver_type | TEXT | 50 | 是 | - | 审批人类型 |
| approver_role | TEXT | 50 | 否 | NULL | 审批人角色 |
| approver_department | TEXT | 100 | 否 | NULL | 审批人部门 |
| approver_user_id | TEXT | 50 | 否 | NULL | 审批人 ID |
| condition_type | TEXT | 50 | 否 | NULL | 条件类型 |
| condition_value | REAL | - | 否 | NULL | 条件值 |
| workflow_id | TEXT | 50 | 是 | - | 工作流 ID |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |

**主键**: id  
**外键**:
- workflow_id → workflows(id)

---

### 3.4 系统管理表

#### 3.4.1 notifications (通知表)

**表说明**: 存储用户通知

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 通知 ID (主键) |
| user_id | TEXT | 50 | 是 | - | 用户 ID |
| type | TEXT | 50 | 是 | - | 通知类型 |
| title | TEXT | 100 | 是 | - | 通知标题 |
| message | TEXT | - | 否 | NULL | 通知内容 |
| link | TEXT | 255 | 否 | NULL | 相关链接 |
| is_read | INTEGER | 1 | 是 | 0 | 是否已读 |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |

**主键**: id  
**外键**:
- user_id → users(id)

**索引**:
- idx_notifications_user (user_id, is_read)

**通知类型枚举**:
- approval_required: 需要审批
- approved: 已批准
- rejected: 已拒绝
- completed: 已完成
- delegated: 已委托
- escalation: 升级通知

---

#### 3.4.2 audit_logs (审计日志表)

**表说明**: 存储系统审计日志

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 日志 ID (主键) |
| user_id | TEXT | 50 | 否 | NULL | 用户 ID |
| action | TEXT | 100 | 是 | - | 操作类型 |
| entity_type | TEXT | 50 | 否 | NULL | 实体类型 |
| entity_id | TEXT | 50 | 否 | NULL | 实体 ID |
| details | TEXT | - | 否 | NULL | 详细信息 (JSON) |
| ip_address | TEXT | 50 | 否 | NULL | IP 地址 |
| user_agent | TEXT | 255 | 否 | NULL | 用户代理 |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |

**主键**: id

**索引**:
- idx_audit_user (user_id)
- idx_audit_entity (entity_type, entity_id)
- idx_audit_created (created_at)

---

#### 3.4.3 hr_sync_log (HR 同步日志表)

**表说明**: 存储 HR 系统同步日志

| 字段名 | 数据类型 | 长度 | 必填 | 默认值 | 说明 |
|--------|---------|------|------|--------|------|
| id | TEXT | 50 | 是 | - | 日志 ID (主键) |
| sync_type | TEXT | 50 | 是 | - | 同步类型 |
| status | TEXT | 50 | 是 | - | 同步状态 |
| records_processed | INTEGER | - | 是 | 0 | 处理记录数 |
| records_failed | INTEGER | - | 是 | 0 | 失败记录数 |
| error_message | TEXT | - | 否 | NULL | 错误信息 |
| created_at | DATETIME | - | 是 | CURRENT_TIMESTAMP | 创建时间 |
| completed_at | DATETIME | - | 否 | NULL | 完成时间 |

**主键**: id

**同步类型枚举**:
- full_sync: 全量同步
- single_sync: 单条同步
- incremental_sync: 增量同步

**状态枚举**:
- pending: 待处理
- running: 运行中
- completed: 已完成
- completed_with_errors: 完成但有错误
- failed: 失败

---

## 4. 索引设计

### 4.1 索引列表

| 索引名 | 表名 | 字段 | 类型 | 说明 |
|--------|------|------|------|------|
| idx_users_email | users | email | UNIQUE | 邮箱唯一索引 |
| idx_users_employee_number | users | employee_number | UNIQUE | 员工编号唯一索引 |
| idx_users_manager | users | manager_id | INDEX | 上级查询优化 |
| idx_claims_claimant | claims | claimant_id | INDEX | 申请人查询优化 |
| idx_claims_status | claims | status | INDEX | 状态筛选优化 |
| idx_claims_created | claims | created_at | INDEX | 时间排序优化 |
| idx_requests_claim | requests | claim_id | INDEX | 报销单关联优化 |
| idx_requests_claimant | requests | claimant_id | INDEX | 申请人查询优化 |
| idx_requests_status | requests | status | INDEX | 状态筛选优化 |
| idx_approvals_request | approvals | request_id | INDEX | 报销项关联优化 |
| idx_approvals_approver | approvals | approver_id | INDEX | 审批人查询优化 |
| idx_workflows_entity | workflows | entity_type, is_active | COMPOSITE | 实体类型查询优化 |
| idx_instances_workflow | workflow_instances | workflow_id, status | COMPOSITE | 工作流实例查询优化 |
| idx_instances_entity | workflow_instances | entity_type, entity_id | COMPOSITE | 实体关联查询优化 |
| idx_tasks_assignee | workflow_tasks | assignee_id, status | COMPOSITE | 任务查询优化 |
| idx_notifications_user | notifications | user_id, is_read | COMPOSITE | 通知查询优化 |
| idx_audit_user | audit_logs | user_id | INDEX | 审计日志查询优化 |
| idx_audit_entity | audit_logs | entity_type, entity_id | COMPOSITE | 实体审计查询优化 |
| idx_audit_created | audit_logs | created_at | INDEX | 时间排序优化 |

### 4.2 索引创建语句

```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_employee_number ON users(employee_number);
CREATE INDEX idx_users_manager ON users(manager_id);

CREATE INDEX idx_claims_claimant ON claims(claimant_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_created ON claims(created_at);

CREATE INDEX idx_requests_claim ON requests(claim_id);
CREATE INDEX idx_requests_claimant ON requests(claimant_id);
CREATE INDEX idx_requests_status ON requests(status);

CREATE INDEX idx_approvals_request ON approvals(request_id);
CREATE INDEX idx_approvals_approver ON approvals(approver_id);

CREATE INDEX idx_workflows_entity ON workflows(entity_type, is_active);

CREATE INDEX idx_instances_workflow ON workflow_instances(workflow_id, status);
CREATE INDEX idx_instances_entity ON workflow_instances(entity_type, entity_id);

CREATE INDEX idx_tasks_assignee ON workflow_tasks(assignee_id, status);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

## 5. 数据关系

### 5.1 外键关系

```sql
-- users 表外键
ALTER TABLE users ADD FOREIGN KEY (manager_id) REFERENCES users(id);
ALTER TABLE users ADD FOREIGN KEY (company_id) REFERENCES companies(id);

-- departments 表外键
ALTER TABLE departments ADD FOREIGN KEY (parent_id) REFERENCES departments(id);
ALTER TABLE departments ADD FOREIGN KEY (manager_id) REFERENCES users(id);

-- claims 表外键
ALTER TABLE claims ADD FOREIGN KEY (claimant_id) REFERENCES users(id);
ALTER TABLE claims ADD FOREIGN KEY (workflow_id) REFERENCES workflows(id);

-- requests 表外键
ALTER TABLE requests ADD FOREIGN KEY (claim_id) REFERENCES claims(id);
ALTER TABLE requests ADD FOREIGN KEY (claimant_id) REFERENCES users(id);
ALTER TABLE requests ADD FOREIGN KEY (vendor_id) REFERENCES vendors(id);
ALTER TABLE requests ADD FOREIGN KEY (workflow_id) REFERENCES workflows(id);

-- approvals 表外键
ALTER TABLE approvals ADD FOREIGN KEY (request_id) REFERENCES requests(id);
ALTER TABLE approvals ADD FOREIGN KEY (approver_id) REFERENCES users(id);

-- workflow_nodes 表外键
ALTER TABLE workflow_nodes ADD FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;

-- workflow_instances 表外键
ALTER TABLE workflow_instances ADD FOREIGN KEY (workflow_id) REFERENCES workflows(id);

-- workflow_tasks 表外键
ALTER TABLE workflow_tasks ADD FOREIGN KEY (instance_id) REFERENCES workflow_instances(id);
ALTER TABLE workflow_tasks ADD FOREIGN KEY (assignee_id) REFERENCES users(id);

-- workflow_history 表外键
ALTER TABLE workflow_history ADD FOREIGN KEY (instance_id) REFERENCES workflow_instances(id);

-- approval_levels 表外键
ALTER TABLE approval_levels ADD FOREIGN KEY (workflow_id) REFERENCES workflows(id);

-- notifications 表外键
ALTER TABLE notifications ADD FOREIGN KEY (user_id) REFERENCES users(id);
```

### 5.2 关系矩阵

| 子表 | 父表 | 关系类型 | 说明 |
|------|------|---------|------|
| users | users | 自引用 | 用户层级关系 |
| users | companies | N:1 | 用户属于公司 |
| departments | departments | 自引用 | 部门层级关系 |
| departments | users | N:1 | 部门经理 |
| claims | users | N:1 | 报销单属于用户 |
| claims | workflows | N:1 | 报销单使用工作流 |
| requests | claims | N:1 | 报销项属于报销单 |
| requests | users | N:1 | 报销项属于用户 |
| requests | vendors | N:1 | 报销项关联供应商 |
| approvals | requests | N:1 | 审批记录属于报销项 |
| approvals | users | N:1 | 审批人 |
| workflow_nodes | workflows | N:1 | 节点属于工作流 |
| workflow_instances | workflows | N:1 | 实例属于工作流 |
| workflow_tasks | workflow_instances | N:1 | 任务属于实例 |
| workflow_tasks | users | N:1 | 任务分配给用户 |
| workflow_history | workflow_instances | N:1 | 历史属于实例 |
| notifications | users | N:1 | 通知属于用户 |

---

## 6. 数据字典

### 6.1 枚举值定义

#### 用户角色 (role)

| 值 | 显示名称 | 说明 |
|----|---------|------|
| Employee | 普通员工 | 基础角色,可提交报销 |
| Manager | 部门经理 | 可审批本部门报销 |
| Finance | 财务人员 | 可审批财务相关报销 |
| Finance Lead | 财务主管 | 高级财务审批权限 |
| Admin | 系统管理员 | 系统管理权限 |

#### 报销单状态 (status)

| 值 | 显示名称 | 说明 |
|----|---------|------|
| Draft | 草稿 | 未提交状态 |
| Pending | 待审批 | 待经理审批 |
| Pending Finance | 待财务审批 | 待财务部门审批 |
| Processing Payment | 处理付款 | 正在处理付款 |
| Approved | 已批准 | 审批通过 |
| Paid | 已支付 | 款项已支付 |
| Rejected | 已拒绝 | 审批拒绝 |
| Withdrawn | 已撤回 | 申请人撤回 |

#### 报销类型 (type)

| 值 | 显示名称 | 说明 |
|----|---------|------|
| Travel | 差旅 | 差旅费用 |
| Entertainment | 招待 | 业务招待费用 |
| Procurement | 采购 | 物品采购费用 |
| Other | 其他 | 其他费用 |

#### 工作流节点类型 (node_type)

| 值 | 显示名称 | 说明 |
|----|---------|------|
| start | 开始节点 | 流程起点 |
| approval | 审批节点 | 需要审批 |
| condition | 条件节点 | 条件判断 |
| action | 动作节点 | 自动执行 |
| end | 结束节点 | 流程终点 |

#### 工作流实例状态 (status)

| 值 | 显示名称 | 说明 |
|----|---------|------|
| running | 运行中 | 流程正在执行 |
| completed | 已完成 | 流程正常结束 |
| cancelled | 已取消 | 流程被取消 |
| rejected | 已拒绝 | 流程被拒绝 |

#### 任务状态 (status)

| 值 | 显示名称 | 说明 |
|----|---------|------|
| pending | 待处理 | 等待处理 |
| approved | 已批准 | 已批准 |
| rejected | 已拒绝 | 已拒绝 |
| cancelled | 已取消 | 已取消 |

---

## 7. 数据迁移

### 7.1 初始化脚本

数据库初始化脚本位于: `src/db/index.ts`

**初始化流程**:
1. 创建所有数据表
2. 创建索引
3. 插入种子数据

### 7.2 种子数据

系统初始化时会插入以下种子数据:

- 8 个用户 (不同角色)
- 5 个部门
- 1 个公司
- 6 个供应商
- 15 个报销单
- 20+ 个报销项
- 1 个默认工作流

### 7.3 数据迁移策略

#### 版本迁移

```sql
-- 示例: 添加新字段
ALTER TABLE users ADD COLUMN phone TEXT;

-- 示例: 创建新表
CREATE TABLE new_table (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- 示例: 数据迁移
UPDATE users SET new_field = 'default_value' WHERE new_field IS NULL;
```

#### 备份恢复

```bash
# 备份数据库
cp data.db data.db.backup

# 恢复数据库
cp data.db.backup data.db
```

---

## 8. 数据备份

### 8.1 备份策略

| 备份类型 | 频率 | 保留期限 | 存储位置 |
|---------|------|---------|---------|
| 全量备份 | 每日 | 30 天 | 本地 + 云存储 |
| 增量备份 | 每小时 | 7 天 | 本地 |
| 实时备份 | 实时 | 24 小时 | 本地 |

### 8.2 备份脚本

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_FILE="data.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
sqlite3 $DB_FILE ".backup '$BACKUP_DIR/data_$DATE.db'"

# 压缩备份
gzip $BACKUP_DIR/data_$DATE.db

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: data_$DATE.db.gz"
```

### 8.3 恢复流程

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
DB_FILE="data.db"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file>"
  exit 1
fi

# 停止应用
# systemctl stop claimflow

# 备份当前数据库
cp $DB_FILE ${DB_FILE}.old

# 恢复数据库
gunzip -c $BACKUP_FILE > $DB_FILE

# 启动应用
# systemctl start claimflow

echo "Restore completed from: $BACKUP_FILE"
```

---

## 附录

### A. 查询优化建议

#### A.1 常用查询优化

```sql
-- 优化前: 全表扫描
SELECT * FROM claims WHERE claimant_id = 'u1';

-- 优化后: 使用索引
SELECT * FROM claims WHERE claimant_id = 'u1' ORDER BY created_at DESC;

-- 优化前: 多次查询
SELECT * FROM claims WHERE id = 'CLM-001';
SELECT * FROM requests WHERE claim_id = 'CLM-001';

-- 优化后: 联表查询
SELECT c.*, r.*
FROM claims c
LEFT JOIN requests r ON c.id = r.claim_id
WHERE c.id = 'CLM-001';
```

#### A.2 分页查询

```sql
-- 使用 LIMIT 和 OFFSET
SELECT * FROM claims
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

### B. 数据库监控

#### B.1 性能指标

```sql
-- 查看表大小
SELECT name, SUM(pgsize) as size
FROM dbstat
GROUP BY name
ORDER BY size DESC;

-- 查看索引使用情况
SELECT * FROM sqlite_master WHERE type = 'index';

-- 查看数据库状态
PRAGMA database_list;
PRAGMA table_info(claims);
```

### C. 变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|---------|--------|
| v1.0 | 2025-03-08 | 初始版本 | DBA Team |

---

**文档结束**
