const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Accounts System v5.0 (Secure Edition with ENV)');

// ==================== ENVIRONMENT VARIABLES ====================
const {
  // Elastic Email
  ELASTIC_EMAIL_API_KEY,
  ELASTIC_EMAIL_FROM = 'yassinebenmokran@gmail.com',
  ELASTIC_EMAIL_FROM_NAME = 'B.Y PRO Accounts',
  
  // Google Drive Service Account
  GOOGLE_PRIVATE_KEY,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_CLIENT_ID,
  GOOGLE_PRIVATE_KEY_ID,
  GOOGLE_PROJECT_ID,
  GOOGLE_CLIENT_CERT_URL,
  
  // Internal
  INTERNAL_API_KEY = 'bypro-internal-key-default',
  ALLOWED_ORIGINS = 'https://yacine2007.github.io,http://localhost:5500,http://localhost:3000',
  NODE_ENV = 'production',
  
  // GitHub (اختياري)
  GITHUB_TOKEN
} = process.env;

// التحقق من وجود المفاتيح الأساسية
if (!ELASTIC_EMAIL_API_KEY && NODE_ENV === 'production') {
  console.error('❌ FATAL: ELASTIC_EMAIL_API_KEY is not set in environment variables');
  process.exit(1);
}

if (!GOOGLE_PRIVATE_KEY || !GOOGLE_CLIENT_EMAIL) {
  console.error('❌ FATAL: Google Drive credentials are not set in environment variables');
  process.exit(1);
}

// ==================== GOOGLE DRIVE SERVICE ACCOUNT ====================
const serviceAccount = {
  type: "service_account",
  project_id: GOOGLE_PROJECT_ID,
  private_key_id: GOOGLE_PRIVATE_KEY_ID,
  private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // مهم جداً لتحويل \n إلى أسطر جديدة
  client_email: GOOGLE_CLIENT_EMAIL,
  client_id: GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: GOOGLE_CLIENT_CERT_URL,
  universe_domain: "googleapis.com"
};

// ==================== GOOGLE DRIVE FILE IDs ====================
// هذه القيم ثابتة وليست سرية - يمكن وضعها هنا مباشرة
const ACCOUNTS_FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";
const OTP_FILE_ID = "10gOdT98Pk5nhk-cfDA0B24rk8xqsKWE1"; // ملف OTP الجديد

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

const corsOptions = {
  origin: function (origin, callback) {
    // السماح بالطلبات بدون origin (مثل Postman أو التطبيقات المحلية)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-api-key']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}${req.query.email ? ` | Email: ${req.query.email}` : ''}`);
  next();
});

// ==================== GOOGLE DRIVE INITIALIZATION ====================
let driveService = null;

async function initializeDriveService() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    
    driveService = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive service initialized');
    
    // التحقق من الوصول إلى الملفات
    try {
      await driveService.files.get({ fileId: ACCOUNTS_FILE_ID, fields: 'id' });
      console.log('✅ Accounts file accessible');
      
      await driveService.files.get({ fileId: OTP_FILE_ID, fields: 'id' });
      console.log('✅ OTP file accessible');
    } catch (fileError) {
      console.error('❌ Cannot access Drive files:', fileError.message);
    }
  } catch (error) {
    console.error('❌ Google Drive init failed:', error.message);
  }
}

initializeDriveService();

// ==================== OTP STORAGE FUNCTIONS ====================
async function readOTPFromDrive() {
  if (!driveService) throw new Error("Google Drive service is not initialized");

  try {
    const response = await driveService.files.get({
      fileId: OTP_FILE_ID,
      alt: 'media'
    });
    return response.data || {};
  } catch (error) {
    console.error('❌ Error reading OTP file:', error.message);
    if (error.message.includes('404')) {
      // إذا الملف غير موجود، أنشئه
      await createOTPFile();
      return {};
    }
    throw error;
  }
}

