# API 接口文档
## ClaimFlow - 企业费用报销管理系统

**文档版本**: v1.0  
**API 版本**: v1  
**基础 URL**: `http://localhost:3008/api`  
**创建日期**: 2025-03-08  

---

## 目录

1. [API 概述](#1-api-概述)
2. [认证接口](#2-认证接口)
3. [报销管理接口](#3-报销管理接口)
4. [审批管理接口](#4-审批管理接口)
5. [工作流接口](#5-工作流接口)
6. [用户管理接口](#6-用户管理接口)
7. [报表统计接口](#7-报表统计接口)
8. [文件上传接口](#8-文件上传接口)
9. [错误码说明](#9-错误码说明)

---

## 1. API 概述

### 1.1 接口规范

- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: JWT Token
- **请求方式**: RESTful API

### 1.2 请求头

| 请求头 | 说明 | 必填 |
|--------|------|------|
| Content-Type | application/json | 是 |
| Authorization | Bearer {token} | 是 (需认证接口) |
| X-User-Id | 用户 ID | 是 (需认证接口) |

### 1.3 响应格式

#### 成功响应

```json
{
  "success": true,
  "data": { },
  "message": "操作成功"
}
```

#### 错误响应

```json
{
  "error": "错误信息",
  "code": "ERROR_CODE",
  "details": "详细错误信息"
}
```

### 1.4 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 2. 认证接口

### 2.1 用户登录

**接口**: `POST /api/auth/login`

**描述**: 用户登录认证,获取 JWT Token

**请求参数**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 用户邮箱 |
| password | string | 是 | 用户密码 |

**响应示例**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u1",
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "role": "Finance Lead",
    "department": "Finance",
    "avatar": "AJ"
  }
}
```

**状态码**:
- 200: 登录成功
- 401: 邮箱或密码错误

---

### 2.2 用户登出

**接口**: `POST /api/auth/logout`

**描述**: 用户登出,清除会话

**认证**: 需要

**响应示例**:

```json
{
  "success": true
}
```

---

### 2.3 获取当前用户信息

**接口**: `GET /api/auth/me`

**描述**: 获取当前登录用户的详细信息

**认证**: 需要

**响应示例**:

```json
{
  "id": "u1",
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "role": "Finance Lead",
  "department": "Finance",
  "avatar": "AJ",
  "job_title": "Finance Director",
  "manager_id": null
}
```

---

### 2.4 更新用户资料

**接口**: `PUT /api/auth/profile`

**描述**: 更新当前用户的个人资料

**认证**: 需要

**请求参数**:

```json
{
  "name": "Alex Johnson",
  "avatar": "AJ"
}
```

**响应示例**:

```json
{
  "id": "u1",
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "role": "Finance Lead",
  "department": "Finance",
  "avatar": "AJ"
}
```

---

## 3. 报销管理接口

### 3.1 获取报销单列表

**接口**: `GET /api/claims`

**描述**: 获取当前用户的报销单列表

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选 |
| page | number | 否 | 页码 (默认 1) |
| limit | number | 否 | 每页数量 (默认 20) |

**响应示例**:

```json
[
  {
    "id": "CLM-001",
    "claimant_id": "u2",
    "description": "Q1 Office Supplies",
    "total_amount": 450.00,
    "currency": "USD",
    "status": "Pending",
    "step": 1,
    "workflow_id": "wf-1",
    "created_at": "2025-03-08T10:00:00Z",
    "claimant_name": "Sarah Williams",
    "department": "Marketing",
    "avatar": "SW",
    "items": [
      {
        "id": "REQ-1001",
        "type": "Procurement",
        "amount": 2499.00,
        "vendor_name": "Apple Inc.",
        "description": "MacBook Pro M3"
      }
    ]
  }
]
```

---

### 3.2 获取报销单详情

**接口**: `GET /api/claims/:id`

**描述**: 获取指定报销单的详细信息

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 报销单 ID |

**响应示例**:

```json
{
  "id": "CLM-001",
  "claimant_id": "u2",
  "description": "Q1 Office Supplies",
  "total_amount": 450.00,
  "currency": "USD",
  "status": "Pending",
  "step": 1,
  "workflow_id": "wf-1",
  "created_at": "2025-03-08T10:00:00Z",
  "claimant_name": "Sarah Williams",
  "department": "Marketing",
  "avatar": "SW",
  "items": [
    {
      "id": "REQ-1001",
      "type": "Procurement",
      "amount": 2499.00,
      "vendor_id": "v1",
      "vendor_name": "Apple Inc.",
      "description": "MacBook Pro M3",
      "attachment_url": "/uploads/receipt-001.pdf"
    }
  ],
  "approvals": [
    {
      "id": "a1",
      "request_id": "REQ-1001",
      "approver_id": "u1",
      "approver_name": "Alex Johnson",
      "status": "Approved",
      "step": 1,
      "comments": "Looks good",
      "created_at": "2025-03-08T11:00:00Z"
    }
  ]
}
```

---

### 3.3 创建报销单

**接口**: `POST /api/claims`

**描述**: 创建新的报销单

**认证**: 需要

**请求参数**:

```json
{
  "description": "Business Trip to NYC",
  "claimant_id": "u2",
  "items": [
    {
      "type": "Travel",
      "vendor_id": "v5",
      "amount": 1250.00,
      "currency": "USD",
      "description": "Flight to Chicago",
      "attachment_url": "/uploads/receipt-001.pdf"
    },
    {
      "type": "Entertainment",
      "vendor_id": "v2",
      "amount": 45.50,
      "currency": "USD",
      "description": "Coffee with Client",
      "attachment_url": "/uploads/receipt-002.pdf"
    }
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| description | string | 是 | 报销说明 |
| claimant_id | string | 是 | 申请人 ID |
| items | array | 是 | 报销项列表 |

**响应示例**:

```json
{
  "id": "CLM-001",
  "status": "Pending",
  "totalAmount": 1295.50,
  "workflowId": "wf-1",
  "currentNodeId": "manager"
}
```

**状态码**:
- 201: 创建成功
- 400: 参数错误

---

### 3.4 撤回报销单

**接口**: `POST /api/claims/:id/withdraw`

**描述**: 撤回报销单

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 报销单 ID |

**响应示例**:

```json
{
  "success": true
}
```

**状态码**:
- 200: 撤回成功
- 400: 无法撤回 (状态不允许)

---

### 3.5 删除报销单

**接口**: `DELETE /api/claims/:id`

**描述**: 删除报销单 (仅限草稿状态)

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 报销单 ID |

**响应示例**:

```json
{
  "success": true
}
```

**状态码**:
- 200: 删除成功
- 400: 无法删除 (状态不允许)

---

## 4. 审批管理接口

### 4.1 获取待审批列表

**接口**: `GET /api/approvals`

**描述**: 获取当前用户待审批的报销单列表

**认证**: 需要

**响应示例**:

```json
[
  {
    "id": "CLM-003",
    "claimant_id": "u4",
    "description": "Business Trip to NYC",
    "total_amount": 1250.00,
    "status": "Pending",
    "step": 1,
    "claimant_name": "Elena Rossi",
    "department": "Sales Ops",
    "avatar": "ER",
    "items": [
      {
        "id": "REQ-2001",
        "type": "Travel",
        "amount": 1250.00,
        "vendor_name": "Delta Airlines"
      }
    ]
  }
]
```

---

### 4.2 批准报销单

**接口**: `POST /api/claims/:id/approve`

**描述**: 批准报销单

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 报销单 ID |

**请求参数**:

```json
{
  "comments": "Approved for business trip"
}
```

**响应示例**:

```json
{
  "success": true,
  "status": "Pending Finance"
}
```

---

### 4.3 拒绝报销单

**接口**: `POST /api/claims/:id/reject`

**描述**: 拒绝报销单

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 报销单 ID |

**请求参数**:

```json
{
  "comments": "Missing receipt for flight ticket"
}
```

**响应示例**:

```json
{
  "success": true,
  "status": "Rejected"
}
```

---

### 4.4 批准报销项

**接口**: `POST /api/requests/:id/approve`

**描述**: 批准单个报销项

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 报销项 ID |

**请求参数**:

```json
{
  "approver_id": "u1",
  "comments": "Approved"
}
```

**响应示例**:

```json
{
  "success": true,
  "newStatus": "Pending Finance",
  "nextStep": 2,
  "nextNodeId": "finance"
}
```

---

### 4.5 拒绝报销项

**接口**: `POST /api/requests/:id/reject`

**描述**: 拒绝单个报销项

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 报销项 ID |

**请求参数**:

```json
{
  "approver_id": "u1",
  "comments": "Receipt required"
}
```

**响应示例**:

```json
{
  "success": true,
  "status": "Rejected"
}
```

---

## 5. 工作流接口

### 5.1 获取工作流列表

**接口**: `GET /api/workflows`

**描述**: 获取所有工作流定义

**认证**: 需要

**响应示例**:

```json
[
  {
    "id": "wf-1",
    "name": "Standard Approval Workflow",
    "description": "Default approval workflow for expense claims",
    "entity_type": "claim",
    "is_default": 1,
    "is_active": 1,
    "version": 1,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### 5.2 获取工作流详情

**接口**: `GET /api/workflows/:id`

**描述**: 获取工作流详细信息

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 工作流 ID |

**响应示例**:

```json
{
  "id": "wf-1",
  "name": "Standard Approval Workflow",
  "description": "Default approval workflow for expense claims",
  "entity_type": "claim",
  "is_default": 1,
  "is_active": 1,
  "version": 1,
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "Submit",
        "nodeType": "start"
      }
    },
    {
      "id": "manager",
      "type": "approval",
      "position": { "x": 300, "y": 200 },
      "data": {
        "label": "Manager Approval",
        "nodeType": "approval",
        "approverRole": "Manager"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "start",
      "target": "manager"
    }
  ]
}
```

---

### 5.3 创建工作流

**接口**: `POST /api/workflows`

**描述**: 创建新的工作流

**认证**: 需要 (Admin 权限)

**请求参数**:

```json
{
  "name": "Custom Approval Workflow",
  "description": "Custom workflow for high-value claims",
  "entity_type": "claim",
  "is_default": false,
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "Submit", "nodeType": "start" }
    },
    {
      "id": "manager",
      "type": "approval",
      "position": { "x": 300, "y": 200 },
      "data": {
        "label": "Manager Approval",
        "nodeType": "approval",
        "approverRole": "Manager"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "start",
      "target": "manager"
    }
  ]
}
```

**响应示例**:

```json
{
  "id": "wf-2",
  "name": "Custom Approval Workflow"
}
```

---

### 5.4 更新工作流

**接口**: `PUT /api/workflows/:id`

**描述**: 更新工作流定义

**认证**: 需要 (Admin 权限)

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 工作流 ID |

**请求参数**: 同创建工作流

**响应示例**:

```json
{
  "success": true
}
```

---

### 5.5 删除工作流

**接口**: `DELETE /api/workflows/:id`

**描述**: 删除工作流

**认证**: 需要 (Admin 权限)

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 工作流 ID |

**响应示例**:

```json
{
  "success": true
}
```

---

### 5.6 获取工作流实例

**接口**: `GET /api/workflow/instance/:entityType/:entityId`

**描述**: 获取工作流实例执行情况

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entityType | string | 是 | 实体类型 (claim) |
| entityId | string | 是 | 实体 ID |

**响应示例**:

```json
{
  "id": "inst_123456",
  "workflow_id": "wf-1",
  "entity_type": "claim",
  "entity_id": "CLM-001",
  "current_node_id": "manager",
  "status": "running",
  "started_at": "2025-03-08T10:00:00Z",
  "workflow_name": "Standard Approval Workflow",
  "nodes": [...],
  "edges": [...],
  "history": [
    {
      "id": "wfh-001",
      "instance_id": "inst_123456",
      "node_id": "start",
      "action": "start",
      "actor_id": "u2",
      "comments": null,
      "timestamp": "2025-03-08T10:00:00Z"
    }
  ]
}
```

---

### 5.7 获取审批路径

**接口**: `GET /api/workflow/approval-path`

**描述**: 获取报销单的审批路径

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| claimant_id | string | 是 | 申请人 ID |
| amount | number | 是 | 报销金额 |

**响应示例**:

```json
{
  "approvers": [
    {
      "level": 1,
      "type": "Manager Approval",
      "nodeId": "manager",
      "approver": {
        "id": "u6",
        "name": "Michael Brown",
        "role": "Manager",
        "department": "Marketing"
      }
    },
    {
      "level": 2,
      "type": "Finance Review",
      "nodeId": "finance",
      "approver": {
        "id": "u1",
        "name": "Alex Johnson",
        "role": "Finance Lead",
        "department": "Finance"
      }
    }
  ],
  "workflow": {
    "id": "wf-1",
    "name": "Standard Approval Workflow"
  }
}
```

---

## 6. 用户管理接口

### 6.1 获取用户列表

**接口**: `GET /api/admin/users`

**描述**: 获取所有用户列表 (Admin 权限)

**认证**: 需要 (Admin/Finance Lead 权限)

**响应示例**:

```json
[
  {
    "id": "u1",
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "role": "Finance Lead",
    "department": "Finance",
    "company": "Global Corp",
    "avatar": "AJ",
    "job_title": "Finance Director",
    "employee_number": "EMP001",
    "is_active": 1,
    "manager_id": null,
    "status": "Active"
  }
]
```

---

### 6.2 获取用户详情

**接口**: `GET /api/users/:id`

**描述**: 获取用户详细信息

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户 ID |

**响应示例**:

```json
{
  "id": "u1",
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "role": "Finance Lead",
  "department": "Finance",
  "avatar": "AJ",
  "job_title": "Finance Director",
  "employee_number": "EMP001",
  "manager_id": null
}
```

---

### 6.3 获取用户审批人

**接口**: `GET /api/users/:id/approvers`

**描述**: 获取用户的审批人信息

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户 ID |

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| claimAmount | number | 否 | 报销金额 |

**响应示例**:

```json
{
  "user": {
    "id": "u2",
    "name": "Sarah Williams",
    "manager_id": "u6"
  },
  "approval_path": [
    {
      "level": 1,
      "name": "Direct Manager Approval",
      "approver": {
        "id": "u6",
        "name": "Michael Brown",
        "email": "michael@example.com",
        "role": "Manager",
        "department": "Marketing"
      }
    }
  ]
}
```

---

### 6.4 HR 数据同步

**接口**: `POST /api/hr/sync`

**描述**: 同步 HR 系统用户数据

**认证**: 需要 (Admin 权限)

**请求参数**:

```json
{
  "employees": [
    {
      "employee_number": "EMP001",
      "name": "John Doe",
      "email": "john@example.com",
      "department": "Engineering",
      "job_title": "Software Engineer",
      "manager_id": "u7",
      "hire_date": "2025-01-15",
      "cost_center": "CC-3001",
      "location": "Seattle",
      "is_active": true
    }
  ]
}
```

**响应示例**:

```json
{
  "success": true,
  "processed": 1,
  "failed": 0,
  "errors": []
}
```

---

## 7. 报表统计接口

### 7.1 获取供应商列表

**接口**: `GET /api/vendors`

**描述**: 获取所有供应商列表

**认证**: 需要

**响应示例**:

```json
[
  {
    "id": "v1",
    "name": "Apple Inc.",
    "code": "VND-001",
    "region": "Domestic",
    "status": "Approved"
  },
  {
    "id": "v2",
    "name": "Starbucks",
    "code": "VND-002",
    "region": "Domestic",
    "status": "Approved"
  }
]
```

---

### 7.2 获取组织架构

**接口**: `GET /api/org-chart`

**描述**: 获取组织架构信息

**认证**: 需要

**响应示例**:

```json
[
  {
    "id": "dept-1",
    "department_name": "Finance",
    "code": "FIN",
    "manager_id": "u1",
    "manager_name": "Alex Johnson",
    "manager_email": "alex@example.com",
    "member_count": 1
  }
]
```

---

### 7.3 获取通知列表

**接口**: `GET /api/notifications`

**描述**: 获取当前用户的通知列表

**认证**: 需要

**响应示例**:

```json
[
  {
    "id": "notif-001",
    "user_id": "u2",
    "type": "approval_required",
    "title": "New Approval Task",
    "message": "You have a new approval task waiting for your review.",
    "link": "/approvals",
    "is_read": 0,
    "created_at": "2025-03-08T10:00:00Z"
  }
]
```

---

### 7.4 获取未读通知数量

**接口**: `GET /api/notifications/unread-count`

**描述**: 获取未读通知数量

**认证**: 需要

**响应示例**:

```json
{
  "count": 5
}
```

---

### 7.5 标记通知已读

**接口**: `POST /api/notifications/:id/read`

**描述**: 标记单个通知为已读

**认证**: 需要

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 通知 ID |

**响应示例**:

```json
{
  "success": true
}
```

---

### 7.6 标记所有通知已读

**接口**: `POST /api/notifications/read-all`

**描述**: 标记所有通知为已读

**认证**: 需要

**响应示例**:

```json
{
  "success": true
}
```

---

## 8. 文件上传接口

### 8.1 上传文件

**接口**: `POST /api/upload`

**描述**: 上传附件文件

**认证**: 需要

**请求格式**: multipart/form-data

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 文件 (最大 10MB) |

**支持的文件格式**:
- PDF
- JPG/JPEG
- PNG

**响应示例**:

```json
{
  "url": "/uploads/receipt-1234567890.pdf"
}
```

**状态码**:
- 200: 上传成功
- 400: 文件格式不支持或文件过大

---

## 9. 错误码说明

### 9.1 通用错误码

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|------------|
| INVALID_REQUEST | 请求参数错误 | 400 |
| UNAUTHORIZED | 未认证 | 401 |
| FORBIDDEN | 无权限 | 403 |
| NOT_FOUND | 资源不存在 | 404 |
| INTERNAL_ERROR | 服务器内部错误 | 500 |

### 9.2 业务错误码

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|------------|
| CLAIM_NOT_FOUND | 报销单不存在 | 404 |
| INVALID_CLAIM_STATUS | 报销单状态不允许此操作 | 400 |
| APPROVAL_NOT_ALLOWED | 无权审批此报销单 | 403 |
| WORKFLOW_NOT_FOUND | 工作流不存在 | 404 |
| USER_NOT_FOUND | 用户不存在 | 404 |
| DUPLICATE_EMAIL | 邮箱已存在 | 400 |
| INVALID_PASSWORD | 密码错误 | 401 |

### 9.3 错误响应示例

```json
{
  "error": "Claim not found",
  "code": "CLAIM_NOT_FOUND",
  "details": "The claim with ID 'CLM-999' does not exist"
}
```

---

## 附录

### A. API 调用示例

#### JavaScript/TypeScript

```typescript
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('expense_token');
  const userId = localStorage.getItem('expense_user_id');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': userId,
    ...options.headers
  };
  
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API call failed');
  }
  
  return response.json();
};

const getClaims = () => apiCall('/claims');
const createClaim = (data) => apiCall('/claims', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### B. Postman 集合

导入 Postman 集合文件: `ClaimFlow_API.postman_collection.json`

### C. 变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|---------|--------|
| v1.0 | 2025-03-08 | 初始版本 | API Team |

---

**文档结束**
