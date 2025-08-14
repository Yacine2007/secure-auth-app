require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// إنشاء تطبيق Express
const app = express();

// الاتصال بقاعدة البيانات
connectDB();

// Middlewares الأساسية
app.use(helmet());
app.use(cors({
  origin: ['https://yacine2007.github.io', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Error Handling Middleware
app.use(require('./middlewares/errorMiddleware'));

// بدء الخادم
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
});
