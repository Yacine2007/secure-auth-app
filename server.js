const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Unified Accounts System with Image Upload to GitHub...');

// ==================== ENHANCED CORS CONFIGURATION ====================
app.use(cors({
  origin: ['https://yacine2007.github.io', 'http://localhost:5500', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'API-Key', 'X-Requested-With']
}));

app.options('*', cors());

// ==================== ENHANCED MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

console.log('✅ Middleware initialized');

// ==================== API KEY CONFIGURATION ====================
const API_KEY = 'BYPRO_SECURE_KEY_2007';
const ADMIN_PASSWORD = '20070909';

// Middleware للتحقق من API Key
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['api-key'] || req.query.apiKey || req.body.apiKey;
  
  console.log('🔐 API Key Check:', { 
    received: apiKey ? 'Present' : 'Missing',
    path: req.path,
    method: req.method 
  });
  
  // السماح لبعض المسارات العامة بدون API Key
  const publicPaths = ['/api/health', '/api/verify-account', '/api/send-otp', '/api/verify-otp'];
  
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  if (apiKey === API_KEY) {
    next();
  } else {
    console.error('❌ Invalid API Key');
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing API Key'
    });
  }
};

// ==================== EMAIL CONFIGURATION ====================
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'byprosprt2007@gmail.com',
      pass: 'nspr xhfv yhxu vtwa'
    }
  });
};

// ==================== STORAGE CONFIGURATION ====================
const verificationCodes = new Map();
const otpStorage = new Map();
const acceptedRules = new Set();

// ==================== GITHUB CONFIGURATION ====================
const GITHUB_CONFIG = {
  REPO: 'Yacine2007/B.Y-PRO-Accounts-pic',
  BRANCH: 'main',
  API_BASE: 'https://api.github.com',
  IMAGE_BASE_URL: 'https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/'
};

// GitHub Token - يمكن تخزينه في متغيرات البيئة في Render
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// ==================== IMAGE UPLOAD CONFIGURATION ====================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
    }
  }
});

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
console.log('🖼️ GitHub Repository:', GITHUB_CONFIG.REPO);

// Google Drive service
let driveService = null;

async function initializeDriveService() {
  try {
    console.log('🔄 Initializing Google Drive service...');
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
    
    driveService = google.drive({ version: 'v3', auth });
    
    // Verify file exists
    await driveService.files.get({
      fileId: FILE_ID,
      fields: 'id,name,mimeType,modifiedTime'
    });
    
    console.log('✅ Google Drive service initialized successfully');
    return driveService;
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive service:', error.message);
    throw new Error('Google Drive initialization failed');
  }
}

// Initialize drive service
initializeDriveService().catch(error => {
  console.error('🚨 CRITICAL: Cannot start without Google Drive');
  process.exit(1);
});

