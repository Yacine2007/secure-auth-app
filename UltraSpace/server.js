const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// تخزين الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// ملف تخزين البيانات
const DATA_FILE = path.join(__dirname, 'data', 'chats.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// تأكد من وجود مجلد البيانات
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// تهيئة ملفات البيانات إذا لم تكن موجودة
function initializeDataFiles() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      messages: [],
      lastUpdate: new Date().toISOString()
    }, null, 2));
  }
  
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({
      users: [],
      lastUpdate: new Date().toISOString()
    }, null, 2));
  }
}

// قراءة البيانات من الملف
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { messages: [], lastUpdate: new Date().toISOString() };
  }
}

// حفظ البيانات في الملف
function saveData(data) {
  try {
    data.lastUpdate = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data file:', error);
    return false;
  }
}

// قراءة بيانات المستخدمين
function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return { users: [], lastUpdate: new Date().toISOString() };
  }
}

// حفظ بيانات المستخدمين
function saveUsers(data) {
  try {
    data.lastUpdate = new Date().toISOString();
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users file:', error);
    return false;
  }
}

// Routes

// الحصول على جميع الرسائل
app.get('/api/messages', (req, res) => {
  try {
    const data = readData();
    res.json({
      success: true,
      messages: data.messages,
      total: data.messages.length,
      lastUpdate: data.lastUpdate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// إرسال رسالة جديدة
app.post('/api/messages', (req, res) => {
  try {
    const { text, sender, type = 'text', reaction = null } = req.body;
    
    if (!text || !sender) {
      return res.status(400).json({
        success: false,
        error: 'Text and sender are required'
      });
    }

    const data = readData();
    const newMessage = {
      id: uuidv4(),
      text,
      sender,
      type,
      reaction,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };

    data.messages.push(newMessage);
    
    if (saveData(data)) {
      res.json({
        success: true,
        message: newMessage
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save message'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// تحديث رسالة (للتتفاعلات)
app.put('/api/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body;

    const data = readData();
    const messageIndex = data.messages.findIndex(msg => msg.id === id);

    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // تحديث التفاعل
    if (reaction !== undefined) {
      data.messages[messageIndex].reaction = reaction;
    }

    if (saveData(data)) {
      res.json({
        success: true,
        message: data.messages[messageIndex]
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update message'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update message'
    });
  }
});

// حذف رسالة
app.delete('/api/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const messageIndex = data.messages.findIndex(msg => msg.id === id);

    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    data.messages.splice(messageIndex, 1);

    if (saveData(data)) {
      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete message'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// رفع ملفات (صور وتسجيلات)
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      fileUrl: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'File upload failed'
    });
  }
});

// لوحة تحكم Yacine - الحصول على إحصائيات
app.get('/api/admin/stats', (req, res) => {
  try {
    const data = readData();
    const usersData = readUsers();
    
    const stats = {
      totalMessages: data.messages.length,
      totalUsers: usersData.users.length,
      messagesToday: data.messages.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        const today = new Date();
        return msgDate.toDateString() === today.toDateString();
      }).length,
      lastActivity: data.lastUpdate
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

// لوحة تحكم Yacine - الحصول على جميع المستخدمين
app.get('/api/admin/users', (req, res) => {
  try {
    const usersData = readUsers();
    res.json({
      success: true,
      users: usersData.users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// تسجيل مستخدم جديد
app.post('/api/users/register', (req, res) => {
  try {
    const { name, profilePic } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const usersData = readUsers();
    const newUser = {
      id: uuidv4(),
      name,
      profilePic: profilePic || '',
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    usersData.users.push(newUser);
    
    if (saveUsers(usersData)) {
      res.json({
        success: true,
        user: newUser
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to register user'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
});

// خدمة الملفات المرفوعة
app.use('/uploads', express.static('uploads'));

// Route للصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    message: 'UltraSpace Y Server is running!',
    version: '1.0.0',
    endpoints: {
      messages: {
        GET: '/api/messages',
        POST: '/api/messages',
        PUT: '/api/messages/:id',
        DELETE: '/api/messages/:id'
      },
      upload: {
        POST: '/api/upload'
      },
      admin: {
        stats: '/api/admin/stats',
        users: '/api/admin/users'
      },
      users: {
        register: '/api/users/register'
      }
    }
  });
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// بدء السيرفر
initializeDataFiles();

app.listen(PORT, () => {
  console.log(`UltraSpace Y Server is running on port ${PORT}`);
  console.log(`Access the API at: http://localhost:${PORT}`);
});
