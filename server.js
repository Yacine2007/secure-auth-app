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

console.log('🚀 Starting B.Y PRO Accounts System v6.2 (Optimized with Keep-Alive)');

// ==================== ENVIRONMENT VARIABLES ====================
const {
  // Brevo SMTP
  BREVO_SMTP_HOST = 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT = 587,
  BREVO_SMTP_USER,
  BREVO_SMTP_KEY,
  
  // Google Drive Service Account
  GOOGLE_PRIVATE_KEY,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_CLIENT_ID,
  GOOGLE_PRIVATE_KEY_ID,
  GOOGLE_PROJECT_ID,
  GOOGLE_CLIENT_CERT_URL,
  
  // Internal
  INTERNAL_API_KEY = 'bypro-internal-key-2025',
  ALLOWED_ORIGINS = 'https://yacine2007.github.io,http://localhost:5500,http://localhost:3000,https://b-y-pro-acounts-login.onrender.com',
  NODE_ENV = 'production',
  
  GITHUB_TOKEN
} = process.env;

// التحقق من وجود المفاتيح
if (!BREVO_SMTP_USER || !BREVO_SMTP_KEY) {
  console.error('❌ FATAL: Brevo SMTP credentials are not set');
  process.exit(1);
}

if (!GOOGLE_PRIVATE_KEY || !GOOGLE_CLIENT_EMAIL) {
  console.error('❌ FATAL: Google Drive credentials are not set');
  process.exit(1);
}

// ==================== OPTIMIZATIONS ====================
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ==================== BREVO SMTP SETUP ====================
let brevoTransporter = null;

function createBrevoTransporter() {
  return nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: parseInt(BREVO_SMTP_PORT),
    secure: false,
    auth: {
      user: BREVO_SMTP_USER,
      pass: BREVO_SMTP_KEY
    },
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
      if (error) {
        console.log('⚠️ Brevo SMTP connection error:', error.message);
      } else {
        console.log('✅ Brevo SMTP ready');
      }
    });
  } catch (error) {
    console.error('❌ Brevo init error:', error.message);
  }
}

initializeBrevo();

async function sendOTPviaBrevo(email, otpCode) {
  try {
    if (!brevoTransporter) {
      brevoTransporter = createBrevoTransporter();
    }
    
    const mailOptions = {
      from: `"B.Y PRO Accounts" <${BREVO_SMTP_USER}>`,
      to: email,
      subject: 'B.Y PRO - Verification Code',
      html: `
        <div style="font-family: Arial; max-width:600px; margin:0 auto; background:#f5f5f5; padding:20px;">
          <div style="background:linear-gradient(135deg,#3498db,#2980b9); padding:30px; text-align:center; color:white; border-radius:10px 10px 0 0;">
            <h1>B.Y PRO Accounts</h1>
            <p>Secure Account Verification</p>
          </div>
          <div style="background:white; padding:30px; border-radius:0 0 10px 10px;">
            <h2>Email Verification Code</h2>
            <div style="background:linear-gradient(135deg,#3498db,#2980b9); color:white; padding:20px; text-align:center; font-size:32px; font-weight:bold; letter-spacing:8px; margin:25px 0; border-radius:8px;">
              ${otpCode}
            </div>
            <p>This code expires in 10 minutes.</p>
          </div>
        </div>
      `,
      text: `Your B.Y PRO verification code is: ${otpCode}. Expires in 10 minutes.`
    };

    const sendPromise = brevoTransporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SMTP timeout')), 10000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ Email sent to: ${email}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ==================== GOOGLE DRIVE ====================
const serviceAccount = {
  type: "service_account",
  project_id: GOOGLE_PROJECT_ID,
  private_key_id: GOOGLE_PRIVATE_KEY_ID,
  private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: GOOGLE_CLIENT_EMAIL,
  client_id: GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: GOOGLE_CLIENT_CERT_URL
};

const ACCOUNTS_FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";
const OTP_FILE_ID = "10gOdT98Pk5nhk-cfDA0B24rk8xqsKWE1";

// ==================== CORS ====================
const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim());

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
  methods: ['GET', 'POST', 'OPTIONS']
}));

