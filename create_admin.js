// create_admin.js
const bcrypt = require('bcryptjs');
const db = require('./db');

async function createAdmin() {
  try {
    // Create admin user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Check if admin already exists
    const existingAdmin = await db.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    // Insert admin user
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Admin User', adminEmail, hashedPassword, 'admin']
    );
    
    console.log('Admin user created successfully');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
