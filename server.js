const express = require('express');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Integrated Server v9.5 (Full API)');

// ==================== ENVIRONMENT VARIABLES ====================
const {
  MONGODB_URI,
  MONGODB_DB = 'bypro',
  GOOGLE_PRIVATE_KEY,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_CLIENT_ID,
  GOOGLE_PRIVATE_KEY_ID,
  GOOGLE_PROJECT_ID,
  GOOGLE_CLIENT_CERT_URL,
  BREVO_SMTP_HOST = 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT = 587,
  BREVO_SMTP_USER,
  BREVO_SMTP_KEY,
  INTERNAL_API_KEY = 'bypro-internal-key-2025',
  ALLOWED_ORIGINS = 'https://yacine2007.github.io,https://b-y-pro-acounts-login.onrender.com,http://localhost:5500,http://localhost:3000,http://localhost:5000,http://localhost:5001',
  IMGBB_API_KEY,
  GITHUB_TOKEN
} = process.env;

if (!MONGODB_URI) {
  console.error('❌ FATAL: MONGODB_URI is not set');
  process.exit(1);
}

// ==================== MULTER SETUP ====================
const upload = multer({ storage: multer.memoryStorage() });

// ==================== GOOGLE DRIVE SETUP ====================
const ACCOUNTS_FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";
const OTP_FILE_ID = "10gOdT98Pk5nhk-cfDA0B24rk8xqsKWE1";

let driveService = null;

async function initDrive() {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: GOOGLE_PROJECT_ID,
      private_key_id: GOOGLE_PRIVATE_KEY_ID,
      private_key: GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: GOOGLE_CLIENT_EMAIL,
      client_id: GOOGLE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: GOOGLE_CLIENT_CERT_URL
    };
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    driveService = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive ready');
  } catch (error) {
    console.error('❌ Drive init failed:', error.message);
  }
}
initDrive();

// ==================== MONGODB SETUP ====================
let db = null;
let financialUsersCollection = null;
let paymentsCollection = null;

async function connectMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB);
    financialUsersCollection = db.collection('financial_users');
    paymentsCollection = db.collection('payments');
    
    await financialUsersCollection.createIndex({ id: 1 }, { unique: true });
    await financialUsersCollection.createIndex({ cardCode: 1 });
    await paymentsCollection.createIndex({ paymentId: 1 });
    
    console.log('✅ MongoDB connected');
    await syncExistingAccounts();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// ==================== GOOGLE DRIVE ACCOUNT FUNCTIONS ====================
async function readCSV() {
  if (!driveService) throw new Error("Drive not ready");
  try {
    const res = await driveService.files.get({ fileId: ACCOUNTS_FILE_ID, alt: 'media' });
    return res.data;
  } catch { return ''; }
}

function parseCSV(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  const accounts = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || (i === 0 && line.includes('id,ps'))) continue;
    const vals = [];
    let cur = '', inQuotes = false;
    for (let ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) { vals.push(cur); cur = ''; }
      else cur += ch;
    }
    vals.push(cur);
    accounts.push({
      id: vals[0],
      ps: vals[1],
      email: vals[2] || '',
      name: vals[3] || '',
      blocked: vals[4] === 'true' ? true : false,
      deleted: vals[5] === 'true' ? true : false,
      avatar: vals[6] || 'https://i.ibb.co/SDxkt40s/user.png'
    });
  }
  return accounts;
}

async function saveCSV(accounts) {
  const headers = ['id', 'ps', 'email', 'name', 'blocked', 'deleted', 'avatar'];
  const lines = [headers.join(',')];
  for (const acc of accounts) {
    const row = [
      acc.id,
      acc.ps,
      acc.email,
      acc.name,
      acc.blocked ? 'true' : 'false',
      acc.deleted ? 'true' : 'false',
      acc.avatar || 'https://i.ibb.co/SDxkt40s/user.png'
    ];
    lines.push(row.map(v => `"${v.toString().replace(/"/g, '""')}"`).join(','));
  }
  await driveService.files.update({
    fileId: ACCOUNTS_FILE_ID,
    media: { mimeType: 'text/csv', body: lines.join('\n') }
  });
}

