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
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const validator = require('validator');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS,
  max: process.env.RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Logging
app.use(morgan('dev'));
app.use(express.json());

// File Upload Setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'] },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  userId: { type: String, unique: true },
  profileImage: String,
  verificationCode: String,
  verificationCodeExpires: Date,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Pre-save hooks
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isNew && !this.userId) {
    this.userId = `USER-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }
  next();
});

const User = mongoose.model('User', userSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// Helper Functions
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000);

const sendVerificationEmail = async (email, code) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Verification Code 🔐',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #2563eb;">Secure Authentication System</h2>
          <p style="font-size: 16px; margin: 20px 0;">Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; color: #111827; margin: 0;">${code}</h1>
          </div>
          <p style="font-size: 14px; color: #6b7280;">This code will expire in ${process.env.VERIFICATION_CODE_EXPIRY_MINUTES} minutes.</p>
          <p style="font-size: 12px; color: #9ca3af;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });
    return true;
  } catch (err) {
    console.error('Email sending error:', err);
    return false;
  }
};

// Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: process.version,
    environment: process.env.NODE_ENV
  });
});

// Signup - Step 1: Create Account
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and email are required' 
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid email' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(
      Date.now() + process.env.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000
    );

    const user = new User({
      name,
      email,
      verificationCode,
      verificationCodeExpires
    });

    await user.save();

    const emailSent = await sendVerificationEmail(email, verificationCode);
    if (!emailSent) {
      await User.deleteOne({ email });
      return res.status(500).json({ 
        success: false,
        message: 'Failed to send verification email' 
      });
    }

    res.status(201).json({
      success: true,
      message: 'Verification code sent to your email',
      email,
      resendAllowedAfter: Date.now() + (process.env.VERIFICATION_CODE_RESEND_DELAY_SECONDS * 1000)
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during signup' 
    });
  }
});

// Verify Email Code
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and verification code are required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid verification code' 
      });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ 
        success: false,
        message: 'Verification code has expired' 
      });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      userId: user.userId
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during verification' 
    });
  }
});

// Resend Verification Code
app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already verified' 
      });
    }

    // Check if enough time has passed since last code
    if (user.verificationCodeExpires && 
        new Date(user.verificationCodeExpires.getTime() - 
        (process.env.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000) + 
        (process.env.VERIFICATION_CODE_RESEND_DELAY_SECONDS * 1000)) > new Date()) {
      return res.status(429).json({ 
        success: false,
        message: `Please wait ${process.env.VERIFICATION_CODE_RESEND_DELAY_SECONDS} seconds before requesting a new code`,
        retryAfter: process.env.VERIFICATION_CODE_RESEND_DELAY_SECONDS
      });
    }

    const newCode = generateVerificationCode();
    user.verificationCode = newCode;
    user.verificationCodeExpires = new Date(
      Date.now() + process.env.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000
    );

    await user.save();

    const emailSent = await sendVerificationEmail(email, newCode);
    if (!emailSent) {
      return res.status(500).json({ 
        success: false,
        message: 'Failed to resend verification email' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'New verification code sent',
      email,
      resendAllowedAfter: Date.now() + (process.env.VERIFICATION_CODE_RESEND_DELAY_SECONDS * 1000)
    });

  } catch (err) {
    console.error('Resend code error:', err);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred while resending the code' 
    });
  }
});

// Complete Registration (Set Password and Profile)
app.post('/api/auth/complete-registration', upload.single('profileImage'), async (req, res) => {
  try {
    const { userId, password, confirmPassword } = req.body;
    
    if (!userId || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters' 
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false,
        message: 'Email not verified' 
      });
    }

    if (user.password) {
      return res.status(400).json({ 
        success: false,
        message: 'Registration already completed' 
      });
    }

    user.password = password;
    if (req.file) {
      user.profileImage = req.file.filename;
    }

    await user.save();

    // Generate QR Code Data
    const qrData = JSON.stringify({
      userId: user.userId,
      email: user.email,
      createdAt: new Date().toISOString()
    });

    // Generate QR Code Image
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Registration completed successfully',
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage ? 
          `${process.env.BACKEND_URL}/uploads/${user.profileImage}` : null
      },
      qrCode: qrCodeImage
    });

  } catch (err) {
    console.error('Complete registration error:', err);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during registration' 
    });
  }
});

// Login with Credentials
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    if (!userId || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID and password are required' 
      });
    }

    const user = await User.findOne({ userId }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const token = jwt.sign(
      { id: user._id, userId: user.userId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage ? 
          `${process.env.BACKEND_URL}/uploads/${user.profileImage}` : null
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during login' 
    });
  }
});

// Validate QR Code
app.post('/api/auth/validate-qr', upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No QR code image provided' 
      });
    }

    // In a real app, you would use a QR decoding library here
    // For demo purposes, we'll simulate decoding
    const qrContent = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);

    let qrData;
    try {
      qrData = JSON.parse(qrContent);
    } catch (err) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid QR code format' 
      });
    }

    if (!qrData.userId) {
      return res.status(400).json({ 
        success: false,
        message: 'QR code does not contain valid user data' 
      });
    }

    const user = await User.findOne({ userId: qrData.userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const token = jwt.sign(
      { id: user._id, userId: user.userId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'QR code validated successfully',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage ? 
          `${process.env.BACKEND_URL}/uploads/${user.profileImage}` : null
      }
    });

  } catch (err) {
    console.error('QR validation error:', err);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during QR validation' 
    });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      success: false,
      message: 'File upload error: ' + err.message 
    });
  }

  res.status(500).json({ 
    success: false,
    message: 'Internal server error' 
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Backend URL: ${process.env.BACKEND_URL}`);
});
