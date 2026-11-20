// db.js
const mysql = require('mysql');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

// 1. Automatically load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  } catch (err) {
    console.warn('Could not read .env file:', err.message);
  }
}

let activeEngine = 'detecting'; // 'mysql' | 'sqlite'
let sqliteDb = null;
let mysqlPool = null;
let initPromise = null;

// Date column list to automatically convert to Date instances
const DATE_COLUMNS = new Set([
  'event_date',
  'created_at',
  'reg_date',
  'submitted_at',
  'reviewed_at',
  'expires_at',
  'payment_date'
]);

function convertDates(row) {
  if (!row || typeof row !== 'object') return row;
  for (const col of Object.keys(row)) {
    if (DATE_COLUMNS.has(col) && row[col] !== null && row[col] !== undefined) {
      const d = new Date(row[col]);
      if (!isNaN(d.getTime())) {
        row[col] = d;
      }
    }
  }
  return row;
}

function formatSqlDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function refreshPastEvents() {
  try {
    await ensureReady();
    const now = new Date();
    const rows = await pool.query('SELECT event_id, title, event_date FROM events ORDER BY event_id ASC');
    if (!rows || rows.length === 0) return;

    const hasPast = rows.some(r => new Date(r.event_date) <= now);
    if (!hasPast) return;

    console.log('[DB] Updating past event dates to ensure all listed events are current and upcoming...');
    const intervals = [2, 5, 9, 14, 21, 28, 35, 42];
    for (let i = 0; i < rows.length; i++) {
      const ev = rows[i];
      const evDate = new Date(ev.event_date);
      if (evDate <= now) {
        const daysAhead = intervals[i % intervals.length];
        const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
        futureDate.setHours(10 + (i % 8), 0, 0, 0);
        const formatted = formatSqlDate(futureDate);
        await pool.query('UPDATE events SET event_date = ? WHERE event_id = ?', [formatted, ev.event_id]);
        console.log(`[DB] Rolled event #${ev.event_id} (${ev.title}) forward to ${formatted}`);
      }
    }
  } catch (err) {
    console.warn('[DB] Could not refresh past events:', err.message);
  }
}

