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

// التحقق من متغيرات البيئة
console.log('🔍 Checking environment variables...');
console.log('PORT:', process.env.PORT);
console.log('GOOGLE_PROJECT_ID:', process.env.GOOGLE_PROJECT_ID ? 'Set' : 'Not Set');
console.log('GOOGLE_PRIVATE_KEY_ID:', process.env.GOOGLE_PRIVATE_KEY_ID ? 'Set' : 'Not Set');
console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Not Set');

// بيانات حساب الخدمة - مع fallback للبيانات الثابتة إذا لم تكن متغيرات البيئة متاحة
const serviceAccount = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID || "database-accounts-469323",
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || "fae1257403e165cb23ebe2b9c1b3ad65f9f2ceb9",
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || `-----BEGIN PRIVATE KEY-----
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
  client_email: process.env.GOOGLE_CLIENT_EMAIL || "admin-319@database-accounts-469323.iam.gserviceaccount.com",
  client_id: process.env.GOOGLE_CLIENT_ID || "112725223865398470283",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/admin-319%40database-accounts-469323.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";

console.log('🔐 Google Drive configuration loaded');

// تهيئة خدمة Google Drive مع معالجة أفضل للأخطاء
function initializeDriveService() {
  try {
    console.log('🔄 Initializing Google Drive service...');
    
    // التحقق من وجود المفتاح الخاص
    if (!serviceAccount.private_key) {
      throw new Error("Private key is missing");
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
    
    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive service initialized successfully');
    return drive;
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive service:', error.message);
    console.error('Error details:', error);
    return null;
  }
}

const driveService = initializeDriveService();

// قراءة CSV من Google Drive وتحويله إلى مصفوفة كائنات
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
          // تحويل CSV إلى مصفوفة كائنات
          const accounts = parseCSVToAccounts(data);
          resolve(accounts);
        })
        .on('error', (error) => {
          console.error('❌ Error reading CSV stream:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Error reading CSV from Drive:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

// تحويل بيانات CSV إلى مصفوفة حسابات
function parseCSVToAccounts(csvData) {
  try {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      console.log('⚠️ CSV file is empty');
      return [];
    }

    // استخراج العناوين من السطر الأول
    const headers = lines[0].split(',').map(header => header.trim());
    console.log('📋 CSV Headers:', headers);
    
    const accounts = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      
      // التأكد من تطابق عدد الأعمدة
      if (values.length !== headers.length) {
        console.warn(`⚠️ Row ${i} has incorrect number of columns: ${values.length} instead of ${headers.length}`);
        continue;
      }
      
      const account = {};
      headers.forEach((header, index) => {
        account[header] = values[index] || '';
      });
      
      accounts.push(account);
    }
    
    console.log(`📊 Parsed ${accounts.length} accounts from CSV`);
    return accounts;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error.message);
    return [];
  }
}

// التحقق من صحة الحساب
async function verifyAccountCredentials(id, password) {
  try {
    console.log(`🔐 Verifying credentials for ID: ${id}`);
    
    const accounts = await readCSVFromDrive(FILE_ID);
    
    if (accounts.length === 0) {
      console.log('⚠️ No accounts found in database');
      return {
        success: false,
        error: "No accounts found in database"
      };
    }
    
    // البحث عن الحساب المطابق
    const account = accounts.find(acc => {
      const idMatch = acc.id === id;
      const passwordMatch = acc.ps === password;
      console.log(`🔍 Checking account: ${acc.id}, ID match: ${idMatch}, Password match: ${passwordMatch}`);
      return idMatch && passwordMatch;
    });
    
    if (account) {
      console.log(`✅ Login successful for ID: ${id}`);
      return {
        success: true,
        account: {
          id: account.id,
          name: account.name || `User ${account.id}`,
          email: account.email || `${account.id}@bypro.com`
        }
      };
    } else {
      console.log(`❌ Login failed for ID: ${id} - Invalid credentials`);
      return {
        success: false,
        error: "Invalid ID or password"
      };
    }
  } catch (error) {
    console.error('❌ Error verifying account:', error.message);
    return {
      success: false,
      error: "Server error: " + error.message
    };
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
    // التحقق الفعلي من بيانات الدخول مقابل قاعدة البيانات
    const result = await verifyAccountCredentials(id, password);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Server error:', error.message);
    res.json({ 
      success: false, 
      error: "Server error: " + error.message 
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    // اختبار اتصال Google Drive
    if (driveService) {
      await driveService.files.get({ fileId: FILE_ID, fields: 'id' });
    }
    
    res.json({ 
      status: 'ok',
      service: 'B.Y PRO Accounts Login',
      drive_status: driveService ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      message: 'Server is running successfully!'
    });
  } catch (error) {
    res.json({ 
      status: 'error',
      service: 'B.Y PRO Accounts Login',
      drive_status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Drive service error: ' + error.message
    });
  }
});

// Route للتحقق من البيانات (للتطوير)
app.get('/api/debug/accounts', async (req, res) => {
  try {
    const accounts = await readCSVFromDrive(FILE_ID);
    res.json({
      success: true,
      count: accounts.length,
      accounts: accounts.slice(0, 5) // إرجاع أول 5 حسابات فقط
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
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
