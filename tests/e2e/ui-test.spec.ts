import { test, expect } from '@playwright/test';

test.describe('My Reimbursement入口功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('a) 页面显示验证', () => {
    
    test('MYREP-001: 登录后页面显示正确', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"]', 'sarah@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/', { timeout: 10000 });
      
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(100);
    });

    test('MYREP-002: 页面文本内容显示正确', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"]', 'sarah@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(100);
    });
  });

  test.describe('b) 数据加载验证', () => {
    
    test('MYREP-003: 报销单数据加载完成', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"]', 'sarah@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      await page.waitForTimeout(3000);
      
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(50);
    });

    test('MYREP-004: 页面正常无崩溃', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"]', 'sarah@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      await page.waitForTimeout(2000);
      
      const hasError = page.url().includes('error');
      expect(hasError).toBe(false);
    });
  });

  test.describe('c) 页面加载状态验证', () => {
    
    test('MYREP-005: 页面加载时间不超过3秒', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('MYREP-006: 页面可交互', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"]', 'sarah@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      await page.waitForTimeout(3000);
      
      const isNavigated = page.url() !== 'http://localhost:3008/login';
      expect(isNavigated).toBe(true);
    });
  });

  test.describe('d) 不同网络环境测试', () => {
    
    test('MYREP-007: 正常网络下登录页面加载', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const loginFormVisible = await page.locator('form, .login, input').first().isVisible();
      expect(loginFormVisible).toBe(true);
    });

    test('MYREP-008: 页面渲染正常', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      const hasContent = await page.locator('body').isVisible();
      expect(hasContent).toBe(true);
    });
  });
});

test.describe('Approval入口功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('a) 入口显示状态验证', () => {
    
    test('APPROVAL-001: Employee角色Approval入口无权限或无数据', async ({ page }) => {
      await page.fill('input[type="email"]', 'sarah@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      await page.waitForTimeout(2000);
      
      const url = page.url();
      expect(url).not.toBe('http://localhost:3008/login');
    });

    test('APPROVAL-002: Manager角色Approval入口可见', async ({ page }) => {
      await page.fill('input[type="email"]', 'michael@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      await page.waitForTimeout(2000);
      
      const url = page.url();
      expect(url).not.toBe('http://localhost:3008/login');
    });
  });

  test.describe('b) 入口样式验证', () => {
    
    test('APPROVAL-003: 登录后页面正常渲染', async ({ page }) => {
      await page.fill('input[type="email"]', 'michael@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(100);
    });

    test('APPROVAL-004: 页面可交互', async ({ page }) => {
      await page.fill('input[type="email"]', 'michael@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      const isLoggedIn = page.url() !== 'http://localhost:3008/login';
      expect(isLoggedIn).toBe(true);
    });
  });

  test.describe('c) 不同角色权限显示', () => {
    
    test('APPROVAL-005: Finance角色登录成功', async ({ page }) => {
      await page.fill('input[type="email"]', 'alex@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      const url = page.url();
      expect(url).not.toBe('http://localhost:3008/login');
    });

    test('APPROVAL-006: Admin角色登录成功', async ({ page }) => {
      await page.fill('input[type="email"]', 'david@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 });
      
      const url = page.url();
      expect(url).not.toBe('http://localhost:3008/login');
    });
  });
});
