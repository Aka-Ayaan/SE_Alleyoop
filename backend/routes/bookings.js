const express = require('express');
const db = require('../config/db');

const router = express.Router();
const dbp = db.promise();

router.get('/bookings/health', (req, res) => {
  res.json({ status: 'ok', route: 'bookings' });
});

// Court-based booking creation
router.post('/bookings', async (req, res) => {
  const { userId, courtId, courtTypeId, date, startTime, endTime, status, participantsCount } = req.body;

  if (!userId || !courtId || !courtTypeId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [courtRows] = await dbp.query('SELECT id, arena_id FROM courts WHERE id = ?', [courtId]);
    if (!courtRows.length) {
      return res.status(400).json({ error: 'Invalid court' });
    }

    const [sportRows] = await dbp.query(
      'SELECT id FROM court_sports WHERE court_id = ? AND court_type_id = ? LIMIT 1',
      [courtId, courtTypeId],
    );
    if (!sportRows.length) {
      return res.status(400).json({ error: 'Selected sport is not available on this court' });
    }

    const [overlapRows] = await dbp.query(
      `
      SELECT id
      FROM bookings
      WHERE court_id = ?
        AND booking_date = ?
        AND status_id <> 3
        AND start_time < ?
        AND end_time > ?
      LIMIT 1
      `,
      [courtId, date, endTime, startTime],
    );

    if (overlapRows.length) {
      return res.status(409).json({ error: 'This court is already booked for the selected time' });
    }

    const statusId = status === 'confirmed' ? 2 : 1;

    const [result] = await dbp.query(
      `
      INSERT INTO bookings (player_id, arena_id, court_id, court_type_id, booking_date, start_time, end_time, status_id, participants_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, courtRows[0].arena_id, courtId, courtTypeId, date, startTime, endTime, statusId, participantsCount || 1],
    );

    return res.json({ message: 'Booking created successfully', bookingId: result.insertId });
  } catch (err) {
    console.error('Error creating booking:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

router.get('/bookings/owner', async (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).json({ error: 'Owner ID required' });

  try {
    const [results] = await dbp.query(
      `
      SELECT
        b.id AS bookingId,
        b.arena_id AS arenaId,
        b.court_id AS courtId,
        a.name AS arenaName,
        c.name AS courtName,
        ct.type_name AS sportName,
        p.name AS playerName,
        p.phone AS playerPhone,
        DATE(b.booking_date) AS bookingDate,
        b.start_time AS startTime,
        b.end_time AS endTime,
        bs.status_name AS status,
        (TIME_TO_SEC(TIMEDIFF(b.end_time, b.start_time)) / 3600) * COALESCE(c.price_per_hour, a.pricePerHour) AS revenue
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.id
      JOIN courts c ON b.court_id = c.id
      JOIN court_types ct ON b.court_type_id = ct.id
      JOIN players p ON b.player_id = p.id
      JOIN booking_status bs ON b.status_id = bs.id
      WHERE a.owner_id = ?
      ORDER BY b.booking_date DESC, b.start_time DESC
      `,
      [ownerId],
    );

    return res.json(results);
  } catch (err) {
    console.error('Error fetching owner bookings:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

router.get('/bookings/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const [results] = await dbp.query(
      `
      SELECT
        b.id AS bookingId,
        a.name AS arenaName,
        c.name AS courtName,
        ct.type_name AS sportName,
        DATE(b.booking_date) AS bookingDate,
        b.start_time AS startTime,
        TIME_TO_SEC(TIMEDIFF(b.end_time, b.start_time)) / 60 AS duration,
        bs.status_name AS status
      FROM bookings b
      JOIN arenas a ON b.arena_id = a.id
      JOIN courts c ON b.court_id = c.id
      JOIN court_types ct ON b.court_type_id = ct.id
      JOIN booking_status bs ON b.status_id = bs.id
      WHERE b.player_id = ?
      ORDER BY b.booking_date DESC, b.start_time DESC
      `,
      [userId],
    );

    const formattedBookings = results.map((booking) => ({
      bookingId: booking.bookingId,
      arenaName: booking.arenaName,
      courtName: booking.courtName,
      sportName: booking.sportName,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      duration: Math.round(booking.duration),
      status: booking.status,
    }));

    return res.json({ success: true, bookings: formattedBookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

module.exports = router;
