const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting B.Y PRO Accounts Login Server...');

// Middleware
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
    });

    const data = response.data;
    console.log(`✅ Successfully read CSV data, length: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Error reading CSV from Drive:', error.message);
    throw error;
  }
}

// كتابة CSV إلى Google Drive
async function writeCSVToDrive(fileId, accounts) {
  if (!driveService) {
    throw new Error("Drive service not available");
  }

  try {
    console.log(`📝 Writing ${accounts.length} accounts to Drive...`);
    
    const headers = ['id', 'ps', 'email', 'name', 'image'];
    const csvContent = [
      headers.join(','),
      ...accounts.map(account => headers.map(header => account[header] || '').join(','))
    ].join('\n');

    const media = {
      mimeType: 'text/csv',
      body: csvContent
    };

    const response = await driveService.files.update({
      fileId: fileId,
      media: media,
      fields: 'id'
    });

    console.log(`✅ Successfully wrote ${accounts.length} accounts to Drive`);
    return response.data;
  } catch (error) {
    console.error('❌ Error writing CSV to Drive:', error.message);
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

    const headers = lines[0].split(',').map(header => header.trim());
    console.log('📋 CSV Headers:', headers);
    
    const accounts = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(value => value.trim());
      
      if (values.length >= headers.length) {
        const account = {};
        headers.forEach((header, index) => {
          account[header] = values[index] || '';
        });
        accounts.push(account);
      }
    }
    
    console.log(`📊 Parsed ${accounts.length} accounts from CSV`);
    return accounts;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error.message);
    return [];
  }
}

// الحصول على التالي ID المتاح
async function getNextAvailableId() {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    if (accounts.length === 0) {
      return "1";
    }
    
    const ids = accounts.map(acc => parseInt(acc.id)).filter(id => !isNaN(id));
    if (ids.length === 0) {
      return "1";
    }
    
    const maxId = Math.max(...ids);
    return (maxId + 1).toString();
  } catch (error) {
    console.error('❌ Error getting next ID:', error.message);
    return "1";
  }
}

// حفظ جميع الحسابات
async function saveAllAccounts(accounts) {
  try {
    await writeCSVToDrive(FILE_ID, accounts);
    return true;
  } catch (error) {
    console.error('❌ Error saving accounts:', error.message);
    return false;
  }
}

// إضافة حساب جديد
async function addNewAccount(accountData) {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    let accounts = parseCSVToAccounts(csvData);
    
    accounts.push(accountData);
    
    const saved = await saveAllAccounts(accounts);
    return saved;
  } catch (error) {
    console.error('❌ Error adding new account:', error.message);
    return false;
  }
}

// التحقق من صحة الحساب
async function verifyAccountCredentials(id, password) {
  try {
    console.log(`🔐 Verifying credentials for ID: ${id}`);
    
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    console.log(`🔍 Searching through ${accounts.length} accounts...`);
    
    const account = accounts.find(acc => {
      const idMatch = acc.id && acc.id.toString() === id.toString();
      const passwordMatch = acc.ps && acc.ps === password;
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

// إرسال البريد باستخدام Web3Forms (مجاني وسهل)
async function sendVerificationEmail(email, code) {
  try {
    console.log(`📧 Sending email via Web3Forms to: ${email}`);
    
    const emailData = {
      apikey: "fd1pg7b8xf73pm", // سنحصل عليه مجاناً
      subject: "🔐 B.Y PRO Verification Code",
      from_name: "B.Y PRO Accounts",
      email: email,
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4;">
          <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
            <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
              <h1>🔐 B.Y PRO Accounts</h1>
              <p>Verification Code</p>
            </div>
            <h2 style="color: #2c3e50; margin-top: 20px;">Hello!</h2>
            <p style="color: #546e7a; font-size: 16px;">Your verification code for B.Y PRO Accounts is:</p>
            <div style="font-size: 32px; font-weight: bold; color: #3498db; letter-spacing: 5px; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 2px dashed #3498db;">
              ${code}
            </div>
            <p style="color: #546e7a; font-size: 14px;">This code will expire in 10 minutes.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
              <p>If you didn't request this code, please ignore this email.</p>
              <p><strong>B.Y PRO Accounts Team</strong></p>
            </div>
          </div>
        </div>
      `
    };

    // استخدام Web3Forms API
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Email sent successfully via Web3Forms');
      return { success: true, method: 'web3forms' };
    } else {
      throw new Error(result.message || 'Web3Forms failed');
    }
    
  } catch (error) {
    console.error('❌ Web3Forms failed:', error.message);
    
    // المحاولة الثانية: استخدام Formspree (بديل مجاني)
    try {
      await sendViaFormspree(email, code);
      return { success: true, method: 'formspree' };
    } catch (formspreeError) {
      console.error('❌ Formspree failed:', formspreeError.message);
      
      // المحاولة الثالثة: استخدام FormSubmit (بديل مجاني)
      try {
        await sendViaFormSubmit(email, code);
        return { success: true, method: 'formsubmit' };
      } catch (formsubmitError) {
        console.error('❌ All email services failed');
        return { 
          success: false, 
          error: 'All email methods failed',
          code: code
        };
      }
    }
  }
}

