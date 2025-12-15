const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for the main endpoint
  if (req.method !== 'POST') {
    return res.status(200).json({
      status: 'online',
      service: 'BidMonitor API',
      version: '1.0.0',
      endpoint: 'POST /api/fetch'
    });
  }

  try {
    const { url, method = 'GET', headers = {}, data: requestData } = req.body;
    
    // Validate URL
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'Valid URL is required (must start with http:// or https://)'
      });
    }

    // Security: Prevent localhost access in production
    if (process.env.NODE_ENV === 'production') {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        return res.status(400).json({
          success: false,
          error: 'Access to localhost is not allowed in production'
        });
      }
    }

    // Configure request headers
    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...headers
    };

    // Make the request
    const response = await axios({
      method: method.toUpperCase(),
      url: url,
      headers: requestHeaders,
      data: requestData,
      timeout: 30000, // 30 seconds timeout
      maxRedirects: 5,
      validateStatus: () => true // Accept all status codes
    });

    // Get content type
    const contentType = response.headers['content-type'] || '';
    const isHtml = contentType.includes('text/html');
    
    // Prepare response
    const result = {
      success: true,
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      contentType: contentType,
      content: isHtml ? response.data : response.data.toString(),
      headers: response.headers,
      timestamp: new Date().toISOString(),
      size: response.data.length
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Determine error type
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.code === 'ECONNREFUSED') {
      statusCode = 503;
      errorMessage = 'Connection refused - the website may be down or blocking requests';
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 404;
      errorMessage = 'Domain not found - check the URL';
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = 504;
      errorMessage = 'Request timeout - the website took too long to respond';
    } else if (error.response) {
      // Server responded with error status
      statusCode = error.response.status;
      errorMessage = `Server responded with ${error.response.status}`;
    } else if (error.request) {
      statusCode = 502;
      errorMessage = 'No response received from target server';
    } else {
      errorMessage = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
};