function initSQLite() {
  const { DatabaseSync } = require('node:sqlite');
  const sqliteFile = path.join(__dirname, 'event_db.sqlite');
  console.log(`[DB] Initializing local SQLite database at: ${sqliteFile}`);
  
  sqliteDb = new DatabaseSync(sqliteFile);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  
  // Custom functions to match MySQL
  sqliteDb.function('NOW', () => {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  });

  // Create tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATETIME NOT NULL,
      venue TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      fee NUMERIC DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS registrations (
      reg_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      ticket_count INTEGER DEFAULT 1,
      status TEXT DEFAULT 'confirmed',
      reg_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
      UNIQUE (user_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      reg_id INTEGER NOT NULL,
      amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reg_id) REFERENCES registrations(reg_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_submissions (
      submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      event_date DATETIME NOT NULL,
      venue TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      fee NUMERIC DEFAULT 0.00,
      submitted_by INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME NULL,
      reviewed_by INTEGER NULL,
      FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      review_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      description TEXT NOT NULL,
      user_id INTEGER,
      event_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL
    );
  `);

  // Migration check: ensure 'status' column exists in registrations
  try {
    const regCols = sqliteDb.prepare("PRAGMA table_info(registrations)").all();
    const hasStatus = regCols.some(c => c.name === 'status');
    if (!hasStatus) {
      sqliteDb.exec("ALTER TABLE registrations ADD COLUMN status TEXT DEFAULT 'confirmed'");
    }
  } catch (err) {
    // column may already exist
  }

  // Seed sample events if empty
  const countRow = sqliteDb.prepare('SELECT COUNT(*) as count FROM events').get();
  if (!countRow || countRow.count === 0) {
    console.log('[DB] Seeding sample events with dynamic upcoming dates into SQLite database...');
    const seedStmt = sqliteDb.prepare(
      'INSERT INTO events (title, description, event_date, venue, capacity, fee) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const futureDate = (daysAhead, hour = 10) => {
      const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
      d.setHours(hour, 0, 0, 0);
      return formatSqlDate(d);
    };
    const sampleEvents = [
      ['AI & Machine Learning Summit 2026', 'Explore the latest advancements in artificial intelligence and machine learning with industry experts. Learn about neural networks, deep learning, and practical AI applications.', futureDate(2, 10), 'Tech Innovation Center', 300, 1500.00],
      ['Music & Arts Festival', 'Three-day music festival featuring top artists from around the world with live performances and interactive art exhibitions.', futureDate(5, 18), 'City Park Amphitheater', 1000, 2500.00],
      ['Startup Pitch Night', 'Entrepreneurs pitch their innovative ideas to top venture capital investors and angel networks.', futureDate(9, 19), 'Business Hub Auditorium', 200, 500.00],
      ['Web & Cloud Bootcamp', 'Master full-stack web development with Node.js, React, and cloud architectures through practical hands-on workshops.', futureDate(14, 10), 'Coding Academy Lab', 150, 1200.00],
      ['Food & Culture Fair', 'Celebrate diverse cultures through international cuisine, live cultural music, and artisan exhibits.', futureDate(21, 12), 'Downtown Square', 500, 0.00]
    ];
    for (const ev of sampleEvents) {
      seedStmt.run(...ev);
    }
  }

  // Seed default admin and test user if not present
  try {
    const bcrypt = require('bcryptjs');
    const adminCheck = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get('admin@example.com');
    if (!adminCheck) {
      const adminHash = bcrypt.hashSync('admin123', 10);
      sqliteDb.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
        'Admin User', 'admin@example.com', adminHash, 'admin'
      );
      console.log('[DB] Created default admin: admin@example.com / admin123');
    }

    const userCheck = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get('user@example.com');
    if (!userCheck) {
      const userHash = bcrypt.hashSync('user123', 10);
      sqliteDb.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
        'Demo User', 'user@example.com', userHash, 'user'
      );
      console.log('[DB] Created demo user: user@example.com / user123');
    }
  } catch (err) {
    console.warn('[DB] Could not seed admin user:', err.message);
  }

  activeEngine = 'sqlite';
  console.log('[DB] SQLite database ready.');
}

function ensureReady() {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    // If user explicitly configured SQLite
    if (process.env.DB_CLIENT === 'sqlite') {
      initSQLite();
      return resolve();
    }

    // Try MySQL first
    const poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'arch2006#',
      database: process.env.DB_NAME || 'event_db',
      connectionLimit: 10,
      connectTimeout: 2000,
      acquireTimeout: 3000
    };

    const tempPool = mysql.createPool(poolConfig);
    tempPool.getConnection((err, connection) => {
      if (err) {
        console.warn(`[DB] MySQL connection to ${poolConfig.host}:${poolConfig.port} failed (${err.code || err.message}).`);
        console.log('[DB] Automatically falling back to embedded SQLite database.');
        try { tempPool.end(); } catch (e) {}
        initSQLite();
        return resolve();
      }

      console.log(`[DB] Connected to MySQL database "${poolConfig.database}" at ${poolConfig.host}:${poolConfig.port}`);
      connection.release();
      mysqlPool = tempPool;
      activeEngine = 'mysql';
      resolve();
    });
  });

  return initPromise;
}

// Start detection immediately in background and refresh any past events
ensureReady().then(() => refreshPastEvents()).catch(console.error);

// Execute query using active engine
async function executeQuery(sql, values) {
  await ensureReady();

  if (activeEngine === 'mysql' && mysqlPool) {
    return new Promise((resolve, reject) => {
      mysqlPool.query(sql, values, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  // SQLite execution
  return new Promise((resolve, reject) => {
    try {
      let normalizedSql = sql.trim();
      // Replace MySQL syntax variants
      normalizedSql = normalizedSql.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT OR IGNORE INTO');
      
      const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(normalizedSql);
      const args = Array.isArray(values) ? values : (values !== undefined ? [values] : []);

      const stmt = sqliteDb.prepare(normalizedSql);
      if (isSelect) {
        const rows = stmt.all(...args);
        const mapped = rows.map(convertDates);
        return resolve(mapped);
      } else {
        const info = stmt.run(...args);
        return resolve({
          insertId: info.lastInsertRowid !== undefined ? Number(info.lastInsertRowid) : 0,
          affectedRows: info.changes || 0,
          changedRows: info.changes || 0
        });
      }
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        err.code = 'ER_DUP_ENTRY';
      }
      return reject(err);
    }
  });
}

// Exported object compatible with mysql pool
const pool = {
  query: function(sql, values, callback) {
    let cb = callback;
    let params = values;

    if (typeof values === 'function') {
      cb = values;
      params = [];
    }

    const p = executeQuery(sql, params);

    if (typeof cb === 'function') {
      p.then(results => cb(null, results))
       .catch(err => cb(err, null));
      return;
    }

    return p;
  },

  getConnection: async function(callback) {
    await ensureReady();
    if (activeEngine === 'mysql' && mysqlPool) {
      if (typeof callback === 'function') {
        return mysqlPool.getConnection(callback);
      }
      return promisify(mysqlPool.getConnection).bind(mysqlPool)();
    }

    const fakeConn = {
      query: (s, v, c) => pool.query(s, v, c),
      release: () => {},
      destroy: () => {}
    };

    if (typeof callback === 'function') {
      return callback(null, fakeConn);
    }
    return fakeConn;
  },

  end: function(cb) {
    if (mysqlPool) mysqlPool.end(cb);
    else if (sqliteDb) {
      try { sqliteDb.close(); } catch (e) {}
      if (cb) cb();
    } else if (cb) cb();
  },

  // Atomic Database Transaction with Concurrency Lock
  withTransaction: async function(callback) {
    await ensureReady();

    if (activeEngine === 'mysql' && mysqlPool) {
      const conn = await promisify(mysqlPool.getConnection).bind(mysqlPool)();
      const beginTrans = promisify(conn.beginTransaction).bind(conn);
      const commitTrans = promisify(conn.commit).bind(conn);
      const rollbackTrans = promisify(conn.rollback).bind(conn);
      const queryTrans = promisify(conn.query).bind(conn);

      try {
        await beginTrans();
        const client = {
          query: (sql, values) => queryTrans(sql, values)
        };
        const result = await callback(client);
        await commitTrans();
        conn.release();
        return result;
      } catch (err) {
        await rollbackTrans();
        conn.release();
        throw err;
      }
    }

    // SQLite: BEGIN IMMEDIATE TRANSACTION acquires immediate write lock to prevent race conditions
    sqliteDb.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const client = {
        query: (sql, values) => executeQuery(sql, values)
      };
      const result = await callback(client);
      sqliteDb.exec('COMMIT');
      return result;
    } catch (err) {
      try { sqliteDb.exec('ROLLBACK'); } catch (_) {}
      throw err;
    }
  },

  refreshPastEvents: refreshPastEvents
};

module.exports = pool;
