# 报销管理模块文档
## ClaimFlow - 企业费用报销管理系统

**文档版本**: v1.0  
**创建日期**: 2025-03-08  
**模块负责人**: Backend Team  

---

## 1. 模块概述

报销管理模块是 ClaimFlow 系统的核心业务模块,负责处理费用报销的全流程管理。

### 1.1 核心功能

- **报销申请**: 创建和提交报销申请
- **报销查询**: 查看报销单列表和详情
- **报销编辑**: 编辑草稿状态的报销单
- **报销撤回**: 撤回待审批的报销单
- **报销删除**: 删除草稿状态的报销单
- **附件管理**: 上传和管理报销附件

### 1.2 业务流程

```
创建报销单 → 填写报销信息 → 上传附件 → 提交审批 → 审批流程 → 支付处理 → 完成
```

---

## 2. 数据模型

### 2.1 报销单 (Claim)

```typescript
interface Claim {
  id: string;                    // 报销单号 (CLM-XXXX)
  claimant_id: string;           // 申请人 ID
  description: string;           // 报销说明
  total_amount: number;          // 报销总金额
  currency: string;              // 币种 (USD)
  status: ClaimStatus;           // 当前状态
  step: number;                  // 当前步骤
  workflow_id?: string;          // 工作流 ID
  created_at: Date;              // 创建时间
  updated_at: Date;              // 更新时间
  items?: Request[];             // 报销项列表
  approvals?: Approval[];        // 审批记录
}
```

### 2.2 报销项 (Request)

```typescript
interface Request {
  id: string;                    // 报销项 ID (REQ-XXXX)
  claim_id?: string;             // 所属报销单 ID
  type: RequestType;             // 报销类型
  claimant_id: string;           // 申请人 ID
  vendor_id?: string;            // 供应商 ID
  amount: number;                // 报销金额
  currency: string;              // 币种
  status: RequestStatus;         // 当前状态
  description?: string;          // 报销说明
  attachment_url?: string;       // 附件 URL
  step: number;                  // 当前步骤
  workflow_id?: string;          // 工作流 ID
  current_node_id?: string;      // 当前节点 ID
  created_at: Date;              // 创建时间
  updated_at: Date;              // 更新时间
}
```

### 2.3 状态枚举

```typescript
enum ClaimStatus {
  Draft = 'Draft',                           // 草稿
  Pending = 'Pending',                       // 待审批
  PendingFinance = 'Pending Finance',        // 待财务审批
  ProcessingPayment = 'Processing Payment',  // 处理付款
  Approved = 'Approved',                     // 已批准
  Paid = 'Paid',                             // 已支付
  Rejected = 'Rejected',                     // 已拒绝
  Withdrawn = 'Withdrawn'                    // 已撤回
}

enum RequestType {
  Travel = 'Travel',               // 差旅
  Entertainment = 'Entertainment', // 招待
  Procurement = 'Procurement',     // 采购
  Other = 'Other'                  // 其他
}
```

---

## 3. 业务逻辑

### 3.1 创建报销单

**流程**:
```
1. 验证用户权限
2. 计算总金额
3. 获取默认工作流
4. 创建报销单记录
5. 创建报销项记录
6. 初始化工作流实例
7. 创建审批任务
8. 发送通知
```

**代码示例**:
```typescript
const createClaim = (req, res) => {
  const { description, claimant_id, items } = req.body;
  const claimId = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const currency = items[0]?.currency || 'USD';
  
  db.transaction(() => {
    db.prepare(`
      INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step, workflow_id)
      VALUES (?, ?, ?, ?, ?, 'Pending', 1, ?)
    `).run(claimId, claimant_id, description, totalAmount, currency, workflowId);
    
    for (const item of items) {
      const requestId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare(`
        INSERT INTO requests (id, claim_id, type, claimant_id, vendor_id, amount, currency, status, description, attachment_url, step, workflow_id, current_node_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 1, ?, ?)
      `).run(requestId, claimId, item.type, claimant_id, item.vendor_id, item.amount, item.currency, item.description, item.attachment_url || null, workflowId, currentNodeId);
    }
  })();
  
  res.status(201).json({ id: claimId, status: 'Pending', totalAmount });
};
```

### 3.2 状态流转

**状态机**:
```
Draft → Pending → Pending Finance → Processing Payment → Paid
  ↓        ↓            ↓                    ↓
Withdraw  Rejected    Rejected            Failed
```

**状态转换规则**:

| 当前状态 | 允许操作 | 目标状态 |
|---------|---------|---------|
| Draft | 提交 | Pending |
| Draft | 删除 | (删除记录) |
| Pending | 撤回 | Draft |
| Pending | 批准 | Pending Finance |
| Pending | 拒绝 | Rejected |
| Pending Finance | 批准 | Processing Payment |
| Pending Finance | 拒绝 | Rejected |
| Processing Payment | 完成 | Paid |
| Processing Payment | 失败 | Processing Payment |

---

## 4. 权限控制

### 4.1 查看权限

| 角色 | 查看范围 |
|------|---------|
| Employee | 仅本人报销单 |
| Manager | 本部门报销单 + 本人报销单 |
| Finance | 所有报销单 |
| Admin | 所有报销单 |

