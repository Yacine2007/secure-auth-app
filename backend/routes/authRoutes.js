const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../config/multerConfig');
const { validateSignup, validateForgotPassword } = require('../middlewares/validation');

// تسجيل جديد مع تحميل الصورة
router.post('/signup', 
    upload.single('profileImage'),
    validateSignup,
    authController.signup
);

// إرسال رمز استعادة كلمة المرور
router.post('/forgot-password',
    validateForgotPassword,
    authController.forgotPassword
);

// إعادة إرسال رمز التحقق
router.post('/resend-code',
    validateForgotPassword,
    authController.resendCode
);

// إعادة إرسال رمز التحقق للتسجيل
router.post('/resend-verification',
    validateForgotPassword,
    authController.resendVerification
);

// التحقق من رمز استعادة كلمة المرور
router.post('/verify-reset-code',
    authController.verifyResetCode
);

// إعادة تعيين كلمة المرور
router.post('/reset-password',
    authController.resetPassword
);

// التحقق من رمز التسجيل
router.post('/verify',
    authController.verify
);

// تسجيل الدخول
router.post('/login',
    authController.login
);

// تسجيل الدخول بال QR
router.post('/login-qr',
    authController.loginQR
);

// التحقق من التوكن
router.post('/verify-token',
    authController.verifyToken
);

module.exports = router;
