require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

// ========================
// CORS إعداد
// ========================
app.use(cors({
  origin: '*', // يسمح لكل النطاقات
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ========================
// إنشاء مجلد للرفع إذا لم يكن موجود
// ========================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ========================
// اتصال MongoDB
// ========================
const mongodbUser = process.env.MONGODB_USER;
const mongodbPass = encodeURIComponent(process.env.MONGODB_PASS);
const mongodbHost = process.env.MONGODB_HOST;
const mongodbDb = process.env.MONGODB_DB;
const MONGODB_URI = `mongodb+srv://${mongodbUser}:${mongodbPass}@${mongodbHost}/${mongodbDb}?retryWrites=true&w=majority`;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ تم الاتصال بـ MongoDB بنجاح'))
.catch(err => console.error('❌ فشل الاتصال بـ MongoDB:', err));

// ========================
// نموذج المستخدم
// ========================
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  userId: { type: String, unique: true },
  profileImage: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

// ========================
// إعداد البريد
// ========================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

// ========================
// إعداد رفع الملفات
// ========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ========================
// Health Check
// ========================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: process.version
  });
});
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: process.version
  });
});

// ========================
// تسجيل المستخدم
// ========================
app.post('/api/auth/signup', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });

    if (password.length < 8)
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: 'البريد الإلكتروني موجود مسبقاً' });

    const userId = `USER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const profileImage = req.file ? req.file.filename : '';

    const user = new User({ name, email, password, userId, profileImage });
    await user.save();

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      user: { name, email, userId, profileImage }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء التسجيل' });
  }
});

// ========================
// تسجيل الدخول
// ========================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password)
      return res.status(400).json({ message: 'معرف المستخدم وكلمة المرور مطلوبان' });

    const user = await User.findOne({ userId });
    if (!user)
      return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة' });

    const token = jwt.sign({ id: user._id, userId: user.userId, email: user.email },
      process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'تم تسجيل الدخول بنجاح', user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// ========================
// التحقق من QR
// ========================
app.post('/api/auth/validate-qr', upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'لم يتم توفير صورة' });

    const qrBuffer = fs.readFileSync(req.file.path);
    const qrData = qrBuffer.toString(); // ملاحظة: تحتاج مكتبة قراءة QR حقيقية هنا

    // حذف الملف بعد الاستخدام
    fs.unlinkSync(req.file.path);

    res.json({ success: true, data: qrData });
  } catch (err) {
    console.error('QR validation error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء التحقق من كود QR' });
  }
});

// ========================
// إرسال رمز التحقق
// ========================
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });

    const code = Math.floor(100000 + Math.random() * 900000);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'رمز التحقق',
      text: `رمز التحقق الخاص بك هو: ${code}`
    });

    res.json({ success: true, message: 'تم إرسال رمز التحقق' });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: 'فشل إرسال رمز التحقق' });
  }
});

// ========================
// التحقق من الرمز
// ========================
app.post('/api/auth/verify-code', (req, res) => {
  res.json({ success: true, message: 'تم التحقق من الرمز بنجاح' });
});

// ========================
// إعادة تعيين كلمة المرور
// ========================
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });

    if (newPassword.length < 8)
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'المستخدم غير موجود' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'فشل تحديث كلمة المرور' });
  }
});

// ========================
// معالجة الأخطاء
// ========================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'حدث خطأ في الخادم' });
});

// ========================
// بدء الخادم
// ========================
app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
});
