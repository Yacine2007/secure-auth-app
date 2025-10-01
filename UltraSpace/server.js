const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ملف تخزين البيانات
const DATA_FILE = path.join(__dirname, 'data', 'chats.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// تأكد من وجود مجلد البيانات
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// تهيئة ملفات البيانات
function initializeDataFiles() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      messages: [
        {
          id: "welcome-message",
          text: "Welcome to UltraSpace Y! I'm Yacine, how can I help you today?",
          sender: "yacine",
          type: "text",
          reaction: null,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date().toISOString(),
          read: false
        }
      ],
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

// قراءة البيانات
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { messages: [], lastUpdate: new Date().toISOString() };
  }
}

// حفظ البيانات
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

// نظام التحديث التلقائي
let lastUpdateTimestamp = Date.now();
const updateListeners = new Set();

// إشعار جميع المستمعين بالتحديث
function notifyUpdate() {
  lastUpdateTimestamp = Date.now();
  updateListeners.forEach(listener => {
    try {
      listener.res.write(`data: ${JSON.stringify({ type: 'update', timestamp: lastUpdateTimestamp })}\n\n`);
    } catch (error) {
      updateListeners.delete(listener);
    }
  });
}

// Routes

// Server-Sent Events للتحديثات المباشرة
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const listener = { res };
  updateListeners.add(listener);

  req.on('close', () => {
    updateListeners.delete(listener);
  });

  // إرسال رسالة ترحيبية
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
});

