const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const fs = require('fs');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

console.log('✅ Middleware initialized');

// ==================== ENHANCED GOOGLE DRIVE CONFIGURATION ====================
const serviceAccount = {
  type: "service_account",
  project_id: "database-accounts-469323",
  private_key_id: "fae1257403e165cb23ebe2b9c1b3ad65f9f2ceb9",
  private_key: process.env.GOOGLE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
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
XDDBd0H/36h/k1KN46/bM5K6JctZxZAm/MQiOgLs41fnSuj8NLkplywz3X9maVxe
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

// Development mode fallback system
let isDevelopmentMode = false;
let developmentAccounts = [];
const BACKUP_FILE = 'accounts_backup.json';

// Load backup if exists
try {
  if (fs.existsSync(BACKUP_FILE)) {
    const backupData = fs.readFileSync(BACKUP_FILE, 'utf8');
    developmentAccounts = JSON.parse(backupData);
    console.log(`📂 Loaded ${developmentAccounts.length} accounts from backup file`);
  }
} catch (error) {
  console.log('ℹ️ No backup file found or error reading, starting fresh');
}

// Enhanced Google Drive service with comprehensive error handling
let driveService = null;

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
      fields: 'id,name,mimeType'
    });
    
    console.log('✅ Google Drive service initialized successfully');
    return driveService;
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive service:', error.message);
    console.log('🔄 Switching to development mode with local storage...');
    isDevelopmentMode = true;
    return null;
  }
}

// Initialize drive service on startup
initializeDriveService();

// Enhanced CSV operations with automatic fallback
async function readCSVFromDrive(fileId) {
  if (!driveService || isDevelopmentMode) {
    console.log('📖 Reading from development storage...');
    return developmentAccountsToCSV();
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
    console.log('🔄 Falling back to development storage...');
    isDevelopmentMode = true;
    return developmentAccountsToCSV();
  }
}

async function writeCSVToDrive(fileId, accounts) {
  if (!driveService || isDevelopmentMode) {
    console.log('💾 Saving to development storage...');
    return saveToDevelopmentStorage(accounts);
  }

  try {
    console.log(`💾 Writing ${accounts.length} accounts to Drive...`);
    
    const headers = ['id', 'ps', 'email', 'name', 'image'];
    const csvContent = [
      headers.join(','),
      ...accounts.map(account => headers.map(header => 
        account[header] ? `"${account[header].toString().replace(/"/g, '""')}"` : ''
      ).join(','))
    ].join('\n');

    const media = {
      mimeType: 'text/csv',
      body: csvContent
    };

    await driveService.files.update({
      fileId: fileId,
      media: media,
      fields: 'id'
    });

    console.log(`✅ Successfully wrote ${accounts.length} accounts to Drive`);
    return true;
  } catch (error) {
    console.error('❌ Error writing CSV to Drive:', error.message);
    console.log('🔄 Falling back to development storage...');
    isDevelopmentMode = true;
    return saveToDevelopmentStorage(accounts);
  }
}

// Development storage functions
function developmentAccountsToCSV() {
  const headers = ['id', 'ps', 'email', 'name', 'image'];
  const csvContent = [
    headers.join(','),
    ...developmentAccounts.map(account => headers.map(header => 
      account[header] ? `"${account[header].toString().replace(/"/g, '""')}"` : ''
    ).join(','))
  ].join('\n');
  return csvContent;
}

function saveToDevelopmentStorage(accounts) {
  try {
    developmentAccounts = accounts;
    // Save backup to local file
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(developmentAccounts, null, 2));
    console.log(`✅ Saved ${accounts.length} accounts to development storage and backup file`);
    return true;
  } catch (error) {
    console.error('❌ Error saving to development storage:', error.message);
    return false;
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
    // Generate a fallback ID based on timestamp
    return Date.now().toString().slice(-6);
  }
}

async function addNewAccount(accountData) {
  try {
    console.log(`💾 Attempting to save account: ${accountData.id} - ${accountData.name}`);
    
    const csvData = await readCSVFromDrive(FILE_ID);
    let accounts = parseCSVToAccounts(csvData);
    
    // Check if email already exists
    const existingAccount = accounts.find(acc => acc.email === accountData.email);
    if (existingAccount) {
      throw new Error("An account with this email already exists");
    }
    
    // Check if ID already exists
    const existingId = accounts.find(acc => acc.id === accountData.id);
    if (existingId) {
      // Generate new ID if conflict
      accountData.id = await getNextAvailableId();
      console.log(`🆕 ID conflict, generated new ID: ${accountData.id}`);
    }
    
    accounts.push(accountData);
    
    const saved = await saveAllAccounts(accounts);
    
    if (saved) {
      console.log(`✅ Account ${accountData.id} saved successfully`);
      return true;
    } else {
      throw new Error("Failed to save account");
    }
  } catch (error) {
    console.error('❌ Error adding new account:', error.message);
    throw error;
  }
}

