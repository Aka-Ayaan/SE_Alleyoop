const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Simple health check for bookings routes
router.get('/bookings/health', (req, res) => {
  res.json({ status: 'ok', route: 'bookings' });
});

// =========================================================
// COURT BOOKINGS (simplified: arenas + court_types, no courts table)
// =========================================================
router.post('/bookings', (req, res) => {
  const { userId, arenaId, courtTypeId, date, startTime, endTime, status, participantsCount } = req.body;

  if (!userId || !arenaId || !courtTypeId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const statusId = status === 'confirmed' ? 2 : 1; // booking_status

  const query = `
    INSERT INTO bookings (player_id, arena_id, court_type_id, booking_date, start_time, end_time, status_id, participants_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [userId, arenaId, courtTypeId, date, startTime, endTime, statusId, participantsCount || 1],
    (err, result) => {
      if (err) {
        console.error('Error creating booking:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Booking created successfully', bookingId: result.insertId });
    },
  );
});

// Owner: bookings across all owned arenas (define BEFORE /bookings/:userId to avoid route conflicts)
router.get('/bookings/owner', (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).json({ error: 'Owner ID required' });

  const query = `
    SELECT 
      b.id AS bookingId,
      a.name AS arenaName,
      ct.type_name AS sportName,
      p.name AS playerName,
      p.phone AS playerPhone,
      DATE(b.booking_date) AS bookingDate,
      b.start_time AS startTime,
      b.end_time AS endTime,
      bs.status_name AS status,
      (TIME_TO_SEC(TIMEDIFF(b.end_time, b.start_time)) / 3600) * a.pricePerHour AS revenue
    FROM bookings b
    JOIN arenas a ON b.arena_id = a.id
    JOIN court_types ct ON b.court_type_id = ct.id
    JOIN players p ON b.player_id = p.id
    JOIN booking_status bs ON b.status_id = bs.id
    WHERE a.owner_id = ?
    ORDER BY b.booking_date DESC, b.start_time DESC
  `;

  db.query(query, [ownerId], (err, results) => {
    if (err) {
      console.error('Error fetching owner bookings:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json(results);
  });
});

router.get('/bookings/:userId', (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT 
      b.id AS bookingId,
      a.name AS arenaName,
      ct.type_name AS sportName,
      DATE(b.booking_date) AS bookingDate,
      b.start_time AS startTime,
      TIME_TO_SEC(TIMEDIFF(b.end_time, b.start_time)) / 60 AS duration,
      bs.status_name AS status
    FROM bookings b
    JOIN arenas a ON b.arena_id = a.id
    JOIN court_types ct ON b.court_type_id = ct.id
    JOIN booking_status bs ON b.status_id = bs.id
    JOIN players p ON b.player_id = p.id
    WHERE b.player_id = ?
    ORDER BY b.booking_date DESC, b.start_time DESC
  `;

  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
    }

    const formattedBookings = results.map((booking) => ({
      bookingId: booking.bookingId,
      arenaName: booking.arenaName,
      sportName: booking.sportName,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      duration: Math.round(booking.duration),
      status: booking.status,
    }));

    res.json({ success: true, bookings: formattedBookings });
  });
});

module.exports = router;
