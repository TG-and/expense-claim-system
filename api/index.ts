import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "claimflow-secret-key-2025";

let db: any;
let isInitialized = false;

async function getDb() {
  if (db && isInitialized) return db;
  
  const tursoUrl = process.env.TURSO_DB_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  console.log('TURSO_DB_URL:', tursoUrl ? 'set' : 'not set');
  
  if (!tursoUrl || !tursoToken) {
    throw new Error('Turso environment variables not set');
  }
  
  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken
  });
  
  db = {
    prepare: (sql: string) => ({
      run: (...params: any[]) => libsql.execute({ sql, args: params }),
      get: (...params: any[]) => libsql.execute({ sql, args: params }).then((r: any) => r.rows[0] || null),
      all: (...params: any[]) => libsql.execute({ sql, args: params }).then((r: any) => r.rows)
    }),
    exec: async (sql: string) => {
      const statements = sql.split(';').filter((s: string) => s.trim());
      await Promise.all(statements.map(stmt => stmt.trim() ? libsql.execute({ sql: stmt }) : null));
    }
  };
  
  // Initialize schema if needed
  await initSchema();
  isInitialized = true;
  
  return db;
}

async function initSchema() {
  const schema = `
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  `;
  
  await db.exec(schema);
  
  // Check if we need seed data
  const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  console.log('User count:', userCount?.count);
  
  if (!userCount?.count || userCount.count === 0) {
    console.log('Inserting seed data...');
    await insertSeedData();
  }
}

async function insertSeedData() {
  const hashPassword = (password: string) => bcrypt.hashSync(password, 10);
  
  const users = [
    { id: 'u1', name: 'David Chen', email: 'david@example.com', password: hashPassword('password123'), role: 'Employee', department: 'Engineering', employee_number: 'EMP001', job_title: 'Software Engineer', hire_date: '2023-01-15', cost_center: 'CC001', location: 'San Francisco', manager_id: 'u2' },
    { id: 'u2', name: 'Michael Brown', email: 'michael@example.com', password: hashPassword('password123'), role: 'Manager', department: 'Engineering', employee_number: 'EMP002', job_title: 'Engineering Manager', hire_date: '2021-06-01', cost_center: 'CC001', location: 'San Francisco', manager_id: null },
  ];
  
  for (const user of users) {
    await db.prepare(`
      INSERT INTO users (id, name, email, password, role, department, employee_number, job_title, hire_date, cost_center, location, manager_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(user.id, user.name, user.email, user.password, user.role, user.department, user.employee_number, user.job_title, user.hire_date, user.cost_center, user.location, user.manager_id);
  }
  
  console.log('Seed data inserted');
}

export default async function handler(req: any, res: any) {
  try {
    const db = await getDb();
    
    const { method, url } = req;
    const path = url.split('?')[0];
    
    console.log('Method:', method, 'Path:', path);
    
    // Health check
    if (path === '/api/health') {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    // Debug endpoint - check DB status
    if (path === '/api/debug/db') {
      const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
      return res.status(200).json({ users: userCount?.count || 0 });
    }
    
    // Login
    if (method === 'POST' && path === '/api/auth/login') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
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
      
      return res.status(200).json({
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
    }
    
    // 404
    res.status(404).json({ error: 'Not found' });
    
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
