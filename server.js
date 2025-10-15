const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Unified Accounts System...');

// ==================== CONFIGURATION ====================
const CONFIG = {
    github: {
        baseUrl: 'https://raw.githubusercontent.com/Yacine2007/B.Y-PRO-Accounts-pic/main/',
        defaultImage: 'default.png'
    },
    security: {
        jwtSecret: process.env.JWT_SECRET || 'bypro-secret-key-2024'
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
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : `-----BEGIN PRIVATE KEY-----
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

// Development mode fallback
let developmentAccounts = [];
const BACKUP_FILE = 'accounts_backup.json';

// ==================== CORE FUNCTIONS ====================

/**
 * Initialize Google Drive Service
 */
async function initializeDriveService() {
    try {
        console.log('🔄 Initializing Google Drive service...');
        
        // Validate private key format
        if (!serviceAccount.private_key || !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
            throw new Error('Invalid private key format');
        }
        
        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: SCOPES,
        });
        
        driveService = google.drive({ version: 'v3', auth });
        
        // Test connection with timeout
        console.log('🔗 Testing Google Drive connection...');
        await driveService.files.get({
            fileId: DRIVE_FILE_ID,
            fields: 'id,name'
        });
        
        isDriveInitialized = true;
        console.log('✅ Google Drive service initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Google Drive service initialization failed:', error.message);
        isDriveInitialized = false;
        
        // Load development accounts from backup
        loadDevelopmentAccounts();
        
        return false;
    }
}

/**
 * Load development accounts from backup file
 */
function loadDevelopmentAccounts() {
    try {
        if (fs.existsSync(BACKUP_FILE)) {
            const data = fs.readFileSync(BACKUP_FILE, 'utf8');
            developmentAccounts = JSON.parse(data);
            console.log(`📂 Loaded ${developmentAccounts.length} accounts from backup`);
        } else {
            console.log('ℹ️ No backup file found, starting with empty accounts');
            developmentAccounts = [];
        }
    } catch (error) {
        console.error('❌ Error loading backup:', error.message);
        developmentAccounts = [];
    }
}

/**
 * Read CSV from Google Drive
 */
async function readCSVFromDrive() {
    if (!isDriveInitialized || !driveService) {
        throw new Error('Google Drive service is not available');
    }

    try {
        console.log('📖 Reading CSV from Google Drive...');
        const response = await driveService.files.get({
            fileId: DRIVE_FILE_ID,
            alt: 'media'
        });

        const data = response.data;
        console.log(`✅ Successfully read ${data.length} bytes from Google Drive`);
        return data;
    } catch (error) {
        console.error('❌ Error reading from Google Drive:', error.message);
        throw new Error(`Failed to read data: ${error.message}`);
    }
}

/**
 * Write CSV to Google Drive
 */
async function writeCSVToDrive(csvContent) {
    if (!isDriveInitialized || !driveService) {
        throw new Error('Google Drive service is not available');
    }

    try {
        console.log('💾 Writing to Google Drive...');
        const media = {
            mimeType: 'text/csv',
            body: csvContent
        };

        await driveService.files.update({
            fileId: DRIVE_FILE_ID,
            media: media,
            fields: 'id'
        });

        console.log(`✅ Successfully wrote ${csvContent.length} bytes to Google Drive`);
        return true;
    } catch (error) {
        console.error('❌ Error writing to Google Drive:', error.message);
        throw new Error(`Failed to write data: ${error.message}`);
    }
}

/**
 * Convert development accounts to CSV
 */
function developmentAccountsToCSV() {
    const headers = ['id', 'ps', 'email', 'name', 'image'];
    const csvContent = [
        headers.join(','),
        ...developmentAccounts.map(account => 
            headers.map(header => 
                account[header] ? `"${String(account[header]).replace(/"/g, '""')}"` : ''
            ).join(',')
        )
    ].join('\n');
    return csvContent;
}

/**
 * Save to development storage
 */
function saveToDevelopmentStorage(accounts) {
    try {
        developmentAccounts = accounts;
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(developmentAccounts, null, 2));
        console.log(`✅ Saved ${accounts.length} accounts to development storage`);
        return true;
    } catch (error) {
        console.error('❌ Error saving to development storage:', error.message);
        return false;
    }
}

/**
 * Get next available ID
 */
