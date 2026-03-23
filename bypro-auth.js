/**
 * B.Y PRO Authentication SDK v2.1
 * مكتبة تسجيل دخول مركزية لجميع التطبيقات
 * https://yacine2007.github.io/secure-auth-app/bypro-auth.js
 */

(function(window) {
    class BYPROAuth {
        constructor(config) {
            this.config = {
                loginUrl: config.loginUrl || 'https://yacine2007.github.io/secure-auth-app/login.html',
                apiBase: config.apiBase || 'https://b-y-pro-acounts-login.onrender.com',
                containerId: config.containerId || 'bypro-auth-container',
                onLogin: config.onLogin || (() => {}),
                onLogout: config.onLogout || (() => {}),
                onError: config.onError || (() => {}),
                autoShow: config.autoShow !== false,
                theme: config.theme || 'dark'
            };
            
            this.currentUser = null;
            this.iframe = null;
            this.container = null;
            this.isOpen = false;
            this.loadingOverlay = null;
            
            this.init();
        }
        
        /**
         * إنشاء طبقة انتظار
         */
        createLoadingOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'bypro-loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(4px);
                display: none;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 20px;
                z-index: 999999;
            `;
            
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 50px;
                height: 50px;
                border: 3px solid rgba(255,255,255,0.2);
                border-top-color: #2a6df4;
                border-radius: 50%;
                animation: byproSpin 1s linear infinite;
            `;
            
            const text = document.createElement('div');
            text.style.cssText = `
                color: white;
                font-size: 14px;
                font-family: system-ui, -apple-system, sans-serif;
                text-align: center;
            `;
            text.innerHTML = 'Connecting to secure server<span class="bypro-dots">...</span>';
            
            const dots = text.querySelector('.bypro-dots');
            if (dots) {
                let dotCount = 0;
                setInterval(() => {
                    dotCount = (dotCount + 1) % 4;
                    dots.textContent = '.'.repeat(dotCount);
                }, 400);
            }
            
            const style = document.createElement('style');
            style.textContent = `
                @keyframes byproSpin {
                    to { transform: rotate(360deg); }
                }
                .bypro-delay-message {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.8);
                    color: #ffaa44;
                    padding: 8px 16px;
                    border-radius: 40px;
                    font-size: 13px;
                    font-family: system-ui;
                    z-index: 1000000;
                    display: none;
                    white-space: nowrap;
                }
            `;
            document.head.appendChild(style);
            
            overlay.appendChild(spinner);
            overlay.appendChild(text);
            document.body.appendChild(overlay);
            
            return overlay;
        }
        
        /**
         * إظهار طبقة الانتظار
         */
        showLoading(message = 'Connecting to secure server') {
            if (!this.loadingOverlay) {
                this.loadingOverlay = this.createLoadingOverlay();
            }
            const textEl = this.loadingOverlay.querySelector('div:last-child');
            if (textEl) {
                textEl.innerHTML = message + '<span class="bypro-dots">...</span>';
            }
            this.loadingOverlay.style.display = 'flex';
            
            // إظهار رسالة تأخير بعد 5 ثواني
            setTimeout(() => {
                if (this.loadingOverlay && this.loadingOverlay.style.display === 'flex') {
                    this.showDelayMessage();
                }
            }, 5000);
        }
        
        /**
         * إخفاء طبقة الانتظار
         */
        hideLoading() {
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
            }
            this.hideDelayMessage();
        }
        
        /**
         * إظهار رسالة التأخير
         */
        showDelayMessage() {
            if (this.delayMsg) return;
            this.delayMsg = document.createElement('div');
            this.delayMsg.className = 'bypro-delay-message';
            this.delayMsg.innerHTML = '<i class="fas fa-hourglass-half"></i> Server is waking up... please wait';
            document.body.appendChild(this.delayMsg);
            this.delayMsg.style.display = 'block';
        }
        
        /**
         * إخفاء رسالة التأخير
         */
        hideDelayMessage() {
            if (this.delayMsg) {
                this.delayMsg.remove();
                this.delayMsg = null;
            }
        }
        
        /**
         * إيقاظ السيرفر
         */
        async wakeUpServer() {
            try {
                const response = await fetch(`${this.config.apiBase}/api/ping`, {
                    method: 'GET',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                return response.ok;
            } catch (error) {
                return false;
            }
        }
        
        /**
         * تهيئة المكتبة
         */
        init() {
            // إنشاء الحاوية الرئيسية
            this.container = document.getElementById(this.config.containerId);
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = this.config.containerId;
                this.container.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: ${this.config.theme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)'};
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 999998;
                    backdrop-filter: blur(8px);
                `;
                document.body.appendChild(this.container);
            }
            
            // إنشاء صندوق المحتوى
            const modalBox = document.createElement('div');
            modalBox.style.cssText = `
                position: relative;
                width: 100%;
                height: 100%;
                max-width: 500px;
                max-height: 650px;
                margin: auto;
                background: transparent;
                border-radius: 28px;
                overflow: hidden;
                animation: byproFadeIn 0.3s ease;
            `;
            
            // زر الإغلاق
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
            closeBtn.style.cssText = `
                position: absolute;
                top: 16px;
                left: 16px;
                width: 40px;
                height: 40px;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(4px);
                border: none;
                border-radius: 30px;
                color: white;
                font-size: 20px;
                cursor: pointer;
                z-index: 100;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            `;
            closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(0,0,0,0.8)';
            closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(0,0,0,0.6)';
            closeBtn.onclick = () => this.hide();
            
            // إنشاء iframe
            this.iframe = document.createElement('iframe');
            this.iframe.src = this.config.loginUrl;
            this.iframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                background: white;
                border-radius: 28px;
            `;
            this.iframe.allow = "camera *; microphone *";
            
            modalBox.appendChild(closeBtn);
            modalBox.appendChild(this.iframe);
            this.container.appendChild(modalBox);
            
            // إضافة استايل التحريك
            const style = document.createElement('style');
            style.textContent = `
                @keyframes byproFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes byproFadeOut {
                    from { opacity: 1; transform: scale(1); }
                    to { opacity: 0; transform: scale(0.95); }
                }
            `;
            document.head.appendChild(style);
            
            // استماع للرسائل من iframe
            window.addEventListener('message', this.handleMessage.bind(this));
            
            // استعادة الجلسة
            this.restoreSession();
            
            // طلب حالة المستخدم
            setTimeout(() => this.requestUser(), 500);
        }
        
        /**
         * معالجة الرسائل الواردة
         */
        handleMessage(event) {
            const allowedOrigins = [
                'https://yacine2007.github.io',
                'https://bypro.kesug.com',
                window.location.origin
            ];
            
            let isAllowed = false;
            for (let origin of allowedOrigins) {
                if (event.origin.includes(origin)) {
                    isAllowed = true;
                    break;
                }
            }
            if (!isAllowed) return;
            
            const data = event.data;
            
            switch (data.type) {
                case 'BYPRO_AUTH_RESPONSE':
                    if (data.authenticated && data.user) {
                        this.currentUser = data.user;
                        this.saveSession(data.user);
                        this.config.onLogin(data.user);
                        this.hide();
                    } else {
                        this.currentUser = null;
                    }
                    break;
                    
                case 'BYPRO_LOGOUT':
                    this.currentUser = null;
                    this.clearSession();
                    this.config.onLogout();
                    break;
                    
                case 'BYPRO_ERROR':
                    this.config.onError(data.error);
                    break;
            }
        }
        
        /**
         * طلب حالة المستخدم
         */
        requestUser() {
            if (this.iframe && this.iframe.contentWindow) {
                this.iframe.contentWindow.postMessage({ type: 'BYPRO_AUTH_REQUEST' }, '*');
            }
        }
        
        /**
         * عرض نافذة تسجيل الدخول
         */
        async show() {
            // إظهار طبقة الانتظار
            this.showLoading('Preparing secure connection');
            
            // إيقاظ السيرفر
            await this.wakeUpServer();
            
            // تحديث رسالة الانتظار
            this.showLoading('Loading login window');
            
            // انتظار نصف ثانية للتأكد من استجابة السيرفر
            setTimeout(() => {
                this.hideLoading();
                if (this.container) {
                    this.container.style.display = 'flex';
                    this.isOpen = true;
                    this.requestUser();
                }
            }, 500);
        }
        
        /**
         * إخفاء نافذة تسجيل الدخول
         */
        hide() {
            if (this.container) {
                const modalBox = this.container.querySelector('div');
                if (modalBox) {
                    modalBox.style.animation = 'byproFadeOut 0.2s ease';
                    setTimeout(() => {
                        this.container.style.display = 'none';
                        modalBox.style.animation = '';
                    }, 200);
                } else {
                    this.container.style.display = 'none';
                }
                this.isOpen = false;
            }
            this.hideLoading();
        }
        
        /**
         * تسجيل الخروج
         */
        logout() {
            if (this.iframe && this.iframe.contentWindow) {
                this.iframe.contentWindow.postMessage({ type: 'BYPRO_LOGOUT_REQUEST' }, '*');
            }
            this.currentUser = null;
            this.clearSession();
            this.config.onLogout();
        }
        
        /**
         * الحصول على المستخدم الحالي
         */
        getCurrentUser() {
            return this.currentUser;
        }
        
        /**
         * التحقق من حالة تسجيل الدخول
         */
        isAuthenticated() {
            return this.currentUser !== null;
        }
        
        /**
         * حفظ الجلسة
         */
        saveSession(user) {
            const session = {
                user: user,
                timestamp: Date.now(),
                expires: Date.now() + (30 * 24 * 60 * 60 * 1000)
            };
            localStorage.setItem('bypro_auth_session', JSON.stringify(session));
        }
        
        /**
         * استعادة الجلسة
         */
        restoreSession() {
            try {
                const session = JSON.parse(localStorage.getItem('bypro_auth_session'));
                if (session && session.expires > Date.now()) {
                    this.currentUser = session.user;
                    this.config.onLogin(session.user);
                } else {
                    localStorage.removeItem('bypro_auth_session');
                }
            } catch (e) {
                localStorage.removeItem('bypro_auth_session');
            }
        }
        
        /**
         * مسح الجلسة
         */
        clearSession() {
            localStorage.removeItem('bypro_auth_session');
        }
        
        /**
         * تدمير المكتبة
         */
        destroy() {
            window.removeEventListener('message', this.handleMessage);
            if (this.container) {
                this.container.remove();
            }
            this.hideLoading();
        }
    }
    
    // تصدير المكتبة
    window.BYPROAuth = BYPROAuth;
    
})(window);
