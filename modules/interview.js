/**
 * modules/interview.js — Mock Interview Coach Module
 */
const Interview = (() => {
  let session = null;

  function init() {
    const s   = AppState.state;
    const el  = document.getElementById('interview-content');
    const sessions = s.progress.interviewSessions || [];

    el.innerHTML = `
      <!-- Setup Panel -->
      <div class="card mb-lg" id="interview-setup">
        <div class="card-header">
          <div class="card-title"><span>🎤</span> Interview Setup</div>
        </div>
        <div class="grid-3" style="margin-bottom:var(--space-md);">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Interview Type</label>
            <select id="int-type" class="form-control">
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral (STAR)</option>
              <option value="mixed">Mixed</option>
              <option value="system_design">System Design</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Difficulty</label>
            <select id="int-diff" class="form-control">
              <option value="easy">Easy</option>
              <option value="medium" selected>Medium</option>
              <option value="hard">Hard</option>
              <option value="faang">FAANG Level</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Questions</label>
            <select id="int-count" class="form-control">
              <option value="3">3 Questions (Quick)</option>
              <option value="5" selected>5 Questions</option>
              <option value="10">10 Questions (Full)</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="Interview.startSession()">
          🎤 Start Mock Interview
        </button>
      </div>

      <!-- Session Panel -->
      <div id="interview-session" class="hidden"></div>

      <!-- Past Sessions -->
      ${sessions.length > 0 ? `
        <div class="card mt-lg">
          <div class="card-title mb-md"><span>📜</span> Past Sessions</div>
          ${sessions.slice(-5).reverse().map(sess => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-sm) 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-size:14px;font-weight:500;">${sess.type} · ${sess.difficulty}</div>
                <div style="font-size:12px;color:var(--text-muted)">${new Date(sess.date).toLocaleDateString()} · ${sess.questions} questions</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:20px;font-weight:700;color:var(--primary-light)">${sess.avgScore}/10</div>
                <div style="font-size:11px;color:var(--text-muted)">avg score</div>
              </div>
            </div>`).join('')}
        </div>` : ''}`;
  }

  async function startSession() {
    const type  = document.getElementById('int-type').value;
    const diff  = document.getElementById('int-diff').value;
    const count = parseInt(document.getElementById('int-count').value);
    const s     = AppState.state;
    const roleNames = { sde:'Software Development Engineer', web:'Web Developer', data:'Data Analyst', cloud:'Cloud Engineer', ai:'AI/ML Engineer' };
    const role = roleNames[s.user.role] || s.user.role || 'Software Engineer';

    const sessionEl = document.getElementById('interview-session');
    sessionEl.classList.remove('hidden');
    sessionEl.innerHTML = CareerMind.loadingHTML(`Generating ${count} ${diff} ${type} questions for ${role}...`);

    const prompt = `Generate ${count} ${diff}-level ${type} interview questions for a ${role} position.

For behavioral questions, focus on STAR method scenarios.
For technical questions, include specific technical depth.
For system design, make them design-focused.

Return JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "Full question text",
      "type": "technical|behavioral|system_design",
      "hints": ["hint1", "hint2"],
      "keyPoints": ["key point to cover 1", "key point 2"],
      "modelAnswer": "A comprehensive model answer (2-4 paragraphs)"
    }
  ]
}`;

    try {
      const data = await Gemini.generateJSON(prompt);
      session = {
        questions: data.questions || [],
        answers:   [],
        scores:    [],
        feedbacks: [],
        currentQ:  0,
        type, diff, role, count,
        startTime: Date.now()
      };
      _renderQuestion();
    } catch (e) {
      CareerMind.handleAIError(sessionEl, e);
    }
  }

  function _renderQuestion() {
    const q = session.questions[session.currentQ];
    if (!q) { _renderSummary(); return; }
    const sessionEl = document.getElementById('interview-session');
    const total = session.questions.length;
    const qNum  = session.currentQ + 1;

    sessionEl.innerHTML = `
      <div class="animate-fade-in">
        <!-- Progress Bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md);">
          <div class="question-number">Question ${qNum} of ${total}</div>
          <div class="chip chip-${q.type==='technical'?'purple':q.type==='behavioral'?'cyan':'amber'}">${q.type}</div>
        </div>
        <div class="progress-bar mb-lg">
          <div class="progress-fill" style="width:${((qNum-1)/total)*100}%"></div>
        </div>

        <!-- Question Card -->
        <div class="interview-question-card">
          <div class="question-text">${q.question}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:var(--space-md);">
            <span class="chip chip-gray">💡 Hints:</span>
            ${q.hints.map(h => `<span class="chip chip-gray">${h}</span>`).join('')}
          </div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-md);">
            📌 Key areas to cover: ${q.keyPoints.join(' · ')}
          </div>

          <!-- Answer Area -->
          <div class="form-group">
            <label class="form-label">Your Answer</label>
            <textarea id="answer-input" class="form-control" rows="6"
              placeholder="Type your detailed answer here. Take your time — this is practice!"></textarea>
          </div>
          <div style="display:flex;gap:var(--space-sm);">
            <button class="btn btn-primary btn-block" onclick="Interview.submitAnswer()">
              ${qNum < total ? 'Submit & Next Question →' : '🏁 Submit Final Answer'}
            </button>
            <button class="btn btn-ghost" onclick="Interview.skipQuestion()">Skip</button>
          </div>
        </div>

        <!-- Feedback Area -->
        <div id="answer-feedback" class="hidden"></div>
      </div>`;
  }

  async function submitAnswer() {
    const answerInput = document.getElementById('answer-input');
    const answer = answerInput.value.trim();
    if (!answer || answer.length < 20) {
      CareerMind.toast('Please write a more detailed answer (at least 20 characters).', 'error');
      return;
    }

    const q = session.questions[session.currentQ];
    const feedbackEl = document.getElementById('answer-feedback');
    feedbackEl.classList.remove('hidden');
    feedbackEl.innerHTML = CareerMind.loadingHTML('Evaluating your answer...');
    answerInput.disabled = true;

    const prompt = `Evaluate this interview answer:
