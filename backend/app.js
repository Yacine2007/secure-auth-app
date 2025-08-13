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
// CORS Configuration
// ========================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ========================
// Upload Directory Setup
// ========================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ========================
// MongoDB Connection
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
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB Connection Failed:', err));

// ========================
// User Schema
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
// Mail Transporter (Gmail SMTP)
// ========================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// ========================
// File Upload Setup
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
// User Signup
// ========================
app.post('/api/auth/signup', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: 'Email already exists' });

    const userId = `USER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const profileImage = req.file ? req.file.filename : '';

    const user = new User({ name, email, password, userId, profileImage });
    await user.save();

    res.status(201).json({
      message: 'Account created successfully',
      user: { name, email, userId, profileImage }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'An error occurred during signup' });
  }
});

// ========================
// User Login
// ========================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password)
      return res.status(400).json({ message: 'User ID and password are required' });

    const user = await User.findOne({ userId });
    if (!user)
      return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, userId: user.userId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Login successful', user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// ========================
// QR Validation (Dummy)
// ========================
app.post('/api/auth/validate-qr', upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No image provided' });

    const qrBuffer = fs.readFileSync(req.file.path);
    const qrData = qrBuffer.toString(); // Placeholder for actual QR decoding

    fs.unlinkSync(req.file.path);

    res.json({ success: true, data: qrData });
  } catch (err) {
    console.error('QR validation error:', err);
    res.status(500).json({ message: 'Error during QR code validation' });
  }
});

// ========================
// Send Verification Code
// ========================
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: 'Email is required' });

    const code = Math.floor(100000 + Math.random() * 900000);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Verification Code 🔐',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
          <h2 style="color: #0078d7;">Hello,</h2>
          <p style="font-size: 16px;">Your verification code is:</p>
          <h1 style="letter-spacing: 5px; color: #222;">${code}</h1>
          <p style="font-size: 14px; color: #555;">Please use this code within 10 minutes.</p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #888;">B.Y PRO Security System</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Verification code sent' });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
});

// ========================
// Verify Code (Dummy)
// ========================
app.post('/api/auth/verify-code', (req, res) => {
  res.json({ success: true, message: 'Verification code confirmed' });
});

// ========================
// Reset Password
// ========================
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ message: 'All fields are required' });

    if (newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// ========================
// Global Error Handler
// ========================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ========================
// Start Server
// ========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
