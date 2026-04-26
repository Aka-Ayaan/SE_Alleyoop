const nodemailer = require('nodemailer');

async function sendPasswordResetEmail(email, token) {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const resetLink = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset your Alleyoop password',
    html: `<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #333;">Reset your password</h2>
        <p>We received a request to reset your Alleyoop account password.</p>
        <a href="${resetLink}"
           style="
             display: inline-block;
             padding: 12px 25px;
             margin: 20px 0;
             font-size: 16px;
             color: white;
             background-color: #E76F2E;
             border-radius: 5px;
             text-decoration: none;
             font-weight: bold;
           ">
           Reset Password
        </a>
        <p style="font-size: 0.9rem; color: #555;">If you did not request this, you can safely ignore this email.</p>
        <p style="font-size: 0.8rem; color: #555;">If the button does not work, copy and paste this link into your browser:</p>
        <p style="font-size: 0.8rem; color: #555;">${resetLink}</p>
      </div>`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendPasswordResetEmail;
