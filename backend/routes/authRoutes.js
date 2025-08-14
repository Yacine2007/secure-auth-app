const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../config/multerConfig');

router.post('/signup', upload.single('profileImage'), authController.signup);

module.exports = router;
