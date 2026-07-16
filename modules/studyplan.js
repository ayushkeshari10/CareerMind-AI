/**
 * modules/studyplan.js — Study Planner + Pomodoro Timer Module
 */
const StudyPlan = (() => {
  let pomodoroTimer = null;
  let pomodoroState = { running: false, mode: 'work', timeLeft: 25*60, sessions: 0 };

  function init() {
    const s  = AppState.state;
    const el = document.getElementById('studyplan-content');

    el.innerHTML = `
      <div class="grid-2" style="gap:var(--space-lg);">

        <!-- Left: Study Plan Generator -->
        <div>
          <div class="card mb-lg">
            <div class="card-header">
              <div class="card-title"><span>📅</span> Weekly Study Plan</div>
            </div>
            <div class="form-group">
              <label class="form-label">Daily Study Goal</label>
              <select id="sp-hours" class="form-control">
                <option value="1">1 hour/day</option>
                <option value="2" selected>2 hours/day</option>
                <option value="3">3 hours/day</option>
                <option value="4">4 hours/day</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Focus Area This Week</label>
              <input id="sp-focus" type="text" class="form-control" placeholder="e.g. Arrays & Sorting, React Hooks, SQL..."/>
            </div>
            <button class="btn btn-primary btn-block" onclick="StudyPlan.generatePlan()">
              📅 Generate AI Study Plan
            </button>
          </div>

          <!-- Plan Display -->
          <div id="sp-plan-display">
            ${s.studyplan?.weeklyPlan ? _renderPlan(s.studyplan.weeklyPlan) : `
              <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <h3>No plan yet</h3>
                <p>Set your goals and generate a personalized weekly study schedule.</p>
              </div>`}
          </div>
        </div>

        <!-- Right: Pomodoro Timer + Goals -->
        <div>
          <!-- Pomodoro Timer -->
          <div class="card mb-lg">
            <div class="card-title mb-md"><span>🍅</span> Pomodoro Timer</div>
            <div class="pomodoro-display">
              <div class="pomodoro-time" id="pomo-display">${_formatPomoTime(pomodoroState.timeLeft)}</div>
              <div class="pomodoro-label" id="pomo-mode">FOCUS TIME</div>
            </div>
            <div style="display:flex;gap:var(--space-sm);justify-content:center;margin:var(--space-sm) 0;">
              <button class="btn btn-ghost btn-sm" onclick="StudyPlan.setPomoMode('work', 25)">Work 25m</button>
              <button class="btn btn-ghost btn-sm" onclick="StudyPlan.setPomoMode('short', 5)">Short 5m</button>
              <button class="btn btn-ghost btn-sm" onclick="StudyPlan.setPomoMode('long', 15)">Long 15m</button>
            </div>
            <div class="pomodoro-controls">
              <button class="btn btn-primary" id="pomo-start-btn" onclick="StudyPlan.togglePomodoro()">▶ Start</button>
              <button class="btn btn-ghost" onclick="StudyPlan.resetPomodoro()">↺ Reset</button>
            </div>
            <div style="text-align:center;margin-top:var(--space-md);font-size:13px;color:var(--text-muted)">
              🍅 Sessions today: <strong id="pomo-sessions" style="color:var(--primary-light)">${pomodoroState.sessions}</strong>
            </div>
          </div>

          <!-- Daily Goals Tracker -->
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span>✅</span> Today's Goals</div>
              <button class="btn btn-ghost btn-sm" onclick="StudyPlan.addGoal()">+ Add Goal</button>
            </div>
            <div id="sp-goals-list">
              ${_renderGoals(s.studyplan?.goals || [])}
            </div>
            <div id="sp-add-goal-form" class="hidden" style="margin-top:var(--space-md);">
              <div style="display:flex;gap:var(--space-sm);">
                <input id="sp-goal-input" type="text" class="form-control" placeholder="Enter a goal for today..."/>
                <button class="btn btn-primary btn-sm" onclick="StudyPlan.saveGoal()">Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function generatePlan() {
    const hours = document.getElementById('sp-hours').value;
    const focus = document.getElementById('sp-focus').value.trim();
    const s = AppState.state;
    const el = document.getElementById('sp-plan-display');
    el.innerHTML = CareerMind.loadingHTML('Building your personalized study plan...');

    const roleNames = { sde:'Software Development Engineer', web:'Web Developer', data:'Data Analyst', cloud:'Cloud Engineer', ai:'AI/ML Engineer' };
    const role = roleNames[s.user.role] || 'Software Engineer';
    const missingSkills = s.skillgap.data?.topPriorities?.map(p => p.skill).join(', ') || focus || 'Core skills';

    const prompt = `Create a detailed 7-day study plan for a ${s.user.experience || 'beginner'} preparing for ${role}.
Focus area: ${focus || missingSkills}
Available time: ${hours} hours/day

Return JSON:
{
  "weeklyGoal": "What you'll achieve this week",
  "days": [
    {
      "day": "Monday",
      "theme": "Day theme (e.g. Foundations Day)",
      "sessions": [
        {
          "time": "e.g. 9:00 AM",
          "duration": "25 min",
          "activity": "What to do",
          "type": "Study|Practice|Review|Project|Break",
          "resource": "Specific resource or method"
        }
      ],
      "dailyGoal": "What you'll complete today"
    }
  ],
  "weeklyMilestone": "What should be achieved by end of week",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

    try {
      const data = await Gemini.generateJSON(prompt);
      AppState.set('studyplan.weeklyPlan', data);
      AppState.addXP(25, 'Study plan generated');
      el.innerHTML = _renderPlan(data);
    } catch (e) {
      CareerMind.handleAIError(el, e);
    }
  }

  function _renderPlan(data) {
    if (!data) return '';
    const typeColors = { Study:'purple', Practice:'cyan', Review:'amber', Project:'green', Break:'gray' };
    return `
      <div class="animate-fade-in">
        <div class="card card-glow mb-lg" style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.08))">
          <div class="card-title mb-sm"><span>🎯</span> This Week's Goal</div>
          <p style="font-size:15px;font-weight:500;">${data.weeklyGoal}</p>
          <div style="margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid var(--border);">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Weekly Milestone</div>
            <p style="font-size:13px;color:var(--accent)">✓ ${data.weeklyMilestone}</p>
          </div>
        </div>

        ${(data.days || []).map((day, i) => `
          <div class="card mb-md">
            <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-md);cursor:pointer;"
              onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
              <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${i+1}</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:16px;">${day.day}</div>
                <div style="font-size:12px;color:var(--accent)">${day.theme}</div>
              </div>
              <div style="font-size:13px;color:var(--text-muted)">▼</div>
            </div>
            <div style="display:none">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:var(--space-sm);">Today's goal: ${day.dailyGoal}</div>
              ${(day.sessions || []).map(sess => `
                <div style="display:flex;gap:var(--space-sm);align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:11px;color:var(--text-muted);min-width:60px;flex-shrink:0;padding-top:2px;">${sess.time}</span>
                  <span class="chip chip-${typeColors[sess.type]||'gray'}" style="font-size:10px;flex-shrink:0">${sess.type}</span>
                  <div style="flex:1">
                    <div style="font-size:13px;font-weight:500;">${sess.activity}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${sess.resource}</div>
                  </div>
                  <span style="font-size:11px;color:var(--text-muted);flex-shrink:0">${sess.duration}</span>
                </div>`).join('')}
            </div>
          </div>`).join('')}

        ${data.tips?.length ? `
          <div class="card">
            <div class="card-title mb-md"><span>💡</span> Study Tips</div>
            ${data.tips.map(t => `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">💡 ${t}</div>`).join('')}
          </div>` : ''}
      </div>`;
  }

  // ── Pomodoro Timer ──────────────────────────────────────
  function togglePomodoro() {
    if (pomodoroState.running) {
      clearInterval(pomodoroTimer);
      pomodoroState.running = false;
      document.getElementById('pomo-start-btn').textContent = '▶ Resume';
    } else {
      pomodoroState.running = true;
      document.getElementById('pomo-start-btn').textContent = '⏸ Pause';
      pomodoroTimer = setInterval(() => {
        pomodoroState.timeLeft--;
        const el = document.getElementById('pomo-display');
        if (el) el.textContent = _formatPomoTime(pomodoroState.timeLeft);
        if (pomodoroState.timeLeft <= 0) {
          clearInterval(pomodoroTimer);
          pomodoroState.running = false;
          if (pomodoroState.mode === 'work') {
            pomodoroState.sessions++;
            const sessEl = document.getElementById('pomo-sessions');
            if (sessEl) sessEl.textContent = pomodoroState.sessions;
            AppState.addXP(15, 'Completed a Pomodoro session');
            CareerMind.toast('🍅 Pomodoro complete! Take a break.', 'success');
            setPomoMode('short', 5);
          } else {
            CareerMind.toast('Break over! Back to work 💪', 'info');
            setPomoMode('work', 25);
          }
        }
      }, 1000);
    }
  }

  function setPomoMode(mode, minutes) {
    clearInterval(pomodoroTimer);
    pomodoroState.running = false;
    pomodoroState.mode = mode;
    pomodoroState.timeLeft = minutes * 60;
    const displayEl = document.getElementById('pomo-display');
    const modeEl = document.getElementById('pomo-mode');
    const btnEl = document.getElementById('pomo-start-btn');
    if (displayEl) displayEl.textContent = _formatPomoTime(pomodoroState.timeLeft);
    if (modeEl) modeEl.textContent = mode === 'work' ? 'FOCUS TIME' : mode === 'short' ? 'SHORT BREAK' : 'LONG BREAK';
    if (btnEl) btnEl.textContent = '▶ Start';
  }

  function resetPomodoro() {
    clearInterval(pomodoroTimer);
    pomodoroState = { running: false, mode: 'work', timeLeft: 25*60, sessions: pomodoroState.sessions };
    const displayEl = document.getElementById('pomo-display');
    const modeEl = document.getElementById('pomo-mode');
    const btnEl = document.getElementById('pomo-start-btn');
    if (displayEl) displayEl.textContent = '25:00';
    if (modeEl) modeEl.textContent = 'FOCUS TIME';
    if (btnEl) btnEl.textContent = '▶ Start';
  }

  function _formatPomoTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  // ── Goals ───────────────────────────────────────────────
  function addGoal() {
    const form = document.getElementById('sp-add-goal-form');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
      document.getElementById('sp-goal-input').focus();
    }
  }

  function saveGoal() {
    const input = document.getElementById('sp-goal-input');
    const text = input.value.trim();
    if (!text) return;
    const goals = AppState.get('studyplan.goals') || [];
    goals.push({ id: Date.now(), text, done: false, date: new Date().toDateString() });
    AppState.set('studyplan.goals', goals);
    input.value = '';
    document.getElementById('sp-add-goal-form').classList.add('hidden');
    document.getElementById('sp-goals-list').innerHTML = _renderGoals(goals);
  }

  function toggleGoal(id) {
    const goals = AppState.get('studyplan.goals') || [];
    const goal = goals.find(g => g.id === id);
    if (goal) {
      goal.done = !goal.done;
      if (goal.done) AppState.addXP(10, 'Goal completed!');
    }
    AppState.set('studyplan.goals', goals);
    document.getElementById('sp-goals-list').innerHTML = _renderGoals(goals);
  }

  function deleteGoal(id) {
    const goals = (AppState.get('studyplan.goals') || []).filter(g => g.id !== id);
    AppState.set('studyplan.goals', goals);
    document.getElementById('sp-goals-list').innerHTML = _renderGoals(goals);
  }

  function _renderGoals(goals) {
    const today = new Date().toDateString();
    const todayGoals = goals.filter(g => g.date === today);
    if (!todayGoals.length) return `<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:var(--space-md);">No goals for today. Add some!</p>`;
    return todayGoals.map(g => `
      <div style="display:flex;align-items:center;gap:var(--space-sm);padding:8px 0;border-bottom:1px solid var(--border);">
        <input type="checkbox" ${g.done?'checked':''} style="accent-color:var(--primary);" onclick="StudyPlan.toggleGoal(${g.id})"/>
        <span style="flex:1;font-size:13px;${g.done?'text-decoration:line-through;color:var(--text-muted)':''}">${g.text}</span>
        <button onclick="StudyPlan.deleteGoal(${g.id})" style="color:var(--danger);background:none;border:none;cursor:pointer;font-size:14px;">✕</button>
      </div>`).join('');
  }

  return { init, generatePlan, togglePomodoro, setPomoMode, resetPomodoro, addGoal, saveGoal, toggleGoal, deleteGoal };
})();
