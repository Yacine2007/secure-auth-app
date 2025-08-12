const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    profileImage: { type: String },
    qrCodeData: { type: String } // تخزين بيانات QR (مثل: ID:PWD)
});

// تشفير كلمة المرور قبل الحفظ
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
        this.qrCodeData = `ID:${this.userId}|PWD:${this.password}`;
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
