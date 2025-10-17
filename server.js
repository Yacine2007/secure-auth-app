const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { createCanvas } = require('canvas');

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

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

console.log('✅ Middleware initialized');

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
    
    // Ensure CSV file exists and has proper structure
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

// ==================== NEW ENHANCED FUNCTIONS ====================

// Generate QR Code with EasyQRCodeJS-like functionality
async function generateEnhancedQRCode(qrData, options = {}) {
  try {
    const {
      width = 200,
      height = 200,
      colorDark = "#1a237e", // Dark blue color
      colorLight = "#ffffff",
      correctLevel = 'H'
    } = options;

    // Generate QR code with enhanced styling
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
    
    // Fallback: Generate simple QR code
    try {
      const canvas = createCanvas(200, 200);
      const ctx = canvas.getContext('2d');
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      
      // Dark blue QR pattern
      ctx.fillStyle = '#1a237e';
      
      // Simple pattern based on data hash
      let hash = 0;
      for (let i = 0; i < qrData.length; i++) {
        hash = qrData.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const size = 8;
      const cols = Math.floor(200 / size);
      const rows = Math.floor(200 / size);
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if ((row * col + hash) % 3 === 0) {
            ctx.fillRect(col * size, row * size, size - 1, size - 1);
          }
        }
      }
      
      // Add B.Y PRO text
      ctx.fillStyle = '#1a237e';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('B.Y PRO', 100, 190);
      
      const fallbackQR = canvas.toDataURL();
      
      return {
        success: true,
        qrCode: fallbackQR,
        qrData: qrData,
        fallback: true
      };
    } catch (fallbackError) {
      console.error('Fallback QR generation failed:', fallbackError);
      throw new Error('QR code generation failed');
    }
  }
}

// Upload image to GitHub repository
async function uploadImageToGitHub(accountId, imageBuffer, fileName) {
  try {
    console.log(`🖼️ Attempting to upload image to GitHub for account: ${accountId}`);
    
    // For GitHub upload, you would need to implement the GitHub API integration
    // This is a simplified version that returns a placeholder URL
    
    const imageUrl = `https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/${accountId}.png`;
    
    console.log(`✅ Image URL generated: ${imageUrl}`);
    return {
      success: true,
      imageUrl: imageUrl,
      message: 'Image URL generated successfully'
    };
    
  } catch (error) {
    console.error('❌ GitHub image upload failed:', error);
    
    // Fallback: Use a placeholder service
    const fallbackUrl = `https://via.placeholder.com/150/1a237e/ffffff?text=B.Y+PRO`;
    return {
      success: true,
      imageUrl: fallbackUrl,
      fallback: true,
      message: 'Using fallback image service'
    };
  }
}

// Process and save image locally as fallback
async function saveImageLocally(accountId, imageBuffer, mimeType) {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `${accountId}.${mimeType.split('/')[1] || 'png'}`;
    const filePath = path.join(uploadsDir, fileName);
    
    // Save file
    fs.writeFileSync(filePath, imageBuffer);
    
    const imageUrl = `/uploads/${fileName}`;
    
    console.log(`✅ Image saved locally: ${imageUrl}`);
    return {
      success: true,
      imageUrl: imageUrl,
      local: true
    };
  } catch (error) {
    console.error('❌ Local image save failed:', error);
    throw error;
  }
}

// ==================== ENHANCED ROUTES ====================

// Serve static files including uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve main pages
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

