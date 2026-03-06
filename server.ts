import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb, db } from "./src/db/index.js";
import multer from "multer";
import path from "path";
import fs from "fs";

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

  app.use(express.json());
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
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
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

  app.post("/api/auth/logout", (req, res) => {
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = db.prepare('SELECT id, name, email, role, department, avatar FROM users WHERE id = ?').get(userId) as any;
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

  app.get("/api/users", (req, res) => {
    const users = db.prepare('SELECT id, name, email, role, department, avatar FROM users').all();
    res.json(users);
  });

  // Claims API
  app.get("/api/claims", (req, res) => {
    const claims = db.prepare(`
      SELECT c.*, u.name as claimant_name, u.department, u.avatar
      FROM claims c
      JOIN users u ON c.claimant_id = u.id
      ORDER BY c.created_at DESC
    `).all();
    
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
          const instanceId = `wfi-${Math.floor(1000 + Math.random() * 9000)}`;
          db.prepare(`
            INSERT INTO workflow_instances (id, workflow_id, entity_type, entity_id, current_node_id, status)
            VALUES (?, ?, 'claim', ?, ?, 'running')
          `).run(instanceId, workflowId, claimId, currentNodeId);
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
    const { approver_id, comments } = req.body;
    
    try {
      const claim = db.prepare('SELECT status, step FROM claims WHERE id = ?').get(claimId) as { status: string; step: number };
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      
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
          `).run(`APR-${Math.floor(1000 + Math.random() * 9000)}`, item.id, approver_id || 'u1', 'Approved', newStep - 1, comments || null);
          
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
    const { approver_id, comments } = req.body;
    
    try {
      const claim = db.prepare('SELECT status FROM claims WHERE id = ?').get(claimId) as { status: string; step: number };
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      
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
          `).run(`APR-${Math.floor(1000 + Math.random() * 9000)}`, item.id, approver_id || 'u1', 'Rejected', 99, comments || 'Rejected');
          
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
