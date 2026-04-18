const express = require('express');
const db = require('../config/db');

const router = express.Router();
const dbp = db.promise();

router.get('/trainer/health', (req, res) => {
  res.json({ status: 'ok', route: 'trainer' });
});

router.post('/trainer/venues', async (req, res) => {
  const { trainer_id, arena_id, is_primary } = req.body;
  if (!trainer_id || !arena_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await dbp.query(
      `
      INSERT INTO trainer_venues (trainer_id, arena_id, is_primary)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)
      `,
      [trainer_id, arena_id, is_primary ? 1 : 0],
    );

    return res.status(201).json({ message: 'Trainer venue linked successfully' });
  } catch (err) {
    console.error('Error linking trainer venue:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

router.get('/trainer/:trainerId/venues', async (req, res) => {
  const { trainerId } = req.params;

  try {
    const [results] = await dbp.query(
      `
      SELECT tv.*, a.name AS arenaName, a.city, a.address
      FROM trainer_venues tv
      JOIN arenas a ON tv.arena_id = a.id
      WHERE tv.trainer_id = ?
      `,
      [trainerId],
    );

    return res.json(results);
  } catch (err) {
    console.error('Error fetching trainer venues:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

router.post('/trainer/time-slots', async (req, res) => {
  const {
    trainer_id,
    court_id,
    session_date,
    start_time,
    end_time,
    capacity,
    price_per_person,
    is_recurring,
    recurring_pattern,
  } = req.body;

  if (!trainer_id || !court_id || !session_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [courtRows] = await dbp.query('SELECT id, arena_id FROM courts WHERE id = ? LIMIT 1', [court_id]);
    if (!courtRows.length) {
      return res.status(400).json({ error: 'Invalid court' });
    }

    const [sportRows] = await dbp.query(
      'SELECT court_type_id FROM court_sports WHERE court_id = ? ORDER BY id ASC LIMIT 1',
      [court_id],
    );

    if (!sportRows.length) {
      return res.status(400).json({ error: 'Court has no sports mapped' });
    }

    const [result] = await dbp.query(
      `
      INSERT INTO trainer_time_slots
      (trainer_id, arena_id, court_id, court_type_id, session_date, start_time, end_time, capacity, price_per_person, is_recurring, recurring_pattern)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        trainer_id,
        courtRows[0].arena_id,
        court_id,
        sportRows[0].court_type_id,
        session_date,
        start_time,
        end_time,
        capacity || 1,
        price_per_person || 0,
        is_recurring ? 1 : 0,
        recurring_pattern || null,
      ],
    );

    return res.status(201).json({ message: 'Time slot created successfully', id: result.insertId });
  } catch (err) {
    console.error('Error creating time slot:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

router.get('/trainer/:trainerId/time-slots', async (req, res) => {
  const { trainerId } = req.params;

  try {
    const [results] = await dbp.query(
      `
      SELECT tts.*, a.name AS arenaName, c.name AS courtName, ct.type_name AS sportName
      FROM trainer_time_slots tts
      JOIN arenas a ON tts.arena_id = a.id
      JOIN courts c ON tts.court_id = c.id
      LEFT JOIN court_types ct ON tts.court_type_id = ct.id
      WHERE tts.trainer_id = ?
      ORDER BY tts.session_date, tts.start_time
      `,
      [trainerId],
    );

    return res.json(results);
  } catch (err) {
    console.error('Error fetching trainer time slots:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

router.post('/trainer-bookings', async (req, res) => {
  const { player_id, trainer_time_slot_id, status } = req.body;
  if (!player_id || !trainer_time_slot_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const statusId = status === 'confirmed' ? 2 : 1;

    const [result] = await dbp.query(
      'INSERT INTO trainer_bookings (player_id, trainer_time_slot_id, status_id) VALUES (?, ?, ?)',
      [player_id, trainer_time_slot_id, statusId],
    );

    return res.status(201).json({ message: 'Trainer booking created successfully', id: result.insertId });
  } catch (err) {
    console.error('Error creating trainer booking:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
