// routes/events.js
const express = require('express');
const db = require('../../db');
const router = express.Router();

// list events with pagination, search, category, and price filters
router.get('/', async (req, res) => {
  try {
    if (typeof db.refreshPastEvents === 'function') {
      await db.refreshPastEvents();
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(60, Math.max(6, parseInt(req.query.limit, 10) || 24));
    const offset = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const category = (req.query.category || '').trim().toLowerCase();
    const price = (req.query.price || '').trim().toLowerCase();
    const sort = (req.query.sort || 'date_asc').trim().toLowerCase();

    const whereClauses = [];
    const params = [];

    // Search query
    if (search) {
      whereClauses.push('(title LIKE ? OR venue LIKE ? OR description LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    // Category filter
    if (category) {
      if (category === 'technology') {
        whereClauses.push('(title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ? OR description LIKE ?)');
        params.push('%tech%', '%ai%', '%web%', '%cloud%', '%code%', '%hackathon%', '%technology%');
      } else if (category === 'entertainment' || category === 'music') {
        whereClauses.push('(title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ?)');
        params.push('%music%', '%festival%', '%concert%', '%comedy%', '%symphony%', '%band%');
      } else if (category === 'business') {
        whereClauses.push('(title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ?)');
        params.push('%business%', '%summit%', '%startup%', '%pitch%', '%invest%');
      } else if (category === 'creative') {
        whereClauses.push('(title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ?)');
        params.push('%art%', '%photo%', '%design%', '%creative%');
      } else if (category === 'sports') {
        whereClauses.push('(title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ?)');
        params.push('%marathon%', '%run%', '%swim%', '%match%', '%regatta%');
      } else if (category === 'civic') {
        whereClauses.push('(title LIKE ? OR title LIKE ? OR title LIKE ? OR title LIKE ?)');
        params.push('%parade%', '%rally%', '%march%', '%community%');
      }
    }

    // Price filter
    if (price === 'free') {
      whereClauses.push('fee = 0');
    } else if (price === 'under-500') {
      whereClauses.push('fee > 0 AND fee <= 500');
    } else if (price === '500-1500') {
      whereClauses.push('fee > 500 AND fee <= 1500');
    } else if (price === 'over-1500') {
      whereClauses.push('fee > 1500');
    }

    // Sorting
    let orderBy = 'event_date ASC';
    if (sort === 'date_desc') orderBy = 'event_date DESC';
    else if (sort === 'price_asc') orderBy = 'fee ASC, event_date ASC';
    else if (sort === 'price_desc') orderBy = 'fee DESC, event_date ASC';
    else if (sort === 'title_asc') orderBy = 'title ASC';
    else if (sort === 'capacity_desc') orderBy = 'capacity DESC';

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Total count for pagination
    const countResult = await db.query(`SELECT COUNT(*) AS total FROM events ${whereSql}`, params);
    const totalEvents = countResult && countResult[0] ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalEvents / limit) || 1;

    // Paginated events
    const events = await db.query(
      `SELECT * FROM events ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Efficiency stats
    let stats = {
      totalUsers: 0,
      totalRegistrations: 0,
      avgRating: 4.9,
      ratingCount: 15
    };

    try {
      const usersRow = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
      stats.totalUsers = usersRow && usersRow[0] ? usersRow[0].totalUsers : 0;

      const regsRow = await db.query("SELECT COALESCE(SUM(ticket_count),0) AS totalTickets FROM registrations WHERE (status IS NULL OR status = 'confirmed')");
      stats.totalRegistrations = regsRow && regsRow[0] ? regsRow[0].totalTickets : 0;

      const ratingRow = await db.query('SELECT ROUND(AVG(rating),2) AS avgRating, COUNT(*) AS ratingCount FROM reviews');
      if (ratingRow && ratingRow[0] && ratingRow[0].avgRating !== null) {
        stats.avgRating = ratingRow[0].avgRating;
        stats.ratingCount = ratingRow[0].ratingCount;
      }
    } catch (statErr) {
      console.warn('Could not load full stats:', statErr.message);
    }

    res.render('index', {
      events: events || [],
      stats,
      pagination: {
        page,
        limit,
        totalEvents,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1
      },
      filters: {
        search,
        category,
        price,
        sort
      },
      user: req.session.user
    });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).render('index', {
      events: [],
      stats: null,
      pagination: { page: 1, limit: 24, totalEvents: 0, totalPages: 1 },
      filters: { search: '', category: '', price: '', sort: 'date_asc' },
      user: req.session.user
    });
  }
});

// event details
router.get('/:id', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM events WHERE event_id = ?', [req.params.id]);
    if (!rows || !rows[0]) return res.status(404).send('Event not found');
    const event = rows[0];

    // compute seats booked (only counting active confirmed bookings)
    const regs = await db.query("SELECT COALESCE(SUM(ticket_count),0) AS booked FROM registrations WHERE event_id = ? AND (status IS NULL OR status = 'confirmed')", [event.event_id]);
    const booked = regs && regs[0] ? (regs[0].booked || 0) : 0;
    const seats_left = event.capacity - booked;

    // Fetch reviews for this event
    const reviews = await db.query(
      `SELECT r.*, u.name FROM reviews r JOIN users u ON r.user_id = u.user_id WHERE r.event_id = ? ORDER BY r.created_at DESC`,
      [event.event_id]
    ) || [];

    // Check if the logged-in user has already reviewed this event
    let userHasReviewed = false;
    if (req.session.user) {
      const userReview = await db.query('SELECT * FROM reviews WHERE event_id = ? AND user_id = ?', [event.event_id, req.session.user.user_id]);
      userHasReviewed = userReview && userReview.length > 0;
    }

    res.render('event_details', {
      event,
      seats_left,
      reviews,
      user: req.session.user,
      userHasReviewed
    });
  } catch (err) {
    console.error('Error fetching event details:', err);
    res.status(500).send('Error loading event details');
  }
});

module.exports = router;
