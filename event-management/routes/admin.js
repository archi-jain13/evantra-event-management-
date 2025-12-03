// routes/admin.js
const express = require('express');
const db = require('../../db');
const { ensureAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// admin dashboard (list events)
router.get('/', ensureAdmin, async (req, res) => {
  const events = await db.query('SELECT * FROM events ORDER BY event_date DESC');
  res.render('admin_dashboard', { events });
});

// create event form
router.get('/create', ensureAdmin, (req, res) => res.render('create_event'));

// create event POST
router.post('/create', ensureAdmin, async (req, res) => {
  const { title, description, event_date, venue, capacity, fee } = req.body;
  await db.query('INSERT INTO events (title, description, event_date, venue, capacity, fee) VALUES (?, ?, ?, ?, ?, ?)',
    [title, description, event_date, venue, capacity, fee]);
  res.redirect('/admin');
});

// view participants for an event
router.get('/event/:id/participants', ensureAdmin, async (req, res) => {
  const eventId = req.params.id;
  const rows = await db.query(
    `SELECT r.reg_id, r.ticket_count, r.reg_date, u.name, u.email, p.amount, p.status
     FROM registrations r
     JOIN users u ON r.user_id = u.user_id
     LEFT JOIN payments p ON p.reg_id = r.reg_id
     WHERE r.event_id = ?`, [eventId]);
  res.render('participants', { participants: rows, eventId });
});

// Event submissions management
router.get('/submissions', ensureAdmin, async (req, res) => {
  const submissions = await db.query(
    `SELECT s.*, u.name as submitter_name, u.email as submitter_email
     FROM event_submissions s
     JOIN users u ON s.submitted_by = u.user_id
     ORDER BY s.submitted_at DESC`
  );
  res.render('admin_submissions', { submissions });
});

// Approve event submission
router.post('/submissions/:id/approve', ensureAdmin, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const adminId = req.session.user.user_id;
    
    // Get submission details
    const submission = await db.query('SELECT * FROM event_submissions WHERE submission_id = ?', [submissionId]);
    if (submission.length === 0) {
      return res.status(404).send('Submission not found');
    }
    
    const event = submission[0];
    
    // Add to main events table
    await db.query(
      'INSERT INTO events (title, description, event_date, venue, capacity, fee) VALUES (?, ?, ?, ?, ?, ?)',
      [event.title, event.description, event.event_date, event.venue, event.capacity, event.fee]
    );
    
    // Update submission status
    await db.query(
      'UPDATE event_submissions SET status = "approved", reviewed_at = NOW(), reviewed_by = ? WHERE submission_id = ?',
      [adminId, submissionId]
    );
    
    res.redirect('/admin/submissions');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error approving submission');
  }
});

// Reject event submission
router.post('/submissions/:id/reject', ensureAdmin, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const adminId = req.session.user.user_id;
    const { reason } = req.body;
    
    await db.query(
      'UPDATE event_submissions SET status = "rejected", admin_notes = ?, reviewed_at = NOW(), reviewed_by = ? WHERE submission_id = ?',
      [reason, adminId, submissionId]
    );
    
    res.redirect('/admin/submissions');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error rejecting submission');
  }
});

module.exports = router;
