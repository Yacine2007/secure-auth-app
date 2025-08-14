// backend/config/mailer.js
const nodemailer = require('nodemailer');

// إعدادات البريد الإلكتروني - نسخة آمنة للاستخدام مع GitHub Pages
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // لا ترفض الاتصالات غير الموثوقة (للتطوير فقط)
    rejectUnauthorized: process.env.NODE_ENV === 'production' // ترفض في الإنتاج فقط
  }
});

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"Secure Auth" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    console.log(`Attempting to send email to: ${options.email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendEmail };
