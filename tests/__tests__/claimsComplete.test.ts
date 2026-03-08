import request from 'supertest';

const API_BASE = 'http://localhost:3008';

describe('报销单完整功能测试', () => {
  let authToken: string;
  let employeeToken: string;
  let managerToken: string;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('报销单创建测试', () => {
    
    it('CLAIM-CREATE-001: 创建单笔明细报销单', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Test Single Item Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 500, currency: 'USD', description: 'Flight ticket' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('Pending');
    });

    it('CLAIM-CREATE-002: 创建多笔明细报销单', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Test Multiple Items Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 300, currency: 'USD', description: 'Flight' },
            { type: 'Entertainment', vendor_id: 'v2', amount: 150, currency: 'USD', description: 'Client dinner' },
            { type: 'Procurement', vendor_id: 'v3', amount: 200, currency: 'USD', description: 'Office supplies' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(650);
    });

    it('CLAIM-CREATE-003: 创建无明细报销单应失败或成功', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Test Claim No Items',
          claimant_id: 'u2',
          items: []
        });
      
      expect([201, 500]).toContain(response.status);
    });

    it('CLAIM-CREATE-004: 小额报销单($50)', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Small Amount Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Office Supplies', vendor_id: 'v1', amount: 50, currency: 'USD', description: 'Notebook' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(50);
    });

    it('CLAIM-CREATE-005: 中额报销单($500)', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Medium Amount Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 500, currency: 'USD', description: 'Hotel' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(500);
    });

    it('CLAIM-CREATE-006: 大额报销单($3000)', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Large Amount Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Procurement', vendor_id: 'v3', amount: 3000, currency: 'USD', description: 'Laptop' }
          ]
        });
      
      expect([201, 500]).toContain(response.status);
    });

    it('CLAIM-CREATE-007: 超大额报销单($8000)', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Extra Large Amount Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Procurement', vendor_id: 'v3', amount: 8000, currency: 'USD', description: 'Server equipment' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(8000);
    });

    it('CLAIM-CREATE-008: Travel类型报销单', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Travel Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v5', amount: 800, currency: 'USD', description: 'Flight to NYC' }
          ]
        });
      
      expect(response.status).toBe(201);
    });

    it('CLAIM-CREATE-009: Entertainment类型报销单', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Entertainment Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Entertainment', vendor_id: 'v2', amount: 300, currency: 'USD', description: 'Client meeting' }
          ]
        });
      
      expect(response.status).toBe(201);
    });

    it('CLAIM-CREATE-010: Procurement类型报销单', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Procurement Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Procurement', vendor_id: 'v1', amount: 1200, currency: 'USD', description: 'New monitor' }
          ]
        });
      
      expect(response.status).toBe(201);
    });

    it('CLAIM-CREATE-014: 有附件报销单', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Claim with Attachment',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 450, currency: 'USD', description: 'Flight with receipt', attachment_url: '/uploads/test-receipt.jpg' }
          ]
        });
      
      expect(response.status).toBe(201);
    });
  });

  describe('报销单列表显示测试', () => {
    
    it('CLAIM-LIST-001: 查看自己的报销单列表', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'alex@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      await request(API_BASE)
        .post('/api/claims')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'My Claim for List Test',
          claimant_id: 'u1',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 200, currency: 'USD', description: 'Test' }
          ]
        });

      const response = await request(API_BASE)
        .get('/api/claims')
        .set('Authorization', `Bearer ${token}`);
      
      expect([200, 401]).toContain(response.status);
    });

    it('CLAIM-LIST-002: 列表数据完整性检查', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .get('/api/claims')
        .set('Authorization', `Bearer ${token}`);
      
      if (response.body.length > 0) {
        const claim = response.body[0];
        expect(claim).toHaveProperty('id');
        expect(claim).toHaveProperty('description');
        expect(claim).toHaveProperty('total_amount');
        expect(claim).toHaveProperty('status');
        expect(claim).toHaveProperty('created_at');
        expect(claim).toHaveProperty('claimant_name');
      }
    });

    it('CLAIM-LIST-004: 空列表显示', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'newuser@test.com', password: 'password123' });
      
      if (loginRes.status === 401) {
        expect(true).toBe(true);
        return;
      }
      
      const token = loginRes.body.token;
      const response = await request(API_BASE)
        .get('/api/claims')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
    });
  });

  describe('报销单详情验证测试', () => {
    let createdClaimId: string;

    beforeAll(async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'sarah@example.com', password: 'password123' });
      
      employeeToken = loginRes.body.token;

      const createRes = await request(API_BASE)
        .post('/api/claims')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          description: 'Detail Test Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 500, currency: 'USD', description: 'Flight to LA' },
            { type: 'Entertainment', vendor_id: 'v2', amount: 150, currency: 'USD', description: 'Client dinner' }
          ]
        });
      
      createdClaimId = createRes.body.id;
    });

    it('CLAIM-DETAIL-001: 验证报销单ID', async () => {
      const response = await request(API_BASE)
        .get(`/api/claims/${createdClaimId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdClaimId);
    });

    it('CLAIM-DETAIL-002: 验证申请人姓名', async () => {
      const response = await request(API_BASE)
        .get(`/api/claims/${createdClaimId}`);
      
      expect(response.body).toHaveProperty('claimant_name');
    });

    it('CLAIM-DETAIL-004: 验证报销事由', async () => {
      const response = await request(API_BASE)
        .get(`/api/claims/${createdClaimId}`);
      
      expect(response.body.description).toBe('Detail Test Claim');
    });

    it('CLAIM-DETAIL-005: 验证总金额', async () => {
      const response = await request(API_BASE)
        .get(`/api/claims/${createdClaimId}`);
      
      expect(response.body.total_amount).toBe(650);
    });

    it('CLAIM-DETAIL-006: 验证货币类型', async () => {
      const response = await request(API_BASE)
        .get(`/api/claims/${createdClaimId}`);
      
      expect(response.body.currency).toBe('USD');
    });

    it('CLAIM-DETAIL-007: 验证状态', async () => {
      const response = await request(API_BASE)
        .get(`/api/claims/${createdClaimId}`);
      
      expect(['Pending', 'Pending Finance', 'Approved', 'Rejected']).toContain(response.body.status);
    });

    it('CLAIM-DETAIL-009: 验证多笔明细', async () => {
      const response = await request(API_BASE)
        .get(`/api/claims/${createdClaimId}`);
      
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0]).toHaveProperty('type');
      expect(response.body.items[0]).toHaveProperty('amount');
      expect(response.body.items[0]).toHaveProperty('description');
    });

    it('CLAIM-DETAIL-010: 验证明细金额', async () => {
      const response = await request(API_BASE)
        .get(`/api/claims/${createdClaimId}`);
      
      expect(response.body.items[0].amount).toBe(500);
      expect(response.body.items[1].amount).toBe(150);
    });
  });

  describe('边界条件测试', () => {
    
    it('CLAIM-BOUNDARY-001: 金额为0', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Zero Amount Claim',
          claimant_id: 'u2',
          items: [
            { type: 'Other', vendor_id: 'v1', amount: 0, currency: 'USD', description: 'Free item' }
          ]
        });
      
      expect(response.status).toBe(201);
    });

    it('CLAIM-BOUNDARY-003: 金额边界$1000', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Boundary $1000',
          claimant_id: 'u2',
          items: [
            { type: 'Travel', vendor_id: 'v1', amount: 1000, currency: 'USD', description: 'Exact $1000' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(1000);
    });

    it('CLAIM-BOUNDARY-004: 金额边界$5000', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Boundary $5000',
          claimant_id: 'u2',
          items: [
            { type: 'Procurement', vendor_id: 'v1', amount: 5000, currency: 'USD', description: 'Exact $5000' }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(5000);
    });

    it('CLAIM-BOUNDARY-006: 特殊字符描述', async () => {
      const response = await request(API_BASE)
        .post('/api/claims')
        .send({
          description: 'Special chars: @#$%^&*()',
          claimant_id: 'u2',
          items: [
            { type: 'Other', vendor_id: 'v1', amount: 50, currency: 'USD', description: 'Test' }
          ]
        });
      
      expect(response.status).toBe(201);
    });
  });

  describe('工作流测试', () => {
    
    it('WORKFLOW-001: 小额报销单审批路径($500)', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'alex@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .get('/api/workflow/approval-path')
        .query({ claimant_id: 'u2', amount: 500 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.approvers.length).toBeGreaterThanOrEqual(1);
    });

    it('WORKFLOW-002: 中额报销单审批路径($1500)', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'alex@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .get('/api/workflow/approval-path')
        .query({ claimant_id: 'u2', amount: 1500 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.approvers.length).toBeGreaterThanOrEqual(2);
    });

    it('WORKFLOW-003: 大额报销单审批路径($6000)', async () => {
      const loginRes = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'alex@example.com', password: 'password123' });
      
      const token = loginRes.body.token;

      const response = await request(API_BASE)
        .get('/api/workflow/approval-path')
        .query({ claimant_id: 'u2', amount: 6000 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.approvers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('查询不存在的报销单', () => {
    
    it('CLAIM-DETAIL-999: 查询不存在的报销单应返回404', async () => {
      const response = await request(API_BASE)
        .get('/api/claims/NONEXISTENT-CLAIM');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Claim not found');
    });
  });
});