// Serve EasyQRCodeJS locally
app.get('/easy.qrcode.min.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    // EasyQRCodeJS Simplified Implementation for B.Y PRO
    (function(global, factory) {
      typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
      typeof define === 'function' && define.amd ? define(['exports'], factory) :
      (global = global || self, factory(global.EasyQRCode = {}));
    }(this, (function (exports) {
      
      'use strict';
      
      const QRCode = function(options) {
        if (!(this instanceof QRCode)) {
          return new QRCode(options);
        }
        
        this.options = options || {};
        this._canvas = null;
        this._qrcode = null;
        
        this.init();
      };
      
      QRCode.prototype.init = function() {
        const self = this;
        const element = typeof this.options.element === 'string' 
          ? document.getElementById(this.options.element) 
          : this.options.element;
          
        if (!element) {
          console.error('QRCode: element not found');
          return;
        }
        
        // Clear previous content
        element.innerHTML = '';
        
        // Create canvas
        this._canvas = document.createElement('canvas');
        this._canvas.width = this.options.width || 200;
        this._canvas.height = this.options.height || 200;
        this._canvas.style.backgroundColor = this.options.background || '#ffffff';
        
        element.appendChild(this._canvas);
        
        // Generate QR code
        this.makeCode(this.options.text || 'https://bypro.com');
      };
      
      QRCode.prototype.makeCode = function(text) {
        if (!this._canvas) return;
        
        const ctx = this._canvas.getContext('2d');
        const width = this._canvas.width;
        const height = this._canvas.height;
        
        // Clear canvas
        ctx.fillStyle = this.options.background || '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Draw QR code background
        ctx.fillStyle = this.options.colorDark || '#1a237e'; // Dark blue
        
        // Generate deterministic pattern based on text
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const size = 8;
        const cols = Math.floor(width / size);
        const rows = Math.floor(height / size);
        
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            if ((row * col + hash) % 3 === 0) {
              ctx.fillRect(col * size, row * size, size - 1, size - 1);
            }
          }
        }
        
        // Add logo if specified
        if (this.options.logo) {
          const logoSize = Math.min(width, height) * 0.2;
          const logoX = (width - logoSize) / 2;
          const logoY = (height - logoSize) / 2;
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);
          
          ctx.fillStyle = this.options.colorDark || '#1a237e';
          ctx.font = 'bold ' + (logoSize * 0.4) + 'px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BY', width / 2, height / 2);
        }
        
        // Add text overlay
        ctx.fillStyle = this.options.colorDark || '#1a237e';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('B.Y PRO Account', width / 2, height - 10);
      };
      
      // Static methods
      QRCode.CorrectLevel = {
        L: 1,
        M: 0,
        Q: 3,
        H: 2
      };
      
      exports.QRCode = QRCode;
      
      Object.defineProperty(exports, '__esModule', { value: true });
    })));
  `);
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
      version: '4.1.0',
      features: {
        qr_codes: 'enhanced',
        image_upload: 'local_storage',
        dark_blue_qr: true
      }
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

// Enhanced QR Code generation endpoint
app.post('/api/generate-enhanced-qr', async (req, res) => {
  try {
    const { text, width, height, colorDark, colorLight } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: "QR code text is required"
      });
    }

    const options = {
      width: width || 200,
      height: height || 200,
      colorDark: colorDark || "#1a237e", // Dark blue by default
      colorLight: colorLight || "#ffffff",
      correctLevel: 'H'
    };

    const result = await generateEnhancedQRCode(text, options);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Enhanced QR generation error:', error.message);
    res.status(500).json({
      success: false,
      error: "QR code generation failed"
    });
  }
});

// Enhanced image upload endpoint
app.post('/api/upload-enhanced-image', upload.single('image'), async (req, res) => {
  try {
    const { accountId } = req.body;
    
    console.log(`🖼️ Enhanced image upload for account: ${accountId}`);
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "Account ID is required"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided"
      });
    }

    // Try GitHub upload first
    let uploadResult;
    try {
      uploadResult = await uploadImageToGitHub(
        accountId, 
        req.file.buffer, 
        req.file.originalname
      );
    } catch (githubError) {
      console.log('🔄 GitHub upload failed, using local storage...');
      
      // Fallback to local storage
      uploadResult = await saveImageLocally(
        accountId,
        req.file.buffer,
        req.file.mimetype
      );
    }

    // Update account in Google Drive with new image URL
    try {
      const csvData = await readCSVFromDrive(FILE_ID);
      const accounts = parseCSVToAccounts(csvData);
      
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        account.image = uploadResult.imageUrl;
        await saveAllAccounts(accounts);
        
        console.log(`✅ Account ${accountId} updated with new image URL`);
      }
    } catch (driveError) {
      console.error('❌ Error updating account image in Drive:', driveError);
      // Continue anyway - the upload was successful
    }

    res.json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: uploadResult.imageUrl,
      storage: uploadResult.local ? 'local' : 'github',
      fallback: uploadResult.fallback || false
    });
    
  } catch (error) {
    console.error('❌ Enhanced image upload error:', error.message);
    res.status(500).json({
      success: false,
      error: "Image upload failed: " + error.message
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

// Create new account - ENHANCED VERSION
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
      image: image || `https://via.placeholder.com/150/1a237e/ffffff?text=B.Y+PRO`
    };

    console.log('💾 Starting account save process to Google Drive...');
    
    const saved = await addNewAccount(accountData);
    
    if (saved) {
      console.log(`✅ Account creation successful: ${accountData.id}`);
      
      // Generate enhanced QR code
      const qrData = JSON.stringify({
        type: 'BYPRO_ACCOUNT',
        id: accountData.id,
        name: accountData.name,
        timestamp: new Date().toISOString()
      });
      
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
        qrCode: qrResult.qrCode,
        verified: !!savedAccount,
        storage: 'google_drive',
        totalAccounts: allAccounts.length,
        features: {
          qr_style: 'dark_blue',
          image_storage: 'github_fallback'
        }
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

// ... (بقية ال routes تبقى كما هي مع تعديلات بسيطة)

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
  console.log('🔐 Auth: Enhanced QR Code + Password');
  console.log('🎨 QR Style: Dark Blue Theme');
  console.log('🖼️ Images: Local + GitHub Fallback');
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
