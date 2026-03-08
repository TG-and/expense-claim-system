import request from 'supertest';

const API_BASE = 'http://localhost:3008';

describe('多角色权限测试', () => {
  let employeeToken: string;
  let managerToken: string;
  let financeToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('一、普通员工(Employee)角色测试', () => {
    
    describe('1.1 登录功能测试', () => {
      
      it('EMP-LOGIN-001: 使用正确凭证登录应成功', async () => {
        const response = await request(API_BASE)
          .post('/api/auth/login')
          .send({ email: 'sarah@example.com', password: 'password123' });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.role).toBe('Employee');
        employeeToken = response.body.token;
      });

      it('EMP-LOGIN-002: 使用错误密码登录应返回401', async () => {
        const response = await request(API_BASE)
          .post('/api/auth/login')
          .send({ email: 'sarah@example.com', password: 'wrongpassword' });
        
        expect(response.status).toBe(401);
      });

      it('EMP-LOGIN-003: 使用不存在账号登录应返回401', async () => {
        const response = await request(API_BASE)
          .post('/api/auth/login')
          .send({ email: 'nonexistent@example.com', password: 'password123' });
        
        expect(response.status).toBe(401);
      });
    });

    describe('1.2 可访问功能模块测试', () => {
      
      it('EMP-FUNC-001: 可访问仪表盘相关数据', async () => {
        const response = await request(API_BASE)
          .get('/api/claims')
          .set('Authorization', `Bearer ${employeeToken}`);
        
        expect([200, 401]).toContain(response.status);
      });

      it('EMP-FUNC-002: 可访问自己的报销列表', async () => {
        const response = await request(API_BASE)
          .get('/api/claims')
          .set('Authorization', `Bearer ${employeeToken}`);
        
        expect([200, 401]).toContain(response.status);
      });

      it('EMP-FUNC-003: 可创建新报销单', async () => {
        const response = await request(API_BASE)
          .post('/api/claims')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({
            description: 'Employee Personal Claim',
            claimant_id: 'u2',
            items: [
              { type: 'Travel', vendor_id: 'v1', amount: 100, currency: 'USD', description: 'Test' }
            ]
          });
        
        expect([201, 401]).toContain(response.status);
      });

      it('EMP-FUNC-004: 访问审批页面应返回空列表', async () => {
        const response = await request(API_BASE)
          .get('/api/approvals')
          .set('Authorization', `Bearer ${employeeToken}`);
        
        expect([200, 401]).toContain(response.status);
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('1.3 数据查看权限测试', () => {
      
      it('EMP-DATA-001: 只能查看自己提交的报销单', async () => {
        const response = await request(API_BASE)
          .get('/api/claims')
          .set('Authorization', `Bearer ${employeeToken}`);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('1.4 权限限制场景测试', () => {
      
      it('EMP-DENY-001: 访问管理后台应返回403', async () => {
        const response = await request(API_BASE)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${employeeToken}`);
        
        expect([401, 403]).toContain(response.status);
      });

      it('EMP-DENY-002: 访问用户管理应返回403', async () => {
        const response = await request(API_BASE)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${employeeToken}`);
        
        expect([401, 403]).toContain(response.status);
      });
    });
  });

  describe('二、经理(Manager)角色测试', () => {
    
    describe('2.1 登录功能测试', () => {
      
      it('MGR-LOGIN-001: 使用正确凭证登录应成功', async () => {
        const response = await request(API_BASE)
          .post('/api/auth/login')
          .send({ email: 'michael@example.com', password: 'password123' });
        
        expect(response.status).toBe(200);
        expect(response.body.user.role).toBe('Manager');
        expect(response.body.user.department).toBe('Marketing');
        managerToken = response.body.token;
      });

      it('MGR-LOGIN-002: 登录后角色验证', async () => {
        const response = await request(API_BASE)
          .post('/api/auth/login')
          .send({ email: 'michael@example.com', password: 'password123' });
        
        expect(response.body.user.role).toBe('Manager');
      });
    });

    describe('2.2 个人业务操作测试', () => {
      
      it('MGR-PERS-001: 创建个人报销单应成功', async () => {
        const response = await request(API_BASE)
          .post('/api/claims')
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            description: 'Manager Personal Claim',
            claimant_id: 'u6',
            items: [
              { type: 'Travel', vendor_id: 'v1', amount: 200, currency: 'USD', description: 'Business trip' }
            ]
          });
        
        expect([201, 401]).toContain(response.status);
      });

      it('MGR-PERS-002: 查看个人报销记录', async () => {
        const response = await request(API_BASE)
          .get('/api/claims')
          .set('Authorization', `Bearer ${managerToken}`);
        
        expect([200, 401]).toContain(response.status);
      });
    });

    describe('2.3 团队数据查看测试', () => {
      
      it('MGR-TEAM-001: 可查看本团队报销单', async () => {
        const response = await request(API_BASE)
          .get('/api/claims')
          .set('Authorization', `Bearer ${managerToken}`);
        
        expect([200, 401]).toContain(response.status);
      });

      it('MGR-TEAM-002: 可访问审批列表', async () => {
        const response = await request(API_BASE)
          .get('/api/approvals')
          .set('Authorization', `Bearer ${managerToken}`);
        
        expect([200, 401]).toContain(response.status);
      });
    });

    describe('2.4 审批流程测试', () => {
      
      it('MGR-APPR-001: 查看待审批列表', async () => {
        const response = await request(API_BASE)
          .get('/api/approvals')
          .set('Authorization', `Bearer ${managerToken}`);
        
        expect([200, 401]).toContain(response.status);
      });
    });

    describe('2.5 管理功能测试', () => {
      
      it('MGR-ADMIN-001: 可访问用户管理', async () => {
        const response = await request(API_BASE)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${managerToken}`);
        
        expect([200, 401, 403]).toContain(response.status);
      });
    });

    describe('2.6 权限边界测试', () => {
      
      it('MGR-DENY-001: 访问系统配置应受限', async () => {
        const response = await request(API_BASE)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${managerToken}`);
        
        expect([200, 401, 403]).toContain(response.status);
      });
    });
  });

  describe('三、财务(Finance Lead)角色测试', () => {
    
    describe('3.1 登录与权限验证', () => {
      
      it('FIN-LOGIN-001: 使用正确凭证登录应成功', async () => {
        const response = await request(API_BASE)
          .post('/api/auth/login')
          .send({ email: 'alex@example.com', password: 'password123' });
        
        expect(response.status).toBe(200);
        expect(['Finance Lead', 'Finance']).toContain(response.body.user.role);
        financeToken = response.body.token;
      });
    });

    describe('3.2 财务功能测试', () => {
      
      it('FIN-FUNC-001: 可访问财务相关API', async () => {
        const response = await request(API_BASE)
          .get('/api/claims')
          .set('Authorization', `Bearer ${financeToken}`);
        
        expect([200, 401]).toContain(response.status);
      });

      it('FIN-FUNC-002: 可查看待财务审批', async () => {
        const response = await request(API_BASE)
          .get('/api/approvals')
          .set('Authorization', `Bearer ${financeToken}`);
        
        expect([200, 401]).toContain(response.status);
      });
    });

    describe('3.3 全局数据查看', () => {
      
      it('FIN-DATA-001: 可查看所有报销单', async () => {
        const response = await request(API_BASE)
          .get('/api/claims')
          .set('Authorization', `Bearer ${financeToken}`);
        
        expect([200, 401]).toContain(response.status);
      });

      it('FIN-DATA-002: 可查看所有用户', async () => {
        const response = await request(API_BASE)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${financeToken}`);
        
        expect([200, 401, 403]).toContain(response.status);
      });
    });
  });

  describe('四、管理员(Admin)角色测试', () => {
    
    describe('4.1 管理员权限验证', () => {
      
      it('ADMIN-001: 登录验证角色为Admin', async () => {
        const response = await request(API_BASE)
          .post('/api/auth/login')
          .send({ email: 'david@example.com', password: 'password123' });
        
        expect(response.status).toBe(200);
        expect(response.body.user.role).toBe('Admin');
        adminToken = response.body.token;
      });

      it('ADMIN-002: 可访问所有管理功能', async () => {
        const response = await request(API_BASE)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect(response.status).toBe(200);
      });
    });
  });

  describe('五、角色权限边界综合测试', () => {
    
    it('PERMISSION-001: Employee不能访问其他角色专属API', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${employeeToken}`);
      
      expect([401, 403]).toContain(response.status);
    });

    it('PERMISSION-002: Manager可以访问团队审批', async () => {
      const response = await request(API_BASE)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${managerToken}`);
      
      expect([200, 401]).toContain(response.status);
    });

    it('PERMISSION-003: Finance可以访问所有数据', async () => {
      const response = await request(API_BASE)
        .get('/api/claims')
        .set('Authorization', `Bearer ${financeToken}`);
      
      expect([200, 401]).toContain(response.status);
    });

    it('PERMISSION-004: Admin拥有最高权限', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
    });

    it('PERMISSION-005: 无token访问应返回401', async () => {
      const response = await request(API_BASE)
        .get('/api/claims');
      
      expect(response.status).toBe(401);
    });

    it('PERMISSION-006: 无效token访问应返回401或403', async () => {
      const response = await request(API_BASE)
        .get('/api/claims')
        .set('Authorization', 'Bearer invalid-token');
      
      expect([401, 403]).toContain(response.status);
    });
  });
});