// Enhanced account saving with comprehensive fallback
async function saveAccountWithFallback(accountData) {
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      const saved = await addNewAccount(accountData);
      if (saved) {
        return {
          success: true,
          storage: isDevelopmentMode ? 'local' : 'drive',
          account: accountData
        };
      }
    } catch (error) {
      console.error(`❌ Save attempt ${retryCount + 1} failed:`, error.message);
      
      if (retryCount === maxRetries) {
        // Final fallback: save to development storage directly
        try {
          const csvData = await readCSVFromDrive(FILE_ID);
          let accounts = parseCSVToAccounts(csvData);
          accounts.push(accountData);
          const saved = saveToDevelopmentStorage(accounts);
          
          if (saved) {
            return {
              success: true,
              storage: 'local_fallback',
              account: accountData
            };
          }
        } catch (finalError) {
          console.error('💥 Final fallback failed:', finalError.message);
        }
      }
    }
    
    retryCount++;
    if (retryCount <= maxRetries) {
      console.log(`🔄 Retrying save... (${retryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return {
    success: false,
    error: "All save attempts failed"
  };
}

// ==================== ENHANCED ROUTES ====================

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

app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});

// Serve QR Code library locally
app.get('/qrcode.min.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    // QR Code Generator for B.Y PRO Accounts
    (function(){
      window.QRCode = {
        toCanvas: function(canvas, text, options, callback) {
          try {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear canvas
            ctx.fillStyle = options.color.light || '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            // Draw QR code background
            ctx.fillStyle = options.color.dark || '#000000';
            
            // Simple QR pattern simulation
            const size = 8;
            const cols = Math.floor(width / size);
            const rows = Math.floor(height / size);
            
            // Generate deterministic pattern based on text
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
              hash = text.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                if ((row * col + hash) % 3 === 0) {
                  ctx.fillRect(col * size, row * size, size - 1, size - 1);
                }
              }
            }
            
            // Add text overlay
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('B.Y PRO', width / 2, height - 20);
            
            if (callback) callback(null);
          } catch (error) {
            if (callback) callback(error);
          }
        }
      };
    })();
  `);
});

// ==================== API ROUTES ====================

// Health check endpoint with detailed status
app.get('/api/health', async (req, res) => {
  let driveStatus = 'checking';
  
  try {
    if (driveService && !isDevelopmentMode) {
      await driveService.files.get({ fileId: FILE_ID, fields: 'id' });
      driveStatus = 'connected';
    } else {
      driveStatus = isDevelopmentMode ? 'development_mode' : 'disconnected';
    }
  } catch (error) {
    driveStatus = 'error';
  }
  
  const csvData = await readCSVFromDrive(FILE_ID);
  const accounts = parseCSVToAccounts(csvData);
  
  res.json({ 
    status: 'operational',
    service: 'B.Y PRO Unified Accounts System',
    timestamp: new Date().toISOString(),
    services: {
      database: driveStatus,
      storage_mode: isDevelopmentMode ? 'local_development' : 'google_drive',
      total_accounts: accounts.length
    },
    version: '4.0.0',
    features: ['login', 'signup', 'dashboard', 'qr-codes', 'fallback_storage']
  });
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
      error: "Authentication service unavailable" 
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
      storage_mode: isDevelopmentMode ? 'local' : 'drive'
    });
  } catch (error) {
    console.error('❌ Error getting next ID:', error.message);
    // Always provide a fallback ID
    const fallbackId = Date.now().toString().slice(-6);
    res.json({
      success: true,
      nextId: fallbackId,
      storage_mode: 'fallback',
      message: "Using fallback ID generation"
    });
  }
});

// Create new account - ENHANCED WITH COMPREHENSIVE ERROR HANDLING
app.post('/api/accounts', async (req, res) => {
  try {
    const { id, name, email, password, image } = req.body;
    
    console.log(`👤 Creating new account: ${id} - ${name} - ${email}`);
    
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

    console.log('💾 Starting account save process...');
    const saveResult = await saveAccountWithFallback(accountData);
    
    if (saveResult.success) {
      console.log(`✅ Account creation successful: ${accountData.id}`);
      res.json({
        success: true,
        message: "Account created successfully",
        account: saveResult.account,
        storage: saveResult.storage,
        storage_mode: isDevelopmentMode ? 'local_development' : 'google_drive'
      });
    } else {
      console.error('❌ Account creation failed after all retries');
      res.status(500).json({
        success: false,
        error: "Failed to save account after multiple attempts. Please try again.",
        storage_mode: 'failed'
      });
    }
  } catch (error) {
    console.error('❌ Error creating account:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Unable to create account. Please try again.",
      storage_mode: 'error'
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
    
    console.log(`📊 Serving ${formattedAccounts.length} accounts to dashboard`);
    res.json({
      success: true,
      accounts: formattedAccounts,
      storage_mode: isDevelopmentMode ? 'local_development' : 'google_drive',
      count: formattedAccounts.length
    });
  } catch (error) {
    console.error('❌ Dashboard API Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: "Unable to load accounts from database",
      accounts: [],
      storage_mode: 'error'
    });
  }
});

