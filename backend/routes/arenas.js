const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');

const router = express.Router();
const dbp = db.promise();

const arenaImagesRoot = path.join(__dirname, '..', 'uploads', 'arenas');

const safeJSON = (value) => {
  if (!value) return [];
  try {
    if (Array.isArray(value)) return value;
    if (Buffer.isBuffer(value)) return JSON.parse(value.toString());
    if (typeof value === 'string') return JSON.parse(value);
    return [];
  } catch {
    return [];
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const arenaId = String(req.params.id);
      const targetDir = path.join(arenaImagesRoot, arenaId);
      fs.mkdirSync(targetDir, { recursive: true });
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '.jpg');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
});

function normalizeCourtInput(courts = []) {
  if (!Array.isArray(courts)) return [];

  return courts
    .map((court, index) => {
      const name = String(court.name || `Court ${index + 1}`).trim();
      const pricePerHour = Number.isFinite(Number(court.pricePerHour)) ? Number(court.pricePerHour) : null;
      const isIndoor = court.isIndoor ? 1 : 0;
      const sports = Array.isArray(court.sports)
        ? court.sports.map((s) => String(s).trim()).filter(Boolean)
        : [];

      return {
        name,
        pricePerHour,
        isIndoor,
        sports,
      };
    })
    .filter((court) => court.name.length > 0);
}

async function getCourtTypeMap() {
  const [rows] = await dbp.query('SELECT id, type_name FROM court_types');
  const map = new Map();
  rows.forEach((row) => map.set(String(row.type_name).toLowerCase(), row.id));
  return map;
}

async function replaceArenaCourts(arenaId, courts) {
  const courtTypeMap = await getCourtTypeMap();

  for (const court of courts) {
    if (!court.sports || court.sports.length === 0) {
      throw new Error(`Court "${court.name}" must have at least one sport`);
    }

    const missing = court.sports.filter((sport) => !courtTypeMap.has(String(sport).toLowerCase()));
    if (missing.length > 0) {
      throw new Error(`Invalid sport(s): ${missing.join(', ')}`);
    }
  }

  await dbp.query('DELETE cs FROM court_sports cs JOIN courts c ON cs.court_id = c.id WHERE c.arena_id = ?', [arenaId]);
  await dbp.query('DELETE FROM courts WHERE arena_id = ?', [arenaId]);

  for (const court of courts) {
    const [insertCourtResult] = await dbp.query(
      'INSERT INTO courts (arena_id, name, price_per_hour, is_indoor) VALUES (?, ?, ?, ?)',
      [arenaId, court.name, court.pricePerHour, court.isIndoor],
    );

    const courtId = insertCourtResult.insertId;
    const uniqueSports = [...new Set(court.sports.map((s) => String(s).toLowerCase()))];

    for (const sport of uniqueSports) {
      await dbp.query(
        'INSERT INTO court_sports (court_id, court_type_id) VALUES (?, ?)',
        [courtId, courtTypeMap.get(sport)],
      );
    }
  }
}

async function getArenaCourts(arenaId) {
  const [rows] = await dbp.query(
    `
      SELECT
        c.id,
        c.name,
        c.price_per_hour,
        c.is_indoor,
        c.status,
        ct.type_name
      FROM courts c
      LEFT JOIN court_sports cs ON cs.court_id = c.id
      LEFT JOIN court_types ct ON ct.id = cs.court_type_id
      WHERE c.arena_id = ?
      ORDER BY c.id ASC
    `,
    [arenaId],
  );

  const courtsMap = new Map();
  rows.forEach((row) => {
    if (!courtsMap.has(row.id)) {
      courtsMap.set(row.id, {
        id: row.id,
        name: row.name,
        pricePerHour: row.price_per_hour,
        isIndoor: row.is_indoor === 1,
        status: row.status,
        sports: [],
      });
    }

    if (row.type_name) {
      courtsMap.get(row.id).sports.push(row.type_name);
    }
  });

  return Array.from(courtsMap.values());
}

