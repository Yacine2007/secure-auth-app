require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const path = require('path');

// تهيئة التطبيق
const app = express();

// الاتصال بقاعدة البيانات
connectDB();

// Middlewares الأساسية
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://yacine2007.github.io'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// إنشاء مجلد التحميلات إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, 'uploads');
require('fs').mkdirSync(uploadsDir, { recursive: true });

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب لكل IP
  message: {
    success: false,
    message: 'لقد تجاوزت الحد المسموح من الطلبات، يرجى المحاولة لاحقاً'
  }
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Serve static files
app.use('/uploads', express.static(uploadsDir));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'حدث خطأ غير متوقع في الخادم'
  });
});

// بدء الخادم
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🔗 رابط الواجهة الخلفية: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
});

// معالجة الأخطاء غير الملتقطة
process.on('unhandledRejection', (err) => {
  console.error('حدث خطأ غير معالج:', err);
});
