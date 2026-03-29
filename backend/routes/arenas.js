const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Simple health check for arenas routes
router.get('/arenas/health', (req, res) => {
  res.json({ status: 'ok', route: 'arenas' });
});

// =========================================================
// ARENAS & COURTS
// =========================================================
router.get('/arenas', (req, res) => {
  const query = `
    SELECT 
      a.id,
      a.name,
      a.city AS location,
      a.pricePerHour,
      a.availability,
      a.rating,
      (
        SELECT ai.image_path
        FROM arena_images ai
        WHERE ai.arena_id = a.id
        ORDER BY ai.id ASC
        LIMIT 1
      ) AS image_path
    FROM arenas a
    LEFT JOIN arena_images ai ON ai.arena_id = a.id
    ORDER BY a.id DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    return res.json(results);
  });
});

router.get('/arena/:id', (req, res) => {
  const arenaId = req.params.id;

  const arenaQuery = `
    SELECT 
      id, owner_id, name, city, address, pricePerHour, availability, rating,
      timing, amenities, description, rules
    FROM arenas 
    WHERE id = ?;
  `;

  const imagesQuery = `
    SELECT image_path 
    FROM courts 
    WHERE arena_id = ?;
  `;

  const courtsQuery = `
    SELECT 
      ct.type_name AS type,
      c.name AS court_name,
      c.id AS court_id
    FROM courts c
    JOIN court_types ct ON c.court_type_id = ct.id
    WHERE c.arena_id = ?;
  `;

  db.query(arenaQuery, [arenaId], (err, arenaResult) => {
    if (err) return res.status(500).json({ error: 'Database error (arena)' });
    if (!arenaResult || arenaResult.length === 0) {
      return res.status(404).json({ error: 'Arena not found' });
    }

    const arena = arenaResult[0];

    const safeJSON = (value) => {
      if (!value) return [];
      try {
        if (Array.isArray(value)) return value;
        if (Buffer.isBuffer(value)) return JSON.parse(value.toString());
        if (typeof value === 'string') return JSON.parse(value);
        return [];
      } catch (e) {
        console.error('JSON parse error:', e);
        return [];
      }
    };

    arena.amenities = safeJSON(arena.amenities);
    arena.rules = safeJSON(arena.rules);

    db.query(imagesQuery, [arenaId], (imgErr, imgResult) => {
      if (imgErr) return res.status(500).json({ error: 'Database error (images)' });
      const images = imgResult.map((row) => row.image_path);

      db.query(courtsQuery, [arenaId], (courtErr, courtsResult) => {
        if (courtErr) return res.status(500).json({ error: 'Database error (courts)' });

        const groupedCourts = {};
        courtsResult.forEach((row) => {
          if (!groupedCourts[row.type]) {
            groupedCourts[row.type] = [];
          }
          groupedCourts[row.type].push({ id: row.court_id, name: row.court_name });
        });

        return res.json({
          id: arena.id,
          name: arena.name,
          address: arena.address,
          city: arena.city,
          rating: arena.rating,
          pricePerHour: arena.pricePerHour,
          availability: arena.availability,
          timing: arena.timing,
          amenities: arena.amenities,
          description: arena.description,
          rules: arena.rules,
          images,
          courts: groupedCourts,
        });
      });
    });
  });
});

// Owner creates new arena
router.post('/arenas', (req, res) => {
  const { owner_id, name, city, address, pricePerHour, timing, amenities, description, rules } = req.body;

  if (!owner_id || !name || !city || !pricePerHour) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO arenas 
    (owner_id, name, city, address, pricePerHour, availability, rating, timing, amenities, description, rules)
    VALUES (?, ?, ?, ?, ?, 'available', 0, ?, ?, ?, ?)
  `;

  const amenitiesJson = JSON.stringify(amenities || []);
  const rulesJson = JSON.stringify(rules || []);

  db.query(
    query,
    [owner_id, name, city, address, pricePerHour, timing, amenitiesJson, description, rulesJson],
    (err, result) => {
      if (err) {
        console.error('Error creating arena:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.status(201).json({ message: 'Arena created successfully', id: result.insertId });
    },
  );
});

// Owner: get own arenas
router.get('/owner/arenas', (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).json({ error: 'Owner ID required' });

  const query = 'SELECT * FROM arenas WHERE owner_id = ? ORDER BY id DESC';

  db.query(query, [ownerId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const arenas = results.map((arena) => ({
      ...arena,
      amenities: typeof arena.amenities === 'string' ? JSON.parse(arena.amenities) : arena.amenities,
      rules: typeof arena.rules === 'string' ? JSON.parse(arena.rules) : arena.rules,
    }));

    return res.json(arenas);
  });
});

// Owner: update arena
router.put('/arenas/:id', (req, res) => {
  const arenaId = req.params.id;
  const { name, city, address, pricePerHour, timing, amenities, description, rules, availability } = req.body;

  const query = `
    UPDATE arenas
    SET name=?, city=?, address=?, pricePerHour=?, timing=?, amenities=?, description=?, rules=?, availability=?
    WHERE id=?
  `;

  const amenitiesJson = JSON.stringify(amenities || []);
  const rulesJson = JSON.stringify(rules || []);

  db.query(
    query,
    [name, city, address, pricePerHour, timing, amenitiesJson, description, rulesJson, availability, arenaId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      return res.json({ message: 'Arena updated successfully' });
    },
  );
});

// Owner: add court to an arena
router.post('/courts', (req, res) => {
  const { arena_id, court_type_id, name, image_path, pricePerHour, is_indoor } = req.body;

  if (!arena_id || !court_type_id || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO courts (arena_id, court_type_id, name, image_path, pricePerHour, is_indoor)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [arena_id, court_type_id, name, image_path || null, pricePerHour || null, is_indoor ? 1 : 0], (err, result) => {
    if (err) {
      console.error('Error creating court:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.status(201).json({ message: 'Court created successfully', id: result.insertId });
  });
});

module.exports = router;