async function saveOTPToDrive(otpData) {
  if (!driveService) throw new Error("Google Drive service is not initialized");

  try {
    await driveService.files.update({
      fileId: OTP_FILE_ID,
      media: { 
        mimeType: 'application/json', 
        body: JSON.stringify(otpData, null, 2) 
      },
      fields: 'id,modifiedTime'
    });
    return true;
  } catch (error) {
    console.error('❌ Error saving OTP file:', error.message);
    throw error;
  }
}

async function createOTPFile() {
  try {
    // محاولة إنشاء ملف جديد
    const response = await driveService.files.create({
      resource: {
        name: 'otp-storage.json',
        mimeType: 'application/json'
      },
      media: {
        mimeType: 'application/json',
        body: '{}'
      }
    });
    
    console.log('✅ OTP file created with ID:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('❌ Failed to create OTP file:', error.message);
    throw error;
  }
}

async function storeOTP(email, otp) {
  try {
    const otpData = await readOTPFromDrive();
    
    otpData[email] = {
      otp: otp,
      expires: Date.now() + 10 * 60 * 1000, // 10 دقائق
      attempts: 0,
      createdAt: new Date().toISOString()
    };
    
    await saveOTPToDrive(otpData);
    console.log(`✅ OTP stored for ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error storing OTP:', error.message);
    return false;
  }
}

async function verifyAndRemoveOTP(email, submittedOtp) {
  try {
    const otpData = await readOTPFromDrive();
    const storedData = otpData[email];
    
    if (!storedData) {
      return { success: false, error: "No verification code found" };
    }

    if (Date.now() > storedData.expires) {
      delete otpData[email];
      await saveOTPToDrive(otpData);
      return { success: false, error: "Verification code expired" };
    }

    storedData.attempts += 1;
    
    if (storedData.attempts > 5) {
      delete otpData[email];
      await saveOTPToDrive(otpData);
      return { success: false, error: "Too many attempts" };
    }

    if (storedData.otp === submittedOtp) {
      // نجاح - احذف الـ OTP
      delete otpData[email];
      await saveOTPToDrive(otpData);
      return { success: true };
    } else {
      // فشل - حدث البيانات
      await saveOTPToDrive(otpData);
      return { 
        success: false, 
        error: "Invalid code", 
        remainingAttempts: 5 - storedData.attempts 
      };
    }
  } catch (error) {
    console.error('❌ Error verifying OTP:', error.message);
    return { success: false, error: "OTP verification failed" };
  }
}

// ==================== EMAIL FUNCTION ====================
async function sendOTPEmail(email, otpCode) {
  try {
    console.log(`📨 Sending OTP via Elastic Email to: ${email}`);
    
    const response = await axios.post('https://api.elasticemail.com/v2/email/send', null, {
      params: {
        apikey: ELASTIC_EMAIL_API_KEY,
        from: ELASTIC_EMAIL_FROM,
        fromName: ELASTIC_EMAIL_FROM_NAME,
        to: email,
        subject: 'B.Y PRO - Verification Code',
        bodyHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3498db, #2980b9); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">B.Y PRO Accounts</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure Account Verification</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Email Verification Code</h2>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
                Use the following verification code to complete your account registration:
              </p>
              
              <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 25px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);">
                ${otpCode}
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>⚠️ Important:</strong> This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
                </p>
              </div>
            </div>
          </div>
        `,
        isTransactional: true
      },
      timeout: 10000
    });

    if (response.data.success) {
      console.log(`✅ Elastic Email sent successfully to: ${email}`);
      return { success: true, messageId: response.data.data.messageid };
    } else {
      console.error('❌ Elastic Email API error:', response.data.error);
      return { success: false, error: response.data.error || 'Email sending failed' };
    }
  } catch (error) {
    console.error('❌ Elastic Email sending failed:', error.message);
    return { success: false, error: 'Email service temporarily unavailable' };
  }
}

