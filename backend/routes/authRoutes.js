const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('./multerConfig');

// تأكد من استيراد الدوال بشكل صحيح
const {
  signup,
  verifyCode,
  login,
  forgotPassword,
  resetPassword
} = authController;

// استخدام الدوال مباشرة
router.post('/signup', upload.single('profileImage'), signup);
router.post('/verify', verifyCode);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
