const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Unified Accounts System with OTP...');

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

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

console.log('✅ Middleware initialized');

// ==================== ENHANCED EMAIL CONFIGURATION ====================
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: 'byprosprt2007@gmail.com',
      pass: 'nspr xhfv yhxu vtwa' // App Password
    }
  });
};

// In-memory storage for verification codes and OTP
const verificationCodes = new Map();
const otpStorage = new Map(); // تخزين OTPs

// ==================== RULES SYSTEM ====================
const acceptedRules = new Set();

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
    
    await driveService.files.get({
      fileId: FILE_ID,
      fields: 'id,name,mimeType,modifiedTime'
    });
    
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
      
      if (i === 0 && (line.includes('id,ps,email,name,image') || line.includes('"id","ps","email","name","image"'))) {
        continue;
      }
      
      const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
      
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
      console.log('📝 Starting with empty CSV data');
      csvData = '';
    }
    
    let accounts = parseCSVToAccounts(csvData);
    
    if (accountData.email) {
      const existingAccount = accounts.find(acc => acc.email === accountData.email);
      if (existingAccount) {
        throw new Error("An account with this email already exists");
      }
    }
    
    const existingId = accounts.find(acc => acc.id === accountData.id);
    if (existingId) {
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

// ==================== ENHANCED OTP EMAIL SERVICE ====================
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
            
            <p style="color: #777; font-size: 14px; text-align: center; margin-top: 25px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          
          <div style="background: #34495e; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 2px;">
            <p style="margin: 0; font-size: 12px; opacity: 0.8;">
              &copy; 2024 B.Y PRO Accounts System. All rights reserved.<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to: ${email} | Code: ${otpCode}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ OTP email sending failed:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ENHANCED QR CODE SERVICE ====================
async function generateEnhancedQRCode(qrData, options = {}) {
  try {
    const {
      width = 200,
      height = 200,
      colorDark = "#1a237e",
      colorLight = "#ffffff",
      correctLevel = 'H'
    } = options;

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
    return {
      success: false,
      error: "QR code generation failed"
    };
  }
}

// ==================== ROUTES ====================

// Serve static files
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

// Serve QR Code library locally
app.get('/qrcode.min.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    // QR Code Generator for B.Y PRO Accounts
    (function(){
      window.QRCode = {
        toCanvas: function(canvas, text, options, callback) {
          try {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            ctx.fillStyle = options.color.light || '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = options.color.dark || '#1a237e';
            
            const size = 8;
            const cols = Math.floor(width / size);
            const rows = Math.floor(height / size);
            
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
              hash = text.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                if ((row * col + hash) % 3 === 0) {
                  ctx.fillRect(col * size, row * size, size - 1, size - 1);
                }
              }
            }
            
            ctx.fillStyle = '#1a237e';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('B.Y PRO Account', width / 2, height - 20);
            
            if (callback) callback(null);
          } catch (error) {
            if (callback) callback(error);
          }
        }
      };
    })();
  `);
});

// ==================== ENHANCED OTP ROUTES ====================

// إرسال كود OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log(`📧 OTP requested for: ${email}`);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "البريد الإلكتروني مطلوب"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "يرجى تقديم بريد إلكتروني صحيح"
      });
    }

    // إنشاء كود OTP
    const otp = generateOTP();
    
    // حفظ الكود لمدة 10 دقائق
    otpStorage.set(email, {
      otp: otp,
      expires: Date.now() + 10 * 60 * 1000, // 10 دقائق
      attempts: 0 // عدد محاولات التحقق
    });

    console.log(`✅ Generated OTP for ${email}: ${otp}`);

    // إرسال البريد الإلكتروني
    const emailResult = await sendOTPEmail(email, otp);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: "تم إرسال كود التحقق إلى بريدك الإلكتروني",
        email: email
      });
    } else {
      // تنظيف التخزين إذا فشل الإرسال
      otpStorage.delete(email);
      res.status(500).json({
        success: false,
        error: "خدمة البريد الإلكتروني غير متاحة حالياً. يرجى المحاولة لاحقاً."
      });
    }
    
  } catch (error) {
    console.error('❌ OTP sending error:', error.message);
    res.status(500).json({
      success: false,
      error: "الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً."
    });
  }
});

// التحقق من كود OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log(`🔍 Verifying OTP for: ${email}`);
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "البريد الإلكتروني والكود مطلوبان"
      });
    }

    const storedData = otpStorage.get(email);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: "لم يتم العثور على كود تحقق لهذا البريد. يرجى طلب كود جديد."
      });
    }

    // التحقق من انتهاء الصلاحية
    if (Date.now() > storedData.expires) {
      otpStorage.delete(email);
      return res.status(400).json({
        success: false,
        error: "كود التحقق منتهي الصلاحية. يرجى طلب كود جديد."
      });
    }

    // زيادة عدد المحاولات
    storedData.attempts += 1;
    
    // التحقق من تجاوز الحد الأقصى للمحاولات
    if (storedData.attempts > 5) {
      otpStorage.delete(email);
      return res.status(400).json({
        success: false,
        error: "تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى طلب كود جديد."
      });
    }

    // التحقق من صحة الكود
    if (storedData.otp === otp) {
      otpStorage.delete(email);
      res.json({
        success: true,
        message: "تم التحقق بنجاح"
      });
    } else {
      res.status(400).json({
        success: false,
        error: "كود التحقق غير صحيح. يرجى المحاولة مرة أخرى.",
        attempts: storedData.attempts,
        remainingAttempts: 5 - storedData.attempts
      });
    }
    
  } catch (error) {
    console.error('❌ OTP verification error:', error.message);
    res.status(500).json({
      success: false,
      error: "خدمة التحقق غير متاحة حالياً."
    });
  }
});

// إعادة إرسال كود OTP
app.post('/api/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "البريد الإلكتروني مطلوب"
      });
    }

    // حذف أي كود موجود مسبقاً
    otpStorage.delete(email);
    
    // إنشاء كود جديد
    const otp = generateOTP();
    
    // حفظ الكود الجديد
    otpStorage.set(email, {
      otp: otp,
      expires: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });

    console.log(`🔄 Resent OTP for ${email}: ${otp}`);

    const emailResult = await sendOTPEmail(email, otp);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: "تم إعادة إرسال كود التحقق بنجاح"
      });
    } else {
      otpStorage.delete(email);
      res.status(500).json({
        success: false,
        error: "فشل إعادة الإرسال. يرجى المحاولة لاحقاً."
      });
    }
    
  } catch (error) {
    console.error('❌ OTP resend error:', error.message);
    res.status(500).json({
      success: false,
      error: "خدمة إعادة الإرسال غير متاحة."
    });
  }
});

// ==================== RULES SYSTEM ROUTES ====================

// مسار التحقق من قبول القوانين
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
      accepted: hasAccepted,
      userId: userId,
      message: hasAccepted ? "Rules already accepted" : "Rules not accepted yet"
    });
    
  } catch (error) {
    console.error('❌ Error checking rules:', error.message);
    res.status(500).json({
      success: false,
      error: "Rules service unavailable"
    });
  }
});

// مسار قبول القوانين
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
    
    console.log(`✅ User ${userId} accepted the rules`);
    
    res.json({
      success: true,
      message: "Rules accepted successfully",
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ Error accepting rules:', error.message);
    res.status(500).json({
      success: false,
      error: "Unable to accept rules"
    });
  }
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
      service: 'B.Y PRO Unified Accounts System with OTP',
      timestamp: new Date().toISOString(),
      services: {
        database: driveStatus,
        storage: 'google_drive_only',
        email_service: 'nodemailer_otp',
        total_accounts: accounts.length,
        last_modified: lastModified
      },
      version: '5.0.0',
      features: ['otp_verification', 'qr_codes', 'rules_system']
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'B.Y PRO Unified Accounts System',
      error: "Google Drive service unavailable",
      services: {
        database: 'error',
        storage: 'google_drive_only',
        email_service: 'nodemailer_otp'
      }
    });
  }
});

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

// Create new account - MAIN ROUTE
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
      image: image || `https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/${id}.png`
    };

    console.log('💾 Starting account save process to Google Drive...');
    
    const saved = await addNewAccount(accountData);
    
    if (saved) {
      console.log(`✅ Account creation successful: ${accountData.id}`);
      
      const qrData = `BYPRO:${accountData.id}:${accountData.ps}`;
      const qrResult = await generateEnhancedQRCode(qrData, {
        colorDark: "#1a237e",
        colorLight: "#ffffff"
      });

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
        show_rules: true,
        rules_url: `/rules-popup?userId=${accountData.id}`
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

// Generate QR Code endpoint
app.post('/api/generate-qr', async (req, res) => {
  try {
    const { id, password } = req.body;
    
    if (!id || !password) {
      return res.status(400).json({
        success: false,
        error: "ID and password are required"
      });
    }

    const qrData = `BYPRO:${id}:${password}`;
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a237e',
          light: '#FFFFFF'
        }
      });
      
      res.json({
        success: true,
        qrCode: qrCodeDataURL,
        qrData: qrData
      });
    } catch (qrError) {
      console.error('QR Generation Error:', qrError);
      res.json({
        success: true,
        qrCode: '',
        qrData: qrData,
        fallback: true
      });
    }
    
  } catch (error) {
    console.error('❌ QR Generation Error:', error.message);
    res.status(500).json({
      success: false,
      error: "QR code generation failed"
    });
  }
});

// Upload image route
app.post('/api/upload-image', async (req, res) => {
  try {
    const { accountId, imageData } = req.body;
    
    console.log(`🖼️ Image upload for account: ${accountId}`);
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "Account ID is required"
      });
    }

    const imageUrl = `https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/${accountId}.png`;
    
    try {
      const csvData = await readCSVFromDrive(FILE_ID);
      const accounts = parseCSVToAccounts(csvData);
      
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        account.image = imageUrl;
        await saveAllAccounts(accounts);
        
        console.log(`✅ Image URL updated for account ${accountId}`);
      }
    } catch (driveError) {
      console.error('❌ Error updating account image:', driveError);
    }

    res.json({
      success: true,
      imageUrl: imageUrl,
      message: "Image URL updated successfully"
    });
    
  } catch (error) {
    console.error('❌ Error uploading image:', error.message);
    res.status(500).json({
      success: false,
      error: "Image service temporarily unavailable"
    });
  }
});

// Dashboard API - Get statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    const csvData = await readCSVFromDrive(FILE_ID);
    const accounts = parseCSVToAccounts(csvData);
    
    res.json({
      success: true,
      totalAccounts: accounts.length,
      accountsWithImages: accounts.filter(acc => acc.image && acc.image !== '').length,
      lastUpdated: new Date().toISOString(),
      databaseStatus: 'connected',
      storage: 'google_drive',
      otpService: 'active'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: "Cannot fetch statistics from Google Drive" 
    });
  }
});

// Enhanced 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "The requested resource was not found",
    path: req.originalUrl
  });
});

// Enhanced error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: "An unexpected error occurred. Please try again later.",
    reference: Date.now().toString(36)
  });
});

// Keep-alive to prevent shutdown
const keepAlive = () => {
  setInterval(() => {
    console.log('🔄 Keep-alive ping - OTP service active');
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
  console.log('📧 Features: OTP + Login + Signup + Dashboard');
  console.log('🔐 Auth: OTP + QR Code + Password');
  console.log('📨 Email: Nodemailer + OTP System');
  console.log('⚖️ Rules System: Active');
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
      // التحقق من قبول القوانين
      const hasAcceptedRules = acceptedRules.has(account.id);
      
      return {
        success: true,
        account: {
          id: account.id,
          name: account.name || `User ${account.id}`,
          email: account.email || `${account.id}@bypro.com`,
          image: account.image || ''
        },
        storage: 'google_drive',
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
      error: "Authentication service temporarily unavailable. Please try again later."
    };
  }
}
