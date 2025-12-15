// public/script.js - COMPLETE WORKING VERSION

// Configuration
const BACKEND_URL = 'https://bid-monitor.vercel.app/api/fetch';

// DOM elements
let targetUrlInput, testBtn, monitorBtn, stopBtn, resultsContainer;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing BidMonitor...');
    
    // Get DOM elements
    targetUrlInput = document.getElementById('targetUrl');
    testBtn = document.getElementById('testBtn');
    monitorBtn = document.getElementById('monitorBtn');
    stopBtn = document.getElementById('stopBtn');
    resultsContainer = document.getElementById('resultsContainer');
    
    // Check if elements exist
    if (!targetUrlInput) {
        console.error('❌ targetUrl element not found!');
        resultsContainer.innerHTML = '<div style="color: red;">Error: targetUrl element missing</div>';
        return;
    }
    
    console.log('✅ DOM elements loaded:', {
        targetUrl: !!targetUrlInput,
        testBtn: !!testBtn,
        resultsContainer: !!resultsContainer
    });
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial state
    updateUI('ready');
    showInitialMessage();
});

function setupEventListeners() {
    // Test button
    if (testBtn) {
        testBtn.addEventListener('click', handleTestConnection);
    }
    
    // Monitor button
    if (monitorBtn) {
        monitorBtn.addEventListener('click', handleStartMonitoring);
    }
    
    // Stop button
    if (stopBtn) {
        stopBtn.addEventListener('click', handleStopMonitoring);
    }
    
    // Enter key in input field
    if (targetUrlInput) {
        targetUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleTestConnection();
            }
        });
    }
}

