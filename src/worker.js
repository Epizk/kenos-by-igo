/**
 * Worker-Side JavaScript for a basic Web PROXX Service.
 * * NOTE: This Worker is now expected to be called via a Pages Service Binding 
 * (like 'PROXX_WORKER') and will only receive the URL path (e.g., /https%3A%2F%2Fexample.com)
 *
 * This file should be deployed as a Cloudflare Worker named 'kenos-proxx-worker'.
 */

// Listener for all incoming fetch events
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Generates a simple HTML response for the root access (when the path is invalid).
 * @param {string} hostname The hostname of the deployed site.
 * @returns {Response} An HTML response telling the user to go to the root.
 */
function createRootResponse() {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KENOS PROXX Root by ig0</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background-color: black; font-family: sans-serif; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background-color: #1a1a1a; padding: 2rem; border-radius: 0.5rem; border: 1px solid white; text-align: center; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1 class="text-3xl font-bold mb-4">KENOS PROXX Service Root</h1>
            <p class="text-sm text-gray-400 mb-6 uppercase tracking-widest font-semibold">by ig0</p>
            <p class="mb-6">This path is for worker routing only. When accessed directly, it cannot parse a URL.</p>
            <p>Please use the main Pages URL to enter your target site.</p>
        </div>
    </body>
    </html>
  `;
  return new Response(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}


/**
 * Main function to handle the request, extract the target URL, and fetch content.
 * @param {Request} request The incoming HTTP request.
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  
  // When using a binding, the path starts with the encoded URL, not /proxx/.
  // Example path: /https%3A%2F%2Fexample.com
  const path = url.pathname;
  
  // We expect the path to start with '/' followed by the encoded URL.
  if (path.length <= 1) {
    return createRootResponse();
  }
  
  // The encoded target URL is everything after the first slash.
  const encodedTargetUrl = path.substring(1); 
  let targetUrl;

  try {
    targetUrl = decodeURIComponent(encodedTargetUrl);
  } catch (e) {
    return new Response('Invalid URL encoding.', { status: 400 });
  }

  // Basic validation
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return new Response('Invalid target URL format. Must start with http:// or https://', { status: 400 });
  }
  
  // Create a new request object to send to the target URL.
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });

  try {
    // Fetch the content from the target server
    const response = await fetch(proxyRequest);

    // We create a new Response to strip out problematic headers
    const newResponse = new Response(response.body, response);
    
    // Stripping common security headers that prevent embedding/iframing
    newResponse.headers.delete('content-security-policy');
    newResponse.headers.delete('x-frame-options'); 
    
    // Optional: Add a CORS header to help scripts if needed
    newResponse.headers.set('Access-Control-Allow-Origin', '*');

    return newResponse;

  } catch (error) {
    console.error('PROXX Fetch Error:', error);
    return new Response(`Failed to fetch target URL: ${error.message}`, { status: 500 });
  }
}
