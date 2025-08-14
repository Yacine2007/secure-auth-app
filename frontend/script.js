// Application State
const BACKEND_URL = 'https://secure-auth-app-5w01.onrender.com';
let currentUser = null;
let tempUserData = {};
let resendTimer = null;
let signupResendTimer = null;
let generatedQRCode = null;
let qrFile = null;

// Helper Functions
function showLoading(message = 'Processing...') {
    const loadingElement = document.getElementById('loading');
    loadingElement.querySelector('p').textContent = message;
    loadingElement.style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message, elementId = null) {
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    } else {
        alert(`Error: ${message}`);
    }
}

function showSuccess(message, elementId = null) {
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    } else {
        alert(`Success: ${message}`);
    }
}

function resetFormSteps() {
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
}

function goToStep(stepNumber) {
    resetFormSteps();
    const stepElement = document.getElementById(`step${stepNumber}`);
    if (stepElement) {
        stepElement.classList.add('active');
    } else {
        console.error(`Step ${stepNumber} element not found`);
    }
}

// Initialize Countdown Timer
function startCountdown(elementId, seconds, callback) {
    const countdownElement = document.getElementById(elementId);
    const textElement = countdownElement.previousElementSibling;
    
    textElement.style.display = 'none';
    countdownElement.style.display = 'inline';
    countdownElement.textContent = seconds;
    
    let remaining = seconds;
    const timer = setInterval(() => {
        remaining--;
        countdownElement.textContent = remaining;
        
        if (remaining <= 0) {
            clearInterval(timer);
            countdownElement.style.display = 'none';
            textElement.style.display = 'inline';
            if (callback) callback();
        }
    }, 1000);
    
    return timer;
}

// Toggle Password Visibility
const togglePassword = (inputId, toggleId) => {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.querySelector(`#${toggleId} i`);
    
    if (!passwordInput || !toggleIcon) return;
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = "password";
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
};

// Navigation
document.getElementById('no-qr-btn').addEventListener('click', () => goToStep(2));
document.getElementById('back-to-step1').addEventListener('click', () => goToStep(1));
document.getElementById('back-to-step2').addEventListener('click', () => goToStep(2));
document.getElementById('back-to-step3').addEventListener('click', () => goToStep(3));
document.getElementById('back-to-step4').addEventListener('click', () => goToStep(4));
document.getElementById('back-to-step6').addEventListener('click', () => goToStep(6));
document.getElementById('back-to-step1-from-signup').addEventListener('click', () => goToStep(1));
document.getElementById('back-to-login').addEventListener('click', () => goToStep(1));

// Password Toggles
document.getElementById('toggle-password').addEventListener('click', () => togglePassword('password', 'toggle-password'));
document.getElementById('toggle-new-password').addEventListener('click', () => togglePassword('new-password', 'toggle-new-password'));
document.getElementById('toggle-confirm-password').addEventListener('click', () => togglePassword('confirm-password', 'toggle-confirm-password'));
document.getElementById('toggle-signup-password').addEventListener('click', () => togglePassword('signup-password', 'toggle-signup-password'));
document.getElementById('toggle-signup-confirm').addEventListener('click', () => togglePassword('signup-confirm-password', 'toggle-signup-confirm'));

// Code Input Navigation
const codeInputs = document.querySelectorAll('.code-input');
codeInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        if (input.value && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
            codeInputs[index - 1].focus();
        }
    });
});

// Forgot Password Flow
document.getElementById('forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    goToStep(3);
});

document.getElementById('create-account').addEventListener('click', (e) => {
    e.preventDefault();
    goToStep(6);
});

// Send Verification Code (Forgot Password)
document.getElementById('send-code-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showError('Please enter your email');
        return;
    }

    try {
        showLoading('Sending verification code...');
        const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        console.log('Forgot Password Response:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to send code');
        }
        
        hideLoading();
        showSuccess('Verification code sent to your email', 'forgot-password-message');
        goToStep(4);
        
        clearInterval(resendTimer);
        resendTimer = startCountdown('countdown', 30, () => {
            document.getElementById('resend-code').classList.remove('disabled');
        });
        document.getElementById('resend-code').classList.add('disabled');
    } catch (err) {
        hideLoading();
        showError(err.message || 'Failed to send verification code');
    }
});

