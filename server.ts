import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import { initDatabase, initDb, getDb, isTurso } from "./src/db/index";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = "claimflow-secret-key-2025";

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

let dbInstance: any;
let app: express.Application;

let dbInitialized = false;

async function getDbInstance(forceInit = false) {
  if (!dbInstance || forceInit || !dbInitialized) {
    console.log('Initializing database...');
    try {
      dbInstance = await initDatabase();
      console.log('Running initDb...');
      await initDb();
      dbInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }
  return dbInstance;
}

function createApp() {
  app = express();
  app.use(cors());
  app.use(express.json());

  app.use(async (req, res, next) => {
    const db = await getDbInstance();
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (user) {
        (req as any).user = user;
      }
    }
    next();
  });

  app.get("/api/health", async (req, res) => {
    const db = await getDbInstance();
    res.json({ status: "ok", timestamp: new Date().toISOString(), isTurso: isTurso() });
  });

  app.get("/api/debug/db", async (req, res) => {
    const db = await getDbInstance();
    try {
      const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
      const claimCount = await db.prepare('SELECT COUNT(*) as count FROM claims').get() as any;
      res.json({ 
        users: userCount?.count || 0, 
        claims: claimCount?.count || 0,
        isTurso: isTurso()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/debug/reseed", async (req, res) => {
    try {
      // Force reinitialize database
      dbInstance = null;
      await getDbInstance(true);
      console.log('Database reseeded successfully');
      res.json({ success: true, message: "Database reseeded successfully" });
    } catch (error: any) {
      console.error('Reseed error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const db = await getDbInstance();
    console.log('Login attempt:', req.body.email);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      if (!bcrypt.compareSync(password, user.password)) {
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
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    res.json({ success: true });
  });

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = user;
      next();
    });
  };

  app.get("/api/auth/me", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const user = await db.prepare('SELECT id, name, email, role, department, avatar FROM users WHERE id = ?').get(req.user.userId) as any;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });

  app.put("/api/auth/profile", async (req, res) => {
    const db = await getDbInstance();
    const userId = req.headers['x-user-id'] as string;
    const { name } = req.body;
    if (name) {
      await db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
    }
    const user = await db.prepare('SELECT id, name, email, role, department, avatar FROM users WHERE id = ?').get(userId) as any;
    res.json(user);
  });

  app.post("/api/auth/avatar", async (req, res) => {
    const db = await getDbInstance();
    const userId = req.headers['x-user-id'] as string;
    const { avatar } = req.body;
    if (avatar) {
      await db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId);
    }
    const user = await db.prepare('SELECT id, name, email, role, department, avatar FROM users WHERE id = ?').get(userId) as any;
    res.json(user);
  });

  app.get("/api/requests", async (req, res) => {
    const db = await getDbInstance();
    const requests = await db.prepare(`
      SELECT r.*, c.description as claim_description, c.total_amount as claim_amount
      FROM requests r
      LEFT JOIN claims c ON r.claim_id = c.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  });

  app.get("/api/requests/:id", async (req, res) => {
    const db = await getDbInstance();
    const request = await db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id) as any;
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    const approvals = await db.prepare(`
      SELECT a.*, u.name as approver_name
      FROM approvals a
      LEFT JOIN users u ON a.approver_id = u.id
      WHERE a.request_id = ?
      ORDER BY a.step ASC
    `).all(req.params.id);

    res.json({ ...request, approvals });
  });

  app.post("/api/requests", async (req, res) => {
    const db = await getDbInstance();
    const { type, claimant_id, vendor_id, amount, currency, description, attachment_url } = req.body;
    const id = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      await db.prepare(`
        INSERT INTO requests (id, type, claimant_id, vendor_id, amount, currency, status, description, attachment_url, step)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 1)
      `).run(id, type, claimant_id, vendor_id, amount, currency, description, attachment_url || null);
      
      res.status(201).json({ id, status: 'Pending' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  app.post("/api/requests/:id/approve", async (req, res) => {
    const db = await getDbInstance();
    const requestId = req.params.id;
    const { comments } = req.body;
    
    const request = await db.prepare('SELECT step, workflow_id, current_node_id, claim_id FROM requests WHERE id = ?').get(requestId) as { step: number; workflow_id: string | null; current_node_id: string | null; claim_id: string | null } | undefined;
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const approvalId = `a${Math.floor(Math.random() * 10000)}`;
    const nextStep = request.step + 1;
    let newStatus = 'Pending';
    let nextNodeId = null;

    if (request.workflow_id) {
      const workflow = await db.prepare('SELECT nodes, edges FROM workflows WHERE id = ?').get(request.workflow_id) as { nodes: string; edges: string } | undefined;
      if (workflow) {
        const nodes = JSON.parse(workflow.nodes);
        const currentNode = nodes.find((n: any) => n.id === request.current_node_id);
        const edges = JSON.parse(workflow.edges);
        const nextEdge = edges.find((e: any) => e.source === currentNode?.id);
        const nextNode = nodes.find((n: any) => n.id === nextEdge?.target);
        nextNodeId = nextNode?.id || null;
        newStatus = nextNode?.id === 'node-end' ? 'Approved' : 'Pending';
      }
    } else {
      newStatus = nextStep > 3 ? 'Approved' : (nextStep === 2 ? 'Pending Finance' : 'Processing Payment');
    }
    
    await db.prepare(`
      INSERT INTO approvals (id, request_id, approver_id, status, step, comments, node_id)
      VALUES (?, ?, ?, 'Approved', ?, ?, ?)
    `).run(approvalId, requestId, 'u1', request.step, comments || '', request.current_node_id || '');

    await db.prepare('UPDATE requests SET step = ?, status = ?, current_node_id = ? WHERE id = ?').run(nextStep, newStatus, nextNodeId, requestId);

    if (request.claim_id) {
      const claimStatus = newStatus === 'Approved' ? 'Approved' : newStatus;
      await db.prepare('UPDATE claims SET step = ?, status = ? WHERE id = ?').run(nextStep, claimStatus, request.claim_id);

      const instance = await db.prepare('SELECT id FROM workflow_instances WHERE entity_id = ? AND status = ?').get(request.claim_id, 'running') as { id: string } | undefined;
      if (instance) {
        if (newStatus === 'Approved' && nextStep === 99) {
          await db.prepare('UPDATE workflow_instances SET current_node_id = ?, status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextNodeId, 'completed', instance.id);
        } else {
          await db.prepare('UPDATE workflow_instances SET current_node_id = ? WHERE id = ?').run(nextNodeId, instance.id);
        }
      }
    }

    res.json({ success: true, status: newStatus });
  });

  app.post("/api/requests/:id/reject", async (req, res) => {
    const db = await getDbInstance();
    const requestId = req.params.id;
    const { comments } = req.body;
    
    const request = await db.prepare('SELECT step, workflow_id, current_node_id, claim_id FROM requests WHERE id = ?').get(requestId) as { step: number; workflow_id: string | null; current_node_id: string | null; claim_id: string | null } | undefined;
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const approvalId = `a${Math.floor(Math.random() * 10000)}`;
    
    await db.prepare(`
      INSERT INTO approvals (id, request_id, approver_id, status, step, comments, node_id)
      VALUES (?, ?, ?, 'Rejected', ?, ?, ?)
    `).run(approvalId, requestId, 'u1', request.step, comments || '', request.current_node_id || '');

    await db.prepare('UPDATE requests SET status = ? WHERE id = ?').run('Rejected', requestId);

    if (request.claim_id) {
      await db.prepare('UPDATE claims SET status = ? WHERE id = ?').run('Rejected', request.claim_id);

      const instance = await db.prepare('SELECT id FROM workflow_instances WHERE entity_id = ? AND status = ?').get(request.claim_id, 'running') as { id: string } | undefined;
      if (instance) {
        await db.prepare('UPDATE workflow_instances SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('rejected', instance.id);
      }
    }

    res.json({ success: true, status: 'Rejected' });
  });

  app.get("/api/search", async (req, res) => {
    const db = await getDbInstance();
    const { q, type } = req.query;
    
    if (!q) {
      return res.json({ claims: [], requests: [], users: [] });
    }

    let claims: any[] = [];
    let requests: any[] = [];
    let users: any[] = [];

    if (!type || type === 'claims') {
      claims = await db.prepare('SELECT * FROM claims WHERE description LIKE ? OR id LIKE ?').all(`%${q}%`, `%${q}%`);
    }
    if (!type || type === 'requests') {
      requests = await db.prepare('SELECT * FROM requests WHERE description LIKE ? OR id LIKE ?').all(`%${q}%`, `%${q}%`);
    }
    if (!type || type === 'users') {
      users = await db.prepare('SELECT id, name, email, role, department FROM users WHERE name LIKE ? OR email LIKE ?').all(`%${q}%`, `%${q}%`);
    }

    res.json({ claims, requests, users });
  });

  app.get("/api/vendors", async (req, res) => {
    const db = await getDbInstance();
    const vendors = await db.prepare('SELECT * FROM vendors').all();
    res.json(vendors);
  });

  app.get("/api/admin/users", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: "Admin only" });
    }
    const users = await db.prepare('SELECT id, name, email, role, department, is_active FROM users').all();
    res.json(users);
  });

  app.get("/api/users", async (req, res) => {
    const db = await getDbInstance();
    const users = await db.prepare('SELECT id, name, email, role, department, avatar FROM users').all();
    res.json(users);
  });

  app.get("/api/claims", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    let claims: any[];
    const { status, my } = req.query;

    if (my === 'true') {
      claims = await db.prepare('SELECT * FROM claims WHERE claimant_id = ? ORDER BY created_at DESC').all(req.user.userId);
    } else if (status) {
      claims = await db.prepare('SELECT * FROM claims WHERE status = ? ORDER BY created_at DESC').all(status);
    } else {
      claims = await db.prepare('SELECT * FROM claims ORDER BY created_at DESC').all();
    }
    res.json(claims);
  });

  app.get("/api/approvals", async (req, res) => {
    const db = await getDbInstance();
    const { request_id } = req.query;
    let approvals: any[];

    if (request_id) {
      approvals = await db.prepare('SELECT * FROM approvals WHERE request_id = ? ORDER BY created_at DESC').all(request_id);
    } else {
      approvals = await db.prepare(`
        SELECT a.*, r.type as request_type, r.amount as request_amount, u.name as claimant_name
        FROM approvals a
        LEFT JOIN requests r ON a.request_id = r.id
        LEFT JOIN users u ON r.claimant_id = u.id
        ORDER BY a.created_at DESC
      `).all();
    }
    res.json(approvals);
  });

  app.get("/api/claims/:id", async (req, res) => {
    const db = await getDbInstance();
    const claim = await db.prepare('SELECT c.*, u.name as claimant_name, u.department as claimant_department FROM claims c LEFT JOIN users u ON c.claimant_id = u.id WHERE c.id = ?').get(req.params.id) as any;
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    const items = await db.prepare('SELECT * FROM requests WHERE claim_id = ? ORDER BY created_at').all(req.params.id);
    const approvals = await db.prepare(`
      SELECT a.*, u.name as approver_name
      FROM approvals a
      LEFT JOIN users u ON a.approver_id = u.id
      WHERE a.request_id IN (SELECT id FROM requests WHERE claim_id = ?)
      ORDER BY a.created_at
    `).all(req.params.id);
    res.json({ ...claim, items, approvals });
  });

  app.post("/api/claims", async (req, res) => {
    const db = await getDbInstance();
    const { claimant_id, description, items } = req.body;
    const claimId = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0);

    await db.prepare(`
      INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step)
      VALUES (?, ?, ?, ?, 'USD', 'Draft', 0)
    `).run(claimId, claimant_id, description, totalAmount);

    for (const item of items) {
      const itemId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.prepare(`
        INSERT INTO requests (id, claim_id, type, claimant_id, vendor_id, amount, currency, status, description, step)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?, 0)
      `).run(itemId, claimId, item.type, claimant_id, item.vendor_id, item.amount, item.currency || 'USD', item.description);
    }

    res.status(201).json({ id: claimId, status: 'Draft' });
  });

  app.post("/api/claims/:id/submit", async (req, res) => {
    const db = await getDbInstance();
    const claimId = req.params.id;
    const claim = await db.prepare('SELECT status FROM claims WHERE id = ?').get(claimId) as { status: string } | undefined;

    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    if (claim.status !== 'Draft') {
      return res.status(400).json({ error: "Only draft claims can be submitted" });
    }

    await db.prepare("UPDATE requests SET status = 'Pending', step = 1 WHERE claim_id = ?").run(claimId);
    await db.prepare("UPDATE claims SET status = 'Pending', step = 1 WHERE id = ?").run(claimId);

    res.json({ success: true, status: 'Pending' });
  });

  app.post("/api/claims/:id/withdraw", async (req, res) => {
    const db = await getDbInstance();
    const claimId = req.params.id;
    const claim = await db.prepare('SELECT status FROM claims WHERE id = ?').get(claimId) as { status: string } | undefined;

    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    if (claim.status !== 'Pending' && claim.status !== 'Pending Finance') {
      return res.status(400).json({ error: "Can only withdraw pending claims" });
    }

    await db.prepare('UPDATE requests SET status = ? WHERE claim_id = ?').run('Draft', claimId);
    await db.prepare('UPDATE claims SET status = ?, step = 0 WHERE id = ?').run('Draft', claimId);

    res.json({ success: true, status: 'Draft' });
  });

  app.delete("/api/claims/:id", async (req, res) => {
    const db = await getDbInstance();
    const claimId = req.params.id;
    const claim = await db.prepare('SELECT status FROM claims WHERE id = ?').get(claimId) as { status: string } | undefined;

    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    if (claim.status !== 'Draft') {
      return res.status(400).json({ error: "Can only delete draft claims" });
    }

    await db.prepare('DELETE FROM requests WHERE claim_id = ?').run(claimId);
    await db.prepare('DELETE FROM claims WHERE id = ?').run(claimId);

    res.json({ success: true });
  });

  app.post("/api/claims/:id/approve", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const claimId = req.params.id;
    const { newStatus, newStep, comments } = req.body;

    const claim = await db.prepare('SELECT status, step, claimant_id FROM claims WHERE id = ?').get(claimId) as { status: string; step: number; claimant_id: string } | undefined;
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    await db.prepare('UPDATE claims SET status = ?, step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, newStep, claimId);
    
    const items = await db.prepare('SELECT id FROM requests WHERE claim_id = ?').all(claimId) as { id: string }[];
    for (const item of items) {
      await db.prepare(`
        INSERT INTO approvals (id, request_id, approver_id, status, step, comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`a${Math.floor(Math.random() * 10000)}`, item.id, req.user.userId, newStatus, newStep, comments || '');
      
      await db.prepare('UPDATE requests SET status = ?, step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, newStep, item.id);
    }

    res.json({ success: true });
  });

  app.post("/api/claims/:id/reject", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const claimId = req.params.id;
    const { comments } = req.body;

    const claim = await db.prepare('SELECT status, step FROM claims WHERE id = ?').get(claimId) as { status: string; step: number } | undefined;
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    await db.prepare('UPDATE claims SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Rejected', claimId);
    
    const items = await db.prepare('SELECT id FROM requests WHERE claim_id = ?').all(claimId) as { id: string }[];
    for (const item of items) {
      await db.prepare(`
        INSERT INTO approvals (id, request_id, approver_id, status, step, comments)
        VALUES (?, ?, ?, 'Rejected', ?, ?)
      `).run(`a${Math.floor(Math.random() * 10000)}`, item.id, req.user.userId, claim.step, comments || '');

      await db.prepare('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Rejected', item.id);
    }

    res.json({ success: true });
  });

  app.post("/api/claims/:id/update-status", async (req, res) => {
    const db = await getDbInstance();
    const claim_id = req.params.id;
    const { status, step } = req.body;

    const claim = await db.prepare('SELECT status FROM claims WHERE id = ?').get(claim_id) as { status: string } | undefined;
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    await db.prepare('UPDATE claims SET status = ?, step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, step, claim_id);
    const items = await db.prepare('SELECT id FROM requests WHERE claim_id = ?').all(claim_id) as { id: string }[];
    for (const item of items) {
      await db.prepare('UPDATE requests SET status = ?, step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, step, item.id);
    }

    res.json({ success: true });
  });

  app.post("/api/upload", upload.single('file'), async (req, res) => {
    const db = await getDbInstance();
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.post("/api/payments/callback", async (req, res) => {
    const db = await getDbInstance();
    const { claim_id, status, transaction_id } = req.body;
    console.log('Payment callback:', { claim_id, status, transaction_id });

    if (status === 'success') {
      await db.prepare('UPDATE claims SET status = ? WHERE id = ?').run('Paid', claim_id);
      await db.prepare('UPDATE requests SET status = ? WHERE claim_id = ?').run('Paid', claim_id);
    }

    res.json({ success: true });
  });

  app.get("/api/workflows", async (req, res) => {
    const db = await getDbInstance();
    const workflows = await db.prepare('SELECT * FROM workflows').all();
    res.json(workflows);
  });

  app.get("/api/workflows/:id", async (req, res) => {
    const db = await getDbInstance();
    const workflow = await db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    res.json(workflow);
  });

  app.post("/api/workflows", async (req, res) => {
    const db = await getDbInstance();
    const { name, description, entity_type, nodes, edges, is_default } = req.body;
    const id = `wf-${Math.floor(1000 + Math.random() * 9000)}`;

    if (is_default) {
      await db.prepare('UPDATE workflows SET is_default = 0 WHERE entity_type = ?').run(entity_type);
    }

    await db.prepare(`
      INSERT INTO workflows (id, name, description, entity_type, is_default, is_active, nodes, edges)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, description, entity_type, is_default ? 1 : 0, JSON.stringify(nodes), JSON.stringify(edges));

    for (const node of nodes) {
      await db.prepare(`
        INSERT INTO workflow_nodes (id, workflow_id, node_type, label, position_x, position_y, approver_role, condition)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`${id}-${node.id}`, id, node.type, node.data.label, node.position.x, node.position.y, node.data.approverRole || null, node.data.condition || null);
    }

    res.status(201).json({ id });
  });

  app.put("/api/workflows/:id", async (req, res) => {
    const db = await getDbInstance();
    const workflowId = req.params.id;
    const { name, description, nodes, edges, is_default } = req.body;

    if (is_default) {
      await db.prepare('UPDATE workflows SET is_default = 0 WHERE entity_type = (SELECT entity_type FROM workflows WHERE id = ?)').run(workflowId);
    }

    await db.prepare(`
      UPDATE workflows SET name = ?, description = ?, is_default = ?, nodes = ?, edges = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, is_default ? 1 : 0, JSON.stringify(nodes), JSON.stringify(edges), workflowId);

    await db.prepare('DELETE FROM workflow_nodes WHERE workflow_id = ?').run(workflowId);

    for (const node of nodes) {
      await db.prepare(`
        INSERT INTO workflow_nodes (id, workflow_id, node_type, label, position_x, position_y, approver_role, condition)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`${workflowId}-${node.id}`, workflowId, node.type, node.data.label, node.position.x, node.position.y, node.data.approverRole || null, node.data.condition || null);
    }

    res.json({ success: true });
  });

  app.delete("/api/workflows/:id", async (req, res) => {
    const db = await getDbInstance();
    const workflowId = req.params.id;

    const workflow = await db.prepare('SELECT is_default FROM workflows WHERE id = ?').get(workflowId) as { is_default: number } | undefined;
    if (workflow?.is_default) {
      return res.status(400).json({ error: "Cannot delete default workflow" });
    }

    await db.prepare('DELETE FROM workflow_nodes WHERE workflow_id = ?').run(workflowId);
    await db.prepare('DELETE FROM workflows WHERE id = ?').run(workflowId);

    res.json({ success: true });
  });

  app.get("/api/workflows/:id/nodes", async (req, res) => {
    const db = await getDbInstance();
    const nodes = await db.prepare('SELECT * FROM workflow_nodes WHERE workflow_id = ?').all(req.params.id);
    res.json(nodes);
  });

  app.get("/api/workflow/todos", async (req, res) => {
    const db = await getDbInstance();
    const pendingRequests = await db.prepare(`
      SELECT r.*, c.description as claim_description
      FROM requests r
      LEFT JOIN claims c ON r.claim_id = c.id
      WHERE r.status = 'Pending'
      ORDER BY r.created_at ASC
    `).all();
    res.json(pendingRequests);
  });

  app.get("/api/workflow/instance/:entityType/:entityId", async (req, res) => {
    const db = await getDbInstance();
    const { entityType, entityId } = req.params;
    
    const instance = await db.prepare('SELECT * FROM workflow_instances WHERE entity_type = ? AND entity_id = ?').get(entityType, entityId);
    if (!instance) {
      return res.status(404).json({ error: "Workflow instance not found" });
    }
    res.json(instance);
  });

  app.get("/api/workflows/:id/bpmn", async (req, res) => {
    const db = await getDbInstance();
    const workflow = await db.prepare('SELECT nodes, edges FROM workflows WHERE id = ?').get(req.params.id) as { nodes: string; edges: string } | undefined;
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    res.json({ nodes: JSON.parse(workflow.nodes), edges: JSON.parse(workflow.edges) });
  });

  app.post("/api/workflows/:id/deploy", async (req, res) => {
    const db = await getDbInstance();
    const workflowId = req.params.id;
    const { entity_id, entity_type } = req.body;

    await db.prepare(`
      INSERT INTO workflow_instances (id, workflow_id, entity_type, entity_id, current_node_id, status)
      VALUES (?, ?, ?, ?, 'start', 'running')
    `).run(`inst-${Math.floor(Math.random() * 10000)}`, workflowId, entity_type, entity_id);

    res.json({ success: true });
  });

  app.get("/api/notifications", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(req.user.userId);
    res.json(notifications);
  });

  app.get("/api/notifications/unread-count", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const result = await db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.userId) as any;
    res.json({ count: result?.count || 0 });
  });

  app.post("/api/notifications/:id/read", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.userId);
    res.json({ success: true });
  });

  app.post("/api/notifications/read-all", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.userId);
    res.json({ success: true });
  });

  app.get("/api/org-chart", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const orgChart = await db.prepare(`
      SELECT id, name, email, role, department, manager_id, job_title
      FROM users
      WHERE is_active = 1
      ORDER BY department, name
    `).all();
    res.json(orgChart);
  });

  app.get("/api/users/:id/approvers", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const userId = req.params.id;

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const approvers: any[] = [];
    if (user.manager_id) {
      const manager = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.manager_id) as any;
      if (manager) {
        approvers.push(manager);
      }
    }

    const roleApprovers = await db.prepare("SELECT * FROM users WHERE role IN ('Manager', 'Finance Lead', 'Admin') AND is_active = 1").all();
    approvers.push(...roleApprovers);

    res.json(approvers);
  });

  app.post("/api/hr/sync", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: "Admin only" });
    }

    const syncId = `sync-${Date.now()}`;
    const mockUsers = [
      { id: `hr-${Math.floor(Math.random() * 1000)}`, name: 'New HR User', email: `hr${Math.floor(Math.random() * 1000)}@example.com`, role: 'Employee', department: 'HR' }
    ];

    await db.prepare(`
      INSERT INTO hr_sync_log (id, sync_type, status, records_processed, records_failed, created_at)
      VALUES (?, 'full', 'completed', ?, 0, CURRENT_TIMESTAMP)
    `).run(syncId, mockUsers.length);

    res.json({ success: true, sync_id: syncId, records_processed: mockUsers.length });
  });

  app.get("/api/hr/sync-history", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: "Admin only" });
    }
    const history = await db.prepare('SELECT * FROM hr_sync_log ORDER BY created_at DESC LIMIT 50').all();
    res.json(history);
  });

  app.get("/api/hr/validate", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: "Admin only" });
    }
    res.json({ valid: true, message: "HR system is connected" });
  });

  app.post("/api/workflow/instances", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const { workflow_id, entity_type, entity_id, start_node } = req.body;

    const instanceId = `inst-${Math.floor(Math.random() * 10000)}`;
    await db.prepare(`
      INSERT INTO workflow_instances (id, workflow_id, entity_type, entity_id, current_node_id, status)
      VALUES (?, ?, ?, ?, ?, 'running')
    `).run(instanceId, workflow_id, entity_type, entity_id, start_node || 'start');

    res.json({ id: instanceId, status: 'running' });
  });

  app.get("/api/workflow/tasks", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const { status, assignee_id } = req.query;
    
    let query = 'SELECT * FROM workflow_tasks WHERE 1=1';
    const params: any[] = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (assignee_id) {
      query += ' AND assignee_id = ?';
      params.push(assignee_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const tasks = await db.prepare(query).all(...params);
    res.json(tasks);
  });

  app.get("/api/workflow/tasks/count", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const result = await db.prepare("SELECT COUNT(*) as count FROM workflow_tasks WHERE status = 'pending'").get() as any;
    res.json({ count: result?.count || 0 });
  });

  app.post("/api/workflow/tasks/:id/approve", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const taskId = req.params.id;
    const { comments } = req.body;

    await db.prepare('UPDATE workflow_tasks SET status = ?, comments = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', comments || '', taskId);

    res.json({ success: true });
  });

  app.post("/api/workflow/tasks/:id/reject", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const taskId = req.params.id;
    const { comments } = req.body;

    await db.prepare('UPDATE workflow_tasks SET status = ?, comments = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('rejected', comments || '', taskId);

    res.json({ success: true });
  });

  app.post("/api/workflow/tasks/:id/delegate", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const taskId = req.params.id;
    const { assignee_id } = req.body;

    await db.prepare('UPDATE workflow_tasks SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(assignee_id, taskId);

    res.json({ success: true });
  });

  app.get("/api/workflow/instances/:id/history", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const history = await db.prepare('SELECT * FROM workflow_history WHERE instance_id = ? ORDER BY timestamp DESC').all(req.params.id);
    res.json(history);
  });

  app.get("/api/workflow/approval-path", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const { claim_id } = req.query;
    
    if (!claim_id) {
      return res.status(400).json({ error: "claim_id required" });
    }

    const claim = await db.prepare('SELECT claimant_id FROM claims WHERE id = ?').get(claim_id) as { claimant_id: string } | undefined;
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const claimant = await db.prepare('SELECT manager_id FROM users WHERE id = ?').get(claim.claimant_id) as { manager_id: string } | undefined;
    
    const path = [];
    if (claimant?.manager_id) {
      const manager = await db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(claimant.manager_id) as any;
      if (manager) path.push(manager);
    }

    const financeLeads = await db.prepare("SELECT id, name, role FROM users WHERE role = 'Finance Lead' AND is_active = 1").all();
    path.push(...financeLeads);

    res.json(path);
  });

  app.post("/api/audit-logs", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    const { action, entity_type, entity_id, details } = req.body;

    const logId = `log-${Math.floor(Math.random() * 10000)}`;
    await db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, req.user.userId, action, entity_type, entity_id, JSON.stringify(details || {}));

    res.json({ success: true });
  });

  app.get("/api/audit-logs", authenticateToken, async (req: any, res: any) => {
    const db = await getDbInstance();
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: "Admin only" });
    }

    const { entity_type, entity_id, action } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    
    if (entity_type) {
      query += ' AND entity_type = ?';
      params.push(entity_type);
    }
    if (entity_id) {
      query += ' AND entity_id = ?';
      params.push(entity_id);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const logs = await db.prepare(query).all(...params);
    res.json(logs);
  });

  return app;
}

async function startServer() {
  const PORT = 3008;
  const isVercel = process.env.VERCEL === '1';

  if (!isVercel) {
    const viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteDevServer.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

// Vercel serverless export
export default createApp();
