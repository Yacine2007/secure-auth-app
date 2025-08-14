require('dotenv').config();
const nodemailer = require('nodemailer');

// 1. تكوين الناقل البريدية
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// 2. دالة إرسال البريد
module.exports.sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: `"Secure Auth" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #2563eb;">Verification Code</h2>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
          <h1 style="margin: 0; letter-spacing: 5px;">${code}</h1>
        </div>
        <p style="color: #6b7280;">Code expires in 10 minutes</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Mail sending failed:', error);
    return false;
  }
};