Question: "${q.question}"
Candidate Answer: "${answer}"
Model Answer Key Points: ${q.keyPoints.join(', ')}

Provide evaluation as JSON:
{
  "score": <1-10>,
  "grade": "<Excellent|Good|Fair|Needs Work>",
  "strengths": ["what was good"],
  "improvements": ["what to improve"],
  "missedPoints": ["key points not covered"],
  "betterAnswer": "A refined/better version of their answer",
  "tip": "One actionable tip for next time"
}`;

    try {
      const eval_ = await Gemini.generateJSON(prompt);
      session.answers.push(answer);
      session.scores.push(eval_.score);
      session.feedbacks.push(eval_);

      const stars = '⭐'.repeat(Math.round(eval_.score / 2));
      feedbackEl.innerHTML = `
        <div class="answer-feedback animate-slide-up">
          <div class="answer-score">
            <span style="font-size:28px;font-weight:800;color:${eval_.score>=7?'var(--success)':eval_.score>=5?'var(--warning)':'var(--danger)'}">${eval_.score}/10</span>
            <span class="score-stars">${stars}</span>
            <span class="chip chip-${eval_.grade==='Excellent'?'green':eval_.grade==='Good'?'cyan':eval_.grade==='Fair'?'amber':'red'}">${eval_.grade}</span>
          </div>
          <div class="grid-2 mb-md">
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--success);margin-bottom:6px;">✅ Strengths</div>
              ${eval_.strengths.map(s => `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">• ${s}</div>`).join('')}
            </div>
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--danger);margin-bottom:6px;">⚠️ Improve</div>
              ${eval_.improvements.map(i => `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">• ${i}</div>`).join('')}
            </div>
          </div>
          ${eval_.missedPoints?.length ? `<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-md);padding:var(--space-sm) var(--space-md);margin-bottom:var(--space-md);">
            <div style="font-weight:600;font-size:13px;color:var(--warning);margin-bottom:4px;">📌 Missed Points</div>
            ${eval_.missedPoints.map(mp => `<div style="font-size:12px;color:var(--text-secondary);">• ${mp}</div>`).join('')}
          </div>` : ''}
          <details style="margin-bottom:var(--space-md);">
            <summary style="cursor:pointer;font-weight:600;font-size:13px;color:var(--accent);margin-bottom:6px;">💡 View Better Answer</summary>
            <div style="font-size:13px;color:var(--text-secondary);background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-md);margin-top:6px;line-height:1.6">${eval_.betterAnswer}</div>
          </details>
          <div style="background:rgba(124,58,237,0.08);border-radius:var(--radius-md);padding:10px var(--space-md);margin-bottom:var(--space-md);">
            <span style="color:var(--primary-light);font-weight:600;font-size:13px;">💡 Pro Tip: </span>
            <span style="font-size:13px;color:var(--text-secondary);">${eval_.tip}</span>
          </div>
          <button class="btn btn-primary btn-block" onclick="Interview.nextQuestion()">
            ${session.currentQ + 1 < session.questions.length ? 'Next Question →' : '🏁 View Session Summary'}
          </button>
        </div>`;
    } catch (e) {
      CareerMind.handleAIError(feedbackEl, e);
    }
  }

  function skipQuestion() {
    session.answers.push('');
    session.scores.push(0);
    session.feedbacks.push(null);
    session.currentQ++;
    _renderQuestion();
  }

  function nextQuestion() {
    session.currentQ++;
    _renderQuestion();
  }

  function _renderSummary() {
    const scores = session.scores.filter(s => s > 0);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    const grade = avgScore >= 8 ? 'Excellent 🌟' : avgScore >= 6 ? 'Good 👍' : avgScore >= 4 ? 'Fair 📈' : 'Keep Practicing 💪';

    // Save session
    const s = AppState.state;
    const sessions = s.progress.interviewSessions || [];
    sessions.push({
      date: new Date().toISOString(),
      type: session.type,
      difficulty: session.diff,
      questions: session.questions.length,
      avgScore: parseFloat(avgScore),
    });
    AppState.set('progress.interviewSessions', sessions);
    AppState.addXP(session.questions.length * 15, 'Completed mock interview');

    const sessionEl = document.getElementById('interview-session');
    sessionEl.innerHTML = `
      <div class="card animate-slide-up" style="text-align:center;background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.1))">
        <div style="font-size:64px;margin-bottom:var(--space-md);">🎤</div>
        <h2 style="font-family:'Space Grotesk',sans-serif;font-size:28px;margin-bottom:8px;">Interview Complete!</h2>
        <div style="font-size:56px;font-weight:800;color:var(--primary-light);font-family:'Space Grotesk',sans-serif;">${avgScore}</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:var(--space-md);">Average Score — ${grade}</div>

        <div class="stats-grid" style="max-width:400px;margin:0 auto var(--space-xl);">
          ${session.scores.map((score, i) => `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-md);">
              <div style="font-size:20px;font-weight:700;color:${score>=7?'var(--success)':score>=5?'var(--warning)':'var(--danger)'}">${score}/10</div>
              <div style="font-size:11px;color:var(--text-muted)">Q${i+1}</div>
            </div>`).join('')}
        </div>

        <div style="display:flex;gap:var(--space-sm);justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="Interview.init()">🔄 New Session</button>
          <button class="btn btn-accent" onclick="CareerMind.navigate('chat')">💬 Ask AI for Tips</button>
          <button class="btn btn-ghost" onclick="CareerMind.navigate('progress')">📈 View Progress</button>
        </div>
      </div>`;
  }

  return { init, startSession, submitAnswer, skipQuestion, nextQuestion };
})();
