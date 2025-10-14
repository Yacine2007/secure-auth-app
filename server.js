const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Unified Accounts System...');

// ==================== CONFIGURATION ====================
const CONFIG = {
    github: {
        baseUrl: 'https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/',
        defaultImage: 'default.png'
    }
};

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📥 [${timestamp}] ${req.method} ${req.url}`);
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

// ==================== INITIALIZATION FUNCTIONS ====================
async function initializeDriveService() {
    try {
        console.log('🔄 Initializing Google Drive service...');
        
        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: SCOPES,
        });
        
        driveService = google.drive({ version: 'v3', auth });
        
        // Test connection with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
        );
        
        const drivePromise = driveService.files.get({
            fileId: DRIVE_FILE_ID,
            fields: 'id,name,modifiedTime'
        });
        
        await Promise.race([drivePromise, timeoutPromise]);
        
        isDriveInitialized = true;
        console.log('✅ Google Drive service initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Google Drive service initialization failed:', error.message);
        console.log('💡 Please check:');
        console.log('   1. Google Drive API is enabled in Google Cloud Console');
        console.log('   2. Service account has access to the file');
        console.log('   3. File ID is correct: ' + DRIVE_FILE_ID);
        console.log('   4. Private key is valid and not expired');
        isDriveInitialized = false;
        return false;
    }
}

// ==================== CORE DATA FUNCTIONS ====================
async function readCSVFromDrive() {
    if (!isDriveInitialized || !driveService) {
        throw new Error('Google Drive service is not available');
    }

    try {
        console.log('📖 Reading data from Google Drive...');
        const response = await driveService.files.get({
            fileId: DRIVE_FILE_ID,
            alt: 'media'
        });

        console.log('✅ Successfully read data from Google Drive');
        return response.data;
    } catch (error) {
        console.error('❌ Error reading from Google Drive:', error.message);
        throw new Error(`Failed to read data: ${error.message}`);
    }
}

async function writeCSVToDrive(csvContent) {
    if (!isDriveInitialized || !driveService) {
        throw new Error('Google Drive service is not available');
    }

    try {
        console.log('💾 Writing data to Google Drive...');
        const media = {
            mimeType: 'text/csv',
            body: csvContent
        };

        await driveService.files.update({
            fileId: DRIVE_FILE_ID,
            media: media
        });

        console.log('✅ Successfully wrote data to Google Drive');
        return true;
    } catch (error) {
        console.error('❌ Error writing to Google Drive:', error.message);
        throw new Error(`Failed to write data: ${error.message}`);
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

            const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
            if (values.length >= headers.length) {
                const account = {};
                headers.forEach((header, index) => {
                    account[header] = values[index] || '';
                });
                if (account.id && account.ps) {
                    accounts.push(account);
                }
            }
        }

        console.log(`📊 Parsed ${accounts.length} accounts from CSV`);
        return accounts;
    } catch (error) {
        console.error('❌ CSV parsing error:', error);
        return [];
    }
}

function accountsToCSV(accounts) {
    const headers = ['id', 'ps', 'email', 'name', 'image'];
    
    const escapeValue = (value) => {
        if (value === null || value === undefined) return '';
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
        return "1001";
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

// ==================== QR CODE LIBRARY ENDPOINT ====================
app.get('/qrcode.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        window.QRCode = {
            toCanvas: function(canvas, text, options, callback) {
                try {
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = options.color.light || '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = options.color.dark || '#000000';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('B.Y PRO QR', canvas.width/2, canvas.height/2);
                    if(callback) callback(null);
                } catch (error) {
                    if(callback) callback(error);
                }
            }
        };
    `);
});

// ==================== API ROUTES ====================

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const accounts = await getAllAccounts();
        
        res.json({
            status: 'operational',
            service: 'B.Y PRO Accounts System',
            timestamp: new Date().toISOString(),
            services: {
                google_drive: isDriveInitialized ? 'connected' : 'disconnected',
                database: 'active'
            },
            statistics: {
                total_accounts: accounts.length,
                system_status: 'running'
            }
        });
    } catch (error) {
        res.json({
            status: 'degraded',
            error: error.message,
            timestamp: new Date().toISOString(),
            services: {
                google_drive: 'disconnected',
                database: 'inactive'
            }
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
        console.error('❌ Dashboard accounts error:', error.message);
        res.status(500).json([]);
    }
});

