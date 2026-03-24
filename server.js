const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Accounts System v7.0 (Integrated with Financial Data)');

// ==================== ENVIRONMENT VARIABLES ====================
const {
  // Brevo SMTP
  BREVO_SMTP_HOST = 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT = 587,
  BREVO_SMTP_USER,
  BREVO_SMTP_KEY,
  
  // Google Drive
  GOOGLE_PRIVATE_KEY,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_CLIENT_ID,
  GOOGLE_PRIVATE_KEY_ID,
  GOOGLE_PROJECT_ID,
  GOOGLE_CLIENT_CERT_URL,
  
  // Internal
  INTERNAL_API_KEY = 'bypro-internal-key-2025',
  ALLOWED_ORIGINS = 'https://yacine2007.github.io,http://localhost:5500,http://localhost:3000,https://b-y-pro-acounts-login.onrender.com,http://localhost:5000',
  NODE_ENV = 'production',
  
  // JSONBin
  JSONBIN_BIN_ID,
  JSONBIN_API_KEY,
  JSONBIN_ACCESS_KEY,
  JSONBIN_API_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`,
  
  // Payment
  PAYMENT_SECRET = 'bypro-pay-secret-key-2024',
  PAYMENT_EXPIRY_MINUTES = 30,
  MAX_PAYMENT_AMOUNT = 1000.00,
  
  GITHUB_TOKEN
} = process.env;

// ==================== CORS CONFIGURATION ====================
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Accept']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ==================== GOOGLE DRIVE SETUP ====================
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

const ACCOUNTS_FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";
const OTP_FILE_ID = "10gOdT98Pk5nhk-cfDA0B24rk8xqsKWE1";

let driveService = null;

async function initDrive() {
  try {
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

// ==================== BREVO SMTP ====================
let brevoTransporter = null;

function createBrevoTransporter() {
  return nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: parseInt(BREVO_SMTP_PORT),
    secure: false,
    auth: { user: BREVO_SMTP_USER, pass: BREVO_SMTP_KEY },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
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

// ==================== OTP FUNCTIONS ====================
async function readOTP() {
  if (!driveService) throw new Error("Drive not ready");
  try {
    const res = await driveService.files.get({ fileId: OTP_FILE_ID, alt: 'media' });
    return res.data || {};
  } catch { return {}; }
}

async function saveOTP(data) {
  if (!driveService) throw new Error("Drive not ready");
  await driveService.files.update({
    fileId: OTP_FILE_ID,
    media: { mimeType: 'application/json', body: JSON.stringify(data, null, 2) }
  });
}

async function storeOTP(email, otp) {
  const data = await readOTP();
  data[email] = {
    otp, expires: Date.now() + 10 * 60 * 1000, attempts: 0, createdAt: new Date().toISOString()
  };
  await saveOTP(data);
  return true;
}

async function verifyOTP(email, code) {
  const data = await readOTP();
  const record = data[email];
  if (!record) return { success: false, error: "No code found" };
  if (Date.now() > record.expires) {
    delete data[email];
    await saveOTP(data);
    return { success: false, error: "Code expired" };
  }
  record.attempts++;
  if (record.attempts > 5) {
    delete data[email];
    await saveOTP(data);
    return { success: false, error: "Too many attempts" };
  }
  if (record.otp === code) {
    delete data[email];
    await saveOTP(data);
    return { success: true };
  }
  await saveOTP(data);
  return { success: false, error: "Invalid code", remaining: 5 - record.attempts };
}

// ==================== ACCOUNT FUNCTIONS ====================
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
    if (vals.length >= 2) {
      accounts.push({ id: vals[0], ps: vals[1], email: vals[2] || '', name: vals[3] || '' });
    }
  }
  return accounts;
}

async function saveCSV(accounts) {
  const headers = ['id', 'ps', 'email', 'name'];
  const lines = [headers.join(',')];
  for (const acc of accounts) {
    lines.push(headers.map(h => `"${(acc[h] || '').replace(/"/g, '""')}"`).join(','));
  }
  await driveService.files.update({
    fileId: ACCOUNTS_FILE_ID,
    media: { mimeType: 'text/csv', body: lines.join('\n') }
  });
}

