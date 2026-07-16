export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    console.error(`Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'generateContent';
    
    // Securely read the API key from Vercel environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('API KEY IS MISSING IN VERCEL ENVIRONMENT VARIABLES!');
      return new Response(JSON.stringify({ error: 'Server misconfiguration: GEMINI_API_KEY missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();

    // Construct the endpoint based on the action
    const geminiBase = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest';
    const endpoint = action === 'stream' 
      ? `${geminiBase}:streamGenerateContent?key=${apiKey}&alt=sse` 
      : `${geminiBase}:generateContent?key=${apiKey}`;

    // Forward the request to Google
    console.log(`Sending request to Google API (Action: ${action})`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`Google API Error: ${response.status} ${response.statusText}`);
    } else {
      console.log('Google API request successful!');
    }

    // If streaming, return the readable stream directly
    if (action === 'stream') {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Otherwise, parse and return JSON
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
