const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');

const router = express.Router();

const arenaImagesRoot = path.join(__dirname, '..', 'uploads', 'arenas');

router.get('/arena/get/:id', (req, res) => {
  const arenaId = req.params.id;

  const arenaQuery = `
    SELECT 
      id, owner_id, name, city, address, pricePerHour, availability, rating,
      timing, total_courts, sports, amenities, description, rules
    FROM arenas 
    WHERE id = ?;
  `;

  const imagesQuery = `
    SELECT image_path 
    FROM arena_images 
    WHERE arena_id = ?
    ORDER BY id ASC;
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

    arena.sports = safeJSON(arena.sports);
    arena.amenities = safeJSON(arena.amenities);
    arena.rules = safeJSON(arena.rules);

    db.query(imagesQuery, [arenaId], (imgErr, imgResult) => {
      if (imgErr) return res.status(500).json({ error: 'Database error (images)' });
      const images = imgResult.map((row) => row.image_path);

      return res.json({
        id: arena.id,
        name: arena.name,
        address: arena.address,
        city: arena.city,
        rating: arena.rating,
        pricePerHour: arena.pricePerHour,
        availability: arena.availability,
        timing: arena.timing,
        total_courts: arena.total_courts,
        sports: arena.sports,
        amenities: arena.amenities,
        description: arena.description,
        rules: arena.rules,
        images,
      });
    });
  });
});

// Owner creates new arena
router.post('/arena/create', (req, res) => {
  const { owner_id, name, city, address, pricePerHour, timing, sports, amenities, description, rules, total_courts } = req.body;

  if (!owner_id || !name || !city || !pricePerHour) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO arenas 
      (owner_id, name, city, address, pricePerHour, availability, rating, timing, total_courts, sports, amenities, description, rules)
    VALUES (?, ?, ?, ?, ?, 'available', 0, ?, ?, ?, ?, ?, ?)
  `;

  const sportsJson = JSON.stringify(sports || []);
  const amenitiesJson = JSON.stringify(amenities || []);
  const rulesJson = JSON.stringify(rules || []);
  const totalCourtsValue = Number.isInteger(total_courts) ? total_courts : 1;

  db.query(
    query,
    [owner_id, name, city, address, pricePerHour, timing, totalCourtsValue, sportsJson, amenitiesJson, description, rulesJson],
    (err, result) => {
      if (err) {
        console.error('Error creating arena:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.status(201).json({ message: 'Arena created successfully', id: result.insertId });
    },
  );
});

// =========================================================
// ARENAS & COURTS
// =========================================================
router.get('/arena/get', (req, res) => {
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
    ORDER BY a.id DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    return res.json(results);
  });
});