async function getNextId() {
  const csv = await readCSV();
  const accounts = parseCSV(csv);
  const ids = accounts.map(a => parseInt(a.id)).filter(id => !isNaN(id));
  return ids.length ? (Math.max(...ids) + 1).toString() : "1001";
}

async function addAccount(account) {
  const csv = await readCSV();
  let accounts = parseCSV(csv);
  if (accounts.find(a => a.email === account.email)) throw new Error("Email exists");
  const existing = accounts.find(a => a.id === account.id);
  if (existing) account.id = await getNextId();
  accounts.push(account);
  await saveCSV(accounts);
  return account.id;
}

async function verifyAccount(id, password) {
  const csv = await readCSV();
  const accounts = parseCSV(csv);
  const account = accounts.find(a => a.id === id && a.ps === password);
  if (account) {
    return {
      success: true,
      account: { id: account.id, name: account.name || `User ${account.id}`, email: account.email || `${account.id}@bypro.com` }
    };
  }
  return { success: false, error: "Invalid credentials" };
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateQR(data) {
  try {
    const qr = await QRCode.toDataURL(data, { width: 200, margin: 2, errorCorrectionLevel: 'H' });
    return { success: true, qrCode: qr };
  } catch { return { success: false }; }
}

// ==================== JSONBIN HELPERS (FINANCIAL DATA) ====================
async function readJSONBin() {
  try {
    const response = await axios.get(JSONBIN_API_URL, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY, 'X-Access-Key': JSONBIN_ACCESS_KEY },
      timeout: 10000
    });
    return response.data.record || { users: {}, pending_payments: {} };
  } catch (error) {
    console.error('❌ JSONBin read error:', error.message);
    return { users: {}, pending_payments: {} };
  }
}

async function writeJSONBin(data) {
  try {
    await axios.put(JSONBIN_API_URL, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
        'X-Access-Key': JSONBIN_ACCESS_KEY
      },
      timeout: 10000
    });
    return true;
  } catch (error) {
    console.error('❌ JSONBin write error:', error.message);
    return false;
  }
}

/**
 * إنشاء بطاقة عشوائية فريدة
 * التنسيق: byppcn- + 15 رقم عشوائي
 */
function generateUniqueCardCode(existingCardCodes = []) {
  let cardCode;
  let attempts = 0;
  do {
    const randomDigits = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
    cardCode = `byppcn-${randomDigits}`;
    attempts++;
    if (attempts > 100) break;
  } while (existingCardCodes.includes(cardCode));
  return cardCode;
}

/**
 * إنشاء بيانات مالية جديدة للحساب
 */
async function createFinancialAccount(userId, userName, userEmail) {
  try {
    const data = await readJSONBin();
    const existingUsers = data.users || {};
    
    // التحقق من عدم وجود ID مكرر
    if (existingUsers[userId]) {
      console.log(`⚠️ Financial account for ID ${userId} already exists`);
      return existingUsers[userId];
    }
    
    // جمع جميع أكواد البطاقات الموجودة
    const existingCardCodes = Object.values(existingUsers).map(u => u.cardCode).filter(c => c);
    
    // إنشاء بطاقة فريدة
    const newCardCode = generateUniqueCardCode(existingCardCodes);
    
    // إنشاء الحساب المالي
    const newFinancialAccount = {
      id: userId,
      name: userName,
      email: userEmail,
      balance: 0,
      cardCode: newCardCode,
      transactions: []
    };
    
    data.users = data.users || {};
    data.users[userId] = newFinancialAccount;
    
    const saved = await writeJSONBin(data);
    if (saved) {
      console.log(`✅ Financial account created for ${userId} with card: ${newCardCode}`);
      return newFinancialAccount;
    } else {
      throw new Error('Failed to save financial data');
    }
  } catch (error) {
    console.error('❌ Error creating financial account:', error);
    return null;
  }
}

