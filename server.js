const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Accounts Server (Financial removed)');

// ==================== ENVIRONMENT VARIABLES ====================
const {
  GOOGLE_PRIVATE_KEY,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_CLIENT_ID,
  GOOGLE_PRIVATE_KEY_ID,
  GOOGLE_PROJECT_ID,
  GOOGLE_CLIENT_CERT_URL,
  INTERNAL_API_KEY = 'bypro-internal-key-2025',
  ALLOWED_ORIGINS = 'https://yacine2007.github.io,https://b-y-pro-acounts-login.onrender.com,http://localhost:5500,http://localhost:3000,http://localhost:5000,http://localhost:5001',
  IMGBB_API_KEY
} = process.env;

// ==================== MULTER SETUP ====================
const upload = multer({ storage: multer.memoryStorage() });

// ==================== GOOGLE DRIVE SETUP ====================
const ACCOUNTS_FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";

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

async function generateUniqueId() {
  const existingAccounts = await getAllAuthAccounts();
  const existingIds = new Set(existingAccounts.map(a => a.id));
  let newId;
  do {
    newId = Math.floor(10000 + Math.random() * 90000).toString();
  } while (existingIds.has(newId));
  return newId;
}

async function addAuthAccount(account) {
  const csv = await readCSV();
  let accounts = parseCSV(csv);
  if (accounts.find(a => a.email === account.email)) throw new Error("Email already exists");
  
  if (!account.id) {
    account.id = await generateUniqueId();
  } else {
    const existing = accounts.find(a => a.id === account.id);
    if (existing) throw new Error("ID already exists");
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

async function deleteAuthAccountPermanently(id) {
  const csv = await readCSV();
  let accounts = parseCSV(csv);
  const index = accounts.findIndex(a => a.id === id);
  if (index === -1) throw new Error("Account not found");
  accounts.splice(index, 1);
  await saveCSV(accounts);
  return true;
}

// ==================== AVATAR UPLOAD ====================
async function uploadToImgBB(buffer, filename) {
  if (!IMGBB_API_KEY) throw new Error('IMGBB_API_KEY not configured');
  
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', buffer.toString('base64'));
  if (filename) formData.append('name', filename);
  
  const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
    headers: formData.getHeaders(),
    timeout: 30000
  });
  
  if (response.data && response.data.success && response.data.data && response.data.data.url) {
    return response.data.data.url;
  } else {
    throw new Error('ImgBB upload failed: ' + JSON.stringify(response.data));
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

// ==================== QR CODE ====================
async function generateQR(data) {
  try {
    const qr = await QRCode.toDataURL(data, { width: 200, margin: 2, errorCorrectionLevel: 'H' });
    return { success: true, qrCode: qr };
  } catch { return { success: false }; }
}

// ==================== CORS ====================
const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim());

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || origin === 'null') return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-api-key'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - Origin: ${req.headers.origin || 'no origin'}`);
  next();
});

// ==================== AUTH ENDPOINTS ====================

// Get all accounts (requires API-Key)
app.get('/api/accounts', async (req, res) => {
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
        password: acc.ps,  // include password for editing
        blocked: acc.blocked || false,
        avatar: acc.avatar || 'https://i.ibb.co/SDxkt40s/user.png'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single account
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
        password: account.ps,
        blocked: account.blocked || false,
        avatar: account.avatar || 'https://i.ibb.co/SDxkt40s/user.png'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update account
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

// Delete account (permanent)
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    await deleteAuthAccountPermanently(req.params.id);
    res.json({ success: true, message: "Account permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Block/unblock account
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

// Verify account (login)
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

// Create account (signup)
app.post('/api/create-account', async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email and password are required" });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Invalid email format" });
    }
    
    const newId = await generateUniqueId();
    
    const newAccount = {
      id: newId,
      ps: password,
      email,
      name,
      avatar: avatar || 'https://i.ibb.co/SDxkt40s/user.png'
    };
    
    const createdId = await addAuthAccount(newAccount);
    const qrResult = await generateQR(`BYPRO:${createdId}:${password}`);
    
    res.json({
      success: true,
      message: "Account created successfully",
      account: {
        id: createdId,
        name,
        email,
        password,
        avatar: avatar || 'https://i.ibb.co/SDxkt40s/user.png'
      },
      qrCode: qrResult.qrCode
    });
    
  } catch (error) {
    console.error('❌ Error creating account:', error);
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
    service: 'B.Y PRO Accounts (No Financial)',
    auth_storage: 'Google Drive',
    email_provider: 'Brevo SMTP (if configured)',
    avatar_support: !!IMGBB_API_KEY,
    id_generation: 'random (5-digit)',
    endpoints: {
      auth: ['/api/accounts', '/api/accounts/:id', '/api/accounts/:id/avatar', '/api/accounts/:id/avatar-url', '/api/verify-account', '/api/create-account'],
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== STATIC PAGES ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
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
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🎉 =================================');
    console.log('🚀 B.Y PRO ACCOUNTS SERVER (No Financial)');
    console.log('✅ CORS: Allowed origins:', allowedOrigins);
    console.log('✅ Auth Storage: Google Drive');
    console.log('✅ Payment Gateway: REMOVED');
    console.log('✅ Financial Features: REMOVED');
    console.log('✅ Avatar Support: ' + (IMGBB_API_KEY ? 'ENABLED' : 'DISABLED'));
    console.log('✅ ID Generation: RANDOM (5 digits)');
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log('🎉 =================================\n');
  });
  
  server.timeout = 30000;
  server.keepAliveTimeout = 30000;
}

startServer();
