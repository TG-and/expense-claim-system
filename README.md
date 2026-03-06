<div align="center">
  <img width="1200" height="475" alt="Expense Claim System Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 企业报销申请系统 (Expense Claim System)

一个现代化的企业费用报销管理平台，支持多角色审批流程、财务报表分析和费用类别管理。

![React](https://img.shields.io/badge/React-19.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Express](https://img.shields.io/badge/Express-4.21-green)
![SQLite](https://img.shields.io/badge/SQLite-brightgreen)
![Vite](https://img.shields.io/badge/Vite-6.2-purple)

## 功能特性

### 员工功能
- 提交各类报销申请（采购、出差、招待等）
- 查看申请状态和审批进度
- 上传附件支持

### 审批流程
- 多级审批机制（经理 → 财务）
- 审批意见记录
- 审批历史追踪

### 财务管理
- 财务仪表盘可视化
- 支出分类统计
- 待审批费用概览

### 管理后台
- 用户管理
- 供应商管理
- 系统配置

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, React Router, Recharts, Tailwind CSS, Motion |
| 后端 | Express.js, Node.js |
| 数据库 | SQLite (better-sqlite3) |
| 构建工具 | Vite |

## 项目结构

```
expense-claim-system/
├── src/
│   ├── components/      # React 组件
│   │   └── Layout.tsx
│   ├── pages/          # 页面组件
│   │   ├── Dashboard.tsx
│   │   ├── FinanceDashboard.tsx
│   │   ├── AdminPortal.tsx
│   │   ├── NewRequest.tsx
│   │   ├── NewClaim.tsx
│   │   └── RequestDetails.tsx
│   ├── db/             # 数据库
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server.ts           # Express 服务器
├── index.html
├── package.json
└── vite.config.ts
```

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local` 并配置必要的环境变量：

```bash
cp .env.example .env.local
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 运行。

### 构建生产版本

```bash
npm run build
```

## API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/requests` | 获取所有报销申请 |
| GET | `/api/requests/:id` | 获取申请详情 |
| POST | `/api/requests` | 创建新申请 |
| POST | `/api/requests/:id/approve` | 审批申请 |
| POST | `/api/requests/:id/reject` | 拒绝申请 |
| POST | `/api/upload` | 上传附件 |

## 数据库表

- **users** - 用户表
- **companies** - 公司表
- **vendors** - 供应商表
- **requests** - 报销申请表
- **approvals** - 审批记录表

## 演示账号

系统已预置演示数据，可使用以下账号测试：

| 角色 | 用户 |
|------|------|
| Finance Lead | Alex Johnson |
| Employee | Sarah Williams |
| Employee | Marcus Chen |
| Employee | Elena Rossi |
| Employee | James Wilson |

## 许可证

MIT License
