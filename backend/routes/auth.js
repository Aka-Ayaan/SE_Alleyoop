const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('../config/db');
const sendVerificationEmail = require('../utils/sendMail');
const sendPasswordResetEmail = require('../utils/sendPasswordResetMail');

const router = express.Router();

const JWT_VERIFICATION_SECRET = process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET || 'alleyoop-dev-verification-secret';
const VERIFICATION_EXPIRES_IN = process.env.JWT_VERIFICATION_EXPIRES_IN || '24h';
const JWT_PASSWORD_RESET_SECRET = process.env.JWT_PASSWORD_RESET_SECRET || process.env.JWT_SECRET || 'alleyoop-dev-password-reset-secret';
const PASSWORD_RESET_EXPIRES_IN = process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '30m';
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

function createPasswordResetToken(payload) {
  return jwt.sign(payload, JWT_PASSWORD_RESET_SECRET, { expiresIn: PASSWORD_RESET_EXPIRES_IN });
}

function verifyJwtToken(token) {
  return jwt.verify(token, JWT_VERIFICATION_SECRET);
}

function verifyPasswordResetToken(token) {
  return jwt.verify(token, JWT_PASSWORD_RESET_SECRET);
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

function findUsersByEmailAcrossTables(email, onDone) {
  const types = Object.keys(tableConfigs);
  const matches = [];

  const tryTable = (index) => {
    if (index >= types.length) {
      return onDone(null, matches);
    }

    const type = types[index];
    const table = tableConfigs[type].table;
    const query = `SELECT id, email, is_active FROM ${table} WHERE email = ? LIMIT 1`;

    db.query(query, [email], (err, rows) => {
      if (err) return onDone(err);

      if (rows && rows.length > 0) {
        matches.push({
          userType: type,
          table,
          id: rows[0].id,
          email: rows[0].email,
          isActive: Number(rows[0].is_active) === 1,
        });
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

function resetPasswordPageHtml(token) {
  const safeToken = token || '';

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Password - Alleyoop</title>
    <style>
      :root {
        --bg: #f5e9d8;
        --card: #fffaf3;
        --brown: #3e2c23;
        --orange: #e76f2e;
        --muted: #6c5a51;
        --error: #b91c1c;
        --ok: #166534;
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
        width: min(520px, 96vw);
        background: var(--card);
        border: 1px solid #ead8c2;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 16px 48px rgba(62, 44, 35, 0.15);
      }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0 0 16px; color: var(--muted); }
      label { display: block; font-size: 12px; letter-spacing: 1px; font-weight: 700; margin-bottom: 6px; }
      input {
        width: 100%;
        padding: 12px;
        border: 1px solid #d6c5af;
        border-radius: 10px;
        margin-bottom: 14px;
        font-size: 14px;
      }
      button {
        width: 100%;
        border: 0;
        border-radius: 10px;
        background: var(--orange);
        color: #fff;
        font-weight: 700;
        padding: 12px 14px;
        cursor: pointer;
      }
      .message {
        margin-top: 14px;
        font-size: 14px;
        padding: 10px;
        border-radius: 8px;
        display: none;
      }
      .message.error { background: #fee2e2; color: var(--error); }
      .message.ok { background: #dcfce7; color: var(--ok); }
      .link { margin-top: 14px; font-size: 13px; display: inline-block; color: var(--brown); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Reset Password</h1>
      <p>Enter your new password below.</p>
      <form id="resetForm">
        <label for="newPassword">NEW PASSWORD</label>
        <input id="newPassword" name="newPassword" type="password" minlength="8" required />

        <label for="confirmPassword">CONFIRM PASSWORD</label>
        <input id="confirmPassword" name="confirmPassword" type="password" minlength="8" required />

        <button type="submit">Reset Password</button>
      </form>
      <div id="message" class="message"></div>
      <a class="link" href="${APP_LOGIN_URL}">Back to Alleyoop Login</a>
    </div>

    <script>
      const token = ${JSON.stringify(safeToken)};
      const form = document.getElementById('resetForm');
      const messageBox = document.getElementById('message');

      function showMessage(text, ok) {
        messageBox.style.display = 'block';
        messageBox.className = 'message ' + (ok ? 'ok' : 'error');
        messageBox.textContent = text;
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
          showMessage('Passwords do not match.', false);
          return;
        }

        try {
          const res = await fetch('/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
          });
          const data = await res.json();
          if (!res.ok) {
            showMessage(data.error || 'Could not reset password.', false);
            return;
          }
          showMessage(data.message || 'Password reset successful.', true);
          form.reset();
        } catch (err) {
          showMessage('Could not reset password right now. Please try again.', false);
        }
      });
    </script>
  </body>
</html>`;
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
// AUTH: RESEND VERIFICATION EMAIL
// =========================================================
router.post('/auth/resend-verification', (req, res) => {
  const { email } = req.body;
  const genericMessage = 'If an unverified account exists for this email, a verification link has been sent.';

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  findUsersByEmailAcrossTables(email, async (findErr, matches) => {
    if (findErr) {
      console.error('Resend lookup error:', findErr);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!matches || matches.length === 0) {
      return res.json({ message: genericMessage });
    }

    if (matches.length > 1) {
      console.warn('Resend verification ambiguity for email:', email);
      return res.json({ message: genericMessage });
    }

    const account = matches[0];
    if (account.isActive) {
      return res.json({ message: genericMessage });
    }

    const token = createVerificationToken({
      email: account.email,
      userType: account.userType,
      purpose: 'email_verification',
    });

    const updateQuery = `UPDATE ${account.table} SET verification_token = ? WHERE id = ?`;
    db.query(updateQuery, [token, account.id], async (updateErr, result) => {
      if (updateErr) {
        console.error('Resend token update error:', updateErr);
        return res.status(500).json({ error: 'Could not prepare verification email' });
      }

      if (!result || result.affectedRows === 0) {
        return res.json({ message: genericMessage });
      }

      try {
        await sendVerificationEmail(account.email, token, account.userType);
      } catch (mailErr) {
        console.error('Resend verification email send error:', mailErr);
        return res.status(500).json({ error: 'Could not send verification email. Please try again.' });
      }

      return res.json({ message: genericMessage });
    });
  });
});

// =========================================================
// AUTH: REQUEST PASSWORD RESET
// =========================================================
router.post('/auth/request-password-reset', (req, res) => {
  const { email } = req.body;
  const genericMessage = 'If an account exists for this email, a password reset link has been sent.';

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  findUsersByEmailAcrossTables(email, async (findErr, matches) => {
    if (findErr) {
      console.error('Password reset lookup error:', findErr);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!matches || matches.length === 0) {
      return res.json({ message: genericMessage });
    }

    if (matches.length > 1) {
      console.warn('Password reset ambiguity for email:', email);
      return res.json({ message: genericMessage });
    }

    const account = matches[0];
    const token = createPasswordResetToken({
      email: account.email,
      userType: account.userType,
      purpose: 'password_reset',
    });

    try {
      await sendPasswordResetEmail(account.email, token);
    } catch (mailErr) {
      console.error('Password reset email send error:', mailErr);
      return res.status(500).json({ error: 'Could not send password reset email. Please try again.' });
    }

    return res.json({ message: genericMessage });
  });
});

// =========================================================
// AUTH: RESET PASSWORD PAGE
// =========================================================
router.get('/auth/reset-password', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).type('html').send(resetPasswordPageHtml(''));
  }

  return res.status(200).type('html').send(resetPasswordPageHtml(token));
});

// =========================================================
// AUTH: RESET PASSWORD ACTION
// =========================================================
router.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  let decoded;
  try {
    decoded = verifyPasswordResetToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Password reset link has expired' });
    }
    return res.status(400).json({ error: 'Invalid password reset token' });
  }

  if (!decoded || decoded.purpose !== 'password_reset' || !decoded.email || !decoded.userType) {
    return res.status(400).json({ error: 'Invalid password reset token' });
  }

  const cfg = tableConfigs[decoded.userType];
  if (!cfg) {
    return res.status(400).json({ error: 'Invalid password reset token' });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  const updateQuery = `UPDATE ${cfg.table} SET password_hash = ? WHERE email = ? LIMIT 1`;

  db.query(updateQuery, [newPasswordHash, decoded.email], (updateErr, result) => {
    if (updateErr) {
      console.error('Password reset update error:', updateErr);
      return res.status(500).json({ error: 'Could not reset password right now' });
    }

    if (!result || result.affectedRows === 0) {
      return res.status(400).json({ error: 'Invalid password reset token' });
    }

    return res.json({ message: 'Password reset successful. You can now log in.' });
  });
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
