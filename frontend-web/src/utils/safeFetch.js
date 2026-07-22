import API_BASE from './config';

/**
 * Universal safe fetch function for EMAHU Web Client.
 * 1. Automatically resolves relative URLs (/api/...) against API_BASE.
 * 2. Automatically retries 502/503/504 cloud cold-start wakeups.
 * 3. Inspects response Content-Type to prevent "Unexpected token '<'" JSON parse crashes.
 * 4. Returns unified response object with a safe .json() helper method.
 */
export async function safeFetch(url, options = {}, retries = 2, delayMs = 1500) {
  let targetUrl = url;

  if (typeof targetUrl === 'string') {
    if (targetUrl.startsWith('/api') || targetUrl.startsWith('api/')) {
      const cleanPath = targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl;
      targetUrl = `${API_BASE}${cleanPath}`;
    }
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(targetUrl, options);

      // Handle 502/503/504 server wake-up retries
      if ((response.status === 503 || response.status === 502 || response.status === 504) && attempt < retries) {
        console.warn(`[safeFetch] Server waking up (${response.status}). Retrying attempt ${attempt + 1}/${retries}...`);
        await new Promise((res) => setTimeout(res, delayMs));
        attempt++;
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      let parsedData = null;

      if (contentType.includes('application/json')) {
        try {
          parsedData = await response.json();
        } catch (jErr) {
          parsedData = { success: false, error: `Invalid server response (${response.status})` };
        }
      } else {
        // Response is HTML or plain text (e.g. 404 / 500 / 502 / 503 HTML error page)
        const htmlText = await response.text();
        let friendlyMessage = 'Server error occurred. Please try again.';

        if (response.status === 404) {
          friendlyMessage = 'API Endpoint not found (404). Please verify backend server deployment.';
        } else if (response.status === 502 || response.status === 503 || response.status === 504) {
          friendlyMessage = 'Database/Server is currently waking up from standby. Please retry in a few seconds.';
        } else if (response.status >= 500) {
          friendlyMessage = 'Server internal error (500). Please try again in a few moments.';
        }

        parsedData = {
          success: false,
          error: friendlyMessage,
          status: response.status
        };
      }

      return {
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        data: parsedData,
        json: async () => parsedData,
        text: async () => JSON.stringify(parsedData)
      };

    } catch (err) {
      if (attempt < retries) {
        console.warn(`[safeFetch] Network error. Retrying attempt ${attempt + 1}/${retries}...`);
        await new Promise((res) => setTimeout(res, delayMs));
        attempt++;
        continue;
      }

      const errData = {
        success: false,
        error: err.message || 'Network request failed. Please check your internet connection.'
      };

      return {
        ok: false,
        status: 0,
        data: errData,
        json: async () => errData,
        text: async () => JSON.stringify(errData)
      };
    }
  }
}

export default safeFetch;
