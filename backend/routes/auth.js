const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const db = require('../config/db');
const sendVerificationEmail = require('../utils/sendMail');

const router = express.Router();

// Simple health check for auth routes
router.get('/auth/health', (req, res) => {
  res.json({ status: 'ok', route: 'auth' });
});

// =========================================================
// AUTH: LOGIN for all 4 user types
// =========================================================
router.get('/auth/validate', async (req, res) => {
  const { email, password, userType } = req.query;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const handlers = {
    player: {
      table: 'players',
      select: 'id, email, password_hash, name, phone, is_active',
    },
    owner: {
      table: 'arena_owners',
      select: 'id, name, email, phone, password_hash, is_active',
    },
    seller: {
      table: 'sellers',
      select: 'id, owner_name AS name, email, phone, password_hash, is_active',
    },
    trainer: {
      table: 'trainers',
      select: 'id, name, email, phone, password_hash, is_active',
    },
  };

  const cfg = handlers[userType];
  if (!cfg) {
    return res.status(400).json({ error: 'Invalid user type' });
  }

  const query = `SELECT ${cfg.select} FROM ${cfg.table} WHERE email = ?`;

  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (!results || results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = results[0];

    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json({
      authenticated: true,
      message: 'Login successful',
      userId: user.id,
      email: user.email,
      name: user.name,
      userType,
    });
  });
});

// =========================================================
// AUTH: SIGNUP for all 4 user types
// =========================================================
router.post('/auth/signup', async (req, res) => {
  const { email, password, name, phone, userType, shopName, primarySportId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString('hex');

  const createUser = (checkQuery, insertQuery, insertParams, redirectType) => {
    db.query(checkQuery, [email], (checkErr, results) => {
      if (checkErr) return res.status(500).json({ error: 'Database error' });
      if (results && results.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      db.query(insertQuery, insertParams, async (insertErr) => {
        if (insertErr) {
          console.error('Insert error:', insertErr);
          return res.status(500).json({ error: 'Database insert failed' });
        }

        try {
          await sendVerificationEmail(email, token, redirectType);
        } catch (e) {
          console.error('Email send error:', e);
        }

        return res.status(201).json({
          message: 'Account created. Check your email to verify.',
        });
      });
    });
  };

  if (userType === 'player') {
    const check = 'SELECT id FROM players WHERE email = ?';
    const insert = `
      INSERT INTO players (email, password_hash, name, phone, is_active, verification_token)
      VALUES (?, ?, ?, ?, 0, ?)
    `;
    createUser(check, insert, [email, passwordHash, name, phone, token], 'player');
  } else if (userType === 'owner') {
    const check = 'SELECT id FROM arena_owners WHERE email = ?';
    const insert = `
      INSERT INTO arena_owners (name, email, phone, password_hash, is_active, verification_token)
      VALUES (?, ?, ?, ?, 0, ?)
    `;
    createUser(check, insert, [name, email, phone, passwordHash, token], 'owner');
  } else if (userType === 'seller') {
    const check = 'SELECT id FROM sellers WHERE email = ?';
    const insert = `
      INSERT INTO sellers (owner_name, shop_name, email, phone, password_hash, is_active, verification_token)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `;
    createUser(check, insert, [name, shopName || '', email, phone, passwordHash, token], 'seller');
  } else if (userType === 'trainer') {
    const check = 'SELECT id FROM trainers WHERE email = ?';
    const insert = `
      INSERT INTO trainers (name, email, phone, password_hash, is_active, verification_token, primary_sport_id)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `;
    createUser(check, insert, [name, email, phone, passwordHash, token, primarySportId || null], 'trainer');
  } else {
    return res.status(400).json({ error: 'Invalid user type' });
  }
});

// =========================================================
// AUTH: EMAIL VERIFICATION (all user types)
// =========================================================
router.get('/auth/verify', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Invalid verification link');
  }

  const tables = [
    { table: 'players', type: 'player' },
    { table: 'arena_owners', type: 'owner' },
    { table: 'sellers', type: 'seller' },
    { table: 'trainers', type: 'trainer' },
  ];

  const tryVerify = (index) => {
    if (index >= tables.length) {
      return res.status(400).send('Invalid or expired token');
    }

    const { table, type } = tables[index];
    const query = `
      UPDATE ${table}
      SET is_active = 1, verification_token = NULL
      WHERE verification_token = ?
    `;

    db.query(query, [token], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Server error');
      }

      if (result.affectedRows > 0) {
        const redirectBase = process.env.FRONTEND_URL || '';
        return res.redirect(`${redirectBase}/?verified=1&type=${type}`);
      }

      tryVerify(index + 1);
    });
  };

  tryVerify(0);
});

module.exports = router;
