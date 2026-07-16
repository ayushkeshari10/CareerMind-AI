/**
 * modules/motivation.js — Daily Motivation Hub Module
 */
const Motivation = (() => {
  function init() {
    const s  = AppState.state;
    const el = document.getElementById('motivation-content');
    const today = new Date().toDateString();

    el.innerHTML = `
      <!-- Quote Card -->
      <div class="motivation-quote mb-lg animate-float">
        <div id="quote-text" class="quote-text">
          ${s.motivation?.lastQuoteDate === today && s.motivation?.lastQuote
            ? s.motivation.lastQuote.text
            : 'Click "Get Today\'s Quote" to receive your personalized daily motivation...'}
        </div>
        <div id="quote-author" class="quote-author">
          ${s.motivation?.lastQuoteDate === today && s.motivation?.lastQuote
            ? '— ' + s.motivation.lastQuote.author
            : ''}
        </div>
        <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-sm);justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="Motivation.getDailyContent()">
            ✨ ${s.motivation?.lastQuoteDate === today ? 'Refresh' : 'Get Today\'s'} Inspiration
          </button>
          <button class="btn btn-ghost" onclick="Motivation.shareQuote()">📤 Share</button>
        </div>
      </div>

      <div id="motivation-extras"></div>

      <!-- Static Role Tips -->
      <div class="grid-2 mb-lg">
        <div class="card">
          <div class="card-title mb-md"><span>🔥</span> Today's Challenge</div>
          <div id="daily-challenge">
            ${_getDailyChallenge(s)}
          </div>
        </div>
        <div class="card">
          <div class="card-title mb-md"><span>📌</span> Career Tip of the Day</div>
          <div id="career-tip">
            ${_getDailyTip(s)}
          </div>
        </div>
      </div>

      <!-- Motivational Stats -->
      <div class="card mb-lg">
        <div class="card-title mb-md"><span>🏆</span> Your Journey So Far</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${s.progress.xp}</div>
            <div class="stat-label">XP Earned ⚡</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${s.progress.streak}</div>
            <div class="stat-label">Day Streak 🔥</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${s.progress.testsCompleted?.length || 0}</div>
            <div class="stat-label">Tests Passed 🧪</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${s.progress.badges?.length || 0}</div>
            <div class="stat-label">Badges Earned 🏅</div>
          </div>
        </div>
      </div>

      <!-- Success Mindset Tips -->
      <div class="card">
        <div class="card-title mb-md"><span>🧠</span> Growth Mindset Tips</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--space-md);">
          ${_mindsetTips().map(tip => `
            <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-md);">
              <div style="font-size:24px;margin-bottom:8px;">${tip.emoji}</div>
              <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${tip.title}</div>
              <div style="font-size:12px;color:var(--text-muted);line-height:1.6">${tip.text}</div>
            </div>`).join('')}
        </div>
      </div>`;

    // Auto-fetch if no quote today
    if (s.motivation?.lastQuoteDate !== today) {
      setTimeout(() => getDailyContent(), 500);
    }
  }

  async function getDailyContent() {
    const s = AppState.state;
    const role = AppState.getRoleDisplay(s.user.role, s.user.customRole);
    const name = s.user.name || 'there';

    const quoteEl   = document.getElementById('quote-text');
    const authorEl  = document.getElementById('quote-author');
    const extrasEl  = document.getElementById('motivation-extras');

    quoteEl.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';
    extrasEl.innerHTML = '';

    const prompt = `Generate personalized daily motivation for ${name}, who is preparing for ${role} role.

Return JSON:
{
  "quote": {
    "text": "An original, powerful motivational quote relevant to their journey",
    "author": "Famous person or 'CareerMind AI'"
  },
  "dailyAffirmation": "A powerful I am/I can statement personalized for their role",
  "weeklyFocus": "One key thing they should focus on this week",
  "successStory": {
    "person": "Real person who succeeded in this field (can be famous)",
    "story": "2-3 sentence inspiring story relevant to the user's path"
  },
  "actionItem": "One specific action to take TODAY (be very specific)",
  "roleInsight": "An interesting insight or fact about the ${role} field"
}`;

    try {
      const data = await Gemini.generateJSON(prompt);
      const today = new Date().toDateString();
      AppState.set('motivation.lastQuote', data.quote);
      AppState.set('motivation.lastQuoteDate', today);

      quoteEl.innerHTML = data.quote?.text || 'Stay focused on your journey!';
      if (authorEl) authorEl.textContent = '— ' + (data.quote?.author || 'CareerMind AI');

      extrasEl.innerHTML = `
        <div class="grid-2 mb-lg animate-fade-in">
          <!-- Affirmation -->
          <div class="card" style="background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,182,212,0.08));border-color:rgba(16,185,129,0.2);">
            <div class="card-title mb-md" style="color:var(--success)"><span>💫</span> Daily Affirmation</div>
            <p style="font-size:16px;font-weight:600;font-style:italic;line-height:1.5;">"${data.dailyAffirmation}"</p>
          </div>

          <!-- Action Item -->
          <div class="card" style="background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.05));border-color:rgba(245,158,11,0.2);">
            <div class="card-title mb-md" style="color:var(--warning)"><span>⚡</span> Today's Action Item</div>
            <p style="font-size:14px;font-weight:500;line-height:1.6;">${data.actionItem}</p>
            <button class="btn btn-accent btn-sm mt-md" onclick="CareerMind.navigate('studyplan')">Plan it →</button>
          </div>
        </div>

        <!-- Success Story -->
        ${data.successStory ? `
          <div class="card mb-lg animate-fade-in" style="background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(124,58,237,0.05));">
            <div class="card-title mb-md"><span>⭐</span> Inspiring Story</div>
            <div style="font-weight:700;font-size:16px;color:var(--accent);margin-bottom:8px;">${data.successStory.person}</div>
            <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${data.successStory.story}</p>
          </div>` : ''}

        <!-- Role Insight -->
        ${data.roleInsight ? `
          <div class="card mb-lg animate-fade-in">
            <div class="card-title mb-md"><span>💡</span> Did You Know?</div>
            <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${data.roleInsight}</p>
          </div>` : ''}

        <!-- Weekly Focus -->
        ${data.weeklyFocus ? `
          <div class="card mb-lg animate-fade-in" style="background:rgba(124,58,237,0.08);border-color:rgba(124,58,237,0.2);">
            <div class="card-title mb-md"><span>🎯</span> This Week's Focus</div>
            <p style="font-size:15px;font-weight:600;color:var(--primary-light);">${data.weeklyFocus}</p>
          </div>` : ''}`;

      AppState.addXP(5, 'Daily motivation loaded');
    } catch (e) {
      quoteEl.innerHTML = '"The best time to plant a tree was 20 years ago. The second best time is now."';
      if (authorEl) authorEl.textContent = '— Chinese Proverb';
      extrasEl.innerHTML = `<div class="card mb-lg" style="text-align:center;color:var(--text-muted);font-size:13px;">AI personalization unavailable — check your API key in Settings ⚙️</div>`;
    }
  }

  function shareQuote() {
    const text = document.getElementById('quote-text')?.textContent;
    if (!text || text.includes('Click')) return;
    const shareText = `"${text}" — CareerMind AI\n\n#CareerMind #Motivation #CareerGoals`;
    if (navigator.share) {
      navigator.share({ title: 'My Daily Motivation', text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      CareerMind.toast('Quote copied to clipboard!', 'success');
    }
  }

  function _getDailyChallenge(s) {
    const challenges = {
      sde: ['Solve one medium LeetCode problem', 'Implement a binary search tree from scratch', 'Write a linked list reversal algorithm', 'Implement LRU cache'],
      web: ['Build a component without looking at docs', 'Create an animated CSS loader', 'Implement infinite scroll', 'Build a dark/light theme toggle'],
      data: ['Write 5 complex SQL queries', 'Analyze a public dataset on Kaggle', 'Build a dashboard in Excel/Sheets', 'Explain CLT to someone'],
      cloud: ['Configure an S3 bucket with policies', 'Set up a CI/CD pipeline concept', 'Design a serverless architecture', 'Compare 3 cloud services'],
      ai: ['Implement gradient descent from scratch', 'Train a simple classification model', 'Visualize a dataset', 'Read and summarize one ML paper'],
    };
    const role = s.user.role || 'sde';
    const list = challenges[role] || challenges.sde;
    const idx = new Date().getDate() % list.length;
    return `<p style="font-size:15px;font-weight:600;color:var(--warning);margin-bottom:8px;">💪 ${list[idx]}</p>
            <button class="btn btn-ghost btn-sm" onclick="CareerMind.navigate('chat');setTimeout(()=>document.getElementById('chat-input').value='Help me with: ${list[idx]}',500)">Get Help →</button>`;
  }

  function _getDailyTip(s) {
    const tips = {
      sde: ['Always explain your thought process in interviews — interviewers value communication as much as code.',
            'Learn to recognize patterns in problems (sliding window, two pointers, dynamic programming).',
            'Practice writing clean, readable code — not just working code.',
            'Study system design even for junior roles — it shows initiative.'],
      web: ['Always mobile-first! 60% of web traffic is mobile.',
            'Learn browser DevTools deeply — it will 10x your debugging speed.',
            'Understand accessibility (a11y) — it sets you apart from other candidates.',
            'Build real projects, not just tutorials. Recruiters want to see initiative.'],
      data: ['SQL is non-negotiable for data analysts — master JOINs, CTEs, and window functions.',
             'Learn to tell a story with data, not just show numbers.',
             'Practice explaining statistical concepts to non-technical stakeholders.',
             'Know your visualizations — pie charts for composition, line for trends, bar for comparisons.'],
      cloud: ['Hands-on labs are worth more than theory for cloud certifications.',
              'Understand the Well-Architected Framework — interviewers love this.',
              'Learn IAM deeply — security is the #1 concern in cloud.',
              'Practice cost optimization scenarios — it shows business awareness.'],
      ai: ['Mathematics (linear algebra, calculus, statistics) is your foundation.',
           'Implement algorithms from scratch before using libraries.',
           'Kaggle competitions are great portfolio projects.',
           'Learn to communicate model decisions to non-technical audiences.'],
    };
    const role = s.user.role || 'sde';
    const list = tips[role] || tips.sde;
    const idx = (new Date().getDate() + 1) % list.length;
    return `<p style="font-size:13px;color:var(--text-secondary);line-height:1.7;">💡 ${list[idx]}</p>`;
  }

  function _mindsetTips() {
    return [
      { emoji:'🔄', title:'Consistency Beats Intensity', text:'30 minutes every day outperforms 5 hours once a week. Build daily habits.' },
      { emoji:'❌', title:'Embrace Failure', text:'Every wrong answer in practice is one less mistake in the real interview.' },
      { emoji:'📊', title:'Track Progress', text:'What gets measured gets improved. Use your progress dashboard daily.' },
      { emoji:'🤝', title:'Teach to Learn', text:'Explain concepts out loud or to others — it reveals gaps in your knowledge.' },
      { emoji:'🎯', title:'One Goal at a Time', text:'Focus on one skill per week. Depth beats breadth in interviews.' },
      { emoji:'⚡', title:'Active Recall', text:'Don\'t just re-read. Test yourself. Use practice problems over passive study.' },
    ];
  }

  return { init, getDailyContent, shareQuote };
})();
