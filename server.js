const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// تهيئة خدمة Google Drive
function initializeDriveService() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
    
    const drive = google.drive({ version: 'v3', auth });
    console.log("✅ Google Drive service initialized successfully");
    return drive;
  } catch (error) {
    console.error("❌ Failed to initialize Google Drive service:", error);
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
    const response = await driveService.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'stream' });

    return new Promise((resolve, reject) => {
      let data = '';
      response.data
        .on('data', chunk => data += chunk)
        .on('end', () => resolve(data))
        .on('error', reject);
    });
  } catch (error) {
    console.error('Error reading CSV from Drive:', error);
    throw error;
  }
}

// البحث عن حساب في البيانات
function findAccount(accounts, id, password) {
  return accounts.find(account => 
    account.id === id && account.ps === password
  );
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.query;
    
    if (!id || !password) {
      return res.json({ 
        success: false, 
        error: "ID and password are required" 
      });
    }

    // قراءة البيانات من Google Drive
    const csvData = await readCSVFromDrive(FILE_ID);
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    const accounts = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const account = {};
        headers.forEach((header, index) => {
          account[header.trim()] = values[index] ? values[index].trim() : '';
        });
        accounts.push(account);
      }
    }

    // البحث عن الحساب
    const account = findAccount(accounts, id, password);
    
    if (account) {
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
      res.json({ 
        success: false, 
        error: "Invalid ID or password" 
      });
    }
  } catch (error) {
    console.error('Error verifying account:', error);
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
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Login page: http://localhost:${PORT}`);
});