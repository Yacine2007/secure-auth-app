/**
 * B.Y PRO Accounts - Authentication Client Library
 * Version: 5.0.0
 * For integrating with any web project
 */

(function(global) {
    'use strict';

    // ========== CONFIGURATION ==========
    const CONFIG = {
        AUTH_URL: 'https://yacine2007.github.io/secure-auth-app/login.html',
        STORAGE_KEY: 'bypro_client_auth',
        CHECK_INTERVAL: 2000,
        DEBUG: false,
        AUTO_INIT: true,
        RETRY_ATTEMPTS: 3,
        TIMEOUT: 5000
    };

    // ========== ERROR CODES ==========
    const ERRORS = {
        INIT_FAILED: 'INIT_FAILED',
        IFRAME_BLOCKED: 'IFRAME_BLOCKED',
        NO_RESPONSE: 'NO_RESPONSE',
        INVALID_DATA: 'INVALID_DATA',
        TIMEOUT: 'TIMEOUT',
        NOT_INITIALIZED: 'NOT_INITIALIZED'
    };

    // ========== STATE MANAGEMENT ==========
    const State = {
        _initialized: false,
        _authenticated: false,
        _user: null,
        _device: null,
        _iframe: null,
        _checkInterval: null,
        _messageHandler: null,
        _listeners: [],
        _pendingRequests: new Map(),
        _requestCounter: 0,

        init: function() {
            if (this._initialized) return this;
            
            try {
                this._loadStoredData();
                this._createIframe();
                this._setupMessageListener();
                this._startPeriodicCheck();
                this._initialized = true;
                
                this._log('✅ Auth client initialized');
            } catch (error) {
                this._log('❌ Initialization failed:', error);
                this._triggerError(ERRORS.INIT_FAILED, error);
            }
            
            return this;
        },

        _loadStoredData: function() {
            try {
                const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
                if (stored) {
                    const data = JSON.parse(stored);
                    if (data.expires > Date.now()) {
                        this._authenticated = data.authenticated || false;
                        this._user = data.user || null;
                        this._device = data.device || null;
                        this._log('📦 Loaded from storage');
                    }
                }
            } catch (error) {
                this._log('Storage load error:', error);
            }
        },

        _saveToStorage: function() {
            try {
                const data = {
                    authenticated: this._authenticated,
                    user: this._user,
                    device: this._device,
                    expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
                };
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
            } catch (error) {
                this._log('Storage save error:', error);
            }
        },

        _createIframe: function() {
            try {
                // Remove existing iframe if any
                if (this._iframe) {
                    document.body.removeChild(this._iframe);
                }

                const iframe = document.createElement('iframe');
                iframe.src = CONFIG.AUTH_URL;
                iframe.style.cssText = `
                    position: fixed;
                    top: -9999px;
                    left: -9999px;
                    width: 0;
                    height: 0;
                    border: none;
                    visibility: hidden;
                `;
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
                iframe.setAttribute('referrerpolicy', 'no-referrer');
                iframe.setAttribute('importance', 'low');
                
                document.body.appendChild(iframe);
                this._iframe = iframe;
                
                this._log('📦 Iframe created');
            } catch (error) {
                this._log('Iframe creation failed:', error);
                this._triggerError(ERRORS.IFRAME_BLOCKED, error);
            }
        },

        _setupMessageListener: function() {
            this._messageHandler = (event) => {
                // Validate origin
                const allowedOrigins = [
                    'https://yacine2007.github.io',
                    'http://localhost:3000',
                    'http://localhost:5500'
                ];
                
                if (!allowedOrigins.includes(event.origin) && !event.origin.includes('github.io')) {
                    return;
                }

                try {
                    const data = event.data;
                    
                    if (!data || typeof data !== 'object') return;

                    switch (data.type) {
                        case 'BYPRO_AUTH_UPDATE':
                            this._handleAuthUpdate(data);
                            break;
                        case 'BYPRO_AUTH_RESPONSE':
                            this._handleAuthResponse(data);
                            break;
                        case 'BYPRO_AUTH_ERROR':
                            this._handleError(data);
                            break;
                    }
                } catch (error) {
                    this._log('Message handling error:', error);
                }
            };

            window.addEventListener('message', this._messageHandler);
        },

        _handleAuthUpdate: function(data) {
            const changed = (
                this._authenticated !== data.authenticated ||
                JSON.stringify(this._user) !== JSON.stringify(data.user)
            );

            if (changed) {
                this._authenticated = data.authenticated || false;
                this._user = data.user || null;
                
                this._saveToStorage();
                this._notifyListeners();
                
                this._log('🔐 Auth state updated:', this._authenticated);
            }
        },

        _handleAuthResponse: function(data) {
            const requestId = data.requestId;
            if (requestId && this._pendingRequests.has(requestId)) {
                const { resolve, reject } = this._pendingRequests.get(requestId);
                this._pendingRequests.delete(requestId);
                
                if (data.success) {
                    resolve(data);
                } else {
                    reject(new Error(data.error || 'Request failed'));
                }
            }
        },

        _handleError: function(data) {
            this._log('⚠️ Auth error:', data.error);
            this._triggerError(data.error, data.details);
        },

        _startPeriodicCheck: function() {
            if (this._checkInterval) {
                clearInterval(this._checkInterval);
            }

            this._checkInterval = setInterval(() => {
                this.requestAuthStatus();
            }, CONFIG.CHECK_INTERVAL);
        },

        _sendMessage: function(type, data = {}) {
            return new Promise((resolve, reject) => {
                if (!this._iframe || !this._iframe.contentWindow) {
                    reject(new Error(ERRORS.NOT_INITIALIZED));
                    return;
                }

                const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Set timeout
                const timeout = setTimeout(() => {
                    this._pendingRequests.delete(requestId);
                    reject(new Error(ERRORS.TIMEOUT));
                }, CONFIG.TIMEOUT);

                // Store promise handlers
                this._pendingRequests.set(requestId, {
                    resolve: (result) => {
                        clearTimeout(timeout);
                        resolve(result);
                    },
                    reject: (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    }
                });

                // Send message
                try {
                    this._iframe.contentWindow.postMessage({
                        type,
                        requestId,
                        ...data,
                        timestamp: Date.now()
                    }, '*');
                } catch (error) {
                    clearTimeout(timeout);
                    this._pendingRequests.delete(requestId);
                    reject(error);
                }
            });
        },

        _notifyListeners: function() {
            this._listeners.forEach(listener => {
                try {
                    listener(this._authenticated, this._user);
                } catch (error) {
                    this._log('Listener error:', error);
                }
            });
        },

        _triggerError: function(code, details) {
            const error = new Error(code);
            error.details = details;
            
            this._listeners.forEach(listener => {
                if (listener.onError) {
                    try {
                        listener.onError(error);
                    } catch (e) {
                        this._log('Error listener error:', e);
                    }
                }
            });
        },

        _log: function(...args) {
            if (CONFIG.DEBUG) {
                console.log('[BYProAuth]', ...args);
            }
        },

        // Public methods
        requestAuthStatus: function() {
            return this._sendMessage('BYPRO_AUTH_REQUEST', {
                appId: this._getAppId()
            }).catch(() => {
                // Silent fail for status checks
                return null;
            });
        },

        requestLogin: function(returnUrl = window.location.href) {
            const loginUrl = new URL(CONFIG.AUTH_URL);
            loginUrl.searchParams.set('return_to', returnUrl);
            loginUrl.searchParams.set('app_id', this._getAppId());
            loginUrl.searchParams.set('mode', 'popup');
            
            window.open(loginUrl.toString(), 'BYProLogin', 'width=500,height=700');
            
            return new Promise((resolve) => {
                // Wait for login state change
                const checkAuth = () => {
                    if (this._authenticated) {
                        resolve(this._user);
                    } else {
                        setTimeout(checkAuth, 500);
                    }
                };
                checkAuth();
            });
        },

        requestLogout: function() {
            return this._sendMessage('BYPRO_AUTH_LOGOUT', {
                appId: this._getAppId()
            }).then(() => {
                this._authenticated = false;
                this._user = null;
                this._saveToStorage();
                this._notifyListeners();
            });
        },

        _getAppId: function() {
            // Generate or retrieve app ID
            let appId = localStorage.getItem('bypro_app_id');
            if (!appId) {
                appId = `app_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('bypro_app_id', appId);
            }
            return appId;
        },

        destroy: function() {
            if (this._checkInterval) {
                clearInterval(this._checkInterval);
                this._checkInterval = null;
            }
            
            if (this._messageHandler) {
                window.removeEventListener('message', this._messageHandler);
                this._messageHandler = null;
            }
            
            if (this._iframe) {
                document.body.removeChild(this._iframe);
                this._iframe = null;
            }
            
            this._initialized = false;
            this._authenticated = false;
            this._user = null;
            this._listeners = [];
            
            this._log('🧹 Client destroyed');
        }
    };

    // ========== PUBLIC API ==========
    class BYProAuthClient {
        constructor(options = {}) {
            Object.assign(CONFIG, options);
            
            this._state = State;
            
            if (CONFIG.AUTO_INIT) {
                this.init();
            }
        }

        // Initialize
        init() {
            this._state.init();
            return this;
        }

        // Authentication state
        isAuthenticated() {
            return this._state._authenticated;
        }

        getUser() {
            return this._state._user;
        }

        // Session management
        async login(returnUrl) {
            return this._state.requestLogin(returnUrl);
        }

        async logout() {
            return this._state.requestLogout();
        }

        // Event handling
        onAuthChange(callback) {
            this._state._listeners.push(callback);
            
            // Call immediately with current state
            callback(this._state._authenticated, this._state._user);
            
            // Return unsubscribe function
            return () => {
                this._state._listeners = this._state._listeners.filter(cb => cb !== callback);
            };
        }

        onError(callback) {
            this._state._listeners.push({ onError: callback });
            return () => {
                this._state._listeners = this._state._listeners.filter(
                    cb => cb.onError !== callback
                );
            };
        }

        // Manual refresh
        async refresh() {
            return this._state.requestAuthStatus();
        }

        // Get auth data for API calls
        getAuthHeader() {
            if (!this._state._authenticated || !this._state._user) {
                return null;
            }
            
            return {
                'X-BYPro-User-ID': this._state._user.id,
                'X-BYPro-Auth-Token': this._generateAuthToken()
            };
        }

        _generateAuthToken() {
            // Generate temporary auth token for API calls
            const data = {
                id: this._state._user?.id,
                time: Date.now(),
                fingerprint: this._state._device?.fingerprint
            };
            
            return btoa(JSON.stringify(data));
        }

        // Clean up
        destroy() {
            this._state.destroy();
        }

        // Configuration
        setConfig(options) {
            Object.assign(CONFIG, options);
            
            // Recreate iframe if URL changed
            if (options.AUTH_URL && this._state._initialized) {
                this._state._createIframe();
            }
        }
    }

    // ========== EXPORT ==========
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BYProAuthClient;
    } else {
        global.BYProAuthClient = BYProAuthClient;
    }

    // ========== AUTO-INIT FOR SIMPLE USAGE ==========
    if (CONFIG.AUTO_INIT && typeof window !== 'undefined') {
        window.byproAuth = new BYProAuthClient();
    }

})(typeof window !== 'undefined' ? window : global);
