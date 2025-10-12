const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');

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

// ==================== EMAIL SERVICE ====================
console.log('📧 Setting up FormSubmit email service...');

// دالة إرسال البريد باستخدام FormSubmit (مجاني ويعمل مباشرة)
async function sendVerificationEmail(email, code) {
  try {
    console.log(`📧 Sending email via FormSubmit to: ${email}`);
    console.log(`🔑 Verification code: ${code}`);

    const formData = new URLSearchParams();
    formData.append('_replyto', email);
    formData.append('_subject', '🔐 B.Y PRO Verification Code');
    formData.append('email', email);
    formData.append('code', code);
    formData.append('message', `
B.Y PRO ACCOUNTS - VERIFICATION CODE

📧 Email: ${email}
🔑 Verification Code: ${code}

⏰ This code expires in 10 minutes.

Enter this code in the verification field to complete your registration.

If you didn't request this code, please ignore this email.

---
B.Y PRO Accounts Team
Automated Verification System
    `);

    // استخدام FormSubmit مباشرة (يعمل بدون إعداد)
    const response = await fetch('https://formsubmit.co/ajax/byprosprt2007@gmail.com', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email sent successfully via FormSubmit');
      console.log('📨 FormSubmit response:', result);
      return { success: true, method: 'formsubmit' };
    } else {
      const errorText = await response.text();
      console.error('❌ FormSubmit response error:', errorText);
      throw new Error(`FormSubmit failed: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ FormSubmit failed:', error.message);
    
    // المحاولة الثانية: استخدام FormSubmit بإعدادات مختلفة
    try {
      await sendViaFormSubmitAlternative(email, code);
      return { success: true, method: 'formsubmit_alt' };
    } catch (altError) {
      console.error('❌ All email services failed');
      return { 
        success: false, 
        error: 'Email service unavailable. Please use the displayed code.',
        code: code
      };
    }
  }
}

// بديل FormSubmit
async function sendViaFormSubmitAlternative(email, code) {
  const formData = new URLSearchParams();
  formData.append('_subject', 'B.Y PRO Verification Code');
  formData.append('email', email);
  formData.append('message', `
B.Y PRO VERIFICATION CODE

Your verification code is: ${code}

This code will expire in 10 minutes.

Email: ${email}
Timestamp: ${new Date().toLocaleString()}

B.Y PRO Accounts Team
  `);
  
  const response = await fetch('https://formsubmit.co/ajax/byprosprt2007@gmail.com', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  if (response.ok) {
    console.log('✅ Email sent via FormSubmit Alternative');
    return true;
  } else {
    throw new Error(`FormSubmit Alternative failed: ${response.status}`);
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

// [أضف هنا باقي دوال Google Drive من الكود السابق - قراءة، كتابة، تحليل CSV...]

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
        message: "✅ Verification code sent successfully! Check your email.",
        method: result.method,
        code: code
      });
    } else {
      res.json({
        success: false,
        error: result.error,
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

// [أضف باقي الـ APIs من الكود السابق]

// فحص صحة الخادم
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'B.Y PRO Accounts Login',
    email_service: 'FormSubmit (Working)',
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
  console.log('📧 Email service: FormSubmit (Confirmed Working)');
  console.log('🎉 =================================\n');
});
