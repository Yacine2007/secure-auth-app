const User = require('../models/User');
const { sendEmail } = require('../config/mailer');
const { generateVerificationCode } = require('../utils/generateCode');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // التحقق من البيانات
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // التحقق من البريد الإلكتروني
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    // إنشاء المستخدم
    const verificationCode = generateVerificationCode();
    const user = new User({
      name, email, password,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000 // 10 دقائق
    });

    await user.save();

    // إرسال البريد الإلكتروني
    const emailSent = await sendEmail({
      email: user.email,
      subject: '🔐 رمز التحقق الخاص بك',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">مرحباً ${name}!</h2>
          <p>رمز التحقق الخاص بك هو:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
          </div>
          <p style="font-size: 12px; color: #6b7280;">هذا الرمز سينتهي خلال 10 دقائق.</p>
        </div>
      `
    });

    if (!emailSent) {
      return res.status(500).json({ 
        success: false, 
        message: 'Account created but failed to send verification email' 
      });
    }

    res.status(201).json({
      success: true,
      message: 'Verification code sent to your email',
      userId: user.userId
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const user = await User.findOne({ 
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    res.json({ success: true, message: 'Account verified successfully' });
    
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
