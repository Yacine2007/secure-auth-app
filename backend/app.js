require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};

// Middleware
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

// File Upload Setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Serve static files
app.use('/uploads', express.static(uploadDir));

// Email Transporter - Using tested configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test email function
const testEmail = () => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'yassinebenmokran@gmail.com',
    subject: '🔐 Test Email from Auth System',
    html: `<h2>This is a test email from your auth system</h2>
           <p>If you see this, email sending is working!</p>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('❌ Email sending failed:', error);
    } else {
      console.log('✅ Email sent:', info.response);
    }
  });
};

// Run email test on startup
testEmail();

// User Model
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    select: false,
    minlength: [8, 'Password must be at least 8 characters']
  },
  userId: { 
    type: String, 
    unique: true,
    index: true
  },
  profileImage: String,
  verificationCode: String,
  verificationCodeExpires: Date,
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  lastCodeSentAt: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

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

// Account lock after failed attempts
userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil > Date.now()) return;
  
  this.loginAttempts += 1;
  
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lock
  }
  
  return this.save();
};

userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

const User = mongoose.model('User', userSchema);

// Helper Functions
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000);

// Email sending function
const sendEmail = async (options) => {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: `"Secure Auth" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Email sending failed:', error);
        resolve(false);
      } else {
        console.log('✅ Email sent:', info.response);
        resolve(true);
      }
    });
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Secure Auth System API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      signup: '/api/auth/signup',
      login: '/api/auth/login',
      loginQR: '/api/auth/login-qr',
      forgotPassword: '/api/auth/forgot-password',
      verifyCode: '/api/auth/verify-reset-code',
      resetPassword: '/api/auth/reset-password',
      generateQR: '/api/auth/generate-qr'
    }
  });
});

// Signup endpoint
app.post('/api/auth/signup', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    // Create user with verification code
    const verificationCode = generateVerificationCode();
    const user = new User({
      name,
      email,
      password,
      profileImage: req.file?.filename,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      lastCodeSentAt: Date.now()
    });

    await user.save();

    // Generate QR Code
    const qrData = JSON.stringify({
      userId: user.userId,
      email: user.email
    });
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2
    });

    // Send welcome email with verification code
    const emailSent = await sendEmail({
      email: user.email,
      subject: 'Welcome to Secure Auth - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome ${name}!</h2>
          <p>Your account has been created successfully.</p>
          <p>Here are your login details:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>User ID:</strong> ${user.userId}</p>
            <p><strong>Verification Code:</strong> ${verificationCode}</p>
          </div>
          <p>Scan this QR code to login in the future:</p>
          <img src="${qrCode}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 20px auto;"/>
          <p style="font-size: 12px; color: #6b7280;">This code will expire in 10 minutes.</p>
        </div>
      `
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Account created but failed to send verification email. Please contact support.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Verification code sent to your email.',
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage ? `/uploads/${user.profileImage}` : null
      },
      qrCode
    });

  } catch (err) {
    console.error('Signup error:', err);
    
    // Delete uploaded file if error occurred
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Account creation failed. Please try again.' 
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    if (!userId || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID and password are required' 
      });
    }

    const user = await User.findOne({ userId }).select('+password +loginAttempts +lockUntil');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({ 
        success: false,
        message: `Account temporarily locked. Try again in ${remainingTime} minutes.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // Increment failed attempts
      await user.incrementLoginAttempts();
      
      const attemptsLeft = 5 - user.loginAttempts;
      return res.status(401).json({ 
        success: false,
        message: `Invalid credentials. ${attemptsLeft > 0 ? attemptsLeft + ' attempts left' : 'Account locked for 15 minutes'}` 
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

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
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage ? `/uploads/${user.profileImage}` : null
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Login failed. Please try again.' 
    });
  }
});

// Login with QR Code
app.post('/api/auth/login-qr', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID and email are required' 
      });
    }

    const user = await User.findOne({ userId, email });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({ 
        success: false,
        message: `Account temporarily locked. Try again in ${remainingTime} minutes.` 
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

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
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage ? `/uploads/${user.profileImage}` : null
      }
    });

  } catch (err) {
    console.error('QR login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Login failed. Please try again.' 
    });
  }
});

// Forgot Password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
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
        message: 'If this email exists, a reset code has been sent' 
      });
    }

    // Check if we recently sent a code
    if (user.lastCodeSentAt && (Date.now() - user.lastCodeSentAt < 30000)) {
      return res.status(429).json({ 
        success: false,
        message: 'Please wait 30 seconds before requesting another code' 
      });
    }

    const verificationCode = generateVerificationCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.lastCodeSentAt = Date.now();
    await user.save();

    // Send email with reset code
    const emailSent = await sendEmail({
      email: email,
      subject: 'Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>We received a request to reset your password.</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
          </div>
          <p style="font-size: 12px; color: #6b7280;">This code will expire in 10 minutes.</p>
        </div>
      `
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset code. Please try again later.'
      });
    }

    res.json({ 
      success: true,
      message: 'If this email exists, a reset code has been sent',
      email,
      resendAllowedAfter: Date.now() + 30000 // 30 seconds
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process request. Please try again.' 
    });
  }
});

// Verify Reset Code endpoint
app.post('/api/auth/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and verification code are required' 
      });
    }

    const user = await User.findOne({ 
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired verification code' 
      });
    }

    res.json({ 
      success: true,
      message: 'Code verified successfully',
      email,
      code
    });

  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Verification failed. Please try again.' 
    });
  }
});

// Reset Password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;
    
    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters' 
      });
    }

    const user = await User.findOne({ 
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired verification code' 
      });
    }

    user.password = newPassword;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Send confirmation email
    sendEmail({
      email: email,
      subject: 'Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Updated</h2>
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact us immediately.</p>
        </div>
      `
    });

    res.json({ 
      success: true,
      message: 'Password reset successfully' 
    });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Password reset failed. Please try again.' 
    });
  }
});

// Generate QR Code endpoint
app.post('/api/auth/generate-qr', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const qrData = JSON.stringify({
      userId: user.userId,
      email: user.email,
      createdAt: user.createdAt.toISOString()
    });

    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      message: 'QR code generated successfully',
      qrCode,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage ? `/uploads/${user.profileImage}` : null
      }
    });

  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate QR code' 
    });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
  
  res.status(500).json({ 
    success: false,
    message: 'Internal Server Error' 
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
  });
};

startServer();