// بديل Formspree
async function sendViaFormspree(email, code) {
  const formData = new FormData();
  formData.append('_replyto', email);
  formData.append('_subject', 'B.Y PRO Verification Code');
  formData.append('message', `
    B.Y PRO Verification Code
    
    Email: ${email}
    Verification Code: ${code}
    
    This code will expire in 10 minutes.
    
    If you didn't request this code, please ignore this email.
    
    B.Y PRO Accounts Team
  `);

  const response = await fetch('https://formspree.io/f/xvojnzqw', { // استبدل ب Formspree ID خاص بك
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Formspree failed');
  }

  console.log('✅ Email sent via Formspree');
  return true;
}

// بديل FormSubmit
async function sendViaFormSubmit(email, code) {
  const formData = new FormData();
  formData.append('email', email);
  formData.append('code', code);
  formData.append('subject', 'B.Y PRO Verification Code');
  formData.append('message', `Your verification code is: ${code}`);
  
  const response = await fetch('https://formsubmit.co/ajax/byprosprt2007@gmail.com', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('FormSubmit failed');
  }
  
  console.log('✅ Email sent via FormSubmit');
  return true;
}

// ==================== ROUTES ====================

// الصفحات الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});

// API Routes

// التحقق من الحساب
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
      error: "Server error: " + error.message 
    });
  }
});

// الحصول على جميع الحسابات
app.get('/api/debug/accounts', async (req, res) => {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    res.json({
      success: true,
      count: accounts.length,
      accounts: accounts
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// الحصول على التالي ID المتاح
app.get('/api/next-id', async (req, res) => {
  try {
    const nextId = await getNextAvailableId();
    res.json({
      success: true,
      nextId: nextId
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// إضافة حساب جديد
app.post('/api/accounts', async (req, res) => {
  try {
    const { id, name, email, password, image } = req.body;
    
    console.log(`➕ Adding new account: ${id} - ${name} - ${email}`);
    
    if (!id || !name || !email || !password) {
      return res.json({
        success: false,
        error: "All fields are required"
      });
    }

    const accountData = {
      id: id,
      ps: password,
      email: email,
      name: name,
      image: image || ''
    };

    const saved = await addNewAccount(accountData);
    
    if (saved) {
      res.json({
        success: true,
        message: "Account created successfully",
        account: accountData
      });
    } else {
      res.json({
        success: false,
        error: "Failed to save account to database"
      });
    }
  } catch (error) {
    console.error('❌ Error creating account:', error.message);
    res.json({
      success: false,
      error: "Server error: " + error.message
    });
  }
});

// رفع الصورة
app.post('/api/upload-image', async (req, res) => {
  try {
    const { accountId, imageData } = req.body;
    
    console.log(`🖼️ Uploading image for account: ${accountId}`);
    
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
      message: "Image uploaded successfully"
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error.message);
    res.json({
      success: false,
      error: "Server error: " + error.message
    });
  }
});

// إرسال رمز التحقق
app.post('/api/send-verification-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log(`📧 Sending verification code to: ${email}`);
    console.log(`🔑 Verification code: ${code}`);
    
    if (!email || !code) {
      return res.json({
        success: false,
        error: "Email and code are required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({
        success: false,
        error: "Invalid email format"
      });
    }

    const result = await sendVerificationEmail(email, code);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Verification code sent successfully",
        method: result.method,
        code: code
      });
    } else {
      res.json({
        success: false,
        error: "Failed to send email, but you can use this code:",
        code: code,
        fallback: true
      });
    }
    
  } catch (error) {
    console.error('❌ Error in send-verification-email:', error.message);
    res.json({
      success: false,
      error: "Server error: " + error.message,
      code: req.body.code
    });
  }
});

// فحص صحة الخادم
app.get('/api/health', async (req, res) => {
  try {
    let driveStatus = 'disconnected';
    
    if (driveService) {
      try {
        await driveService.files.get({ fileId: FILE_ID, fields: 'id' });
        driveStatus = 'connected';
      } catch (error) {
        driveStatus = 'error';
      }
    }
    
    res.json({ 
      status: 'ok',
      service: 'B.Y PRO Accounts Login',
      drive_status: driveStatus,
      email_service: 'Web3Forms + Fallbacks',
      timestamp: new Date().toISOString(),
      message: 'Server is running successfully!'
    });
  } catch (error) {
    res.json({ 
      status: 'error',
      service: 'B.Y PRO Accounts Login',
      drive_status: 'error',
      email_service: 'error',
      timestamp: new Date().toISOString(),
      message: 'Server error: ' + error.message
    });
  }
});

// معالجة الأخطاء 404
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// معالجة أخطاء الخادم
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
  console.log('📧 Email service: Web3Forms + Multiple Fallbacks');
  console.log('🔑 To get free API key: https://web3forms.com');
  console.log('🎉 =================================\n');
});
