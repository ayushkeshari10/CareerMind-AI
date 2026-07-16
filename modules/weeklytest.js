/**
 * modules/weeklytest.js — Weekly Personalized Test Module
 */
const WeeklyTest = (() => {
  let testState = null;
  let timerInterval = null;
  let timeLeft = 0;

  function init() {
    const s  = AppState.state;
    const el = document.getElementById('weeklytest-content');
    const tests = s.progress.testsCompleted || [];

    el.innerHTML = `
      <!-- Setup Card -->
      <div class="card mb-lg" id="test-setup-card">
        <div class="card-header">
          <div class="card-title"><span>⚙️</span> Test Configuration</div>
        </div>
        <div class="grid-3">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Topic Focus</label>
            <select id="test-topic" class="form-control">
              <option value="auto">Auto (Based on Role)</option>
              <option value="dsa">Data Structures & Algorithms</option>
              <option value="system">System Design</option>
              <option value="sql">SQL & Databases</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="cloud">Cloud & DevOps</option>
              <option value="ml">Machine Learning</option>
              <option value="behavioral">Behavioral / HR</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Difficulty</label>
            <select id="test-diff" class="form-control">
              <option value="beginner">Beginner</option>
              <option value="intermediate" selected>Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">No. of Questions</label>
            <select id="test-count" class="form-control">
              <option value="5">5 (Quick)</option>
              <option value="10" selected>10 (Standard)</option>
              <option value="15">15 (Full)</option>
            </select>
          </div>
        </div>
        <div style="margin-top:var(--space-md);">
          <button class="btn btn-primary btn-lg" onclick="WeeklyTest.startTest()">
            🧪 Start Test
          </button>
        </div>
      </div>

      <!-- Test Area -->
      <div id="test-area" class="hidden"></div>

      <!-- Test History -->
      ${tests.length > 0 ? `
        <div class="card mt-lg">
          <div class="card-title mb-md"><span>📜</span> Test History</div>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="border-bottom:1px solid var(--border);">
                  <th style="text-align:left;padding:8px;color:var(--text-muted)">Date</th>
                  <th style="text-align:left;padding:8px;color:var(--text-muted)">Topic</th>
                  <th style="text-align:left;padding:8px;color:var(--text-muted)">Questions</th>
                  <th style="text-align:left;padding:8px;color:var(--text-muted)">Score</th>
                  <th style="text-align:left;padding:8px;color:var(--text-muted)">Grade</th>
                </tr>
              </thead>
              <tbody>
                ${tests.slice(-8).reverse().map(t => {
                  const pct = Math.round((t.correct / t.total) * 100);
                  return `<tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px;color:var(--text-muted)">${new Date(t.date).toLocaleDateString()}</td>
                    <td style="padding:8px">${t.topic}</td>
                    <td style="padding:8px">${t.total}</td>
                    <td style="padding:8px"><strong style="color:${pct>=70?'var(--success)':pct>=50?'var(--warning)':'var(--danger)'}">${t.correct}/${t.total}</strong></td>
                    <td style="padding:8px"><span class="chip chip-${pct>=80?'green':pct>=60?'cyan':pct>=40?'amber':'red'}">${pct}%</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}`;
  }

  async function startTest() {
    const topic = document.getElementById('test-topic').value;
    const diff  = document.getElementById('test-diff').value;
    const count = parseInt(document.getElementById('test-count').value);
    const s = AppState.state;
    const roleNames = { sde:'Software Development Engineer', web:'Web Developer', data:'Data Analyst', cloud:'Cloud Engineer', ai:'AI/ML Engineer' };
    const role = roleNames[s.user.role] || 'Software Engineer';

    const testArea = document.getElementById('test-area');
    document.getElementById('test-setup-card').style.display = 'none';
    testArea.classList.remove('hidden');
    testArea.innerHTML = CareerMind.loadingHTML(`Generating ${count} ${diff} ${topic === 'auto' ? role : topic} questions...`);

    const topicName = topic === 'auto' ? role : topic;

    const prompt = `Create ${count} ${diff}-level multiple-choice questions for the topic: "${topicName}".

Each question should test real practical knowledge. Make distractors plausible but clearly wrong to an expert.

Return JSON:
{
  "topic": "${topicName}",
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correctAnswer": "A|B|C|D",
      "explanation": "Why this is correct and why others are wrong",
      "difficulty": "Easy|Medium|Hard"
    }
  ]
}`;

    try {
      const data = await Gemini.generateJSON(prompt);
      testState = {
        questions: data.questions || [],
        topic: topicName,
        diff,
        answers: {},
        reviewed: false,
        startTime: Date.now()
      };
      timeLeft = count * 60; // 1 min per question
      _renderTest();
    } catch (e) {
      testArea.classList.add('hidden');
      document.getElementById('test-setup-card').style.display = 'block';
      CareerMind.handleAIError(testArea, e);
      testArea.classList.remove('hidden');
    }
  }

  function _renderTest() {
    const testArea = document.getElementById('test-area');
    const qs = testState.questions;

    testArea.innerHTML = `
      <div class="animate-fade-in">
        <!-- Header -->
        <div class="card mb-lg" style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.08))">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:18px;font-weight:700;">${testState.topic} Test</div>
              <div style="font-size:13px;color:var(--text-muted)">${qs.length} questions · ${testState.diff}</div>
            </div>
            <div class="test-timer">
              <span>⏱️</span>
              <span id="test-timer-display">${_formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        <!-- Questions -->
        ${qs.map((q, i) => `
          <div class="test-question" id="question-${i}">
            <div class="question-number">Question ${i+1} of ${qs.length} · <span class="chip chip-${q.difficulty==='Easy'?'green':q.difficulty==='Medium'?'amber':'red'}" style="font-size:10px">${q.difficulty}</span></div>
            <div class="question-text">${q.question}</div>
            <div class="test-options">
              ${Object.entries(q.options).map(([key, val]) => `
                <div class="test-option" id="opt-${i}-${key}" onclick="WeeklyTest.selectAnswer(${i}, '${key}')">
                  <div class="option-letter">${key}</div>
                  <span>${val}</span>
                </div>`).join('')}
            </div>
          </div>`).join('')}

        <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-lg);">
          <button class="btn btn-primary btn-lg btn-block" id="submit-test-btn" onclick="WeeklyTest.submitTest()">
            Submit Test
          </button>
          <button class="btn btn-ghost" onclick="WeeklyTest.cancelTest()">Cancel</button>
        </div>
      </div>`;

    // Start timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      const el = document.getElementById('test-timer-display');
      if (el) {
        el.textContent = _formatTime(timeLeft);
        if (timeLeft <= 60) el.style.color = 'var(--danger)';
      }
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        submitTest();
      }
    }, 1000);
  }

  function selectAnswer(qIndex, key) {
    // Clear previous selection for this question
    const qs = testState.questions;
    if (!testState.reviewed) {
      Object.keys(qs[qIndex].options).forEach(k => {
        const el = document.getElementById(`opt-${qIndex}-${k}`);
        if (el) el.classList.remove('selected');
      });
      const el = document.getElementById(`opt-${qIndex}-${key}`);
      if (el) el.classList.add('selected');
      testState.answers[qIndex] = key;
    }
  }

  function submitTest() {
    clearInterval(timerInterval);
    if (testState.reviewed) return;
    testState.reviewed = true;

    const qs = testState.questions;
    let correct = 0;

    // Show correct/wrong
    qs.forEach((q, i) => {
      const userAns = testState.answers[i];
      const correctAns = q.correctAnswer;
      if (userAns) {
        const userEl = document.getElementById(`opt-${i}-${userAns}`);
        if (userEl) userEl.classList.add(userAns === correctAns ? 'correct' : 'wrong');
      }
      const correctEl = document.getElementById(`opt-${i}-${correctAns}`);
      if (correctEl) correctEl.classList.add('correct');
      if (userAns === correctAns) correct++;

      // Show explanation
      const qEl = document.getElementById(`question-${i}`);
      if (qEl) {
        qEl.innerHTML += `
          <div style="margin-top:var(--space-sm);background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:var(--radius-md);padding:var(--space-md);">
            <strong style="color:var(--accent);font-size:13px;">💡 Explanation:</strong>
            <p style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${q.explanation}</p>
          </div>`;
      }
    });

    const pct = Math.round((correct / qs.length) * 100);
    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';

    // Save result
    const s = AppState.state;
    const tests = s.progress.testsCompleted || [];
    tests.push({ date: new Date().toISOString(), topic: testState.topic, total: qs.length, correct, diff: testState.diff });
    AppState.set('progress.testsCompleted', tests);
    AppState.addXP(correct * 10 + 20, `Test completed: ${correct}/${qs.length} correct`);

    // Show summary at top
    const scoreColor = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
    const summaryEl = document.createElement('div');
    summaryEl.className = 'card card-glow mb-lg animate-slide-up';
    summaryEl.style.cssText = 'text-align:center;background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.1))';
    summaryEl.innerHTML = `
      <div style="font-size:56px;font-weight:800;font-family:'Space Grotesk',sans-serif;color:${scoreColor}">${pct}%</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:8px;">Grade: ${grade}</div>
      <div style="font-size:16px;color:var(--text-secondary);margin-bottom:var(--space-md)">${correct} out of ${qs.length} correct</div>
      <div style="display:flex;gap:var(--space-sm);justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="WeeklyTest.init()">🔄 New Test</button>
        <button class="btn btn-accent" onclick="CareerMind.navigate('chat')">💬 Review with AI</button>
      </div>`;
    const testArea = document.getElementById('test-area');
    testArea.insertBefore(summaryEl, testArea.firstChild);
    testArea.scrollIntoView({ behavior: 'smooth' });

    // Disable submit btn
    const btn = document.getElementById('submit-test-btn');
    if (btn) btn.style.display = 'none';
  }

  function cancelTest() {
    clearInterval(timerInterval);
    testState = null;
    init();
  }

  function _formatTime(secs) {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return { init, startTest, selectAnswer, submitTest, cancelTest };
})();