app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ==================== GOOGLE DRIVE INIT ====================
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

// ==================== OTP FUNCTIONS ====================
async function readOTP() {
  if (!driveService) throw new Error("Drive not ready");
  try {
    const res = await driveService.files.get({ fileId: OTP_FILE_ID, alt: 'media' });
    return res.data || {};
  } catch {
    return {};
  }
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
  } catch {
    return '';
  }
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
  return true;
}

async function verifyAccount(id, password) {
  const csv = await readCSV();
  const accounts = parseCSV(csv);
  const account = accounts.find(a => a.id === id && a.ps === password);
  if (account) {
    return {
      success: true,
      account: {
        id: account.id,
        name: account.name || `User ${account.id}`,
        email: account.email || `${account.id}@bypro.com`
      }
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
  } catch {
    return { success: false };
  }
}

// ==================== PROTECTED ROUTE MIDDLEWARE ====================
function requireApiKey(req, res, next) {
  if (req.headers['x-api-key'] === INTERNAL_API_KEY || req.query.api_key === INTERNAL_API_KEY) {
    next();
  } else {
    res.status(403).json({ success: false, error: "Access denied" });
  }
}

// ==================== ROUTES ====================

// 🏓 Ping route - سريع جداً للإيقاظ
app.get('/api/ping', (req, res) => {
  res.json({ success: true, time: Date.now(), status: 'awake' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'B.Y PRO v6.2',
    email_provider: 'Brevo SMTP',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/send-otp', async (req, res) => {
  req.setTimeout(15000);
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email required" });
    }
    const otp = generateOTP();
    await storeOTP(email, otp);
    const emailResult = await sendOTPviaBrevo(email, otp);
    if (emailResult.success) {
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
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Email and code required" });
    }
    const result = await verifyOTP(email, otp);
    if (result.success) {
      res.json({ success: true, message: "Verified" });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) {
      return res.json({ success: false, error: "ID and password required" });
    }
    const result = await verifyAccount(id, password);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: "Service unavailable" });
  }
});

app.get('/api/next-id', requireApiKey, async (req, res) => {
  try {
    const nextId = await getNextId();
    res.json({ success: true, nextId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/create-account', async (req, res) => {
  try {
    const { id, name, email, password, otpCode } = req.body;
    if (!id || !name || !email || !password || !otpCode) {
      return res.status(400).json({ success: false, error: "All fields required" });
    }
    const otpResult = await verifyOTP(email, otpCode);
    if (!otpResult.success) {
      return res.status(400).json({ success: false, error: otpResult.error });
    }
    await addAccount({ id: id.toString(), ps: password, email, name });
    const qrResult = await generateQR(`BYPRO:${id}:${password}`);
    res.json({
      success: true,
      message: "Account created",
      account: { id, name, email },
      qrCode: qrResult.qrCode
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// ==================== KEEP-ALIVE (يبقي السيرفر مستيقظاً) ====================
// كل دقيقتين، نرسل طلب ping داخلي للحفاظ على السيرفر نشطاً
setInterval(async () => {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/ping`);
    if (response.ok) {
      console.log('💓 Keep-alive ping at', new Date().toISOString());
    }
  } catch (e) {
    // السيرفر لا يزال يعمل حتى لو فشل الطلب الداخلي
  }
}, 120000); // كل 120000 مللي ثانية = دقيقتين

// ==================== START SERVER ====================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO ACCOUNTS v6.2');
  console.log('✅ CORS: SECURE');
  console.log('✅ Email: BREVO SMTP');
  console.log('✅ Keep-Alive: ACTIVE (every 2 min)');
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`🏓 Ping: http://localhost:${PORT}/api/ping`);
  console.log('🎉 =================================\n');
});

server.timeout = 30000;
server.keepAliveTimeout = 30000;
