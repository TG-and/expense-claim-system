# 工作流引擎模块文档
## ClaimFlow - 企业费用报销管理系统

**文档版本**: v1.0  
**创建日期**: 2025-03-08  
**模块负责人**: Backend Team  

---

## 1. 模块概述

工作流引擎是 ClaimFlow 系统的核心组件,负责管理和执行报销审批流程。它支持自定义工作流设计、条件分支、多级审批等功能。

### 1.1 核心功能

- **工作流设计**: 可视化设计审批流程
- **流程执行**: 自动化流程执行引擎
- **任务管理**: 审批任务的创建和分配
- **历史追踪**: 完整的流程执行历史
- **条件路由**: 基于条件的流程分支

### 1.2 技术实现

- **语言**: TypeScript
- **核心类**: WorkflowExecutionEngine
- **数据库**: SQLite
- **流程定义**: JSON 格式

---

## 2. 架构设计

### 2.1 核心组件

```
WorkflowExecutionEngine
├── startProcess()          # 启动流程实例
├── approveTask()           # 批准任务
├── rejectTask()            # 拒绝任务
├── delegateTask()          # 委托任务
├── getTasksForUser()       # 获取用户任务
├── getProcessHistory()     # 获取流程历史
└── getApprovalPath()       # 获取审批路径
```

### 2.2 数据模型

```typescript
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    approverRole?: string;
    approverDepartment?: string;
    approverUserId?: string;
    condition?: string;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface ProcessInstance {
  id: string;
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  claimant_id: string;
  current_node_id: string;
  status: 'running' | 'completed' | 'cancelled';
  variables: string;
  started_at: string;
  completed_at?: string;
}
```

---

## 3. 节点类型

### 3.1 开始节点 (start)

**功能**: 流程起点,初始化流程实例

**配置项**: 无

**示例**:
```json
{
  "id": "start",
  "type": "start",
  "position": { "x": 100, "y": 200 },
  "data": {
    "label": "Submit",
    "nodeType": "start"
  }
}
```

### 3.2 审批节点 (approval)

**功能**: 创建审批任务,等待审批人处理

**配置项**:
- `approverRole`: 审批人角色 (Manager, Finance, Finance Lead)
- `approverDepartment`: 审批人部门
- `approverUserId`: 指定审批人 ID

**示例**:
```json
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
```

### 3.3 条件节点 (condition)

**功能**: 根据条件表达式选择流程分支

**配置项**:
- `conditionType`: 条件类型 (amount_above, amount_below)
- `conditionValue`: 条件值

**示例**:
```json
{
  "id": "condition-1k",
  "type": "condition",
  "position": { "x": 500, "y": 200 },
  "data": {
    "label": "Check Amount > $1000",
    "nodeType": "condition",
    "conditionType": "amount_above",
    "conditionValue": 1000
  }
}
```

### 3.4 动作节点 (action)

**功能**: 自动执行系统操作

**配置项**:
- 自动识别动作类型 (通过 label)
- 支持: 支付处理、通知发送等

**示例**:
```json
{
  "id": "payment",
  "type": "action",
  "position": { "x": 700, "y": 200 },
  "data": {
    "label": "Process Payment",
    "nodeType": "action"
  }
}
```

### 3.5 结束节点 (end)

**功能**: 流程终点,完成流程实例

**配置项**: 无

**示例**:
```json
{
  "id": "end",
  "type": "end",
  "position": { "x": 900, "y": 200 },
  "data": {
    "label": "Complete",
    "nodeType": "end"
  }
}
```

---

## 4. 流程执行

### 4.1 启动流程

```typescript
const result = await workflowEngine.startProcess(
  'wf-1',           // 工作流 ID
  'claim',          // 实体类型
  'CLM-001',        // 实体 ID
  'u2',             // 申请人 ID
  { amount: 1500 }  // 流程变量
);
```

**执行流程**:
1. 验证工作流是否存在且激活
2. 查找开始节点
3. 创建流程实例
4. 执行第一个审批节点
5. 创建审批任务
6. 发送通知

### 4.2 审批任务

```typescript
// 批准任务
await workflowEngine.approveTask(
  'task-123',       // 任务 ID
  'u1',             // 审批人 ID
  'Approved'        // 审批意见
);

// 拒绝任务
await workflowEngine.rejectTask(
  'task-123',       // 任务 ID
  'u1',             // 审批人 ID
  'Missing receipt' // 拒绝原因
);
```

### 4.3 任务委托

```typescript
await workflowEngine.delegateTask(
  'task-123',       // 任务 ID
  'u1',             // 当前审批人 ID
  'u2'              // 新审批人 ID
);
```

---

## 5. 审批人解析

