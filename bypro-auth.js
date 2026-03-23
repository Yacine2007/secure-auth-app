/**
 * B.Y PRO Authentication SDK
 * مكتبة تسجيل دخول مركزية لجميع التطبيقات
 * @version 2.0.0
 */

(function(window) {
    class BYPROAuth {
        constructor(config) {
            this.config = {
                loginUrl: config.loginUrl || 'https://yacine2007.github.io/secure-auth-app/login.html',
                containerId: config.containerId || 'bypro-auth-container',
                onLogin: config.onLogin || (() => {}),
                onLogout: config.onLogout || (() => {}),
                onError: config.onError || (() => {}),
                autoShow: config.autoShow !== false,
                closeOnOutsideClick: config.closeOnOutsideClick !== false,
                theme: config.theme || 'dark' // 'dark' or 'light'
            };
            
            this.currentUser = null;
            this.iframe = null;
            this.container = null;
            this.isOpen = false;
            
            this.init();
        }
        
        /**
         * تهيئة المكتبة وإنشاء الـ iframe
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
                    z-index: 999999;
                    backdrop-filter: blur(8px);
                    transition: all 0.3s ease;
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
                box-shadow: 0 30px 60px rgba(0,0,0,0.4);
                animation: byproFadeIn 0.3s ease;
            `;
            
            // زر الإغلاق (Font Awesome)
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
            closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(0,0,0,0.8)';
            closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(0,0,0,0.6)';
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
            
            // إضافة استايل للتحريك
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
         * معالجة الرسائل الواردة من iframe
         */
        handleMessage(event) {
            // التحقق من المصدر (أمان)
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
                        this.clearSession();
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
         * طلب حالة المستخدم من iframe
         */
        requestUser() {
            if (this.iframe && this.iframe.contentWindow) {
                this.iframe.contentWindow.postMessage({ type: 'BYPRO_AUTH_REQUEST' }, '*');
            }
        }
        
        /**
         * عرض نافذة تسجيل الدخول
         */
        show() {
            if (this.container) {
                this.container.style.display = 'flex';
                this.isOpen = true;
                this.requestUser();
            }
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
         * حفظ الجلسة في localStorage
         */
        saveSession(user) {
            const session = {
                user: user,
                timestamp: Date.now(),
                expires: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 يوم
            };
            localStorage.setItem('bypro_auth_session', JSON.stringify(session));
        }
        
        /**
         * استعادة الجلسة من localStorage
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
         * تدمير المكتبة وإزالة العناصر
         */
        destroy() {
            window.removeEventListener('message', this.handleMessage);
            if (this.container) {
                this.container.remove();
            }
        }
    }
    
    // تصدير المكتبة
    window.BYPROAuth = BYPROAuth;
    
})(window);
