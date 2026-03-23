// bypro-auth.js - مكتبة تسجيل الدخول المركزية
(function(window) {
  class BYPROAuth {
    constructor(config) {
      this.config = {
        loginUrl: 'https://yacine2007.github.io/secure-auth-app/login.html',
        containerId: config.containerId || 'bypro-auth-container',
        onLogin: config.onLogin || (() => {}),
        onLogout: config.onLogout || (() => {}),
        onError: config.onError || (() => {})
      };
      
      this.currentUser = null;
      this.iframe = null;
      this.container = null;
      
      this.init();
    }
    
    // إنشاء iframe وإضافته للصفحة
    init() {
      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = this.config.containerId;
        document.body.appendChild(this.container);
      }
      
      this.iframe = document.createElement('iframe');
      this.iframe.src = this.config.loginUrl;
      this.iframe.style.width = '100%';
      this.iframe.style.height = '500px';
      this.iframe.style.border = 'none';
      this.iframe.style.borderRadius = '16px';
      this.iframe.style.overflow = 'hidden';
      
      this.container.appendChild(this.iframe);
      
      // استماع للرسائل من iframe
      window.addEventListener('message', this.handleMessage.bind(this));
      
      // طلب حالة المستخدم الحالية
      this.requestUser();
    }
    
    // معالجة الرسائل من iframe
    handleMessage(event) {
      // التحقق من المصدر (أمان)
      if (!event.origin.includes('yacine2007.github.io') && 
          !event.origin.includes('bypro.kesug.com')) {
        return;
      }
      
      const data = event.data;
      
      switch (data.type) {
        case 'BYPRO_AUTH_RESPONSE':
          if (data.authenticated && data.user) {
            this.currentUser = data.user;
            this.config.onLogin(data.user);
          } else {
            this.currentUser = null;
          }
          break;
          
        case 'BYPRO_LOGIN_SUCCESS':
          this.currentUser = data.user;
          this.config.onLogin(data.user);
          break;
          
        case 'BYPRO_LOGOUT':
          this.currentUser = null;
          this.config.onLogout();
          break;
          
        case 'BYPRO_ERROR':
          this.config.onError(data.error);
          break;
      }
    }
    
    // طلب حالة المستخدم من iframe
    requestUser() {
      this.sendMessage({ type: 'BYPRO_AUTH_REQUEST' });
    }
    
    // إرسال رسالة إلى iframe
    sendMessage(data) {
      if (this.iframe && this.iframe.contentWindow) {
        this.iframe.contentWindow.postMessage(data, '*');
      }
    }
    
    // تسجيل الخروج
    logout() {
      this.sendMessage({ type: 'BYPRO_LOGOUT_REQUEST' });
    }
    
    // الحصول على المستخدم الحالي
    getCurrentUser() {
      return this.currentUser;
    }
    
    // التحقق من حالة تسجيل الدخول
    isAuthenticated() {
      return this.currentUser !== null;
    }
    
    // إخفاء iframe
    hide() {
      this.container.style.display = 'none';
    }
    
    // إظهار iframe
    show() {
      this.container.style.display = 'block';
      this.requestUser(); // تحديث الحالة
    }
    
    // تدمير المكتبة
    destroy() {
      window.removeEventListener('message', this.handleMessage);
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }
  
  // تصدير المكتبة
  window.BYPROAuth = BYPROAuth;
  
})(window);