// Resend Verification Code (Forgot Password)
document.getElementById('resend-code').addEventListener('click', async function() {
    if (this.classList.contains('disabled')) return;
    
    const email = document.getElementById('email').value.trim();
    
    try {
        showLoading('Resending code...');
        const response = await fetch(`${BACKEND_URL}/api/auth/resend-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to resend code');
        }
        
        hideLoading();
        showSuccess('New verification code sent');
        
        clearInterval(resendTimer);
        resendTimer = startCountdown('countdown', 30, () => {
            document.getElementById('resend-code').classList.remove('disabled');
        });
        document.getElementById('resend-code').classList.add('disabled');
    } catch (err) {
        hideLoading();
        showError(err.message || 'Failed to resend code');
    }
});

// Verify Code (Forgot Password)
document.getElementById('verify-code-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const code = Array.from(document.querySelectorAll('.code-input'))
                    .map(input => input.value)
                    .join('');
    
    if (code.length !== 6) {
        showError('Please enter the 6-digit verification code');
        return;
    }

    try {
        showLoading('Verifying code...');
        const response = await fetch(`${BACKEND_URL}/api/auth/verify-reset-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Invalid verification code');
        }
        
        hideLoading();
        goToStep(5);
    } catch (err) {
        hideLoading();
        showError(err.message || 'Verification failed');
    }
});

// Reset Password
document.getElementById('reset-password-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    if (newPassword.length < 8) {
        showError('Password must be at least 8 characters');
        return;
    }

    try {
        showLoading('Resetting password...');
        const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, newPassword })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password');
        }
        
        hideLoading();
        showSuccess('Password reset successfully');
        goToStep(2);
    } catch (err) {
        hideLoading();
        showError(err.message || 'Failed to reset password');
    }
});

