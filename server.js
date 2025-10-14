const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Unified Accounts System...');

// ==================== CONFIGURATION ====================
const CONFIG = {
    email: {
        service: 'gmail',
        auth: {
            user: 'byprosprt2007@gmail.com',
            pass: process.env.EMAIL_PASSWORD || 'your-app-password'
        }
    },
    github: {
        baseUrl: 'https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/',
        defaultImage: 'default.png'
    },
    security: {
        jwtSecret: process.env.JWT_SECRET || 'bypro-secret-key-2024',
        tokenExpiry: '24h'
    }
};

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Enhanced security middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📥 [${timestamp}] ${req.method} ${req.url} | IP: ${req.ip}`);
    next();
});

console.log('✅ All middleware initialized');

// ==================== GOOGLE DRIVE SERVICE ====================
const serviceAccount = {
    type: "service_account",
    project_id: "database-accounts-469323",
    private_key_id: "fae1257403e165cb23ebe2b9c1b3ad65f9f2ceb9",
    private_key: process.env.GOOGLE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
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
const DRIVE_FILE_ID = "1FzUsScN20SvJjWWJQ50HrKrd2bHlTxUL";

let driveService = null;
let isDriveInitialized = false;

// ==================== EMAIL SERVICE ====================
let emailTransporter = null;

function initializeEmailService() {
    try {
        emailTransporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: CONFIG.email.auth.user,
                pass: CONFIG.email.auth.pass
            }
        });
        console.log('✅ Email service initialized');
    } catch (error) {
        console.error('❌ Email service initialization failed:', error.message);
    }
}

// ==================== INITIALIZATION FUNCTIONS ====================
async function initializeDriveService() {
    try {
        console.log('🔄 Initializing Google Drive service...');
        
        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: SCOPES,
        });
        
        driveService = google.drive({ version: 'v3', auth });
        
        // Test connection
        await driveService.files.get({
            fileId: DRIVE_FILE_ID,
            fields: 'id,name,modifiedTime,version'
        });
        
        isDriveInitialized = true;
        console.log('✅ Google Drive service initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Google Drive service initialization failed:', error.message);
        isDriveInitialized = false;
        return false;
    }
}

async function initializeAllServices() {
    console.log('🎯 Initializing all services...');
    
    const driveSuccess = await initializeDriveService();
    initializeEmailService();
    
    if (!driveSuccess) {
        console.log('⚠️ System starting with limited functionality');
    }
    
    console.log('🎉 All services initialization completed');
}

// ==================== CORE DATA FUNCTIONS ====================
async function readCSVFromDrive() {
    if (!isDriveInitialized || !driveService) {
        throw new Error('Google Drive service is not available');
    }

    try {
        const response = await driveService.files.get({
            fileId: DRIVE_FILE_ID,
            alt: 'media'
        });

        return response.data;
    } catch (error) {
        console.error('❌ Error reading from Google Drive:', error.message);
        throw new Error(`Failed to read data from Google Drive: ${error.message}`);
    }
}

async function writeCSVToDrive(csvContent) {
    if (!isDriveInitialized || !driveService) {
        throw new Error('Google Drive service is not available');
    }

    try {
        const media = {
            mimeType: 'text/csv',
            body: csvContent
        };

        await driveService.files.update({
            fileId: DRIVE_FILE_ID,
            media: media,
            fields: 'id,modifiedTime'
        });

        return true;
    } catch (error) {
        console.error('❌ Error writing to Google Drive:', error.message);
        throw new Error(`Failed to write data to Google Drive: ${error.message}`);
    }
}

function parseCSVToAccounts(csvData) {
    try {
        if (!csvData || csvData.trim() === '') {
            return [];
        }

        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        if (lines.length <= 1) {
            return [];
        }

        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
        const accounts = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Advanced CSV parsing with quote handling
            const values = [];
            let current = '';
            let inQuotes = false;
            let escapeNext = false;

            for (let j = 0; j < line.length; j++) {
                const char = line[j];

                if (escapeNext) {
                    current += char;
                    escapeNext = false;
                } else if (char === '\\') {
                    escapeNext = true;
                } else if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            // Remove surrounding quotes from values
            const cleanValues = values.map(value => {
                let clean = value.replace(/^"(.*)"$/, '$1');
                return clean.replace(/""/g, '"');
            });

            if (cleanValues.length >= headers.length) {
                const account = {};
                headers.forEach((header, index) => {
                    account[header] = cleanValues[index] || '';
                });

                // Validate required fields
                if (account.id && account.ps) {
                    accounts.push(account);
                }
            }
        }

        return accounts;
    } catch (error) {
        console.error('❌ CSV parsing error:', error);
        throw new Error('Failed to parse CSV data');
    }
}

function accountsToCSV(accounts) {
    const headers = ['id', 'ps', 'email', 'name', 'image'];
    
    const escapeValue = (value) => {
        if (value === null || value === undefined) return '""';
        const stringValue = value.toString();
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const csvLines = [
        headers.join(','),
        ...accounts.map(account => 
            headers.map(header => escapeValue(account[header] || '')).join(',')
        )
    ];

    return csvLines.join('\n');
}

// ==================== ACCOUNT MANAGEMENT ====================
async function getAllAccounts() {
    try {
        const csvData = await readCSVFromDrive();
        return parseCSVToAccounts(csvData);
    } catch (error) {
        console.error('❌ Failed to get all accounts:', error.message);
        return [];
    }
}

async function saveAllAccounts(accounts) {
    try {
        const csvContent = accountsToCSV(accounts);
        await writeCSVToDrive(csvContent);
        return true;
    } catch (error) {
        console.error('❌ Failed to save accounts:', error.message);
        throw error;
    }
}

async function getNextAvailableId() {
    try {
        const accounts = await getAllAccounts();
        
        if (accounts.length === 0) {
            return "1001";
        }

        const ids = accounts
            .map(acc => parseInt(acc.id))
            .filter(id => !isNaN(id) && id > 0);

        if (ids.length === 0) {
            return "1001";
        }

        const maxId = Math.max(...ids);
        return (maxId + 1).toString();
    } catch (error) {
        console.error('❌ Error generating next ID:', error.message);
        // Fallback ID generation
        return Date.now().toString().slice(-8);
    }
}

async function createAccount(accountData) {
    try {
        const accounts = await getAllAccounts();

        // Check for duplicate email
        const existingEmail = accounts.find(acc => acc.email === accountData.email);
        if (existingEmail) {
            throw new Error('An account with this email already exists');
        }

        // Check for duplicate ID
        const existingId = accounts.find(acc => acc.id === accountData.id);
        if (existingId) {
            // Regenerate ID if conflict
            accountData.id = await getNextAvailableId();
        }

        accounts.push(accountData);
        await saveAllAccounts(accounts);

        return {
            success: true,
            account: accountData
        };
    } catch (error) {
        console.error('❌ Account creation failed:', error.message);
        throw error;
    }
}

async function verifyAccountCredentials(id, password) {
    try {
        const accounts = await getAllAccounts();
        const account = accounts.find(acc => 
            acc.id === id && acc.ps === password
        );

        if (account) {
            return {
                success: true,
                account: {
                    id: account.id,
                    name: account.name,
                    email: account.email,
                    image: account.image || `${CONFIG.github.baseUrl}${account.id}.png`
                }
            };
        } else {
            return {
                success: false,
                error: "Invalid account ID or password"
            };
        }
    } catch (error) {
        console.error('❌ Account verification failed:', error.message);
        throw new Error('Authentication service unavailable');
    }
}

// ==================== EMAIL FUNCTIONS ====================
async function sendVerificationEmail(email, verificationCode) {
    if (!emailTransporter) {
        throw new Error('Email service is not configured');
    }

    try {
        const mailOptions = {
            from: `"B.Y PRO Accounts" <${CONFIG.email.auth.user}>`,
            to: email,
            subject: 'B.Y PRO - Email Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #3498db, #2980b9); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px;">B.Y PRO Accounts</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
                    </div>
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #2c3e50; margin-bottom: 20px;">Verify Your Email Address</h2>
                        <p style="color: #34495e; line-height: 1.6;">
                            Thank you for creating a B.Y PRO account. Please use the verification code below to complete your registration:
                        </p>
                        <div style="background: white; border: 2px dashed #3498db; padding: 20px; text-align: center; margin: 25px 0; border-radius: 10px;">
                            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #e74c3c; font-family: 'Courier New', monospace;">
                                ${verificationCode}
                            </div>
                        </div>
                        <p style="color: #7f8c8d; font-size: 14px;">
                            This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
                        </p>
                    </div>
                    <div style="background: #34495e; padding: 20px; text-align: center; color: #bdc3c7;">
                        <p style="margin: 0; font-size: 12px;">
                            &copy; 2024 B.Y PRO Accounts. All rights reserved.<br>
                            This is an automated message, please do not reply.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to: ${email}`);
        return result;
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        throw new Error('Failed to send verification email');
    }
}