router.get('/arena/get/:id', (req, res) => {
  const arenaId = req.params.id;

  const arenaQuery = `
    SELECT 
      id, owner_id, name, city, address, pricePerHour, availability, rating,
      timing, total_courts, sports, amenities, description, rules
    FROM arenas 
    WHERE id = ?;
  `;

  const imagesQuery = `
    SELECT image_path 
    FROM arena_images 
    WHERE arena_id = ?
    ORDER BY id ASC;
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

    arena.sports = safeJSON(arena.sports);
    arena.amenities = safeJSON(arena.amenities);
    arena.rules = safeJSON(arena.rules);

    db.query(imagesQuery, [arenaId], (imgErr, imgResult) => {
      if (imgErr) return res.status(500).json({ error: 'Database error (images)' });
      const images = imgResult.map((row) => row.image_path);

      return res.json({
        id: arena.id,
        name: arena.name,
        address: arena.address,
        city: arena.city,
        rating: arena.rating,
        pricePerHour: arena.pricePerHour,
        availability: arena.availability,
        timing: arena.timing,
        total_courts: arena.total_courts,
        sports: arena.sports,
        amenities: arena.amenities,
        description: arena.description,
        rules: arena.rules,
        images,
      });
    });
  });
});

// Owner: get own arenas
router.get('/arena/owner', (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).json({ error: 'Owner ID required' });

  const query = `
    SELECT 
      a.id,
      a.owner_id,
      a.name,
      a.city,
      a.address,
      a.pricePerHour,
      a.availability,
      a.rating,
      a.timing,
      a.sports,
      a.amenities,
      a.description,
      a.rules,
      (
        SELECT ai.image_path
        FROM arena_images ai
        WHERE ai.arena_id = a.id
        ORDER BY ai.id ASC
        LIMIT 1
      ) AS image_path
    FROM arenas a
    WHERE a.owner_id = ?
    ORDER BY a.id DESC
  `;

  db.query(query, [ownerId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const arenas = results.map((arena) => ({
      ...arena,
      sports: typeof arena.sports === 'string' ? JSON.parse(arena.sports) : arena.sports,
      amenities: typeof arena.amenities === 'string' ? JSON.parse(arena.amenities) : arena.amenities,
      rules: typeof arena.rules === 'string' ? JSON.parse(arena.rules) : arena.rules,
    }));

    return res.json(arenas);
  });
});

// Owner: update arena
router.put('/arena/owner/:id', (req, res) => {
  const arenaId = req.params.id;
  const { name, city, address, pricePerHour, timing, sports, amenities, description, rules, availability } = req.body;

  const query = `
    UPDATE arenas
    SET name=?, city=?, address=?, pricePerHour=?, timing=?, sports=?, amenities=?, description=?, rules=?, availability=?
    WHERE id=?
  `;

  const sportsJson = JSON.stringify(sports || []);
  const amenitiesJson = JSON.stringify(amenities || []);
  const rulesJson = JSON.stringify(rules || []);

  db.query(
    query,
    [name, city, address, pricePerHour, timing, sportsJson, amenitiesJson, description, rulesJson, availability, arenaId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      return res.json({ message: 'Arena updated successfully' });
    },
  );
});

// Owner: delete arena (and related images)
router.delete('/arena/:id', (req, res) => {
  const arenaId = req.params.id;

  if (!arenaId) {
    return res.status(400).json({ error: 'Arena ID is required' });
  }

  const deleteImagesQuery = 'DELETE FROM arena_images WHERE arena_id = ?';
  const deleteBookingsQuery = 'DELETE FROM bookings WHERE arena_id = ?';
  const deleteArenaQuery = 'DELETE FROM arenas WHERE id = ?';

  // Best-effort filesystem cleanup for arena images
  const arenaDir = path.join(arenaImagesRoot, String(arenaId));
  fs.readdir(arenaDir, (readErr, files) => {
    if (!readErr && Array.isArray(files)) {
      files.forEach((file) => {
        const fileOnDisk = path.join(arenaDir, file);
        fs.unlink(fileOnDisk, (fsErr) => {
          if (fsErr && fsErr.code !== 'ENOENT') {
            console.error('Error removing arena image file during delete:', fsErr);
          }
        });
      });
    }
  });

  // Delete DB records in order to satisfy foreign keys
  db.query(deleteImagesQuery, [arenaId], (imgErr) => {
    if (imgErr) {
      console.error('Error deleting arena images:', imgErr);
      return res.status(500).json({ error: 'Database error while deleting arena images' });
    }

    db.query(deleteBookingsQuery, [arenaId], (bookErr) => {
      if (bookErr) {
        console.error('Error deleting arena bookings:', bookErr);
        return res.status(500).json({ error: 'Database error while deleting arena bookings' });
      }

      db.query(deleteArenaQuery, [arenaId], (arenaErr, result) => {
        if (arenaErr) {
          console.error('Error deleting arena:', arenaErr);
          return res.status(500).json({ error: 'Database error while deleting arena' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Arena not found' });
        }

        return res.json({ message: 'Arena deleted successfully' });
      });
    });
  });
});

// Owner: add court to an arena
router.post('/arena/courts', (req, res) => {
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
