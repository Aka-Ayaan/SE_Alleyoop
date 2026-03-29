const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Simple health check for reviews routes
router.get('/reviews/health', (req, res) => {
  res.json({ status: 'ok', route: 'reviews' });
});

// Helper to update ratings
const updateEntityRating = (table, idColumn, entityId, reviewTable, reviewEntityColumn) => {
  const updateQuery = `
    UPDATE ${table} t
    JOIN (
      SELECT ${reviewEntityColumn} AS entity_id,
             AVG(rating) AS avg_rating,
             COUNT(*) AS rating_count
      FROM ${reviewTable}
      WHERE ${reviewEntityColumn} = ?
    ) r ON t.${idColumn} = r.entity_id
    SET t.rating_avg = r.avg_rating, t.rating_count = r.rating_count
    WHERE t.${idColumn} = ?
  `;

  db.query(updateQuery, [entityId, entityId], (err) => {
    if (err) console.error('Error updating rating for', table, err);
  });
};

// =========================================================
// REVIEWS: PLAYERS, TRAINERS, ARENAS
// =========================================================
router.post('/reviews/player', (req, res) => {
  const { player_id, reviewer_player_id, reviewer_owner_id, rating, comment } = req.body;
  if (!player_id || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO player_reviews (player_id, reviewer_player_id, reviewer_owner_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [player_id, reviewer_player_id || null, reviewer_owner_id || null, rating, comment || null],
    (err) => {
      if (err) {
        console.error('Error creating player review:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      updateEntityRating('players', 'id', player_id, 'player_reviews', 'player_id');
      return res.status(201).json({ message: 'Player review created successfully' });
    },
  );
});

router.post('/reviews/trainer', (req, res) => {
  const { trainer_id, reviewer_player_id, rating, comment } = req.body;
  if (!trainer_id || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO trainer_reviews (trainer_id, reviewer_player_id, rating, comment)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [trainer_id, reviewer_player_id || null, rating, comment || null], (err) => {
    if (err) {
      console.error('Error creating trainer review:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    updateEntityRating('trainers', 'id', trainer_id, 'trainer_reviews', 'trainer_id');
    return res.status(201).json({ message: 'Trainer review created successfully' });
  });
});

router.post('/reviews/arena', (req, res) => {
  const { arena_id, player_id, rating, comment } = req.body;
  if (!arena_id || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO arena_reviews (arena_id, player_id, rating, comment)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [arena_id, player_id || null, rating, comment || null], (err) => {
    if (err) {
      console.error('Error creating arena review:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    updateEntityRating('arenas', 'id', arena_id, 'arena_reviews', 'arena_id');
    return res.status(201).json({ message: 'Arena review created successfully' });
  });
});

module.exports = router;