// ==================== GITHUB FUNCTIONS ====================
async function uploadImageToGitHub(imageBuffer, accountId, githubToken = null) {
  try {
    const tokenToUse = githubToken || GITHUB_TOKEN;
    
    if (!tokenToUse) {
      throw new Error('GitHub token is required for image upload');
    }

    const imageName = `${accountId}.png`;
    const imagePath = imageName;
    
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Check if file exists
    let sha = null;
    try {
      const existingFile = await getGitHubFile(imagePath, tokenToUse);
      sha = existingFile.sha;
      console.log(`📄 Updating existing image for account ${accountId}`);
    } catch (error) {
      console.log(`📄 Creating new image for account ${accountId}`);
    }
    
    // Prepare request
    const url = `${GITHUB_CONFIG.API_BASE}/repos/${GITHUB_CONFIG.REPO}/contents/${imagePath}`;
    const message = sha ? `Update image for account ${accountId}` : `Add image for account ${accountId}`;
    
    const response = await axios.put(url, {
      message: message,
      content: base64Image,
      sha: sha,
      branch: GITHUB_CONFIG.BRANCH
    }, {
      headers: {
        'Authorization': `token ${tokenToUse}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    console.log(`✅ Image uploaded to GitHub: ${accountId}.png`);
    return {
      success: true,
      url: `${GITHUB_CONFIG.IMAGE_BASE_URL}${imageName}`,
      githubUrl: response.data.content.html_url
    };
  } catch (error) {
    console.error('❌ GitHub upload error:', error.response?.data || error.message);
    throw new Error(`GitHub upload failed: ${error.response?.data?.message || error.message}`);
  }
}

async function getGitHubFile(filePath, githubToken = null) {
  try {
    const tokenToUse = githubToken || GITHUB_TOKEN;
    const url = `${GITHUB_CONFIG.API_BASE}/repos/${GITHUB_CONFIG.REPO}/contents/${filePath}?ref=${GITHUB_CONFIG.BRANCH}`;
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (tokenToUse) {
      headers['Authorization'] = `token ${tokenToUse}`;
    }
    
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function checkImageExistsOnGitHub(accountId) {
  try {
    const imageUrl = `${GITHUB_CONFIG.IMAGE_BASE_URL}${accountId}.png`;
    const response = await axios.head(imageUrl);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function deleteImageFromGitHub(accountId, githubToken = null) {
  try {
    const tokenToUse = githubToken || GITHUB_TOKEN;
    
    if (!tokenToUse) {
      throw new Error('GitHub token is required for image deletion');
    }

    const imageName = `${accountId}.png`;
    const imagePath = imageName;
    
    // Get file SHA first
    let sha;
    try {
      const fileInfo = await getGitHubFile(imagePath, tokenToUse);
      sha = fileInfo.sha;
    } catch (error) {
      console.log(`Image ${accountId}.png does not exist on GitHub`);
      return { success: true, message: 'Image does not exist' };
    }
    
    // Delete file
    const url = `${GITHUB_CONFIG.API_BASE}/repos/${GITHUB_CONFIG.REPO}/contents/${imagePath}`;
    
    const response = await axios.delete(url, {
      data: {
        message: `Delete image for account ${accountId}`,
        sha: sha,
        branch: GITHUB_CONFIG.BRANCH
      },
      headers: {
        'Authorization': `token ${tokenToUse}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    console.log(`✅ Image deleted from GitHub: ${accountId}.png`);
    return { success: true };
  } catch (error) {
    console.error('❌ GitHub delete error:', error.response?.data || error.message);
    throw new Error(`GitHub delete failed: ${error.response?.data?.message || error.message}`);
  }
}

// ==================== CSV OPERATIONS ====================
async function readCSVFromDrive() {
  if (!driveService) {
    throw new Error("Google Drive service is not initialized");
  }

  try {
    const response = await driveService.files.get({
      fileId: FILE_ID,
      alt: 'media'
    });

    return response.data;
  } catch (error) {
    if (error.message.includes('404')) {
      return '';
    }
    throw new Error(`Unable to read from Google Drive: ${error.message}`);
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
      
      // Skip header
      if (i === 0 && line.includes('id,ps,email,name,image')) {
        continue;
      }
      
      // Parse CSV line
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
        const account = {
          id: values[0] || '',
          ps: values[1] || '',
          email: values[2] || '',
          name: values[3] || '',
          image: values[4] || ''
        };
        
        if (account.id && account.ps) {
          accounts.push(account);
        }
      }
    }
    
    return accounts;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error.message);
    return [];
  }
}

async function saveAllAccounts(accounts) {
  if (!driveService) {
    throw new Error("Google Drive service is not initialized");
  }

  try {
    const headers = ['id', 'ps', 'email', 'name', 'image'];
    const csvLines = [
      headers.join(','),
      ...accounts.map(account => 
        headers.map(header => 
          account[header] ? `"${account[header].toString().replace(/"/g, '""')}"` : '""'
        ).join(',')
      )
    ];
    
    const csvContent = csvLines.join('\n');
    
    const media = {
      mimeType: 'text/csv',
      body: csvContent
    };

    await driveService.files.update({
      fileId: FILE_ID,
      media: media,
      fields: 'id,modifiedTime'
    });

    return true;
  } catch (error) {
    console.error('❌ Error saving accounts to Google Drive:', error.message);
    throw error;
  }
}

async function getNextAvailableId() {
  try {
    const csvData = await readCSVFromDrive();
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
    return (1000 + Math.floor(Math.random() * 9000)).toString();
  }
}