// Sports list for frontend dropdowns
router.get('/court-types', async (req, res) => {
  try {
    const [rows] = await dbp.query('SELECT id, type_name FROM court_types ORDER BY type_name ASC');
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching court types:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Owner creates new arena with courts
router.post('/arena/create', async (req, res) => {
  const { owner_id, name, city, address, pricePerHour, timing, amenities, description, rules, courts } = req.body;

  const normalizedCourts = normalizeCourtInput(courts);

  if (!owner_id || !name || !city || pricePerHour === undefined || normalizedCourts.length === 0) {
    return res.status(400).json({ error: 'Missing required fields or courts' });
  }

  try {
    await dbp.beginTransaction();

    const amenitiesJson = JSON.stringify(amenities || []);
    const rulesJson = JSON.stringify(rules || []);

    const allSports = [...new Set(normalizedCourts.flatMap((court) => court.sports))];
    const sportsJson = JSON.stringify(allSports);

    const [arenaResult] = await dbp.query(
      `
      INSERT INTO arenas
        (owner_id, name, city, address, pricePerHour, availability, rating, timing, total_courts, sports, amenities, description, rules)
      VALUES (?, ?, ?, ?, ?, 'available', 0, ?, ?, ?, ?, ?, ?)
      `,
      [owner_id, name, city, address || null, Number(pricePerHour), timing || null, normalizedCourts.length, sportsJson, amenitiesJson, description || null, rulesJson],
    );

    const arenaId = arenaResult.insertId;
    await replaceArenaCourts(arenaId, normalizedCourts);

    await dbp.commit();
    return res.status(201).json({ message: 'Arena created successfully', id: arenaId });
  } catch (err) {
    await dbp.rollback();
    console.error('Error creating arena:', err);
    return res.status(500).json({ error: err.message || 'Database error' });
  }
});

// Arena list
router.get('/arena/get', async (req, res) => {
  try {
    const [results] = await dbp.query(
      `
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
        ) AS image_path,
        (
          SELECT COUNT(*)
          FROM courts c
          WHERE c.arena_id = a.id
        ) AS total_courts
      FROM arenas a
      ORDER BY a.id DESC
      `,
    );

    return res.json(results);
  } catch (err) {
    console.error('Error fetching arenas:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Arena details
router.get('/arena/get/:id', async (req, res) => {
  const arenaId = req.params.id;

  try {
    const [arenaResult] = await dbp.query(
      `
      SELECT
        id, owner_id, name, city, address, pricePerHour, availability, rating,
        timing, total_courts, sports, amenities, description, rules
      FROM arenas
      WHERE id = ?
      `,
      [arenaId],
    );

    if (!arenaResult || arenaResult.length === 0) {
      return res.status(404).json({ error: 'Arena not found' });
    }

    const arena = arenaResult[0];

    const [imageRows] = await dbp.query(
      `
      SELECT image_path
      FROM arena_images
      WHERE arena_id = ?
      ORDER BY id ASC
      `,
      [arenaId],
    );

    const courts = await getArenaCourts(arenaId);
    const allSports = [...new Set(courts.flatMap((court) => court.sports))];

    return res.json({
      id: arena.id,
      name: arena.name,
      address: arena.address,
      city: arena.city,
      rating: arena.rating,
      pricePerHour: arena.pricePerHour,
      availability: arena.availability,
      timing: arena.timing,
      total_courts: courts.length,
      sports: allSports.length > 0 ? allSports : safeJSON(arena.sports),
      amenities: safeJSON(arena.amenities),
      description: arena.description,
      rules: safeJSON(arena.rules),
      images: imageRows.map((row) => row.image_path),
      courts,
    });
  } catch (err) {
    console.error('Error fetching arena details:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Owner: get own arenas
router.get('/arena/owner', async (req, res) => {
  const { ownerId } = req.query;
  if (!ownerId) return res.status(400).json({ error: 'Owner ID required' });

  try {
    const [rows] = await dbp.query(
      `
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
      `,
      [ownerId],
    );

    const arenas = [];
    for (const row of rows) {
      const courts = await getArenaCourts(row.id);
      const allSports = [...new Set(courts.flatMap((court) => court.sports))];

      arenas.push({
        ...row,
        sports: allSports.length > 0 ? allSports : safeJSON(row.sports),
        amenities: safeJSON(row.amenities),
        rules: safeJSON(row.rules),
        total_courts: courts.length,
        courts,
      });
    }

    return res.json(arenas);
  } catch (err) {
    console.error('Error fetching owner arenas:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Owner: update arena and replace courts
router.put('/arena/owner/:id', async (req, res) => {
  const arenaId = req.params.id;
  const { name, city, address, pricePerHour, timing, amenities, description, rules, availability, courts } = req.body;

  const normalizedCourts = normalizeCourtInput(courts);
  if (normalizedCourts.length === 0) {
    return res.status(400).json({ error: 'At least one court is required' });
  }

  try {
    await dbp.beginTransaction();

    const allSports = [...new Set(normalizedCourts.flatMap((court) => court.sports))];

    await dbp.query(
      `
      UPDATE arenas
      SET name = ?, city = ?, address = ?, pricePerHour = ?, timing = ?,
          sports = ?, amenities = ?, description = ?, rules = ?, availability = ?, total_courts = ?
      WHERE id = ?
      `,
      [
        name,
        city,
        address,
        pricePerHour,
        timing,
        JSON.stringify(allSports),
        JSON.stringify(amenities || []),
        description || null,
        JSON.stringify(rules || []),
        availability || 'available',
        normalizedCourts.length,
        arenaId,
      ],
    );

    await replaceArenaCourts(arenaId, normalizedCourts);

    await dbp.commit();
    return res.json({ message: 'Arena updated successfully' });
  } catch (err) {
    await dbp.rollback();
    console.error('Error updating arena:', err);
    return res.status(500).json({ error: err.message || 'Database error' });
  }
});

// Upload arena images
router.post('/arena/:id/images', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'gallery', maxCount: 10 }]), async (req, res) => {
  const arenaId = req.params.id;

  try {
    const [arenaRows] = await dbp.query('SELECT id FROM arenas WHERE id = ?', [arenaId]);
    if (!arenaRows.length) {
      return res.status(404).json({ error: 'Arena not found' });
    }

    const files = req.files || {};
    const thumbnail = files.thumbnail || [];
    const gallery = files.gallery || [];

    const allFiles = [...thumbnail, ...gallery];
    if (allFiles.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    for (const file of allFiles) {
      const relativePath = `/uploads/arenas/${arenaId}/${path.basename(file.path)}`;
      await dbp.query('INSERT INTO arena_images (arena_id, image_path) VALUES (?, ?)', [arenaId, relativePath]);
    }

    return res.status(201).json({ message: 'Images uploaded successfully' });
  } catch (err) {
    console.error('Error uploading images:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Delete selected arena images by path
router.delete('/arena/:id/images', async (req, res) => {
  const arenaId = req.params.id;
  const { paths } = req.body || {};

  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: 'Image paths are required' });
  }

  try {
    for (const imagePath of paths) {
      await dbp.query('DELETE FROM arena_images WHERE arena_id = ? AND image_path = ?', [arenaId, imagePath]);

      const fileOnDisk = path.join(__dirname, '..', imagePath.replace(/^\//, ''));
      fs.unlink(fileOnDisk, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting image from disk:', err);
        }
      });
    }

    return res.json({ message: 'Images deleted successfully' });
  } catch (err) {
    console.error('Error deleting images:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Owner: delete arena
router.delete('/arena/:id', async (req, res) => {
  const arenaId = req.params.id;

  if (!arenaId) {
    return res.status(400).json({ error: 'Arena ID is required' });
  }

  try {
    await dbp.beginTransaction();

    await dbp.query('DELETE FROM bookings WHERE arena_id = ?', [arenaId]);
    await dbp.query('DELETE cs FROM court_sports cs JOIN courts c ON cs.court_id = c.id WHERE c.arena_id = ?', [arenaId]);
    await dbp.query('DELETE FROM courts WHERE arena_id = ?', [arenaId]);
    await dbp.query('DELETE FROM arena_images WHERE arena_id = ?', [arenaId]);

    const [result] = await dbp.query('DELETE FROM arenas WHERE id = ?', [arenaId]);

    if (result.affectedRows === 0) {
      await dbp.rollback();
      return res.status(404).json({ error: 'Arena not found' });
    }

    await dbp.commit();

    const arenaDir = path.join(arenaImagesRoot, String(arenaId));
    fs.rm(arenaDir, { recursive: true, force: true }, () => {});

    return res.json({ message: 'Arena deleted successfully' });
  } catch (err) {
    await dbp.rollback();
    console.error('Error deleting arena:', err);
    return res.status(500).json({ error: 'Database error while deleting arena' });
  }
});

module.exports = router;
