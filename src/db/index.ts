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

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      claimant_id TEXT NOT NULL,
      vendor_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT,
      attachment_url TEXT,
      step INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      status TEXT NOT NULL,
      step INTEGER NOT NULL,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clear existing data to ensure fresh mock data
  db.exec('DELETE FROM approvals');
  db.exec('DELETE FROM requests');
  db.exec('DELETE FROM vendors');
  db.exec('DELETE FROM companies');
  db.exec('DELETE FROM users');

  // Seed data
  const insertUser = db.prepare('INSERT INTO users (id, name, email, role, department, company_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertUser.run('u1', 'Alex Johnson', 'alex@example.com', 'Finance Lead', 'Finance', 'c1', 'AJ');
  insertUser.run('u2', 'Sarah Williams', 'sarah@example.com', 'Employee', 'Marketing', 'c1', 'SW');
  insertUser.run('u3', 'Marcus Chen', 'marcus@example.com', 'Employee', 'Engineering', 'c1', 'MC');
  insertUser.run('u4', 'Elena Rossi', 'elena@example.com', 'Employee', 'Sales Ops', 'c1', 'ER');
  insertUser.run('u5', 'James Wilson', 'james@example.com', 'Employee', 'Engineering', 'c1', 'JW');

  const insertCompany = db.prepare('INSERT INTO companies (id, name, code) VALUES (?, ?, ?)');
  insertCompany.run('c1', 'Global Corp', 'US-01');

  const insertVendor = db.prepare('INSERT INTO vendors (id, name, code, region, status) VALUES (?, ?, ?, ?, ?)');
  insertVendor.run('v1', 'Apple Inc.', 'VND-001', 'Domestic', 'Approved');
  insertVendor.run('v2', 'Starbucks', 'VND-002', 'Domestic', 'Approved');
  insertVendor.run('v3', 'AWS Services', 'VND-003', 'International', 'Approved');
  insertVendor.run('v4', 'Uber Technologies', 'VND-004', 'Domestic', 'Approved');
  insertVendor.run('v5', 'Delta Airlines', 'VND-005', 'International', 'Approved');
  insertVendor.run('v6', 'WeWork', 'VND-006', 'Domestic', 'Approved');

  const insertRequest = db.prepare('INSERT INTO requests (id, type, claimant_id, vendor_id, amount, currency, status, description, step, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  // Helper for dates
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Pending (Step 1)
  insertRequest.run('REQ-1001', 'Procurement', 'u2', 'v1', 2499.00, 'USD', 'Pending', 'MacBook Pro M3 Replacement', 1, daysAgo(0));
  insertRequest.run('REQ-1002', 'Travel', 'u3', 'v5', 450.00, 'USD', 'Pending', 'Flight to Chicago', 1, daysAgo(1));
  insertRequest.run('REQ-1003', 'Entertainment', 'u4', 'v2', 45.50, 'USD', 'Pending', 'Coffee with Client', 1, daysAgo(0));
  
  // Pending Finance (Step 2)
  insertRequest.run('REQ-2001', 'Travel', 'u4', 'v5', 1250.00, 'USD', 'Pending Finance', 'Business Trip to NY', 2, daysAgo(2));
  insertRequest.run('REQ-2002', 'Entertainment', 'u5', 'v2', 120.50, 'USD', 'Pending Finance', 'Team Lunch', 2, daysAgo(3));
  insertRequest.run('REQ-2003', 'Procurement', 'u3', 'v6', 850.00, 'USD', 'Pending Finance', 'Coworking Space Pass', 2, daysAgo(2));

  // Processing Payment (Step 3)
  insertRequest.run('REQ-3001', 'Procurement', 'u2', 'v3', 5000.00, 'USD', 'Processing Payment', 'Annual AWS Hosting', 3, daysAgo(4));
  insertRequest.run('REQ-3002', 'Entertainment', 'u3', 'v2', 245.80, 'USD', 'Processing Payment', 'Client Dinner - Tech Summit', 3, daysAgo(5));
  insertRequest.run('REQ-3003', 'Travel', 'u5', 'v4', 85.00, 'USD', 'Processing Payment', 'Uber to Conference', 3, daysAgo(4));

  // Approved (Step 4)
  insertRequest.run('REQ-4001', 'Procurement', 'u4', 'v1', 1200.00, 'USD', 'Approved', 'iPad Pro for Design Team', 4, daysAgo(10));
  insertRequest.run('REQ-4002', 'Travel', 'u5', 'v4', 65.20, 'USD', 'Approved', 'Uber to Airport', 4, daysAgo(12));
  insertRequest.run('REQ-4003', 'Entertainment', 'u2', 'v2', 35.00, 'USD', 'Approved', 'Team Breakfast', 4, daysAgo(15));

  // Rejected
  insertRequest.run('REQ-5001', 'Entertainment', 'u2', null, 800.00, 'USD', 'Rejected', 'Unapproved Client Event', 1, daysAgo(2));
  insertRequest.run('REQ-5002', 'Procurement', 'u3', 'v1', 9999.00, 'USD', 'Rejected', 'Excessive Hardware Request', 2, daysAgo(6));

  const insertApproval = db.prepare('INSERT INTO approvals (id, request_id, approver_id, status, step, comments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  // Approvals for REQ-2001 (Step 2)
  insertApproval.run('a1', 'REQ-2001', 'u1', 'Approved', 1, 'Looks good, approved for travel.', daysAgo(1));
  
  // Approvals for REQ-2002 (Step 2)
  insertApproval.run('a2', 'REQ-2002', 'u1', 'Approved', 1, 'Team lunch approved.', daysAgo(2));

  // Approvals for REQ-2003 (Step 2)
  insertApproval.run('a3', 'REQ-2003', 'u1', 'Approved', 1, 'Approved for remote work.', daysAgo(1));

  // Approvals for REQ-3001 (Step 3)
  insertApproval.run('a4', 'REQ-3001', 'u1', 'Approved', 1, 'Budget approved.', daysAgo(3));
  insertApproval.run('a5', 'REQ-3001', 'u1', 'Approved', 2, 'Finance reviewed and approved.', daysAgo(2));

  // Approvals for REQ-3002 (Step 3)
  insertApproval.run('a6', 'REQ-3002', 'u1', 'Approved', 1, 'Client dinner approved.', daysAgo(4));
  insertApproval.run('a7', 'REQ-3002', 'u1', 'Approved', 2, 'Receipts verified.', daysAgo(3));

  // Approvals for REQ-3003 (Step 3)
  insertApproval.run('a8', 'REQ-3003', 'u1', 'Approved', 1, 'Travel expense approved.', daysAgo(3));
  insertApproval.run('a9', 'REQ-3003', 'u1', 'Approved', 2, 'Finance verified.', daysAgo(2));

  // Approvals for REQ-4001 (Step 4)
  insertApproval.run('a10', 'REQ-4001', 'u1', 'Approved', 1, 'Design team needs this.', daysAgo(9));
  insertApproval.run('a11', 'REQ-4001', 'u1', 'Approved', 2, 'Finance approved.', daysAgo(8));
  insertApproval.run('a12', 'REQ-4001', 'u1', 'Approved', 3, 'Payment processed via ACH.', daysAgo(7));

  // Approvals for REQ-4002 (Step 4)
  insertApproval.run('a13', 'REQ-4002', 'u1', 'Approved', 1, 'Standard travel expense.', daysAgo(11));
  insertApproval.run('a14', 'REQ-4002', 'u1', 'Approved', 2, 'Finance approved.', daysAgo(10));
  insertApproval.run('a15', 'REQ-4002', 'u1', 'Approved', 3, 'Paid via corporate card.', daysAgo(9));

  // Approvals for REQ-4003 (Step 4)
  insertApproval.run('a16', 'REQ-4003', 'u1', 'Approved', 1, 'Approved.', daysAgo(14));
  insertApproval.run('a17', 'REQ-4003', 'u1', 'Approved', 2, 'Finance approved.', daysAgo(13));
  insertApproval.run('a18', 'REQ-4003', 'u1', 'Approved', 3, 'Paid.', daysAgo(12));

  // Approvals for REQ-5001 (Rejected at Step 1)
  insertApproval.run('a19', 'REQ-5001', 'u1', 'Rejected', 1, 'This event was not pre-approved. Please provide justification.', daysAgo(1));

  // Approvals for REQ-5002 (Rejected at Step 2)
  insertApproval.run('a20', 'REQ-5002', 'u1', 'Approved', 1, 'Manager approved, pending finance review.', daysAgo(5));
  insertApproval.run('a21', 'REQ-5002', 'u1', 'Rejected', 2, 'Exceeds Q3 hardware budget. Please defer to Q4.', daysAgo(4));
}
