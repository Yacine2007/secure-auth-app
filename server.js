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

// middleware لتسجيل جميع الطلبات
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

console.log('✅ Middleware initialized');

// ==================== GMAIL SMTP CONFIGURATION ====================
console.log('📧 Setting up Gmail SMTP service...');

// إعداد الناقل البريدي مع Gmail
const createTransporter = () => {
  try {
    console.log('🔧 Creating Gmail transporter...');
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: 'byprosprt2007@gmail.com', // البريد الإلكتروني
        pass: 'zhdq gvmu vtfe cjns' // App Password
      }
    });

    // اختبار الاتصال
    transporter.verify(function(error, success) {
      if (error) {
        console.error('❌ Gmail SMTP connection failed:', error);
      } else {
        console.log('✅ Gmail SMTP server is ready to take our messages');
      }
    });

    return transporter;
  } catch (error) {
    console.error('❌ Failed to create Gmail transporter:', error.message);
    return null;
  }
};

const emailTransporter = createTransporter();

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

// ==================== EMAIL FUNCTIONS ====================

// دالة إرسال البريد باستخدام Gmail مباشرة
async function sendVerificationEmail(email, code) {
  try {
    console.log(`📧 Sending email via Gmail SMTP to: ${email}`);
    console.log(`🔑 Verification code: ${code}`);
    
    if (!emailTransporter) {
      throw new Error('Email transporter not available');
    }

    const mailOptions = {
      from: '"B.Y PRO Accounts" <byprosprt2007@gmail.com>',
      to: email,
      subject: '🔐 B.Y PRO Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0; 
                    padding: 20px; 
                }
                .container { 
                    background: white; 
                    padding: 40px; 
                    border-radius: 15px; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }
                .header { 
                    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    border-radius: 15px 15px 0 0; 
                    text-align: center; 
                    margin: -40px -40px 30px -40px;
                }
                .logo {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 15px;
                    border-radius: 50%;
                    background: white;
                    padding: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                .code { 
                    font-size: 42px; 
                    font-weight: bold; 
                    color: #3498db; 
                    text-align: center; 
                    margin: 30px 0; 
                    letter-spacing: 8px; 
                    padding: 20px; 
                    background: #f8f9fa; 
                    border-radius: 12px; 
                    border: 3px dashed #3498db;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
                }
                .footer { 
                    margin-top: 30px; 
                    padding-top: 20px; 
                    border-top: 2px solid #e3f2fd; 
                    color: #666; 
                    font-size: 14px; 
                    text-align: center;
                }
                .info-box {
                    background: #e3f2fd;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    border-left: 4px solid #3498db;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <div style="width: 100%; height: 100%; background: #3498db; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px;">
                            BY
                        </div>
                    </div>
                    <h1 style="margin: 0; font-size: 28px;">B.Y PRO Accounts</h1>
                    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Secure Authentication System</p>
                </div>
                
                <h2 style="color: #2c3e50; text-align: center; margin-bottom: 10px;">Verification Code Required</h2>
                <p style="color: #546e7a; text-align: center; font-size: 16px; line-height: 1.6;">
                    Hello! You're one step away from accessing your B.Y PRO account.
                </p>
                
                <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border: 3px solid #e3f2fd; text-align: center;">
                    <h3 style="color: #2c3e50; margin: 0 0 15px; font-size: 18px;">Your Verification Code</h3>
                    <div class="code">${code}</div>
                    <p style="color: #78909c; margin: 15px 0 0; font-size: 14px;">
                        ⏰ Expires in <strong>10 minutes</strong>
                    </p>
                </div>

                <div class="info-box">
                    <h3 style="color: #2c3e50; margin: 0 0 12px; font-size: 16px;">📋 Registration Details</h3>
                    <p style="color: #546e7a; margin: 8px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                    <p style="color: #546e7a; margin: 8px 0; font-size: 14px;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                </div>

                <div style="background: #fff3cd; border: 2px solid #ffeaa7; border-radius: 10px; padding: 15px; margin: 20px 0; text-align: center;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                        🔒 <strong>Security Notice:</strong> If you didn't request this code, please ignore this email.
                    </p>
                </div>

                <p style="color: #546e7a; text-align: center; font-size: 16px; line-height: 1.6;">
                    Enter this code in the verification field to complete your account setup. 
                    Welcome to B.Y PRO! 🚀
                </p>
                
                <div class="footer">
                    <p style="margin: 5px 0; color: #78909c;"><strong>B.Y PRO Accounts Team</strong></p>
                    <p style="margin: 5px 0; color: #78909c;">Secure • Reliable • Professional</p>
                    <p style="margin: 5px 0; color: #78909c;">📍 Automated Verification System</p>
                    <p style="margin: 5px 0; color: #78909c;">🕒 ${new Date().getFullYear()} • All rights reserved</p>
                    <p style="font-size: 12px; color: #b0bec5; margin-top: 15px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    // إرسال البريد مباشرة عبر Gmail SMTP
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully via Gmail SMTP');
    console.log('📨 Message ID:', info.messageId);
    return { success: true, method: 'gmail_smtp', messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Gmail SMTP failed:', error.message);
    
    // المحاولة الثانية: إعدادات SMTP بديلة
    try {
      console.log('🔄 Trying alternative SMTP configuration...');
      await sendViaAlternativeSMTP(email, code);
      return { success: true, method: 'alternative_smtp' };
    } catch (smtpError) {
      console.error('❌ All SMTP methods failed:', smtpError.message);
      return { 
        success: false, 
        error: 'Email service unavailable. Please use the displayed code.',
        code: code
      };
    }
  }
}

// بديل SMTP باستخدام إعدادات أخرى
async function sendViaAlternativeSMTP(email, code) {
  try {
    // إعدادات SMTP بديلة
    const altTransporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'byprosprt2007@gmail.com',
        pass: 'zhdq gvmu vtfe cjns'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: '"B.Y PRO" <byprosprt2007@gmail.com>',
      to: email,
      subject: 'B.Y PRO Verification Code',
      text: `
B.Y PRO ACCOUNTS - VERIFICATION CODE

Your verification code is: ${code}

This code will expire in 10 minutes.

Enter this code in the verification field to complete your registration.

If you didn't request this code, please ignore this email.

---
B.Y PRO Accounts Team
Automated Verification System
      `,
      html: `
        <div>
          <h2>B.Y PRO Verification Code</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>Enter this code in the verification field to complete your registration.</p>
          <hr>
          <p><em>B.Y PRO Accounts Team</em></p>
        </div>
      `
    };

    const info = await altTransporter.sendMail(mailOptions);
    console.log('✅ Email sent via alternative SMTP');
    return info;
  } catch (error) {
    throw error;
  }
}

// ==================== GOOGLE DRIVE FUNCTIONS ====================

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
        error: result.error || "Failed to send email",
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
    let emailStatus = 'disconnected';
    
    if (driveService) {
      try {
        await driveService.files.get({ fileId: FILE_ID, fields: 'id' });
        driveStatus = 'connected';
      } catch (error) {
        driveStatus = 'error';
      }
    }
    
    if (emailTransporter) {
      try {
        await emailTransporter.verify();
        emailStatus = 'connected';
      } catch (error) {
        emailStatus = 'error';
      }
    }
    
    res.json({ 
      status: 'ok',
      service: 'B.Y PRO Accounts Login',
      drive_status: driveStatus,
      email_service: emailStatus,
      timestamp: new Date().toISOString(),
      message: 'Server is running successfully!',
      features: {
        email: 'Gmail SMTP (Direct)',
        database: 'Google Drive',
        authentication: 'QR Code + Password'
      }
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
  console.log('📧 Email service: Gmail SMTP (Direct)');
  console.log('💾 Database: Google Drive');
  console.log('🔐 Authentication: QR Code + Password');
  console.log('🎉 =================================\n');
  
  // اختبار الاتصال بالبريد
  if (emailTransporter) {
    emailTransporter.verify((error, success) => {
      if (error) {
        console.log('❌ Email service: Connection failed');
      } else {
        console.log('✅ Email service: Ready to send emails');
      }
    });
  }
});
