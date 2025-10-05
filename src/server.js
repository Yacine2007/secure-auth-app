const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting B.Y PRO Accounts Login Server...');
console.log('📁 Current directory:', __dirname);
console.log('📄 Files in directory:');
require('fs').readdirSync(__dirname).forEach(file => {
  console.log('   -', file);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

console.log('✅ Middleware initialized');

// بيانات حساب الخدمة
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
        .on('data', chunk => data += chunk)
        .on('end', () => {
          console.log(`✅ Successfully read CSV data`);
          resolve(data);
        })
        .on('error', reject);
    });
  } catch (error) {
    console.error('❌ Error reading CSV from Drive:', error.message);
    throw error;
  }
}

// Routes
app.get('/', (req, res) => {
  console.log('🌐 Serving login page');
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/api/verify-account', async (req, res) => {
  const { id, password } = req.query;
  
  console.log(`🔐 Login attempt - ID: ${id}`);
  
  if (!id || !password) {
    return res.json({ 
      success: false, 
      error: "ID and password are required" 
    });
  }

  try {
    // محاكاة النجاح للاختبار الأولي
    // سيتم تفعيل Google Drive لاحقاً
    console.log('🔄 Verifying credentials...');
    
    // مؤقتاً: قبول أي بيانات للاختبار
    res.json({ 
      success: true, 
      message: "Login successful",
      account: {
        id: id,
        name: "User " + id,
        email: id + "@bypro.com"
      }
    });
    
  } catch (error) {
    console.error('❌ Server error:', error.message);
    res.json({ 
      success: false, 
      error: "Server error: " + error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'B.Y PRO Accounts Login',
    timestamp: new Date().toISOString(),
    message: 'Server is running successfully!'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO Accounts Login Server');
  console.log('✅ Server started successfully!');
  console.log(`🔗 Running on port: ${PORT}`);
  console.log('🌐 Access your app:');
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Network: http://0.0.0.0:${PORT}`);
  console.log('🎉 =================================\n');
});
