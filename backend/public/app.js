// College Event Management System - Frontend JavaScript
const API_BASE = '/api'; // Change this to your backend URL (e.g., 'http://localhost:4000/api')

// Utility Functions
class Utils {
    static formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static showToast(message, type = 'info', duration = 5000) {
        Toastify({
            text: message,
            duration: duration,
            gravity: "top",
            position: "right",
            className: `toastify-${type}`,
            stopOnFocus: true,
        }).showToast();
    }

    static copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard!', 'success', 2000);
        }).catch(() => {
            this.showToast('Failed to copy to clipboard', 'error', 2000);
        });
    }

    static generateCalendarLink(event) {
        const start = new Date(event.startTime).toISOString().replace(/-|:|\.\d+/g, '');
        const end = new Date(event.endTime).toISOString().replace(/-|:|\.\d+/g, '');
        const details = `${event.description}\n\nLocation: ${event.venueName || 'TBA'}`;
        
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${start}/${end}&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(details)}`;
    }
}

// AI Interest Detection Service
class AIInterestService {
    constructor() {
        this.interestKeywords = {
            dance: ['dance', 'dancing', 'choreography', 'ballet', 'hiphop', 'salsa', 'performance', 'movement'],
            music: ['music', 'singing', 'song', 'concert', 'band', 'guitar', 'piano', 'violin', 'vocal', 'melody'],
            sports: ['sports', 'basketball', 'football', 'soccer', 'tennis', 'cricket', 'volleyball', 'fitness', 'exercise', 'workout'],
            technology: ['technology', 'coding', 'programming', 'software', 'ai', 'machine learning', 'web development', 'hackathon', 'tech'],
            art: ['art', 'painting', 'drawing', 'sketching', 'design', 'creative', 'exhibition', 'gallery', 'craft'],
            academic: ['academic', 'workshop', 'seminar', 'lecture', 'study', 'research', 'conference', 'education'],
            social: ['social', 'networking', 'meetup', 'party', 'gathering', 'community', 'cultural']
        };
        
        this.userInterests = this.loadUserInterests();
    }

    loadUserInterests() {
        const saved = localStorage.getItem('cems_user_interests');
        return saved ? JSON.parse(saved) : {};
    }

    saveUserInterests() {
        localStorage.setItem('cems_user_interests', JSON.stringify(this.userInterests));
    }

    detectInterests(text) {
        const interests = {};
        const textLower = text.toLowerCase();
        
        Object.keys(this.interestKeywords).forEach(category => {
            let score = 0;
            this.interestKeywords[category].forEach(keyword => {
                if (textLower.includes(keyword)) {
                    score += 1;
                    if (new RegExp(`\\b${keyword}\\b`).test(textLower)) {
                        score += 2;
                    }
                }
            });
            if (score > 0) {
                interests[category] = Math.min(score * 10, 100);
            }
        });

        this.updateUserInterestProfile(interests);
        return interests;
    }

    updateUserInterestProfile(newInterests) {
        Object.keys(newInterests).forEach(category => {
            if (!this.userInterests[category] || newInterests[category] > this.userInterests[category]) {
                this.userInterests[category] = newInterests[category];
            }
        });
        this.saveUserInterests();
    }

    getTopInterests(limit = 3) {
        return Object.entries(this.userInterests)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([category, score]) => ({ category, score }));
    }

    getRecommendedEvents(events, minMatchScore = 30) {
        if (Object.keys(this.userInterests).length === 0) {
            return [];
        }

        return events
            .map(event => {
                let matchScore = 0;
                
                if (event.category && this.userInterests[event.category]) {
                    matchScore += this.userInterests[event.category];
                }
                
                const eventText = (event.title + ' ' + event.description).toLowerCase();
                Object.keys(this.userInterests).forEach(category => {
                    this.interestKeywords[category].forEach(keyword => {
                        if (eventText.includes(keyword)) {
                            matchScore += this.userInterests[category] * 0.1;
                        }
                    });
                });

                return { ...event, matchScore: Math.min(Math.round(matchScore), 100) };
            })
            .filter(event => event.matchScore >= minMatchScore)
            .sort((a, b) => b.matchScore - a.matchScore);
    }

    getInterestAnalysis(interests) {
        const topInterests = Object.entries(interests)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        if (topInterests.length === 0) {
            return "No strong interests detected. Try describing more specific activities you enjoy!";
        }

        const interestNames = {
            dance: "Dance & Performing Arts",
            music: "Music & Singing",
            sports: "Sports & Fitness",
            technology: "Technology & Coding",
            art: "Art & Design",
            academic: "Academic & Workshops",
            social: "Social & Cultural"
        };

        return `Based on your input, you're most interested in ${topInterests.map(([cat]) => interestNames[cat] || cat).join(', ')}.`;
    }
}