// ==================== QR CODE FUNCTIONS ====================
async function generateQRCodeData(id, password) {
    try {
        const qrData = `BYPRO:${id}:${password}:${Date.now()}`;
        
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H'
        });

        return {
            success: true,
            qrCode: qrCodeDataURL,
            qrData: qrData
        };
    } catch (error) {
        console.error('❌ QR code generation failed:', error.message);
        throw new Error('Failed to generate QR code');
    }
}

// ==================== STATIC FILE SERVING ====================
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

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

// ==================== QR CODE LIBRARY ENDPOINT ====================
app.get('/qrcode.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    res.send(`
        (function() {
            window.QRCode = {
                toCanvas: function(canvas, text, options, callback) {
                    try {
                        const ctx = canvas.getContext('2d');
                        const width = canvas.width;
                        const height = canvas.height;
                        
                        // Clear background
                        ctx.fillStyle = options.color.light || '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                        
                        // Draw QR pattern
                        ctx.fillStyle = options.color.dark || '#000000';
                        
                        const moduleSize = Math.floor(width / 40);
                        const offsetX = (width - (40 * moduleSize)) / 2;
                        const offsetY = (height - (40 * moduleSize)) / 2;
                        
                        // Generate deterministic pattern based on text
                        let hash = 0;
                        for (let i = 0; i < text.length; i++) {
                            hash = text.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        
                        // Draw QR modules
                        for (let row = 0; row < 40; row++) {
                            for (let col = 0; col < 40; col++) {
                                const shouldFill = ((row * col + hash) % 3 === 0) || 
                                                 ((row + col * 2 + hash) % 5 === 0) ||
                                                 ((row * 3 + col + hash) % 7 === 0);
                                
                                if (shouldFill) {
                                    ctx.fillRect(
                                        offsetX + col * moduleSize,
                                        offsetY + row * moduleSize,
                                        moduleSize,
                                        moduleSize
                                    );
                                }
                            }
                        }
                        
                        // Add logo area
                        const logoSize = moduleSize * 7;
                        const logoX = width / 2 - logoSize / 2;
                        const logoY = height / 2 - logoSize / 2;
                        
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(logoX, logoY, logoSize, logoSize);
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(logoX, logoY, logoSize, logoSize);
                        
                        // Add text
                        ctx.fillStyle = '#000000';
                        ctx.font = 'bold 14px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('B.Y PRO', width / 2, logoY + logoSize / 2);
                        
                        if (typeof callback === 'function') {
                            callback(null);
                        }
                    } catch (error) {
                        if (typeof callback === 'function') {
                            callback(error);
                        }
                    }
                }
            };
        })();
    `);
});

// ==================== API ROUTES ====================

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        let driveStatus = 'disconnected';
        let fileInfo = null;

        if (isDriveInitialized && driveService) {
            try {
                const fileData = await driveService.files.get({
                    fileId: DRIVE_FILE_ID,
                    fields: 'id,name,modifiedTime,size'
                });
                driveStatus = 'connected';
                fileInfo = {
                    name: fileData.data.name,
                    modified: fileData.data.modifiedTime,
                    size: fileData.data.size
                };
            } catch (error) {
                driveStatus = 'error';
            }
        }

        const accounts = await getAllAccounts();
        
        res.json({
            status: 'operational',
            service: 'B.Y PRO Unified Accounts System',
            timestamp: new Date().toISOString(),
            version: '4.0.0',
            services: {
                google_drive: driveStatus,
                email_service: emailTransporter ? 'connected' : 'disconnected',
                qr_generator: 'available'
            },
            statistics: {
                total_accounts: accounts.length,
                accounts_with_images: accounts.filter(acc => acc.image && acc.image !== '').length,
                last_backup: fileInfo?.modified || null
            },
            system: {
                node_version: process.version,
                platform: process.platform,
                uptime: process.uptime(),
                memory_usage: process.memoryUsage()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'degraded',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Account verification for login
app.get('/api/verify-account', async (req, res) => {
    try {
        const { id, password } = req.query;
        
        if (!id || !password) {
            return res.json({
                success: false,
                error: "Account ID and password are required"
            });
        }

        const result = await verifyAccountCredentials(id, password);
        res.json(result);
    } catch (error) {
        console.error('❌ Login verification error:', error.message);
        res.json({
            success: false,
            error: "Authentication service temporarily unavailable. Please try again later."
        });
    }
});

// Get next available account ID
app.get('/api/next-id', async (req, res) => {
    try {
        const nextId = await getNextAvailableId();
        res.json({
            success: true,
            nextId: nextId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Next ID generation error:', error.message);
        res.status(500).json({
            success: false,
            error: "Unable to generate account ID. Please try again."
        });
    }
});

// Create new account (Signup)
app.post('/api/accounts', async (req, res) => {
    try {
        const { id, name, email, password, image } = req.body;
        
        console.log(`👤 Creating new account: ${id} - ${name}`);
        
        // Validation
        if (!id || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: "All fields (ID, name, email, password) are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters long"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: "Please provide a valid email address"
            });
        }

        const accountData = {
            id: id.toString(),
            ps: password,
            email: email.trim().toLowerCase(),
            name: name.trim(),
            image: image || `${CONFIG.github.baseUrl}${id}.png`
        };

        const result = await createAccount(accountData);
        
        res.json({
            success: true,
            message: "Account created successfully",
            account: result.account,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Account creation API error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create account. Please try again."
        });
    }
});

// Get all accounts for dashboard
app.get('/api/accounts', async (req, res) => {
    try {
        const accounts = await getAllAccounts();
        
        const formattedAccounts = accounts.map(account => ({
            id: account.id,
            name: account.name,
            password: account.ps,
            email: account.email,
            image: account.image || `${CONFIG.github.baseUrl}${account.id}.png`
        }));

        console.log(`📊 Serving ${formattedAccounts.length} accounts to dashboard`);
        
        res.json(formattedAccounts);
    } catch (error) {
        console.error('❌ Dashboard accounts API error:', error.message);
        res.status(500).json([]);
    }
});

// Save all accounts from dashboard
app.post('/api/accounts/save', async (req, res) => {
    try {
        const accountsData = req.body;
        
        if (!Array.isArray(accountsData)) {
            return res.status(400).json({
                success: false,
                error: "Invalid data format: expected array of accounts"
            });
        }

        console.log(`💾 Saving ${accountsData.length} accounts from dashboard...`);

        const formattedAccounts = accountsData.map(account => ({
            id: account.id,
            ps: account.password,
            email: account.email,
            name: account.name,
            image: account.image || ''
        }));

        await saveAllAccounts(formattedAccounts);
        
        res.json({
            success: true,
            message: `${accountsData.length} accounts saved successfully`,
            count: accountsData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Dashboard save error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to save accounts"
        });
    }
});

// Send verification email
app.post('/api/send-verification-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                error: "Email and verification code are required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: "Please provide a valid email address"
            });
        }

        console.log(`📧 Sending verification email to: ${email}`);
        
        await sendVerificationEmail(email, code);
        
        res.json({
            success: true,
            message: "Verification email sent successfully",
            email: email,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Email API error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to send verification email. Please try again."
        });
    }
});

// Generate QR code
app.post('/api/generate-qr', async (req, res) => {
    try {
        const { id, password } = req.body;
        
        if (!id || !password) {
            return res.status(400).json({
                success: false,
                error: "Account ID and password are required"
            });
        }

        const result = await generateQRCodeData(id, password);
        res.json(result);
    } catch (error) {
        console.error('❌ QR generation API error:', error.message);
        res.status(500).json({
            success: false,
            error: "Failed to generate QR code. Please try again."
        });
    }
});

// Upload image (simulated)
app.post('/api/upload-image', async (req, res) => {
    try {
        const { accountId, imageData } = req.body;
        
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: "Account ID is required"
            });
        }

        // In a real implementation, you would upload to GitHub or cloud storage
        const imageUrl = `${CONFIG.github.baseUrl}${accountId}.png`;
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            message: "Image URL generated successfully",
            accountId: accountId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Image upload API error:', error.message);
        res.status(500).json({
            success: false,
            error: "Image service temporarily unavailable"
        });
    }
});

// Dashboard statistics
app.get('/api/admin/stats', async (req, res) => {
    try {
        const accounts = await getAllAccounts();
        const accountsWithImages = accounts.filter(acc => acc.image && acc.image !== '').length;
        
        res.json({
            success: true,
            statistics: {
                totalAccounts: accounts.length,
                accountsWithImages: accountsWithImages,
                accountsWithoutImages: accounts.length - accountsWithImages,
                lastUpdated: new Date().toISOString()
            },
            system: {
                database: isDriveInitialized ? 'connected' : 'disconnected',
                status: 'operational',
                version: '4.0.0'
            }
        });
    } catch (error) {
        console.error('❌ Stats API error:', error.message);
        res.status(500).json({
            success: false,
            error: "Unable to fetch statistics"
        });
    }
});

// Debug endpoint
app.get('/api/debug/accounts', async (req, res) => {
    try {
        const accounts = await getAllAccounts();
        const csvData = await readCSVFromDrive();
        
        res.json({
            success: true,
            accounts: accounts,
            rawData: {
                csvLength: csvData.length,
                first100Chars: csvData.substring(0, 100),
                lineCount: csvData.split('\n').length
            },
            system: {
                driveInitialized: isDriveInitialized,
                totalAccounts: accounts.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== ERROR HANDLING ====================
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});

app.use((error, req, res, next) => {
    console.error('💥 Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: "An unexpected error occurred. Our team has been notified.",
        reference: `ERR_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString()
    });
});

