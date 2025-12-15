// api/fetch.js - Updated with CORS support
const axios = require('axios');

module.exports = async (req, res) => {
  // ----- 1. SET CORS HEADERS -----
  // Allow your frontend origin
  const allowedOrigin = 'https://bid-monitor.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache for 24 hours

  // ----- 2. HANDLE PREFLIGHT OPTIONS REQUESTS -----
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ----- 3. ORIGINAL API LOGIC (from here down) -----
  // Homepage route for GET requests to /api/fetch
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'BidMonitor API',
      version: '1.0.0',
      endpoint: 'POST /api/fetch'
    });
  }

  // Only accept POST for fetching URLs
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { url, method = 'GET', headers = {}, data: requestData } = req.body;
    
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({
        error: 'Valid URL is required (must start with http:// or https://)'
      });
    }

    // Configure request
    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      ...headers
    };

    // Make request
    const response = await axios({
      method: method.toUpperCase(),
      url: url,
      headers: requestHeaders,
      data: requestData,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true
    });

    // Return response
    res.json({
      success: true,
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers['content-type'] || '',
      content: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Proxy error:', error.message);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.code === 'ECONNREFUSED') {
      statusCode = 503;
      errorMessage = 'Connection refused';
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 404;
      errorMessage = 'Domain not found';
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = 504;
      errorMessage = 'Request timeout';
    } else if (error.response) {
      statusCode = error.response.status;
      errorMessage = `Server error: ${error.response.status}`;
    } else {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
};
