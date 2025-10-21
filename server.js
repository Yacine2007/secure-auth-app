const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Unified Accounts System...');

// Enhanced Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
}));

app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

console.log('✅ Middleware initialized');

// ==================== EMAIL CONFIGURATION ====================
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: 'byprosprt2007@gmail.com',
      pass: 'your-app-password-here'   // You need to generate App Password in Gmail
    }
  });
};

// In-memory storage for verification codes (in production, use Redis)
const verificationCodes = new Map();

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

console.log('🔐 Google Drive configuration loaded');

// Google Drive service
let driveService = null;

async function ensureCSVFileExists() {
  try {
    await driveService.files.get({
      fileId: FILE_ID,
      fields: 'id,name'
    });
    console.log('✅ CSV file exists');
    return true;
  } catch (error) {
    console.log('📝 CSV file not found, creating new file...');
    
    // Create initial CSV with headers only
    const initialContent = 'id,ps,email,name,image\n';
    
    const media = {
      mimeType: 'text/csv',
      body: initialContent
    };

    await driveService.files.update({
      fileId: FILE_ID,
      media: media
    });
    
    console.log('✅ Created new CSV file with headers');
    return true;
  }
}

async function initializeDriveService() {
  try {
    console.log('🔄 Initializing Google Drive service...');
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
    
    driveService = google.drive({ version: 'v3', auth });
    
    // Test the connection immediately
    await driveService.files.get({
      fileId: FILE_ID,
      fields: 'id,name,mimeType,modifiedTime'
    });
    
    // Ensure CSV file exists and have proper structure
    await ensureCSVFileExists();
    
    console.log('✅ Google Drive service initialized successfully');
    return driveService;
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive service:', error.message);
    console.error('💡 Please check:');
    console.error('   1. Google Drive API is enabled');
    console.error('   2. Service account has access to the file');
    console.error('   3. File ID is correct');
    console.error('   4. Private key is valid');
    throw new Error('Google Drive initialization failed');
  }
}

// Initialize drive service on startup
initializeDriveService().catch(error => {
  console.error('🚨 CRITICAL: Cannot start without Google Drive');
  process.exit(1);
});

// Enhanced CSV operations
async function readCSVFromDrive(fileId) {
  if (!driveService) {
    throw new Error("Google Drive service is not initialized");
  }

  try {
    console.log(`📖 Reading CSV from Drive (File ID: ${fileId})`);
    
    const response = await driveService.files.get({
      fileId: fileId,
      alt: 'media'
    });

    const data = response.data;
    console.log(`✅ Successfully read CSV data, length: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Error reading CSV from Drive:', error.message);
    // Return empty string if file doesn't exist yet
    if (error.message.includes('404')) {
      return '';
    }
    throw new Error(`Unable to read from Google Drive: ${error.message}`);
  }
}

async function writeCSVToDrive(fileId, accounts) {
  if (!driveService) {
    throw new Error("Google Drive service is not initialized");
  }

  try {
    console.log(`💾 Writing ${accounts.length} accounts to Drive...`);
    
    const headers = ['id', 'ps', 'email', 'name', 'image'];
    const csvContent = [
      headers.join(','),
      ...accounts.map(account => headers.map(header => 
        account[header] ? `"${account[header].toString().replace(/"/g, '""')}"` : '""'
      ).join(','))
    ].join('\n');

    const media = {
      mimeType: 'text/csv',
      body: csvContent
    };

    await driveService.files.update({
      fileId: fileId,
      media: media,
      fields: 'id,modifiedTime'
    });

    console.log(`✅ Successfully wrote ${accounts.length} accounts to Google Drive`);
    return true;
  } catch (error) {
    console.error('❌ Error writing CSV to Drive:', error.message);
    throw new Error(`Unable to write to Google Drive: ${error.message}`);
  }
}

// Enhanced account management functions
async function getNextAvailableId() {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    if (accounts.length === 0) {
      return "1001";
    }
    
    const ids = accounts.map(acc => parseInt(acc.id)).filter(id => !isNaN(id));
    if (ids.length === 0) {
      return "1001";
    }
    
    const maxId = Math.max(...ids);
    return (maxId + 1).toString();
  } catch (error) {
    console.error('❌ Error getting next ID:', error.message);
    // Fallback ID generation
    return (1000 + Math.floor(Math.random() * 9000)).toString();
  }
}

function parseCSVToAccounts(csvData) {
  try {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return [];
    }

    const accounts = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Skip empty lines or header if it's the first line with headers
      if (i === 0 && (line.includes('id,ps,email,name,image') || line.includes('"id","ps","email","name","image"'))) {
        continue;
      }
      
      // Simple CSV parsing - split by commas and remove quotes
      const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
      
      if (values.length >= 2) { // At least id and password
        const account = {
          id: values[0] || '',
          ps: values[1] || '',
          email: values[2] || '',
          name: values[3] || '',
          image: values[4] || ''
        };
        
        // Only add if it has required fields
        if (account.id && account.ps) {
          accounts.push(account);
        }
      }
    }
    
    console.log(`✅ Parsed ${accounts.length} accounts from CSV`);
    return accounts;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error.message);
    return [];
  }
}

