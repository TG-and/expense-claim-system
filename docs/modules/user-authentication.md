# 用户认证模块文档
## ClaimFlow - 企业费用报销管理系统

**文档版本**: v1.0  
**创建日期**: 2025-03-08  
**模块负责人**: Backend Team  

---

## 1. 模块概述

用户认证模块负责系统的身份认证和授权管理,确保系统安全性和用户权限控制。

### 1.1 核心功能

- **用户登录**: 邮箱密码登录
- **身份认证**: JWT Token 认证
- **权限控制**: RBAC 角色权限
- **会话管理**: Token 有效期管理
- **密码管理**: 密码加密和验证

### 1.2 技术栈

- **认证方式**: JWT (JSON Web Token)
- **密码加密**: bcryptjs
- **Token 有效期**: 7 天
- **权限模型**: RBAC (基于角色的访问控制)

---

## 2. 认证流程

### 2.1 登录流程

```
用户输入邮箱密码
      ↓
验证邮箱格式
      ↓
查询用户信息
      ↓
验证密码 (bcrypt)
      ↓
生成 JWT Token
      ↓
返回 Token 和用户信息
      ↓
客户端存储 Token
```

### 2.2 请求认证流程

```
客户端发起请求
      ↓
携带 Authorization Header
      ↓
中间件验证 Token
      ↓
解析用户信息
      ↓
注入到 req.user
      ↓
执行权限检查
      ↓
处理业务逻辑
```

---

## 3. JWT Token

### 3.1 Token 结构

```json
{
  "userId": "u1",
  "email": "alex@example.com",
  "role": "Finance Lead",
  "exp": 1710000000,
  "iat": 1709999999
}
```

### 3.2 Token 生成

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'claimflow-secret-key-2025';

const generateToken = (user: User): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};
```

### 3.3 Token 验证

```typescript
const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
```

---

## 4. 密码管理

### 4.1 密码加密

```typescript
import bcrypt from 'bcryptjs';

const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, 10);
};
```

### 4.2 密码验证

```typescript
const verifyPassword = (password: string, hash: string): boolean => {
  return bcrypt.compareSync(password, hash);
};
```

### 4.3 密码策略

| 规则 | 要求 |
|------|------|
| 最小长度 | 8 位 |
| 复杂度 | 包含大小写字母和数字 |
| 加密算法 | bcrypt (10 rounds) |
| 存储方式 | 加密存储 |

---

## 5. 权限控制

### 5.1 角色定义

```typescript
export const ROLES = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  FINANCE: 'Finance',
  FINANCE_LEAD: 'Finance Lead',
  ADMIN: 'Admin'
} as const;
```

### 5.2 权限矩阵

```typescript
export const PERMISSIONS = {
  [ROLES.EMPLOYEE]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canEditOwnDrafts: true,
    canWithdrawOwnClaims: true,
    canViewAllClaims: false,
    canApproveClaims: false,
    canManageUsers: false,
    canManageWorkflows: false
  },
  [ROLES.MANAGER]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canEditOwnDrafts: true,
    canWithdrawOwnClaims: true,
    canViewAllClaims: true,
    canApproveClaims: true,
    approvalStep: 1,
    canManageUsers: false,
    canManageWorkflows: false
  },
  [ROLES.FINANCE]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canEditOwnDrafts: true,
    canWithdrawOwnClaims: true,
    canViewAllClaims: true,
    canApproveClaims: true,
    approvalStep: 2,
    canViewFinanceData: true,
    canManageUsers: false,
    canManageWorkflows: false
  },
  [ROLES.ADMIN]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canEditOwnDrafts: true,
    canWithdrawOwnClaims: true,
    canViewAllClaims: true,
    canApproveClaims: true,
    canViewFinanceData: true,
    canManageUsers: true,
    canManageWorkflows: true
  }
};
```

### 5.3 权限检查

```typescript
export function canApproveAtStep(role: Role, step: number): boolean {
  const perms = getPermissions(role);
  if (!perms.canApproveClaims) return false;
  if (perms.approvalStep !== undefined) {
    return perms.approvalStep === step;
  }
  return true;
}
```

---

## 6. 认证中间件

### 6.1 Token 认证中间件

```typescript
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
```

### 6.2 权限检查中间件

```typescript
const requireRole = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

// 使用示例
app.get('/api/admin/users', 
  authenticateToken, 
  requireRole('Admin', 'Finance Lead'), 
  (req, res) => {
    // 处理逻辑
  }
);
```

---

## 7. API 接口

### 7.1 登录接口

**POST /api/auth/login**

**请求参数**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

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

### 7.2 登出接口

**POST /api/auth/logout**

**响应示例**:
```json
{
  "success": true
}
```

### 7.3 获取当前用户

**GET /api/auth/me**

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

### 7.4 更新资料

**PUT /api/auth/profile**

**请求参数**:
```json
{
  "name": "Alex Johnson",
  "avatar": "AJ"
}
```

---

## 8. 安全措施

### 8.1 安全策略

| 措施 | 说明 |
|------|------|
| HTTPS | 强制 HTTPS 加密传输 |
| Token 有效期 | 7 天有效期 |
| 密码加密 | bcrypt 加密存储 |
| SQL 注入防护 | 参数化查询 |
| XSS 防护 | 输入输出转义 |

### 8.2 安全头

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

---

## 9. 最佳实践

### 9.1 Token 管理

- 客户端存储在 localStorage
- 每次请求携带 Token
- Token 过期后重新登录
- 敏感操作二次验证

### 9.2 密码安全

- 不明文存储密码
- 使用强加密算法
- 定期更换密码
- 避免弱密码

### 9.3 权限控制

- 最小权限原则
- 定期审计权限
- 记录权限变更
- 异常操作告警

---

**文档结束**
