import path from 'path';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';

const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

const isTurso = process.env.TURSO_DB_URL !== undefined;

let db: any;

if (isTurso) {
  const { createClient } = require('@libsql/client');
  const tursoUrl = process.env.TURSO_DB_URL!;
  const tursoToken = process.env.TURSO_AUTH_TOKEN!;
  
  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken
  });
  
  db = {
    prepare: (sql: string) => ({
      run: async (...params: any[]) => {
        await libsql.execute({ sql, args: params });
      },
      get: async (...params: any[]) => {
        const result = await libsql.execute({ sql, args: params });
        return result.rows[0] || null;
      },
      all: async (...params: any[]) => {
        const result = await libsql.execute({ sql, args: params });
        return result.rows;
      }
    }),
    exec: async (sql: string) => {
      const statements = sql.split(';').filter((s: string) => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          await libsql.execute({ sql: stmt });
        }
      }
    },
    transaction: (fn: () => void) => {
      return {
        run: async (...params: any[]) => {
          await libsql.execute({ sql: 'BEGIN' });
          try {
            fn();
            await libsql.execute({ sql: 'COMMIT' });
          } catch (e) {
            await libsql.execute({ sql: 'ROLLBACK' });
            throw e;
          }
        }
      };
    },
    _client: libsql
  };
  
  console.log('Using Turso database:', tursoUrl);
} else {
  const dbPath = path.resolve(process.cwd(), 'data.db');
  db = new Database(dbPath);
  console.log('Using local SQLite database:', dbPath);
}

export { db };

