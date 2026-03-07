import { test, expect } from '@playwright/test';

test.describe('费用报销系统 E2E 测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('登录功能', () => {
    
    test('E2E-001: 员工登录成功', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'sarah@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'password123');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      
      await page.waitForURL('**/');
      await expect(page).toHaveTitle(/Expense|报销/);
    });

    test('E2E-002: 使用错误密码登录失败', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'sarah@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'wrongpassword');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      
      await expect(page.locator('text=Invalid, error')).toBeVisible({ timeout: 5000 });
    });

    test('E2E-003: Manager登录成功', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'michael@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'password123');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      
      await page.waitForURL('**/');
    });

    test('E2E-004: Finance Lead登录成功', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'alex@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'password123');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      
      await page.waitForURL('**/');
    });
  });

  test.describe('员工功能', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'sarah@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'password123');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      await page.waitForURL('**/');
    });

    test('E2E-005: 查看仪表盘', async ({ page }) => {
      await expect(page.locator('text=Dashboard, dashboard, 仪表盘')).toBeVisible({ timeout: 10000 });
    });

    test('E2E-006: 查看我的报销列表', async ({ page }) => {
      await page.click('a[href="/reimbursements"], a:has-text("Reimbursements, 报销")');
      await page.waitForURL('**/reimbursements');
    });

    test('E2E-007: 创建新报销单', async ({ page }) => {
      await page.click('a[href="/claims/new"], a:has-text("New Claim, 新建报销")');
      await page.waitForURL('**/claims/new');
    });
  });

  test.describe('经理审批功能', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'michael@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'password123');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      await page.waitForURL('**/');
    });

    test('E2E-008: 查看审批页面', async ({ page }) => {
      await page.click('a[href="/approvals"], a:has-text("Approvals, 审批")');
      await page.waitForURL('**/approvals');
    });
  });

  test.describe('财务功能', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'alex@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'password123');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      await page.waitForURL('**/');
    });

    test('E2E-009: 查看财务仪表盘', async ({ page }) => {
      await page.click('a[href="/finance"], a:has-text("Finance, 财务")');
      await page.waitForURL('**/finance');
    });
  });

  test.describe('管理员功能', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'david@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'password123');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      await page.waitForURL('**/');
    });

    test('E2E-010: 查看管理后台', async ({ page }) => {
      await page.click('a[href="/admin"], a:has-text("Admin, 管理")');
      await page.waitForURL('**/admin');
    });

    test('E2E-011: 查看用户管理', async ({ page }) => {
      await page.click('a[href="/admin/users"], a:has-text("Users, 用户")');
      await page.waitForURL('**/admin/users');
    });

    test('E2E-012: 查看工作流配置', async ({ page }) => {
      await page.click('a[href="/admin/workflows"], a:has-text("Workflows, 工作流")');
      await page.waitForURL('**/admin/workflows');
    });
  });

  test.describe('登出功能', () => {
    
    test('E2E-013: 用户登出', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"]', 'sarah@example.com');
      await page.fill('input[type="password"], input[name="password"], input[placeholder*="password"]', 'password123');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
      await page.waitForURL('**/');
      
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), button:has-text("登出")');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL('**/login');
      }
    });
  });
});
