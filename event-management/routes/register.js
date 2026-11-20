// routes/register.js
const express = require('express');
const db = require('../../db');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const router = express.Router();

// POST /register/:eventId (Atomic Transaction with Concurrency Locking)
router.post('/:id', ensureAuthenticated, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.user.user_id;
  const ticketCount = parseInt(req.body.ticket_count, 10) || 1;

  try {
    let outcome = 'booked';

    // Wrap registration in an atomic database transaction with write-lock concurrency protection
    await db.withTransaction(async (tx) => {
      // 1. Fetch event capacity
      const eventResult = await tx.query('SELECT * FROM events WHERE event_id = ?', [eventId]);
      if (!eventResult || eventResult.length === 0) {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
      }
      const event = eventResult[0];

      // 2. Fetch current confirmed seats under atomic write lock
      const sumResult = await tx.query(
        "SELECT COALESCE(SUM(ticket_count),0) AS booked FROM registrations WHERE event_id = ? AND (status IS NULL OR status = 'confirmed')",
        [eventId]
      );
      const booked = sumResult[0].booked || 0;
      const seats_left = event.capacity - booked;
      
      // 3. Strict Concurrency Lock: If seats are claimed by a competing request, trigger rollback
      if (ticketCount > seats_left) {
        const soldOutErr = new Error(`Sold out! Only ${seats_left} seat(s) remaining for this event.`);
        soldOutErr.code = 'SOLD_OUT';
        soldOutErr.seatsLeft = seats_left;
        throw soldOutErr;
      }

      // 4. Check if user already has a registration
      const existing = await tx.query('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?', [userId, eventId]);
      if (existing && existing.length > 0) {
        const reg = existing[0];
        
        // If previous registration was cancelled, reactivate atomically
        if (reg.status === 'cancelled') {
          await tx.query(
            "UPDATE registrations SET ticket_count = ?, status = 'confirmed', reg_date = CURRENT_TIMESTAMP WHERE reg_id = ?",
            [ticketCount, reg.reg_id]
          );
          const amount = (Number(event.fee) || 0) * ticketCount;
          await tx.query('INSERT INTO payments (reg_id, amount, status) VALUES (?, ?, ?)', [reg.reg_id, amount, 'completed']);

          try {
            await tx.query(
              "INSERT INTO audit_logs (action_type, description, user_id, event_id) VALUES (?, ?, ?, ?)",
              ['TICKET_REBOOKED', `User re-booked ${ticketCount} ticket(s) for "${event.title}" (Pass #${reg.reg_id}). Total: ₹${amount.toLocaleString()}.`, userId, eventId]
            );
          } catch (_) {}

          outcome = 'rebooked';
          return;
        }

        // Add tickets to existing active registration
        const newCount = reg.ticket_count + ticketCount;
        await tx.query("UPDATE registrations SET ticket_count = ?, status = 'confirmed' WHERE reg_id = ?", [newCount, reg.reg_id]);
        const addedAmount = (Number(event.fee) || 0) * ticketCount;
        await tx.query('INSERT INTO payments (reg_id, amount, status) VALUES (?, ?, ?)', [reg.reg_id, addedAmount, 'completed']);

        try {
          await tx.query(
            "INSERT INTO audit_logs (action_type, description, user_id, event_id) VALUES (?, ?, ?, ?)",
            ['TICKET_ADDED', `User added ${ticketCount} ticket(s) to booking #${reg.reg_id} for "${event.title}".`, userId, eventId]
          );
        } catch (_) {}

        outcome = 'updated';
        return;
      }

      // 5. Insert new registration and payment records
      const regResult = await tx.query(
        "INSERT INTO registrations (user_id, event_id, ticket_count, status) VALUES (?, ?, ?, 'confirmed')",
        [userId, eventId, ticketCount]
      );
      const regId = regResult.insertId;

      const amount = (Number(event.fee) || 0) * ticketCount;
      await tx.query('INSERT INTO payments (reg_id, amount, status) VALUES (?, ?, ?)', [regId, amount, 'completed']);

      try {
        await tx.query(
          "INSERT INTO audit_logs (action_type, description, user_id, event_id) VALUES (?, ?, ?, ?)",
          ['TICKET_BOOKED', `Confirmed booking for ${ticketCount} ticket(s) to "${event.title}" (Pass #${regId}). Total: ₹${amount.toLocaleString()}.`, userId, eventId]
        );
      } catch (_) {}

      outcome = 'booked';
    });

    res.redirect(`/my-events?${outcome}=true`);
  } catch (err) {
    console.error('[register] atomic transaction error:', err && err.message ? err.message : err);
    if (err.code === 'SOLD_OUT') {
      return res.status(400).send(`Booking failed (Sold Out): ${err.message}`);
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).send('You have already registered for this event.');
    }
    if (err.status === 404) {
      return res.status(404).send('Event not found');
    }
    res.status(500).send('Registration transaction failed\n' + (err && err.stack ? err.stack : String(err)));
  }
});