export function initDb() {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      company_id TEXT,
      avatar TEXT,
      manager_id TEXT,
      job_title TEXT,
      employee_number TEXT UNIQUE,
      hire_date DATE,
      cost_center TEXT,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      parent_id TEXT,
      manager_id TEXT,
      head_count INTEGER DEFAULT 0,
      budget REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approval_levels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level_order INTEGER NOT NULL,
      approver_type TEXT NOT NULL,
      approver_role TEXT,
      approver_department TEXT,
      approver_user_id TEXT,
      condition_type TEXT,
      condition_value REAL,
      workflow_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS hr_sync_log (
      id TEXT PRIMARY KEY,
      sync_type TEXT NOT NULL,
      status TEXT NOT NULL,
      records_processed INTEGER DEFAULT 0,
      records_failed INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
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

    CREATE TABLE IF NOT EXISTS workflow_tasks (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_label TEXT NOT NULL,
      assignee_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      comments TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );
  `;

  if (isTurso) {
    db.exec(createTablesSQL);
  } else {
    db.exec(createTablesSQL);
  }

  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers?.count > 0) {
    return;
  }

  const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const users = [
    { id: 'u9', name: 'Admin User', email: 'admin@example.com', password: hashPassword('admin123'), role: 'Admin', department: 'IT', employee_number: 'ADM001', job_title: 'System Administrator', hire_date: '2020-01-01', cost_center: 'CC005', location: 'San Francisco', manager_id: null },
    { id: 'u2', name: 'Michael Brown', email: 'michael@example.com', password: hashPassword('password123'), role: 'Manager', department: 'Engineering', employee_number: 'EMP002', job_title: 'Engineering Manager', hire_date: '2021-06-01', cost_center: 'CC001', location: 'San Francisco', manager_id: null },
    { id: 'u4', name: 'James Wilson', email: 'james@example.com', password: hashPassword('password123'), role: 'Manager', department: 'Sales', employee_number: 'EMP004', job_title: 'Sales Director', hire_date: '2020-01-10', cost_center: 'CC002', location: 'New York', manager_id: null },
    { id: 'u6', name: 'Robert Taylor', email: 'robert@example.com', password: hashPassword('password123'), role: 'Manager', department: 'Marketing', employee_number: 'EMP006', job_title: 'Marketing Director', hire_date: '2020-09-15', cost_center: 'CC003', location: 'Los Angeles', manager_id: null },
    { id: 'u7', name: 'Alex Johnson', email: 'alex@example.com', password: hashPassword('password123'), role: 'Finance Lead', department: 'Finance', employee_number: 'EMP007', job_title: 'Finance Lead', hire_date: '2021-02-01', cost_center: 'CC004', location: 'San Francisco', manager_id: null },
    { id: 'u1', name: 'David Chen', email: 'david@example.com', password: hashPassword('password123'), role: 'Employee', department: 'Engineering', employee_number: 'EMP001', job_title: 'Software Engineer', hire_date: '2023-01-15', cost_center: 'CC001', location: 'San Francisco', manager_id: 'u2' },
    { id: 'u3', name: 'Sarah Williams', email: 'sarah@example.com', password: hashPassword('password123'), role: 'Employee', department: 'Sales', employee_number: 'EMP003', job_title: 'Sales Representative', hire_date: '2023-03-20', cost_center: 'CC002', location: 'New York', manager_id: 'u4' },
    { id: 'u5', name: 'Emily Davis', email: 'emily@example.com', password: hashPassword('password123'), role: 'Employee', department: 'Marketing', employee_number: 'EMP005', job_title: 'Marketing Specialist', hire_date: '2023-07-01', cost_center: 'CC003', location: 'Los Angeles', manager_id: 'u6' },
    { id: 'u8', name: 'Lisa Anderson', email: 'lisa@example.com', password: hashPassword('password123'), role: 'Employee', department: 'Finance', employee_number: 'EMP008', job_title: 'Accountant', hire_date: '2022-05-15', cost_center: 'CC004', location: 'San Francisco', manager_id: 'u7' },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password, role, department, employee_number, job_title, hire_date, cost_center, location, manager_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const user of users) {
    insertUser.run(
      user.id, user.name, user.email, user.password, user.role, user.department,
      user.employee_number, user.job_title, user.hire_date, user.cost_center, user.location, user.manager_id
    );
  }

  const companies = [
    { id: 'c1', name: 'Acme Corporation', code: 'ACME' },
    { id: 'c2', name: 'TechStart Inc', code: 'TECH' }
  ];

  const insertCompany = db.prepare('INSERT INTO companies (id, name, code) VALUES (?, ?, ?)');
  for (const company of companies) {
    insertCompany.run(company.id, company.name, company.code);
  }

  const vendors = [
    { id: 'v1', name: 'Amazon Web Services', code: 'AWS-001', region: 'US', status: 'Active' },
    { id: 'v2', name: 'Delta Airlines', code: 'DL-001', region: 'US', status: 'Active' },
    { id: 'v3', name: 'Marriott Hotels', code: 'MAR-001', region: 'US', status: 'Active' },
    { id: 'v4', name: 'Uber', code: 'UBER-001', region: 'US', status: 'Active' },
    { id: 'v5', name: 'WeWork', code: 'WW-001', region: 'US', status: 'Active' }
  ];

  const insertVendor = db.prepare('INSERT INTO vendors (id, name, code, region, status) VALUES (?, ?, ?, ?, ?)');
  for (const vendor of vendors) {
    insertVendor.run(vendor.id, vendor.name, vendor.code, vendor.region, vendor.status);
  }

  const claims = [
    { id: 'CLM-2001', claimant_id: 'u1', description: 'Business Trip to NYC', total_amount: 2500.00, currency: 'USD', status: 'Pending', step: 2, created_at: daysAgo(1) },
    { id: 'CLM-2002', claimant_id: 'u1', description: 'Team Lunch Meeting', total_amount: 150.00, currency: 'USD', status: 'Pending', step: 2, created_at: daysAgo(2) },
    { id: 'CLM-2003', claimant_id: 'u1', description: 'Remote Work Allowance', total_amount: 500.00, currency: 'USD', status: 'Pending', step: 2, created_at: daysAgo(1) },
    { id: 'CLM-3001', claimant_id: 'u3', description: 'Client Entertainment', total_amount: 800.00, currency: 'USD', status: 'Pending', step: 3, created_at: daysAgo(3) },
    { id: 'CLM-3002', claimant_id: 'u3', description: 'Q3 Sales Conference', total_amount: 1200.00, currency: 'USD', status: 'Pending', step: 3, created_at: daysAgo(4) },
    { id: 'CLM-3003', claimant_id: 'u3', description: 'Travel Expenses', total_amount: 650.00, currency: 'USD', status: 'Pending', step: 3, created_at: daysAgo(3) },
    { id: 'CLM-4001', claimant_id: 'u5', description: 'Marketing Materials', total_amount: 3500.00, currency: 'USD', status: 'Approved', step: 4, created_at: daysAgo(9) },
    { id: 'CLM-4002', claimant_id: 'u5', description: 'Q2 Business Trip', total_amount: 2800.00, currency: 'USD', status: 'Approved', step: 4, created_at: daysAgo(11) },
    { id: 'CLM-4003', claimant_id: 'u5', description: 'Brand Design Services', total_amount: 5000.00, currency: 'USD', status: 'Approved', step: 4, created_at: daysAgo(14) },
    { id: 'CLM-5001', claimant_id: 'u1', description: 'Unauthorized Purchase', total_amount: 5000.00, currency: 'USD', status: 'Rejected', step: 1, created_at: daysAgo(1) },
    { id: 'CLM-5002', claimant_id: 'u3', description: 'Hardware Upgrade Request', total_amount: 3500.00, currency: 'USD', status: 'Rejected', step: 2, created_at: daysAgo(5) }
  ];

  const insertClaim = db.prepare(`
    INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const claim of claims) {
    insertClaim.run(claim.id, claim.claimant_id, claim.description, claim.total_amount, claim.currency, claim.status, claim.step, claim.created_at, claim.created_at);
  }

  const requests = [
    { id: 'REQ-2001', claim_id: 'CLM-2001', type: 'Travel', claimant_id: 'u1', vendor_id: 'v2', amount: 1200.00, currency: 'USD', status: 'Pending', step: 2, created_at: daysAgo(1) },
    { id: 'REQ-2002', claim_id: 'CLM-2002', type: 'Dinner', claimant_id: 'u1', vendor_id: null, amount: 150.00, currency: 'USD', status: 'Pending', step: 2, created_at: daysAgo(2) },
    { id: 'REQ-2003', claim_id: 'CLM-2003', type: 'Accommodation', claimant_id: 'u1', vendor_id: 'v3', amount: 500.00, currency: 'USD', status: 'Pending', step: 2, created_at: daysAgo(1) },
    { id: 'REQ-3001', claim_id: 'CLM-3001', type: 'Entertainment', claimant_id: 'u3', vendor_id: null, amount: 800.00, currency: 'USD', status: 'Pending', step: 3, created_at: daysAgo(3) },
    { id: 'REQ-3002', claim_id: 'CLM-3002', type: 'Travel', claimant_id: 'u3', vendor_id: 'v2', amount: 1200.00, currency: 'USD', status: 'Pending', step: 3, created_at: daysAgo(4) },
    { id: 'REQ-3003', claim_id: 'CLM-3003', type: 'Transportation', claimant_id: 'u3', vendor_id: 'v4', amount: 650.00, currency: 'USD', status: 'Pending', step: 3, created_at: daysAgo(3) },
    { id: 'REQ-4001', claim_id: 'CLM-4001', type: 'Office Supplies', claimant_id: 'u5', vendor_id: null, amount: 3500.00, currency: 'USD', status: 'Approved', step: 4, created_at: daysAgo(9) },
    { id: 'REQ-4002', claim_id: 'CLM-4002', type: 'Travel', claimant_id: 'u5', vendor_id: 'v2', amount: 2800.00, currency: 'USD', status: 'Approved', step: 4, created_at: daysAgo(11) },
    { id: 'REQ-4003', claim_id: 'CLM-4003', type: 'Other', claimant_id: 'u5', vendor_id: null, amount: 5000.00, currency: 'USD', status: 'Approved', step: 4, created_at: daysAgo(14) },
    { id: 'REQ-5001', claim_id: 'CLM-5001', type: 'Other', claimant_id: 'u1', vendor_id: null, amount: 5000.00, currency: 'USD', status: 'Rejected', step: 1, created_at: daysAgo(1) },
    { id: 'REQ-5002', claim_id: 'CLM-5002', type: 'Office Supplies', claimant_id: 'u3', vendor_id: null, amount: 3500.00, currency: 'USD', status: 'Rejected', step: 2, created_at: daysAgo(5) }
  ];

  const insertRequest = db.prepare(`
    INSERT INTO requests (id, claim_id, type, claimant_id, vendor_id, amount, currency, status, step, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const req of requests) {
    insertRequest.run(req.id, req.claim_id, req.type, req.claimant_id, req.vendor_id, req.amount, req.currency, req.status, req.step, req.created_at, req.created_at);
  }

  const insertApproval = db.prepare('INSERT INTO approvals (id, request_id, approver_id, status, step, comments, node_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  insertApproval.run('a1', 'REQ-2001', 'u1', 'Approved', 1, 'Looks good, approved for travel.', 'node-manager', daysAgo(1));
  insertApproval.run('a2', 'REQ-2002', 'u1', 'Approved', 1, 'Team lunch approved.', 'node-manager', daysAgo(2));
  insertApproval.run('a3', 'REQ-2003', 'u1', 'Approved', 1, 'Approved for remote work.', 'node-manager', daysAgo(1));
  insertApproval.run('a4', 'REQ-3001', 'u1', 'Approved', 1, 'Budget approved.', 'node-manager', daysAgo(3));
  insertApproval.run('a5', 'REQ-3001', 'u1', 'Approved', 2, 'Finance reviewed and approved.', 'node-finance', daysAgo(2));
  insertApproval.run('a6', 'REQ-3002', 'u1', 'Approved', 1, 'Client dinner approved.', 'node-manager', daysAgo(4));
  insertApproval.run('a7', 'REQ-3002', 'u1', 'Approved', 2, 'Receipts verified.', 'node-finance', daysAgo(3));
  insertApproval.run('a8', 'REQ-3003', 'u1', 'Approved', 1, 'Travel expense approved.', 'node-manager', daysAgo(3));
  insertApproval.run('a9', 'REQ-3003', 'u1', 'Approved', 2, 'Finance verified.', 'node-finance', daysAgo(2));
  insertApproval.run('a10', 'REQ-4001', 'u1', 'Approved', 1, 'Design team needs this.', 'node-manager', daysAgo(9));
  insertApproval.run('a11', 'REQ-4001', 'u1', 'Approved', 2, 'Finance approved.', 'node-finance', daysAgo(8));
  insertApproval.run('a12', 'REQ-4001', 'u1', 'Approved', 3, 'Payment processed via ACH.', 'node-payment', daysAgo(7));
  insertApproval.run('a13', 'REQ-4002', 'u1', 'Approved', 1, 'Standard travel expense.', 'node-manager', daysAgo(11));
  insertApproval.run('a14', 'REQ-4002', 'u1', 'Approved', 2, 'Finance approved.', 'node-finance', daysAgo(10));
  insertApproval.run('a15', 'REQ-4002', 'u1', 'Approved', 3, 'Paid via corporate card.', 'node-payment', daysAgo(9));
  insertApproval.run('a16', 'REQ-4003', 'u1', 'Approved', 1, 'Approved.', 'node-manager', daysAgo(14));
  insertApproval.run('a17', 'REQ-4003', 'u1', 'Approved', 2, 'Finance approved.', 'node-finance', daysAgo(13));
  insertApproval.run('a18', 'REQ-4003', 'u1', 'Approved', 3, 'Paid.', 'node-payment', daysAgo(12));
  insertApproval.run('a19', 'REQ-5001', 'u1', 'Rejected', 1, 'This event was not pre-approved. Please provide justification.', 'node-manager', daysAgo(1));
  insertApproval.run('a20', 'REQ-5002', 'u1', 'Approved', 1, 'Manager approved, pending finance review.', 'node-manager', daysAgo(5));
  insertApproval.run('a21', 'REQ-5002', 'u1', 'Rejected', 2, 'Exceeds Q3 hardware budget. Please defer to Q4.', 'node-finance', daysAgo(4));

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

export default db;
