// routes/user-events.js
const express = require('express');
const db = require('../../db');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const router = express.Router();

// Submit event form (GET)
router.get('/submit', ensureAuthenticated, (req, res) => {
  res.render('submit_event');
});

// Submit event (POST)
router.post('/submit', ensureAuthenticated, async (req, res) => {
  try {
    const { title, description, event_date, venue, capacity, fee } = req.body;
    const userId = req.session.user.user_id;
    
    await db.query(
      'INSERT INTO event_submissions (title, description, event_date, venue, capacity, fee, submitted_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, event_date, venue, capacity, fee || 0, userId]
    );
    
    res.render('submit_event', { 
      success: 'Your event has been submitted for review! You will be notified once it is approved.' 
    });
  } catch (err) {
    console.error(err);
    res.render('submit_event', { 
      error: 'Failed to submit event. Please try again.' 
    });
  }
});

// My submitted events
router.get('/my-submissions', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const submissions = await db.query(
      `SELECT s.*, u.name as reviewer_name 
       FROM event_submissions s 
       LEFT JOIN users u ON s.reviewed_by = u.user_id 
       WHERE s.submitted_by = ? 
       ORDER BY s.submitted_at DESC`,
      [userId]
    );
    res.render('my_submissions', { submissions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading submissions');
  }
});

module.exports = router;