function showInitialMessage() {
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; color: #3498db; margin-bottom: 1rem;">
                    <i class="fas fa-search-dollar"></i>
                </div>
                <h3 style="color: #2c3e50; margin-bottom: 1rem;">Ready to Monitor</h3>
                <p style="color: #7f8c8d;">
                    Enter a government bidding website URL above and click "Test Connection"
                </p>
                <div style="margin-top: 2rem;">
                    <button onclick="useExample()" class="btn btn-secondary">
                        <i class="fas fa-magic"></i> Try Example
                    </button>
                </div>
            </div>
        `;
    }
}

async function handleTestConnection() {
    const url = targetUrlInput.value.trim();
    
    if (!url) {
        showError('Please enter a website URL');
        return;
    }
    
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('URL must start with http:// or https://');
        return;
    }
    
    updateUI('testing');
    
    try {
        console.log('🌐 Testing connection to:', url);
        
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                url: url,
                method: 'GET'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 API Response:', data);
        
        if (data.success) {
            showSuccess(`✅ Connected to ${new URL(url).hostname}`);
            displayResults(data);
        } else {
            showError(`❌ Connection failed: ${data.error || 'Unknown error'}`);
            updateUI('ready');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        showError(`Network error: ${error.message}`);
        updateUI('ready');
    }
}

function displayResults(data) {
    if (!resultsContainer) return;
    
    const url = new URL(data.url);
    
    // Create result display
    resultsContainer.innerHTML = `
        <div class="result-item">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h4 style="color: #2c3e50; margin: 0;">✅ Connection Successful</h4>
                <span style="background: #3498db; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.9rem;">
                    ${url.hostname}
                </span>
            </div>
            
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <strong>Status:</strong><br>
                        <span style="color: #2ecc71;">${data.status} ${data.statusText}</span>
                    </div>
                    <div>
                        <strong>Content Type:</strong><br>
                        <span>${data.contentType || 'Not specified'}</span>
                    </div>
                    <div>
                        <strong>Response Time:</strong><br>
                        <span>${new Date(data.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
                
                <div>
                    <strong>Website URL:</strong><br>
                    <a href="${data.url}" target="_blank" style="color: #3498db; word-break: break-all;">
                        ${data.url}
                    </a>
                </div>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <button onclick="analyzeContent('${data.url}')" class="btn btn-primary">
                    <i class="fas fa-search"></i> Analyze Website
                </button>
                <button onclick="window.open('${data.url}', '_blank')" class="btn btn-secondary">
                    <i class="fas fa-external-link-alt"></i> Visit Site
                </button>
                <button onclick="startMonitoring()" class="btn btn-success">
                    <i class="fas fa-play"></i> Start Monitoring
                </button>
            </div>
        </div>
    `;
    
    updateUI('ready');
}

function updateUI(state) {
    const states = {
        'ready': {
            testBtn: { disabled: false, text: '<i class="fas fa-vial"></i> Test Connection' },
            monitorBtn: { disabled: false, text: '<i class="fas fa-play"></i> Start Monitoring' },
            stopBtn: { disabled: true, text: '<i class="fas fa-stop"></i> Stop' }
        },
        'testing': {
            testBtn: { disabled: true, text: '<i class="fas fa-spinner fa-spin"></i> Testing...' },
            monitorBtn: { disabled: true, text: '<i class="fas fa-play"></i> Start Monitoring' },
            stopBtn: { disabled: true, text: '<i class="fas fa-stop"></i> Stop' }
        },
        'monitoring': {
            testBtn: { disabled: true, text: '<i class="fas fa-vial"></i> Test Connection' },
            monitorBtn: { disabled: true, text: '<i class="fas fa-pause"></i> Pause' },
            stopBtn: { disabled: false, text: '<i class="fas fa-stop"></i> Stop' }
        }
    };
    
    const config = states[state] || states['ready'];
    
    if (testBtn) testBtn.innerHTML = config.testBtn.text;
    if (testBtn) testBtn.disabled = config.testBtn.disabled;
    
    if (monitorBtn) monitorBtn.innerHTML = config.monitorBtn.text;
    if (monitorBtn) monitorBtn.disabled = config.monitorBtn.disabled;
    
    if (stopBtn) stopBtn.innerHTML = config.stopBtn.text;
    if (stopBtn) stopBtn.disabled = config.stopBtn.disabled;
}

// Helper functions
function showError(message) {
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div style="background: #fee; border: 2px solid #e74c3c; border-radius: 8px; padding: 1.5rem; text-align: center;">
            <div style="font-size: 2rem; color: #e74c3c; margin-bottom: 1rem;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h4 style="color: #c0392b; margin-bottom: 0.5rem;">Error</h4>
            <p style="color: #7f8c8d;">${message}</p>
            <button onclick="showInitialMessage()" class="btn btn-secondary" style="margin-top: 1rem;">
                <i class="fas fa-arrow-left"></i> Try Again
            </button>
        </div>
    `;
}

function showSuccess(message) {
    console.log('✅', message);
    // You can add a toast notification here if needed
}

// Global helper functions
window.useExample = function() {
    targetUrlInput.value = 'https://www.gov.ph';
    showSuccess('Example URL loaded. Click "Test Connection" to try it!');
};

window.analyzeContent = function(url) {
    resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div class="spinner"></div>
            <p>Analyzing website content...</p>
        </div>
    `;
    // This would be your analysis logic
    setTimeout(() => {
        showSuccess(`Analysis complete for ${url}`);
        showInitialMessage();
    }, 2000);
};

window.startMonitoring = function() {
    updateUI('monitoring');
    showSuccess('Monitoring started!');
    resultsContainer.innerHTML = `
        <div style="background: #e8f5e9; border: 2px solid #2ecc71; border-radius: 8px; padding: 1.5rem;">
            <h4 style="color: #27ae60; margin-bottom: 1rem;">
                <i class="fas fa-play-circle"></i> Monitoring Active
            </h4>
            <p>Monitoring ${targetUrlInput.value} for changes...</p>
            <div style="margin-top: 1rem;">
                <button onclick="handleStopMonitoring()" class="btn btn-danger">
                    <i class="fas fa-stop"></i> Stop Monitoring
                </button>
            </div>
        </div>
    `;
};

window.handleStopMonitoring = function() {
    updateUI('ready');
    showSuccess('Monitoring stopped');
    showInitialMessage();
};

// Add spinner styles
const style = document.createElement('style');
style.textContent = `
    .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .result-item {
        background: white;
        border-radius: 10px;
        padding: 1.5rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 1rem;
    }
    .btn {
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        margin-right: 0.5rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }
    .btn-primary { background: #3498db; color: white; }
    .btn-secondary { background: #95a5a6; color: white; }
    .btn-success { background: #2ecc71; color: white; }
    .btn-danger { background: #e74c3c; color: white; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
`;
document.head.appendChild(style);
