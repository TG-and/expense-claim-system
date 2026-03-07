import { db } from '../db/index.js';

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    approverRole?: string;
    approverDepartment?: string;
    approverUserId?: string;
    condition?: string;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

interface ProcessInstance {
  id: string;
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  claimant_id: string;
  current_node_id: string;
  status: 'running' | 'completed' | 'cancelled';
  variables: string;
  started_at: string;
  completed_at?: string;
}

interface ApprovalTask {
  id: string;
  instance_id: string;
  node_id: string;
  assignee_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  comments?: string;
  created_at: string;
  completed_at?: string;
}

export class WorkflowExecutionEngine {
  async startProcess(workflowId: string, entityType: string, entityId: string, claimantId: string, initialVariables: Record<string, any> = {}) {
    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflowId) as any;
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.is_active) {
      throw new Error('Workflow is not active');
    }

    const nodes: WorkflowNode[] = JSON.parse(workflow.nodes || '[]');
    const edges: WorkflowEdge[] = JSON.parse(workflow.edges || '[]');

    const startNode = nodes.find(n => n.data.nodeType === 'start');
    if (!startNode) {
      throw new Error('Start node not found');
    }

    const instanceId = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const nextNode = this.getNextNode(startNode.id, edges, initialVariables);
    
    db.prepare(`
      INSERT INTO workflow_instances (id, workflow_id, entity_type, entity_id, claimant_id, current_node_id, status, variables)
      VALUES (?, ?, ?, ?, ?, ?, 'running', ?)
    `).run(instanceId, workflowId, entityType, entityId, claimantId, nextNode?.id || startNode.id, JSON.stringify(initialVariables));

    if (nextNode) {
      await this.assignTasks(instanceId, nextNode, claimantId, initialVariables);
    }

    return {
      instance_id: instanceId,
      workflow_id: workflowId,
      current_node: nextNode,
      status: 'running'
    };
  }

  private getNextNode(currentNodeId: string, edges: WorkflowEdge[], variables: Record<string, any>): WorkflowNode | null {
    const nextEdge = edges.find(e => e.source === currentNodeId);
    if (!nextEdge) return null;
    
    return { id: nextEdge.target, type: '', position: { x: 0, y: 0 }, data: { label: '', nodeType: '' } };
  }

  private async assignTasks(instanceId: string, node: WorkflowNode, claimantId: string, variables: Record<string, any>) {
    const claimant = db.prepare('SELECT * FROM users WHERE id = ?').get(claimantId) as any;
    
    let assigneeId: string | null = null;

    if (node.data.nodeType === 'approval') {
      if (node.data.approverRole === 'Manager' || !node.data.approverRole) {
        assigneeId = claimant?.manager_id;
      } else if (node.data.approverRole) {
        const approver = db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').get(node.data.approverRole) as any;
        assigneeId = approver?.id;
      } else if (node.data.approverUserId) {
        assigneeId = node.data.approverUserId;
      }
    }

    if (assigneeId) {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      db.prepare(`
        INSERT INTO workflow_tasks (id, instance_id, node_id, node_label, assignee_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      `).run(taskId, instanceId, node.id, node.data.label, assigneeId);

      const claimantUser = db.prepare('SELECT name FROM users WHERE id = ?').get(claimantId) as any;
      
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, link)
        VALUES (?, ?, 'approval_required', 'New Approval Task', ?, ?)
      `).run(
        `notif_${Date.now()}`,
        assigneeId,
        `${claimantUser?.name || 'Someone'} submitted a request for your approval.`,
        `/approvals/${taskId}`
      );
    }
  }

  async approveTask(taskId: string, approverId: string, comments?: string) {
    const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(taskId) as any;
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.assignee_id !== approverId) {
      throw new Error('Not authorized to approve this task');
    }

    if (task.status !== 'pending') {
      throw new Error('Task already processed');
    }

    db.prepare(`
      UPDATE workflow_tasks SET status = 'approved', comments = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(comments || null, taskId);

    return this.advanceProcess(task.instance_id, approverId, 'approved');
  }

  async rejectTask(taskId: string, approverId: string, comments: string) {
    const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(taskId) as any;
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.assignee_id !== approverId) {
      throw new Error('Not authorized to reject this task');
    }

    db.prepare(`
      UPDATE workflow_tasks SET status = 'rejected', comments = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(comments, taskId);

    db.prepare(`
      UPDATE workflow_instances SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(task.instance_id);

    const instance = db.prepare('SELECT * FROM workflow_instances WHERE id = ?').get(task.instance_id) as any;
    
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES (?, ?, 'rejected', 'Request Rejected', ?, ?)
    `).run(
      `notif_${Date.now()}`,
      instance.claimant_id,
      `Your request has been rejected. Reason: ${comments}`,
      `/reimbursements`
    );

    return { status: 'rejected', instance_id: task.instance_id };
  }

  async delegateTask(taskId: string, approverId: string, newAssigneeId: string) {
    const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(taskId) as any;
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.assignee_id !== approverId) {
      throw new Error('Not authorized to delegate this task');
    }

    db.prepare(`
      UPDATE workflow_tasks SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(newAssigneeId, taskId);

    const newAssignee = db.prepare('SELECT name FROM users WHERE id = ?').get(newAssigneeId) as any;
    
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES (?, ?, 'delegated', 'Task Delegated', ?, ?)
    `).run(
      `notif_${Date.now()}`,
      newAssigneeId,
      `A task has been delegated to you by ${approverId}`,
      `/approvals/${taskId}`
    );

    return { status: 'delegated', new_assignee: newAssignee?.name };
  }

  private async advanceProcess(instanceId: string, completedBy: string, action: string) {
    const instance = db.prepare('SELECT * FROM workflow_instances WHERE id = ?').get(instanceId) as any;
    if (!instance || instance.status !== 'running') {
      throw new Error('Instance not found or not running');
    }

    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(instance.workflow_id) as any;
    const nodes: WorkflowNode[] = JSON.parse(workflow.nodes || '[]');
    const edges: WorkflowEdge[] = JSON.parse(workflow.edges || '[]');

    const currentNode = nodes.find(n => n.id === instance.current_node_id);
    if (!currentNode) {
      throw new Error('Current node not found');
    }

    const nextEdge = edges.find(e => e.source === currentNode.id);
    if (!nextEdge) {
      db.prepare(`
        UPDATE workflow_instances SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(instanceId);

      const claimant = db.prepare('SELECT name FROM users WHERE id = ?').get(instance.claimant_id) as any;
      
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, link)
        VALUES (?, ?, 'completed', 'Request Approved', ?, ?)
      `).run(
        `notif_${Date.now()}`,
        instance.claimant_id,
        'Your request has been fully approved and processed.',
        `/reimbursements`
      );

      return { status: 'completed', instance_id: instanceId };
    }

    const nextNode = nodes.find(n => n.id === nextEdge.target);
    if (!nextNode) {
      throw new Error('Next node not found');
    }

    const variables = JSON.parse(instance.variables || '{}');
    
    db.prepare(`
      UPDATE workflow_instances SET current_node_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(nextNode.id, instanceId);

    if (nextNode.data.nodeType === 'approval') {
      await this.assignTasks(instanceId, nextNode, instance.claimant_id, variables);
    } else if (nextNode.data.nodeType === 'action') {
      await this.executeAction(instanceId, nextNode, variables);
    }

    return {
      status: 'running',
      instance_id: instanceId,
      current_node: nextNode
    };
  }

  private async executeAction(instanceId: string, node: WorkflowNode, variables: Record<string, any>) {
    if (node.data.label?.toLowerCase().includes('payment') || node.data.label?.toLowerCase().includes('pay')) {
      const instance = db.prepare('SELECT * FROM workflow_instances WHERE id = ?').get(instanceId) as any;
      
      if (instance.entity_type === 'claim') {
        db.prepare(`
          UPDATE claims SET status = 'Paid', step = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(instance.entity_id);
      }
    }

    await this.advanceProcess(instanceId, 'system', 'auto');
  }

  getTasksForUser(userId: string) {
    return db.prepare(`
      SELECT 
        t.*,
        i.entity_type,
        i.entity_id,
        i.claimant_id,
        w.name as workflow_name
      FROM workflow_tasks t
      JOIN workflow_instances i ON t.instance_id = i.id
      JOIN workflows w ON i.workflow_id = w.id
      WHERE t.assignee_id = ? AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `).all(userId);
  }

  getProcessHistory(instanceId: string) {
    const instance = db.prepare('SELECT * FROM workflow_instances WHERE id = ?').get(instanceId) as any;
    if (!instance) return null;

    const tasks = db.prepare(`
      SELECT * FROM workflow_tasks WHERE instance_id = ? ORDER BY created_at ASC
    `).all(instanceId);

    return {
      instance,
      tasks
    };
  }

  getApprovalPath(claimantId: string, amount: number): any[] {
    const claimant = db.prepare('SELECT * FROM users WHERE id = ?').get(claimantId) as any;
    if (!claimant) return [];

    const approvers: any[] = [];

    if (claimant.manager_id) {
      const manager = db.prepare('SELECT * FROM users WHERE id = ?').get(claimant.manager_id) as any;
      if (manager) {
        approvers.push({
          level: 1,
          type: 'Manager Approval',
          approver: { id: manager.id, name: manager.name, role: manager.role, department: manager.department }
        });
      }
    }

    if (amount >= 1000) {
      const finance = db.prepare('SELECT * FROM users WHERE department = ? AND is_active = 1').get('Finance') as any;
      if (finance) {
        approvers.push({
          level: 2,
          type: 'Finance Review',
          condition: `Amount >= $${amount}`,
          approver: { id: finance.id, name: finance.name, role: finance.role, department: finance.department }
        });
      }
    }

    if (amount >= 5000) {
      const financeLead = db.prepare('SELECT * FROM users WHERE role = ? AND is_active = 1').get('Finance Lead') as any;
      if (financeLead) {
        approvers.push({
          level: 3,
          type: 'Finance Lead Approval',
          condition: `Amount >= $${amount}`,
          approver: { id: financeLead.id, name: financeLead.name, role: financeLead.role, department: financeLead.department }
        });
      }
    }

    approvers.push({
      level: approvers.length + 1,
      type: 'Automatic Payment Processing',
      approver: { id: 'system', name: 'System', role: 'System', department: 'System' }
    });

    return approvers;
  }
}

export const workflowEngine = new WorkflowExecutionEngine();
