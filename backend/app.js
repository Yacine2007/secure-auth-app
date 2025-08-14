require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');

// تهيئة التطبيق
const app = express();

// 1. الاتصال بقاعدة البيانات
connectDB().then(() => {
  console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
}).catch(err => {
  console.error('❌ فشل الاتصال بقاعدة البيانات:', err);
  process.exit(1);
});

// 2. Middlewares الأساسية
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://yacine2007.github.io'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan('dev'));

// 3. إنشاء مجلدات التخزين
const uploadsDir = path.join(__dirname, 'uploads');
const logsDir = path.join(__dirname, 'logs');

[uploadsDir, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 تم إنشاء المجلد: ${dir}`);
  }
});

// 4. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'لقد تجاوزت الحد المسموح من الطلبات، يرجى المحاولة لاحقاً'
  }
});
app.use('/api', limiter);

// 5. Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// 6. Serve static files
app.use('/uploads', express.static(uploadsDir));

// 7. Error Handling
app.use((err, req, res, next) => {
  console.error('🔥 خطأ:', err.stack);
  
  // تسجيل الخطأ في ملف
  const errorLog = `${new Date().toISOString()} - ${err.stack}\n`;
  fs.appendFileSync(path.join(logsDir, 'errors.log'), errorLog);

  res.status(500).json({
    success: false,
    message: 'حدث خطأ غير متوقع في الخادم',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 8. بدء الخادم
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🔗 رابط الواجهة الخلفية: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
  console.log(`⚙️  الوضع: ${process.env.NODE_ENV || 'development'}`);
});

// 9. معالجة الأخطاء غير الملتقطة
process.on('unhandledRejection', (err) => {
  console.error('❌ حدث خطأ غير معالج:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('🛑 تم إغلاق الخادم بشكل نظيف');
  server.close(() => {
    console.log('✅ تم إغلاق جميع الاتصالات');
    process.exit(0);
  });
});
