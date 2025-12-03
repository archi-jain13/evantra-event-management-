// routes/events.js
const express = require('express');
const db = require('../../db');
const router = express.Router();

// list events
router.get('/', async (req, res) => {
  const events = await db.query('SELECT * FROM events ORDER BY event_date ASC');

  // Aggregated efficiency stats
  try {
    const usersRow = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
    const totalUsers = usersRow && usersRow[0] ? usersRow[0].totalUsers : 0;

    // total registrations (sum of tickets)
    const regsRow = await db.query('SELECT COALESCE(SUM(ticket_count),0) AS totalTickets FROM registrations');
    const totalRegistrations = regsRow && regsRow[0] ? regsRow[0].totalTickets : 0;

    // overall rating (average) and number of ratings
    const ratingRow = await db.query('SELECT ROUND(AVG(rating),2) AS avgRating, COUNT(*) AS ratingCount FROM reviews');
    const avgRating = ratingRow && ratingRow[0] && ratingRow[0].avgRating !== null ? ratingRow[0].avgRating : null;
    const ratingCount = ratingRow && ratingRow[0] ? ratingRow[0].ratingCount : 0;

    const stats = {
      totalUsers,
      totalRegistrations,
      avgRating,
      ratingCount
    };

    res.render('index', { events, stats, user: req.session.user });
  } catch (err) {
    console.error('Error fetching efficiency stats:', err);
    // fall back to rendering without stats
    res.render('index', { events, user: req.session.user });
  }
});

// event details
router.get('/:id', async (req, res) => {
  const rows = await db.query('SELECT * FROM events WHERE event_id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).send('Event not found');
  const event = rows[0];

  // compute seats booked
  const regs = await db.query('SELECT COALESCE(SUM(ticket_count),0) AS booked FROM registrations WHERE event_id = ?', [event.event_id]);
  const booked = regs[0].booked || 0;
  const seats_left = event.capacity - booked;

  // Fetch reviews for this event
  const reviews = await db.query(
    `SELECT r.*, u.name FROM reviews r JOIN users u ON r.user_id = u.user_id WHERE r.event_id = ? ORDER BY r.created_at DESC`,
    [event.event_id]
  );

  // Check if the logged-in user has already reviewed this event
  let userHasReviewed = false;
  if (req.session.user) {
    const userReview = await db.query('SELECT * FROM reviews WHERE event_id = ? AND user_id = ?', [event.event_id, req.session.user.user_id]);
    userHasReviewed = userReview.length > 0;
  }

  res.render('event_details', {
    event,
    seats_left,
    reviews,
    user: req.session.user,
    userHasReviewed
  });
});

module.exports = router;
