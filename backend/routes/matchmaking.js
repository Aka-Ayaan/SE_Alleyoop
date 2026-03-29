const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Simple health check for matchmaking routes
router.get('/matchmaking/health', (req, res) => {
  res.json({ status: 'ok', route: 'matchmaking' });
});

// =========================================================
// MATCHMAKING
// =========================================================
// Player creates matchmaking request
router.post('/matchmaking/requests', (req, res) => {
  const {
    player_id,
    court_type_id,
    city,
    arena_id,
    desired_date,
    start_time,
    end_time,
    preferred_match_size,
    min_skill_level_id,
    max_skill_level_id,
  } = req.body;

  if (!player_id || !court_type_id || !desired_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO matchmaking_requests (
      player_id, court_type_id, city, arena_id, desired_date, start_time, end_time,
      preferred_match_size, min_skill_level_id, max_skill_level_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      player_id,
      court_type_id,
      city || null,
      arena_id || null,
      desired_date,
      start_time,
      end_time,
      preferred_match_size || 2,
      min_skill_level_id || null,
      max_skill_level_id || null,
    ],
    (err, result) => {
      if (err) {
        console.error('Error creating matchmaking request:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.status(201).json({ message: 'Matchmaking request created', id: result.insertId });
    },
  );
});

// Get open matchmaking requests filtered by sport/date/location and skill
router.get('/matchmaking/requests/open', (req, res) => {
  const { court_type_id, desired_date, city, arena_id, min_skill_level_id, max_skill_level_id } = req.query;

  const params = [];
  let where = 'mr.status = "open"';

  if (court_type_id) {
    where += ' AND mr.court_type_id = ?';
    params.push(court_type_id);
  }
  if (desired_date) {
    where += ' AND mr.desired_date = ?';
    params.push(desired_date);
  }
  if (city) {
    where += ' AND mr.city = ?';
    params.push(city);
  }
  if (arena_id) {
    where += ' AND mr.arena_id = ?';
    params.push(arena_id);
  }

  const query = `
    SELECT 
      mr.*, p.name AS playerName, p.skill_level_id, p.rating_avg
    FROM matchmaking_requests mr
    JOIN players p ON mr.player_id = p.id
    WHERE ${where}
    ORDER BY mr.desired_date, mr.start_time
  `;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching matchmaking requests:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const filtered = results.filter((row) => {
      if (min_skill_level_id && row.skill_level_id && row.skill_level_id < Number(min_skill_level_id)) {
        return false;
      }
      if (max_skill_level_id && row.skill_level_id && row.skill_level_id > Number(max_skill_level_id)) {
        return false;
      }
      return true;
    });

    return res.json(filtered);
  });
});

// Create a matchmaking group (backend algorithm groups players and calls this)
router.post('/matchmaking/groups', (req, res) => {
  const { court_type_id, arena_id, booking_id, players } = req.body; // players: [{ player_id, from_request_id, role }]

  if (!court_type_id || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const insertGroup = `
    INSERT INTO matchmaking_groups (court_type_id, arena_id, booking_id, status)
    VALUES (?, ?, ?, 'pending')
  `;

  db.query(insertGroup, [court_type_id, arena_id || null, booking_id || null], (err, result) => {
    if (err) {
      console.error('Error creating matchmaking group:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const groupId = result.insertId;
    const values = players.map((p) => [groupId, p.player_id, p.from_request_id || null, p.role || 'guest']);

    const insertPlayers = `
      INSERT INTO matchmaking_group_players (group_id, player_id, from_request_id, role)
      VALUES ?
    `;

    db.query(insertPlayers, [values], (err2) => {
      if (err2) {
        console.error('Error linking group players:', err2);
        return res.status(500).json({ error: 'Database error' });
      }

      const requestIds = players
        .map((p) => p.from_request_id)
        .filter((id) => !!id);

      if (requestIds.length > 0) {
        const ph = requestIds.map(() => '?').join(',');
        const updateRequests = `UPDATE matchmaking_requests SET status = 'matched' WHERE id IN (${ph})`;
        db.query(updateRequests, requestIds, (err3) => {
          if (err3) console.error('Error updating requests to matched:', err3);
        });
      }

      return res.status(201).json({ message: 'Matchmaking group created', groupId });
    });
  });
});

module.exports = router;
