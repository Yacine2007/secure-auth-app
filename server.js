// في ملف signup.html - استبدل دالة sendVerificationCode بالكود التالي:

// Send verification code using EmailJS
async function sendVerificationCode() {
    try {
        const emailValue = email.value.trim();
        if (!emailValue) {
            showStatus('Please enter your email address', 'error');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
            showStatus('Please enter a valid email address', 'error');
            return;
        }

        showStatus('Sending verification code...', 'success');
        
        // Generate random code
        generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Prepare email data
        const templateParams = {
            to_email: emailValue,
            code: generatedCode,
            timestamp: new Date().toLocaleString(),
            expiry_time: new Date(Date.now() + 10 * 60 * 1000).toLocaleString(),
            current_year: new Date().getFullYear()
        };

        console.log('📧 Sending email with code:', generatedCode);
        
        // Send using EmailJS
        if (typeof emailjs !== 'undefined') {
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
                .then(function(response) {
                    console.log('✅ Email sent successfully:', response);
                    showStatus(`Verification code sent to ${emailValue}`, 'success');
                    verificationSent = true;
                    startCountdown();
                    codeDisplay.style.display = 'block';
                })
                .catch(function(error) {
                    console.error('❌ EmailJS error:', error);
                    // إذا فشل EmailJS، استخدم API الخادم كبديل
                    sendVerificationViaAPI(emailValue, generatedCode);
                });
        } else {
            // إذا لم يتم تحميل EmailJS، استخدم API الخادم
            sendVerificationViaAPI(emailValue, generatedCode);
        }
        
    } catch (error) {
        console.error('Error sending verification:', error);
        showStatus('Failed to send verification code. Please try again.', 'error');
        verificationSent = false;
    }
}

// دالة بديلة لإرسال الرمز عبر API الخادم
async function sendVerificationViaAPI(emailValue, code) {
    try {
        const response = await fetch(`${API_BASE}/api/send-verification-email`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: emailValue, code: code})
        });

        const result = await response.json();
        
        if (result.success) {
            showStatus(`Verification code sent to ${emailValue}`, 'success');
            verificationSent = true;
            startCountdown();
            codeDisplay.style.display = 'block';
        } else {
            showStatus('Failed to send verification code. Please try again.', 'error');
            verificationSent = false;
        }
    } catch (apiError) {
        console.error('API fallback failed:', apiError);
        showStatus('Email service unavailable. Please try again later.', 'error');
        verificationSent = false;
    }
}