// Signup
document.getElementById('signup-btn').addEventListener('click', async () => {
    const fullName = document.getElementById('full-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const profileImage = document.getElementById('profile-image').files[0];
    
    if (!fullName || !email || !password || !confirmPassword) {
        showError('Please fill all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    if (password.length < 8) {
        showError('Password must be at least 8 characters');
        return;
    }

    try {
        showLoading('Creating account...');
        
        const formData = new FormData();
        formData.append('name', fullName);
        formData.append('email', email);
        formData.append('password', password);
        if (profileImage) formData.append('profileImage', profileImage);
        
        const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Signup Response:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Signup failed');
        }
        
        tempUserData = {
            email,
            userId: data.userId,
            name: fullName
        };
        
        hideLoading();
        showSuccess('Account created! Verification code sent to your email');
        goToStep(7);
        
        clearInterval(signupResendTimer);
        signupResendTimer = startCountdown('signup-countdown', 30, () => {
            document.getElementById('signup-resend-code').classList.remove('disabled');
        });
        document.getElementById('signup-resend-code').classList.add('disabled');
    } catch (err) {
        hideLoading();
        showError(err.message || 'Signup failed');
    }
});

// Signup Resend Verification Code
document.getElementById('signup-resend-code').addEventListener('click', async function() {
    if (this.classList.contains('disabled')) return;
    
    try {
        showLoading('Resending code...');
        const response = await fetch(`${BACKEND_URL}/api/auth/resend-verification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: tempUserData.email })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to resend code');
        }
        
        hideLoading();
        showSuccess('New verification code sent');
        
        clearInterval(signupResendTimer);
        signupResendTimer = startCountdown('signup-countdown', 30, () => {
            document.getElementById('signup-resend-code').classList.remove('disabled');
        });
        document.getElementById('signup-resend-code').classList.add('disabled');
    } catch (err) {
        hideLoading();
        showError(err.message || 'Failed to resend code');
    }
});

// Signup Verify Code
document.getElementById('signup-verify-code-btn').addEventListener('click', async () => {
    const code = Array.from(document.querySelectorAll('.code-input'))
                    .map(input => input.value)
                    .join('');
    
    if (code.length !== 6) {
        showError('Please enter the 6-digit verification code');
        return;
    }

    try {
        showLoading('Verifying code...');
        const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: tempUserData.email,
                code: code
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Invalid verification code');
        }
        
        hideLoading();
        generateQRCode(data.user);
        goToStep(8);
    } catch (err) {
        hideLoading();
        showError(err.message || 'Verification failed');
    }
});

// Login
document.getElementById('login-btn').addEventListener('click', async () => {
    const userId = document.getElementById('user-id').value.trim();
    const password = document.getElementById('password').value;

    if (!userId || !password) {
        showError('Please fill all fields');
        return;
    }

    try {
        showLoading('Logging in...');
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        hideLoading();
        loginUser(data.user);
    } catch (err) {
        hideLoading();
        document.getElementById('password-error').style.display = 'block';
    }
});

// Function to log in user
function loginUser(user) {
    currentUser = {
        userId: user.userId,
        name: user.name,
        email: user.email,
        lastLogin: new Date().toLocaleString()
    };
    
    document.getElementById('dashboard-name').textContent = `Welcome, ${currentUser.name}`;
    document.getElementById('last-login').textContent = currentUser.lastLogin;
    
    const dashboardAvatar = document.getElementById('dashboard-avatar');
    if (user.profileImage) {
        dashboardAvatar.src = `${BACKEND_URL}/uploads/${user.profileImage}`;
    }
    
    goToStep(9);
}

// Download QR Code
document.getElementById('download-qr-btn').addEventListener('click', function() {
    if (generatedQRCode) {
        const canvas = document.querySelector('#qr-code canvas');
        
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'account-qr-code.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } else {
            showError('QR code not generated yet');
        }
    } else {
        showError('QR code not generated yet');
    }
});

// Profile Image Preview
document.getElementById('profile-image').addEventListener('change', function(e) {
    const preview = document.getElementById('profile-preview');
    const icon = preview.previousElementSibling;
    
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            icon.style.display = 'none';
        }
        
        reader.readAsDataURL(this.files[0]);
    }
});

// QR Code Validation
document.getElementById('qr-scanner').addEventListener('click', () => {
    document.getElementById('qr-file-input').click();
});

document.getElementById('qr-file-input').addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        qrFile = file;
        
        if (!file.type.match('image.*')) {
            showQRValidationResult('Please select an image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const preview = document.getElementById('preview-image');
            preview.src = e.target.result;
            
            document.getElementById('qr-preview').style.display = 'block';
            document.getElementById('qr-scanner').style.display = 'none';
            
            validateQRCode(file);
        }
        
        reader.readAsDataURL(file);
    }
});

function validateQRCode(file) {
    showLoading('Validating QR code...');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                try {
                    const qrData = JSON.parse(code.data);
                    
                    fetch(`${BACKEND_URL}/api/auth/login-qr`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: qrData.userId,
                            email: qrData.email
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        hideLoading();
                        if (data.success) {
                            showQRValidationResult('Login successful!', 'success');
                            
                            if (data.token) {
                                localStorage.setItem('token', data.token);
                            }
                            
                            setTimeout(() => {
                                loginUser(data.user);
                            }, 1500);
                        } else {
                            showQRValidationResult(data.message || 'Login failed', 'error');
                            setTimeout(resetQRValidation, 3000);
                        }
                    })
                    .catch(error => {
                        hideLoading();
                        showQRValidationResult('Failed to login with QR code', 'error');
                        setTimeout(resetQRValidation, 3000);
                    });
                } catch (err) {
                    hideLoading();
                    showQRValidationResult('Invalid QR code format', 'error');
                    setTimeout(resetQRValidation, 3000);
                }
            } else {
                hideLoading();
                showQRValidationResult('No QR code found in image', 'error');
                setTimeout(resetQRValidation, 3000);
            }
        };
    };
    
    reader.readAsDataURL(file);
}

function resetQRValidation() {
    document.getElementById('qr-file-input').value = '';
    qrFile = null;
    document.getElementById('qr-preview').style.display = 'none';
    document.getElementById('qr-scanner').style.display = 'flex';
    document.getElementById('qr-validation-result').style.display = 'none';
}

function showQRValidationResult(message, type) {
    const resultElement = document.getElementById('qr-validation-result');
    resultElement.textContent = message;
    resultElement.className = 'qr-validation-result';
    
    if (type === 'success') {
        resultElement.classList.add('qr-success');
    } else {
        resultElement.classList.add('qr-error');
    }
    
    resultElement.style.display = 'block';
}

// Logout
document.getElementById('logout-btn').addEventListener('click', function() {
    currentUser = null;
    localStorage.removeItem('token');
    showSuccess('You have been logged out');
    goToStep(1);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    resetQRValidation();
    
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 1000);
    
    const token = localStorage.getItem('token');
    if (token) {
        fetch(`${BACKEND_URL}/api/auth/verify-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loginUser(data.user);
            }
        });
    }
});

// Generate QR Code
function generateQRCode(userData) {
    const qrCodeElement = document.getElementById('qr-code');
    qrCodeElement.innerHTML = "";
    
    generatedQRCode = new QRCode(qrCodeElement, {
        text: JSON.stringify({
            userId: userData.userId,
            email: userData.email,
            token: userData.token
        }),
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    document.getElementById('user-id-display').textContent = `ID: ${userData.userId}`;
}
