// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../../db');
const router = express.Router();

// render login/register pages
router.get('/login', (req, res) => res.render('login'));
router.get('/register', (req, res) => res.render('register'));

// handle register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (name,email,password) VALUES (?, ?, ?)', [name, email, hashed]);
    res.redirect('/login');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.send('Email already registered');
    console.error(err);
    res.status(500).send('Server error');
  }
});

// handle login
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const rows = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.send('User not found');
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.send('Wrong password');
    
    // remove password before storing session
    delete user.password;
    req.session.user = user;
    
    // Configure session duration based on "Remember Me"
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      req.session.cookie.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
      req.session.cookie.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
    // Save the session to ensure cookie settings are persisted
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).send('Server error');
      }
      res.redirect('/events');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.redirect('/login');
  });
});

// forgot password - show form
router.get('/forgot-password', (req, res) => {
  res.render('forgot_password', { message: null, messageType: null });
});

// forgot password - handle submission
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const rows = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      return res.render('forgot_password', { 
        message: 'If this email exists, a reset link has been sent.', 
        messageType: 'success' 
      });
    }
    
    const userId = rows[0].user_id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );
    
    // In a real app, send email with reset link
    // For now, display the link directly
    const resetLink = `http://localhost:3000/reset-password/${token}`;
    console.log('\n=== PASSWORD RESET LINK ===');
    console.log(`Email: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log('===========================\n');
    
    res.render('forgot_password', { 
      message: 'Password reset link has been generated. Check the console for the link.', 
      messageType: 'success' 
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.render('forgot_password', { 
      message: 'An error occurred. Please try again.', 
      messageType: 'error' 
    });
  }
});

// reset password - show form
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const rows = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    
    if (rows.length === 0) {
      return res.render('reset_password', { 
        token,
        message: 'Invalid or expired reset link.', 
        messageType: 'error' 
      });
    }
    
    res.render('reset_password', { token, message: null, messageType: null });
  } catch (err) {
    console.error('Reset password page error:', err);
    res.status(500).send('Server error');
  }
});

// reset password - handle submission
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      return res.render('reset_password', { 
        token,
        message: 'Passwords do not match.', 
        messageType: 'error' 
      });
    }
    
    const rows = await db.query(
      'SELECT user_id FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    
    if (rows.length === 0) {
      return res.render('reset_password', { 
        token,
        message: 'Invalid or expired reset link.', 
        messageType: 'error' 
      });
    }
    
    const userId = rows[0].user_id;
    const hashed = await bcrypt.hash(password, 10);
    
    // Update password
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, userId]);
    
    // Mark token as used
    await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = ?', [token]);
    
    res.render('reset_password', { 
      token,
      message: 'Password reset successful! You can now login with your new password.', 
      messageType: 'success' 
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.render('reset_password', { 
      token: req.params.token,
      message: 'An error occurred. Please try again.', 
      messageType: 'error' 
    });
  }
});

module.exports = router;