**实现**:
```typescript
const getClaims = (req, res) => {
  const user = req.user;
  let claims;
  
  if (user.role === 'Employee') {
    claims = db.prepare(`
      SELECT c.*, u.name as claimant_name, u.department, u.avatar
      FROM claims c
      JOIN users u ON c.claimant_id = u.id
      WHERE c.claimant_id = ?
      ORDER BY c.created_at DESC
    `).all(user.id);
  } else if (user.role === 'Manager') {
    claims = db.prepare(`
      SELECT c.*, u.name as claimant_name, u.department, u.avatar
      FROM claims c
      JOIN users u ON c.claimant_id = u.id
      WHERE u.department = ? OR c.claimant_id = ?
      ORDER BY c.created_at DESC
    `).all(user.department, user.id);
  } else {
    claims = db.prepare(`
      SELECT c.*, u.name as claimant_name, u.department, u.avatar
      FROM claims c
      JOIN users u ON c.claimant_id = u.id
      ORDER BY c.created_at DESC
    `).all();
  }
  
  res.json(claims);
};
```

### 4.2 操作权限

| 操作 | 权限要求 |
|------|---------|
| 创建报销单 | 所有角色 |
| 编辑报销单 | 仅申请人,且状态为 Draft |
| 删除报销单 | 仅申请人,且状态为 Draft |
| 撤回报销单 | 仅申请人,且状态为 Pending |
| 查看报销单 | 申请人或审批人 |

---

## 5. 业务规则

### 5.1 金额限制

| 报销类型 | 最大金额 | 说明 |
|---------|---------|------|
| Travel | $50,000 | 差旅费用 |
| Entertainment | $5,000 | 招待费用 |
| Procurement | $100,000 | 采购费用 |
| Other | $10,000 | 其他费用 |

### 5.2 时效限制

- **报销时效**: 费用发生后 30 天内提交
- **审批时效**: 3 个工作日内完成审批
- **支付时效**: 审批通过后 5 个工作日内支付

### 5.3 重复检查

系统自动检查重复报销:
- 相同申请人
- 相同金额
- 相同日期
- 相同类型

---

## 6. API 接口

### 6.1 获取报销单列表

**GET /api/claims**

**查询参数**:
- `status`: 状态筛选
- `page`: 页码
- `limit`: 每页数量

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
    "created_at": "2025-03-08T10:00:00Z",
    "claimant_name": "Sarah Williams",
    "department": "Marketing",
    "avatar": "SW",
    "items": [...]
  }
]
```

### 6.2 创建报销单

**POST /api/claims**

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
    }
  ]
}
```

### 6.3 撤回报销单

**POST /api/claims/:id/withdraw**

**响应示例**:
```json
{
  "success": true
}
```

### 6.4 删除报销单

**DELETE /api/claims/:id**

**响应示例**:
```json
{
  "success": true
}
```

---

## 7. 附件管理

### 7.1 文件上传

**POST /api/upload**

**支持格式**:
- PDF
- JPG/JPEG
- PNG

**文件限制**:
- 最大大小: 10MB
- 存储路径: /uploads/
- 命名规则: {fieldname}-{timestamp}-{random}{ext}

### 7.2 文件访问

**GET /uploads/:filename**

- 静态文件服务
- 无需认证
- 支持预览

---

## 8. 通知机制

### 8.1 通知类型

| 类型 | 触发条件 | 接收人 |
|------|---------|--------|
| approval_required | 报销单提交 | 审批人 |
| approved | 审批通过 | 申请人 |
| rejected | 审批拒绝 | 申请人 |
| paid | 支付完成 | 申请人 |

### 8.2 通知内容

```typescript
const createNotification = (userId, type, title, message, link) => {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, type, title, message, link);
};
```

---

## 9. 数据统计

### 9.1 统计维度

- 按状态统计
- 按部门统计
- 按类型统计
- 按时间统计

### 9.2 统计查询

```sql
-- 按状态统计
SELECT status, COUNT(*) as count
FROM claims
GROUP BY status;

-- 按部门统计
SELECT u.department, COUNT(*) as count, SUM(c.total_amount) as total
FROM claims c
JOIN users u ON c.claimant_id = u.id
GROUP BY u.department;

-- 按类型统计
SELECT r.type, COUNT(*) as count, SUM(r.amount) as total
FROM requests r
GROUP BY r.type;
```

---

## 10. 最佳实践

### 10.1 性能优化

- 使用索引优化查询
- 批量操作使用事务
- 分页查询避免全表扫描
- 缓存常用数据

### 10.2 错误处理

```typescript
try {
  const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
  if (!claim) {
    return res.status(404).json({ error: "Claim not found" });
  }
  
  if (claim.status !== 'Draft') {
    return res.status(400).json({ error: "Can only edit draft claims" });
  }
  
  // 处理业务逻辑
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({ error: "Internal server error" });
}
```

### 10.3 数据验证

- 验证必填字段
- 验证数据类型
- 验证数据范围
- 验证业务规则

---

**文档结束**
