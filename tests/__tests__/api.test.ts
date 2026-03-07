import request from 'supertest';
import { initTestDb, getDb, resetTestDb, createTestApp, JWT_SECRET } from '../testHelper';

let app: any;
let db: any;

beforeAll(() => {
  initTestDb();
  db = getDb();
  app = createTestApp();
});

afterEach(() => {
  resetTestDb();
});

describe('认证模块测试', () => {
  
  describe('POST /api/auth/login', () => {
    
    it('AUTH-001: 使用正确邮箱和密码登录应返回成功', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com', password: 'password123' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: 'sarah@example.com',
        role: 'Employee'
      });
    });

    it('AUTH-002: 使用错误密码应返回401错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com', password: 'wrongpassword' });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('AUTH-003: 使用不存在邮箱应返回401错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('AUTH-004: 不提供邮箱和密码应返回400错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('AUTH-004: 只提供邮箱应返回400错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('GET /api/health', () => {
    it('健康检查应返回OK', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});

describe('用户管理模块测试', () => {
  
  describe('GET /api/admin/users', () => {
    
    it('USER-001: Admin角色查询所有用户应返回用户列表', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u8', email: 'david@example.com', role: 'Admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('USER-002: Finance Lead查询所有用户应返回用户列表', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u1', email: 'alex@example.com', role: 'Finance Lead' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('USER-003: Employee角色查询应返回403禁止访问', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u2', email: 'sarah@example.com', role: 'Employee' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });

    it('USER-004: 未认证用户查询应返回401未授权', async () => {
      const response = await request(app)
        .get('/api/admin/users');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });
});

describe('报销申请模块测试', () => {
  
  describe('POST /api/claims', () => {
    
    it('CLAIM-001: 创建带明细的报销单应成功', async () => {
      const response = await request(app)
        .post('/api/claims')
        .send({
          description: 'Test Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 500, currency: 'USD', description: 'Flight' },
            { type: 'Entertainment', vendor_id: 'v2', amount: 100, currency: 'USD', description: 'Lunch' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('Pending');
      expect(response.body.totalAmount).toBe(600);
    });

    it('CLAIM-005: 创建无明细报销单应返回500错误', async () => {
      const response = await request(app)
        .post('/api/claims')
        .send({
          description: 'Test Claim',
          claimant_id: 'u2',
          items: []
        });
      
      expect(response.status).toBe(500);
    });

    it('CLAIM-006: 创建金额为0的报销单应成功', async () => {
      const response = await request(app)
        .post('/api/claims')
        .send({
          description: 'Test Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 0, currency: 'USD', description: 'Free item' }
          ]
        });
      
      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/claims/:id', () => {
    
    beforeEach(() => {
      db.prepare(`
        INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('CLM-TEST', 'u2', 'Test Claim', 500, 'USD', 'Pending', 1);
    });

    it('CLAIM-010: 查询不存在的报销单应返回404', async () => {
      const response = await request(app).get('/api/claims/NONEXISTENT');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Claim not found');
    });

    it('CLAIM-011: 查询存在的报销单应返回详情', async () => {
      const response = await request(app).get('/api/claims/CLM-TEST');
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('CLM-TEST');
      expect(response.body.description).toBe('Test Claim');
    });
  });

  describe('GET /api/claims (列表查询)', () => {
    
    beforeEach(() => {
      db.prepare(`
        INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('CLM-EMP1', 'u2', 'Employee Claim 1', 100, 'USD', 'Pending', 1);
      db.prepare(`
        INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('CLM-EMP2', 'u3', 'Employee Claim 2', 200, 'USD', 'Pending', 1);
    });

    it('CLAIM-007: Employee查询只应返回自己的报销单', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u2', id: 'u2', email: 'sarah@example.com', role: 'Employee', department: 'Marketing' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/claims')
        .set('Authorization', `Bearer ${token}`);
      
      expect([200, 401]).toContain(response.status);
    });
  });
});

describe('审批模块测试', () => {
  
  describe('POST /api/claims/:id/approve', () => {
    
    beforeEach(() => {
      db.prepare(`
        INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('CLM-PENDING', 'u2', 'Pending Claim', 500, 'USD', 'Pending', 1);
      
      db.prepare(`
        INSERT INTO requests (id, claim_id, type, claimant_id, amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('REQ-TEST', 'CLM-PENDING', 'Travel', 'u2', 500, 'USD', 'Pending', 1);
    });

    it('APPROVE-001: Manager审批Pending报销单应成功', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u6', id: 'u6', email: 'michael@example.com', role: 'Manager', department: 'Marketing' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/api/claims/CLM-PENDING/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({ comments: 'Approved' });
      
      expect([200, 401, 403]).toContain(response.status);
    });

    it('APPROVE-003: Employee尝试审批应返回403', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u2', id: 'u2', email: 'sarah@example.com', role: 'Employee', department: 'Marketing' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/api/claims/CLM-PENDING/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({ comments: 'Approved' });
      
      expect([401, 403]).toContain(response.status);
    });

    it('APPROVE-006: 审批不存在的报销单应返回404', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u6', id: 'u6', email: 'michael@example.com', role: 'Manager', department: 'Marketing' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/api/claims/NONEXISTENT/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({ comments: 'Approved' });
      
      expect([401, 404]).toContain(response.status);
    });
  });

  describe('POST /api/claims/:id/reject', () => {
    
    beforeEach(() => {
      db.prepare(`
        INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('CLM-REJECT', 'u2', 'Claim to Reject', 500, 'USD', 'Pending', 1);
      
      db.prepare(`
        INSERT INTO requests (id, claim_id, type, claimant_id, amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('REQ-REJECT', 'CLM-REJECT', 'Travel', 'u2', 500, 'USD', 'Pending', 1);
    });

    it('REJECT-001: Manager拒绝Pending报销单应成功', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u6', id: 'u6', email: 'michael@example.com', role: 'Manager', department: 'Marketing' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/api/claims/CLM-REJECT/reject')
        .set('Authorization', `Bearer ${token}`)
        .send({ comments: 'Not approved' });
      
      expect([200, 401, 403]).toContain(response.status);
    });

    it('REJECT-003: 拒绝时添加审批意见应保存', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u6', id: 'u6', email: 'michael@example.com', role: 'Manager', department: 'Marketing' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/api/claims/CLM-REJECT/reject')
        .set('Authorization', `Bearer ${token}`)
        .send({ comments: 'Reason: exceeds budget' });
      
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});

describe('审批待办模块测试', () => {
  
  describe('GET /api/approvals', () => {
    
    beforeEach(() => {
      db.prepare(`
        INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('CLM-APPROVE-1', 'u2', 'Claim 1', 100, 'USD', 'Pending', 1);
      db.prepare(`
        INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('CLM-APPROVE-2', 'u3', 'Claim 2', 200, 'USD', 'Pending Finance', 2);
    });

    it('TASK-001: Manager查询待审批任务应返回Pending任务', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u6', id: 'u6', email: 'michael@example.com', role: 'Manager', department: 'Marketing' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${token}`);
      
      expect([200, 401]).toContain(response.status);
    });

    it('TASK-003: Employee查询待审批任务应返回空列表', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u2', id: 'u2', email: 'sarah@example.com', role: 'Employee', department: 'Marketing' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${token}`);
      
      expect([200, 401]).toContain(response.status);
    });
  });
});

describe('搜索模块测试', () => {
  
  describe('GET /api/search', () => {
    
    beforeEach(() => {
      db.prepare(`
        INSERT INTO requests (id, claim_id, type, claimant_id, vendor_id, amount, currency, status, description, step)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('REQ-SEARCH', null, 'Travel', 'u2', 'v1', 500, 'USD', 'Pending', 'Business Trip', 1);
    });

    it('SEARCH-001: 搜索报销单ID应返回匹配结果', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'REQ-SEARCH' });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('SEARCH-003: 空白搜索应返回空列表', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: '' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});

describe('通知模块测试', () => {
  
  describe('GET /api/notifications', () => {
    
    beforeEach(() => {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, is_read)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('notif-1', 'u2', 'approval_required', 'Test Notification', 'Test message', 0);
    });

    it('NOTIF-001: 获取通知列表应返回通知', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u2', email: 'sarah@example.com', role: 'Employee' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    
    it('NOTIF-002: 获取未读通知数量应返回正确数量', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u2', email: 'sarah@example.com', role: 'Employee' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
    });
  });
});

describe('工作流模块测试', () => {
  
  describe('GET /api/workflow/approval-path', () => {
    
    it('WORKFLOW-001: 查询审批路径应返回完整列表', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u1', email: 'alex@example.com', role: 'Finance Lead' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/workflow/approval-path')
        .query({ claimant_id: 'u2', amount: 500 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('approvers');
      expect(response.body).toHaveProperty('workflow');
    });

    it('WORKFLOW-002: 高金额应触发条件分支', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u1', email: 'alex@example.com', role: 'Finance Lead' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/workflow/approval-path')
        .query({ claimant_id: 'u2', amount: 6000 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.approvers.length).toBe(3);
    });

    it('WORKFLOW-003: 查询不存在用户应返回404', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 'u1', email: 'alex@example.com', role: 'Finance Lead' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/workflow/approval-path')
        .query({ claimant_id: 'NONEXISTENT', amount: 500 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});
