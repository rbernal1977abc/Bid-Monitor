// script.js - Complete BidMonitor Frontend Logic

class BidMonitor {
    constructor() {
        // IMPORTANT: Replace with your Vercel backend URL
        this.BACKEND_URL = 'https://your-vercel-app.vercel.app/api/fetch';
        
        this.state = {
            isMonitoring: false,
            monitoringInterval: null,
            results: [],
            websites: [],
            stats: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                lastCheck: null
            }
        };
        
        this.init();
    }
    
    init() {
        this.loadState();
        this.bindEvents();
        this.updateUI();
        this.renderWebsites();
        
        // Set initial UI states
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('resultsControls').style.display = 'none';
    }
    
    bindEvents() {
        // Configuration buttons
        document.getElementById('testBtn').addEventListener('click', () => this.testConnection());
        document.getElementById('monitorBtn').addEventListener('click', () => this.toggleMonitoring());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopMonitoring());
        
        // Results controls
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyResults());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResults());
        
        // Website management
        document.getElementById('addWebsiteBtn').addEventListener('click', () => this.addCurrentWebsite());
        
        // Form toggles
        document.getElementById('loginToggle').addEventListener('click', () => this.toggleLoginSection());
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePasswordVisibility());
        
        // Example buttons
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.dataset.url;
                document.getElementById('targetUrl').value = url;
                this.showNotification(`Example URL loaded: ${url}`, 'success');
            });
        });
        
        // Modal controls
        document.getElementById('helpBtn').addEventListener('click', () => this.showModal('helpModal'));
        document.getElementById('settingsBtn').addEventListener('click', () => this.showModal('settingsModal'));
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
        
        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Footer links
        document.getElementById('privacyLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showNotification('Privacy policy page would open here', 'info');
        });
        
        document.getElementById('termsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showNotification('Terms of service page would open here', 'info');
        });
        
        document.getElementById('reportLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('reportModal');
        });
    }
    
    async testConnection() {
        const url = this.getTargetUrl();
        if (!url) return this.showError('Please enter a valid URL');
        
        const btn = document.getElementById('testBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            
            const result = await this.fetchWebsite(url);
            
            if (result.success) {
                this.showSuccess(`✅ Successfully connected to ${new URL(url).hostname}`);
                this.displayTestResult(result);
            } else {
                this.showError(`Connection failed: ${result.error}`);
            }
        } catch (error) {
            this.showError(`Test failed: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
    
    async fetchWebsite(url, options = {}) {
        this.state.stats.totalRequests++;
        this.updateStats();
        
        const payload = {
            url: url,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        // Add Basic Auth if credentials provided
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (username && password) {
            payload.headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);
        }
        
        try {
            const response = await fetch(this.BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.state.stats.failedRequests++;
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            this.state.stats.successfulRequests++;
            this.state.stats.lastCheck = new Date().toISOString();
            this.updateStats();
            
            return data;
        } catch (error) {
            this.state.stats.failedRequests++;
            this.updateStats();
            throw error;
        }
    }
    
    displayTestResult(result) {
        const container = document.getElementById('resultsContainer');
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(result.content, 'text/html');
        
        // Extract potential bidding information
        const biddingElements = this.extractBiddingInfo(doc);
        
        if (biddingElements.length > 0) {
            container.innerHTML = '';
            biddingElements.slice(0, 10).forEach((element, index) => {
                const item = this.createResultItem({
                    id: `test-${Date.now()}-${index}`,
                    title: element.title || 'Bidding Opportunity',
                    url: element.url || result.url,
                    source: new URL(result.url).hostname,
                    description: element.description || 'Found during test scan',
                    date: new Date().toLocaleString(),
                    type: 'test'
                });
                container.appendChild(item);
            });
            
            if (biddingElements.length > 10) {
                const moreText = document.createElement('div');
                moreText.className = 'text-center mt-3';
                moreText.innerHTML = `<small class="text-muted">... and ${biddingElements.length - 10} more items found</small>`;
                container.appendChild(moreText);
            }
        } else {
            container.innerHTML = `
                <div class="result-item">
                    <div class="result-header">
                        <div class="result-title">Test Connection Successful</div>
                        <div class="result-source">${new URL(result.url).hostname}</div>
                    </div>
                    <p>✅ Website is accessible. No specific bidding elements detected automatically.</p>
                    <div class="result-details">
                        <div class="detail-item">
                            <i class="fas fa-code"></i>
                            <span>Status: ${result.status} ${result.statusText}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-download"></i>
                            <span>Size: ${(result.size / 1024).toFixed(2)} KB</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>Response Time: ${result.timestamp}</span>
                        </div>
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-sm btn-primary" onclick="window.open('${result.url}', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Visit Website
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="bidMonitor.analyzeContent('${result.url}')">
                            <i class="fas fa-search"></i> Deep Analyze
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('resultsControls').style.display = 'flex';
    }
    
    extractBiddingInfo(doc) {
        const elements = [];
        
        // Look for common bidding-related elements
        const selectors = [
            'a[href*="bid"]',
            'a[href*="tender"]',
            'a[href*="rfp"]',
            'a[href*="procurement"]',
            'a[href*="contract"]',
            'a[href*="opportunity"]',
            'a:contains("BID")',
            'a:contains("Tender")',
            'a:contains("RFP")',
            'a:contains("RFQ")',
            'a:contains("Notice")',
            'a:contains("Advertisement")',
            'table tr', // Table rows might contain bidding info
            '.tender', '.bid', '.opportunity', // Common CSS classes
            '[class*="tender"]', '[class*="bid"]', '[class*="opportunity"]' // Partial class matches
        ];
        
        selectors.forEach(selector => {
            try {
                const found = doc.querySelectorAll(selector);
                found.forEach(el => {
                    if (el.textContent && el.textContent.trim().length > 10) {
                        const url = el.href || el.getAttribute('href') || '#';
                        elements.push({
                            title: el.textContent.trim().substring(0, 100),
                            description: el.textContent.trim(),
                            url: url.startsWith('http') ? url : new URL(url, window.location.origin).href,
                            element: el.outerHTML.substring(0, 200)
                        });
                    }
                });
            } catch (e) {
                // Ignore invalid selectors
            }
        });
        
        // Remove duplicates based on URL
        const uniqueElements = [];
        const seenUrls = new Set();
        
        elements.forEach(el => {
            if (!seenUrls.has(el.url)) {
                seenUrls.add(el.url);
                uniqueElements.push(el);
            }
        });
        
        return uniqueElements.slice(0, 50); // Limit to 50 items
    }
    
    createResultItem(data) {
        const div = document.createElement('div');
        div.className = 'result-item fade-in';
        div.innerHTML = `
            <div class="result-header">
                <div class="result-title">${this.escapeHtml(data.title)}</div>
                <div class="result-source">${this.escapeHtml(data.source)}</div>
            </div>
            <p class="result-description">${this.escapeHtml(data.description)}</p>
            <div class="result-details">
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${data.date}</span>
                </div>
                ${data.deadline ? `
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Deadline: ${data.deadline}</span>
                </div>
                ` : ''}
                ${data.budget ? `
                <div class="detail-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>${data.budget}</span>
                </div>
                ` : ''}
            </div>
            <div class="result-actions">
                <button class="btn btn-sm btn-primary" onclick="window.open('${data.url}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> View Details
                </button>
                <button class="btn btn-sm btn-outline" onclick="bidMonitor.saveResult('${data.id}')">
                    <i class="far fa-bookmark"></i> Save
                </button>
            </div>
        `;
        return div;
    }
    
    toggleMonitoring() {
        if (this.state.isMonitoring) {
            this.stopMonitoring();
        } else {
            this.startMonitoring();
        }
    }
    
    async startMonitoring() {
        const url = this.getTargetUrl();
        if (!url) return this.showError('Please enter a valid URL');
        
        // Add to websites if not already there
        if (!this.state.websites.some(w => w.url === url)) {
            this.addCurrentWebsite();
        }
        
        this.state.isMonitoring = true;
        const frequency = parseInt(document.getElementById('frequency').value);
        
        if (frequency > 0) {
            this.state.monitoringInterval = setInterval(() => {
                this.checkForUpdates();
            }, frequency);
        }
        
        // Do initial check
        await this.checkForUpdates();
        
        this.updateUI();
        this.showSuccess('Monitoring started!');
    }
    
    async checkForUpdates() {
        const url = this.getTargetUrl();
        const keywords = this.getKeywords();
        
        try {
            const result = await this.fetchWebsite(url);
            
            if (result.success && result.contentType.includes('text/html')) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(result.content, 'text/html');
                
                // Check for new content based on keywords
                const newItems = this.findNewItems(doc, keywords);
                
                if (newItems.length > 0) {
                    newItems.forEach(item => {
                        const project = {
                            id: `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            title: item.title,
                            url: item.url,
                            source: new URL(url).hostname,
                            description: item.description,
                            date: new Date().toLocaleString(),
                            content: item.content,
                            type: 'monitor'
                        };
                        
                        // Add to results if not duplicate
                        const isDuplicate = this.state.results.some(r => 
                            r.title === project.title && r.url === project.url
                        );
                        
                        if (!isDuplicate) {
                            this.state.results.unshift(project);
                            this.showNotification(`New opportunity found: ${project.title}`, 'success');
                        }
                    });
                    
                    this.saveState();
                    this.displayResults();
                }
            }
            
            // Update last check time
            document.getElementById('lastCheckTime').textContent = 
                new Date().toLocaleTimeString();
            
        } catch (error) {
            console.error('Monitoring check failed:', error);
            this.showError(`Check failed: ${error.message}`, false);
        }
    }
    
    findNewItems(doc, keywords) {
        const items = [];
        
        // Simple keyword matching in page content
        const pageText = doc.body.textContent.toLowerCase();
        const hasKeywords = keywords.length === 0 || 
                          keywords.some(keyword => pageText.includes(keyword.toLowerCase()));
        
        if (hasKeywords) {
            // Extract links that might be bidding opportunities
            const links = Array.from(doc.querySelectorAll('a'));
            links.forEach(link => {
                const text = link.textContent.toLowerCase();
                const href = link.getAttribute('href');
                
                if (href && (text.includes('bid') || text.includes('tender') || 
                    text.includes('rfp') || text.includes('procurement'))) {
                    
                    items.push({
                        title: link.textContent.trim() || 'Bidding Opportunity',
                        url: href.startsWith('http') ? href : new URL(href, window.location.origin).href,
                        description: `Found during monitoring of ${new URL(window.location.href).hostname}`,
                        content: link.outerHTML
                    });
                }
            });
            
            // If no specific links found, create a general entry
            if (items.length === 0) {
                items.push({
                    title: doc.title || 'Updated Content',
                    url: window.location.href,
                    description: 'Page content updated with matching keywords',
                    content: doc.body.innerHTML.substring(0, 500) + '...'
                });
            }
        }
        
        return items;
    }
    
    stopMonitoring() {
        this.state.isMonitoring = false;
        
        if (this.state.monitoringInterval) {
            clearInterval(this.state.monitoringInterval);
            this.state.monitoringInterval = null;
        }
        
        this.updateUI();
        this.showSuccess('Monitoring stopped');
    }
    
    displayResults() {
        const container = document.getElementById('resultsContainer');
        const controls = document.getElementById('resultsControls');
        
        if (this.state.results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h4>No Results Yet</h4>
                    <p>Configure a website and start monitoring to see live bidding opportunities.</p>
                </div>
            `;
            controls.style.display = 'none';
            return;
        }
        
        container.innerHTML = '';
        controls.style.display = 'flex';
        
        this.state.results.slice(0, 20).forEach(result => {
            const item = this.createResultItem(result);
            container.appendChild(item);
        });
        
        if (this.state.results.length > 20) {
            const moreText = document.createElement('div');
            moreText.className = 'text-center mt-4';
            moreText.innerHTML = `
                <button class="btn btn-sm btn-outline" onclick="bidMonitor.showAllResults()">
                    Show All ${this.state.results.length} Results
                </button>
            `;
            container.appendChild(moreText);
        }
        
        document.getElementById('resultCount').textContent = this.state.results.length;
    }
    
    showAllResults() {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = '';
        
        this.state.results.forEach(result => {
            const item = this.createResultItem(result);
            container.appendChild(item);
        });
    }
    
    exportResults() {
        if (this.state.results.length === 0) return;
        
        const csv = this.convertToCSV(this.state.results);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = `bidmonitor-results-${new Date().toISOString().split('T')[0]}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess(`Exported ${this.state.results.length} results to CSV`);
    }
    
    copyResults() {
        if (this.state.results.length === 0) return;
        
        const text = this.state.results.map(r => 
            `${r.title}\n${r.url}\n${r.description}\n${r.date}\n\n`
        ).join('');
        
        navigator.clipboard.writeText(text).then(() => {
            this.showSuccess('Results copied to clipboard');
        });
    }
    
    clearResults() {
        if (!confirm('Are you sure you want to clear all results? This cannot be undone.')) {
            return;
        }
        
        this.state.results = [];
        this.saveState();
        this.displayResults();
        this.showSuccess('All results cleared');
    }
    
    convertToCSV(data) {
        const headers = ['Title', 'URL', 'Source', 'Date', 'Description'];
        const rows = data.map(item => [
            `"${item.title.replace(/"/g, '""')}"`,
            `"${item.url.replace(/"/g, '""')}"`,
            `"${item.source.replace(/"/g, '""')}"`,
            `"${item.date.replace(/"/g, '""')}"`,
            `"${item.description.replace(/"/g, '""')}"`
        ]);
        
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    addCurrentWebsite() {
        const url = this.getTargetUrl();
        const name = document.getElementById('targetUrl').value.replace(/^https?:\/\//, '').split('/')[0];
        
        if (!url) return this.showError('Please enter a valid URL first');
        
        const website = {
            id: `website-${Date.now()}`,
            name: name,
            url: url,
            added: new Date().toISOString(),
            lastChecked: null
        };
        
        // Check if already exists
        if (this.state.websites.some(w => w.url === url)) {
            this.showNotification('Website already in your list', 'info');
            return;
        }
        
        this.state.websites.unshift(website);
        this.saveState();
        this.renderWebsites();
        this.showSuccess(`Added ${name} to your websites`);
    }
    
    renderWebsites() {
        const container = document.getElementById('websitesList');
        
        if (this.state.websites.length === 0) {
            container.innerHTML = `
                <div class="empty-websites">
                    <i class="fas fa-bookmark"></i>
                    <p>No saved websites yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        this.state.websites.forEach(website => {
            const item = document.createElement('div');
            item.className = 'website-item';
            item.innerHTML = `
                <div class="website-icon">
                    <i class="fas fa-globe"></i>
                </div>
                <div class="website-info">
                    <div class="website-name">${this.escapeHtml(website.name)}</div>
                    <div class="website-url">${this.escapeHtml(website.url)}</div>
                </div>
                <div class="website-actions">
                    <button class="btn btn-sm btn-outline" onclick="bidMonitor.loadWebsite('${website.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="bidMonitor.removeWebsite('${website.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
        
        document.getElementById('websiteCount').textContent = this.state.websites.length;
    }
    
    loadWebsite(id) {
        const website = this.state.websites.find(w => w.id === id);
        if (website) {
            document.getElementById('targetUrl').value = website.url;
            this.showNotification(`Loaded website: ${website.name}`, 'success');
        }
    }
    
    removeWebsite(id) {
        if (!confirm('Remove this website from your list?')) return;
        
        this.state.websites = this.state.websites.filter(w => w.id !== id);
        this.saveState();
        this.renderWebsites();
        this.showSuccess('Website removed');
    }
    
    updateUI() {
        const statusDot = document.getElementById('globalStatusDot');
        const statusText = document.getElementById('globalStatusText');
        const monitorBtn = document.getElementById('monitorBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (this.state.isMonitoring) {
            statusDot.className = 'status-dot active';
            statusText.textContent = 'Monitoring Active';
            monitorBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            stopBtn.disabled = false;
        } else {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Ready';
            monitorBtn.innerHTML = '<i class="fas fa-play"></i> Start Monitoring';
            stopBtn.disabled = true;
        }
        
        // Update stats display
        this.updateStats();
    }
    
    updateStats() {
        document.getElementById('successCount').textContent = this.state.stats.successfulRequests;
        document.getElementById('errorCount').textContent = this.state.stats.failedRequests;
        
        const total = this.state.stats.totalRequests;
        const successRate = total > 0 ? 
            Math.round((this.state.stats.successfulRequests / total) * 100) : 100;
        
        document.getElementById('uptimePercent').textContent = `${successRate}%`;
        
        if (this.state.stats.lastCheck) {
            const lastCheck = new Date(this.state.stats.lastCheck);
            document.getElementById('lastCheckTime').textContent = lastCheck.toLocaleTimeString();
        }
    }
    
    // Utility Methods
    getTargetUrl() {
        const url = document.getElementById('targetUrl').value.trim();
        if (!url) return null;
        
        try {
            new URL(url);
            return url;
        } catch {
            this.showError('Please enter a valid URL (include http:// or https://)');
            return null;
        }
    }
    
    getKeywords() {
        const keywords = document.getElementById('keywords').value;
        return keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    toggleLoginSection() {
        const section = document.getElementById('loginSection');
        const toggle = document.getElementById('loginToggle');
        const icon = toggle.querySelector('.toggle-icon');
        
        if (section.style.display === 'block') {
            section.style.display = 'none';
            toggle.classList.remove('active');
            icon.style.transform = 'rotate(0deg)';
        } else {
            section.style.display = 'block';
            toggle.classList.add('active');
            icon.style.transform = 'rotate(180deg)';
        }
    }
    
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePassword');
        const icon = toggleBtn.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const types = {
            success: { icon: 'check-circle', color: '#2ecc71' },
            error: { icon: 'exclamation-circle', color: '#e74c3c' },
            warning: { icon: 'exclamation-triangle', color: '#f39c12' },
            info: { icon: 'info-circle', color: '#3498db' }
        };
        
        const config = types[type] || types.info;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${config.icon}"></i>
            <div class="notification-content">
                <div class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    saveState() {
        try {
            const state = {
                websites: this.state.websites,
                results: this.state.results.slice(0, 100), // Keep last 100
                stats: this.state.stats
            };
            localStorage.setItem('bidmonitor_state', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }
    
    loadState() {
        try {
            const saved = localStorage.getItem('bidmonitor_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.state.websites = state.websites || [];
                this.state.results = state.results || [];
                this.state.stats = state.stats || this.state.stats;
            }
        } catch (error) {
            console.error('Failed to load state:', error);
        }
    }
    
    // Public methods for button clicks
    saveResult(id) {
        const result = this.state.results.find(r => r.id === id);
        if (result) {
            this.showNotification(`Saved: ${result.title}`, 'success');
        }
    }
    
    analyzeContent(url) {
        this.showNotification('Deep analysis would run here', 'info');
    }
    
    tryExample() {
        document.getElementById('targetUrl').value = 'https://notices.philgeps.gov.ph';
        this.showNotification('Example loaded. Click "Test Connection" to try it!', 'info');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.bidMonitor = new BidMonitor();
    
    // Global helper functions
    window.tryExample = () => window.bidMonitor.tryExample();
});
