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
  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // Initialize DB
  initDb();

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
      const request = db.prepare('SELECT step FROM requests WHERE id = ?').get(requestId) as { step: number };
      if (!request) return res.status(404).json({ error: "Request not found" });

      const approvalId = `a${Math.floor(Math.random() * 10000)}`;
      
      db.transaction(() => {
        db.prepare(`
          INSERT INTO approvals (id, request_id, approver_id, status, step, comments)
          VALUES (?, ?, ?, 'Approved', ?, ?)
        `).run(approvalId, requestId, approver_id, request.step, comments || '');

        const nextStep = request.step + 1;
        const newStatus = nextStep > 3 ? 'Approved' : (nextStep === 2 ? 'Pending Finance' : 'Processing Payment');
        
        db.prepare('UPDATE requests SET step = ?, status = ? WHERE id = ?').run(nextStep, newStatus, requestId);
      })();
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve request" });
    }
  });

  app.post("/api/requests/:id/reject", (req, res) => {
    const { approver_id, comments } = req.body;
    const requestId = req.params.id;
    
    try {
      const request = db.prepare('SELECT step FROM requests WHERE id = ?').get(requestId) as { step: number };
      if (!request) return res.status(404).json({ error: "Request not found" });

      const approvalId = `a${Math.floor(Math.random() * 10000)}`;
      
      db.transaction(() => {
        db.prepare(`
          INSERT INTO approvals (id, request_id, approver_id, status, step, comments)
          VALUES (?, ?, ?, 'Rejected', ?, ?)
        `).run(approvalId, requestId, approver_id, request.step, comments || '');

        db.prepare('UPDATE requests SET status = ? WHERE id = ?').run('Rejected', requestId);
      })();
      
      res.json({ success: true });
    } catch (error) {
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

  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
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