// my registrations
router.get('/', ensureAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  try {
    const rows = await db.query(
      `SELECT r.reg_id, r.event_id, r.ticket_count, r.reg_date, r.status AS reg_status, e.title, e.event_date, e.venue, e.fee, p.amount, p.status AS payment_status, u.name AS user_name, u.email AS user_email
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN payments p ON p.reg_id = r.reg_id
       WHERE r.user_id = ? ORDER BY r.reg_date DESC`, [userId]);
    res.render('my_events', { 
      registrations: rows || [], 
      user: req.session.user,
      query: req.query 
    });
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.render('my_events', { registrations: [], user: req.session.user, query: req.query });
  }
});

// Self-Service Ticket Cancellation with Seat Restoration & Audit Log
router.post(['/cancel/:regId', '/my-events/cancel/:regId'], ensureAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  const regId = req.params.regId;
  const userRole = req.session.user.role || 'user';

  try {
    // 1. Fetch reservation details
    const rows = await db.query(
      `SELECT r.reg_id, r.event_id, r.ticket_count, r.status AS reg_status, e.title, e.fee, p.amount
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       LEFT JOIN payments p ON p.reg_id = r.reg_id
       WHERE r.reg_id = ? AND (r.user_id = ? OR ? = 'admin')`,
      [regId, userId, userRole]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send('Reservation not found or unauthorized');
    }

    const reg = rows[0];

    if (reg.reg_status === 'cancelled') {
      return res.redirect('/my-events?error=' + encodeURIComponent('This reservation has already been cancelled.'));
    }

    // 2. Mark registration status as cancelled (releases seats immediately)
    await db.query("UPDATE registrations SET status = 'cancelled' WHERE reg_id = ?", [regId]);

    // 3. Mark payment status as refunded
    await db.query("UPDATE payments SET status = 'refunded' WHERE reg_id = ?", [regId]);

    // 4. Record entry in audit_logs
    const refundAmount = reg.amount !== null && reg.amount !== undefined ? reg.amount : (Number(reg.fee || 0) * (reg.ticket_count || 1));
    try {
      await db.query(
        "INSERT INTO audit_logs (action_type, description, user_id, event_id) VALUES (?, ?, ?, ?)",
        [
          'TICKET_CANCELLED',
          `Reservation #${regId} cancelled (${reg.ticket_count} ticket(s) for "${reg.title}"). Refund of ₹${Number(refundAmount).toLocaleString()} processed.`,
          userId,
          reg.event_id
        ]
      );
    } catch (auditErr) {
      console.warn('[cancel] Could not write audit log:', auditErr.message);
    }

    console.log(`[cancel] Successfully cancelled pass #${regId} for user #${userId}.`);
    res.redirect('/my-events?cancelled=true&title=' + encodeURIComponent(reg.title));
  } catch (err) {
    console.error('[cancel] Error during ticket cancellation:', err);
    res.status(500).send('Cancellation failed');
  }
});

// View & Print E-Ticket Pass with QR Code
router.get(['/ticket/:regId', '/my-events/ticket/:regId'], ensureAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  const regId = req.params.regId;
  const userRole = req.session.user.role || 'user';

  try {
    const rows = await db.query(
      `SELECT r.reg_id, r.event_id, r.ticket_count, r.reg_date, r.status AS reg_status, e.title, e.description, e.event_date, e.venue, e.fee, p.amount, p.status AS payment_status, u.name AS user_name, u.email AS user_email
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN payments p ON p.reg_id = r.reg_id
       WHERE r.reg_id = ? AND (r.user_id = ? OR ? = 'admin')`,
      [regId, userId, userRole]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send('E-Ticket Pass not found or unauthorized access.');
    }

    res.render('ticket_pass', { ticket: rows[0], user: req.session.user });
  } catch (err) {
    console.error('Error fetching ticket pass:', err);
    res.status(500).send('Error loading ticket pass');
  }
});

// Download .ics Calendar Invite
router.get(['/calendar/:regId', '/my-events/calendar/:regId'], ensureAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  const regId = req.params.regId;

  try {
    const rows = await db.query(
      `SELECT r.reg_id, e.title, e.description, e.event_date, e.venue
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.reg_id = ? AND (r.user_id = ? OR ? = 'admin')`,
      [regId, userId, req.session.user.role || 'user']
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send('Event not found');
    }

    const ev = rows[0];
    const startDate = new Date(ev.event_date);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours duration

    function formatICSDate(d) {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    const cleanTitle = (ev.title || 'Event').replace(/[\r\n,]/g, ' ');
    const cleanVenue = (ev.venue || 'TBA').replace(/[\r\n,]/g, ' ');
    const cleanDesc = (ev.description || 'Live event admission pass booked via Evantra.').replace(/[\r\n]/g, ' ');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Evantra//Live Event Ticketing//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:EVT-REG-${ev.reg_id}-${Date.now()}@evantra.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${cleanTitle}`,
      `DESCRIPTION:${cleanDesc}`,
      `LOCATION:${cleanVenue}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${ev.reg_id}.ics"`);
    res.send(icsContent);
  } catch (err) {
    console.error('Error generating calendar file:', err);
    res.status(500).send('Error generating calendar invite');
  }
});

module.exports = router;
