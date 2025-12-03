// routes/reviews.js
const express = require('express');
const db = require('../../db');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const router = express.Router();

// Submit a review (POST)
router.post('/:eventId', ensureAuthenticated, async (req, res) => {
  const eventId = req.params.eventId;
  const userId = req.session.user.user_id;
  const { rating, comment } = req.body;
  try {
    // Prevent duplicate reviews by the same user for the same event
    const existing = await db.query('SELECT * FROM reviews WHERE event_id = ? AND user_id = ?', [eventId, userId]);
    if (existing.length > 0) {
      return res.status(400).send('You have already reviewed this event.');
    }
    await db.query('INSERT INTO reviews (event_id, user_id, rating, comment) VALUES (?, ?, ?, ?)', [eventId, userId, rating, comment]);
    res.redirect('/events/' + eventId);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting review');
  }
});

// Get reviews for an event (AJAX or server-side render)
router.get('/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const reviews = await db.query(
      `SELECT r.*, u.name FROM reviews r JOIN users u ON r.user_id = u.user_id WHERE r.event_id = ? ORDER BY r.created_at DESC`,
      [eventId]
    );
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

module.exports = router;
