// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// routes (will create files next)
const authRoutes = require('./event-management/routes/auth');
const eventRoutes = require('./event-management/routes/events');
const registerRoutes = require('./event-management/routes/register');
const adminRoutes = require('./event-management/routes/admin');
const userEventRoutes = require('./event-management/routes/user-events');
const reviewsRoutes = require('./event-management/routes/reviews');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'event-management/public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'event-management/views'));

app.use(session({
  secret: 'event_secret_key', // change this in production
  resave: false,
  saveUninitialized: false,
  rolling: 
  true, // Reset expiration on every response
  cookie: {
    secure: false, // set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours default (overridden when rememberMe is checked)
  }
}));

// expose user to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// mount routes
app.use('/', authRoutes);          // login/register/logout and pages
app.use('/events', eventRoutes);   // listing + details
app.use('/register', registerRoutes); // registration
app.use('/admin', adminRoutes);    // admin panel
app.use('/user-events', userEventRoutes); // user event submissions
app.use('/reviews', reviewsRoutes); // event reviews

// Backwards-compatibility redirect for older links
app.get('/my_events', (req, res) => res.redirect('/register'));

app.get('/', (req, res) => res.redirect('/events'));

// Dev helper: test login (creates a session user) - only in non-production
if (process.env.NODE_ENV !== 'production') {
  app.get('/__test_login', (req, res) => {
    // create a test user session. Adjust user_id and name if needed.
    req.session.user = { user_id: 3, name: 'DEV_USER', email: 'dev@example.com', role: 'user' };
    res.send('Test user logged in as DEV_USER (user_id=3)');
  });
}

// Dev helper: perform a registration without authentication for debugging.
// POST /__dev/register/:id  { user_id, ticket_count }
app.post('/__dev/register/:id', express.urlencoded({ extended: false }), async (req, res) => {
  const eventId = req.params.id;
  const userId = parseInt(req.body.user_id, 10);
  const ticketCount = parseInt(req.body.ticket_count, 10) || 1;
  if (!userId) return res.status(400).json({ error: 'user_id required' });

  try {
    const eventResult = await db.query('SELECT * FROM events WHERE event_id = ?', [eventId]);
    if (!eventResult || eventResult.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = eventResult[0];
    const sumResult = await db.query('SELECT COALESCE(SUM(ticket_count),0) AS booked FROM registrations WHERE event_id = ?', [eventId]);
    const booked = sumResult[0].booked || 0;
    const seats_left = event.capacity - booked;
    if (ticketCount > seats_left) return res.status(400).json({ error: `Only ${seats_left} seats left` });

    const existing = await db.query('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?', [userId, eventId]);
    if (existing && existing.length > 0) {
      const reg = existing[0];
      const newCount = reg.ticket_count + ticketCount;
      await db.query('UPDATE registrations SET ticket_count = ? WHERE reg_id = ?', [newCount, reg.reg_id]);
      const addedAmount = (Number(event.fee) || 0) * ticketCount;
      await db.query('INSERT INTO payments (reg_id, amount, status) VALUES (?, ?, ?)', [reg.reg_id, addedAmount, 'completed']);
      return res.json({ success: true, action: 'updated', reg_id: reg.reg_id, ticket_count: newCount });
    }

    const regResult = await db.query('INSERT INTO registrations (user_id, event_id, ticket_count) VALUES (?, ?, ?)', [userId, eventId, ticketCount]);
    const regId = regResult.insertId;
    const amount = (Number(event.fee) || 0) * ticketCount;
    await db.query('INSERT INTO payments (reg_id, amount, status) VALUES (?, ?, ?)', [regId, amount, 'completed']);
    return res.json({ success: true, action: 'created', reg_id: regId });
  } catch (err) {
    console.error('[__dev/register] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Server error', detail: err && err.message });
  }
});

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
