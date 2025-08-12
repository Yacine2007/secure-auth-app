const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');

// إعداد Multer لرفع الصور
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// تسجيل الدخول باستخدام QR Code
router.post('/login/qr', async (req, res) => {
    try {
        const { qrData } = req.body;
        const user = await User.findOne({ qrCodeData: qrData });
        if (!user) return res.status(400).json({ error: 'Invalid QR Code' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// تسجيل الدخول باستخدام ID/Password
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        const user = await User.findOne({ userId });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// إنشاء حساب جديد
router.post('/signup', upload.single('profileImage'), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userId = "USER-" + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        const newUser = new User({
            userId,
            name,
            email,
            password,
            profileImage: req.file ? req.file.path : null
        });

        await newUser.save();
        res.json({ user: newUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
