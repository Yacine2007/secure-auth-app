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
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// اتصال MongoDB مع تشفير كلمة المرور
const mongodbUser = process.env.MONGODB_USER;
const mongodbPass = encodeURIComponent(process.env.MONGODB_PASS);
const mongodbHost = process.env.MONGODB_HOST;
const mongodbDb = process.env.MONGODB_DB;
const MONGODB_URI = `mongodb+srv://${mongodbUser}:${mongodbPass}@${mongodbHost}/${mongodbDb}?retryWrites=true&w=majority`;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('تم الاتصال بـ MongoDB بنجاح'))
.catch(err => console.error('فشل الاتصال بـ MongoDB:', err));

// نموذج المستخدم
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
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

// إعداد البريد الإلكتروني
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// إعداد تحميل الملفات
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

// نقاط النهاية
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'active', 
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: process.version
  });
});

// تسجيل المستخدم
app.post('/api/auth/signup', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // التحقق من البيانات
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    // التحقق من وجود المستخدم
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'البريد الإلكتروني موجود مسبقاً' });
    }

    // إنشاء معرف مستخدم فريد
    const userId = `USER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const profileImage = req.file ? req.file.filename : '';

    // إنشاء مستخدم جديد
    const user = new User({ name, email, password, userId, profileImage });
    await user.save();

    // إنشاء كود QR
    const qrData = `ID:${userId}|PWD:${password}`;
    const qrCodeElement = document.getElementById('qr-code');
    qrCodeElement.innerHTML = "";
    
    new QRCode(qrCodeElement, {
      text: qrData,
      width: 180,
      height: 180,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

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
    console.error('Signup error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء التسجيل' });
  }
});

// تسجيل الدخول
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

    // إنشاء توكن JWT
    const token = jwt.sign(
      { 
        id: user._id,
        userId: user.userId,
        email: user.email
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

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
    console.error('Login error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// التحقق من كود QR
app.post('/api/auth/validate-qr', upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم توفير صورة' });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const imageData = {
      data: new Uint8ClampedArray(imageBuffer),
      width: 200,
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
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة' });
    }

    // إنشاء توكن JWT
    const token = jwt.sign(
      { 
        id: user._id,
        userId: user.userId,
        email: user.email
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({ 
      success: true, 
      userId, 
      user: {
        name: user.name,
        email: user.email
      },
      token
    });
    
    // حذف الملف المؤقت
    fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error('QR validation error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء التحقق من كود QR' });
  }
});

// إرسال رمز التحقق
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email, type } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
    }

    const code = Math.floor(100000 + Math.random() * 900000);

    // إرسال البريد الإلكتروني
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'رمز التحقق',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0078d7;">رمز التحقق الخاص بك</h2>
          <p>رمز التحقق الخاص بك هو:</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #1a1a1a;">${code}</h1>
          <p>استخدم هذا الرمز لإكمال عملية ${type === 'reset' ? 'إعادة تعيين كلمة المرور' : 'التسجيل'}.</p>
          <p style="font-size: 12px; color: #aaa;">هذه الرسالة آلية، لا ترد عليها.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'تم إرسال رمز التحقق' });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: 'فشل إرسال رمز التحقق' });
  }
});

// التحقق من الرمز
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    // في الإنتاج الحقيقي، يجب التحقق من تطابق الرمز
    res.json({ success: true, message: 'تم التحقق من الرمز بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// إعادة تعيين كلمة المرور
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'فشل تحديث كلمة المرور' });
  }
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'حدث خطأ في الخادم' });
});

// بدء الخادم
app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