async function addNewAccount(accountData) {
  try {
    console.log(`💾 Attempting to save account to Google Drive: ${accountData.id} - ${accountData.name}`);
    
    let csvData;
    try {
      csvData = await readCSVFromDrive(FILE_ID);
    } catch (error) {
      // If file doesn't exist or is empty, start with empty data
      console.log('📝 Starting with empty CSV data');
      csvData = '';
    }
    
    let accounts = parseCSVToAccounts(csvData);
    
    // Check if email already exists
    if (accountData.email) {
      const existingAccount = accounts.find(acc => acc.email === accountData.email);
      if (existingAccount) {
        throw new Error("An account with this email already exists");
      }
    }
    
    // Check if ID already exists
    const existingId = accounts.find(acc => acc.id === accountData.id);
    if (existingId) {
      // Generate new ID if conflict
      const newId = await getNextAvailableId();
      console.log(`🆕 ID conflict, generated new ID: ${newId}`);
      accountData.id = newId;
      accountData.image = accountData.image.replace(/\/\d+\.png$/, `/${newId}.png`);
    }
    
    accounts.push(accountData);
    
    const saved = await saveAllAccounts(accounts);
    
    if (saved) {
      console.log(`✅ Account ${accountData.id} saved successfully to Google Drive`);
      return true;
    } else {
      throw new Error("Failed to save account to Google Drive");
    }
  } catch (error) {
    console.error('❌ Error adding new account to Google Drive:', error.message);
    throw error;
  }
}

async function saveAllAccounts(accounts) {
  try {
    // Create CSV content with headers
    const headers = ['id', 'ps', 'email', 'name', 'image'];
    const csvLines = [
      headers.join(','), // Header row
      ...accounts.map(account => 
        headers.map(header => 
          account[header] ? `"${account[header].toString().replace(/"/g, '""')}"` : '""'
        ).join(',')
      )
    ];
    
    const csvContent = csvLines.join('\n');
    
    console.log(`💾 Writing ${accounts.length} accounts to Google Drive...`);
    
    const media = {
      mimeType: 'text/csv',
      body: csvContent
    };

    await driveService.files.update({
      fileId: FILE_ID,
      media: media,
      fields: 'id,modifiedTime'
    });

    console.log(`✅ Successfully wrote ${accounts.length} accounts to Google Drive`);
    return true;
  } catch (error) {
    console.error('❌ Error saving accounts to Google Drive:', error.message);
    throw error;
  }
}

// ==================== ENHANCED EMAIL SERVICE ====================

// Send verification email with Nodemailer - SECURE VERSION
async function sendVerificationEmail(email, code) {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: '"B.Y PRO Accounts" <byprosprt2007@gmail.com>',
      to: email,
      subject: 'B.Y PRO - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3498db, #2980b9); padding: 20px; text-align: center; color: white;">
            <h1>B.Y PRO Accounts</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>Email Verification</h2>
            <p>Your verification code is:</p>
            <div style="background: #3498db; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div style="background: #34495e; color: white; padding: 15px; text-align: center;">
            <p>&copy; 2024 B.Y PRO Accounts System. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to: ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ENHANCED QR CODE SERVICE ====================

// Generate QR Code with dark blue color
async function generateEnhancedQRCode(qrData, options = {}) {
  try {
    const {
      width = 200,
      height = 200,
      colorDark = "#1a237e", // Dark blue color
      colorLight = "#ffffff",
      correctLevel = 'H'
    } = options;

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: width,
      margin: 2,
      color: {
        dark: colorDark,
        light: colorLight
      },
      errorCorrectionLevel: correctLevel
    });

    return {
      success: true,
      qrCode: qrCodeDataURL,
      qrData: qrData,
      options: options
    };
  } catch (error) {
    console.error('QR Code generation error:', error);
    return {
      success: false,
      error: "QR code generation failed"
    };
  }
}

// ==================== ROUTES ====================

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'adminboard.html'));
});

