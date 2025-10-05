const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting B.Y PRO Accounts Login Server...');
console.log('📁 Current directory:', __dirname);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve from current directory

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

// تهيئة خدمة Google Drive
function initializeDriveService() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive service initialized');
    return drive;
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive:', error.message);
    return null;
  }
}

const driveService = initializeDriveService();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/api/verify-account', async (req, res) => {
  const { id, password } = req.query;
  
  if (!id || !password) {
    return res.json({ success: false, error: "ID and password required" });
  }

  try {
    // محاكاة النجاح للاختبار
    // في الإصدار النهائي ستقرأ من Google Drive
    if (id === "test" && password === "test") {
      res.json({ 
        success: true, 
        message: "Login successful",
        account: { id: "test", name: "Test User", email: "test@example.com" }
      });
    } else {
      res.json({ success: false, error: "Invalid credentials" });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
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
  console.log(`🎉 Server running on port ${PORT}`);
});

