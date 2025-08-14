require('dotenv').config();
const nodemailer = require('nodemailer');

// استخدم نفس الإعدادات التي نجحت في الاختبار
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // مهم لبيئات الاستضافة
  }
});

async function sendVerificationEmail(email, verificationCode) {
  const mailOptions = {
    from: `"Secure Auth" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your Verification Code</h2>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h1 style="margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
        </div>
        <p style="font-size: 12px; color: #6b7280;">This code will expire in 10 minutes.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

module.exports = { sendVerificationEmail };
