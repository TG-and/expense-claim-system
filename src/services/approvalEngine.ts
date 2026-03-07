import { db } from '../db/index.js';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  manager_id: string | null;
  job_title: string | null;
  is_active: number;
}

interface ApprovalLevel {
  id: string;
  name: string;
  level_order: number;
  approver_type: string;
  approver_role: string | null;
  approver_department: string | null;
  approver_user_id: string | null;
  condition_type: string | null;
  condition_value: number | null;
  workflow_id: string;
}

export class ApprovalEngine {
  getManagerChain(userId: string, maxLevels: number = 5): User[] {
    const chain: User[] = [];
    let currentId: string | null = userId;
    
    for (let i = 0; i < maxLevels; i++) {
      if (!currentId) break;
      
      const user = db.prepare(`
        SELECT id, name, email, role, department, manager_id, job_title, is_active
        FROM users WHERE id = ?
      `).get(currentId) as User | undefined;
      
      if (!user || !user.manager_id) break;
      
      const manager = db.prepare(`
        SELECT id, name, email, role, department, manager_id, job_title, is_active
        FROM users WHERE id = ?
      `).get(user.manager_id) as User | undefined;
      
      if (manager && manager.is_active) {
        chain.push(manager);
        currentId = manager.id;
      } else {
        break;
      }
    }
    
    return chain;
  }

  findDirectManager(userId: string): User | null {
    const user = db.prepare(`
      SELECT manager_id FROM users WHERE id = ?
    `).get(userId) as { manager_id: string } | undefined;
    
    if (!user || !user.manager_id) return null;
    
    return db.prepare(`
      SELECT id, name, email, role, department, manager_id, job_title, is_active
      FROM users WHERE id = ? AND is_active = 1
    `).get(user.manager_id) as User | null;
  }

  getApprovalLevels(workflowId: string): ApprovalLevel[] {
    return db.prepare(`
      SELECT * FROM approval_levels
      WHERE workflow_id = ?
      ORDER BY level_order ASC
    `).all(workflowId) as ApprovalLevel[];
  }

  resolveApprover(level: ApprovalLevel, claimData: {
    claimant_id: string;
    amount: number;
    department: string;
  }): User | null {
    switch (level.approver_type) {
      case 'manager':
        return this.findDirectManager(claimData.claimant_id);
      
      case 'role':
        if (!level.approver_role) return null;
        return db.prepare(`
          SELECT id, name, email, role, department, manager_id, job_title, is_active
          FROM users WHERE role = ? AND is_active = 1 LIMIT 1
        `).get(level.approver_role) as User | null;
      
      case 'department':
        if (!level.approver_department) return null;
        return db.prepare(`
          SELECT id, name, email, role, department, manager_id, job_title, is_active
          FROM users WHERE department = ? AND is_active = 1 LIMIT 1
        `).get(level.approver_department) as User | null;
      
      case 'specific':
        return db.prepare(`
          SELECT id, name, email, role, department, manager_id, job_title, is_active
          FROM users WHERE id = ? AND is_active = 1
        `).get(level.approver_user_id) as User | null;
      
      case 'condition':
        return this.resolveConditionalApprover(level, claimData);
      
      default:
        return null;
    }
  }

  private resolveConditionalApprover(level: ApprovalLevel, claimData: {
    claimant_id: string;
    amount: number;
    department: string;
  }): User | null {
    if (!level.condition_type || level.condition_value === null) {
      return this.findDirectManager(claimData.claimant_id);
    }

    let shouldEscalate = false;

    switch (level.condition_type) {
      case 'amount_above':
        shouldEscalate = claimData.amount >= level.condition_value;
        break;
      case 'amount_below':
        shouldEscalate = claimData.amount < level.condition_value;
        break;
      default:
        shouldEscalate = false;
    }

    if (shouldEscalate) {
      const chain = this.getManagerChain(claimData.claimant_id);
      return chain[level.level_order - 1] || null;
    }

    return this.findDirectManager(claimData.claimant_id);
  }

  calculateApprovalPath(claimData: {
    claimant_id: string;
    amount: number;
    department: string;
    workflow_id: string;
  }): User[] {
    const levels = this.getApprovalLevels(claimData.workflow_id);
    const approvers: User[] = [];

    for (const level of levels) {
      if (this.shouldSkipLevel(level, claimData)) {
        continue;
      }

      const approver = this.resolveApprover(level, claimData);
      if (approver) {
        approvers.push(approver);
      }
    }

    return approvers;
  }

  private shouldSkipLevel(level: ApprovalLevel, claimData: {
    amount: number;
  }): boolean {
    if (!level.condition_type || level.condition_value === null) {
      return false;
    }

    switch (level.condition_type) {
      case 'amount_above':
        return claimData.amount < level.condition_value;
      case 'amount_below':
        return claimData.amount >= level.condition_value;
      default:
        return false;
    }
  }

  createNotification(userId: string, type: string, title: string, message: string, link?: string) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, title, message, link || null);

    return id;
  }

  notifyApprovers(approvers: User[], claimInfo: {
    id: string;
    description: string;
    amount: number;
    claimant_name: string;
  }) {
    for (const approver of approvers) {
      this.createNotification(
        approver.id,
        'approval_required',
        'New Approval Request',
        `${claimInfo.claimant_name} submitted ${claimInfo.description} ($${claimInfo.amount}) for your approval.`,
        `/requests/${claimInfo.id}`
      );
    }
  }

  getUserNotifications(userId: string, unreadOnly: boolean = false) {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    if (unreadOnly) {
      query += ' AND is_read = 0';
    }
    query += ' ORDER BY created_at DESC';
    
    return db.prepare(query).all(userId);
  }

  markNotificationRead(notificationId: string) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
  }

  markAllNotificationsRead(userId: string) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  }

  handleManagerChange(oldManagerId: string, newManagerId: string, affectedUserIds: string[]) {
    for (const userId of affectedUserIds) {
      const pendingApprovals = db.prepare(`
        SELECT id FROM approvals
        WHERE approver_id = ? AND status = 'Pending'
      `).all(oldManagerId);

      if (pendingApprovals.length > 0) {
        this.createNotification(
          newManagerId,
          'escalation',
          'Reassigned Approvals',
          `You have ${pendingApprovals.length} pending approvals reassigned from previous manager.`
        );
      }
    }
  }

  getDepartmentHierarchy(departmentId: string): any {
    const department = db.prepare(`
      SELECT * FROM departments WHERE id = ?
    `).get(departmentId);

    if (!department) return null;

    const children = db.prepare(`
      SELECT * FROM departments WHERE parent_id = ?
    `).all(departmentId);

    return {
      ...department,
      children: children.map((child: any) => this.getDepartmentHierarchy(child.id))
    };
  }

  getOrgChart(rootDepartmentId?: string): any {
    const whereClause = rootDepartmentId ? 'WHERE id = ?' : 'WHERE parent_id IS NULL';
    const params = rootDepartmentId ? [rootDepartmentId] : [];

    const roots = db.prepare(`
      SELECT * FROM departments ${whereClause}
    `).all(...params);

    return roots.map((dept: any) => this.buildOrgTree(dept));
  }

  private buildOrgTree(department: any): any {
    const members = db.prepare(`
      SELECT id, name, email, role, department, job_title, manager_id
      FROM users WHERE department = ? AND is_active = 1
    `).all(department.name);

    const children = db.prepare(`
      SELECT * FROM departments WHERE parent_id = ?
    `).all(department.id);

    return {
      ...department,
      members,
      children: children.map((child: any) => this.buildOrgTree(child))
    };
  }
}

export const approvalEngine = new ApprovalEngine();
