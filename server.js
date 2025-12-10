const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Accounts System with Elastic Email...');

// ==================== CORS CONFIGURATION ====================
const corsOptions = {
  origin: ['https://yacine2007.github.io', 'http://localhost:5500', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'api-key', 'x-api-key']
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

// ==================== ELASTIC EMAIL CONFIGURATION ====================
const ELASTIC_EMAIL_API_KEY = '34CC2EC945AB6ACE1CA8E645CA68401D7BDB1685CF320FD29CE3B26F2D5506E3EA97997A22F8D2CF000475649A280DFA';
const ELASTIC_EMAIL_FROM = 'yassinebenmokran@gmail.com';
const ELASTIC_EMAIL_FROM_NAME = 'B.Y PRO Accounts';

console.log('📧 Elastic Email configured');

// ==================== STORAGE ====================
const otpStorage = new Map();
const acceptedRules = new Set();

// ==================== GOOGLE DRIVE CONFIGURATION ====================
const serviceAccount = {
  type: "service_account",
  project_id: "database-accounts-469323",
  private_key_id: "fae1257403e165cb23ebe2b9c1b3ad65f9f2ceb9",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCv21dq6NdpJml3
MzaF1+Q618iqtL6SQFglh7wKmwgQBjEqOX3mrlGfeZ7GdEx/JE8NGIuldx79Cgxn
x6r2H4EuVOLFeG9yheJTYDlkIwrXfcZcQmqixoOsdjKYCPdmyU21zsPWp+9kHKfD
FVhmaJacn1qf7dhVEUjZaMxPqEG6rsdGj+AboIwG61Vls393wwhBbKTKaIM8CTaS
057mmTpMfjF7ocaipKSqOqG1xsQgvt6Q/OROTWW+KiX6l/tUUynXcFHkGZ3ltuiP
6wiVXTpP/w+fT1eaRS1Rc8nG8uZ/pOtz58fodOxCVANGpFKa5NjxMhdWfC5AS77P
WhBVuNczAgMBAAECggEAEGurSHzQbG2dSHecPjgwA/yVLLdu2govEOYRPW5HfPOP
ELHIm0sorPr2w/IlGHQj+4WQuJUcbCVNjj07Lfs4HULo3+aEhY2R2hYwlbSd9Qw2
AvRir6tYrThmNgMUUuE2I+VYLQmGVXNFiPZLyFg4xAwvMqLLYfoYstBRz5hW9t7m
dbquKWoVsVp52uPeKbrwugLpT3WlMRsYRVb8ydy6tHHvOm/2deVPSH1z8hnOFUkK
y1PEAS+P839w7+5bYdUtKBgP/IhrXxGgddAWJtm0wC33HPCa1/eD0ajIdTrouudz
qCiOyuGo6qvjzUR+c9pmtv2lIR4b7kXLlZDxfxWM4QKBgQDURGhhQVyDRnK7xwMb
t9hFS9FNPC0NaxoFqe2ZMvrQipN4YFF9xm2jdKNjKM7b8+Y0oWPkdK7B/DFYZqPd
vpOFFx5eJ5GYTTCBNiCcz616um5gb8sGCVKTpFNPi4cFKr2z4uro8NroVFyQTQHj
CvZb6vgyyD1/2fv8BAyAdJ2wIQKBgQDUForQEX8el2zmHjWFwZYHltkjNNYB9/6s
sqEzaTeawhQRduENvAiamaWIfTUkubHGuQtWXR7VKRiOr8gNQw/xgR8ZojN6+yXE
ZBRtB6SYdCxK6iszkY9mseRA1gXJiUVnEEyLfbNqrf2JeZc8creO5Ei9GH6ZzTZl
F8taShss0wKBgENQWkWVQ7BBs/rGdr7gg04eaAZ1MdhSgZMQO0/c8dsWRwPij5Uy
SuyN/Y5hj5AC/ZrtH0+AjTbpMgDVs9uLJx8KoM+8/pfsypf/QUJZPatw2bXtXdXR
OQWnE+Bi3/OMhVI5gMNUNid9MUl1kkac4Flv3zvDcnVL/HQEGK7XzHXhAoGAHriJ
MOxn4nGCt66GiDJrXfwOxdfAbBaVEETrrru97y/Polv663diM6qv3J5uVTyEsMlb
CA6DCdNjGEAEFU+yfoP6kkb5eAXrCZCJmOVzhRXG2K8kxNp/0BtSecXGntPAdtZY
kBgMJha/0+sF6h6f0hXlJ2bl57de+rPAo/p6BzsCgYEAqMy0Y8678tEPdmsEHADD
XDDBd0H/36h/k1KN46/bM5K6JctZzZAm/MQiOgLs41fnSuj8NLkplywz3X9maVxe
6YCzxJQ/rxUCyOjTjxBAMEy+YBTTD0NKiUzWoZP2TPCLPHDm2dhkPQWfSVXL7BpV
M3qhrxZapGK4rnHRMLd9zBY=
-----END PRIVATE KEY-----`,
  client_email: "admin-319@database-accounts-469323.iam.gserviceaccount.com",
  client_id: "112725223865398470283",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/admin-319%40database-accounts-469323.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";

let driveService = null;

async function initializeDriveService() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
    
    driveService = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive service initialized');
  } catch (error) {
    console.error('❌ Google Drive init failed:', error.message);
  }
}

initializeDriveService();

// ==================== EMAIL FUNCTION (ELASTIC EMAIL API) ====================
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
      timeout: 10000 // 10 second timeout
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
    const response = await axios.get('https://api.github.com/repos/yacine2007/secure-auth-app/contents/accounts.json', {
      headers: {
        'User-Agent': 'B.Y-PRO-System',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 5000
    });

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
      fileId: FILE_ID,
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
    fileId: FILE_ID,
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
      const hasAcceptedRules = acceptedRules.has(account.id);
      
      return {
        success: true,
        account: {
          id: account.id,
          name: account.name || `User ${account.id}`,
          email: account.email || `${account.id}@bypro.com`,
          profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name || account.id)}&background=3498db&color=fff&size=100`
        },
        accepted_rules: hasAcceptedRules,
        rules_url: hasAcceptedRules ? null : `/rules-popup?userId=${account.id}`
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

// ==================== ROUTES ====================
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'operational',
    service: 'B.Y PRO Accounts System',
    email_provider: 'Elastic Email API',
    timestamp: new Date().toISOString(),
    version: '4.0.0',
    features: ['signup', 'login', 'otp_verification', 'qr_codes', 'github_accounts']
  });
});

