const User = require('../models/User');
const { sendVerificationEmail } = require('../config/mailer');
const { generateVerificationCode } = require('../utils/generateCode');

exports.signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // 1. التحقق من البيانات
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // 2. إنشاء رمز التحقق
    const verificationCode = generateVerificationCode();
    
    // 3. إرسال البريد
    const emailSent = await sendVerificationEmail(email, verificationCode);
    
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    // 4. حفظ المستخدم
    const user = new User({
      email,
      password,
      name,
      verificationCode,
      verificationCodeExpires: Date.now() + 600000 // 10 دقائق
    });

    await user.save();

    // 5. الاستجابة
    res.status(201).json({
      success: true,
      message: 'Verification code sent',
      userId: user._id
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
};