// الحصول على جميع الرسائل
app.get('/api/messages', (req, res) => {
  try {
    const data = readData();
    res.json({
      success: true,
      messages: data.messages,
      total: data.messages.length,
      lastUpdate: data.lastUpdate,
      serverTime: new Date().toISOString()
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
      timestamp: new Date().toISOString(),
      read: false
    };

    data.messages.push(newMessage);
    
    if (saveData(data)) {
      // إشعار جميع العملاء بالتحديث
      notifyUpdate();
      
      res.json({
        success: true,
        message: newMessage,
        serverTime: new Date().toISOString()
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
    const { reaction, read } = req.body;

    const data = readData();
    const messageIndex = data.messages.findIndex(msg => msg.id === id);

    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    let updated = false;

    if (reaction !== undefined) {
      data.messages[messageIndex].reaction = reaction;
      updated = true;
    }

    if (read !== undefined) {
      data.messages[messageIndex].read = read;
      updated = true;
    }

    if (updated && saveData(data)) {
      notifyUpdate();
      res.json({
        success: true,
        message: data.messages[messageIndex],
        serverTime: new Date().toISOString()
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
      notifyUpdate();
      res.json({
        success: true,
        message: 'Message deleted successfully',
        serverTime: new Date().toISOString()
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

// التحقق من التحديثات
app.get('/api/updates', (req, res) => {
  const data = readData();
  const clientTimestamp = req.query.timestamp;
  
  if (clientTimestamp && parseInt(clientTimestamp) >= lastUpdateTimestamp) {
    res.json({
      hasUpdates: false,
      timestamp: lastUpdateTimestamp
    });
  } else {
    res.json({
      hasUpdates: true,
      timestamp: lastUpdateTimestamp,
      messageCount: data.messages.length
    });
  }
});

// الحصول على آخر تحديث
app.get('/api/last-update', (req, res) => {
  res.json({
    timestamp: lastUpdateTimestamp,
    serverTime: new Date().toISOString()
  });
});

// إحصائيات المدير
app.get('/api/admin/stats', (req, res) => {
  try {
    const data = readData();
    const usersData = readUsers();
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats = {
      totalMessages: data.messages.length,
      totalUsers: usersData.users.length,
      messagesToday: data.messages.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        return msgDate >= todayStart;
      }).length,
      activeConnections: updateListeners.size,
      lastActivity: data.lastUpdate,
      serverUptime: process.uptime(),
      serverTime: now.toISOString()
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

// الحصول على جميع المستخدمين
app.get('/api/admin/users', (req, res) => {
  try {
    const usersData = readUsers();
    
    // تحديث آخر ظهور للمستخدمين النشطين
    const data = readData();
    const activeUsers = new Set(data.messages
      .filter(msg => msg.sender === 'user')
      .map(msg => {
        const userMsg = msg.text.toLowerCase();
        const user = usersData.users.find(u => userMsg.includes(u.name.toLowerCase()));
        return user ? user.id : null;
      })
      .filter(id => id !== null)
    );

    const usersWithActivity = usersData.users.map(user => ({
      ...user,
      isActive: activeUsers.has(user.id),
      lastActivity: user.lastSeen
    }));

    res.json({
      success: true,
      users: usersWithActivity
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
    
    // التحقق من عدم وجود مستخدم بنفس الاسم
    const existingUser = usersData.users.find(user => 
      user.name.toLowerCase() === name.toLowerCase()
    );

    if (existingUser) {
      return res.json({
        success: true,
        user: existingUser,
        message: 'User already exists'
      });
    }

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

// تحديث حالة المستخدم
app.put('/api/users/:id/activity', (req, res) => {
  try {
    const { id } = req.params;
    const usersData = readUsers();
    const userIndex = usersData.users.findIndex(user => user.id === id);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    usersData.users[userIndex].lastSeen = new Date().toISOString();

    if (saveUsers(usersData)) {
      res.json({
        success: true,
        user: usersData.users[userIndex]
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update user activity'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user activity'
    });
  }
});

// تنظيف الاتصالات القديمة
setInterval(() => {
  const now = Date.now();
  updateListeners.forEach(listener => {
    // تنظيف تلقائي للاتصالات الميتة
    if (listener.lastPing && now - listener.lastPing > 30000) {
      updateListeners.delete(listener);
    }
  });
}, 10000);

// Route للصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    message: '🚀 UltraSpace Y Server is running!',
    version: '3.0.0',
    status: 'active',
    features: [
      'real-time-messaging',
      'auto-updates',
      'reactions',
      'admin-dashboard',
      'file-sharing',
      'user-management'
    ],
    endpoints: {
      messages: {
        GET: '/api/messages',
        POST: '/api/messages',
        PUT: '/api/messages/:id',
        DELETE: '/api/messages/:id'
      },
      realtime: {
        events: '/api/events',
        updates: '/api/updates',
        lastUpdate: '/api/last-update'
      },
      admin: {
        stats: '/api/admin/stats',
        users: '/api/admin/users'
      },
      users: {
        register: '/api/users/register',
        activity: '/api/users/:id/activity'
      }
    },
    serverInfo: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      activeConnections: updateListeners.size
    }
  });
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// Route للصفحات غير الموجودة
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: {
      home: '/',
      messages: '/api/messages',
      events: '/api/events',
      admin: '/api/admin/stats'
    }
  });
});

// بدء السيرفر
initializeDataFiles();

// إشعار بدء التشغيل
console.log('🚀 Starting UltraSpace Y Server...');
console.log('📁 Initializing data files...');

app.listen(PORT, () => {
  console.log('✨ UltraSpace Y Server initialized successfully!');
  console.log(`🌐 Server is running on port ${PORT}`);
  console.log(`📱 API available at: http://localhost:${PORT}`);
  console.log(`🔄 Real-time events: http://localhost:${PORT}/api/events`);
  console.log('📊 Features enabled:');
  console.log('   ✅ Real-time messaging');
  console.log('   ✅ Auto-updates');
  console.log('   ✅ Message reactions');
  console.log('   ✅ Admin dashboard');
  console.log('   ✅ User management');
  console.log('   ✅ File sharing support');
  console.log('');
  console.log('💡 Server is ready to handle requests!');
});

// معالجة إغلاق السيرفر بشكل أنيق
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  updateListeners.clear();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  updateListeners.clear();
  process.exit(0);
});
