/**
 * Worker-Side JavaScript for a basic Web PROXX Service.
 * This file is meant to be deployed as a Cloudflare Worker. It handles routing
 * and content fetching for URLs passed through the /proxx/ path.
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
function createRootResponse(hostname) {
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
            <p class="mb-6">This path is for worker routing only.</p>
            <p>Please return to the main homepage to use the PROXX application.</p>
            <a href="https://${hostname}/" class="mt-4 inline-block bg-white text-black font-semibold py-2 px-4 rounded hover:bg-gray-200 transition">Go to Homepage</a>
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
  
  // Example path extraction: Assume the URL is like https://yourdomain.com/proxx/https%3A%2F%2Fexample.com
  const proxyPrefix = '/proxx/';
  const urlStartIndex = url.pathname.indexOf(proxyPrefix);
  
  // If the path doesn't contain the expected prefix, return the HTML root response
  if (urlStartIndex === -1) {
    return createRootResponse(url.hostname);
  }

  // Extract the encoded target URL and decode it
  const encodedTargetUrl = url.pathname.substring(urlStartIndex + proxyPrefix.length);
  let targetUrl;

  try {
    targetUrl = decodeURIComponent(encodedTargetUrl);
  } catch (e) {
    return new Response('Invalid URL encoding.', { status: 400 });
  }

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return new Response('Invalid target URL format.', { status: 400 });
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

    return newResponse;

  } catch (error) {
    console.error('PROXX Fetch Error:', error);
    return new Response(`Failed to fetch target URL: ${error.message}`, { status: 500 });
  }
}