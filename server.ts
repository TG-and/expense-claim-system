import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb, db } from "./src/db/index.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = "claimflow-secret-key-2025";

// Ensure uploads directory exists
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

async function startServer() {
  const app = express();
  const PORT = 3008;

  app.use(cors());
  app.use(express.json());

  // Auth middleware - extract user from header (set by frontend)
  app.use((req, res, next) => {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (user) {
        (req as any).user = user;
      }
    }
    next();
  });
  app.use('/uploads', express.static('uploads'));

  // Initialize DB
  initDb();

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

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

  // Middleware to verify JWT token
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
  };

  app.post("/api/auth/logout", (req, res) => {
    res.json({ success: true });
  });

  // Get current user info
  app.get("/api/auth/me", authenticateToken, (req: any, res: any) => {
    const user = db.prepare('SELECT id, name, email, role, department, avatar FROM users WHERE id = ?').get(req.user.userId) as any;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });

  app.put("/api/auth/profile", (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { name, avatar } = req.body;
    
    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
    }
    if (avatar) {
      db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId);
    }
    
    const user = db.prepare('SELECT id, name, email, role, department, avatar FROM users WHERE id = ?').get(userId) as any;
    res.json(user);
  });

  app.get("/api/requests", (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, u.name as claimant_name, u.department, u.avatar, v.name as vendor_name
      FROM requests r
      JOIN users u ON r.claimant_id = u.id
      LEFT JOIN vendors v ON r.vendor_id = v.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  });

  app.get("/api/requests/:id", (req, res) => {
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

  app.post("/api/requests", (req, res) => {
    const { type, claimant_id, vendor_id, amount, currency, description, attachment_url } = req.body;
    const id = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      db.prepare(`
        INSERT INTO requests (id, type, claimant_id, vendor_id, amount, currency, status, description, attachment_url, step)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 1)
      `).run(id, type, claimant_id, vendor_id, amount, currency, description, attachment_url || null);
      
      res.status(201).json({ id, status: 'Pending' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  app.post("/api/requests/:id/approve", (req, res) => {
    const { approver_id, comments } = req.body;
    const requestId = req.params.id;
    
    try {
      const request = db.prepare('SELECT step, workflow_id, current_node_id, claim_id FROM requests WHERE id = ?').get(requestId) as { step: number; workflow_id: string | null; current_node_id: string | null; claim_id: string | null };
      if (!request) return res.status(404).json({ error: "Request not found" });

      const approvalId = `a${Math.floor(Math.random() * 10000)}`;
      
      let newStatus = 'Approved';
      let nextStep = request.step + 1;
      let nextNodeId = request.current_node_id;

      if (request.workflow_id) {
        const workflow = db.prepare('SELECT nodes, edges FROM workflows WHERE id = ?').get(request.workflow_id) as { nodes: string; edges: string } | undefined;
        
        if (workflow) {
          const nodes = JSON.parse(workflow.nodes);
          const edges = JSON.parse(workflow.edges);
          
          const currentNode = nodes.find((n: any) => n.id === request.current_node_id);
          const nextEdge = edges.find((e: any) => e.source === request.current_node_id);
          
          if (nextEdge) {
            const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
            if (nextNode) {
              nextNodeId = nextNode.id;
              
              if (nextNode.type === 'end') {
                newStatus = 'Approved';
                nextStep = 99;
              } else if (nextNode.type === 'approval') {
                newStatus = 'Pending';
                nextStep = nextNode.data?.step || request.step + 1;
              } else if (nextNode.type === 'action') {
                newStatus = 'Processing Payment';
                nextStep = nextNode.data?.step || request.step + 1;
              }
            }
          } else {
            newStatus = 'Approved';
            nextStep = 99;
          }
        }
      } else {
        newStatus = nextStep > 3 ? 'Approved' : (nextStep === 2 ? 'Pending Finance' : 'Processing Payment');
      }
      
      db.transaction(() => {
        db.prepare(`
          INSERT INTO approvals (id, request_id, approver_id, status, step, comments, node_id)
          VALUES (?, ?, ?, 'Approved', ?, ?, ?)
        `).run(approvalId, requestId, approver_id, request.step, comments || '', request.current_node_id);

        db.prepare('UPDATE requests SET step = ?, status = ?, current_node_id = ? WHERE id = ?').run(nextStep, newStatus, nextNodeId, requestId);

        if (request.claim_id) {
          const claimStatus = newStatus === 'Approved' ? 'Approved' : newStatus;
          db.prepare('UPDATE claims SET step = ?, status = ? WHERE id = ?').run(nextStep, claimStatus, request.claim_id);

          const instance = db.prepare('SELECT id FROM workflow_instances WHERE entity_id = ? AND status = ?').get(request.claim_id, 'running') as { id: string } | undefined;
          if (instance) {
            if (newStatus === 'Approved' && nextStep === 99) {
              db.prepare('UPDATE workflow_instances SET current_node_id = ?, status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextNodeId, 'completed', instance.id);
            } else {
              db.prepare('UPDATE workflow_instances SET current_node_id = ? WHERE id = ?').run(nextNodeId, instance.id);
            }
            
            db.prepare(`
              INSERT INTO workflow_history (id, instance_id, node_id, action, actor_id, comments)
              VALUES (?, ?, ?, 'approve', ?, ?)
            `).run(`wfh-${Math.floor(Math.random() * 10000)}`, instance.id, request.current_node_id, approver_id, comments || '');
          }
        }
      })();
      
      res.json({ success: true, newStatus, nextStep, nextNodeId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to approve request" });
    }
  });

  app.post("/api/requests/:id/reject", (req, res) => {
    const { approver_id, comments } = req.body;
    const requestId = req.params.id;
    
    try {
      const request = db.prepare('SELECT step, workflow_id, current_node_id, claim_id FROM requests WHERE id = ?').get(requestId) as { step: number; workflow_id: string | null; current_node_id: string | null; claim_id: string | null };
      if (!request) return res.status(404).json({ error: "Request not found" });

      const approvalId = `a${Math.floor(Math.random() * 10000)}`;
      
      db.transaction(() => {
        db.prepare(`
          INSERT INTO approvals (id, request_id, approver_id, status, step, comments, node_id)
          VALUES (?, ?, ?, 'Rejected', ?, ?, ?)
        `).run(approvalId, requestId, approver_id, request.step, comments || '', request.current_node_id);

        db.prepare('UPDATE requests SET status = ? WHERE id = ?').run('Rejected', requestId);

        if (request.claim_id) {
          db.prepare('UPDATE claims SET status = ? WHERE id = ?').run('Rejected', request.claim_id);

          const instance = db.prepare('SELECT id FROM workflow_instances WHERE entity_id = ? AND status = ?').get(request.claim_id, 'running') as { id: string } | undefined;
          if (instance) {
            db.prepare('UPDATE workflow_instances SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('rejected', instance.id);
            
            db.prepare(`
              INSERT INTO workflow_history (id, instance_id, node_id, action, actor_id, comments)
              VALUES (?, ?, ?, 'reject', ?, ?)
            `).run(`wfh-${Math.floor(Math.random() * 10000)}`, instance.id, request.current_node_id, approver_id, comments || '');
          }
        }
      })();
      
      res.json({ success: true, status: 'Rejected' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to reject request" });
    }
  });

  app.get("/api/search", (req, res) => {
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

  app.get("/api/vendors", (req, res) => {
    const vendors = db.prepare('SELECT * FROM vendors').all();
    res.json(vendors);
  });

  app.get("/api/admin/users", authenticateToken, (req: any, res: any) => {
    if (req.user.role !== 'Admin' && req.user.role !== 'Finance Lead') {
      return res.status(403).json({ error: "Access denied" });
    }
    
    try {
      const users = db.prepare(`
        SELECT 
          id, 
          name, 
          email, 
          role, 
          department, 
          company_id,
          avatar,
          job_title,
          employee_number,
          hire_date,
          cost_center,
          location,
          is_active,
          manager_id,
          created_at,
          updated_at
        FROM users 
        ORDER BY name ASC
      `).all();
      
      const companies = db.prepare('SELECT id, name FROM companies').all();
      const companiesMap = Object.fromEntries(companies.map((c: any) => [c.id, c.name]));
      
      const result = users.map((u: any) => ({
        ...u,
        company: companiesMap[u.company_id] || 'Global Corp',
        status: u.is_active ? 'Active' : 'Inactive'
      }));
      
      res.json(result);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare('SELECT id, name, email, role, department, avatar FROM users').all();
    res.json(users);
  });

  // Claims API
  app.get("/api/claims", (req, res) => {
    const user = (req as any).user;
    let claims;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Role-based filtering
    if (user.role === 'Employee') {
      // Employees can only see their own claims
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.claimant_id = ?
        ORDER BY c.created_at DESC
      `).all(user.id);
    } else if (user.role === 'Manager') {
      // Managers can see their team's claims (same department) and their own
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE u.department = ? OR c.claimant_id = ?
        ORDER BY c.created_at DESC
      `).all(user.department, user.id);
    } else {
      // Finance and Admin can see all claims
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        ORDER BY c.created_at DESC
      `).all();
    }
    
    const claimsWithItems = claims.map(claim => {
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

  // Approvals API - returns claims that the user can approve
  app.get("/api/approvals", (req, res) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    let claims;
    
    if (user.role === 'Employee') {
      // Employees cannot approve anything
      claims = [];
    } else if (user.role === 'Manager') {
      // Managers can approve Pending claims from their department
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.status = 'Pending' AND u.department = ?
        ORDER BY c.created_at DESC
      `).all(user.department);
    } else if (user.role === 'Finance' || user.role === 'Finance Lead') {
      // Finance can approve Pending Finance claims
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.status = 'Pending Finance'
        ORDER BY c.created_at DESC
      `).all();
    } else {
      // Admin can approve Pending and Pending Finance claims
      claims = db.prepare(`
        SELECT c.*, u.name as claimant_name, u.department, u.avatar
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.status IN ('Pending', 'Pending Finance')
        ORDER BY c.created_at DESC
      `).all();
    }
    
    const claimsWithItems = claims.map(claim => {
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

  app.get("/api/claims/:id", (req, res) => {
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

  app.post("/api/claims", (req, res) => {
    const { description, claimant_id, items } = req.body;
    const claimId = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0);
    const currency = items[0]?.currency || 'USD';
    
    try {
      const defaultWorkflow = db.prepare(`
        SELECT * FROM workflows WHERE entity_type = 'claim' AND is_default = 1 AND is_active = 1
      `).get() as { id: string; name: string; nodes: string; edges: string } | undefined;

      let workflowId = null;
      let currentNodeId = null;

      if (defaultWorkflow) {
        workflowId = defaultWorkflow.id;
        const nodes = JSON.parse(defaultWorkflow.nodes);
        const startNode = nodes.find((n: any) => n.type === 'start' || n.type === 'approval');
        if (startNode) {
          currentNodeId = startNode.id;
        }
      }

      db.transaction(() => {
        db.prepare(`
          INSERT INTO claims (id, claimant_id, description, total_amount, currency, status, step, workflow_id)
          VALUES (?, ?, ?, ?, ?, 'Pending', 1, ?)
        `).run(claimId, claimant_id, description, totalAmount, currency, workflowId);

        for (const item of items) {
          const requestId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
          db.prepare(`
            INSERT INTO requests (id, claim_id, type, claimant_id, vendor_id, amount, currency, status, description, attachment_url, step, workflow_id, current_node_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 1, ?, ?)
          `).run(requestId, claimId, item.type, claimant_id, item.vendor_id, item.amount, item.currency, item.description, item.attachment_url || null, workflowId, currentNodeId);
        }

        if (defaultWorkflow) {
          const instanceId = `wfi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          db.prepare(`
            INSERT INTO workflow_instances (id, workflow_id, entity_type, entity_id, current_node_id, status)
            VALUES (?, ?, 'claim', ?, ?, 'running')
          `).run(instanceId, workflowId, claimId, currentNodeId);

          const nodes = JSON.parse(defaultWorkflow.nodes);
          const edges = JSON.parse(defaultWorkflow.edges);
          
          const claimant = db.prepare('SELECT manager_id FROM users WHERE id = ?').get(claimant_id) as { manager_id: string } | undefined;
          
          const visited = new Set<string>();
          let currentNodeId2: string | null = nodes.find((n: any) => n.data?.nodeType === 'start')?.id || null;
          
          while (currentNodeId2 && !visited.has(currentNodeId2)) {
            visited.add(currentNodeId2);
            
            const node = nodes.find((n: any) => n.id === currentNodeId2);
            if (!node) break;
            
            if (node.data?.nodeType === 'approval') {
              let assigneeId: string | null = null;
              
              if (node.data?.approverRole === 'Manager' || !node.data?.approverRole) {
                assigneeId = claimant?.manager_id || claimant_id;
              } else if (node.data?.approverRole) {
                const approver = db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').get(node.data.approverRole) as { id: string } | undefined;
                assigneeId = approver?.id || claimant_id;
              } else if (node.data?.approverDepartment) {
                const approver = db.prepare('SELECT id FROM users WHERE department = ? AND is_active = 1').get(node.data.approverDepartment) as { id: string } | undefined;
                assigneeId = approver?.id || claimant_id;
              }
              
              if (assigneeId) {
                const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                db.prepare(`
                  INSERT INTO workflow_tasks (id, instance_id, node_id, node_label, assignee_id, status)
                  VALUES (?, ?, ?, ?, ?, 'pending')
                `).run(taskId, instanceId, node.id, node.data?.label || 'Approval', assigneeId);

                const notifId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                db.prepare(`
                  INSERT INTO notifications (id, user_id, type, title, message, link)
                  VALUES (?, ?, 'approval_required', 'New Approval Task', ?, ?)
                `).run(notifId, assigneeId, `New approval request for $${totalAmount}`, '/approvals');
              }
              
              const outEdge = edges.find((e: any) => e.source === currentNodeId2);
              currentNodeId2 = outEdge?.target || null;
            } else if (node.data?.nodeType === 'condition') {
              const conditionType = node.data?.conditionType;
              const conditionValue = node.data?.conditionValue;
              
              let shouldTakeBranch = false;
              if (conditionType === 'amount_above' && conditionValue) {
                shouldTakeBranch = totalAmount >= conditionValue;
              } else if (conditionType === 'amount_below' && conditionValue) {
                shouldTakeBranch = totalAmount < conditionValue;
              }
              
              const outEdges = edges.filter((e: any) => e.source === currentNodeId2);
              const trueEdge = outEdges.find((e: any) => e.label?.includes('Yes') || e.label?.includes('>'));
              const falseEdge = outEdges.find((e: any) => e.label?.includes('No') || e.label?.includes('<='));
              
              if (shouldTakeBranch && trueEdge) {
                currentNodeId2 = trueEdge.target;
              } else if (!shouldTakeBranch && falseEdge) {
                currentNodeId2 = falseEdge.target;
              } else if (outEdges.length > 0) {
                currentNodeId2 = outEdges[0].target;
              } else {
                currentNodeId2 = null;
              }
            } else if (node.data?.nodeType === 'action') {
              const outEdge = edges.find((e: any) => e.source === currentNodeId2);
              currentNodeId2 = outEdge?.target || null;
            } else if (node.data?.nodeType === 'end') {
              break;
            } else {
              const outEdge = edges.find((e: any) => e.source === currentNodeId2);
              currentNodeId2 = outEdge?.target || null;
            }
          }
        }
      })();
      
      res.status(201).json({ id: claimId, status: 'Pending', totalAmount, workflowId, currentNodeId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create claim" });
    }
  });

  app.post("/api/claims/:id/withdraw", (req, res) => {
    const claimId = req.params.id;
    
    try {
      const claim = db.prepare('SELECT status FROM claims WHERE id = ?').get(claimId) as { status: string };
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      
      if (claim.status !== 'Pending' && claim.status !== 'Pending Finance') {
        return res.status(400).json({ error: "Can only withdraw pending claims" });
      }

      db.transaction(() => {
        db.prepare('UPDATE requests SET status = ? WHERE claim_id = ?').run('Draft', claimId);
        db.prepare('UPDATE claims SET status = ?, step = 0 WHERE id = ?').run('Draft', claimId);
      })();
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to withdraw claim" });
    }
  });

  app.delete("/api/claims/:id", (req, res) => {
    const claimId = req.params.id;
    
    try {
      const claim = db.prepare('SELECT status FROM claims WHERE id = ?').get(claimId) as { status: string };
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      
      if (claim.status !== 'Draft' && claim.status !== 'Withdrawn') {
        return res.status(400).json({ error: "Can only delete draft or withdrawn claims" });
      }

      db.transaction(() => {
        db.prepare('DELETE FROM requests WHERE claim_id = ?').run(claimId);
        db.prepare('DELETE FROM claims WHERE id = ?').run(claimId);
      })();
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete claim" });
    }
  });

  app.post("/api/claims/:id/approve", (req, res) => {
    const claimId = req.params.id;
    const user = (req as any).user;
    const { comments } = req.body;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const claim = db.prepare('SELECT status, step, claimant_id FROM claims WHERE id = ?').get(claimId) as { status: string; step: number; claimant_id: string };
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      
      // Role-based approval check
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
        db.prepare('UPDATE claims SET status = ?, step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, newStep, claimId);
        
        const items = db.prepare('SELECT id FROM requests WHERE claim_id = ?').all(claimId) as { id: string }[];
        for (const item of items) {
          db.prepare(`
            INSERT INTO approvals (id, request_id, approver_id, status, step, comments)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(`APR-${Math.floor(1000 + Math.random() * 9000)}`, item.id, user.id, 'Approved', newStep - 1, comments || null);
          
          db.prepare('UPDATE requests SET status = ?, step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, newStep, item.id);
        }
      })();
      
      res.json({ success: true, status: newStatus });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to approve claim" });
    }
  });

  app.post("/api/claims/:id/reject", (req, res) => {
    const claimId = req.params.id;
    const user = (req as any).user;
    const { comments } = req.body;
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const claim = db.prepare('SELECT status, step FROM claims WHERE id = ?').get(claimId) as { status: string; step: number };
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      
      // Role-based approval check (same as approve)
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
        db.prepare('UPDATE claims SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Rejected', claimId);
        
        const items = db.prepare('SELECT id FROM requests WHERE claim_id = ?').all(claimId) as { id: string }[];
        for (const item of items) {
          db.prepare(`
            INSERT INTO approvals (id, request_id, approver_id, status, step, comments)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(`APR-${Math.floor(1000 + Math.random() * 9000)}`, item.id, user.id, 'Rejected', 99, comments || 'Rejected');
          
          db.prepare('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('Rejected', item.id);
        }
      })();
      
      res.json({ success: true, status: 'Rejected' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to reject claim" });
    }
  });

  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Payment callback API - called by external finance system
  app.post("/api/payments/callback", (req, res) => {
    const { claim_id, status, transaction_id, paid_at } = req.body;
    
    if (!claim_id || !status) {
      return res.status(400).json({ error: "Missing required fields: claim_id, status" });
    }

    try {
      const claim = db.prepare('SELECT status FROM claims WHERE id = ?').get(claim_id) as { status: string } | undefined;
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      let newStatus = claim.status;
      let newStep = 4;

      if (status === 'paid' || status === 'success') {
        newStatus = 'Paid';
        newStep = 5;
      } else if (status === 'failed') {
        newStatus = 'Processing Payment';
        newStep = 3;
      }

      db.transaction(() => {
        db.prepare('UPDATE claims SET status = ?, step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newStatus, newStep, claim_id);
        
        const items = db.prepare('SELECT id FROM requests WHERE claim_id = ?').all(claim_id) as { id: string }[];
        for (const item of items) {
          db.prepare('UPDATE requests SET status = ?, step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newStatus, newStep, item.id);
          
          db.prepare(`
            INSERT INTO approvals (id, request_id, approver_id, status, step, comments, node_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            `APR-${Math.floor(1000 + Math.random() * 9000)}`,
            item.id,
            'finance-system',
            status === 'paid' ? 'Paid' : 'Failed',
            newStep,
            `Payment ${status}. Transaction: ${transaction_id || 'N/A'}`,
            'node-payment'
          );
        }
      })();

      res.json({ success: true, status: newStatus });
    } catch (error) {
      console.error('Payment callback error:', error);
      res.status(500).json({ error: "Failed to process payment callback" });
    }
  });

  // Workflow APIs
  app.get("/api/workflows", (req, res) => {
    const workflows = db.prepare(`
      SELECT * FROM workflows ORDER BY created_at DESC
    `).all();
    res.json(workflows);
  });

  app.get("/api/workflows/:id", (req, res) => {
    const workflow = db.prepare(`
      SELECT * FROM workflows WHERE id = ?
    `).get(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const nodes = db.prepare(`
      SELECT * FROM workflow_nodes WHERE workflow_id = ? ORDER BY position_x ASC
    `).all(req.params.id);

    res.json({ ...workflow, nodes });
  });

  app.post("/api/workflows", (req, res) => {
    const { name, description, entity_type, nodes, edges, is_default } = req.body;
    const id = `wf-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      if (is_default) {
        db.prepare('UPDATE workflows SET is_default = 0 WHERE entity_type = ?').run(entity_type);
      }

      db.prepare(`
        INSERT INTO workflows (id, name, description, entity_type, is_default, is_active, nodes, edges)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `).run(id, name, description, entity_type, is_default ? 1 : 0, JSON.stringify(nodes), JSON.stringify(edges));

      for (const node of nodes) {
        db.prepare(`
          INSERT INTO workflow_nodes (id, workflow_id, node_type, label, position_x, position_y, approver_role, approver_department, approver_user_id, condition)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          node.id,
          id,
          node.type,
          node.data?.label || node.label || '',
          node.position?.x || 0,
          node.position?.y || 0,
          node.data?.approverRole || node.data?.approver_role || null,
          node.data?.approverDepartment || null,
          node.data?.approverUserId || null,
          node.data?.condition || null
        );
      }
      
      res.status(201).json({ id, name });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  app.put("/api/workflows/:id", (req, res) => {
    const { name, description, entity_type, nodes, edges, is_default, is_active } = req.body;
    const workflowId = req.params.id;
    
    try {
      if (is_default) {
        db.prepare('UPDATE workflows SET is_default = 0 WHERE entity_type = ?').run(entity_type);
      }

      db.prepare(`
        UPDATE workflows 
        SET name = ?, description = ?, entity_type = ?, is_default = ?, is_active = ?, nodes = ?, edges = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, description, entity_type, is_default ? 1 : 0, is_active ? 1 : 0, JSON.stringify(nodes), JSON.stringify(edges), workflowId);

      db.prepare('DELETE FROM workflow_nodes WHERE workflow_id = ?').run(workflowId);

      for (const node of nodes) {
        db.prepare(`
          INSERT INTO workflow_nodes (id, workflow_id, node_type, label, position_x, position_y, approver_role, approver_department, approver_user_id, condition)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          node.id,
          workflowId,
          node.type,
          node.data?.label || node.label || '',
          node.position?.x || 0,
          node.position?.y || 0,
          node.data?.approverRole || node.data?.approver_role || null,
          node.data?.approverDepartment || null,
          node.data?.approverUserId || null,
          node.data?.condition || null
        );
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  app.delete("/api/workflows/:id", (req, res) => {
    const workflowId = req.params.id;
    
    try {
      const workflow = db.prepare('SELECT is_default FROM workflows WHERE id = ?').get(workflowId) as { is_default: number };
      if (!workflow) return res.status(404).json({ error: "Workflow not found" });
      
      if (workflow.is_default) {
        return res.status(400).json({ error: "Cannot delete default workflow" });
      }

      db.prepare('DELETE FROM workflow_nodes WHERE workflow_id = ?').run(workflowId);
      db.prepare('DELETE FROM workflows WHERE id = ?').run(workflowId);
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  app.get("/api/workflows/:id/nodes", (req, res) => {
    const nodes = db.prepare(`
      SELECT * FROM workflow_nodes WHERE workflow_id = ? ORDER BY position_x ASC
    `).all(req.params.id);
    res.json(nodes);
  });

  app.get("/api/workflow/todos", (req, res) => {
    const userId = req.query.userId as string;
    const userRole = req.query.role as string;
    
    if (!userId || !userRole) {
      return res.status(400).json({ error: "userId and role are required" });
    }

    const pendingRequests = db.prepare(`
      SELECT r.*, u.name as claimant_name, u.department, c.description as claim_description,
             wn.label as current_node_label, wn.approver_role
      FROM requests r
      JOIN users u ON r.claimant_id = u.id
      LEFT JOIN claims c ON r.claim_id = c.id
      LEFT JOIN workflow_nodes wn ON r.current_node_id = wn.id
      WHERE r.status = 'Pending' AND r.current_node_id IS NOT NULL
      ORDER BY r.created_at ASC
    `).all();

    const filteredRequests = pendingRequests.filter((r: any) => {
      if (!r.approver_role) return false;
      return r.approver_role.toLowerCase().includes(userRole.toLowerCase()) || 
             userRole === 'Finance Lead' || 
             userRole === 'Manager';
    });

    res.json(filteredRequests);
  });

  app.get("/api/workflow/instance/:entityType/:entityId", (req, res) => {
    const { entityType, entityId } = req.params;
    
    const instance = db.prepare(`
      SELECT wi.*, w.name as workflow_name, w.nodes, w.edges
      FROM workflow_instances wi
      JOIN workflows w ON wi.workflow_id = w.id
      WHERE wi.entity_type = ? AND wi.entity_id = ?
    `).get(entityType, entityId) as any;

    if (!instance) {
      return res.json(null);
    }

    const history = db.prepare(`
      SELECT wh.*, u.name as actor_name
      FROM workflow_history wh
      LEFT JOIN users u ON wh.actor_id = u.id
      WHERE wh.instance_id = ?
      ORDER BY wh.timestamp ASC
    `).all(instance.id);

    res.json({ ...instance, history });
  });

  app.get("/api/workflows/:id/bpmn", (req, res) => {
    const workflow = db.prepare(`
      SELECT bpmn_xml, name FROM workflows WHERE id = ?
    `).get(req.params.id) as { bpmn_xml: string; name: string } | undefined;

    if (!workflow || !workflow.bpmn_xml) {
      return res.status(404).json({ error: "BPMN XML not found" });
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${workflow.name}.bpmn"`);
    res.send(workflow.bpmn_xml);
  });

  app.post("/api/workflows/:id/deploy", (req, res) => {
    const workflowId = req.params.id;
    const { bpmn_xml } = req.body;

    if (!bpmn_xml) {
      return res.status(400).json({ error: "BPMN XML is required" });
    }

    try {
      const currentVersion = db.prepare('SELECT version FROM workflows WHERE id = ?').get(workflowId) as { version: number } | undefined;
      const newVersion = (currentVersion?.version || 0) + 1;

      db.prepare(`
        UPDATE workflows SET bpmn_xml = ?, version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(bpmn_xml, newVersion, workflowId);

      res.json({ success: true, version: newVersion });
    } catch (error) {
      console.error('Failed to deploy BPMN:', error);
      res.status(500).json({ error: "Failed to deploy BPMN workflow" });
    }
  });

  // Notification APIs
  app.get("/api/notifications", authenticateToken, (req: any, res: any) => {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(req.user.userId);
    res.json(notifications);
  });

  app.get("/api/notifications/unread-count", authenticateToken, (req: any, res: any) => {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `).get(req.user.userId) as { count: number };
    res.json({ count: result.count });
  });

  app.post("/api/notifications/:id/read", authenticateToken, (req: any, res: any) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.userId);
    res.json({ success: true });
  });

  app.post("/api/notifications/read-all", authenticateToken, (req: any, res: any) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
      .run(req.user.userId);
    res.json({ success: true });
  });

  // Organization APIs
  app.get("/api/org-chart", authenticateToken, (req: any, res: any) => {
    const orgChart = db.prepare(`
      SELECT 
        d.id, d.name as department_name, d.code,
        u.id as manager_id, u.name as manager_name, u.email as manager_email,
        (SELECT COUNT(*) FROM users WHERE department = d.name AND is_active = 1) as member_count
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      ORDER BY d.name
    `).all();
    res.json(orgChart);
  });

  app.get("/api/users/:id/approvers", authenticateToken, (req: any, res: any) => {
    const userId = req.params.id;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const approvers = db.prepare(`
      SELECT * FROM approval_levels
      WHERE workflow_id = 'wf-1'
      ORDER BY level_order ASC
    `).all();

    const approvalPath: any[] = [];
    
    for (const level of approvers) {
      let approver = null;
      
      if (level.approver_type === 'manager') {
        const manager = db.prepare('SELECT * FROM users WHERE id = ?').get(user.manager_id) as any;
        approver = manager;
      } else if (level.approver_type === 'condition') {
        if (level.condition_type === 'amount_above' && level.condition_value) {
          const amount = parseFloat(req.query.claimAmount as string) || 0;
          if (amount >= level.condition_value) {
            if (level.approver_role) {
              approver = db.prepare('SELECT * FROM users WHERE role = ? AND is_active = 1').get(level.approver_role) as any;
            } else if (level.approver_department) {
              approver = db.prepare('SELECT * FROM users WHERE department = ? AND is_active = 1').get(level.approver_department) as any;
            }
          }
        }
      } else if (level.approver_type === 'specific' && level.approver_user_id) {
        approver = db.prepare('SELECT * FROM users WHERE id = ?').get(level.approver_user_id) as any;
      }

      if (approver) {
        approvalPath.push({
          level: level.level_order,
          name: level.name,
          approver: {
            id: approver.id,
            name: approver.name,
            email: approver.email,
            role: approver.role,
            department: approver.department
          }
        });
      }
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        manager_id: user.manager_id
      },
      approval_path: approvalPath
    });
  });

  // HR Integration APIs
  app.post("/api/hr/sync", authenticateToken, (req: any, res: any) => {
    const { employees } = req.body;
    
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ error: "Invalid employees data" });
    }

    const results = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const emp of employees) {
      try {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emp.email);
        
        if (existing) {
          db.prepare(`
            UPDATE users SET 
              name = ?, department = ?, job_title = ?, manager_id = ?,
              employee_number = ?, hire_date = ?, cost_center = ?, location = ?
            WHERE email = ?
          `).run(
            emp.name, emp.department, emp.job_title, emp.manager_id,
            emp.employee_number, emp.hire_date, emp.cost_center, emp.location,
            emp.email
          );
        } else {
          const newId = `u_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const initials = emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          
          db.prepare(`
            INSERT INTO users (id, name, email, password, role, department, job_title, manager_id, employee_number, hire_date, cost_center, location, is_active, avatar)
            VALUES (?, ?, ?, 'password123', 'Employee', ?, ?, ?, ?, ?, ?, 1, ?)
          `).run(
            newId, emp.name, emp.email,
            emp.department, emp.job_title, emp.manager_id,
            emp.employee_number, emp.hire_date, emp.cost_center, emp.location,
            initials
          );
        }
        results.processed++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${emp.email}: ${error.message}`);
      }
    }

    results.success = results.failed === 0;
    res.json(results);
  });

  app.get("/api/hr/sync-history", authenticateToken, (req: any, res: any) => {
    const history = db.prepare(`
      SELECT * FROM hr_sync_log 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all();
    res.json(history);
  });

  app.get("/api/hr/validate", authenticateToken, (req: any, res: any) => {
    const invalidManagers = db.prepare(`
      SELECT u.id, u.name, u.email, u.manager_id
      FROM users u
      WHERE u.manager_id IS NOT NULL
      AND u.manager_id NOT IN (SELECT id FROM users WHERE is_active = 1)
    `).all();

    const orgStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(DISTINCT department) FROM users) as departments,
        (SELECT COUNT(*) FROM users WHERE manager_id IS NULL AND role != 'Admin') as users_without_manager
    `).get();

    res.json({ valid: invalidManagers.length === 0, issues: invalidManagers, statistics: orgStats });
  });

  // Workflow Execution Engine APIs
  app.post("/api/workflow/instances", authenticateToken, (req: any, res: any) => {
    const { workflow_id, entity_type, entity_id, variables } = req.body;
    const claimant_id = req.user.userId;

    if (!workflow_id || !entity_type || !entity_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const instance = db.prepare(`
        INSERT INTO workflow_instances (id, workflow_id, entity_type, entity_id, claimant_id, current_node_id, status, variables)
        VALUES (?, ?, ?, ?, ?, 'start', 'running', ?)
      `).run(
        `inst_${Date.now()}`,
        workflow_id,
        entity_type,
        entity_id,
        claimant_id,
        JSON.stringify(variables || {})
      );

      const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflow_id) as any;
      const nodes = JSON.parse(workflow.nodes || '[]');
      const edges = JSON.parse(workflow.edges || '[]');
      
      const firstApprovalNode = nodes.find((n: any) => n.data?.nodeType === 'approval');
      if (firstApprovalNode) {
        const claimant = db.prepare('SELECT manager_id FROM users WHERE id = ?').get(claimant_id) as any;
        if (claimant?.manager_id) {
          const taskId = `task_${Date.now()}`;
          db.prepare(`
            INSERT INTO workflow_tasks (id, instance_id, node_id, node_label, assignee_id, status)
            VALUES (?, ?, ?, ?, 'pending')
          `).run(taskId, instance.lastInsertRowid, firstApprovalNode.id, firstApprovalNode.data?.label || 'Approval', claimant.manager_id);

          db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, message, link)
            VALUES (?, ?, 'approval_required', 'New Approval Task', ?, ?)
          `).run(
            `notif_${Date.now()}`,
            claimant.manager_id,
            'You have a new approval task waiting for your review.',
            `/approvals`
          );
        }
      }

      res.json({ success: true, instance_id: instance.lastInsertRowid });
    } catch (error: any) {
      console.error('Failed to start workflow:', error);
      res.status(500).json({ error: "Failed to start workflow" });
    }
  });

  app.get("/api/workflow/tasks", authenticateToken, (req: any, res: any) => {
    const tasks = db.prepare(`
      SELECT 
        t.*,
        i.entity_type,
        i.entity_id,
        i.claimant_id,
        w.name as workflow_name,
        u.name as claimant_name
      FROM workflow_tasks t
      JOIN workflow_instances i ON t.instance_id = i.id
      JOIN workflows w ON i.workflow_id = w.id
      LEFT JOIN users u ON i.claimant_id = u.id
      WHERE t.assignee_id = ? AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `).all(req.user.userId);
    res.json(tasks);
  });

  app.post("/api/workflow/tasks/:id/approve", authenticateToken, (req: any, res: any) => {
    const taskId = req.params.id;
    const { comments } = req.body;
    const approverId = req.user.userId;

    try {
      const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(taskId) as any;
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.assignee_id !== approverId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      db.prepare(`
        UPDATE workflow_tasks SET status = 'approved', comments = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(comments || null, taskId);

      const instance = db.prepare('SELECT * FROM workflow_instances WHERE id = ?').get(task.instance_id) as any;
      const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(instance.workflow_id) as any;
      const nodes = JSON.parse(workflow.nodes || '[]');
      const edges = JSON.parse(workflow.edges || '[]');

      const currentNodeIndex = nodes.findIndex((n: any) => n.id === task.node_id);
      const nextEdge = edges.find((e: any) => e.source === task.node_id);

      if (nextEdge) {
        const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
        if (nextNode && nextNode.data?.nodeType === 'approval') {
          const claimant = db.prepare('SELECT manager_id FROM users WHERE id = ?').get(instance.claimant_id) as any;
          
          const nextTaskId = `task_${Date.now()}`;
          db.prepare(`
            INSERT INTO workflow_tasks (id, instance_id, node_id, node_label, assignee_id, status)
            VALUES (?, ?, ?, ?, 'pending')
          `).run(nextTaskId, instance.id, nextNode.id, nextNode.data?.label || 'Approval', claimant?.manager_id || instance.claimant_id);

          db.prepare(`
            UPDATE workflow_instances SET current_node_id = ? WHERE id = ?
          `).run(nextNode.id, instance.id);

          if (claimant?.manager_id) {
            db.prepare(`
              INSERT INTO notifications (id, user_id, type, title, message, link)
              VALUES (?, ?, 'approval_required', 'New Approval Task', ?, ?)
            `).run(
              `notif_${Date.now()}`,
              claimant.manager_id,
              'You have a new approval task waiting for your review.',
              `/approvals`
            );
          }
        } else {
          db.prepare(`
            UPDATE workflow_instances SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(instance.id);

          db.prepare(`
            UPDATE claims SET status = 'Approved', step = 'completed' WHERE id = ?
          `).run(instance.entity_id);

          db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, message, link)
            VALUES (?, ?, 'completed', 'Request Approved', ?, ?)
          `).run(
            `notif_${Date.now()}`,
            instance.claimant_id,
            'Your request has been fully approved.',
            `/reimbursements`
          );
        }
      }

      res.json({ success: true, status: 'approved' });
    } catch (error: any) {
      console.error('Failed to approve task:', error);
      res.status(500).json({ error: "Failed to approve task" });
    }
  });

  app.post("/api/workflow/tasks/:id/reject", authenticateToken, (req: any, res: any) => {
    const taskId = req.params.id;
    const { comments } = req.body;
    const approverId = req.user.userId;

    try {
      const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(taskId) as any;
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      db.prepare(`
        UPDATE workflow_tasks SET status = 'rejected', comments = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(comments || 'Rejected', taskId);

      const instance = db.prepare('SELECT * FROM workflow_instances WHERE id = ?').get(task.instance_id) as any;
      
      db.prepare(`
        UPDATE workflow_instances SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(task.instance_id);

      db.prepare(`
        UPDATE claims SET status = 'Rejected', step = 'rejected' WHERE id = ?
      `).run(instance.entity_id);

      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, link)
        VALUES (?, ?, 'rejected', 'Request Rejected', ?, ?)
      `).run(
        `notif_${Date.now()}`,
        instance.claimant_id,
        `Your request has been rejected. Reason: ${comments || 'No reason provided'}`,
        `/reimbursements`
      );

      res.json({ success: true, status: 'rejected' });
    } catch (error: any) {
      console.error('Failed to reject task:', error);
      res.status(500).json({ error: "Failed to reject task" });
    }
  });

  app.post("/api/workflow/tasks/:id/delegate", authenticateToken, (req: any, res: any) => {
    const taskId = req.params.id;
    const { new_assignee_id } = req.body;
    const currentUserId = req.user.userId;

    if (!new_assignee_id) {
      return res.status(400).json({ error: "New assignee is required" });
    }

    try {
      db.prepare(`
        UPDATE workflow_tasks SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(new_assignee_id, taskId);

      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, link)
        VALUES (?, ?, 'delegated', 'Task Delegated', ?, ?)
      `).run(
        `notif_${Date.now()}`,
        new_assignee_id,
        'A task has been delegated to you.',
        `/approvals`
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delegate task:', error);
      res.status(500).json({ error: "Failed to delegate task" });
    }
  });

  app.get("/api/workflow/instances/:id/history", authenticateToken, (req: any, res: any) => {
    const id = req.params.id;

    let instance = db.prepare('SELECT * FROM workflow_instances WHERE id = ?').get(id) as any;
    
    if (!instance) {
      instance = db.prepare('SELECT * FROM workflow_instances WHERE entity_id = ? ORDER BY started_at DESC LIMIT 1').get(id) as any;
    }
    
    if (!instance) {
      return res.json({ instance: null, tasks: [] });
    }

    const tasks = db.prepare(`
      SELECT t.*, u.name as assignee_name
      FROM workflow_tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.instance_id = ?
      ORDER BY t.created_at ASC
    `).all(instance.id);

    res.json({ instance, tasks });
  });

  app.get("/api/workflow/approval-path", authenticateToken, (req: any, res: any) => {
    const claimantId = req.query.claimant_id as string;
    const amount = parseFloat(req.query.amount as string) || 0;

    const claimant = db.prepare('SELECT * FROM users WHERE id = ?').get(claimantId) as any;
    if (!claimant) {
      return res.status(404).json({ error: "User not found" });
    }

    const workflow = db.prepare(`
      SELECT * FROM workflows WHERE entity_type = 'claim' AND is_active = 1 ORDER BY is_default DESC LIMIT 1
    `).get() as any;

    if (!workflow) {
      return res.status(404).json({ error: "No active workflow found" });
    }

    const nodes = JSON.parse(workflow.nodes || '[]');
    const edges = JSON.parse(workflow.edges || '[]');

    const approvers: any[] = [];
    let level = 1;

    const processNode = (nodeId: string, visited: Set<string> = new Set()) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find((n: any) => n.id === nodeId);
      if (!node) return;

      if (node.data?.nodeType === 'approval') {
        let approver = null;
        
        if (node.data?.approverRole === 'Manager' || !node.data?.approverRole) {
          if (claimant.manager_id) {
            approver = db.prepare('SELECT * FROM users WHERE id = ?').get(claimant.manager_id) as any;
          }
        } else if (node.data?.approverRole) {
          approver = db.prepare('SELECT * FROM users WHERE role = ? AND is_active = 1').get(node.data.approverRole) as any;
        } else if (node.data?.approverDepartment) {
          approver = db.prepare('SELECT * FROM users WHERE department = ? AND is_active = 1').get(node.data.approverDepartment) as any;
        }

        if (approver) {
          approvers.push({
            level: level++,
            type: node.data?.label || 'Approval',
            nodeId: node.id,
            approver: { id: approver.id, name: approver.name, role: approver.role, department: approver.department }
          });
        }
      } else if (node.data?.nodeType === 'condition') {
        const conditionType = node.data?.conditionType;
        const conditionValue = node.data?.conditionValue;
        
        let shouldTakeBranch = false;
        
        if (conditionType === 'amount_above' && conditionValue) {
          shouldTakeBranch = amount >= conditionValue;
        } else if (conditionType === 'amount_below' && conditionValue) {
          shouldTakeBranch = amount < conditionValue;
        }

        if (shouldTakeBranch) {
          const outEdge = edges.find((e: any) => e.source === nodeId);
          if (outEdge) {
            processNode(outEdge.target, visited);
          }
        }
      } else if (node.data?.nodeType === 'action') {
        approvers.push({
          level: level++,
          type: node.data?.label || 'Action',
          nodeId: node.id,
          approver: { id: 'system', name: 'System', role: 'System', department: 'System' }
        });
      }

      const outEdge = edges.find((e: any) => e.source === nodeId);
      if (outEdge && node.data?.nodeType !== 'condition') {
        processNode(outEdge.target, visited);
      }
    };

    const startNode = nodes.find((n: any) => n.data?.nodeType === 'start');
    if (startNode) {
      processNode(startNode.id);
    }

    res.json({ approvers, workflow: { id: workflow.id, name: workflow.name } });
  });

  // Audit Log API
  app.post("/api/audit-logs", authenticateToken, (req: any, res: any) => {
    const { action, entity_type, entity_id, details } = req.body;
    
    const logId = `log_${Date.now()}`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(logId, req.user.userId, action, entity_type, entity_id, JSON.stringify(details), req.ip);

    res.json({ success: true });
  });

  app.get("/api/audit-logs", authenticateToken, (req: any, res: any) => {
    const { entity_type, entity_id } = req.query;
    
    let query = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    
    if (entity_type && entity_id) {
      query += ' WHERE entity_type = ? AND entity_id = ?';
      params.push(entity_type, entity_id);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    // SPA fallback - serve index.html for all routes
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html');
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