// Create new account
app.post('/api/accounts', async (req, res) => {
    try {
        const { id, name, email, password, image } = req.body;
        
        if (!id || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: "All fields are required"
            });
        }

        const accountData = {
            id: id.toString(),
            ps: password,
            email: email,
            name: name,
            image: image || `${CONFIG.github.baseUrl}${id}.png`
        };

        const result = await createAccount(accountData);
        
        res.json({
            success: true,
            message: "Account created successfully",
            account: result.account
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
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
                error: "ID and password required"
            });
        }

        const result = await verifyAccountCredentials(id, password);
        res.json(result);
    } catch (error) {
        res.json({
            success: false,
            error: "Authentication service unavailable"
        });
    }
});

// Get next available ID
app.get('/api/next-id', async (req, res) => {
    try {
        const nextId = await getNextAvailableId();
        res.json({
            success: true,
            nextId: nextId
        });
    } catch (error) {
        res.json({
            success: true,
            nextId: "1001"
        });
    }
});

// Save accounts from dashboard
app.post('/api/accounts/save', async (req, res) => {
    try {
        const accountsData = req.body;
        
        if (!Array.isArray(accountsData)) {
            return res.status(400).json({
                success: false,
                error: "Invalid data format"
            });
        }

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
            message: "Accounts saved successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
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
                error: "ID and password required"
            });
        }

        const qrData = `BYPRO:${id}:${password}`;
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2
        });

        res.json({
            success: true,
            qrCode: qrCodeDataURL,
            qrData: qrData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "QR generation failed"
        });
    }
});

// Send verification email (simulated)
app.post('/api/send-verification-email', (req, res) => {
    const { email, code } = req.body;
    
    console.log(`📧 Verification code for ${email}: ${code}`);
    
    res.json({
        success: true,
        message: "Verification system ready",
        code: code,
        email: email
    });
});

// Upload image (simulated)
app.post('/api/upload-image', (req, res) => {
    const { accountId } = req.body;
    
    res.json({
        success: true,
        imageUrl: `${CONFIG.github.baseUrl}${accountId}.png`
    });
});

// Dashboard statistics
app.get('/api/admin/stats', async (req, res) => {
    try {
        const accounts = await getAllAccounts();
        
        res.json({
            success: true,
            statistics: {
                totalAccounts: accounts.length,
                accountsWithImages: accounts.filter(acc => acc.image && acc.image !== '').length,
                lastUpdated: new Date().toISOString()
            },
            system: {
                database: isDriveInitialized ? 'connected' : 'disconnected',
                status: 'operational'
            }
        });
    } catch (error) {
        res.json({
            success: false,
            error: "Unable to fetch statistics"
        });
    }
});

// ==================== ERROR HANDLING ====================
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found"
    });
});

// ==================== SERVER STARTUP ====================
async function startServer() {
    console.log('🎯 Initializing B.Y PRO Accounts System...');
    
    // Initialize Google Drive
    const driveSuccess = await initializeDriveService();
    
    if (!driveSuccess) {
        console.log('⚠️ Warning: Google Drive connection failed');
        console.log('💡 The system will start but account data cannot be saved/retrieved');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n🎉 ' + '='.repeat(50));
        console.log('🚀 B.Y PRO ACCOUNTS SYSTEM');
        console.log('✅ Server started successfully!');
        console.log(`🔗 Port: ${PORT}`);
        console.log('💾 Google Drive: ' + (isDriveInitialized ? '✅ CONNECTED' : '❌ DISCONNECTED'));
        console.log('📊 Dashboard: /admin');
        console.log('🔐 Auth System: Ready');
        console.log('🎉 ' + '='.repeat(50) + '\n');
    });
}

// Start the server
startServer();