// Chart Service for Analytics
class ChartService {
    static createPieChart(canvasId, data, labels) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
                        '#8b5cf6', '#06b6d4', '#f97316'
                    ],
                    borderWidth: 2,
                    borderColor: 'var(--surface-color)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-primary)',
                            padding: 20
                        }
                    }
                }
            }
        });
    }

    static createBarChart(canvasId, data, labels) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Registrations',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3b82f6',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: 'var(--text-primary)'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'var(--text-secondary)'
                        },
                        grid: {
                            color: 'var(--border-color)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'var(--text-secondary)'
                        },
                        grid: {
                            color: 'var(--border-color)'
                        }
                    }
                }
            }
        });
    }

    static createLineChart(canvasId, data, labels) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Registrations',
                    data: data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: 'var(--text-primary)'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'var(--text-secondary)'
                        },
                        grid: {
                            color: 'var(--border-color)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'var(--text-secondary)'
                        },
                        grid: {
                            color: 'var(--border-color)'
                        }
                    }
                }
            }
        });
    }
}

// Main Application Class
class CEMSApp {
    constructor() {
        this.currentUser = null;
        this.aiService = new AIInterestService();
        this.currentEvents = [];
        this.charts = {};
        this.init();
    }

    init() {
        console.log('CEMS App Initializing...');
        this.setupTheme();
        this.setupEventListeners();
        this.checkAuthentication();
        this.checkPageSpecificFeatures();
    }

    // Theme Management
    setupTheme() {
        const savedTheme = localStorage.getItem('cems_theme') || 'light-mode';
        document.body.className = savedTheme;
        this.updateThemeToggleIcon();
    }

    toggleTheme() {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light-mode' : 'dark-mode';
        
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(newTheme);
        localStorage.setItem('cems_theme', newTheme);
        
        this.updateThemeToggleIcon();
        Utils.showToast(`Switched to ${isDark ? 'light' : 'dark'} mode`, 'success', 2000);
    }

    updateThemeToggleIcon() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            const isDark = document.body.classList.contains('dark-mode');
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Authentication Management
    getToken() {
        return localStorage.getItem('cems_token');
    }

    getUser() {
        const userStr = localStorage.getItem('cems_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    saveAuthData(token, user) {
        localStorage.setItem('cems_token', token);
        localStorage.setItem('cems_user', JSON.stringify(user));
        this.currentUser = user;
    }

    clearAuthData() {
        localStorage.removeItem('cems_token');
        localStorage.removeItem('cems_user');
        this.currentUser = null;
    }

    isAuthenticated() {
        const token = this.getToken();
        const user = this.getUser();
        return !!token && !!user;
    }

    checkAuthentication() {
        if (window.location.pathname.includes('dashboard.html') || 
            window.location.pathname.includes('event.html')) {
            if (!this.isAuthenticated()) {
                this.redirectToLogin();
                return;
            }
            this.currentUser = this.getUser();
            this.updateUIForUser();
        } else if (window.location.pathname.includes('index.html') || 
                   window.location.pathname === '/') {
            if (this.isAuthenticated()) {
                this.redirectToDashboard();
            }
        }
    }

    checkPageSpecificFeatures() {
        if (window.location.pathname.includes('event.html')) {
            this.loadEventDetails();
        }
    }

    redirectToLogin() {
        window.location.href = 'index.html';
    }

    redirectToDashboard() {
        window.location.href = 'dashboard.html';
    }

    logout() {
        this.clearAuthData();
        Utils.showToast('Logged out successfully', 'success');
        setTimeout(() => {
            this.redirectToLogin();
        }, 1000);
    }

    // API Calls
    async apiCall(endpoint, options = {}) {
        const token = this.getToken();
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401 || response.status === 403) {
                this.clearAuthData();
                this.redirectToLogin();
                throw new Error('Authentication required');
            }

            const data = await response.json().catch(() => null);
            
            if (!response.ok) {
                throw new Error(data?.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API call failed:', error);
            Utils.showToast(error.message || 'Network error occurred', 'error');
            throw error;
        }
    }

    // UI Management
    showLoading(show = true, type = 'default') {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.toggle('hidden', !show);
            const spinner = loadingIndicator.querySelector('.spinner');
            if (spinner) {
                spinner.classList.toggle('ai-spinner', type === 'ai');
            }
        }
    }

    updateUIForUser() {
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        
        if (userInfo && this.currentUser) {
            userInfo.textContent = `Welcome, ${this.currentUser.name}`;
        }
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.name;
        }

        // Show/hide role-based elements
        const studentElements = document.querySelectorAll('.student-only');
        const organizerElements = document.querySelectorAll('.organizer-only');
        const adminElements = document.querySelectorAll('.admin-only');
        
        studentElements.forEach(el => {
            el.style.display = this.currentUser?.role === 'STUDENT' ? 'block' : 'none';
        });
        
        organizerElements.forEach(el => {
            el.style.display = (this.currentUser?.role === 'ORGANIZER' || this.currentUser?.role === 'ADMIN') ? 'block' : 'none';
        });
        
        adminElements.forEach(el => {
            el.style.display = this.currentUser?.role === 'ADMIN' ? 'block' : 'none';
        });

        // Update profile in settings modal
        this.updateProfileModal();
        