async function getNextAvailableId() {
    try {
        let accounts = [];
        
        if (isDriveInitialized) {
            try {
                const csvData = await readCSVFromDrive();
                accounts = parseCSVToAccounts(csvData);
            } catch (error) {
                console.log('🔄 Falling back to development storage for ID generation');
                accounts = developmentAccounts;
            }
        } else {
            accounts = developmentAccounts;
        }
        
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
        const nextId = (maxId + 1).toString();
        console.log(`🔢 Generated next ID: ${nextId}`);
        return nextId;
    } catch (error) {
        console.error('❌ Error getting next ID:', error.message);
        // Fallback ID based on timestamp
        return Math.floor(1000 + Math.random() * 9000).toString();
    }
}

/**
 * Add new account
 */
async function addNewAccount(accountData) {
    try {
        console.log(`💾 Adding new account: ${accountData.id} - ${accountData.name}`);
        
        let accounts = [];
        let storageType = '';
        
        if (isDriveInitialized) {
            try {
                const csvData = await readCSVFromDrive();
                accounts = parseCSVToAccounts(csvData);
                storageType = 'drive';
            } catch (error) {
                console.log('🔄 Falling back to development storage');
                accounts = [...developmentAccounts];
                storageType = 'local';
            }
        } else {
            accounts = [...developmentAccounts];
            storageType = 'local';
        }
        
        // Check for duplicate email
        const existingEmail = accounts.find(acc => acc.email === accountData.email);
        if (existingEmail) {
            throw new Error("An account with this email already exists");
        }
        
        // Check for duplicate ID
        const existingId = accounts.find(acc => acc.id === accountData.id);
        if (existingId) {
            accountData.id = await getNextAvailableId();
            console.log(`🆕 ID conflict resolved, new ID: ${accountData.id}`);
        }
        
        accounts.push(accountData);
        
        let saved = false;
        if (storageType === 'drive') {
            saved = await saveAllAccounts(accounts);
        } else {
            saved = saveToDevelopmentStorage(accounts);
        }
        
        if (saved) {
            console.log(`✅ Account ${accountData.id} saved successfully to ${storageType}`);
            return { success: true, storage: storageType };
        } else {
            throw new Error(`Failed to save account to ${storageType}`);
        }
    } catch (error) {
        console.error('❌ Error adding new account:', error.message);
        throw error;
    }
}

/**
 * Save account with fallback
 */
async function saveAccountWithFallback(accountData) {
    try {
        const result = await addNewAccount(accountData);
        return {
            success: true,
            account: accountData,
            storage: result.storage
        };
    } catch (error) {
        console.error('❌ Save account failed:', error.message);
        
        // Ultimate fallback - save to memory only
        developmentAccounts.push(accountData);
        console.log('🆘 Account saved to memory fallback');
        
        return {
            success: true,
            account: accountData,
            storage: 'memory_fallback'
        };
    }
}

/**
 * Parse CSV to accounts
 */
