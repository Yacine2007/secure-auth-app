const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// 1. إعداد مجلد التحميلات
const uploadDir = path.join(__dirname, '../uploads');

// تأكد من وجود المجلد وإنشاؤه إذا لم يكن موجودًا
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. تهيئة التخزين
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${uuidv4()}${ext}`;
    cb(null, uniqueSuffix);
  }
});

// 3. تصفية أنواع الملفات
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('غير مسموح بنوع الملف هذا. يُسمح بالصور فقط (JPEG, PNG, GIF, WEBP)'), false);
  }
};

// 4. إعداد الحدود والتحقق
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB كحد أقصى
  files: 1 // ملف واحد فقط لكل طلب
};

// 5. تهيئة Multer
const upload = multer({
  storage,
  fileFilter,
  limits,
  onError: (err, next) => {
    console.error('خطأ في تحميل الملف:', err);
    next(err);
  }
});

// 6. دوال وسيطة مساعدة
const deleteFile = (filename) => {
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

// 7. تصدير الوظائف
module.exports = {
  singleUpload: upload.single('file'), // للرفع الفردي
  arrayUpload: upload.array('files', 3), // للرفع المتعدد (حد أقصى 3 ملفات)
  anyUpload: upload.any(), // لأي عدد من الملفات
  deleteFile, // دالة حذف الملف
  uploadDir // تصدير مسار المجلد للاستخدام الخارجي
};