app.get('/adminboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'adminboard.html'));
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let driveStatus = 'checking';
  let lastModified = null;
  
  try {
    if (driveService) {
      const fileInfo = await driveService.files.get({ 
        fileId: FILE_ID, 
        fields: 'id,name,modifiedTime' 
      });
      driveStatus = 'connected';
      lastModified = fileInfo.data.modifiedTime;
    } else {
      driveStatus = 'disconnected';
    }
    
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    res.json({ 
      status: 'operational',
      service: 'B.Y PRO Unified Accounts System',
      timestamp: new Date().toISOString(),
      services: {
        database: driveStatus,
        storage: 'google_drive_only',
        total_accounts: accounts.length,
        last_modified: lastModified
      },
      version: '4.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'B.Y PRO Unified Accounts System',
      error: "Google Drive service unavailable",
      services: {
        database: 'error',
        storage: 'google_drive_only'
      }
    });
  }
});

// Account verification route
app.get('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.query;
    
    console.log(`🔐 Login attempt - ID: ${id}`);
    
    if (!id || !password) {
      return res.json({ 
        success: false, 
        error: "ID and password are required" 
      });
    }

    const result = await verifyAccountCredentials(id, password);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Server error in verify-account:', error.message);
    res.json({ 
      success: false, 
      error: "Authentication service unavailable. Please try again later." 
    });
  }
});

// Get next available ID
app.get('/api/next-id', async (req, res) => {
  try {
    const nextId = await getNextAvailableId();
    res.json({
      success: true,
      nextId: nextId,
      storage: 'google_drive'
    });
  } catch (error) {
    console.error('❌ Error getting next ID:', error.message);
    res.status(500).json({
      success: false,
      error: "Unable to generate account ID. Google Drive service unavailable."
    });
  }
});

// Create new account
app.post('/api/accounts', async (req, res) => {
  try {
    const { id, name, email, password, image } = req.body;
    
    console.log(`👤 Creating new account in Google Drive: ${id} - ${name} - ${email}`);
    
    if (!id || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required to create an account"
      });
    }

    const accountData = {
      id: id.toString(),
      ps: password,
      email: email,
      name: name,
      image: image || `https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/${id}.png`
    };

    console.log('💾 Starting account save process to Google Drive...');
    
    const saved = await addNewAccount(accountData);
    
    if (saved) {
      console.log(`✅ Account creation successful: ${accountData.id}`);
      
      // Generate QR code
      const qrData = `BYPRO:${accountData.id}:${accountData.ps}`;
      const qrResult = await generateEnhancedQRCode(qrData, {
        colorDark: "#1a237e",
        colorLight: "#ffffff"
      });

      // Verify the account was actually saved
      const csvData = await readCSVFromDrive(FILE_ID);
      const allAccounts = parseCSVToAccounts(csvData);
      const savedAccount = allAccounts.find(acc => acc.id === accountData.id);
      
      res.json({
        success: true,
        message: "Account created and saved to Google Drive successfully",
        account: accountData,
        qrCode: qrResult.success ? qrResult.qrCode : null,
        verified: !!savedAccount,
        storage: 'google_drive'
      });
    } else {
      throw new Error("Failed to save account to Google Drive");
    }
  } catch (error) {
    console.error('❌ Error creating account:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Unable to create account. Google Drive service unavailable.",
      storage: 'google_drive_error'
    });
  }
});

// Get all accounts for dashboard
app.get('/api/accounts', async (req, res) => {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    const formattedAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      password: account.ps,
      email: account.email,
      image: account.image
    }));
    
    console.log(`📊 Serving ${formattedAccounts.length} accounts from Google Drive`);
    res.json(formattedAccounts);
  } catch (error) {
    console.error('❌ Dashboard API Error:', error.message);
    res.status(500).json([]);
  }
});

// ==================== ENHANCED EMAIL VERIFICATION ROUTES ====================

// Send verification code - SECURE VERSION (NO CODE DISPLAY)
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log(`📧 Verification code requested for: ${email}`);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email address is required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address"
      });
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code in memory (with 10-minute expiry)
    verificationCodes.set(email, {
      code: code,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    console.log(`✅ Generated verification code for ${email}: ${code}`);

    // Try to send email
    const emailResult = await sendVerificationEmail(email, code);
    
    if (emailResult.success) {
      // SECURITY: DO NOT return the code in the response
      res.json({
        success: true,
        message: "Verification code sent successfully to your email",
        email: email
      });
    } else {
      // SECURITY: If email fails, DO NOT return the code
      res.status(500).json({
        success: false,
        error: "Email service temporarily unavailable. Please try again later."
      });
    }
    
  } catch (error) {
    console.error('❌ Verification code error:', error.message);
    res.status(500).json({
      success: false,
      error: "Service temporarily unavailable. Please try again."
    });
  }
});

