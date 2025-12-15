// Change this line
const BACKEND_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api/fetch'
    : '/api/fetch';  // This is correct for Vercel

// Your API call should look like this:
async function testConnection() {
    const url = document.getElementById('targetUrl').value.trim();
    
    const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
    });
    // ... rest of your code
}
