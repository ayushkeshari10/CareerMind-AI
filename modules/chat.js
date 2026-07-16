/**
 * modules/chat.js — 24/7 AI Mentor Chat Module
 */
const Chat = (() => {
  const SYSTEM_PROMPT = `You are CareerMind, a world-class 24/7 AI career mentor and expert teacher. Your mission is to help the user accelerate their career journey.

You can:
- Explain technical concepts clearly with examples and analogies
- Create study plans and learning paths
- Help with interview preparation and behavioral questions
- Analyze career choices and provide honest guidance
- Generate practice problems with step-by-step solutions
- Review code, SQL queries, or any technical work
- Suggest projects and portfolio ideas
- Provide motivation and accountability

Formatting rules:
- Use markdown formatting (headers, bold, bullet points, code blocks)
- Be encouraging but honest
- Give specific, actionable advice — not generic platitudes
- Use emojis appropriately to make responses engaging
- If asked for a study plan, create a detailed structured one
- For technical questions, include code examples when helpful`;

  let isTyping = false;

  function init() {
    const s = AppState.state;
    const el = document.getElementById('chat-content');

    el.innerHTML = `
      <div class="card" style="height:calc(100vh - 200px);min-height:500px;display:flex;flex-direction:column;padding:0;overflow:hidden;">
        <!-- Chat Messages -->
        <div id="chat-messages" class="chat-messages" style="flex:1;overflow-y:auto;padding:var(--space-md);">
          ${s.chat.history.length === 0 ? _welcomeMessage() : s.chat.history.map(_renderMessage).join('')}
        </div>

        <!-- Suggested Prompts -->
        <div class="chat-suggested" id="chat-suggested" style="${s.chat.history.length > 2 ? 'display:none' : ''}">
          ${_getSuggestedPrompts(s).map(p => `
            <button class="suggested-prompt" onclick="Chat.sendSuggested('${p.replace(/'/g, "\\'")}')">
              ${p}
            </button>`).join('')}
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <textarea
            id="chat-input"
            class="chat-input"
            placeholder="Ask me anything about your career, concepts, interviews..."
            rows="1"
            onkeydown="Chat.handleKeyDown(event)"
            oninput="Chat.autoResize(this)"></textarea>
          <button class="chat-send-btn" id="chat-send-btn" onclick="Chat.send()">➤</button>
        </div>
      </div>`;

    _scrollToBottom();
  }

  function _welcomeMessage() {
    const s = AppState.state;
    const name = s.user.name || 'there';
    const role = AppState.getRoleDisplay(s.user.role, s.user.customRole);
    return `
      <div class="chat-message ai animate-slide-up">
        <div class="chat-avatar ai">🧠</div>
        <div class="chat-bubble">
          <strong>Hey ${name}! I'm CareerMind, your 24/7 AI mentor.</strong> 👋<br><br>
          I see you're targeting <strong>${role}</strong>. I'm here to help you:<br>
          • 📖 Explain any technical concept<br>
          • 🎯 Create personalized study plans<br>
          • 💪 Prepare for interviews<br>
          • 🔍 Review your work and give feedback<br>
          • 🧠 Generate practice problems<br><br>
          What would you like to learn or work on today?
        </div>
      </div>`;
  }

  function _getSuggestedPrompts(s) {
    const rolePrompts = {
      sde:   ['Explain Big O notation with examples', 'Give me 5 LeetCode-style problems on arrays', 'What are the most common SDE interview questions?', 'Explain system design basics'],
      web:   ['Explain CSS Flexbox vs Grid', 'What are React hooks and how do they work?', 'How do I optimize website performance?', 'Explain REST API vs GraphQL'],
      data:  ['Explain SQL JOINs with examples', 'What is the difference between mean, median, mode?', 'How do I prepare for a data analyst interview?', 'Explain pandas DataFrame operations'],
      cloud: ['Explain AWS S3 vs EBS vs EFS', 'What is Kubernetes and why use it?', 'How do I prepare for AWS Solutions Architect exam?', 'Explain microservices architecture'],
      ai:    ['Explain gradient descent intuitively', 'What is the difference between CNN and RNN?', 'Give me practice problems on machine learning', 'How do I build a portfolio for AI/ML roles?'],
    };
    return (rolePrompts[s.user.role] || rolePrompts.sde).slice(0, 4);
  }

  function _renderMessage(msg) {
    const isUser = msg.role === 'user';
    return `
      <div class="chat-message ${isUser ? 'user' : 'ai'}">
        ${!isUser ? '<div class="chat-avatar ai">🧠</div>' : ''}
        <div class="chat-bubble markdown-content">${_formatMarkdown(msg.content)}</div>
        ${isUser ? `<div class="chat-avatar user-av">${(AppState.state.user.name || 'U')[0].toUpperCase()}</div>` : ''}
      </div>`;
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  async function sendSuggested(text) {
    document.getElementById('chat-input').value = text;
    document.getElementById('chat-suggested').style.display = 'none';
    await send();
  }

  async function send() {
    if (isTyping) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    isTyping = true;
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('chat-send-btn').disabled = true;

    // Add user message
    const s = AppState.state;
    const history = s.chat.history;
    history.push({ role: 'user', content: text });
    AppState.set('chat.history', history);

    const messagesEl = document.getElementById('chat-messages');
    messagesEl.innerHTML += _renderMessage({ role: 'user', content: text });

    // Typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-message ai';
    typingEl.id = 'typing-indicator';
    typingEl.innerHTML = `<div class="chat-avatar ai">🧠</div>
      <div class="chat-bubble"><div class="typing-indicator">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
      </div></div>`;
    messagesEl.appendChild(typingEl);
    _scrollToBottom();

    // Stream response
    let fullResponse = '';
    const responseEl = document.createElement('div');
    responseEl.className = 'chat-message ai animate-fade-in';
    responseEl.innerHTML = `<div class="chat-avatar ai">🧠</div><div class="chat-bubble markdown-content" id="ai-response-bubble"></div>`;

    try {
      for await (const chunk of Gemini.chat(history.slice(-10), text, SYSTEM_PROMPT)) {
        if (!fullResponse) {
          // Replace typing indicator with response
          typingEl.replaceWith(responseEl);
        }
        fullResponse += chunk;
        const bubble = document.getElementById('ai-response-bubble');
        if (bubble) bubble.innerHTML = _formatMarkdown(fullResponse) + '<span style="display:inline-block;width:8px;height:16px;background:var(--primary);border-radius:1px;animation:pulseDot 0.8s infinite;vertical-align:middle;margin-left:2px;"></span>';
        _scrollToBottom();
      }
      // Remove cursor
      const bubble = document.getElementById('ai-response-bubble');
      if (bubble) bubble.innerHTML = _formatMarkdown(fullResponse);

      // Save to history
      history.push({ role: 'model', content: fullResponse });
      AppState.set('chat.history', history);
      AppState.addXP(5, 'Chat with AI Mentor');
    } catch (e) {
      typingEl.remove();
      const errEl = document.createElement('div');
      errEl.className = 'chat-message ai';
      errEl.innerHTML = `<div class="chat-avatar ai">🧠</div><div class="chat-bubble">`;
      CareerMind.handleAIError(errEl.querySelector('.chat-bubble'), e);
      errEl.innerHTML += '</div>';
      messagesEl.appendChild(errEl);
      _scrollToBottom();
    }

    isTyping = false;
    document.getElementById('chat-send-btn').disabled = false;
    input.focus();
  }

  function clearChat() {
    AppState.set('chat.history', []);
    init();
    CareerMind.toast('Chat cleared.', 'info');
  }

  function _scrollToBottom() {
    const el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function _formatMarkdown(text) {
    if (!text) return '';
    return text
      // Code blocks
      .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:12px;overflow-x:auto;font-size:13px;font-family:monospace;margin:8px 0;"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:4px;padding:2px 6px;font-size:12px;font-family:monospace;">$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Headers
      .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 6px;font-family:Space Grotesk,sans-serif;">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="margin:14px 0 8px;font-family:Space Grotesk,sans-serif;">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="margin:16px 0 8px;font-family:Space Grotesk,sans-serif;">$1</h2>')
      // Unordered lists
      .replace(/^[•\-\*] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:6px 0;">$&</ul>')
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0;">$1</li>')
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  return { init, send, sendSuggested, handleKeyDown, autoResize, clearChat };
})();