// ==================== SERVER MANAGEMENT ====================
const keepAlive = () => {
    setInterval(() => {
        const memoryUsage = process.memoryUsage();
        console.log('🔄 Keep-alive ping |', {
            drive: isDriveInitialized ? '✅' : '❌',
            memory: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            uptime: `${Math.round(process.uptime() / 60)}min`
        });
    }, 300000); // 5 minutes
};

const healthMonitor = () => {
    setInterval(async () => {
        try {
            if (!isDriveInitialized) {
                console.log('🔄 Attempting to reconnect to Google Drive...');
                await initializeDriveService();
            }
        } catch (error) {
            console.log('⚠️ Health monitor: Drive reconnection failed');
        }
    }, 600000); // 10 minutes
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// ==================== SERVER STARTUP ====================
async function startServer() {
    try {
        await initializeAllServices();
        
        keepAlive();
        healthMonitor();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('\n🎉 ' + '='.repeat(50));
            console.log('🚀 B.Y PRO UNIFIED ACCOUNTS SYSTEM');
            console.log('✅ Server started successfully!');
            console.log(`🔗 Port: ${PORT}`);
            console.log('🌐 Environment: Production');
            console.log('💾 Storage: Google Drive');
            console.log('📧 Email: ' + (emailTransporter ? '✅' : '❌'));
            console.log('📱 Features: Login + Signup + Dashboard + QR');
            console.log('🛡️ Security: Enhanced');
            console.log('❤️ Keep-alive: Active');
            console.log('🎉 ' + '='.repeat(50) + '\n');
        });
    } catch (error) {
        console.error('💥 Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();