// Save all accounts from dashboard
app.post('/api/accounts/bulk', async (req, res) => {
  try {
    const accountsData = req.body;
    
    console.log(`💾 Bulk saving ${accountsData.length} accounts from dashboard`);
    
    if (!Array.isArray(accountsData)) {
      return res.status(400).json({
        success: false,
        error: "Invalid data format: expected array"
      });
    }

    // Convert to CSV format
    const formattedAccounts = accountsData.map(account => ({
      id: account.id,
      ps: account.password,
      email: account.email,
      name: account.name,
      image: account.image || ''
    }));

    const saved = await saveAllAccounts(formattedAccounts);
    
    if (saved) {
      console.log('✅ Accounts saved successfully from dashboard');
      res.json({
        success: true,
        message: `${accountsData.length} accounts saved successfully`,
        count: accountsData.length,
        storage_mode: isDevelopmentMode ? 'local_development' : 'google_drive'
      });
    } else {
      throw new Error("Failed to save accounts");
    }
  } catch (error) {
    console.error('❌ Dashboard Save Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Database save failed",
      storage_mode: 'error'
    });
  }
});

// Debug route to view all accounts and system status
app.get('/api/debug/accounts', async (req, res) => {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    res.json({
      success: true,
      count: accounts.length,
      accounts: accounts,
      system_status: {
        drive_initialized: !!driveService,
        development_mode: isDevelopmentMode,
        backup_file_exists: fs.existsSync(BACKUP_FILE),
        backup_accounts_count: developmentAccounts.length,
        storage_mode: isDevelopmentMode ? 'local_development' : 'google_drive'
      },
      sample_accounts: accounts.slice(0, 5) // First 5 accounts as sample
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      system_status: {
        drive_initialized: !!driveService,
        development_mode: isDevelopmentMode,
        error: error.message
      }
    });
  }
});

// Send verification email
app.post('/api/send-verification-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log(`📧 Verification email requested for: ${email}`);
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address"
      });
    }

    console.log(`✅ Verification system ready for: ${email}`);
    
    res.json({
      success: true, 
      message: "Verification system ready",
      method: 'secure',
      code: code,
      email: email
    });
    
  } catch (error) {
    console.error('❌ Email API Error:', error.message);
    res.status(500).json({
      success: false,
      error: "Service temporarily unavailable. Please try again in a few minutes."
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
          dark: '#000000',
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
      return res.json({
        success: false,
        error: "Account ID is required"
      });
    }

    const imageUrl = `https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/${accountId}.png`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      message: "Image upload simulated successfully"
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error.message);
    res.json({
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
      databaseStatus: isDevelopmentMode ? 'development_mode' : 'connected',
      storageMode: isDevelopmentMode ? 'local_development' : 'google_drive',
      system: {
        drive_initialized: !!driveService,
        development_mode: isDevelopmentMode,
        backup_accounts: developmentAccounts.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: "Cannot fetch statistics" 
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
    error: "An unexpected error occurred. Our team has been notified.",
    reference: Date.now().toString(36)
  });
});

// Keep-alive to prevent shutdown
const keepAlive = () => {
  setInterval(() => {
    console.log('🔄 Keep-alive ping - Service is active');
    console.log(`📊 Storage mode: ${isDevelopmentMode ? 'LOCAL DEVELOPMENT' : 'GOOGLE DRIVE'}`);
    console.log(`📈 Accounts in memory: ${developmentAccounts.length}`);
  }, 240000);
};

// Auto health check to prevent shutdown
const autoHealthCheck = () => {
  setInterval(async () => {
    try {
      const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      const response = await fetch(`${baseUrl}/api/health`);
      console.log('❤️ Auto health check:', response.status);
    } catch (error) {
      console.log('⚠️ Health check failed (normal during startup)');
    }
  }, 300000);
};

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start keep-alive and health check
keepAlive();
autoHealthCheck();

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO UNIFIED ACCOUNTS SYSTEM');
  console.log('✅ Server started successfully!');
  console.log(`🔗 Port: ${PORT}`);
  console.log('📧 Features: Login + Signup + Dashboard');
  console.log('💾 Database: Google Drive + Local Fallback');
  console.log('🔐 Auth: QR Code + Password');
  console.log('🛡️  Security: Enhanced with Comprehensive Error Handling');
  console.log('❤️  Keep-alive: Active');
  console.log('🎉 =================================\n');
});

// ==================== HELPER FUNCTIONS ====================

function parseCSVToAccounts(csvData) {
  try {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    const accounts = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Improved CSV parsing with quote handling
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));
      
      if (values.length >= headers.length) {
        const account = {};
        headers.forEach((header, index) => {
          account[header] = values[index] || '';
        });
        
        // Only add if it has required fields
        if (account.id && account.ps) {
          accounts.push(account);
        }
      }
    }
    
    return accounts;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error.message);
    return developmentAccounts.length > 0 ? developmentAccounts : [];
  }
}

async function saveAllAccounts(accounts) {
  try {
    const result = await writeCSVToDrive(FILE_ID, accounts);
    return result;
  } catch (error) {
    console.error('❌ Error saving accounts:', error.message);
    return false;
  }
}

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
        storage_mode: isDevelopmentMode ? 'local' : 'drive'
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
      error: "Authentication service temporarily unavailable"
    };
  }
}
