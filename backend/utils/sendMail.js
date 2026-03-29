const nodemailer = require('nodemailer');

/**
 * Send a verification email with a link to /auth/verify.
 *
 * @param {string} email - Recipient email address
 * @param {string} token - Verification token stored in DB
 * @param {string} [userType] - Optional user type (player/owner/seller/trainer) for email copy only
 */
async function sendVerificationEmail(email, token, userType) {
  // For a pure mobile app, use a deep link instead of an HTTP URL.
  // Example: "alleyoop://verify?token=...". Configure with D EEP_LINK_BASE if needed.
  const deepLinkBase = process.env.DEEP_LINK_BASE || 'alleyoop://';
  const verificationLink = `${deepLinkBase}verify?token=${token}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const prettyType = userType
    ? userType.charAt(0).toUpperCase() + userType.slice(1)
    : 'Alleyoop User';

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your Alleyoop account',
    html: `<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #333;">Welcome to Alleyoop!</h2>
        <p>Please verify your email to activate your ${prettyType} account.</p>
        <a href="${verificationLink}"
           style="
             display: inline-block;
             padding: 12px 25px;
             margin: 20px 0;
             font-size: 16px;
             color: white;
             background-color: #28a745;
             border-radius: 5px;
             text-decoration: none;
             font-weight: bold;
           ">
           ✅ Click to Verify
        </a>
        <p style="font-size: 0.9rem; color: #555;">If the button doesn't work, copy and paste the following link into your browser:</p>
        <p style="font-size: 0.8rem; color: #555;">${verificationLink}</p>
      </div>`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendVerificationEmail;
