/**
 * gemini.js — Google Gemini API Wrapper
 * Uses REST API directly (no npm required)
 */

const Gemini = (() => {
  const BASE = '/api/gemini';
  async function _fetchWithRetry(url, options, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
      const resp = await fetch(url, options);
      if (resp.status === 429) {
        const err = await resp.clone().json().catch(() => ({}));
        const msg = err?.error?.message || '';
        
        let delayMs = 15000; // default 15s
        const match = msg.match(/retry in ([\d\.]+)s/);
        if (match) delayMs = (parseFloat(match[1]) * 1000) + 1000; // Add 1s buffer
        
        console.warn(`[Gemini] 429 Quota Exceeded. Retrying in ${Math.round(delayMs/1000)}s...`);
        if (typeof CareerMind !== 'undefined' && i === 0) {
          CareerMind.toast(`AI is warming up. Retrying in ${Math.round(delayMs/1000)}s...`, 'info');
        }
        
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      return resp;
    }
    return fetch(url, options);
  }

  /** One-shot text generation */
  async function generate(prompt, systemPrompt = '', temperature = 0.7, forceJSON = false) {

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature, 
        maxOutputTokens: 8192, 
        topP: 0.9,
        ...(forceJSON ? { responseMimeType: 'application/json' } : {})
      }
    };
    if (systemPrompt) {
      body.system_instruction = { parts: [{ text: systemPrompt }] };
    }

    const resp = await _fetchWithRetry(`${BASE}?action=generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err?.error?.message || `API Error ${resp.status}`;
      throw new Error(msg);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  }

  /** Generate and parse JSON response */
  async function generateJSON(prompt, systemPrompt = '') {
    const jsonPrompt = prompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation. Just the raw JSON object.';
    const text = await generate(jsonPrompt, systemPrompt, 0.4, true); // true forces JSON mode
    
    // Strip markdown code fences if present (fallback just in case)
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      try {
        const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (match) return JSON.parse(match[0]);
      } catch (innerError) {
        console.error('Failed to parse AI JSON:', innerError, cleaned);
      }
      throw new Error('The AI generated an invalid response format. Please try again.');
    }
  }

  /** Streaming text generation — yields chunks */
  async function* stream(messages, systemPrompt = '') {

    const body = {
      contents: messages,
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
    };
    if (systemPrompt) {
      body.system_instruction = { parts: [{ text: systemPrompt }] };
    }

    const resp = await _fetchWithRetry(`${BASE}?action=stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API Error ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]' || !raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunk) yield chunk;
        } catch (_) {}
      }
    }
  }

  /** Shorthand: chat messages array format */
  async function* chat(history, newMessage, systemPrompt = '') {
    const messages = [
      ...history.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: newMessage }] }
    ];
    yield* stream(messages, systemPrompt);
  }

  return { generate, generateJSON, stream, chat };
})();
