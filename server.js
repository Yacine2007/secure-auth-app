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

// إعدادات Gmail SMTP - استبدل هذه بالقيم الحقيقية
const SMTP_CONFIG = {
  service: 'gmail',
  auth: {
    user: 'byprosprt2007@gmail.com', // بريدك الحقيقي
    pass: 'bwau grcq jivh bvri'      // App Password الحقيقي
  }
};

// إنشاء الناقل البريدي
const createTransporter = () => {
  try {
    const transporter = nodemailer.createTransporter(SMTP_CONFIG);
    
    // اختبار الاتصال
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP Connection Failed:', error);
      } else {
        console.log('✅ SMTP Server is ready to send emails');
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('❌ Failed to create SMTP transporter:', error);
    return null;
  }
};

const emailTransporter = createTransporter();

// دالة إرسال البريد الحقيقية
async function sendVerificationEmail(userEmail, code) {
  if (!emailTransporter) {
    return { 
      success: false, 
      error: 'SMTP service not configured',
      code: code 
    };
  }

  try {
    console.log(`📧 Sending email to: ${userEmail}`);
    console.log(`🔑 Code: ${code}`);

    const mailOptions = {
      from: '"B.Y PRO Accounts" <byprosprt2007@gmail.com>',
      to: userEmail, // يرسل مباشرة إلى بريد المستخدم
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
                .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e3f2fd; color: #666; text-align: center; }
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
                    Your verification code for B.Y PRO Accounts is:
                </p>
                
                <div class="code">${code}</div>
                
                <p style="color: #546e7a; text-align: center; font-size: 14px;">
                    ⏰ This code will expire in 10 minutes.
                </p>
                
                <div style="background: #fff3cd; border: 2px solid #ffeaa7; border-radius: 10px; padding: 15px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; text-align: center;">
                        🔒 If you didn't request this code, please ignore this email.
                    </p>
                </div>
                
                <div class="footer">
                    <p style="margin: 5px 0;"><strong>B.Y PRO Accounts Team</strong></p>
                    <p style="margin: 5px 0; font-size: 14px;">Secure • Professional • Reliable</p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `B.Y PRO Verification Code: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nB.Y PRO Accounts Team`
    };

    // إرسال البريد الحقيقي
    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully via Gmail SMTP');
    console.log('📨 Message ID:', info.messageId);
    console.log('👤 Sent to:', userEmail);
    
    return { 
      success: true, 
      method: 'gmail_smtp', 
      messageId: info.messageId,
      to: userEmail
    };
    
  } catch (error) {
    console.error('❌ SMTP Email failed:', error.message);
    return { 
      success: false, 
      error: 'Failed to send email: ' + error.message,
      code: code
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

// [أضف هنا دوال Google Drive من الكود السابق]

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
app.post('/api/send-verification-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log(`📧 API Request - To: ${email}, Code: ${code}`);
    
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
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    res.json({
      success: false,
      error: "Server error: " + error.message,
      code: req.body.code
    });
  }
});

// فحص صحة الخادم
app.get('/api/health', async (req, res) => {
  let smtpStatus = 'disconnected';
  
  if (emailTransporter) {
    try {
      await emailTransporter.verify();
      smtpStatus = 'connected';
    } catch (error) {
      smtpStatus = 'error';
    }
  }
  
  res.json({ 
    status: 'ok',
    service: 'B.Y PRO Accounts',
    smtp_status: smtpStatus,
    email_service: 'Gmail SMTP (Direct)',
    timestamp: new Date().toISOString(),
    message: 'Production Server - Real Email Service'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎉 =================================');
  console.log('🚀 B.Y PRO ACCOUNTS - PRODUCTION');
  console.log('✅ Server started successfully!');
  console.log(`🔗 Port: ${PORT}`);
  console.log('📧 Email: Gmail SMTP (Direct to User)');
  console.log('💾 Database: Google Drive');
  console.log('🔐 Auth: QR Code + Password');
  console.log('🎉 =================================\n');
});