async function getAllAuthAccounts() {
  const csv = await readCSV();
  return parseCSV(csv);
}

async function getAuthAccountById(id) {
  const csv = await readCSV();
  const accounts = parseCSV(csv);
  return accounts.find(a => a.id === id);
}

async function getAuthAccount(id, password) {
  const csv = await readCSV();
  const accounts = parseCSV(csv);
  return accounts.find(a => a.id === id && a.ps === password);
}

async function addAuthAccount(account) {
  const csv = await readCSV();
  let accounts = parseCSV(csv);
  if (accounts.find(a => a.email === account.email)) throw new Error("Email exists");
  const existing = accounts.find(a => a.id === account.id);
  if (existing) {
    const ids = accounts.map(a => parseInt(a.id)).filter(id => !isNaN(id));
    account.id = ids.length ? (Math.max(...ids) + 1).toString() : "1001";
  }
  account.avatar = account.avatar || 'https://i.ibb.co/SDxkt40s/user.png';
  account.blocked = false;
  account.deleted = false;
  accounts.push(account);
  await saveCSV(accounts);
  return account.id;
}

async function updateAuthAccount(id, updates) {
  const csv = await readCSV();
  let accounts = parseCSV(csv);
  const index = accounts.findIndex(a => a.id === id);
  if (index === -1) throw new Error("Account not found");
  accounts[index] = { ...accounts[index], ...updates };
  await saveCSV(accounts);
  return accounts[index];
}

async function getNextId() {
  const csv = await readCSV();
  const accounts = parseCSV(csv);
  const ids = accounts.map(a => parseInt(a.id)).filter(id => !isNaN(id));
  return ids.length ? (Math.max(...ids) + 1).toString() : "1001";
}

// ==================== AVATAR UPLOAD ====================
async function uploadToImgBB(buffer, filename) {
  if (!IMGBB_API_KEY) throw new Error('IMGBB_API_KEY not configured');
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', buffer.toString('base64'));
  formData.append('name', filename);
  const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
    headers: formData.getHeaders(),
    timeout: 30000
  });
  if (response.data && response.data.success && response.data.data && response.data.data.url) {
    return response.data.data.url;
  } else {
    throw new Error('ImgBB upload failed');
  }
}