function parseCSVToAccounts(csvData) {
    try {
        if (!csvData || typeof csvData !== 'string' || csvData.trim() === '') {
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

            // Simple CSV parsing - split by comma and remove quotes
            const values = line.split(',').map(value => {
                let cleanValue = value.trim();
                // Remove surrounding quotes if present
                if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
                    cleanValue = cleanValue.slice(1, -1);
                }
                return cleanValue.replace(/""/g, '"');
            });

            if (values.length >= headers.length) {
                const account = {};
                headers.forEach((header, index) => {
                    account[header] = values[index] || '';
                });
                
                // Only add accounts with required fields
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

/**
 * Save all accounts
 */
async function saveAllAccounts(accounts) {
    try {
        const headers = ['id', 'ps', 'email', 'name', 'image'];
        const csvContent = [
            headers.join(','),
            ...accounts.map(account => 
                headers.map(header => {
                    const value = account[header] || '';
                    // Escape quotes and wrap in quotes if contains comma or quotes
                    const escapedValue = String(value).replace(/"/g, '""');
                    return value.includes(',') || value.includes('"') ? `"${escapedValue}"` : escapedValue;
                }).join(',')
            )
        ].join('\n');

        await writeCSVToDrive(csvContent);
        return true;
    } catch (error) {
        console.error('❌ Error saving accounts to drive:', error.message);
        
        // Fallback to local storage
        console.log('🔄 Falling back to local storage');
        return saveToDevelopmentStorage(accounts);
    }
}

/**
 * Verify account credentials
 */
async function verifyAccountCredentials(id, password) {
    try {
        let accounts = [];
        
        if (isDriveInitialized) {
            try {
                const csvData = await readCSVFromDrive();
                accounts = parseCSVToAccounts(csvData);
            } catch (error) {
                console.log('🔄 Using development storage for verification');
                accounts = developmentAccounts;
            }
        } else {
            accounts = developmentAccounts;
        }
        
        const account = accounts.find(acc => {
            const idMatch = acc.id && acc.id.toString() === id.toString();
            const passwordMatch = acc.ps && acc.ps === password;
            return idMatch && passwordMatch;
        });
        
        if (account) {
            return {
                success: true,
                account: {
                    id: account.id,
                    name: account.name || `User ${account.id}`,
                    email: account.email || `${account.id}@bypro.com`,
                    image: account.image || `${CONFIG.github.baseUrl}${account.id}.png`
                },
                storage: isDriveInitialized ? 'drive' : 'local'
            };
        } else {
            return {
                success: false,
                error: "Invalid account ID or password"
            };
        }
    } catch (error) {
        console.error('❌ Error verifying account:', error.message);
        return {
            success: false,
            error: "Authentication service temporarily unavailable"
        };
    }
}

/**
 * Keep alive function
 */
function keepAlive() {
    setInterval(() => {
        const memoryUsage = process.memoryUsage();
        const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        console.log('🔄 Keep-alive ping |', {
            drive: isDriveInitialized ? '✅' : '❌',
            memory: `${heapUsed}MB`,
            accounts: developmentAccounts.length,
            uptime: `${Math.round(process.uptime() / 60)}min`
        });
    }, 300000); // 5 minutes
}

/**
 * Auto health check
 */
function autoHealthCheck() {
    setInterval(async () => {
        try {
            if (!isDriveInitialized) {
                console.log('🔄 Auto-reconnect: Attempting to connect to Google Drive...');
                await initializeDriveService();
            }
        } catch (error) {
            console.log('⚠️ Auto-reconnect failed:', error.message);
        }
    }, 600000); // 10 minutes
}

/**
 * Get all accounts (unified function)
 */
async function getAllAccounts() {
    try {
        let accounts = [];
        
        if (isDriveInitialized) {
            try {
                const csvData = await readCSVFromDrive();
                accounts = parseCSVToAccounts(csvData);
                console.log(`📊 Loaded ${accounts.length} accounts from Google Drive`);
            } catch (error) {
                console.log('🔄 Using development storage due to drive error');
                accounts = developmentAccounts;
            }
        } else {
            accounts = developmentAccounts;
            console.log(`📊 Loaded ${accounts.length} accounts from development storage`);
        }
        
        return accounts;
    } catch (error) {
        console.error('❌ Failed to get all accounts:', error.message);
        return developmentAccounts; // Always return at least development accounts
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

// ==================== QR CODE LIBRARY ====================
app.get('/qrcode.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
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
                        
                        const moduleSize = 8;
                        const cols = Math.floor(width / moduleSize);
                        const rows = Math.floor(height / moduleSize);
                        
                        // Generate pattern based on text hash
                        let hash = 0;
                        for (let i = 0; i < text.length; i++) {
                            hash = text.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        
                        for (let row = 0; row < rows; row++) {
                            for (let col = 0; col < cols; col++) {
                                if ((row * col + hash) % 3 === 0) {
                                    ctx.fillRect(
                                        col * moduleSize, 
                                        row * moduleSize, 
                                        moduleSize - 1, 
                                        moduleSize - 1
                                    );
                                }
                            }
                        }
                        
                        // Add branding
                        ctx.fillStyle = '#000000';
                        ctx.font = 'bold 16px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('B.Y PRO', width / 2, height - 20);
                        
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
        const accounts = await getAllAccounts();
        
        res.json({
            status: 'operational',
            service: 'B.Y PRO Accounts System',
            timestamp: new Date().toISOString(),
            services: {
                google_drive: isDriveInitialized ? 'connected' : 'disconnected',
                storage_mode: isDriveInitialized ? 'drive' : 'local',
                status: 'healthy'
            },
            statistics: {
                total_accounts: accounts.length,
                accounts_with_images: accounts.filter(acc => acc.image && acc.image !== '').length,
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
                storage_mode: 'local',
                status: 'limited'
            },
            statistics: {
                total_accounts: developmentAccounts.length,
                system_status: 'fallback_mode'
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
        // Always return at least an empty array
        res.json(developmentAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            password: acc.ps,
            email: acc.email,
            image: acc.image || `${CONFIG.github.baseUrl}${acc.id}.png`
        })));
    }
});

// Create new account
app.post('/api/accounts', async (req, res) => {
    try {
        const { id, name, email, password, image } = req.body;
        
        console.log(`👤 Creating new account: ${id} - ${name}`);
        
        if (!id || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: "All fields (ID, name, email, password) are required"
            });
        }

        const accountData = {
            id: id.toString(),
            ps: password,
            email: email,
            name: name,
            image: image || `${CONFIG.github.baseUrl}${id}.png`
        };

        const result = await saveAccountWithFallback(accountData);
        
        res.json({
            success: true,
            message: "Account created successfully",
            account: result.account,
            storage: result.storage,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Account creation error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create account"
        });
    }
});

// Verify account for login
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
            error: "Authentication service temporarily unavailable" 
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
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Next ID error:', error.message);
        res.json({
            success: true,
            nextId: "1001",
            message: "Using fallback ID"
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
                error: "Invalid data format: expected array"
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

        let saved = false;
        let storageType = '';
        
        if (isDriveInitialized) {
            try {
                saved = await saveAllAccounts(formattedAccounts);
                storageType = 'drive';
            } catch (error) {
                console.log('🔄 Falling back to local storage for bulk save');
                saved = saveToDevelopmentStorage(formattedAccounts);
                storageType = 'local';
            }
        } else {
            saved = saveToDevelopmentStorage(formattedAccounts);
            storageType = 'local';
        }

        if (saved) {
            res.json({
                success: true,
                message: `${accountsData.length} accounts saved successfully`,
                storage: storageType,
                count: accountsData.length
            });
        } else {
            throw new Error("Failed to save accounts");
        }
    } catch (error) {
        console.error('❌ Bulk save error:', error.message);
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
                error: "Account ID and password are required"
            });
        }

        const qrData = `BYPRO:${id}:${password}:${Date.now()}`;
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        res.json({
            success: true,
            qrCode: qrCodeDataURL,
            qrData: qrData
        });
    } catch (error) {
        console.error('❌ QR generation error:', error.message);
        res.status(500).json({
            success: false,
            error: "QR code generation failed"
        });
    }
});

