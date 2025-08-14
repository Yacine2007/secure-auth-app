const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('./multerConfig'); // تأكد أن الملف في نفس المجلد

// تسجيل مستخدم جديد مع رفع صورة
router.post('/signup', upload.single('profileImage'), authController.signup);

// التحقق من الكود
router.post('/verify', authController.verifyCode);

// تسجيل الدخول
router.post('/login', authController.login);

// استعادة كلمة المرور
router.post('/forgot-password', authController.forgotPassword);

// إعادة تعيين كلمة المرور
router.post('/reset-password', authController.resetPassword);

// تصدير الراوت
module.exports = router;