// GET all accounts with GitHub accounts
app.get('/api/accounts', async (req, res) => {
  try {
    // Fetch from Google Drive
    const csvData = await readCSVFromDrive();
    const driveAccounts = parseCSVToAccounts(csvData);
    
    // Fetch from GitHub
    const githubAccounts = await fetchGitHubAccounts();
    
    // Combine accounts with profile images
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
    otpStorage.set(email, {
      otp: otp,
      expires: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      createdAt: new Date().toISOString()
    });

    const emailResult = await sendOTPEmail(email, otp);
    
    if (emailResult.success) {
      res.json({ success: true, message: "Verification code sent to your email", expiresIn: "10 minutes" });
    } else {
      otpStorage.delete(email);
      res.status(500).json({ success: false, error: emailResult.error || "Email service is currently unavailable" });
    }
  } catch (error) {
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

    const storedData = otpStorage.get(email);
    
    if (!storedData) {
      return res.status(400).json({ success: false, error: "No verification code found. Request a new code." });
    }

    if (Date.now() > storedData.expires) {
      otpStorage.delete(email);
      return res.status(400).json({ success: false, error: "Verification code expired. Request a new code." });
    }

    storedData.attempts += 1;
    
    if (storedData.attempts > 5) {
      otpStorage.delete(email);
      return res.status(400).json({ success: false, error: "Too many attempts. Request a new code." });
    }

    if (storedData.otp === otp) {
      otpStorage.delete(email);
      res.json({ success: true, message: "Verification successful" });
    } else {
      res.status(400).json({ success: false, error: "Invalid verification code", remainingAttempts: 5 - storedData.attempts });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Account verification
app.get('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.query;
    
    if (!id || !password) {
      return res.json({ success: false, error: "ID and password are required" });
    }

    const result = await verifyAccountCredentials(id, password);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: "Authentication service unavailable" });
  }
});

// Get next ID
app.get('/api/next-id', async (req, res) => {
  try {
    const nextId = await getNextAvailableId();
    res.json({ success: true, nextId: nextId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create account
app.post('/api/create-account', async (req, res) => {
  try {
    const { id, name, email, password } = req.body;
    
    if (!id || !name || !email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "All valid fields are required" });
    }

    const accountData = { id: id.toString(), ps: password, email: email, name: name };
    await addNewAccount(accountData);
    
    const qrData = `BYPRO:${accountData.id}:${accountData.ps}`;
    const qrResult = await generateQRCode(qrData);

    res.json({
      success: true,
      message: "Account created successfully",
      account: accountData,
      qrCode: qrResult.qrCode
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rules system
app.get('/api/check-rules', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ success: false, error: "User ID is required" });
    res.json({ success: true, accepted: acceptedRules.has(userId) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/accept-rules', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: "User ID is required" });
    acceptedRules.add(userId);
    res.json({ success: true, message: "Rules accepted successfully" });
  } catch (error) {
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
  console.log('🚀 B.Y PRO ACCOUNTS SYSTEM v4.0');
  console.log('✅ CORS: FIXED');
  console.log('✅ Email: ELASTIC EMAIL API');
  console.log('✅ GitHub Accounts: ENABLED');
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log('💾 Storage: Google Drive + GitHub');
  console.log('📧 Email Provider: Elastic Email (100/day FREE)');
  console.log('🎉 =================================\n');
});

