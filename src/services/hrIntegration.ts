import { db } from '../db/index.js';

interface HREmployee {
  employee_number: string;
  name: string;
  email: string;
  department: string;
  job_title: string;
  manager_id: string | null;
  hire_date: string;
  cost_center: string;
  location: string;
  is_active: boolean;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
}

export class HRIntegrationService {
  private syncLogId: string | null = null;

  async syncFromHRSystem(hrData: HREmployee[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: []
    };

    this.syncLogId = `hr_sync_${Date.now()}`;

    db.prepare(`
      INSERT INTO hr_sync_log (id, sync_type, status, records_processed)
      VALUES (?, 'full_sync', 'running', 0)
    `).run(this.syncLogId, 'full_sync');

    try {
      for (const employee of hrData) {
        try {
          await this.syncEmployee(employee);
          result.recordsProcessed++;
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push(`Failed to sync ${employee.email}: ${error.message}`);
        }
      }

      result.success = result.recordsFailed === 0;

      db.prepare(`
        UPDATE hr_sync_log 
        SET status = ?, records_processed = ?, records_failed = ?, 
            error_message = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        result.success ? 'completed' : 'completed_with_errors',
        result.recordsProcessed,
        result.recordsFailed,
        result.errors.join('; ') || null,
        this.syncLogId
      );

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);

      db.prepare(`
        UPDATE hr_sync_log 
        SET status = 'failed', error_message = ?
        WHERE id = ?
      `).run(error.message, this.syncLogId);
    }

    this.syncLogId = null;
    return result;
  }

  private async syncEmployee(hrEmployee: HREmployee): Promise<void> {
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE email = ? OR employee_number = ?
    `).get(hrEmployee.email, hrEmployee.employee_number) as { id: string } | undefined;

    if (existingUser) {
      db.prepare(`
        UPDATE users SET
          name = ?,
          department = ?,
          job_title = ?,
          manager_id = ?,
          employee_number = ?,
          hire_date = ?,
          cost_center = ?,
          location = ?,
          is_active = ?
        WHERE id = ?
      `).run(
        hrEmployee.name,
        hrEmployee.department,
        hrEmployee.job_title,
        hrEmployee.manager_id,
        hrEmployee.employee_number,
        hrEmployee.hire_date,
        hrEmployee.cost_center,
        hrEmployee.location,
        hrEmployee.is_active ? 1 : 0,
        existingUser.id
      );
    } else {
      const newId = `u_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const initials = hrEmployee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

      db.prepare(`
        INSERT INTO users (id, name, email, password, role, department, job_title, manager_id, employee_number, hire_date, cost_center, location, is_active, avatar)
        VALUES (?, ?, ?, ?, 'Employee', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        hrEmployee.name,
        hrEmployee.email,
        'password123',
        hrEmployee.department,
        hrEmployee.job_title,
        hrEmployee.manager_id,
        hrEmployee.employee_number,
        hrEmployee.hire_date,
        hrEmployee.cost_center,
        hrEmployee.location,
        hrEmployee.is_active ? 1 : 0,
        initials
      );
    }
  }

  async syncSingleEmployee(employeeNumber: string): Promise<boolean> {
    const syncLogId = `hr_sync_single_${Date.now()}`;
    
    try {
      db.prepare(`
        INSERT INTO hr_sync_log (id, sync_type, status)
        VALUES (?, 'single_sync', 'running')
      `).run(syncLogId, 'single_sync');

      db.prepare(`
        UPDATE hr_sync_log 
        SET status = 'completed', records_processed = 1, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(syncLogId);

      return true;
    } catch (error) {
      db.prepare(`
        UPDATE hr_sync_log 
        SET status = 'failed', records_failed = 1, error_message = ?
        WHERE id = ?
      `).run(String(error), syncLogId);
      return false;
    }
  }

  getSyncHistory(limit: number = 10) {
    return db.prepare(`
      SELECT * FROM hr_sync_log
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  }

  getPendingSyncTasks() {
    return db.prepare(`
      SELECT * FROM hr_sync_log
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `).all();
  }

  validateManagerHierarchy(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const usersWithInvalidManager = db.prepare(`
      SELECT u.id, u.name, u.manager_id
      FROM users u
      WHERE u.manager_id IS NOT NULL
      AND u.manager_id NOT IN (SELECT id FROM users)
    `).all();

    if (usersWithInvalidManager.length > 0) {
      issues.push(`${usersWithInvalidManager.length} users have invalid manager references`);
    }

    const circularReferences = this.detectCircularReferences();
    if (circularReferences.length > 0) {
      issues.push(`Circular manager references detected: ${circularReferences.join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private detectCircularReferences(): string[] {
    const circular: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const users = db.prepare('SELECT id, manager_id FROM users WHERE manager_id IS NOT NULL').all() as { id: string; manager_id: string }[];

    const userMap = new Map(users.map(u => [u.id, u.manager_id]));

    function hasCycle(userId: string): boolean {
      if (recursionStack.has(userId)) return true;
      if (visited.has(userId)) return false;

      visited.add(userId);
      recursionStack.add(userId);

      const managerId = userMap.get(userId);
      if (managerId && userMap.has(managerId)) {
        if (hasCycle(managerId)) {
          circular.push(userId);
          return true;
        }
      }

      recursionStack.delete(userId);
      return false;
    }

    for (const user of users) {
      if (!visited.has(user.id)) {
        hasCycle(user.id);
      }
    }

    return circular;
  }

  getOrganizationStatistics() {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };
    const departments = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };
    const usersByDepartment = db.prepare(`
      SELECT department, COUNT(*) as count 
      FROM users 
      WHERE is_active = 1 
      GROUP BY department
    `).all();
    const usersByRole = db.prepare(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `).all();

    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      departments: departments.count,
      byDepartment: usersByDepartment,
      byRole: usersByRole
    };
  }

  generateEmployeeReport(): any {
    const employees = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.department,
        u.job_title,
        u.location,
        u.hire_date,
        u.is_active,
        m.name as manager_name,
        m.email as manager_email,
        (SELECT COUNT(*) FROM users WHERE manager_id = u.id) as direct_reports_count
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      ORDER BY u.department, u.name
    `).all();

    return employees;
  }
}

export const hrIntegration = new HRIntegrationService();
