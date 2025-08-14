const User = require('../models/User');
const { sendVerificationEmail } = require('../config/mailer');

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // التحقق من البيانات
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const emailSent = await sendVerificationEmail(email, verificationCode);

    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send email' });
    }

    const user = new User({
      name,
      email,
      password,
      verificationCode,
      verificationCodeExpires: Date.now() + 600000
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Verification code sent',
      userId: user._id
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