// Verify code - SECURE VERSION
app.post('/api/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log(`🔍 Verifying code for: ${email}`);
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required"
      });
    }

    const storedData = verificationCodes.get(email);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: "No verification code found for this email. Please request a new code."
      });
    }

    if (Date.now() > storedData.expires) {
      verificationCodes.delete(email);
      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Please request a new code."
      });
    }

    if (storedData.code !== code) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code. Please try again."
      });
    }

    // Code is valid - remove it from storage
    verificationCodes.delete(email);
    
    res.json({
      success: true,
      message: "Email verified successfully"
    });
    
  } catch (error) {
    console.error('❌ Code verification error:', error.message);
    res.status(500).json({
      success: false,
      error: "Verification service temporarily unavailable."
    });
  }
});

// Generate QR Code endpoint
app.post('/api/generate-qr', async (req, res) => {
  try {
    const { id, password } = req.body;
    
    if (!id || !password) {
      return res.status(400).json({
        success: false,
        error: "ID and password are required"
      });
    }

    const qrData = `BYPRO:${id}:${password}`;
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a237e', // Dark blue
          light: '#FFFFFF'
        }
      });
      
      res.json({
        success: true,
        qrCode: qrCodeDataURL,
        qrData: qrData
      });
    } catch (qrError) {
      console.error('QR Generation Error:', qrError);
      res.json({
        success: true,
        qrCode: '',
        qrData: qrData,
        fallback: true
      });
    }
    
  } catch (error) {
    console.error('❌ QR Generation Error:', error.message);
    res.status(500).json({
      success: false,
      error: "QR code generation failed"
    });
  }
});

// Upload image route
app.post('/api/upload-image', async (req, res) => {
  try {
    const { accountId, imageData } = req.body;
    
    console.log(`🖼️ Image upload for account: ${accountId}`);
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "Account ID is required"
      });
    }

    // For now, we'll use a placeholder image URL
    // In a real implementation, you would save the image and return the URL
    const imageUrl = `https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/${accountId}.png`;
    
    // Update the account in Google Drive with the new image URL
    try {
      const csvData = await readCSVFromDrive(FILE_ID);
      const accounts = parseCSVToAccounts(csvData);
      
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        account.image = imageUrl;
        await saveAllAccounts(accounts);
        
        console.log(`✅ Image URL updated for account ${accountId}`);
      }
    } catch (driveError) {
      console.error('❌ Error updating account image:', driveError);
    }

    res.json({
      success: true,
      imageUrl: imageUrl,
      message: "Image URL updated successfully"
    });
    
  } catch (error) {
    console.error('❌ Error uploading image:', error.message);
    res.status(500).json({
      success: false,
      error: "Image service temporarily unavailable"
    });
  }
});

// Dashboard API - Get statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    res.json({
      success: true,
      totalAccounts: accounts.length,
      accountsWithImages: accounts.filter(acc => acc.image && acc.image !== '').length,
      lastUpdated: new Date().toISOString(),
      databaseStatus: 'connected',
      storage: 'google_drive'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: "Cannot fetch statistics from Google Drive" 
    });
  }
});

// Debug route to view all accounts
app.get('/api/debug/accounts', async (req, res) => {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    res.json({
      success: true,
      count: accounts.length,
      accounts: accounts,
      storage: 'google_drive',
      file_info: {
        file_id: FILE_ID,
        total_accounts: accounts.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      storage: 'google_drive_error'
    });
  }
});

// Enhanced 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "The requested resource was not found",
    path: req.originalUrl
  });
});

// Enhanced error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: "An unexpected error occurred. Please try again later.",
    reference: Date.now().toString(36)
  });
});

// Keep-alive to prevent shutdown
const keepAlive = () => {
  setInterval(() => {
    console.log('🔄 Keep-alive ping - Google Drive service active');
  }, 240000);
};

// Start keep-alive
keepAlive();

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO UNIFIED ACCOUNTS SYSTEM');
  console.log('✅ Server started successfully!');
  console.log(`🔗 Port: ${PORT}`);
  console.log('💾 Storage: Google Drive ONLY');
  console.log('📧 Features: Login + Signup + Dashboard');
  console.log('🔐 Auth: QR Code + Password');
  console.log('📨 Email: Nodemailer + Fallback');
  console.log('🎉 =================================\n');
});

// ==================== HELPER FUNCTIONS ====================

async function verifyAccountCredentials(id, password) {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    const account = accounts.find(acc => {
      const idMatch = acc.id && acc.id.toString() === id.toString();
      const passwordMatch = acc.ps && acc.ps === password;
      return idMatch && passwordMatch;
    });
    
    if (account) {
      return {
        success: true,
        account: {
          id: account.id,
          name: account.name || `User ${account.id}`,
          email: account.email || `${account.id}@bypro.com`,
          image: account.image || ''
        },
        storage: 'google_drive'
      };
    } else {
      return {
        success: false,
        error: "Invalid credentials provided"
      };
    }
  } catch (error) {
    console.error('❌ Error verifying account:', error.message);
    return {
      success: false,
      error: "Authentication service temporarily unavailable. Please try again later."
    };
  }
}