app.post('/api/accounts/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    const accountId = req.params.id;
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    const account = await getAuthAccountById(accountId);
    if (!account || account.deleted) {
      return res.status(404).json({ success: false, error: "Account not found" });
    }
    const imageUrl = await uploadToImgBB(req.file.buffer, `avatar_${accountId}_${Date.now()}.jpg`);
    await updateAuthAccount(accountId, { avatar: imageUrl });
    res.json({ success: true, avatarUrl: imageUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/accounts/:id/avatar-url', async (req, res) => {
  try {
    const account = await getAuthAccountById(req.params.id);
    if (!account || account.deleted) {
      return res.status(404).json({ success: false, error: "Account not found" });
    }
    res.json({ success: true, avatarUrl: account.avatar || 'https://i.ibb.co/SDxkt40s/user.png' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== MONGODB FINANCIAL FUNCTIONS ====================
function generateUniqueCardCode() {
  const randomDigits = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
  return `byppcn-${randomDigits}`;
}

async function getFinancialUser(userId) {
  return await financialUsersCollection.findOne({ id: userId });
}

async function getFinancialUserByCard(cardCode) {
  return await financialUsersCollection.findOne({ cardCode: cardCode });
}

async function getAllFinancialUsers() {
  return await financialUsersCollection.find({}).toArray();
}

async function createFinancialUser(userId, name, email) {
  const cardCode = generateUniqueCardCode();
  const newUser = {
    id: userId,
    name: name,
    email: email,
    balance: 0,
    cardCode: cardCode,
    transactions: [],
    createdAt: new Date().toISOString()
  };
  await financialUsersCollection.insertOne(newUser);
  console.log(`✅ Financial account created for ${userId} with card: ${cardCode}`);
  return newUser;
}

async function updateUserBalance(userId, newBalance, transaction) {
  return await financialUsersCollection.updateOne(
    { id: userId },
    {
      $set: { balance: newBalance },
      $push: { transactions: { $each: [transaction], $position: 0 } }
    }
  );
}

async function updateUserCard(userId, cardCode) {
  return await financialUsersCollection.updateOne(
    { id: userId },
    { $set: { cardCode: cardCode } }
  );
}

async function syncExistingAccounts() {
  console.log('🔄 Syncing existing auth accounts with financial data...');
  const authAccounts = await getAllAuthAccounts();
  const financialUsers = await getAllFinancialUsers();
  const existingIds = new Set(financialUsers.map(u => u.id));
  let created = 0;
  for (const authAcc of authAccounts) {
    if (!existingIds.has(authAcc.id)) {
      await createFinancialUser(authAcc.id, authAcc.name || `User ${authAcc.id}`, authAcc.email || `${authAcc.id}@bypro.com`);
      created++;
    }
  }
  if (created > 0) console.log(`✅ Created ${created} new financial accounts`);
  else console.log('✅ All auth accounts already have financial data');
}

// ==================== OTP FUNCTIONS ====================
const otpStorage = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeOTP(email, otp) {
  otpStorage.set(email, {
    otp: otp,
    expires: Date.now() + 10 * 60 * 1000,
    attempts: 0
  });
  return true;
}

async function verifyOTP(email, code) {
  const record = otpStorage.get(email);
  if (!record) return { success: false, error: "No code found" };
  if (Date.now() > record.expires) {
    otpStorage.delete(email);
    return { success: false, error: "Code expired" };
  }
  if (record.otp === code) {
    otpStorage.delete(email);
    return { success: true };
  }
  return { success: false, error: "Invalid code" };
}

// ==================== BREVO SMTP ====================
let brevoTransporter = null;

function createBrevoTransporter() {
  return nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: parseInt(BREVO_SMTP_PORT),
    secure: false,
    auth: { user: BREVO_SMTP_USER, pass: BREVO_SMTP_KEY },
    tls: { rejectUnauthorized: false }
  });
}

function initializeBrevo() {
  try {
    brevoTransporter = createBrevoTransporter();
    brevoTransporter.verify((error) => {
      if (error) console.log('⚠️ Brevo error:', error.message);
      else console.log('✅ Brevo SMTP ready');
    });
  } catch (error) {
    console.error('❌ Brevo init error:', error.message);
  }
}
initializeBrevo();

async function sendOTPviaBrevo(email, otpCode) {
  try {
    if (!brevoTransporter) brevoTransporter = createBrevoTransporter();
    const mailOptions = {
      from: `"B.Y PRO" <${BREVO_SMTP_USER}>`,
      to: email,
      subject: 'B.Y PRO - Verification Code',
      html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">
        <div style="background:linear-gradient(135deg,#3498db,#2980b9);padding:30px;text-align:center;color:white;border-radius:10px 10px 0 0;">
          <h1>B.Y PRO Accounts</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 10px 10px;">
          <h2>Verification Code</h2>
          <div style="background:linear-gradient(135deg,#3498db,#2980b9);color:white;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;margin:25px 0;border-radius:8px;">${otpCode}</div>
          <p>This code expires in 10 minutes.</p>
        </div>
      </div>`,
      text: `Your B.Y PRO verification code is: ${otpCode}. Expires in 10 minutes.`
    };
    await brevoTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ==================== QR CODE ====================
async function generateQR(data) {
  try {
    const qr = await QRCode.toDataURL(data, { width: 200, margin: 2, errorCorrectionLevel: 'H' });
    return { success: true, qrCode: qr };
  } catch { return { success: false }; }
}

// ==================== CORS ====================
const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || origin?.startsWith('http://localhost')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, x-api-key');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ==================== AUTH ENDPOINTS ====================

app.get('/api/get-all-accounts', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    const accounts = await getAllAuthAccounts();
    const activeAccounts = accounts.filter(a => !a.deleted);
    res.json({
      success: true,
      count: activeAccounts.length,
      accounts: activeAccounts.map(acc => ({
        id: acc.id,
        name: acc.name || `User ${acc.id}`,
        email: acc.email || `${acc.id}@bypro.com`,
        hasPassword: !!acc.ps,
        blocked: acc.blocked || false,
        avatar: acc.avatar || 'https://i.ibb.co/SDxkt40s/user.png'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/accounts/:id', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    const account = await getAuthAccountById(req.params.id);
    if (!account || account.deleted) {
      return res.status(404).json({ success: false, error: "Account not found" });
    }
    res.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        password: account.ps,  // كلمة المرور الحقيقية
        blocked: account.blocked || false,
        avatar: account.avatar || 'https://i.ibb.co/SDxkt40s/user.png'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    const { name, email, password } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.ps = password;
    const updated = await updateAuthAccount(req.params.id, updates);
    res.json({
      success: true,
      message: "Account updated",
      account: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        password: updated.ps,
        blocked: updated.blocked || false,
        avatar: updated.avatar || 'https://i.ibb.co/SDxkt40s/user.png'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    await updateAuthAccount(req.params.id, { deleted: true });
    res.json({ success: true, message: "Account deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/accounts/:id/block', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    const { blocked } = req.body;
    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ success: false, error: "blocked must be boolean" });
    }
    await updateAuthAccount(req.params.id, { blocked });
    res.json({ success: true, message: `Account ${blocked ? 'blocked' : 'unblocked'}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.body;
    const account = await getAuthAccount(id, password);
    if (!account) return res.json({ success: false, error: "Invalid credentials" });
    if (account.deleted) return res.json({ success: false, error: "Account deleted" });
    if (account.blocked) return res.json({ success: false, error: "Account blocked" });
    res.json({
      success: true,
      account: {
        id: account.id,
        name: account.name || `User ${account.id}`,
        email: account.email || `${account.id}@bypro.com`,
        avatar: account.avatar || 'https://i.ibb.co/SDxkt40s/user.png'
      }
    });
  } catch (error) {
    res.json({ success: false, error: "Service unavailable" });
  }
});

app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email required" });
    }
    const otp = generateOTP();
    await storeOTP(email, otp);
    const result = await sendOTPviaBrevo(email, otp);
    if (result.success) {
      res.json({ success: true, message: "Code sent", expiresIn: "10 minutes" });
    } else {
      res.status(500).json({ success: false, error: "Email service unavailable" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: "Email and code required" });
    const result = await verifyOTP(email, otp);
    result.success ? res.json({ success: true }) : res.status(400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/create-account', async (req, res) => {
  try {
    const { id, name, email, password, otpCode, avatar } = req.body;
    if (!id || !name || !email || !password || !otpCode) {
      return res.status(400).json({ success: false, error: "All fields required" });
    }
    const otpResult = await verifyOTP(email, otpCode);
    if (!otpResult.success) {
      return res.status(400).json({ success: false, error: otpResult.error });
    }
    const finalId = await addAuthAccount({
      id: id.toString(),
      ps: password,
      email,
      name,
      avatar: avatar || 'https://i.ibb.co/SDxkt40s/user.png'
    });
    const financialAccount = await createFinancialUser(finalId, name, email);
    const qrResult = await generateQR(`BYPRO:${finalId}:${password}`);
    res.json({
      success: true,
      message: "Account created successfully",
      account: {
        id: finalId,
        name,
        email,
        password: password,
        avatar: avatar || 'https://i.ibb.co/SDxkt40s/user.png'
      },
      financialAccount: {
        cardCode: financialAccount.cardCode,
        balance: financialAccount.balance
      },
      qrCode: qrResult.qrCode
    });
  } catch (error) {
    console.error('❌ Error creating account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/next-id', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    const nextId = await getNextId();
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== FINANCIAL ENDPOINTS ====================

app.post('/api/financial/sync', async (req, res) => {
  try {
    const { userId, name, email } = req.body;
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) return res.status(403).json({ success: false, error: "Access denied" });
    let user = await getFinancialUser(userId);
    if (!user) user = await createFinancialUser(userId, name || `User ${userId}`, email || `${userId}@bypro.com`);
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        cardCode: user.cardCode,
        transactions: user.transactions || []
      }
    });
  } catch (error) {
    console.error('❌ Error syncing user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/financial/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getFinancialUser(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        cardCode: user.cardCode,
        transactions: user.transactions || []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/financial/add-balance', async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) return res.status(403).json({ success: false, error: "Access denied" });
    const user = await getFinancialUser(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    const amountNum = parseFloat(amount);
    const newBalance = user.balance + amountNum;
    const transaction = {
      type: 'deposit',
      amount: amountNum,
      description: description || 'Admin deposit',
      date: new Date().toISOString()
    };
    await updateUserBalance(userId, newBalance, transaction);
    res.json({ success: true, newBalance: newBalance, transaction });
  } catch (error) {
    console.error('❌ Error adding balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/financial/update-card', async (req, res) => {
  try {
    const { userId, cardCode } = req.body;
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) return res.status(403).json({ success: false, error: "Access denied" });
    const user = await getFinancialUser(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (!cardCode || !cardCode.startsWith('byppcn-')) {
      return res.status(400).json({ success: false, error: "Invalid card code" });
    }
    await updateUserCard(userId, cardCode);
    const updated = await getFinancialUser(userId);
    res.json({
      success: true,
      message: "Card updated",
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        balance: updated.balance,
        cardCode: updated.cardCode
      }
    });
  } catch (error) {
    console.error('❌ Error updating card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/financial/update-name', async (req, res) => {
  try {
    const { userId, name } = req.body;
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) return res.status(403).json({ success: false, error: "Access denied" });
    const user = await getFinancialUser(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    await financialUsersCollection.updateOne({ id: userId }, { $set: { name } });
    const updated = await getFinancialUser(userId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Error updating name:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/financial/update-email', async (req, res) => {
  try {
    const { userId, email } = req.body;
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) return res.status(403).json({ success: false, error: "Access denied" });
    const user = await getFinancialUser(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    await financialUsersCollection.updateOne({ id: userId }, { $set: { email } });
    const updated = await getFinancialUser(userId);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Error updating email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/financial/all-users', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) return res.status(403).json({ success: false, error: "Access denied" });
    const users = await getAllFinancialUsers();
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('❌ Error fetching all users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/find-card', async (req, res) => {
  try {
    const { cardCode } = req.body;
    if (!cardCode || !cardCode.startsWith('byppcn-')) {
      return res.status(400).json({ success: false, error: "Invalid card code" });
    }
    const user = await getFinancialUserByCard(cardCode);
    if (!user) return res.status(404).json({ success: false, error: "Card not found" });
    res.json({
      success: true,
      accountId: user.id,
      userData: {
        id: user.id,
        name: user.name,
        balance: user.balance,
        cardCode: user.cardCode
      }
    });
  } catch (error) {
    console.error('❌ find-card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/verify-password', async (req, res) => {
  try {
    const { accountId, password } = req.body;
    const account = await getAuthAccount(accountId, password);
    if (account && !account.deleted && !account.blocked) {
      res.json({
        success: true,
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          password: account.ps
        }
      });
    } else {
      res.json({ success: false, error: "Invalid password or account disabled" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PAYMENT ENDPOINTS ====================

app.post('/api/create-payment', async (req, res) => {
  try {
    const { appName, amount, callbackUrl, description } = req.body;
    if (!appName || !appName.startsWith('@byproapp:')) {
      return res.status(400).json({ success: false, error: "Invalid appName" });
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > 1000) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }
    const paymentId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await paymentsCollection.insertOne({
      paymentId,
      appName,
      amount: amountNum,
      callbackUrl,
      description: description || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt
    });
    res.json({
      success: true,
      paymentId,
      gatewayUrl: `https://b-y-pro-acounts-login.onrender.com/Payment%20gateway.html?payment_id=${paymentId}`,
      amount: amountNum,
      expiresIn: 1800
    });
  } catch (error) {
    console.error('❌ create-payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/get-payment-info', async (req, res) => {
  try {
    const { paymentId } = req.body;
    const payment = await paymentsCollection.findOne({ paymentId });
    if (!payment) return res.status(404).json({ success: false, error: "Payment not found" });
    if (new Date(payment.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: "Payment expired" });
    }
    res.json({
      success: true,
      amount: payment.amount,
      appName: payment.appName,
      description: payment.description,
      callbackUrl: payment.callbackUrl,
      status: payment.status
    });
  } catch (error) {
    console.error('❌ get-payment-info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/process-payment', async (req, res) => {
  try {
    const { accountId, cardCode, amount, paymentId, appName, description } = req.body;
    const payment = await paymentsCollection.findOne({ paymentId });
    if (!payment) return res.status(404).json({ success: false, error: "Payment not found" });
    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, error: "Payment already processed" });
    }
    if (new Date(payment.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: "Payment expired" });
    }
    const user = await getFinancialUserByCard(cardCode);
    if (!user || user.id !== accountId) {
      return res.status(400).json({ success: false, error: "Invalid account or card" });
    }
    const amountNum = parseFloat(amount);
    if (user.balance < amountNum) {
      return res.status(402).json({ success: false, error: "Insufficient balance" });
    }
    const newBalance = user.balance - amountNum;
    const transaction = {
      type: 'payment',
      amount: amountNum,
      appName,
      paymentId,
      date: new Date().toISOString(),
      description: description || payment.description || `Payment to ${appName}`
    };
    await updateUserBalance(accountId, newBalance, transaction);
    await paymentsCollection.updateOne(
      { paymentId },
      { $set: { status: 'completed', completedAt: new Date().toISOString(), accountId } }
    );
    if (payment.callbackUrl) {
      const callbackData = { paymentId, success: true, accountId, amount: amountNum, transactionId: `txn_${Date.now()}`, timestamp: new Date().toISOString() };
      axios.post(payment.callbackUrl, callbackData, { timeout: 5000 }).catch(e => console.log('Callback failed:', e.message));
    }
    res.json({ success: true, newBalance, transactionId: `txn_${Date.now()}`, transaction });
  } catch (error) {
    console.error('❌ process-payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HEALTH & PING ====================
app.get('/api/ping', (req, res) => {
  res.json({ success: true, time: Date.now(), status: 'awake' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'B.Y PRO v9.5',
    auth_storage: 'Google Drive',
    financial_storage: 'MongoDB',
    email_provider: 'Brevo SMTP',
    payment_gateway: 'active',
    admin_controls: 'active',
    avatar_support: !!IMGBB_API_KEY,
    endpoints: {
      auth: ['/api/verify-account', '/api/create-account', '/api/send-otp', '/api/verify-otp', '/api/accounts/:id', '/api/accounts/:id/avatar', '/api/accounts/:id/avatar-url'],
      financial: ['/api/financial/:userId', '/api/financial/add-balance', '/api/financial/update-card', '/api/financial/update-name', '/api/financial/update-email', '/api/financial/all-users'],
      payment: ['/api/create-payment', '/api/get-payment-info', '/api/process-payment', '/api/find-card', '/api/verify-password']
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== STATIC PAGES ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/Payment%20gateway.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Payment gateway.html'));
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// ==================== KEEP-ALIVE ====================
setInterval(async () => {
  try {
    await axios.get(`http://localhost:${PORT}/api/ping`, { timeout: 5000 });
    console.log('💓 Keep-alive ping');
  } catch (e) {}
}, 120000);

// ==================== START SERVER ====================
async function startServer() {
  await initDrive();
  await connectMongoDB();
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🎉 =================================');
    console.log('🚀 B.Y PRO INTEGRATED SERVER v9.5');
    console.log('✅ Auth Storage: Google Drive');
    console.log('✅ Financial Storage: MongoDB');
    console.log('✅ Email: BREVO SMTP');
    console.log('✅ Payment Gateway: ACTIVE');
    console.log('✅ Avatar Support: ' + (IMGBB_API_KEY ? 'ENABLED' : 'DISABLED'));
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log('🎉 =================================\n');
  });
  
  server.timeout = 30000;
  server.keepAliveTimeout = 30000;
}

startServer();
