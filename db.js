// db.js
const mysql = require('mysql');
const { promisify } = require('util');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'arch2006#',
  database: process.env.DB_NAME || 'event_db',
  acquireTimeout: 60000,
  timeout: 60000,
  connectionLimit: 10
});

// Promisify for easier async/await usage
pool.getConnection = promisify(pool.getConnection).bind(pool);
pool.query = promisify(pool.query).bind(pool);

module.exports = pool;