// ==================== GITHUB ACCOUNTS FETCHING ====================
async function fetchGitHubAccounts() {
  try {
    const headers = {
      'User-Agent': 'B.Y-PRO-System',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // إذا كان هناك GITHUB_TOKEN، استخدمه لمعدلات أعلى
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }
    
    const response = await axios.get(
      'https://api.github.com/repos/yacine2007/secure-auth-app/contents/accounts.json',
      { headers, timeout: 5000 }
    );

    if (response.data && response.data.content) {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    console.log('ℹ️ Using local accounts - GitHub fetch failed:', error.message);
    return [];
  }
}

// ==================== CSV OPERATIONS ====================
async function readCSVFromDrive() {
  if (!driveService) throw new Error("Google Drive service is not initialized");

  try {
    const response = await driveService.files.get({
      fileId: ACCOUNTS_FILE_ID,
      alt: 'media'
    });
    return response.data;
  } catch (error) {
    if (error.message.includes('404')) return '';
    throw error;
  }
}

function parseCSVToAccounts(csvData) {
  try {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const accounts = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || (i === 0 && line.includes('id,ps,email,name'))) continue;
      
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);
      
      if (values.length >= 2) {
        accounts.push({
          id: values[0] || '',
          ps: values[1] || '',
          email: values[2] || '',
          name: values[3] || ''
        });
      }
    }
    return accounts;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error.message);
    return [];
  }
}

async function saveAllAccounts(accounts) {
  if (!driveService) throw new Error("Google Drive service is not initialized");

  const headers = ['id', 'ps', 'email', 'name'];
  const csvLines = [
    headers.join(','),
    ...accounts.map(account => 
      headers.map(header => 
        account[header] ? `"${account[header].toString().replace(/"/g, '""')}"` : '""'
      ).join(',')
    )
  ];
  
  const csvContent = csvLines.join('\n');
  
  await driveService.files.update({
    fileId: ACCOUNTS_FILE_ID,
    media: { mimeType: 'text/csv', body: csvContent },
    fields: 'id,modifiedTime'
  });

  return true;
}

async function getNextAvailableId() {
  try {
    const csvData = await readCSVFromDrive();
    const accounts = parseCSVToAccounts(csvData);
    
    if (accounts.length === 0) return "1001";
    
    const ids = accounts.map(acc => parseInt(acc.id)).filter(id => !isNaN(id));
    if (ids.length === 0) return "1001";
    
    return (Math.max(...ids) + 1).toString();
  } catch (error) {
    return (1000 + Math.floor(Math.random() * 9000)).toString();
  }
}

async function addNewAccount(accountData) {
  const csvData = await readCSVFromDrive();
  let accounts = parseCSVToAccounts(csvData);
  
  if (accountData.email) {
    const existingAccount = accounts.find(acc => acc.email === accountData.email);
    if (existingAccount) throw new Error("An account with this email already exists");
  }
  
  const existingId = accounts.find(acc => acc.id === accountData.id);
  if (existingId) {
    accountData.id = await getNextAvailableId();
  }
  
  accounts.push(accountData);
  await saveAllAccounts(accounts);
  return true;
}

