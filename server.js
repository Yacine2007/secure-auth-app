const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

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

// ==================== GMAIL SMTP CONFIGURATION ====================
console.log('📧 Setting up Gmail SMTP service...');

let emailTransporter = null;
let smtpStatus = 'disconnected';

const initializeEmailService = async () => {
  try {
    console.log('🔧 Initializing email service...');
    
    // استخدام إعدادات أكثر أماناً
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'byprosprt2007@gmail.com',
        pass: process.env.EMAIL_PASS || 'bwau grcq jivh bvri'
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });

    // التحقق من الاتصال
    await transporter.verify();
    console.log('✅ SMTP Server is ready to send emails');
    smtpStatus = 'connected';
    return transporter;
    
  } catch (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
    smtpStatus = 'error';
    return null;
  }
};

// تهيئة خدمة البريد عند بدء التشغيل
initializeEmailService().then(transporter => {
  emailTransporter = transporter;
});

// وظيفة إرسال البريد الإلكتروني
async function sendVerificationEmail(userEmail, code) {
  if (!emailTransporter) {
    console.error('❌ SMTP transporter not available');
    return { 
      success: false, 
      error: 'Email service is currently unavailable. Please try again later.',
      systemError: 'SMTP service not configured'
    };
  }

  try {
    console.log(`📧 Attempting to send email to: ${userEmail}`);
    
    const mailOptions = {
      from: '"B.Y PRO Accounts" <byprosprt2007@gmail.com>',
      to: userEmail,
      subject: '🔐 B.Y PRO Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                .container { background: white; padding: 40px; border-radius: 15px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 30px; border-radius: 15px 15px 0 0; text-align: center; margin: -40px -40px 30px -40px; }
                .code { font-size: 42px; font-weight: bold; color: #3498db; text-align: center; margin: 30px 0; letter-spacing: 8px; padding: 20px; background: #f8f9fa; border-radius: 10px; border: 3px dashed #3498db; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">B.Y PRO Accounts</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Verification Code</p>
                </div>
                
                <h2 style="color: #2c3e50; text-align: center;">Hello!</h2>
                <p style="color: #546e7a; text-align: center; font-size: 16px;">
                    Your verification code is:
                </p>
                
                <div class="code">${code}</div>
                
                <p style="color: #546e7a; text-align: center; font-size: 14px;">
                    ⏰ This code will expire in 10 minutes.
                </p>
                
                <div style="background: #fff3cd; border: 2px solid #ffeaa7; border-radius: 10px; padding: 15px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; text-align: center;">
                        🔒 Security Notice: If you didn't request this code, please ignore this email.
                    </p>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e3f2fd; color: #666; text-align: center;">
                    <p style="margin: 5px 0;"><strong>B.Y PRO Accounts Team</strong></p>
                    <p style="margin: 5px 0; font-size: 14px;">Secure • Professional • Reliable</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    
    return { 
      success: true, 
      method: 'gmail_smtp',
      message: 'Verification code sent successfully'
    };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { 
      success: false, 
      error: 'Unable to send verification email at this time. Please try again in a few minutes.',
      systemError: error.message
    };
  }
}

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
    throw new Error("Database service is currently unavailable");
  }

  try {
    const response = await driveService.files.get({
      fileId: fileId,
      alt: 'media'
    });

    const data = response.data;
    console.log(`✅ Successfully read CSV data, length: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Error reading CSV from Drive:', error.message);
    throw new Error('Unable to access database at this time');
  }
}

// كتابة CSV إلى Google Drive
async function writeCSVToDrive(fileId, accounts) {
  if (!driveService) {
    throw new Error("Database service is currently unavailable");
  }

  try {
    console.log(`💾 Writing ${accounts.length} accounts to Drive...`);
    
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
    throw new Error('Unable to save data to database');
  }
}

// تحويل CSV إلى مصفوفة حسابات
function parseCSVToAccounts(csvData) {
  try {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split(',').map(header => header.trim());
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

// الحصول على ID التالي المتاح
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
    // استخدام ID عشوائي كبديل
    return (Math.floor(Math.random() * 10000) + 1000).toString();
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

// التحقق من بيانات الحساب
async function verifyAccountCredentials(id, password) {
  try {
    console.log(`🔐 Verifying credentials for ID: ${id}`);
    
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
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
      error: "Authentication service is temporarily unavailable. Please try again later."
    };
  }
}

// ==================== ROUTES ====================

// Routes الأساسية
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
      error: "Authentication service is temporarily unavailable. Please try again later." 
    });
  }
});

// الحصول على ID التالي
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
      error: "Unable to generate account ID at this time. Please try again.",
      systemError: error.message
    });
  }
});

// إنشاء حساب جديد
app.post('/api/accounts', async (req, res) => {
  try {
    const { id, name, email, password, image } = req.body;
    
    console.log(`👤 Adding new account: ${id} - ${name}`);
    
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
        error: "Unable to create account at this time. Please try again later."
      });
    }
  } catch (error) {
    console.error('❌ Error creating account:', error.message);
    res.json({
      success: false,
      error: "Account creation service is temporarily unavailable. Please try again later."
    });
  }
});

// إرسال بريد التحقق
app.post('/api/send-verification-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log(`📧 API Request - To: ${email}`);
    
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
        error: "Please enter a valid email address"
      });
    }

    const result = await sendVerificationEmail(email, code);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    res.json({
      success: false,
      error: "Email service is temporarily unavailable. Please try again in a few minutes."
    });
  }
});

// التحقق من صحة الخدمة
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'operational',
    service: 'B.Y PRO Accounts',
    smtp_status: smtpStatus,
    database_status: driveService ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    message: 'Professional Account Management System'
  });
});

// معالجة 404
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error. Our team has been notified and is working on a solution.'
  });
});

// بدء الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO ACCOUNTS - PRODUCTION');
  console.log('✅ Server started successfully!');
  console.log(`🔗 Port: ${PORT}`);
  console.log('📧 Email: Gmail SMTP');
  console.log('💾 Database: Google Drive');
  console.log('🔐 Auth: QR Code + Password');
  console.log('🎉 =================================\n');
});