        // Load dashboard data if on dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            this.loadDashboardData();
        }
    }

    updateProfileModal() {
        if (!this.currentUser) return;

        document.getElementById('profile-name').value = this.currentUser.name;
        document.getElementById('profile-email').value = this.currentUser.email;
        document.getElementById('profile-phone').value = this.currentUser.phone || '';
        document.getElementById('profile-avatar').value = this.currentUser.avatar || '';
    }

    // Event Listeners
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Login/Register tab switching
        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.target.getAttribute('data-tab');
                this.switchAuthTab(tab);
            });
        });

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // User dropdown
        document.querySelectorAll('.dropdown-item[data-action="logout"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });

        document.querySelectorAll('.dropdown-item[data-action="profile"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProfileModal();
            });
        });

        document.querySelectorAll('.dropdown-item[data-action="settings"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProfileModal();
            });
        });

        // Dashboard navigation
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Modal handling
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModals();
            });
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });

        // Create event form
        const createEventForm = document.getElementById('create-event-form');
        if (createEventForm) {
            createEventForm.addEventListener('submit', (e) => this.handleCreateEvent(e));
        }

        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // AI Interest Detection
        const analyzeBtn = document.getElementById('analyze-interests-btn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.handleInterestAnalysis());
        }

        // AI Suggestions
        const suggestionsBtn = document.getElementById('ai-suggestions-btn');
        if (suggestionsBtn) {
            suggestionsBtn.addEventListener('click', () => this.handleAISuggestions());
        }

        // Search functionality
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.addEventListener('input', Utils.debounce(() => {
                this.handleGlobalSearch(globalSearch.value);
            }, 300));
        }

        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', Utils.debounce(() => {
                this.handleUserSearch(userSearch.value);
            }, 300));
        }

        // Filters
        const categoryFilter = document.getElementById('category-filter');
        const sortFilter = document.getElementById('sort-filter');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        if (sortFilter) {
            sortFilter.addEventListener('change', () => this.applyFilters());
        }

        // Refresh dashboard
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }

        // View change events
        document.addEventListener('viewChanged', (e) => {
            const view = e.detail.view;
            console.log('View changed to:', view);
            
            if (view === 'browse-events') {
                this.loadEvents();
            } else if (view === 'my-registrations') {
                this.loadMyRegistrations();
            } else if (view === 'my-events') {
                this.loadMyEvents();
            } else if (view === 'pending-approvals') {
                this.loadPendingEvents();
            } else if (view === 'organizer-analytics') {
                this.loadOrganizerAnalytics();
            } else if (view === 'admin-analytics') {
                this.loadAdminAnalytics();
            } else if (view === 'user-management') {
                this.loadUsers();
            } else if (view === 'ai-interests') {
                this.updateInterestProfile();
            }
        });
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-tab') === tab);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-tab`);
        });
    }

    switchView(view) {
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-view') === view);
        });

        document.querySelectorAll('.view').forEach(viewEl => {
            viewEl.classList.toggle('active', viewEl.id === `${view}-view`);
        });

        document.dispatchEvent(new CustomEvent('viewChanged', { detail: { view } }));
    }

    showProfileModal() {
        document.getElementById('profile-modal').classList.remove('hidden');
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    // Authentication Handlers
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            this.showLoading(true);
            const response = await this.apiCall('/auth/login', {
                method: 'POST',
                body: data,
            });

            this.saveAuthData(response.token, response.user);
            Utils.showToast('Login successful!', 'success');
            
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            this.showLoading(true);
            const response = await this.apiCall('/auth/signup', {
                method: 'POST',
                body: data,
            });

            this.saveAuthData(response.token, response.user);
            Utils.showToast('Registration successful!', 'success');
            
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);
        } catch (error) {
            console.error('Registration failed:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // In a real app, you would call an API to update the profile
            // For now, we'll just update localStorage
            const updatedUser = { ...this.currentUser, ...data };
            this.saveAuthData(this.getToken(), updatedUser);
            
            Utils.showToast('Profile updated successfully!', 'success');
            this.hideModals();
            this.updateUIForUser();
        } catch (error) {
            console.error('Profile update failed:', error);
            Utils.showToast('Failed to update profile', 'error');
        }
    }

    // Dashboard and Data Loading
    async loadDashboardData() {
        try {
            const events = await this.apiCall('/events');
            this.currentEvents = events;
            
            this.updateDashboardStats(events);
            this.loadUpcomingEvents(events);
            
            // Load additional data based on user role
            if (this.currentUser?.role === 'ORGANIZER' || this.currentUser?.role === 'ADMIN') {
                this.loadOrganizerAnalytics();
            }
            if (this.currentUser?.role === 'ADMIN') {
                this.loadAdminAnalytics();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardStats(events) {
        const totalEvents = events.length;
        const upcomingEvents = events.filter(event => 
            new Date(event.startTime) > new Date()
        ).length;
        
        const myRegistrations = events.filter(event =>
            event.registeredUsers?.some(user => user.id === this.currentUser?.id)
        ).length;

        document.getElementById('total-events').textContent = totalEvents;
        document.getElementById('upcoming-events').textContent = upcomingEvents;
        document.getElementById('total-registrations').textContent = myRegistrations;
        
        // Calculate attendance rate (simplified)
        const attendanceRate = events.length > 0 ? 
            Math.round((events.reduce((sum, event) => sum + (event.registeredCount || 0), 0) / 
                       events.reduce((sum, event) => sum + (event.capacity || 0), 0)) * 100) : 0;
        document.getElementById('attendance-rate').textContent = `${attendanceRate}%`;
    }

    loadUpcomingEvents(events) {
        const container = document.getElementById('upcoming-events-list');
        if (!container) return;

        const upcoming = events
            .filter(event => new Date(event.startTime) > new Date())
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = '<div class="empty-state">No upcoming events</div>';
            return;
        }

        container.innerHTML = upcoming.map(event => `
            <div class="event-item">
                <div class="event-item-info">
                    <h4>${event.title}</h4>
                    <p>${Utils.formatDate(event.startTime)}</p>
                </div>
                <button class="btn btn-sm btn-primary" onclick="cemsApp.viewEventDetails('${event.id}')">
                    View
                </button>
            </div>
        `).join('');
    }

    // Event Management
    async loadEvents() {
        const container = document.getElementById('events-container');
        if (!container) return;

        try {
            this.showLoading(true);
            const events = await this.apiCall('/events');
            this.currentEvents = events;
            
            this.displayEvents(events, container);
        } catch (error) {
            console.error('Failed to load events:', error);
            container.innerHTML = '<div class="empty-state">Failed to load events</div>';
        } finally {
            this.showLoading(false);
        }
    }

    async loadMyRegistrations() {
        const container = document.getElementById('registrations-container');
        if (!container) return;

        try {
            this.showLoading(true);
            const events = await this.apiCall('/events');
            const myRegistrations = events.filter(event =>
                event.registeredUsers?.some(user => user.id === this.currentUser?.id)
            );
            
            if (myRegistrations.length === 0) {
                container.innerHTML = '<div class="empty-state">You haven\'t registered for any events yet</div>';
                return;
            }

            this.displayEvents(myRegistrations, container);
        } catch (error) {
            console.error('Failed to load registrations:', error);
            container.innerHTML = '<div class="empty-state">Failed to load your registrations</div>';
        } finally {
            this.showLoading(false);
        }
    }

    async loadMyEvents() {
        const container = document.getElementById('my-events-container');
        if (!container || !this.currentUser) return;

        try {
            this.showLoading(true);
            const events = await this.apiCall('/events');
            const myEvents = events.filter(event => event.organizer?.id === this.currentUser.id);
            
            if (myEvents.length === 0) {
                container.innerHTML = '<div class="empty-state">You haven\'t created any events yet</div>';
                return;
            }

            this.displayEvents(myEvents, container, false);
        } catch (error) {
            console.error('Failed to load my events:', error);
            container.innerHTML = '<div class="empty-state">Failed to load your events</div>';
        } finally {
            this.showLoading(false);
        }
    }

    async loadPendingEvents() {
        const container = document.getElementById('pending-events-container');
        if (!container) return;

        try {
            this.showLoading(true);
            const events = await this.apiCall('/events');
            const pendingEvents = events.filter(event => event.status === 'PENDING');
            
            if (pendingEvents.length === 0) {
                container.innerHTML = '<div class="empty-state">No pending events for approval</div>';
                return;
            }

            container.innerHTML = pendingEvents.map(event => this.createPendingEventCard(event)).join('');
            
            container.querySelectorAll('.btn-approve').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const eventId = e.target.closest('.event-card').dataset.eventId;
                    this.handleEventApproval(eventId, true);
                });
            });
            
            container.querySelectorAll('.btn-reject').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const eventId = e.target.closest('.event-card').dataset.eventId;
                    this.handleEventApproval(eventId, false);
                });
            });
        } catch (error) {
            console.error('Failed to load pending events:', error);
            container.innerHTML = '<div class="empty-state">Failed to load pending events</div>';
        } finally {
            this.showLoading(false);
        }
    }

    displayEvents(events, container, showRegister = true) {
        if (events.length === 0) {
            container.innerHTML = '<div class="empty-state">No events found</div>';
            return;
        }

        container.innerHTML = events.map(event => 
            this.createEventCard(event, showRegister)
        ).join('');
        
        container.querySelectorAll('.btn-register').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.event-card').dataset.eventId;
                this.handleEventRegistration(eventId);
            });
        });

        container.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.event-card').dataset.eventId;
                this.viewEventDetails(eventId);
            });
        });
    }

    createEventCard(event, showRegister = true) {
        const isRegistered = event.registeredUsers?.some(user => user.id === this.currentUser?.id);
        const isOrganizer = event.organizer?.id === this.currentUser?.id;
        const canManage = isOrganizer || this.currentUser?.role === 'ADMIN';
        
        return `
            <div class="event-card ${event.status?.toLowerCase()}" data-event-id="${event.id}">
                ${event.coverImage ? `
                    <img src="${event.coverImage}" alt="${event.title}" class="event-cover" onerror="this.style.display='none'">
                ` : ''}
                <div class="event-header">
                    <h3 class="event-title">${event.title}</h3>
                    <div class="event-description">${event.description}</div>
                </div>
                <div class="event-details">
                    <div class="event-detail">
                        <span><i class="fas fa-calendar"></i> Date & Time:</span>
                        <span>${Utils.formatDate(event.startTime)}</span>
                    </div>
                    <div class="event-detail">
                        <span><i class="fas fa-map-marker-alt"></i> Venue:</span>
                        <span>${event.venueName || 'TBA'}</span>
                    </div>
                    <div class="event-detail">
                        <span><i class="fas fa-tag"></i> Category:</span>
                        <span>${this.formatCategory(event.category)}</span>
                    </div>
                    <div class="event-detail">
                        <span><i class="fas fa-users"></i> Capacity:</span>
                        <span>${event.registeredCount || 0}/${event.capacity}</span>
                    </div>
                    <div class="event-detail">
                        <span><i class="fas fa-circle"></i> Status:</span>
                        <span class="registration-status status-${event.status?.toLowerCase()}">${event.status}</span>
                    </div>
                    ${isRegistered ? `
                    <div class="event-detail">
                        <span><i class="fas fa-ticket-alt"></i> Your Status:</span>
                        <span class="registration-status status-registered">REGISTERED</span>
                    </div>
                    ` : ''}
                </div>
                <div class="event-actions">
                    <button class="btn btn-secondary btn-sm btn-view">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${showRegister && !isRegistered && this.currentUser?.role === 'STUDENT' && event.status === 'APPROVED' ? 
                        `<button class="btn btn-primary btn-sm btn-register">
                            <i class="fas fa-ticket-alt"></i> Register
                        </button>` : ''}
                    ${canManage ? 
                        `<button class="btn btn-warning btn-sm" onclick="cemsApp.editEvent('${event.id}')">
                            <i class="fas fa-edit"></i> Manage
                        </button>` : ''}
                </div>
            </div>
        `;
    }

    createPendingEventCard(event) {
        return `
            <div class="event-card pending" data-event-id="${event.id}">
                <div class="event-header">
                    <h3 class="event-title">${event.title}</h3>
                    <div class="event-description">${event.description}</div>
                </div>
                <div class="event-details">
                    <div class="event-detail">
                        <span><i class="fas fa-user"></i> Organizer:</span>
                        <span>${event.organizer?.name || 'Unknown'}</span>
                    </div>
                    <div class="event-detail">
                        <span><i class="fas fa-calendar"></i> Date & Time:</span>
                        <span>${Utils.formatDate(event.startTime)}</span>
                    </div>
                    <div class="event-detail">
                        <span><i class="fas fa-users"></i> Capacity:</span>
                        <span>${event.capacity}</span>
                    </div>
                </div>
                <div class="event-actions">
                    <button class="btn btn-success btn-sm btn-approve">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger btn-sm btn-reject">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }

    async viewEventDetails(eventId) {
        try {
            const event = await this.apiCall(`/events/${eventId}`);
            
            if (window.location.pathname.includes('event.html')) {
                this.displayEventDetailsPage(event);
            } else {
                this.displayEventDetailsModal(event);
            }
        } catch (error) {
            console.error('Failed to load event details:', error);
        }
    }

    displayEventDetailsModal(event) {
        const modal = document.getElementById('event-modal');
        const content = document.getElementById('event-modal-content');
        const title = document.getElementById('event-modal-title');
        
        title.textContent = event.title;
        
        const isRegistered = event.registeredUsers?.some(user => user.id === this.currentUser?.id);
        const canRegister = this.currentUser?.role === 'STUDENT' && !isRegistered && event.status === 'APPROVED';
        
        content.innerHTML = `
            <div class="event-details-modal">
                ${event.coverImage ? `
                    <img src="${event.coverImage}" alt="${event.title}" class="event-cover" style="width: 100%; border-radius: 0.5rem; margin-bottom: 1rem;">
                ` : ''}
                
                <div class="event-info-grid">
                    <div class="info-item">
                        <strong><i class="fas fa-calendar"></i> Date & Time:</strong>
                        <span>${Utils.formatDate(event.startTime)}</span>
                    </div>
                    <div class="info-item">
                        <strong><i class="fas fa-map-marker-alt"></i> Venue:</strong>
                        <span>${event.venueName || 'TBA'}</span>
                    </div>
                    <div class="info-item">
                        <strong><i class="fas fa-tag"></i> Category:</strong>
                        <span>${this.formatCategory(event.category)}</span>
                    </div>
                    <div class="info-item">
                        <strong><i class="fas fa-users"></i> Capacity:</strong>
                        <span>${event.registeredCount || 0}/${event.capacity}</span>
                    </div>
                    <div class="info-item">
                        <strong><i class="fas fa-user"></i> Organizer:</strong>
                        <span>${event.organizer?.name || 'Unknown'}</span>
                    </div>
                </div>
                
                <div class="event-description-full">
                    <h4>Description</h4>
                    <p>${event.description}</p>
                </div>
                
                <div class="event-actions-sidebar">
                    ${canRegister ? `
                        <button class="btn btn-primary btn-full" onclick="cemsApp.handleEventRegistration('${event.id}')">
                            <i class="fas fa-ticket-alt"></i> Register for Event
                        </button>
                    ` : ''}
                    
                    ${isRegistered ? `
                        <div class="registration-status status-registered" style="text-align: center; margin: 1rem 0;">
                            <i class="fas fa-check-circle"></i> You are registered for this event
                        </div>
                    ` : ''}
                    
                    <button class="btn btn-secondary btn-full" onclick="cemsApp.shareEvent('${event.id}')">
                        <i class="fas fa-share"></i> Share Event
                    </button>
                    
                    <button class="btn btn-secondary btn-full" onclick="cemsApp.addToCalendar(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                        <i class="fas fa-calendar-plus"></i> Add to Calendar
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }

    displayEventDetailsPage(event) {
        const container = document.getElementById('event-details');
        if (!container) return;

        const isRegistered = event.registeredUsers?.some(user => user.id === this.currentUser?.id);
        const canRegister = this.currentUser?.role === 'STUDENT' && !isRegistered && event.status === 'APPROVED';
        
        container.innerHTML = `
            <div class="event-details-page">
                <div class="event-hero">
                    ${event.coverImage ? `
                        <img src="${event.coverImage}" alt="${event.title}" class="event-hero-image">
                    ` : `
                        <div style="background: var(--gradient-primary); height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                    `}
                    <div class="event-hero-overlay">
                        <h1 class="event-hero-title">${event.title}</h1>
                        <div class="event-hero-meta">
                            <span><i class="fas fa-calendar"></i> ${Utils.formatDate(event.startTime)}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${event.venueName || 'TBA'}</span>
                            <span><i class="fas fa-user"></i> ${event.organizer?.name || 'Unknown'}</span>
                            <span class="registration-status status-${event.status?.toLowerCase()}">${event.status}</span>
                        </div>
                    </div>
                </div>
                
                <div class="event-content">
                    <div class="event-main">
                        <div class="event-description-full">
                            <h3>About This Event</h3>
                            <p>${event.description}</p>
                        </div>
                        
                        <div class="event-info-grid" style="margin-top: 2rem;">
                            <div class="info-item">
                                <strong><i class="fas fa-clock"></i> Duration:</strong>
                                <span>${Utils.formatTime(event.startTime)} - ${Utils.formatTime(event.endTime)}</span>
                            </div>
                            <div class="info-item">
                                <strong><i class="fas fa-tag"></i> Category:</strong>
                                <span>${this.formatCategory(event.category)}</span>
                            </div>
                            <div class="info-item">
                                <strong><i class="fas fa-users"></i> Available Spots:</strong>
                                <span>${event.capacity - (event.registeredCount || 0)} of ${event.capacity}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="event-sidebar">
                        <div class="event-actions-sidebar">
                            ${canRegister ? `
                                <button class="btn btn-primary btn-full" onclick="cemsApp.handleEventRegistration('${event.id}')">
                                    <i class="fas fa-ticket-alt"></i> Register for Event
                                </button>
                            ` : ''}
                            
                            ${isRegistered ? `
                                <div class="registration-status status-registered" style="text-align: center; margin: 1rem 0;">
                                    <i class="fas fa-check-circle"></i> You are registered for this event
                                </div>
                            ` : ''}
                            
                            <button class="btn btn-secondary btn-full" onclick="cemsApp.shareEvent('${event.id}')">
                                <i class="fas fa-share"></i> Share Event
                            </button>
                            
                            <button class="btn btn-secondary btn-full" onclick="cemsApp.addToCalendar(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                                <i class="fas fa-calendar-plus"></i> Add to Calendar
                            </button>
                        </div>
                        
                        <div class="event-info-card">
                            <h4>Event Organizer</h4>
                            <div class="organizer-info">
                                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(event.organizer?.name || 'Organizer')}&background=2563eb&color=fff" 
                                         alt="${event.organizer?.name}" class="user-avatar">
                                    <div>
                                        <strong>${event.organizer?.name}</strong>
                                        <p style="color: var(--text-secondary); margin: 0;">Organizer</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadEventDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');
        
        if (eventId) {
            try {
                this.showLoading(true);
                await this.viewEventDetails(eventId);
            } catch (error) {
                document.getElementById('event-details').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Event Not Found</h3>
                        <p>The event you're looking for doesn't exist or you don't have permission to view it.</p>
                        <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
                    </div>
                `;
            } finally {
                this.showLoading(false);
            }
        }
    }

    // Event Actions
    async handleEventRegistration(eventId) {
        try {
            await this.apiCall(`/events/${eventId}/register`, {
                method: 'POST',
            });
            
            Utils.showToast('Successfully registered for event!', 'success');
            
            // Update UI
            if (window.location.pathname.includes('event.html')) {
                this.loadEventDetails();
            } else {
                this.hideModals();
                this.loadEvents();
                this.loadMyRegistrations();
            }
        } catch (error) {
            console.error('Event registration failed:', error);
        }
    }

    async handleCreateEvent(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        data.startTime = new Date(data.startTime).toISOString();
        data.endTime = new Date(data.endTime).toISOString();

        try {
            this.showLoading(true);
            await this.apiCall('/events', {
                method: 'POST',
                body: data,
            });

            Utils.showToast('Event created successfully!', 'success');
            form.reset();
            
            this.switchView('my-events');
        } catch (error) {
            console.error('Event creation failed:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleEventApproval(eventId, approve = true) {
        const action = approve ? 'approve' : 'reject';
        
        try {
            await this.apiCall(`/events/${eventId}/${action}`, {
                method: 'POST',
            });
            
            Utils.showToast(`Event ${action}d successfully!`, 'success');
            
            const eventCard = document.querySelector(`[data-event-id="${eventId}"]`);
            if (eventCard) {
                eventCard.remove();
            }
            
            const container = document.getElementById('pending-events-container');
            if (container && container.children.length === 0) {
                container.innerHTML = '<div class="empty-state">No pending events for approval</div>';
            }
        } catch (error) {
            console.error(`Event ${action} failed:`, error);
        }
    }

    shareEvent(eventId) {
        const eventUrl = `${window.location.origin}/event.html?id=${eventId}`;
        Utils.copyToClipboard(eventUrl);
        
        // Show share options
        if (navigator.share) {
            navigator.share({
                title: 'Check out this event!',
                text: 'I found this interesting event you might like:',
                url: eventUrl,
            });
        }
    }

    addToCalendar(event) {
        const calendarUrl = Utils.generateCalendarLink(event);
        window.open(calendarUrl, '_blank');
    }

    // Search and Filters
    handleGlobalSearch(query) {
        if (!query.trim()) {
            this.loadEvents();
            return;
        }

        const filteredEvents = this.currentEvents.filter(event =>
            event.title.toLowerCase().includes(query.toLowerCase()) ||
            event.description.toLowerCase().includes(query.toLowerCase()) ||
            event.organizer?.name.toLowerCase().includes(query.toLowerCase())
        );

        const container = document.getElementById('events-container');
        if (container) {
            this.displayEvents(filteredEvents, container);
        }
    }

    handleUserSearch(query) {
        // This would typically call an API endpoint for user search
        console.log('Searching users:', query);
        // For now, we'll just filter the existing users list
    }

    applyFilters() {
        const categoryFilter = document.getElementById('category-filter');
        const sortFilter = document.getElementById('sort-filter');
        
        let filteredEvents = [...this.currentEvents];

        // Apply category filter
        if (categoryFilter.value) {
            filteredEvents = filteredEvents.filter(event => 
                event.category === categoryFilter.value
            );
        }

        // Apply sorting
        switch (sortFilter.value) {
            case 'upcoming':
                filteredEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
                break;
            case 'popular':
                filteredEvents.sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0));
                break;
            case 'newest':
            default:
                filteredEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }

        const container = document.getElementById('events-container');
        if (container) {
            this.displayEvents(filteredEvents, container);
        }
    }

    // AI Interest Detection
    async handleInterestAnalysis() {
        const input = document.getElementById('interest-input');
        const results = document.getElementById('interest-results');
        const detectedInterests = document.getElementById('detected-interests');
        const suggestedEvents = document.getElementById('ai-suggested-events');

        if (!input.value.trim()) {
            Utils.showToast('Please describe your interests first!', 'warning');
            return;
        }

        try {
            this.showLoading(true, 'ai');
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const interests = this.aiService.detectInterests(input.value);
            const analysis = this.aiService.getInterestAnalysis(interests);
            
            detectedInterests.innerHTML = Object.entries(interests)
                .sort(([,a], [,b]) => b - a)
                .map(([category, score]) => `
                    <div class="interest-tag">
                        ${this.formatCategory(category)} (${score}%)
                    </div>
                `).join('');
            
            Utils.showToast(analysis, 'info');
            
            const events = await this.apiCall('/events');
            const recommendedEvents = this.aiService.getRecommendedEvents(events);
            
            if (recommendedEvents.length > 0) {
                suggestedEvents.innerHTML = recommendedEvents
                    .map(event => this.createEventCard(event, true))
                    .join('');
                
                suggestedEvents.querySelectorAll('.btn-register').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const eventId = e.target.closest('.event-card').dataset.eventId;
                        this.handleEventRegistration(eventId);
                    });
                });
            } else {
                suggestedEvents.innerHTML = '<div class="empty-state">No events match your current interests. Try broadening your interests!</div>';
            }
            
            results.classList.remove('hidden');
            this.updateInterestProfile();
            this.updateInterestChart(interests);
            
        } catch (error) {
            console.error('Interest analysis failed:', error);
            Utils.showToast('Failed to analyze interests. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleAISuggestions() {
        const container = document.getElementById('events-container');
        if (!container) return;

        const topInterests = this.aiService.getTopInterests();
        if (topInterests.length === 0) {
            Utils.showToast('Please analyze your interests first in the AI Interests section!', 'warning');
            this.switchView('ai-interests');
            return;
        }

        try {
            this.showLoading(true, 'ai');
            const events = await this.apiCall('/events');
            const recommendedEvents = this.aiService.getRecommendedEvents(events);
            
            if (recommendedEvents.length === 0) {
                Utils.showToast('No events match your current interests.', 'info');
                return;
            }

            this.displayEvents(recommendedEvents, container);
            Utils.showToast(`Found ${recommendedEvents.length} events matching your interests!`, 'info');
        } catch (error) {
            console.error('Failed to load AI suggestions:', error);
            Utils.showToast('Failed to load AI suggestions', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateInterestProfile() {
        const interestProfile = document.getElementById('interest-profile');
        if (!interestProfile) return;

        const topInterests = this.aiService.getTopInterests(5);
        
        if (topInterests.length === 0) {
            interestProfile.innerHTML = '<p class="empty-state">No interests detected yet. Use the analyzer above to discover your interests!</p>';
            return;
        }

        const interestNames = {
            dance: "Dance & Performing Arts",
            music: "Music & Singing",
            sports: "Sports & Fitness",
            technology: "Technology & Coding",
            art: "Art & Design",
            academic: "Academic & Workshops",
            social: "Social & Cultural"
        };

        interestProfile.innerHTML = `
            <div class="interest-stats">
                ${topInterests.map(interest => `
                    <div class="interest-stat">
                        <strong>${interestNames[interest.category] || interest.category}</strong>
                        <span class="interest-match">${interest.score}% match</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateInterestChart(interests) {
        const canvas = document.getElementById('interest-chart');
        if (!canvas) return;

        const labels = Object.keys(interests).map(cat => this.formatCategory(cat));
        const data = Object.values(interests);

        if (this.interestChart) {
            this.interestChart.destroy();
        }

        this.interestChart = ChartService.createPieChart('interest-chart', data, labels);
    }

    // Analytics
    async loadOrganizerAnalytics() {
        try {
            const events = await this.apiCall('/events');
            const myEvents = events.filter(event => event.organizer?.id === this.currentUser.id);
            
            document.getElementById('organizer-total-events').textContent = myEvents.length;
            
            const totalAttendees = myEvents.reduce((sum, event) => sum + (event.registeredCount || 0), 0);
            document.getElementById('organizer-total-attendees').textContent = totalAttendees;
            
            const avgAttendance = myEvents.length > 0 ? 
                Math.round((totalAttendees / myEvents.reduce((sum, event) => sum + event.capacity, 0)) * 100) : 0;
            document.getElementById('organizer-avg-attendance').textContent = `${avgAttendance}%`;

            // Create charts
            this.createOrganizerCharts(myEvents);
        } catch (error) {
            console.error('Failed to load organizer analytics:', error);
        }
    }

    async loadAdminAnalytics() {
        try {
            const events = await this.apiCall('/events');
            // In a real app, you would also fetch users
            const users = []; // This would come from an API
            
            document.getElementById('admin-total-events').textContent = events.length;
            document.getElementById('admin-total-users').textContent = users.length;
            
            const approvedEvents = events.filter(event => event.status === 'APPROVED').length;
            const approvalRate = events.length > 0 ? Math.round((approvedEvents / events.length) * 100) : 0;
            document.getElementById('admin-approval-rate').textContent = `${approvalRate}%`;

            // Create charts
            this.createAdminCharts(events);
        } catch (error) {
            console.error('Failed to load admin analytics:', error);
        }
    }

    createOrganizerCharts(events) {
        // Registration trend chart
        const registrationData = events.map(event => event.registeredCount || 0);
        const eventNames = events.map(event => event.title);
        
        if (this.organizerRegistrationsChart) {
            this.organizerRegistrationsChart.destroy();
        }
        this.organizerRegistrationsChart = ChartService.createBarChart(
            'organizer-registrations-chart',
            registrationData,
            eventNames
        );

        // Category distribution
        const categories = {};
        events.forEach(event => {
            categories[event.category] = (categories[event.category] || 0) + 1;
        });
        
        if (this.organizerCategoriesChart) {
            this.organizerCategoriesChart.destroy();
        }
        this.organizerCategoriesChart = ChartService.createPieChart(
            'organizer-categories-chart',
            Object.values(categories),
            Object.keys(categories).map(cat => this.formatCategory(cat))
        );
    }

    createAdminCharts(events) {
        // Events by category
        const categories = {};
        events.forEach(event => {
            categories[event.category] = (categories[event.category] || 0) + 1;
        });
        
        if (this.adminCategoriesChart) {
            this.adminCategoriesChart.destroy();
        }
        this.adminCategoriesChart = ChartService.createPieChart(
            'admin-categories-chart',
            Object.values(categories),
            Object.keys(categories).map(cat => this.formatCategory(cat))
        );

        // Monthly registrations (simplified)
        const monthlyData = [65, 59, 80, 81, 56, 55, 40, 45, 60, 75, 80, 85];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        if (this.adminRegistrationsChart) {
            this.adminRegistrationsChart.destroy();
        }
        this.adminRegistrationsChart = ChartService.createLineChart(
            'admin-registrations-chart',
            monthlyData,
            months
        );
    }

    // User Management
    async loadUsers() {
        // In a real app, this would fetch users from an API
        // For now, we'll simulate some user data
        const simulatedUsers = [
            { id: 1, name: 'John Doe', email: 'john@university.edu', role: 'STUDENT' },
            { id: 2, name: 'Jane Smith', email: 'jane@university.edu', role: 'ORGANIZER' },
            { id: 3, name: 'Admin User', email: 'admin@university.edu', role: 'ADMIN' },
        ];

        const container = document.getElementById('users-container');
        if (!container) return;

        container.innerHTML = simulatedUsers.map(user => `
            <div class="user-card">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff" 
                     alt="${user.name}" class="user-avatar">
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-email">${user.email}</div>
                </div>
                <div class="user-role role-${user.role.toLowerCase()}">${user.role}</div>
            </div>
        `).join('');
    }

    // Utility Methods
    formatCategory(category) {
        const categoryMap = {
            music: 'Music & Singing',
            dance: 'Dance & Performing Arts',
            sports: 'Sports & Fitness',
            technology: 'Technology & Coding',
            art: 'Art & Design',
            academic: 'Academic & Workshops',
            social: 'Social & Cultural',
            other: 'Other'
        };
        return categoryMap[category] || category;
    }

    editEvent(eventId) {
        // Implementation for editing events
        Utils.showToast('Edit event functionality coming soon!', 'info');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cemsApp = new CEMSApp();
});

// Global functions for HTML onclick handlers
window.shareEvent = (eventId) => window.cemsApp.shareEvent(eventId);
window.addToCalendar = (event) => window.cemsApp.addToCalendar(event);