import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data.db');

export const db = new Database(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      company_id TEXT,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      region TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      claimant_id TEXT NOT NULL,
      description TEXT NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'Draft',
      step INTEGER DEFAULT 1,
      workflow_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      claim_id TEXT,
      type TEXT NOT NULL,
      claimant_id TEXT NOT NULL,
      vendor_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT,
      attachment_url TEXT,
      step INTEGER DEFAULT 1,
      workflow_id TEXT,
      current_node_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES claims(id)
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      status TEXT NOT NULL,
      step INTEGER NOT NULL,
      node_id TEXT,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Workflow Engine Tables
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      entity_type TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      nodes TEXT,
      edges TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_nodes (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      node_type TEXT NOT NULL,
      label TEXT NOT NULL,
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      config TEXT,
      approver_role TEXT,
      approver_department TEXT,
      approver_user_id TEXT,
      condition TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_instances (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      current_node_id TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id)
    );

    CREATE TABLE IF NOT EXISTS workflow_history (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT,
      comments TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instance_id) REFERENCES workflow_instances(id)
    );
  `);

  // Only seed data if tables are empty (preserve existing data)
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count > 0) {
    return; // Data already exists, skip seeding
  }

  // Seed data
  const insertUser = db.prepare('INSERT INTO users (id, name, email, password, role, department, company_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertUser.run('u1', 'Alex Johnson', 'alex@example.com', 'password123', 'Finance Lead', 'Finance', 'c1', 'AJ');
  insertUser.run('u2', 'Sarah Williams', 'sarah@example.com', 'password123', 'Employee', 'Marketing', 'c1', 'SW');
  insertUser.run('u3', 'Marcus Chen', 'marcus@example.com', 'password123', 'Employee', 'Engineering', 'c1', 'MC');
  insertUser.run('u4', 'Elena Rossi', 'elena@example.com', 'password123', 'Employee', 'Sales Ops', 'c1', 'ER');
  insertUser.run('u5', 'James Wilson', 'james@example.com', 'password123', 'Employee', 'Engineering', 'c1', 'JW');

  const insertCompany = db.prepare('INSERT INTO companies (id, name, code) VALUES (?, ?, ?)');
  insertCompany.run('c1', 'Global Corp', 'US-01');

  const insertVendor = db.prepare('INSERT INTO vendors (id, name, code, region, status) VALUES (?, ?, ?, ?, ?)');
  insertVendor.run('v1', 'Apple Inc.', 'VND-001', 'Domestic', 'Approved');
  insertVendor.run('v2', 'Starbucks', 'VND-002', 'Domestic', 'Approved');
  insertVendor.run('v3', 'AWS Services', 'VND-003', 'International', 'Approved');
  insertVendor.run('v4', 'Uber Technologies', 'VND-004', 'Domestic', 'Approved');
  insertVendor.run('v5', 'Delta Airlines', 'VND-005', 'International', 'Approved');
  insertVendor.run('v6', 'WeWork', 'VND-006', 'Domestic', 'Approved');

  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Insert Claims (报销单)
  const insertClaim = db.prepare('INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step, workflow_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

  // Draft claims
  insertClaim.run('CLM-001', 'u2', 'Q1 Office Supplies', 450.00, 'USD', 'Draft', 0, 'wf-1', daysAgo(0));
  insertClaim.run('CLM-002', 'u3', 'Client Meeting Expenses', 180.50, 'USD', 'Draft', 0, 'wf-1', daysAgo(1));

  // Pending claims (Step 1 - Manager Approval)
  insertClaim.run('CLM-003', 'u4', 'Business Trip to NYC', 1250.00, 'USD', 'Pending', 1, 'wf-1', daysAgo(2));
  insertClaim.run('CLM-004', 'u5', 'Team Building Event', 850.00, 'USD', 'Pending', 1, 'wf-1', daysAgo(1));

  // Pending Finance claims (Step 2)
  insertClaim.run('CLM-005', 'u2', 'Annual Software Licenses', 5000.00, 'USD', 'Pending', 2, 'wf-1', daysAgo(4));
  insertClaim.run('CLM-006', 'u3', 'Conference Travel', 2450.00, 'USD', 'Pending', 2, 'wf-1', daysAgo(3));

  // Processing Payment claims (Step 3)
  insertClaim.run('CLM-007', 'u4', 'Marketing Campaign Materials', 3200.00, 'USD', 'Pending', 3, 'wf-1', daysAgo(5));
  insertClaim.run('CLM-008', 'u5', 'Hardware Upgrade', 4500.00, 'USD', 'Pending', 3, 'wf-1', daysAgo(6));

  // Approved claims (Step 4)
  insertClaim.run('CLM-009', 'u2', 'Employee Onboarding Kit', 680.00, 'USD', 'Approved', 4, 'wf-1', daysAgo(10));
  insertClaim.run('CLM-010', 'u3', 'Remote Work Setup', 350.00, 'USD', 'Approved', 4, 'wf-1', daysAgo(12));
  insertClaim.run('CLM-011', 'u4', 'Q4 Travel Expenses', 2100.00, 'USD', 'Approved', 4, 'wf-1', daysAgo(15));
  insertClaim.run('CLM-012', 'u5', 'Professional Development', 1200.00, 'USD', 'Approved', 4, 'wf-1', daysAgo(18));

  // Rejected claims
  insertClaim.run('CLM-013', 'u2', 'Unapproved Luxury Item', 2500.00, 'USD', 'Rejected', 1, 'wf-1', daysAgo(3));
  insertClaim.run('CLM-014', 'u4', 'Excessive Entertainment', 800.00, 'USD', 'Rejected', 2, 'wf-1', daysAgo(7));

  // Withdrawn claims
  insertClaim.run('CLM-015', 'u3', 'Personal Expense - Error', 150.00, 'USD', 'Draft', 0, 'wf-1', daysAgo(8));

  const insertRequest = db.prepare('INSERT INTO requests (id, claim_id, type, claimant_id, vendor_id, amount, currency, status, description, step, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  // Pending (Step 1)
  insertRequest.run('REQ-1001', 'CLM-001', 'Procurement', 'u2', 'v1', 2499.00, 'USD', 'Pending', 'MacBook Pro M3 Replacement', 1, daysAgo(0));
  insertRequest.run('REQ-1002', 'CLM-002', 'Travel', 'u3', 'v5', 450.00, 'USD', 'Pending', 'Flight to Chicago', 1, daysAgo(1));
  insertRequest.run('REQ-1003', 'CLM-003', 'Entertainment', 'u4', 'v2', 45.50, 'USD', 'Pending', 'Coffee with Client', 1, daysAgo(0));
  
  // Pending Finance (Step 2)
  insertRequest.run('REQ-2001', 'CLM-003', 'Travel', 'u4', 'v5', 1250.00, 'USD', 'Pending Finance', 'Business Trip to NY', 2, daysAgo(2));
  insertRequest.run('REQ-2002', 'CLM-004', 'Entertainment', 'u5', 'v2', 120.50, 'USD', 'Pending Finance', 'Team Lunch', 2, daysAgo(3));
  insertRequest.run('REQ-2003', 'CLM-006', 'Procurement', 'u3', 'v6', 850.00, 'USD', 'Pending Finance', 'Coworking Space Pass', 2, daysAgo(2));

  // Processing Payment (Step 3)
  insertRequest.run('REQ-3001', 'CLM-005', 'Procurement', 'u2', 'v3', 5000.00, 'USD', 'Processing Payment', 'Annual AWS Hosting', 3, daysAgo(4));
  insertRequest.run('REQ-3002', 'CLM-006', 'Entertainment', 'u3', 'v2', 245.80, 'USD', 'Processing Payment', 'Client Dinner - Tech Summit', 3, daysAgo(5));
  insertRequest.run('REQ-3003', 'CLM-008', 'Travel', 'u5', 'v4', 85.00, 'USD', 'Processing Payment', 'Uber to Conference', 3, daysAgo(4));

  // Approved (Step 4)
  insertRequest.run('REQ-4001', 'CLM-011', 'Procurement', 'u4', 'v1', 1200.00, 'USD', 'Approved', 'iPad Pro for Design Team', 4, daysAgo(10));
  insertRequest.run('REQ-4002', 'CLM-012', 'Travel', 'u5', 'v4', 65.20, 'USD', 'Approved', 'Uber to Airport', 4, daysAgo(12));
  insertRequest.run('REQ-4003', 'CLM-009', 'Entertainment', 'u2', 'v2', 35.00, 'USD', 'Approved', 'Team Breakfast', 4, daysAgo(15));

  // Rejected
  insertRequest.run('REQ-5001', 'CLM-013', 'Entertainment', 'u2', null, 800.00, 'USD', 'Rejected', 'Unapproved Client Event', 1, daysAgo(2));
  insertRequest.run('REQ-5002', 'CLM-014', 'Procurement', 'u3', 'v1', 9999.00, 'USD', 'Rejected', 'Excessive Hardware Request', 2, daysAgo(6));

  const insertApproval = db.prepare('INSERT INTO approvals (id, request_id, approver_id, status, step, comments, node_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  // Approvals for REQ-2001 (Step 2 - Manager approved)
  insertApproval.run('a1', 'REQ-2001', 'u1', 'Approved', 1, 'Looks good, approved for travel.', 'node-manager', daysAgo(1));
  
  // Approvals for REQ-2002 (Step 2 - Manager approved)
  insertApproval.run('a2', 'REQ-2002', 'u1', 'Approved', 1, 'Team lunch approved.', 'node-manager', daysAgo(2));

  // Approvals for REQ-2003 (Step 2 - Manager approved)
  insertApproval.run('a3', 'REQ-2003', 'u1', 'Approved', 1, 'Approved for remote work.', 'node-manager', daysAgo(1));

  // Approvals for REQ-3001 (Step 3 - Manager and Finance approved)
  insertApproval.run('a4', 'REQ-3001', 'u1', 'Approved', 1, 'Budget approved.', 'node-manager', daysAgo(3));
  insertApproval.run('a5', 'REQ-3001', 'u1', 'Approved', 2, 'Finance reviewed and approved.', 'node-finance', daysAgo(2));

  // Approvals for REQ-3002 (Step 3 - Manager and Finance approved)
  insertApproval.run('a6', 'REQ-3002', 'u1', 'Approved', 1, 'Client dinner approved.', 'node-manager', daysAgo(4));
  insertApproval.run('a7', 'REQ-3002', 'u1', 'Approved', 2, 'Receipts verified.', 'node-finance', daysAgo(3));

  // Approvals for REQ-3003 (Step 3 - Manager and Finance approved)
  insertApproval.run('a8', 'REQ-3003', 'u1', 'Approved', 1, 'Travel expense approved.', 'node-manager', daysAgo(3));
  insertApproval.run('a9', 'REQ-3003', 'u1', 'Approved', 2, 'Finance verified.', 'node-finance', daysAgo(2));

  // Approvals for REQ-4001 (Step 4 - All approved)
  insertApproval.run('a10', 'REQ-4001', 'u1', 'Approved', 1, 'Design team needs this.', 'node-manager', daysAgo(9));
  insertApproval.run('a11', 'REQ-4001', 'u1', 'Approved', 2, 'Finance approved.', 'node-finance', daysAgo(8));
  insertApproval.run('a12', 'REQ-4001', 'u1', 'Approved', 3, 'Payment processed via ACH.', 'node-payment', daysAgo(7));

  // Approvals for REQ-4002 (Step 4 - All approved)
  insertApproval.run('a13', 'REQ-4002', 'u1', 'Approved', 1, 'Standard travel expense.', 'node-manager', daysAgo(11));
  insertApproval.run('a14', 'REQ-4002', 'u1', 'Approved', 2, 'Finance approved.', 'node-finance', daysAgo(10));
  insertApproval.run('a15', 'REQ-4002', 'u1', 'Approved', 3, 'Paid via corporate card.', 'node-payment', daysAgo(9));

  // Approvals for REQ-4003 (Step 4 - All approved)
  insertApproval.run('a16', 'REQ-4003', 'u1', 'Approved', 1, 'Approved.', 'node-manager', daysAgo(14));
  insertApproval.run('a17', 'REQ-4003', 'u1', 'Approved', 2, 'Finance approved.', 'node-finance', daysAgo(13));
  insertApproval.run('a18', 'REQ-4003', 'u1', 'Approved', 3, 'Paid.', 'node-payment', daysAgo(12));

  // Approvals for REQ-5001 (Rejected at Step 1)
  insertApproval.run('a19', 'REQ-5001', 'u1', 'Rejected', 1, 'This event was not pre-approved. Please provide justification.', 'node-manager', daysAgo(1));

  // Approvals for REQ-5002 (Rejected at Step 2)
  insertApproval.run('a20', 'REQ-5002', 'u1', 'Approved', 1, 'Manager approved, pending finance review.', 'node-manager', daysAgo(5));
  insertApproval.run('a21', 'REQ-5002', 'u1', 'Rejected', 2, 'Exceeds Q3 hardware budget. Please defer to Q4.', 'node-finance', daysAgo(4));

  // Seed Workflows
  const defaultWorkflow = {
    id: 'wf-1',
    name: 'Standard Approval Workflow',
    description: 'Default approval workflow for expense claims',
    entity_type: 'claim',
    is_default: 1,
    is_active: 1,
    nodes: JSON.stringify([
      { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Submit' } },
      { id: 'manager', type: 'approval', position: { x: 300, y: 200 }, data: { label: 'Manager Approval', approverRole: 'Manager' } },
      { id: 'finance', type: 'approval', position: { x: 500, y: 200 }, data: { label: 'Finance Review', approverRole: 'Finance Lead' } },
      { id: 'payment', type: 'action', position: { x: 700, y: 200 }, data: { label: 'Process Payment' } },
      { id: 'end', type: 'end', position: { x: 900, y: 200 }, data: { label: 'Complete' } }
    ]),
    edges: JSON.stringify([
      { id: 'e1-2', source: 'start', target: 'manager' },
      { id: 'e2-3', source: 'manager', target: 'finance' },
      { id: 'e3-4', source: 'finance', target: 'payment' },
      { id: 'e4-5', source: 'payment', target: 'end' }
    ])
  };

  db.prepare(`
    INSERT INTO workflows (id, name, description, entity_type, is_default, is_active, nodes, edges)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    defaultWorkflow.id,
    defaultWorkflow.name,
    defaultWorkflow.description,
    defaultWorkflow.entity_type,
    defaultWorkflow.is_default,
    defaultWorkflow.is_active,
    defaultWorkflow.nodes,
    defaultWorkflow.edges
  );

  // Insert workflow nodes
  const workflowNodes = [
    { id: 'node-start', workflow_id: 'wf-1', node_type: 'start', label: 'Submit', position_x: 100, position_y: 200, approver_role: null },
    { id: 'node-manager', workflow_id: 'wf-1', node_type: 'approval', label: 'Manager Approval', position_x: 300, position_y: 200, approver_role: 'Manager', condition: null },
    { id: 'node-finance', workflow_id: 'wf-1', node_type: 'approval', label: 'Finance Review', position_x: 500, position_y: 200, approver_role: 'Finance Lead', condition: null },
    { id: 'node-payment', workflow_id: 'wf-1', node_type: 'action', label: 'Process Payment', position_x: 700, position_y: 200, approver_role: null },
    { id: 'node-end', workflow_id: 'wf-1', node_type: 'end', label: 'Complete', position_x: 900, position_y: 200, approver_role: null }
  ];

  const insertWorkflowNode = db.prepare(`
    INSERT INTO workflow_nodes (id, workflow_id, node_type, label, position_x, position_y, approver_role, condition)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const node of workflowNodes) {
    insertWorkflowNode.run(node.id, node.workflow_id, node.node_type, node.label, node.position_x, node.position_y, node.approver_role, node.condition);
  }
}