// Send verification email
app.post('/api/send-verification-email', (req, res) => {
    try {
        const { email, code } = req.body;
        
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                error: "Email and verification code are required"
            });
        }

        console.log(`📧 Verification code for ${email}: ${code}`);
        
        res.json({
            success: true,
            message: "Verification system ready",
            code: code,
            email: email,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Email service unavailable"
        });
    }
});

// Upload image
app.post('/api/upload-image', (req, res) => {
    try {
        const { accountId } = req.body;
        
        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: "Account ID is required"
            });
        }

        const imageUrl = `${CONFIG.github.baseUrl}${accountId}.png`;
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            message: "Image URL generated successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Image service unavailable"
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
                database: isDriveInitialized ? 'connected' : 'local',
                storage_mode: isDriveInitialized ? 'google_drive' : 'local_development',
                status: 'operational'
            }
        });
    } catch (error) {
        console.error('❌ Stats error:', error.message);
        res.json({
            success: true,
            statistics: {
                totalAccounts: developmentAccounts.length,
                accountsWithImages: developmentAccounts.filter(acc => acc.image && acc.image !== '').length,
                lastUpdated: new Date().toISOString()
            },
            system: {
                database: 'local',
                status: 'fallback_mode'
            }
        });
    }
});

// Debug endpoint
app.get('/api/debug/system', (req, res) => {
    res.json({
        drive_initialized: isDriveInitialized,
        development_accounts_count: developmentAccounts.length,
        storage_mode: isDriveInitialized ? 'drive' : 'local',
        timestamp: new Date().toISOString()
    });
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
        error: "An unexpected error occurred",
        reference: `ERR_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString()
    });
});

// ==================== SERVER STARTUP ====================
async function startServer() {
    console.log('🎯 Initializing B.Y PRO Accounts System...');
    
    // Initialize services
    await initializeDriveService();
    
    // Start maintenance services
    keepAlive();
    autoHealthCheck();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n🎉 ' + '='.repeat(60));
        console.log('🚀 B.Y PRO UNIFIED ACCOUNTS SYSTEM');
        console.log('✅ Server started successfully!');
        console.log(`🔗 Port: ${PORT}`);
        console.log('💾 Storage: ' + (isDriveInitialized ? 'Google Drive ✅' : 'Local Development ✅'));
        console.log(`📊 Accounts: ${developmentAccounts.length} loaded`);
        console.log('🌐 Environment: Production');
        console.log('🛡️  Fallback System: Active');
        console.log('🎉 ' + '='.repeat(60) + '\n');
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();
