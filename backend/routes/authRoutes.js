const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../config/multerConfig'); // ← تأكد من هذا السطر

router.post('/signup', upload.single('profileImage'), authController.signup);

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // ... التحقق من البيانات المطلوبة ...

    const verificationCode = Math.floor(100000 + Math.random() * 900000); // رقم عشوائي مكون من 6 أرقام

    // إرسال البريد الإلكتروني
    const emailSent = await sendVerificationEmail(email, verificationCode);
    
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    // حفظ المستخدم في قاعدة البيانات
    const user = new User({
      name,
      email,
      password,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000 // 10 دقائق
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Verification code sent to your email',
      userId: user._id
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
