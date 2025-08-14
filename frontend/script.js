// عرض واجهات مختلفة
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const verificationForm = document.getElementById('verificationForm');
const forgotForm = document.getElementById('forgotForm');

document.getElementById('showSignup').addEventListener('click', () => {
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
});

document.getElementById('showForgot').addEventListener('click', () => {
  loginForm.style.display = 'none';
  forgotForm.style.display = 'block';
});

document.getElementById('showLogin1').addEventListener('click', () => {
  signupForm.style.display = 'none';
  loginForm.style.display = 'block';
});

document.getElementById('showLogin2').addEventListener('click', () => {
  forgotForm.style.display = 'none';
  loginForm.style.display = 'block';
});

// تسجيل حساب جديد
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(signupForm);

  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password')
    })
  });

  const data = await response.json();

  if (data.success) {
    signupForm.style.display = 'none';
    verificationForm.style.display = 'block';
    document.getElementById('userIdInput').value = data.userId;
  } else {
    alert(data.error || 'Signup failed');
  }
});

// تحقق من الرمز
verificationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = document.getElementById('userIdInput').value;
  const code = document.getElementById('verificationCode').value;

  const response = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, code })
  });

  const data = await response.json();
  if (data.success) {
    alert('Account verified! You can now login.');
    verificationForm.style.display = 'none';
    loginForm.style.display = 'block';
  } else {
    alert(data.error || 'Verification failed');
  }
});

// تسجيل الدخول
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (data.success) {
    alert('Login successful');
    // هنا يمكن إعادة التوجيه للصفحة الرئيسية
  } else {
    alert(data.error || 'Login failed');
  }
});

// نسيت كلمة المرور
forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value;

  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await response.json();
  if (data.success) {
    alert('Reset code sent to your email');
    forgotForm.style.display = 'none';
    verificationForm.style.display = 'block';
  } else {
    alert(data.error || 'Failed to send reset code');
  }
});