async function verifyAccountCredentials(id, password) {
  try {
    const csvData = await readCSVFromDrive();
    const accounts = parseCSVToAccounts(csvData);
    
    const account = accounts.find(acc => 
      acc.id && acc.id.toString() === id.toString() && 
      acc.ps && acc.ps === password
    );
    
    if (account) {
      return {
        success: true,
        account: {
          id: account.id,
          name: account.name || `User ${account.id}`,
          email: account.email || `${account.id}@bypro.com`,
          profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name || account.id)}&background=3498db&color=fff&size=100`
        }
      };
    } else {
      return { success: false, error: "Invalid credentials provided" };
    }
  } catch (error) {
    console.error('❌ Error verifying account:', error.message);
    return { success: false, error: "Authentication service temporarily unavailable" };
  }
}

// ==================== OTP FUNCTIONS ====================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== QR CODE FUNCTIONS ====================
async function generateQRCode(qrData) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: { dark: "#1a237e", light: "#ffffff" },
      errorCorrectionLevel: 'H'
    });

    return { success: true, qrCode: qrCodeDataURL, qrData: qrData };
  } catch (error) {
    return { success: false, error: "QR code generation failed" };
  }
}

// ==================== MIDDLEWARE FOR PROTECTED ROUTES ====================
function requireInternalApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (apiKey === INTERNAL_API_KEY) {
    next();
  } else {
    res.status(403).json({ success: false, error: "Access denied. Invalid API key." });
  }
}

// ==================== ROUTES ====================
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'operational',
    service: 'B.Y PRO Accounts System v5.0',
    email_provider: 'Elastic Email API',
    timestamp: new Date().toISOString(),
    version: '5.0.0',
    features: ['signup', 'login', 'otp_verification', 'qr_codes', 'github_accounts']
  });
});

// GET all accounts with GitHub accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const csvData = await readCSVFromDrive();
    const driveAccounts = parseCSVToAccounts(csvData);
    
    const githubAccounts = await fetchGitHubAccounts();
    
    const allAccounts = [
      ...driveAccounts.map(acc => ({
        ...acc,
        profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.name || acc.id)}&background=3498db&color=fff&size=100`,
        source: 'drive'
      })),
      ...githubAccounts.map(acc => ({
        ...acc,
        profileImage: acc.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.name || acc.id)}&background=e74c3c&color=fff&size=100`,
        source: 'github'
      }))
    ];
    
    res.json({
      success: true,
      count: allAccounts.length,
      drive_count: driveAccounts.length,
      github_count: githubAccounts.length,
      accounts: allAccounts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }

    const otp = generateOTP();
    const stored = await storeOTP(email, otp);
    
    if (!stored) {
      return res.status(500).json({ success: false, error: "Failed to store verification code" });
    }

    const emailResult = await sendOTPEmail(email, otp);
    
    if (emailResult.success) {
      res.json({ success: true, message: "Verification code sent to your email", expiresIn: "10 minutes" });
    } else {
      // حذف OTP إذا فشل الإرسال
      await verifyAndRemoveOTP(email, '');
      res.status(500).json({ success: false, error: emailResult.error || "Email service is currently unavailable" });
    }
  } catch (error) {
    console.error('❌ Error in /api/send-otp:', error.message);
    res.status(500).json({ success: false, error: "Server error while sending verification code" });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Email and code are required" });
    }

    const result = await verifyAndRemoveOTP(email, otp);
    
    if (result.success) {
      res.json({ success: true, message: "Verification successful" });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error in /api/verify-otp:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Account verification (POST version)
app.post('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.body;
    
    if (!id || !password) {
      return res.json({ success: false, error: "ID and password are required" });
    }

    const result = await verifyAccountCredentials(id, password);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/verify-account:', error.message);
    res.json({ success: false, error: "Authentication service unavailable" });
  }
});

// Get next ID (محمي)
app.get('/api/next-id', requireInternalApiKey, async (req, res) => {
  try {
    const nextId = await getNextAvailableId();
    res.json({ success: true, nextId: nextId });
  } catch (error) {
    console.error('❌ Error in /api/next-id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create account (مع التحقق من OTP)
app.post('/api/create-account', async (req, res) => {
  try {
    const { id, name, email, password, otpCode } = req.body;
    
    if (!id || !name || !email || !password || !otpCode) {
      return res.status(400).json({ success: false, error: "All fields including OTP code are required" });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }

    // التحقق من OTP أولاً
    const otpResult = await verifyAndRemoveOTP(email, otpCode);
    
    if (!otpResult.success) {
      return res.status(400).json({ success: false, error: otpResult.error || "Invalid verification code" });
    }

    const accountData = { id: id.toString(), ps: password, email: email, name: name };
    await addNewAccount(accountData);
    
    const qrData = `BYPRO:${accountData.id}:${accountData.ps}`;
    const qrResult = await generateQRCode(qrData);

    res.json({
      success: true,
      message: "Account created successfully",
      account: {
        id: accountData.id,
        name: accountData.name,
        email: accountData.email
      },
      qrCode: qrResult.qrCode
    });
  } catch (error) {
    console.error('❌ Error in /api/create-account:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO ACCOUNTS SYSTEM v5.0');
  console.log('✅ CORS: SECURE');
  console.log('✅ Email: ELASTIC EMAIL API (from ENV)');
  console.log('✅ OTP Storage: Google Drive (persistent)');
  console.log('✅ Protected Routes: /api/next-id');
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log('🎉 =================================\n');
});