// ==================== ACCOUNT MANAGEMENT ====================
async function addNewAccount(accountData) {
  try {
    const csvData = await readCSVFromDrive();
    let accounts = parseCSVToAccounts(csvData);
    
    // Check for duplicate email
    if (accountData.email) {
      const existingAccount = accounts.find(acc => acc.email === accountData.email);
      if (existingAccount) {
        throw new Error("An account with this email already exists");
      }
    }
    
    // Check for duplicate ID
    const existingId = accounts.find(acc => acc.id === accountData.id);
    if (existingId) {
      const newId = await getNextAvailableId();
      accountData.id = newId;
    }
    
    // Set default image URL if not provided
    if (!accountData.image) {
      accountData.image = `${GITHUB_CONFIG.IMAGE_BASE_URL}${accountData.id}.png`;
    }
    
    accounts.push(accountData);
    
    await saveAllAccounts(accounts);
    
    return true;
  } catch (error) {
    console.error('❌ Error adding new account:', error.message);
    throw error;
  }
}

async function verifyAccountCredentials(id, password) {
  try {
    const csvData = await readCSVFromDrive();
    const accounts = parseCSVToAccounts(csvData);
    
    const account = accounts.find(acc => {
      const idMatch = acc.id && acc.id.toString() === id.toString();
      const passwordMatch = acc.ps && acc.ps === password;
      return idMatch && passwordMatch;
    });
    
    if (account) {
      const hasAcceptedRules = acceptedRules.has(account.id);
      
      return {
        success: true,
        account: {
          id: account.id,
          name: account.name || `User ${account.id}`,
          email: account.email || `${account.id}@bypro.com`,
          image: account.image || `${GITHUB_CONFIG.IMAGE_BASE_URL}${account.id}.png`
        },
        accepted_rules: hasAcceptedRules,
        rules_url: hasAcceptedRules ? null : `/rules-popup?userId=${account.id}`
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

// ==================== OTP FUNCTIONS ====================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otpCode) {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: '"B.Y PRO Accounts" <byprosprt2007@gmail.com>',
      to: email,
      subject: 'B.Y PRO - Verification Code',
      html: `
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
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to: ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ OTP email sending failed:', error);
    return { success: false, error: error.message };
  }
}

// ==================== QR CODE FUNCTIONS ====================
async function generateEnhancedQRCode(qrData, options = {}) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: options.width || 200,
      margin: 2,
      color: {
        dark: options.colorDark || "#1a237e",
        light: options.colorLight || "#ffffff"
      },
      errorCorrectionLevel: 'H'
    });

    return {
      success: true,
      qrCode: qrCodeDataURL,
      qrData: qrData
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

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const csvData = await readCSVFromDrive();
    const accounts = parseCSVToAccounts(csvData);
    
    res.json({ 
      status: 'operational',
      service: 'B.Y PRO Unified Accounts System with GitHub Images',
      timestamp: new Date().toISOString(),
      total_accounts: accounts.length,
      github_repo: GITHUB_CONFIG.REPO,
      version: '7.0.0',
      features: ['admin_dashboard', 'image_upload', 'otp_verification', 'qr_codes', 'rules_system']
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: "Google Drive service unavailable"
    });
  }
});

// ==================== ADMIN DASHBOARD ROUTES ====================

// JSONP Support for legacy adminboard
app.get('/api/jsonp', async (req, res) => {
  try {
    const { action, apiKey, callback } = req.query;
    
    if (apiKey !== API_KEY) {
      return res.send(`${callback}(${JSON.stringify({ error: 'Invalid API Key' })})`);
    }
    
    let result;
    
    switch (action) {
      case 'getAccounts':
        const csvData = await readCSVFromDrive();
        const accounts = parseCSVToAccounts(csvData);
        const formattedAccounts = accounts.map(account => ({
          id: account.id,
          name: account.name || '',
          email: account.email || '',
          hasImage: !!account.image
        }));
        result = { success: true, accounts: formattedAccounts };
        break;
        
      case 'nextId':
        const nextId = await getNextAvailableId();
        result = { success: true, nextId: nextId };
        break;
        
      default:
        result = { error: 'Invalid action' };
    }
    
    res.send(`${callback}(${JSON.stringify(result)})`);
  } catch (error) {
    res.send(`${callback}(${JSON.stringify({ error: error.message })})`);
  }
});

// REST API Routes
app.get('/api/accounts', verifyApiKey, async (req, res) => {
  try {
    const csvData = await readCSVFromDrive();
    const accounts = parseCSVToAccounts(csvData);
    
    const formattedAccounts = await Promise.all(accounts.map(async (account) => {
      const hasImage = await checkImageExistsOnGitHub(account.id);
      return {
        id: account.id,
        name: account.name || '',
        email: account.email || '',
        password: account.ps || '',
        hasImage: hasImage,
        imageUrl: account.image || `${GITHUB_CONFIG.IMAGE_BASE_URL}${account.id}.png`
      };
    }));
    
    res.json({
      success: true,
      accounts: formattedAccounts,
      count: formattedAccounts.length,
      githubRepo: GITHUB_CONFIG.REPO
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/next-id', verifyApiKey, async (req, res) => {
  try {
    const nextId = await getNextAvailableId();
    res.json({
      success: true,
      nextId: nextId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create account with image upload
app.post('/api/accounts', verifyApiKey, upload.single('image'), async (req, res) => {
  try {
    const { id, name, email, password, githubToken } = req.body;
    const imageFile = req.file;
    
    if (!id || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required"
      });
    }

    let imageUrl = `${GITHUB_CONFIG.IMAGE_BASE_URL}${id}.png`;
    
    // Upload image to GitHub if provided
    if (imageFile) {
      try {
        const uploadResult = await uploadImageToGitHub(imageFile.buffer, id, githubToken);
        imageUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('⚠️ Image upload failed, but account will be created:', uploadError.message);
        // Continue without image upload
      }
    }

    const accountData = {
      id: id.toString(),
      ps: password,
      email: email,
      name: name,
      image: imageUrl
    };

    await addNewAccount(accountData);
    
    res.json({
      success: true,
      message: "Account created successfully",
      account: accountData,
      imageUploaded: !!imageFile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update account
app.put('/api/accounts/:id', verifyApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Account ID is required"
      });
    }

    const csvData = await readCSVFromDrive();
    let accounts = parseCSVToAccounts(csvData);
    
    const accountIndex = accounts.findIndex(acc => acc.id === id.toString());
    
    if (accountIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Account not found"
      });
    }
    
    // Update data
    if (name) accounts[accountIndex].name = name;
    if (email) accounts[accountIndex].email = email;
    if (password) accounts[accountIndex].ps = password;
    
    await saveAllAccounts(accounts);
    
    res.json({
      success: true,
      message: "Account updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upload image for existing account
app.post('/api/accounts/:id/upload-image', verifyApiKey, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { githubToken } = req.body;
    const imageFile = req.file;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Account ID is required"
      });
    }
    
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: "Image file is required"
      });
    }
    
    // Upload image to GitHub
    const uploadResult = await uploadImageToGitHub(imageFile.buffer, id, githubToken);
    
    // Update account in CSV with new image URL
    const csvData = await readCSVFromDrive();
    let accounts = parseCSVToAccounts(csvData);
    
    const accountIndex = accounts.findIndex(acc => acc.id === id.toString());
    
    if (accountIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Account not found"
      });
    }
    
    accounts[accountIndex].image = uploadResult.url;
    await saveAllAccounts(accounts);
    
    res.json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: uploadResult.url,
      githubUrl: uploadResult.githubUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete account and image
app.delete('/api/accounts/:id', verifyApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { githubToken } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Account ID is required"
      });
    }

    const csvData = await readCSVFromDrive();
    let accounts = parseCSVToAccounts(csvData);
    
    const initialLength = accounts.length;
    accounts = accounts.filter(acc => acc.id !== id.toString());
    
    if (accounts.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: "Account not found"
      });
    }
    
    // Try to delete image from GitHub
    try {
      await deleteImageFromGitHub(id, githubToken);
    } catch (imageError) {
      console.log('⚠️ Image deletion failed, but account will be deleted:', imageError.message);
    }
    
    await saveAllAccounts(accounts);
    
    res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check if image exists on GitHub
app.get('/api/accounts/:id/check-image', verifyApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Account ID is required"
      });
    }
    
    const exists = await checkImageExistsOnGitHub(id);
    
    res.json({
      success: true,
      exists: exists,
      imageUrl: `${GITHUB_CONFIG.IMAGE_BASE_URL}${id}.png`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sync all images with GitHub
app.post('/api/images/sync', verifyApiKey, async (req, res) => {
  try {
    const csvData = await readCSVFromDrive();
    const accounts = parseCSVToAccounts(csvData);
    
    const results = await Promise.all(accounts.map(async (account) => {
      const exists = await checkImageExistsOnGitHub(account.id);
      return {
        id: account.id,
        name: account.name,
        hasImage: exists,
        imageUrl: account.image || `${GITHUB_CONFIG.IMAGE_BASE_URL}${account.id}.png`
      };
    }));
    
    const withImages = results.filter(r => r.hasImage).length;
    
    res.json({
      success: true,
      total: results.length,
      withImages: withImages,
      withoutImages: results.length - withImages,
      accounts: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== EXISTING ROUTES (KEEP AS IS) ====================

// OTP Routes
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }

    const otp = generateOTP();
    
    otpStorage.set(email, {
      otp: otp,
      expires: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });

    const emailResult = await sendOTPEmail(email, otp);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: "Verification code sent to your email"
      });
    } else {
      otpStorage.delete(email);
      res.status(500).json({
        success: false,
        error: "Email service is currently unavailable"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "Email and code are required"
      });
    }

    const storedData = otpStorage.get(email);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: "No verification code found for this email"
      });
    }

    if (Date.now() > storedData.expires) {
      otpStorage.delete(email);
      return res.status(400).json({
        success: false,
        error: "Verification code has expired"
      });
    }

    storedData.attempts += 1;
    
    if (storedData.attempts > 5) {
      otpStorage.delete(email);
      return res.status(400).json({
        success: false,
        error: "Too many attempts. Please request a new code."
      });
    }

    if (storedData.otp === otp) {
      otpStorage.delete(email);
      res.json({
        success: true,
        message: "Verification successful"
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Invalid verification code",
        remainingAttempts: 5 - storedData.attempts
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Account verification
app.get('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.query;
    
    if (!id || !password) {
      return res.json({ 
        success: false, 
        error: "ID and password are required" 
      });
    }

    const result = await verifyAccountCredentials(id, password);
    res.json(result);
  } catch (error) {
    res.json({ 
      success: false, 
      error: "Authentication service unavailable" 
    });
  }
});

// Create account
app.post('/api/create-account', async (req, res) => {
  try {
    const { id, name, email, password, image } = req.body;
    
    if (!id || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required"
      });
    }

    const accountData = {
      id: id.toString(),
      ps: password,
      email: email,
      name: name,
      image: image || `${GITHUB_CONFIG.IMAGE_BASE_URL}${id}.png`
    };

    await addNewAccount(accountData);
    
    const qrData = `BYPRO:${accountData.id}:${accountData.ps}`;
    const qrResult = await generateEnhancedQRCode(qrData);

    res.json({
      success: true,
      message: "Account created successfully",
      account: accountData,
      qrCode: qrResult.qrCode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rules system
app.get('/api/check-rules', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.json({
        success: false,
        error: "User ID is required"
      });
    }

    const hasAccepted = acceptedRules.has(userId);
    
    res.json({
      success: true,
      accepted: hasAccepted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/accept-rules', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required"
      });
    }

    acceptedRules.add(userId);
    
    res.json({
      success: true,
      message: "Rules accepted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'adminboard.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Error:', err);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO UNIFIED ACCOUNTS SYSTEM');
  console.log(`✅ Server running on port: ${PORT}`);
  console.log(`🔗 Admin Dashboard API: http://localhost:${PORT}/api`);
  console.log('💾 Storage: Google Drive');
  console.log('🖼️ Images: GitHub Repository');
  console.log(`📁 GitHub Repo: ${GITHUB_CONFIG.REPO}`);
  console.log('🔐 API Key Authentication: Active');
  console.log('🔐 Image Upload: Enabled');
  console.log('🎉 =================================\n');
});
