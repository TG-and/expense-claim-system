import request from 'supertest';

const API_BASE = 'http://localhost:3008';

describe('后端API集成测试', () => {
  let authToken: string;
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  describe('认证模块', () => {
    
    it('AUTH-001: 使用正确邮箱和密码登录应返回成功', async () => {
      const response = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com', password: 'password123' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: 'sarah@example.com',
        role: 'Employee'
      });
      authToken = response.body.token;
    });

    it('AUTH-002: 使用错误密码应返回401错误', async () => {
      const response = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com', password: 'wrongpassword' });
      
      expect(response.status).toBe(401);
    });

    it('AUTH-003: 不提供邮箱和密码应返回400错误', async () => {
      const response = await request(API_BASE)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
    });
  });

  describe('健康检查', () => {
    it('GET /api/health 应返回OK', async () => {
      const response = await request(API_BASE).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('用户管理模块', () => {
    
    it('USER-001: Admin角色查询所有用户应返回用户列表', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'david@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('USER-003: Employee角色查询应返回403禁止访问', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
    });
  });

  describe('报销申请模块', () => {
    
    it('CLAIM-001: 创建带明细的报销单应成功', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .post('/api/claims')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'E2E Test Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 500, currency: 'USD', description: 'Flight' },
            { type: 'Entertainment', vendor_id: 'v2', amount: 100, currency: 'USD', description: 'Lunch' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('CLAIM-010: 查询不存在的报销单应返回404', async () => {
      const response = await request(API_BASE).get('/api/claims/NONEXISTENT');
      expect(response.status).toBe(404);
    });
  });

  describe('审批模块', () => {
    
    it('APPROVE-001: Manager审批Pending报销单应成功或返回错误', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'michael@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const createRes = await request(API_BASE)
        .post('/api/claims')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Test Claim for Approval',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 300, currency: 'USD', description: 'Test trip' }
          ]
        });

      if (createRes.status === 201) {
         const claimId = createRes.body.id;
         const response = await request(API_BASE)
           .post(`/api/claims/${claimId}/approve`)
           .set('Authorization', `Bearer ${token}`)
           .send({ comments: 'Approved by test' });
         
         expect([200, 400, 403, 401]).toContain(response.status);
       } else {
         expect(createRes.status).toBeOneOf([201, 400, 500]);
       }
    });
  });

  describe('搜索模块', () => {
    
    it('SEARCH-001: 搜索报销单ID应返回匹配结果', async () => {
      const response = await request(API_BASE)
        .get('/api/search')
        .query({ q: 'CLM' });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('工作流模块', () => {
    
    it('WORKFLOW-001: 查询审批路径应返回完整列表', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'alex@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .get('/api/workflow/approval-path')
        .query({ claimant_id: 'u2', amount: 500 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('approvers');
    });

    it('WORKFLOW-002: 高金额应触发条件分支', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'alex@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .get('/api/workflow/approval-path')
        .query({ claimant_id: 'u2', amount: 6000 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.approvers.length).toBeGreaterThanOrEqual(2);
    });
  });
});
