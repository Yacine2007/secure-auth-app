const express = require('express');
const router = express.Router();
const path = require('path');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('./multerConfig');

router.post('/signup', upload.single('profileImage'), authController.signup);
router.post('/verify', authController.verifyCode);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
