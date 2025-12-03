// routes/register.js
const express = require('express');
const db = require('../../db');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const router = express.Router();

// POST /register/:eventId
router.post('/:id', ensureAuthenticated, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.user.user_id;
  const ticketCount = parseInt(req.body.ticket_count, 10) || 1;

  // Debug log for registration attempts
  console.log('[register] attempt', { eventId, userId, ticketCount, sessionUser: !!req.session.user });

  try {
    // get event capacity and seats booked
    const eventResult = await db.query('SELECT * FROM events WHERE event_id = ?', [eventId]);
    if (!eventResult || eventResult.length === 0) {
      console.warn('[register] event not found', { eventId });
      return res.status(404).send('Event not found');
    }
    const event = eventResult[0];

    const sumResult = await db.query('SELECT COALESCE(SUM(ticket_count),0) AS booked FROM registrations WHERE event_id = ?', [eventId]);
    const booked = sumResult[0].booked || 0;
    const seats_left = event.capacity - booked;
    
    if (ticketCount > seats_left) {
      console.warn('[register] not enough seats', { eventId, ticketCount, seats_left });
      return res.status(400).send(`Only ${seats_left} seats left`);
    }

    // check if user already has a registration for this event
    const existing = await db.query('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?', [userId, eventId]);
    if (existing && existing.length > 0) {
      // update existing registration (add tickets)
      const reg = existing[0];
      if (ticketCount > seats_left) {
        console.warn('[register] not enough seats on update', { eventId, ticketCount, seats_left });
        return res.status(400).send(`Only ${seats_left} seats left`);
      }
      const newCount = reg.ticket_count + ticketCount;
      await db.query('UPDATE registrations SET ticket_count = ? WHERE reg_id = ?', [newCount, reg.reg_id]);

      // create payment record for the added tickets
      const addedAmount = (Number(event.fee) || 0) * ticketCount;
      await db.query('INSERT INTO payments (reg_id, amount, status) VALUES (?, ?, ?)', [reg.reg_id, addedAmount, 'completed']);

      console.log('[register] updated existing registration', { reg_id: reg.reg_id, newCount });
      return res.redirect('/register');
    }

    // insert registration
    const regResult = await db.query('INSERT INTO registrations (user_id, event_id, ticket_count) VALUES (?, ?, ?)', [userId, eventId, ticketCount]);
    const regId = regResult.insertId;

    // create payment record (simulate payment)
    const amount = (Number(event.fee) || 0) * ticketCount;
    await db.query('INSERT INTO payments (reg_id, amount, status) VALUES (?, ?, ?)', [regId, amount, 'completed']);

    // redirect to the user's registrations page (mounted at /register)
    console.log('[register] new registration created', { regId });
    res.redirect('/register');
  } catch (err) {
    console.error('[register] error', err && err.stack ? err.stack : err);
    // handle duplicate registration (unique constraint)
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).send('You have already registered for this event.');
    }
    // For easier debugging in development, return stack trace
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).send('Registration failed\n' + (err && err.stack ? err.stack : String(err)));
    }
    res.status(500).send('Registration failed');
  }
});

// my registrations
router.get('/', ensureAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  const rows = await db.query(
    `SELECT r.reg_id, r.ticket_count, r.reg_date, e.title, e.event_date, e.venue, p.amount, p.status
     FROM registrations r
     JOIN events e ON r.event_id = e.event_id
     LEFT JOIN payments p ON p.reg_id = r.reg_id
     WHERE r.user_id = ? ORDER BY r.reg_date DESC`, [userId]);
  res.render('my_events', { registrations: rows });
});

module.exports = router;