### 5.1 解析规则

| 审批人类型 | 解析逻辑 |
|-----------|---------|
| Manager | 申请人的直属上级 |
| Role | 指定角色的活跃用户 |
| Department | 指定部门的活跃用户 |
| Specific | 指定的用户 ID |

### 5.2 解析示例

```typescript
// 解析经理审批人
if (node.data.approverRole === 'Manager') {
  const claimant = db.prepare('SELECT manager_id FROM users WHERE id = ?')
    .get(claimantId);
  assigneeId = claimant?.manager_id;
}

// 解析角色审批人
if (node.data.approverRole) {
  const approver = db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1')
    .get(node.data.approverRole);
  assigneeId = approver?.id;
}
```

---

## 6. 条件判断

### 6.1 条件类型

| 条件类型 | 表达式 | 说明 |
|---------|--------|------|
| amount_above | amount >= value | 金额大于等于 |
| amount_below | amount < value | 金额小于 |

### 6.2 条件执行

```typescript
const shouldTakeBranch = (conditionType, conditionValue, variables) => {
  switch (conditionType) {
    case 'amount_above':
      return variables.amount >= conditionValue;
    case 'amount_below':
      return variables.amount < conditionValue;
    default:
      return false;
  }
};
```

---

## 7. 流程监控

### 7.1 获取流程实例

```typescript
const instance = await workflowEngine.getProcessHistory('inst-123');
```

**返回数据**:
```json
{
  "instance": {
    "id": "inst-123",
    "workflow_id": "wf-1",
    "status": "running",
    "current_node_id": "manager"
  },
  "tasks": [
    {
      "id": "task-123",
      "node_id": "manager",
      "assignee_id": "u1",
      "status": "pending"
    }
  ]
}
```

### 7.2 获取用户任务

```typescript
const tasks = await workflowEngine.getTasksForUser('u1');
```

---

## 8. 最佳实践

### 8.1 工作流设计原则

1. **简化流程**: 避免过于复杂的流程
2. **明确审批人**: 确保每个审批节点都有明确的审批人
3. **合理分支**: 条件分支要覆盖所有可能情况
4. **异常处理**: 设计异常处理机制

### 8.2 性能优化

1. **索引优化**: 为常用查询字段创建索引
2. **批量操作**: 使用事务处理批量操作
3. **缓存策略**: 缓存工作流定义
4. **异步处理**: 耗时操作异步执行

### 8.3 错误处理

```typescript
try {
  await workflowEngine.startProcess(...);
} catch (error) {
  if (error.message === 'Workflow not found') {
    // 处理工作流不存在
  } else if (error.message === 'Workflow is not active') {
    // 处理工作流未激活
  }
}
```

---

## 9. 示例工作流

### 9.1 标准审批流程

```
开始 → 经理审批 → [金额判断]
                      ↓
                金额 > $1000?
                 /        \
               是          否
                ↓           ↓
          财务审批     直接支付
                \           /
                 \         /
                  \       /
                   结束节点
```

### 9.2 JSON 定义

```json
{
  "nodes": [
    { "id": "start", "type": "start", "data": { "nodeType": "start" } },
    { "id": "manager", "type": "approval", "data": { "nodeType": "approval", "approverRole": "Manager" } },
    { "id": "condition", "type": "condition", "data": { "nodeType": "condition", "conditionType": "amount_above", "conditionValue": 1000 } },
    { "id": "finance", "type": "approval", "data": { "nodeType": "approval", "approverRole": "Finance Lead" } },
    { "id": "payment", "type": "action", "data": { "nodeType": "action" } },
    { "id": "end", "type": "end", "data": { "nodeType": "end" } }
  ],
  "edges": [
    { "source": "start", "target": "manager" },
    { "source": "manager", "target": "condition" },
    { "source": "condition", "target": "finance", "label": "Yes" },
    { "source": "condition", "target": "payment", "label": "No" },
    { "source": "finance", "target": "payment" },
    { "source": "payment", "target": "end" }
  ]
}
```

---

## 10. 故障排查

### 10.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 流程无法启动 | 工作流未激活 | 激活工作流 |
| 审批人未找到 | 无符合条件的审批人 | 检查审批人配置 |
| 流程卡住 | 审批人缺席 | 使用委托功能 |
| 条件判断错误 | 条件表达式错误 | 检查条件配置 |

### 10.2 日志查看

```sql
-- 查看流程实例
SELECT * FROM workflow_instances WHERE id = 'inst-123';

-- 查看任务列表
SELECT * FROM workflow_tasks WHERE instance_id = 'inst-123';

-- 查看执行历史
SELECT * FROM workflow_history WHERE instance_id = 'inst-123';
```

---

**文档结束**
