require('dotenv').config({ path: __dirname + '/.env' });
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
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection - حل بديل للتأكد من الاتصال
const mongodbUser = process.env.MONGODB_USER || 'yacine';
const mongodbPass = encodeURIComponent(process.env.MONGODB_PASS || 'ABC123!?/');
const mongodbHost = process.env.MONGODB_HOST || 'cluster0.wyjnom4.mongodb.net';
const mongodbDb = process.env.MONGODB_DB || 'auth-system';

const MONGODB_URI = `mongodb+srv://${mongodbUser}:${mongodbPass}@${mongodbHost}/${mongodbDb}?retryWrites=true&w=majority`;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('تم الاتصال بـ MongoDB بنجاح'))
.catch(err => {
  console.error('فشل الاتصال بـ MongoDB:', err);
  process.exit(1);
});

// User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  profileImage: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const User = mongoose.model('User', userSchema);

// Email Setup with fallback
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your_email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_email_password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// File Upload Setup with error handling
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'active', 
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: process.version,
    memory: process.memoryUsage()
  });
});

// User Registration with improved validation
app.post('/api/auth/signup', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { userId: req.body.userId }] });
    if (existingUser) {
      return res.status(400).json({ message: 'البريد الإلكتروني أو معرف المستخدم موجود مسبقاً' });
    }

    const userId = `USER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const profileImage = req.file ? path.relative(__dirname, req.file.path) : '';

    const user = new User({ name, email, password, userId, profileImage });
    await user.save();

    // Generate QR code with secure data
    const qrData = JSON.stringify({
      userId: user.userId,
      email: user.email,
      createdAt: Date.now()
    });

    const qrCode = await QRCode.toDataURL(qrData);

    res.status(201).json({ 
      success: true,
      message: 'تم إنشاء الحساب بنجاح', 
      user: { 
        name: user.name, 
        email: user.email, 
        userId: user.userId,
        profileImage: user.profileImage 
      },
      qrCode
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ 
      success: false,
      message: 'حدث خطأ أثناء التسجيل',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// User Login with improved security
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    if (!userId || !password) {
      return res.status(400).json({ message: 'معرف المستخدم وكلمة المرور مطلوبان' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة' });
    }

    const token = jwt.sign(
      { 
        id: user._id,
        userId: user.userId,
        email: user.email
      }, 
      process.env.JWT_SECRET || 'default_secret_key', 
      { expiresIn: '1h' }
    );

    res.json({ 
      success: true,
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
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
});

// QR Code Validation with improved security
app.post('/api/auth/validate-qr', upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم توفير صورة QR صالحة' });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const imageData = {
      data: new Uint8ClampedArray(imageBuffer),
      width: 200,
      height: 200
    };

    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (!code) {
      return res.status(400).json({ message: 'لم يتم العثور على كود QR في الصورة' });
    }

    let qrData;
    try {
      qrData = JSON.parse(code.data);
    } catch {
      return res.status(400).json({ message: 'تنسيق كود QR غير صالح' });
    }

    const user = await User.findOne({ userId: qrData.userId });
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // يمكنك إضافة المزيد من التحقق هنا مثل تاريخ الإنشاء

    const token = jwt.sign(
      { 
        id: user._id,
        userId: user.userId,
        email: user.email
      }, 
      process.env.JWT_SECRET || 'default_secret_key', 
      { expiresIn: '1h' }
    );

    res.json({ 
      success: true,
      message: 'تم التحقق من QR بنجاح',
      user: {
        name: user.name,
        email: user.email,
        userId: user.userId
      },
      token
    });
  } catch (err) {
    console.error('QR Validation error:', err);
    res.status(500).json({ 
      success: false,
      message: 'حدث خطأ أثناء التحقق من QR'
    });
  } finally {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false,
    message: 'حدث خطأ في الخادم'
  });
});

// Start server with graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
