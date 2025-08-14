const User = require('../models/User');
const { sendEmail } = require('../config/mailer');
const { generateVerificationCode } = require('../utils/generateCode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// تحسينات رئيسية:
// 1. إضافة معالجة كلمة المرور
// 2. تحسين رسائل الأخطاء
// 3. إضافة JWT عند التسجيل

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'الرجاء إدخال جميع الحقول المطلوبة' 
      });
    }

    // التحقق من صحة البريد الإلكتروني
    if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'صيغة البريد الإلكتروني غير صالحة' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'البريد الإلكتروني مسجل مسبقاً' 
      });
    }

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationCode = generateVerificationCode();
    const user = new User({
      name, 
      email, 
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000
    });

    await user.save();

    // إرسال البريد الإلكتروني
    try {
      await sendEmail({
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
    } catch (emailError) {
      console.error('فشل إرسال البريد:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: 'تم إنشاء الحساب ولكن فشل إرسال رمز التحقق' 
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
      userId: user._id
    });

  } catch (err) {
    console.error('خطأ في التسجيل:', err);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في الخادم' 
    });
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
      return res.status(400).json({ 
        success: false, 
        message: 'رمز التحقق غير صالح أو منتهي الصلاحية' 
      });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // إنشاء توكن JWT
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({ 
      success: true, 
      message: 'تم التحقق من الحساب بنجاح',
      token 
    });
    
  } catch (err) {
    console.error('خطأ في التحقق:', err);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في الخادم' 
    });
  }
};
