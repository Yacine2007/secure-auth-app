require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendVerificationEmail(email, code) {
  try {
    await transporter.sendMail({
      from: `"Secure Auth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Verification Code',
      html: `<h2>Your code: <strong>${code}</strong></h2>`
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

module.exports = { sendVerificationEmail };
