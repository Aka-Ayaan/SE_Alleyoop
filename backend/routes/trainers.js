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

// ---------------------------------------------------------
// Trainer Trainings CRUD for trainer dashboard
// Note: These routes intentionally do NOT require trainer_venues.
// They only require trainer identity and available courts in system.
// ---------------------------------------------------------

// List all available courts with venue and sport info for trainer dropdowns.
router.get('/trainer/courts', async (_req, res) => {
  try {
    const [rows] = await dbp.query(
      `
      SELECT
        c.id AS court_id,
        c.name AS court_name,
        c.arena_id,
        a.name AS arena_name,
        MIN(ct.id) AS court_type_id,
        GROUP_CONCAT(DISTINCT ct.type_name ORDER BY ct.type_name SEPARATOR ', ') AS sport_name
      FROM courts c
      JOIN arenas a ON a.id = c.arena_id
      LEFT JOIN court_sports cs ON cs.court_id = c.id
      LEFT JOIN court_types ct ON ct.id = cs.court_type_id
      WHERE c.status = 'available'
      GROUP BY c.id, c.name, c.arena_id, a.name
      ORDER BY a.name ASC, c.name ASC, cs.id ASC
      `,
    );

    return res.json(rows.map((r) => ({
      courtId: r.court_id,
      arenaId: r.arena_id,
      courtName: r.court_name,
      arenaName: r.arena_name,
      courtTypeId: r.court_type_id,
      sportName: r.sport_name,
      label: `${r.arena_name} - ${r.court_name}${r.sport_name ? ` (${r.sport_name})` : ''}`,
    })));
  } catch (err) {
    console.error('Error fetching trainer courts:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Get all trainings created by a trainer.
router.get('/trainer/trainings', async (req, res) => {
  const trainerId = req.query.trainerId || req.query.trainer_id;
  if (!trainerId) {
    return res.status(400).json({ error: 'trainerId is required' });
  }

  try {
    const [rows] = await dbp.query(
      `
      SELECT
        tts.id,
        tts.trainer_id,
        tts.court_id,
        tts.price_per_person,
        tts.start_time,
        tts.end_time,
        tts.recurring_pattern,
        ct.type_name AS sport_name,
        t.name AS coach_name,
        a.name AS arena_name,
        c.name AS court_name,
        TIMESTAMPDIFF(MINUTE, tts.start_time, tts.end_time) AS duration_minutes
      FROM trainer_time_slots tts
      JOIN trainers t ON t.id = tts.trainer_id
      JOIN arenas a ON a.id = tts.arena_id
      JOIN courts c ON c.id = tts.court_id
      LEFT JOIN court_types ct ON ct.id = tts.court_type_id
      WHERE tts.trainer_id = ?
      ORDER BY tts.id DESC
      `,
      [trainerId],
    );

    const trainings = rows.map((r) => ({
      id: String(r.id),
      trainerId: r.trainer_id,
      courtId: r.court_id,
      courtLabel: `${r.arena_name} - ${r.court_name}${r.sport_name ? ` (${r.sport_name})` : ''}`,
      title: r.recurring_pattern || `${r.sport_name || 'Training'} Session`,
      type: r.sport_name || 'Training',
      coach: r.coach_name || 'Coach',
      pricePerSession: String(r.price_per_person ?? ''),
      duration: String(r.duration_minutes || 60),
      description: '',
      isAvailable: true,
      thumbnail: null,
      gallery: [],
    }));

    return res.json(trainings);
  } catch (err) {
    console.error('Error fetching trainer trainings:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Create a training for trainer dashboard.
// Uses first available court in database to satisfy FK constraints.
router.post('/trainer/trainings', async (req, res) => {
  const trainerId = req.body.trainerId || req.body.trainer_id;
  const {
    title,
    type,
    courtId,
    pricePerSession,
    duration,
  } = req.body;

  if (!trainerId || !courtId || !pricePerSession) {
    return res.status(400).json({ error: 'trainerId, courtId and pricePerSession are required' });
  }

  try {
    // Use selected court from trainer form.
    const [courtRows] = await dbp.query(
      `
      SELECT c.id AS court_id, c.arena_id, cs.court_type_id
      FROM courts c
      LEFT JOIN court_sports cs ON cs.court_id = c.id
      WHERE c.id = ?
      ORDER BY cs.id ASC
      LIMIT 1
      `,
      [courtId],
    );

    if (!courtRows.length) {
      return res.status(400).json({ error: 'No courts configured in system' });
    }

    let courtTypeId = courtRows[0].court_type_id || null;
    if (type) {
      const [typeRows] = await dbp.query(
        'SELECT id FROM court_types WHERE LOWER(type_name) = LOWER(?) LIMIT 1',
        [type],
      );
      if (typeRows.length) {
        courtTypeId = typeRows[0].id;
      }
    }

    if (!courtTypeId) {
      return res.status(400).json({ error: 'Could not resolve sport type' });
    }

    const startTime = '09:00:00';
    const durationMinutes = Math.max(1, Number(duration) || 60);
    const endTotal = (9 * 60) + durationMinutes;
    const endHour = String(Math.floor((endTotal % (24 * 60)) / 60)).padStart(2, '0');
    const endMin = String(endTotal % 60).padStart(2, '0');
    const endTime = `${endHour}:${endMin}:00`;

    const [result] = await dbp.query(
      `
      INSERT INTO trainer_time_slots
      (trainer_id, arena_id, court_id, court_type_id, session_date, start_time, end_time, capacity, price_per_person, is_recurring, recurring_pattern)
      VALUES (?, ?, ?, ?, CURDATE(), ?, ?, 1, ?, 0, ?)
      `,
      [
        trainerId,
        courtRows[0].arena_id,
        courtRows[0].court_id,
        courtTypeId,
        startTime,
        endTime,
        Number(pricePerSession),
        (title || '').slice(0, 50) || null,
      ],
    );

    return res.status(201).json({ message: 'Training created successfully', id: result.insertId });
  } catch (err) {
    console.error('Error creating trainer training:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Update training owned by trainer.
router.put('/trainer/trainings/:trainingId', async (req, res) => {
  const { trainingId } = req.params;
  const trainerId = req.body.trainerId || req.body.trainer_id;
  const { title, type, courtId, pricePerSession, duration } = req.body;

  if (!trainerId || !pricePerSession) {
    return res.status(400).json({ error: 'trainerId and pricePerSession are required' });
  }

  try {
    const [existingRows] = await dbp.query(
      'SELECT id, arena_id, court_id, start_time, court_type_id FROM trainer_time_slots WHERE id = ? AND trainer_id = ? LIMIT 1',
      [trainingId, trainerId],
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: 'Training not found for this trainer' });
    }

    const existing = existingRows[0];
    let selectedCourtId = existing.court_id;
    let selectedArenaId = existing.arena_id;
    let courtTypeId = existing.court_type_id;

    if (courtId) {
      const [courtRows] = await dbp.query(
        `
        SELECT c.id AS court_id, c.arena_id, cs.court_type_id
        FROM courts c
        LEFT JOIN court_sports cs ON cs.court_id = c.id
        WHERE c.id = ?
        ORDER BY cs.id ASC
        LIMIT 1
        `,
        [courtId],
      );

      if (!courtRows.length) {
        return res.status(400).json({ error: 'Invalid courtId' });
      }

      selectedCourtId = courtRows[0].court_id;
      selectedArenaId = courtRows[0].arena_id;
      if (courtRows[0].court_type_id) {
        courtTypeId = courtRows[0].court_type_id;
      }
    }

    if (type) {
      const [typeRows] = await dbp.query(
        'SELECT id FROM court_types WHERE LOWER(type_name) = LOWER(?) LIMIT 1',
        [type],
      );
      if (typeRows.length) {
        courtTypeId = typeRows[0].id;
      }
    }

    const [h = '09', m = '00'] = String(existing.start_time || '09:00:00').split(':');
    const durationMinutes = Math.max(1, Number(duration) || 60);
    const endTotal = (Number(h) * 60) + Number(m) + durationMinutes;
    const endHour = String(Math.floor((endTotal % (24 * 60)) / 60)).padStart(2, '0');
    const endMin = String(endTotal % 60).padStart(2, '0');
    const endTime = `${endHour}:${endMin}:00`;

    await dbp.query(
      `
      UPDATE trainer_time_slots
      SET arena_id = ?, court_id = ?, court_type_id = ?, end_time = ?, price_per_person = ?, recurring_pattern = ?
      WHERE id = ? AND trainer_id = ?
      `,
      [selectedArenaId, selectedCourtId, courtTypeId, endTime, Number(pricePerSession), (title || '').slice(0, 50) || null, trainingId, trainerId],
    );

    return res.json({ message: 'Training updated successfully' });
  } catch (err) {
    console.error('Error updating trainer training:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Delete training owned by trainer.
router.delete('/trainer/trainings/:trainingId', async (req, res) => {
  const { trainingId } = req.params;
  const trainerId = req.query.trainerId || req.query.trainer_id || req.body?.trainerId || req.body?.trainer_id;

  if (!trainerId) {
    return res.status(400).json({ error: 'trainerId is required' });
  }

  try {
    const [result] = await dbp.query(
      'DELETE FROM trainer_time_slots WHERE id = ? AND trainer_id = ?',
      [trainingId, trainerId],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Training not found for this trainer' });
    }

    return res.json({ message: 'Training deleted successfully' });
  } catch (err) {
    console.error('Error deleting trainer training:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
