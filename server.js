const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting B.Y PRO Accounts Login Server...');
console.log('📁 Current directory:', __dirname);
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve files from root directory

console.log('✅ Middleware initialized');

// بيانات حساب الخدمة من متغيرات البيئة
const serviceAccount = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID || "database-accounts-469323",
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
  universe_domain: "googleapis.com"
};

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";

console.log('🔐 Google Drive configuration loaded');
console.log('📄 Target File ID:', FILE_ID);

// تهيئة خدمة Google Drive
function initializeDriveService() {
  try {
    console.log('🔄 Initializing Google Drive service...');
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
    
    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive service initialized successfully');
    return drive;
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive service:', error.message);
    return null;
  }
}

const driveService = initializeDriveService();

// قراءة CSV من Google Drive
async function readCSVFromDrive(fileId) {
  if (!driveService) {
    console.error('❌ Drive service not available');
    throw new Error("Drive service not available");
  }

  try {
    console.log(`📖 Reading CSV from Drive (File ID: ${fileId})`);
    
    const response = await driveService.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'stream' });

    return new Promise((resolve, reject) => {
      let data = '';
      
      response.data
        .on('data', chunk => {
          data += chunk;
          console.log(`📥 Received ${chunk.length} bytes of data...`);
        })
        .on('end', () => {
          console.log(`✅ Successfully read ${data.length} characters from CSV`);
          resolve(data);
        })
        .on('error', error => {
          console.error('❌ Error reading CSV stream:', error.message);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Error reading CSV from Drive:', error.message);
    throw error;
  }
}

// تحليل بيانات CSV
function parseCSVData(csvData) {
  try {
    console.log('🔄 Parsing CSV data...');
    
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.warn('⚠️ CSV file is empty');
      return [];
    }
    
    const headers = lines[0].split(',').map(header => header.trim());
    console.log(`📊 CSV Headers: ${headers.join(', ')}`);
    
    const accounts = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const account = {};
        
        headers.forEach((header, index) => {
          account[header] = values[index] ? values[index].trim() : '';
        });
        
        accounts.push(account);
      }
    }
    
    console.log(`✅ Successfully parsed ${accounts.length} accounts`);
    return accounts;
  } catch (error) {
    console.error('❌ Error parsing CSV data:', error.message);
    throw error;
  }
}

// البحث عن حساب في البيانات
function findAccount(accounts, id, password) {
  console.log(`🔍 Searching for account - ID: ${id}, Password: ${'*'.repeat(password.length)}`);
  
  const account = accounts.find(acc => 
    acc.id === id && acc.ps === password
  );
  
  if (account) {
    console.log(`✅ Account found: ${account.name || account.id}`);
  } else {
    console.log('❌ Account not found or credentials mismatch');
  }
  
  return account;
}

// Routes
app.get('/', (req, res) => {
  console.log('🌐 Serving login page to:', req.ip);
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login.html', (req, res) => {
  console.log('🌐 Serving login page (direct access)');
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/style.css', (req, res) => {
  console.log('🎨 Serving CSS file');
  res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/api/verify-account', async (req, res) => {
  const { id, password } = req.query;
  const clientIP = req.ip;
  
  console.log(`\n🔐 Login attempt from ${clientIP}`);
  console.log(`📝 Credentials - ID: ${id}, Password: ${'*'.repeat(password.length)}`);
  
  if (!id || !password) {
    console.log('❌ Missing credentials');
    return res.json({ 
      success: false, 
      error: "ID and password are required" 
    });
  }

  try {
    console.log('🔄 Reading accounts data from Google Drive...');
    
    // قراءة البيانات من Google Drive
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVData(csvData);

    // البحث عن الحساب
    const account = findAccount(accounts, id, password);
    
    if (account) {
      console.log(`✅ Login successful for user: ${account.name || account.id}`);
      res.json({ 
        success: true, 
        message: "Login successful",
        account: {
          id: account.id,
          name: account.name,
          email: account.email
        }
      });
    } else {
      console.log('❌ Login failed - invalid credentials');
      res.json({ 
        success: false, 
        error: "Invalid ID or password" 
      });
    }
  } catch (error) {
    console.error('❌ Server error during login verification:', error.message);
    res.json({ 
      success: false, 
      error: "Server error: " + error.message 
    });
  }
});

app.get('/api/health', async (req, res) => {
  console.log('❤️ Health check requested');
  
  try {
    // Test Drive connection
    console.log('🔄 Testing Google Drive connection...');
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVData(csvData);
    
    const driveStatus = accounts.length >= 0 ? "healthy" : "degraded";
    console.log(`✅ Google Drive status: ${driveStatus}`);
    
    res.json({ 
      status: 'ok',
      service: 'B.Y PRO Accounts Login',
      timestamp: new Date().toISOString(),
      services: {
        google_drive: driveStatus,
        server: 'healthy'
      },
      statistics: {
        total_accounts: accounts.length,
        server_uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.json({ 
      status: 'error', 
      error: error.message,
      services: {
        google_drive: 'unhealthy',
        server: 'healthy'
      }
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error.message);
  res.status(500).json({ 
    success: false, 
    error: "Internal server error" 
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❓ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false, 
    error: "Route not found" 
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO Accounts Login Server');
  console.log('📡 Server started successfully!');
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Port: ${PORT}`);
  console.log('🎉 =================================\n');
  
  // Test initial connection to Google Drive
  setTimeout(async () => {
    try {
      console.log('🧪 Testing initial Google Drive connection...');
      const csvData = await readCSVFromDrive(FILE_ID);
      const accounts = parseCSVData(csvData);
      console.log(`✅ Initial test successful - ${accounts.length} accounts loaded`);
    } catch (error) {
      console.error('❌ Initial connection test failed:', error.message);
    }
  }, 2000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔻 Received SIGINT signal');
  console.log('👋 Shutting down server gracefully...');
  
  server.close(() => {
    console.log('✅ Server closed successfully');
    console.log('🎯 Process terminated');
    process.exit(0);
  });

  // Force close after 5 seconds
  setTimeout(() => {
    console.log('⚠️ Forcing server shutdown...');
    process.exit(1);
  }, 5000);
});

process.on('SIGTERM', () => {
  console.log('\n🔻 Received SIGTERM signal');
  console.log('👋 Shutting down server gracefully...');
  
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

module.exports = app;
