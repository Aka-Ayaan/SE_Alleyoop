const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Simple health check for trainers routes
router.get('/trainer/health', (req, res) => {
  res.json({ status: 'ok', route: 'trainer' });
});

// =========================================================
// TRAINERS: VENUES, SLOTS, BOOKINGS
// =========================================================
// Trainer links to an arena
router.post('/trainer/venues', (req, res) => {
  const { trainer_id, arena_id, is_primary } = req.body;
  if (!trainer_id || !arena_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO trainer_venues (trainer_id, arena_id, is_primary)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)
  `;

  db.query(query, [trainer_id, arena_id, is_primary ? 1 : 0], (err) => {
    if (err) {
      console.error('Error linking trainer venue:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.status(201).json({ message: 'Trainer venue linked successfully' });
  });
});

// Get trainer venues
router.get('/trainer/:trainerId/venues', (req, res) => {
  const { trainerId } = req.params;

  const query = `
    SELECT tv.*, a.name AS arenaName, a.city, a.address
    FROM trainer_venues tv
    JOIN arenas a ON tv.arena_id = a.id
    WHERE tv.trainer_id = ?
  `;

  db.query(query, [trainerId], (err, results) => {
    if (err) {
      console.error('Error fetching trainer venues:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json(results);
  });
});

// Trainer creates time slot
router.post('/trainer/time-slots', (req, res) => {
  const {
    trainer_id,
    arena_id,
    court_id,
    session_date,
    start_time,
    end_time,
    capacity,
    price_per_person,
    is_recurring,
    recurring_pattern,
  } = req.body;

  if (!trainer_id || !arena_id || !session_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO trainer_time_slots 
    (trainer_id, arena_id, court_id, session_date, start_time, end_time, capacity, price_per_person, is_recurring, recurring_pattern)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      trainer_id,
      arena_id,
      court_id || null,
      session_date,
      start_time,
      end_time,
      capacity || 1,
      price_per_person || 0,
      is_recurring ? 1 : 0,
      recurring_pattern || null,
    ],
    (err, result) => {
      if (err) {
        console.error('Error creating time slot:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.status(201).json({ message: 'Time slot created successfully', id: result.insertId });
    },
  );
});

// Get trainer time slots
router.get('/trainer/:trainerId/time-slots', (req, res) => {
  const { trainerId } = req.params;

  const query = `
    SELECT tts.*, a.name AS arenaName, c.name AS courtName
    FROM trainer_time_slots tts
    JOIN arenas a ON tts.arena_id = a.id
    LEFT JOIN courts c ON tts.court_id = c.id
    WHERE tts.trainer_id = ?
    ORDER BY tts.session_date, tts.start_time
  `;

  db.query(query, [trainerId], (err, results) => {
    if (err) {
      console.error('Error fetching trainer time slots:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json(results);
  });
});

// Player books trainer session
router.post('/trainer-bookings', (req, res) => {
  const { player_id, trainer_time_slot_id, status } = req.body;
  if (!player_id || !trainer_time_slot_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const statusId = status === 'confirmed' ? 2 : 1; // reuse booking_status

  const query = `
    INSERT INTO trainer_bookings (player_id, trainer_time_slot_id, status_id)
    VALUES (?, ?, ?)
  `;

  db.query(query, [player_id, trainer_time_slot_id, statusId], (err, result) => {
    if (err) {
      console.error('Error creating trainer booking:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.status(201).json({ message: 'Trainer booking created successfully', id: result.insertId });
  });
});

module.exports = router;
