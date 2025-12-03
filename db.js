// db.js
const mysql = require('mysql');
const { promisify } = require('util');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'arch2006#',       // <-- set your MySQL password
  database: 'event_db',
  acquireTimeout: 60000,
  timeout: 60000,
  connectionLimit: 10
});

// Promisify for easier async/await usage
pool.getConnection = promisify(pool.getConnection).bind(pool);
pool.query = promisify(pool.query).bind(pool);

module.exports = pool;
