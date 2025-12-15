// Configuration
const BACKEND_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api/fetch'
    : '/api/fetch'; // Use relative path for Vercel

// Global state
let isMonitoring = false;
let monitoringInterval = null;

async function testConnection() {
    const url = document.getElementById('targetUrl').value.trim();
    if (!url) return showNotification('Please enter a URL', 'error');
    
    showLoading('Testing connection...');
    
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`✅ Connected to ${new URL(url).hostname}`, 'success');
            displayResult(data);
        } else {
            showNotification(`❌ Connection failed: ${data.error}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Network error: ${error.message}`, 'error');
    }
}

function displayResult(data) {
    const container = document.getElementById('resultsContainer');
    
    if (data.contentType.includes('text/html')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.content, 'text/html');
        
        // Find potential bidding links
        const links = Array.from(doc.querySelectorAll('a')).filter(link => {
            const text = link.textContent.toLowerCase();
            return text.includes('bid') || text.includes('tender') || text.includes('rfp');
        });
        
        if (links.length > 0) {
            container.innerHTML = '<h3>Found Bidding Opportunities:</h3>';
            links.slice(0, 10).forEach(link => {
                const item = document.createElement('div');
                item.className = 'result-item';
                item.innerHTML = `
                    <h4>${link.textContent.substring(0, 100)}</h4>
                    <p>${link.href}</p>
                    <button onclick="window.open('${link.href}', '_blank')" class="btn btn-primary">
                        View Details
                    </button>
                `;
                container.appendChild(item);
            });
        } else {
            container.innerHTML = `
                <div class="result-item">
                    <h3>✅ Connection Successful</h3>
                    <p>Website: ${new URL(data.url).hostname}</p>
                    <p>Status: ${data.status} ${data.statusText}</p>
                    <p>No bidding-specific links found automatically.</p>
                    <button onclick="window.open('${data.url}', '_blank')" class="btn btn-primary">
                        Visit Website
                    </button>
                </div>
            `;
        }
    } else {
        container.innerHTML = `
            <div class="result-item">
                <h3>Non-HTML Content</h3>
                <p>Received: ${data.contentType}</p>
            </div>
        `;
    }
}

function startMonitoring() {
    const url = document.getElementById('targetUrl').value.trim();
    if (!url) return showNotification('Please enter a URL', 'error');
    
    isMonitoring = true;
    document.getElementById('stopBtn').disabled = false;
    
    // Check every 5 minutes
    monitoringInterval = setInterval(() => {
        checkForUpdates(url);
    }, 300000); // 5 minutes
    
    showNotification('✅ Monitoring started', 'success');
    checkForUpdates(url); // Initial check
}

function stopMonitoring() {
    isMonitoring = false;
    clearInterval(monitoringInterval);
    document.getElementById('stopBtn').disabled = true;
    showNotification('⏹️ Monitoring stopped', 'info');
}

async function checkForUpdates(url) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        if (data.success) {
            // Check if content changed (simplified)
            const lastContent = localStorage.getItem(`last_content_${url}`);
            if (lastContent !== data.content.substring(0, 1000)) {
                localStorage.setItem(`last_content_${url}`, data.content.substring(0, 1000));
                showNotification('🔄 Website content updated', 'info');
            }
        }
    } catch (error) {
        console.error('Update check failed:', error);
    }
}

// Utility functions
function showLoading(message) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.background = type === 'error' ? '#e74c3c' : 
                                   type === 'success' ? '#2ecc71' : '#3498db';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}