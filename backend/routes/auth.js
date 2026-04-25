const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('../config/db');
const sendVerificationEmail = require('../utils/sendMail');

const router = express.Router();

const JWT_VERIFICATION_SECRET = process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET || 'alleyoop-dev-verification-secret';
const VERIFICATION_EXPIRES_IN = process.env.JWT_VERIFICATION_EXPIRES_IN || '24h';
const APP_LOGIN_URL = process.env.APP_LOGIN_URL || 'alleyoop://login';
const FRONTEND_URL = process.env.FRONTEND_URL || '';

const tableConfigs = {
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

function createVerificationToken(payload) {
  return jwt.sign(payload, JWT_VERIFICATION_SECRET, { expiresIn: VERIFICATION_EXPIRES_IN });
}

function verifyJwtToken(token) {
  return jwt.verify(token, JWT_VERIFICATION_SECRET);
}

function updateUserVerificationAcrossTables(token, email, expectedType, onDone) {
  const typesToCheck = expectedType ? [expectedType] : Object.keys(tableConfigs);

  const tryTable = (index) => {
    if (index >= typesToCheck.length) {
      return onDone(null, { matched: false });
    }

    const type = typesToCheck[index];
    const table = tableConfigs[type].table;

    const query = `
      UPDATE ${table}
      SET is_active = 1, verification_token = NULL
      WHERE email = ? AND verification_token = ? AND is_active = 0
    `;

    db.query(query, [email, token], (err, result) => {
      if (err) return onDone(err);

      if (result && result.affectedRows > 0) {
        return onDone(null, { matched: true, userType: type });
      }

      return tryTable(index + 1);
    });
  };

  tryTable(0);
}

function verificationPageHtml({ success, title, message, appLoginUrl, webLoginUrl }) {
  const statusLabel = success ? 'Verified' : 'Verification failed';
  const accent = success ? '#E76F2E' : '#B91C1C';
  const safeWebLink = webLoginUrl && webLoginUrl.trim().length > 0 ? webLoginUrl : '';

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Alleyoop Verification</title>
    <style>
      :root {
        --bg: #f5e9d8;
        --card: #fffaf3;
        --brown: #3e2c23;
        --orange: #e76f2e;
        --muted: #6c5a51;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at 85% 10%, #efd7bd 0%, var(--bg) 55%);
        color: var(--brown);
        padding: 24px;
      }
      .card {
        width: min(560px, 96vw);
        background: var(--card);
        border: 1px solid #ead8c2;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 16px 48px rgba(62, 44, 35, 0.15);
      }
      .brand {
        font-size: 36px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 0.5px;
        color: var(--brown);
        margin-bottom: 6px;
      }
      .tag {
        font-size: 11px;
        letter-spacing: 1.3px;
        color: var(--muted);
        text-transform: uppercase;
      }
      .status {
        margin-top: 18px;
        display: inline-block;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: ${accent};
      }
      h1 {
        margin: 10px 0 8px;
        font-size: 30px;
        line-height: 1.2;
      }
      p {
        margin: 0;
        color: var(--muted);
        font-size: 16px;
      }
      .actions {
        margin-top: 24px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .btn {
        display: inline-block;
        border-radius: 12px;
        padding: 12px 18px;
        text-decoration: none;
        font-weight: 700;
        font-size: 14px;
      }
      .btn-primary {
        background: var(--orange);
        color: #fff;
      }
      .btn-secondary {
        background: #efe1cf;
        color: var(--brown);
      }
      .hint {
        margin-top: 12px;
        font-size: 13px;
        color: var(--muted);
      }
      code {
        background: #efe1cf;
        padding: 2px 6px;
        border-radius: 6px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">alleyo<span style="color: var(--orange)">o</span>p</div>
      <div class="tag">The Sport You Love, Anywhere Any Time</div>
      <div class="status">${statusLabel}</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <div class="actions">
        <a class="btn btn-primary" href="${appLoginUrl}">Open Alleyoop Login</a>
        ${safeWebLink ? `<a class="btn btn-secondary" href="${safeWebLink}">Open Web Login</a>` : ''}
      </div>
      <p class="hint">If the app does not open automatically, make sure Alleyoop is installed and supports the deep link <code>${appLoginUrl}</code>.</p>
    </div>
  </body>
</html>`;
}

function sendVerificationPage(res, { success, title, message, statusCode = 200 }) {
  return res.status(statusCode).type('html').send(
    verificationPageHtml({
      success,
      title,
      message,
      appLoginUrl: APP_LOGIN_URL,
      webLoginUrl: FRONTEND_URL,
    }),
  );
}

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

  const cfg = tableConfigs[userType];
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

    if (Number(user.is_active) !== 1) {
      return res.status(403).json({ error: 'User is not verified. Please verify your email before logging in.' });
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
  const token = createVerificationToken({ email, userType, purpose: 'email_verification' });

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
        } catch (mailErr) {
          console.error('Verification email send error:', mailErr);
          return res.status(500).json({ error: 'Account created, but verification email could not be sent. Please contact support.' });
        }

        return res.status(201).json({
          message: 'Account created. Please verify your email before logging in.',
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
    return sendVerificationPage(res, {
      success: false,
      title: 'Invalid Link',
      message: 'This verification link is missing a token. Please use the latest email you received.',
      statusCode: 400,
    });
  }

  let decoded;
  try {
    decoded = verifyJwtToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendVerificationPage(res, {
        success: false,
        title: 'Link Expired',
        message: 'This verification link has expired. Please sign up again or request a new verification email.',
        statusCode: 400,
      });
    }
    return sendVerificationPage(res, {
      success: false,
      title: 'Invalid Link',
      message: 'This verification link is not valid. Please use the latest link from your inbox.',
      statusCode: 400,
    });
  }

  if (!decoded || decoded.purpose !== 'email_verification' || !decoded.email) {
    return sendVerificationPage(res, {
      success: false,
      title: 'Invalid Link',
      message: 'This verification link is not valid. Please use the latest link from your inbox.',
      statusCode: 400,
    });
  }

  updateUserVerificationAcrossTables(token, decoded.email, decoded.userType, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return sendVerificationPage(res, {
        success: false,
        title: 'Server Error',
        message: 'We could not verify your account right now. Please try again shortly.',
        statusCode: 500,
      });
    }

    if (!result || !result.matched) {
      return sendVerificationPage(res, {
        success: false,
        title: 'Already Used Or Invalid',
        message: 'This verification link is invalid, expired, or has already been used.',
        statusCode: 400,
      });
    }

    return sendVerificationPage(res, {
      success: true,
      title: 'Email Verified Successfully',
      message: 'Your account is now active. Tap below to go back to Alleyoop and log in.',
      statusCode: 200,
    });
  });
});

// =========================================================
// AUTH: MOBILE EMAIL VERIFICATION (JSON response)
// =========================================================
router.get('/auth/verify-mobile', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Invalid verification token' });
  }

  let decoded;
  try {
    decoded = verifyJwtToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, error: 'Verification link has expired' });
    }
    return res.status(400).json({ success: false, error: 'Invalid verification token' });
  }

  if (!decoded || decoded.purpose !== 'email_verification' || !decoded.email) {
    return res.status(400).json({ success: false, error: 'Invalid verification token' });
  }

  updateUserVerificationAcrossTables(token, decoded.email, decoded.userType, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }

    if (!result || !result.matched) {
      return res.status(400).json({ success: false, error: 'Invalid, expired, or already used token' });
    }

    return res.json({ success: true, userType: result.userType });
  });
});

module.exports = router;
