# 报销单管理系统完整测试用例

## 一、报销单创建测试

### 1.1 基础创建功能测试

| 用例ID | 测试场景 | 前置条件 | 操作步骤 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLAIM-CREATE-001 | 用户成功创建报销单（单笔明细） | 用户已登录 | 1. 填写报销单描述<br>2. 添加1笔报销明细（类型:Travel，金额:500）<br>3. 提交 | 返回201状态，报销单ID，状态为Pending |
| CLAIM-CREATE-002 | 用户成功创建报销单（多笔明细） | 用户已登录 | 1. 填写报销单描述<br>2. 添加3笔不同类型明细<br>3. 提交 | 返回201，总金额正确计算 |
| CLAIM-CREATE-003 | 创建报销单（无明细） | 用户已登录 | 1. 填写报销单描述<br>2. 不添加明细<br>3. 提交 | 返回500错误 |

### 1.2 不同金额范围测试

| 用例ID | 测试场景 | 金额范围 | 预期结果 |
|--------|----------|----------|----------|
| CLAIM-CREATE-004 | 小额报销单 | $0.01 - $100 | 创建成功，状态Pending |
| CLAIM-CREATE-005 | 中额报销单 | $100.01 - $1000 | 创建成功，状态Pending |
| CLAIM-CREATE-006 | 大额报销单 | $1000.01 - $5000 | 创建成功，状态Pending |
| CLAIM-CREATE-007 | 超大额报销单 | > $5000 | 创建成功，状态Pending |

### 1.3 不同报销类型测试

| 用例ID | 报销类型 | 预期结果 |
|--------|----------|----------|
| CLAIM-CREATE-008 | Travel (差旅) | 创建成功 |
| CLAIM-CREATE-009 | Entertainment (招待) | 创建成功 |
| CLAIM-CREATE-010 | Procurement (采购) | 创建成功 |
| CLAIM-CREATE-011 | Office Supplies (办公用品) | 创建成功 |
| CLAIM-CREATE-012 | Other (其他) | 创建成功 |

### 1.4 附件测试

| 用例ID | 测试场景 | 操作步骤 | 预期结果 |
|--------|----------|----------|----------|
| CLAIM-CREATE-013 | 有附件报销单 | 1. 创建报销单<br>2. 上传附件<br>3. 提交 | 附件URL正确保存 |
| CLAIM-CREATE-014 | 无附件报销单 | 1. 创建报销单<br>2. 不上传附件<br>3. 提交 | attachment_url为null |

---

## 二、报销单列表显示测试

### 2.1 列表查询功能测试

| 用例ID | 测试场景 | 前置条件 | 操作步骤 | 预期结果 |
|--------|----------|----------|----------|----------|
| CLAIM-LIST-001 | 查看自己的报销单列表 | 用户u2已创建3笔报销单 | 使用u2账号查询 | 只显示u2的3笔报销单 |
| CLAIM-LIST-002 | 列表数据完整性 | 用户已创建报销单 | 查询列表 | 包含id、description、total_amount、status、created_at |
| CLAIM-LIST-003 | 列表按时间倒序 | 用户已创建多笔报销单 | 查询列表 | 最新创建的排在最前面 |
| CLAIM-LIST-004 | 空列表显示 | 用户没有任何报销单 | 查询列表 | 返回空数组 |

### 2.2 角色权限测试

| 用例ID | 测试角色 | 预期结果 |
|--------|----------|----------|
| CLAIM-LIST-005 | Employee | 只显示自己提交的报销单 |
| CLAIM-LIST-006 | Manager | 显示自己+本部门成员的报销单 |
| CLAIM-LIST-007 | Finance | 显示所有报销单 |
| CLAIM-LIST-008 | Admin | 显示所有报销单 |

---

## 三、报销单详情验证测试

### 3.1 详情字段验证

| 用例ID | 验证字段 | 预期结果 |
|--------|----------|----------|
| CLAIM-DETAIL-001 | 报销单ID | 与创建时返回ID一致 |
| CLAIM-DETAIL-002 | 申请人姓名 | 显示claimant_name |
| CLAIM-DETAIL-003 | 部门 | 显示department |
| CLAIM-DETAIL-004 | 报销事由 | 与输入description一致 |
| CLAIM-DETAIL-005 | 总金额 | 等于所有明细金额之和 |
| CLAIM-DETAIL-006 | 货币类型 | 正确显示USD |
| CLAIM-DETAIL-007 | 状态 | Pending/Pending Finance/Approved/Rejected |
| CLAIM-DETAIL-008 | 创建时间 | 正确的时间格式 |

### 3.2 明细项验证

| 用例ID | 测试场景 | 预期结果 |
|--------|----------|----------|
| CLAIM-DETAIL-009 | 单笔明细 | 显示1条明细记录 |
| CLAIM-DETAIL-010 | 多笔明细 | 显示所有明细，每条包含type、amount、vendor_name |
| CLAIM-DETAIL-011 | 明细金额计算 | 每笔明细amount正确 |
| CLAIM-DETAIL-012 | 有附件明细 | 显示attachment_url |
| CLAIM-DETAIL-013 | 无附件明细 | attachment_url为null |

### 3.3 审批历史验证

| 用例ID | 测试场景 | 预期结果 |
|--------|----------|----------|
| CLAIM-DETAIL-014 | 有审批记录 | 显示approver_name、status、comments、step |
| CLAIM-DETAIL-015 | 无审批记录 | approvals数组为空 |

---

## 四、边界条件测试

| 用例ID | 测试场景 | 操作 | 预期结果 |
|--------|----------|------|----------|
| CLAIM-BOUNDARY-001 | 金额为0 | 创建金额为0的报销单 | 创建成功 |
| CLAIM-BOUNDARY-002 | 金额为负数 | 创建金额为负数的报销单 | 错误处理 |
| CLAIM-BOUNDARY-003 | 金额边界$1000 | 创建$1000整的报销单 | 创建成功 |
| CLAIM-BOUNDARY-004 | 金额边界$5000 | 创建$5000整的报销单 | 创建成功 |
| CLAIM-BOUNDARY-005 | 超长描述 | description超过500字符 | 正确处理 |
| CLAIM-BOUNDARY-006 | 特殊字符 | description包含特殊字符 | 正确保存 |
| CLAIM-BOUNDARY-007 | 空描述 | description为空 | 错误或允许 |

---

## 五、状态流转测试

| 用例ID | 当前状态 | 操作 | 预期状态 |
|--------|----------|------|----------|
| CLAIM-STATUS-001 | Pending | Manager审批 | Pending Finance |
| CLAIM-STATUS-002 | Pending Finance | Finance审批 | Approved |
| CLAIM-STATUS-003 | Pending | Manager拒绝 | Rejected |
| CLAIM-STATUS-004 | Pending/Pending Finance | 用户撤回 | Draft/Withdrawn |
| CLAIM-STATUS-005 | 已批准 | 再次审批 | 错误提示 |

---

## 六、工作流测试

| 用例ID | 测试场景 | 金额 | 预期审批节点数 |
|--------|----------|------|----------------|
| WORKFLOW-001 | 小额不需财务审批 | $500 | 1个节点(Manager) |
| WORKFLOW-002 | 中额需财务审批 | $1500 | 2个节点 |
| WORKFLOW-003 | 大额需财务主管 | $6000 | 3个节点 |