// ==================== PAYMENT GATEWAY ENDPOINTS ====================
app.post('/api/create-payment', async (req, res) => {
  try {
    const { appName, amount, callbackUrl, description } = req.body;
    
    if (!appName || !appName.startsWith('@byproapp:')) {
      return res.status(400).json({ success: false, error: "Invalid appName. Must start with @byproapp:" });
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > MAX_PAYMENT_AMOUNT) {
      return res.status(400).json({ success: false, error: `Amount must be between 0 and ${MAX_PAYMENT_AMOUNT}` });
    }
    
    const paymentId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000).toISOString();
    
    const data = await readJSONBin();
    data.pending_payments = data.pending_payments || {};
    data.pending_payments[paymentId] = {
      appName, amount: amountNum, callbackUrl, description: description || '', status: 'pending',
      createdAt: new Date().toISOString(), expiresAt
    };
    await writeJSONBin(data);
    
    res.json({
      success: true,
      paymentId,
      gatewayUrl: `https://b-y-pro-acounts-login.onrender.com/Payment%20gateway.html?payment_id=${paymentId}`,
      amount: amountNum,
      expiresIn: PAYMENT_EXPIRY_MINUTES * 60
    });
  } catch (error) {
    console.error('❌ create-payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/get-payment-info', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: "paymentId required" });
    
    const data = await readJSONBin();
    const payment = data.pending_payments?.[paymentId];
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

app.post('/api/find-card', async (req, res) => {
  try {
    const { cardCode } = req.body;
    if (!cardCode || !cardCode.startsWith('byppcn-')) {
      return res.status(400).json({ success: false, error: "Invalid card code format" });
    }
    
    const data = await readJSONBin();
    const users = data.users || {};
    let foundAccount = null, userId = null;
    for (const [id, user] of Object.entries(users)) {
      if (user.cardCode === cardCode) {
        foundAccount = user; userId = id; break;
      }
    }
    if (!foundAccount) return res.status(404).json({ success: false, error: "Card not found" });
    
    res.json({
      success: true,
      accountId: userId,
      userData: { id: userId, name: foundAccount.name, balance: foundAccount.balance, cardCode: foundAccount.cardCode }
    });
  } catch (error) {
    console.error('❌ find-card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/verify-password', async (req, res) => {
  try {
    const { accountId, password } = req.body;
    if (!accountId || !password) {
      return res.status(400).json({ success: false, error: "accountId and password required" });
    }
    const authResponse = await axios.post(
      `https://b-y-pro-acounts-login.onrender.com/api/verify-account`,
      { id: accountId, password },
      { timeout: 10000 }
    );
    res.json(authResponse.data);
  } catch (error) {
    console.error('❌ verify-password error:', error);
    res.status(500).json({ success: false, error: "Auth service unavailable" });
  }
});

app.post('/api/process-payment', async (req, res) => {
  try {
    const { accountId, cardCode, amount, paymentId, appName, description } = req.body;
    if (!accountId || !cardCode || !amount || !paymentId || !appName) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    
    const data = await readJSONBin();
    const payment = data.pending_payments?.[paymentId];
    if (!payment) return res.status(404).json({ success: false, error: "Payment not found" });
    if (new Date(payment.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: "Payment expired" });
    }
    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, error: "Payment already processed" });
    }
    
    const users = data.users || {};
    const user = users[accountId];
    if (!user || user.cardCode !== cardCode) {
      return res.status(400).json({ success: false, error: "Invalid account or card" });
    }
    
    const amountNum = parseFloat(amount);
    if (user.balance < amountNum) {
      return res.status(402).json({ success: false, error: "Insufficient balance" });
    }
    
    user.balance -= amountNum;
    user.transactions = user.transactions || [];
    const transaction = {
      type: 'payment',
      amount: amountNum,
      appName: appName,
      paymentId: paymentId,
      date: new Date().toISOString(),
      description: description || payment.description || `Payment to ${appName}`
    };
    user.transactions.unshift(transaction);
    
    payment.status = 'completed';
    payment.completedAt = new Date().toISOString();
    payment.accountId = accountId;
    
    await writeJSONBin(data);
    
    if (payment.callbackUrl) {
      const callbackData = { paymentId, success: true, accountId, amount: amountNum, transactionId: `txn_${Date.now()}`, timestamp: new Date().toISOString(), description: transaction.description };
      axios.post(payment.callbackUrl, callbackData, { timeout: 5000 }).catch(e => console.log('Callback failed:', e.message));
    }
    
    res.json({
      success: true,
      newBalance: user.balance,
      transactionId: `txn_${Date.now()}`,
      transaction
    });
  } catch (error) {
    console.error('❌ process-payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUTH ROUTES (MODIFIED) ====================
app.get('/api/ping', (req, res) => {
  res.json({ success: true, time: Date.now(), status: 'awake' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'B.Y PRO v7.0',
    email_provider: 'Brevo SMTP',
    payment_gateway: 'active',
    financial_integration: 'active',
    timestamp: new Date().toISOString()
  });
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

app.post('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) return res.json({ success: false, error: "ID and password required" });
    const result = await verifyAccount(id, password);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: "Service unavailable" });
  }
});

app.get('/api/next-id', (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey !== INTERNAL_API_KEY) return res.status(403).json({ success: false, error: "Access denied" });
  next();
}, async (req, res) => {
  try {
    const nextId = await getNextId();
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * CREATE ACCOUNT - المعدل ليشمل إنشاء حساب مالي تلقائياً
 */
app.post('/api/create-account', async (req, res) => {
  try {
    const { id, name, email, password, otpCode } = req.body;
    
    // التحقق من البيانات
    if (!id || !name || !email || !password || !otpCode) {
      return res.status(400).json({ success: false, error: "All fields required" });
    }
    
    // التحقق من OTP
    const otpResult = await verifyOTP(email, otpCode);
    if (!otpResult.success) {
      return res.status(400).json({ success: false, error: otpResult.error });
    }
    
    // إنشاء الحساب في Google Drive (Auth)
    const finalId = await addAccount({ id: id.toString(), ps: password, email, name });
    
    // إنشاء الحساب المالي في JSONBin مع بطاقة فريدة
    const financialAccount = await createFinancialAccount(finalId, name, email);
    
    if (!financialAccount) {
      console.error('⚠️ Failed to create financial account for user:', finalId);
    }
    
    // إنشاء QR Code
    const qrResult = await generateQR(`BYPRO:${finalId}:${password}`);
    
    res.json({
      success: true,
      message: "Account created successfully",
      account: { 
        id: finalId, 
        name, 
        email 
      },
      financialAccount: financialAccount ? {
        cardCode: financialAccount.cardCode,
        balance: financialAccount.balance
      } : null,
      qrCode: qrResult.qrCode
    });
    
  } catch (error) {
    console.error('❌ Error creating account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== FINANCIAL DATA ENDPOINTS ====================
app.get('/api/financial/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await readJSONBin();
    const userData = data.users?.[userId];
    
    if (!userData) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    res.json({
      success: true,
      data: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        balance: userData.balance,
        cardCode: userData.cardCode,
        transactions: userData.transactions || []
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
    
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    const data = await readJSONBin();
    const user = data.users?.[userId];
    
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    const amountNum = parseFloat(amount);
    user.balance += amountNum;
    user.transactions = user.transactions || [];
    user.transactions.unshift({
      type: 'deposit',
      amount: amountNum,
      description: description || 'Admin deposit',
      date: new Date().toISOString()
    });
    
    await writeJSONBin(data);
    
    res.json({
      success: true,
      newBalance: user.balance
    });
  } catch (error) {
    console.error('❌ Error adding balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Static pages
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO ACCOUNTS v7.0');
  console.log('✅ CORS: FULLY ENABLED');
  console.log('✅ Email: BREVO SMTP');
  console.log('✅ Keep-Alive: ACTIVE');
  console.log('✅ Payment Gateway: ACTIVE');
  console.log('✅ Financial Integration: ACTIVE');
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log('🎉 =================================\n');
});

server.timeout = 30000;
server.keepAliveTimeout = 30000;
