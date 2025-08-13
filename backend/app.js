require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const jsQR = require('jsqr');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('تم الاتصال بـ MongoDB بنجاح'))
.catch(err => console.error('فشل الاتصال بـ MongoDB:', err));

// User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  profileImage: { type: String },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// File Upload Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'active', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// User Registration
app.post('/api/auth/signup', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const profileImage = req.file ? req.file.path : '';

    // Generate unique user ID
    const userId = `USER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create new user
    const user = new User({ name, email, password, userId, profileImage });
    await user.save();

    // Generate QR data
    const qrData = `ID:${userId}|PWD:${password}`;
    
    res.status(201).json({ 
      message: 'تم إنشاء الحساب بنجاح', 
      user: { 
        name: user.name, 
        email: user.email, 
        userId: user.userId,
        profileImage: user.profileImage 
      },
      qrData
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(400).json({ message: 'بيانات الاعتماد غير صحيحة' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'بيانات الاعتماد غير صحيحة' });
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ 
      message: 'تم تسجيل الدخول بنجاح', 
      user: { 
        name: user.name, 
        email: user.email, 
        userId: user.userId,
        profileImage: user.profileImage 
      },
      token
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// QR Code Validation
app.post('/api/auth/validate-qr', upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم توفير صورة' });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const imageData = {
      data: new Uint8ClampedArray(imageBuffer),
      width: 200, // يجب ضبط هذه القيم بناءً على الصورة
      height: 200
    };

    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (!code) {
      return res.status(400).json({ message: 'لم يتم العثور على كود QR' });
    }

    const match = code.data.match(/^ID:(.+)\|PWD:(.+)$/);
    if (!match) {
      return res.status(400).json({ message: 'تنسيق كود QR غير صالح' });
    }

    const userId = match[1];
    const password = match[2];

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(400).json({ message: 'المستخدم غير موجود' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'بيانات الاعتماد غير صحيحة' });
    }

    res.json({ 
      success: true, 
      userId, 
      password: match[2],
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send Verification Code
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email, type } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'رمز التحقق',
      text: `رمز التحقق الخاص بك هو: ${code}`
    });

    res.json({ success: true, message: 'تم إرسال رمز التحقق' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify Code
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    // في الإنتاج الحقيقي، يجب تخزين الرموز في قاعدة بيانات مع تاريخ انتهاء
    res.json({ success: true, message: 'تم التحقق من الرمز بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'المستخدم غير موجود' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
