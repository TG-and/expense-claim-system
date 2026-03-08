import express from 'express';
import { initDb, db } from '../src/db/index';

const JWT_SECRET = 'claimflow-secret-key-2025';

let app: express.Application;
let server: any;

export async function initTestDb() {
  await initDb();
}

export function getDb() {
  return db;
}

export async function resetTestDb() {
  try {
    db.exec('DELETE FROM approvals');
    db.exec('DELETE FROM requests');
    db.exec('DELETE FROM claims');
    db.exec('DELETE FROM notifications');
    db.exec('DELETE FROM workflow_tasks');
    db.exec('DELETE FROM workflow_history');
    db.exec('DELETE FROM workflow_instances');
  } catch (e) {
    console.log('Tables may not exist yet, skipping reset');
  }
}

export function createTestApp() {
  const testApp = express();
  testApp.use(express.json());

  testApp.use((req, res, next) => {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (user) {
        (req as any).user = user;
      }
    }
    next();
  });

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      req.user = { ...decoded, id: user.id, department: user.department };
      next();
    } catch (error) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
  };

  testApp.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  testApp.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar
      }
    });
  });

  testApp.get("/api/admin/users", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== 'Admin' && req.user.role !== 'Finance Lead') {
      return res.status(403).json({ error: "Access denied" });
    }
    const users = db.prepare('SELECT id, name, email, role, department, avatar FROM users ORDER BY name ASC').all();
    res.json(users);
  });

  testApp.get("/api/requests", (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, u.name as claimant_name, u.department, u.avatar, v.name as vendor_name
      FROM requests r
      JOIN users u ON r.claimant_id = u.id
      LEFT JOIN vendors v ON r.vendor_id = v.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  });

  testApp.get("/api/requests/:id", (req, res) => {
    const request = db.prepare(`
      SELECT r.*, u.name as claimant_name, u.department, u.avatar, v.name as vendor_name
      FROM requests r
      JOIN users u ON r.claimant_id = u.id
      LEFT JOIN vendors v ON r.vendor_id = v.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const approvals = db.prepare(`
      SELECT a.*, u.name as approver_name, u.avatar
      FROM approvals a
      JOIN users u ON a.approver_id = u.id
      WHERE a.request_id = ?
      ORDER BY a.step ASC
    `).all(req.params.id);

    res.json({ ...request, approvals });
  });

  testApp.get("/api/claims", (req, res) => {
    const user = (req as any).user;
    let claims;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = user.userId || user.id;
    
    if (user.role === 'Employee') {
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.claimant_id = ?
        ORDER BY c.created_at DESC
      `).all(userId);
    } else if (user.role === 'Manager') {
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE u.department = ? OR c.claimant_id = ?
        ORDER BY c.created_at DESC
      `).all(user.department, userId);
    } else {
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        ORDER BY c.created_at DESC
      `).all();
    }
    
    const claimsWithItems = claims.map((claim: any) => {
      const items = db.prepare(`
        SELECT r.*, v.name as vendor_name
        FROM requests r
        LEFT JOIN vendors v ON r.vendor_id = v.id
        WHERE r.claim_id = ?
      `).all(claim.id);
      return { ...claim, items };
    });
    
    res.json(claimsWithItems);
  });

  testApp.get("/api/claims/:id", (req, res) => {
    const claim = db.prepare(`
      SELECT c.*, u.name as claimant_name, u.department, u.avatar
      FROM claims c
      JOIN users u ON c.claimant_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const items = db.prepare(`
      SELECT r.*, v.name as vendor_name
      FROM requests r
      LEFT JOIN vendors v ON r.vendor_id = v.id
      WHERE r.claim_id = ?
    `).all(req.params.id);

    const approvals = db.prepare(`
      SELECT a.*, u.name as approver_name, u.avatar
      FROM approvals a
      JOIN users u ON a.approver_id = u.id
      WHERE a.request_id IN (SELECT id FROM requests WHERE claim_id = ?)
      ORDER BY a.step ASC
    `).all(req.params.id);

    res.json({ ...claim, items, approvals });
  });

  testApp.post("/api/claims", (req, res) => {
    const { description, claimant_id, items } = req.body;
    const claimId = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(500).json({ error: "Failed to create claim" });
    }
    
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0);
    const currency = items[0]?.currency || 'USD';
    
    try {
      db.transaction(() => {
        db.prepare(`
          INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
          VALUES (?, ?, ?, ?, ?, 'Pending', 1)
        `).run(claimId, claimant_id, description, totalAmount, currency);

        for (const item of items) {
          const requestId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
          db.prepare(`
            INSERT INTO requests (id, claim_id, type, claimant_id, vendor_id, amount, currency, status, description, step)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, 1)
          `).run(requestId, claimId, item.type, claimant_id, item.vendor_id, item.amount, item.currency, item.description);
        }
      })();
      
      res.status(201).json({ id: claimId, status: 'Pending', totalAmount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create claim" });
    }
  });

  testApp.post("/api/claims/:id/approve", (req, res) => {
    const claimId = req.params.id;
    const user = (req as any).user;
    const { comments } = req.body;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const claim = db.prepare('SELECT status, step, claimant_id FROM claims WHERE id = ?').get(claimId) as { status: string; step: number; claimant_id: string };
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      
      const canApprove = 
        user.role === 'Manager' && claim.step === 1 ||
        (user.role === 'Finance' || user.role === 'Finance Lead') && claim.step === 2 ||
        user.role === 'Admin';
      
      if (!canApprove) {
        return res.status(403).json({ error: "You don't have permission to approve at this step" });
      }
      
      if (claim.status !== 'Pending' && claim.status !== 'Pending Finance') {
        return res.status(400).json({ error: "Can only approve pending claims" });
      }

      let newStatus = claim.status;
      let newStep = claim.step;

      if (claim.status === 'Pending') {
        newStatus = 'Pending Finance';
        newStep = 2;
      } else if (claim.status === 'Pending Finance') {
        newStatus = 'Approved';
        newStep = 4;
      }

      db.transaction(() => {
        db.prepare('UPDATE claims SET status = ?, step = ? WHERE id = ?').run(newStatus, newStep, claimId);
        
        const items = db.prepare('SELECT id FROM requests WHERE claim_id = ?').all(claimId) as { id: string }[];
        for (const item of items) {
          db.prepare(`
            INSERT INTO approvals (id, request_id, approver_id, status, step, comments)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(`APR-${Math.floor(1000 + Math.random() * 9000)}`, item.id, user.userId, 'Approved', newStep - 1, comments || null);
          
          db.prepare('UPDATE requests SET status = ?, step = ? WHERE id = ?').run(newStatus, newStep, item.id);
        }
      })();
      
      res.json({ success: true, status: newStatus });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to approve claim" });
    }
  });

  testApp.post("/api/claims/:id/reject", (req, res) => {
    const claimId = req.params.id;
    const user = (req as any).user;
    const { comments } = req.body;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const claim = db.prepare('SELECT status, step FROM claims WHERE id = ?').get(claimId) as { status: string; step: number };
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      
      const canApprove = 
        user.role === 'Manager' && claim.step === 1 ||
        (user.role === 'Finance' || user.role === 'Finance Lead') && claim.step === 2 ||
        user.role === 'Admin';
      
      if (!canApprove) {
        return res.status(403).json({ error: "You don't have permission to reject at this step" });
      }
      
      if (claim.status !== 'Pending' && claim.status !== 'Pending Finance') {
        return res.status(400).json({ error: "Can only reject pending claims" });
      }

      db.transaction(() => {
        db.prepare('UPDATE claims SET status = ? WHERE id = ?').run('Rejected', claimId);
        
        const items = db.prepare('SELECT id FROM requests WHERE claim_id = ?').all(claimId) as { id: string }[];
        for (const item of items) {
          db.prepare(`
            INSERT INTO approvals (id, request_id, approver_id, status, step, comments)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(`APR-${Math.floor(1000 + Math.random() * 9000)}`, item.id, user.userId, 'Rejected', 99, comments || 'Rejected');
          
          db.prepare('UPDATE requests SET status = ? WHERE id = ?').run('Rejected', item.id);
        }
      })();
      
      res.json({ success: true, status: 'Rejected' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to reject claim" });
    }
  });

  testApp.get("/api/approvals", (req, res) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    let claims;
    
    if (user.role === 'Employee') {
      claims = [];
    } else if (user.role === 'Manager') {
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.status = 'Pending' AND u.department = ?
        ORDER BY c.created_at DESC
      `).all(user.department);
    } else if (user.role === 'Finance' || user.role === 'Finance Lead') {
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.status = 'Pending Finance'
        ORDER BY c.created_at DESC
      `).all();
    } else {
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.status IN ('Pending', 'Pending Finance')
        ORDER BY c.created_at DESC
      `).all();
    }
    
    const claimsWithItems = claims.map((claim: any) => {
      const items = db.prepare(`
        SELECT r.*, v.name as vendor_name
        FROM requests r
        LEFT JOIN vendors v ON r.vendor_id = v.id
        WHERE r.claim_id = ?
      `).all(claim.id);
      return { ...claim, items };
    });
    
    res.json(claimsWithItems);
  });

  testApp.get("/api/search", (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    
    const results = db.prepare(`
      SELECT r.*, u.name as claimant_name, v.name as vendor_name
      FROM requests r
      JOIN users u ON r.claimant_id = u.id
      LEFT JOIN vendors v ON r.vendor_id = v.id
      WHERE r.id LIKE ? OR r.description LIKE ? OR u.name LIKE ? OR v.name LIKE ?
      LIMIT 5
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    
    res.json(results);
  });

  testApp.get("/api/notifications", authenticateToken, (req: any, res: any) => {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(req.user.userId);
    res.json(notifications);
  });

  testApp.get("/api/notifications/unread-count", authenticateToken, (req: any, res: any) => {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `).get(req.user.userId) as { count: number };
    res.json({ count: result.count });
  });

  testApp.post("/api/notifications/:id/read", authenticateToken, (req: any, res: any) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.userId);
    res.json({ success: true });
  });

  testApp.post("/api/notifications/read-all", authenticateToken, (req: any, res: any) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
      .run(req.user.userId);
    res.json({ success: true });
  });

  testApp.get("/api/workflow/approval-path", authenticateToken, (req: any, res: any) => {
    const claimantId = req.query.claimant_id as string;
    const amount = parseFloat(req.query.amount as string) || 0;

    const claimant = db.prepare('SELECT * FROM users WHERE id = ?').get(claimantId) as any;
    if (!claimant) {
      return res.status(404).json({ error: "User not found" });
    }

    const approvers: any[] = [];
    
    if (amount > 5000) {
      approvers.push({ level: 1, type: 'Manager Approval', approver: { id: 'u6', name: 'Michael Brown', role: 'Manager' } });
      approvers.push({ level: 2, type: 'Finance Review', approver: { id: 'u1', name: 'Alex Johnson', role: 'Finance Lead' } });
      approvers.push({ level: 3, type: 'Finance Director', approver: { id: 'u1', name: 'Alex Johnson', role: 'Finance Lead' } });
    } else if (amount > 1000) {
      approvers.push({ level: 1, type: 'Manager Approval', approver: { id: 'u6', name: 'Michael Brown', role: 'Manager' } });
      approvers.push({ level: 2, type: 'Finance Review', approver: { id: 'u1', name: 'Alex Johnson', role: 'Finance Lead' } });
    } else {
      approvers.push({ level: 1, type: 'Manager Approval', approver: { id: 'u6', name: 'Michael Brown', role: 'Manager' } });
    }

    res.json({ approvers, workflow: { id: 'wf-1', name: 'Standard Approval Workflow' } });
  });

  return testApp;
}

export { JWT_SECRET };
