/**
 * modules/dashboard.js — Dashboard Module
 */
const Dashboard = (() => {
  function init() {
    const s = AppState.state;
    const role = AppState.getRoleDisplay(s.user.role, s.user.customRole);
    const resumeReady = !!s.resume.analysis;
    const xp = s.progress.xp;
    const level = s.progress.level;
    const xpToNext = (level * level * 100);
    const xpProgress = Math.min(100, Math.round((xp / xpToNext) * 100));

    document.getElementById('dashboard-content').innerHTML = `
      <!-- Quick Stats -->
      <div class="stats-grid mb-lg">
        <div class="stat-card animate-slide-up">
          <div class="stat-value">${s.progress.streak}</div>
          <div class="stat-label">🔥 Day Streak</div>
        </div>
        <div class="stat-card animate-slide-up" style="animation-delay:0.05s">
          <div class="stat-value">${s.progress.xp}</div>
          <div class="stat-label">⚡ Total XP</div>
        </div>
        <div class="stat-card animate-slide-up" style="animation-delay:0.1s">
          <div class="stat-value">${s.progress.testsCompleted.length}</div>
          <div class="stat-label">🧪 Tests Done</div>
        </div>
        <div class="stat-card animate-slide-up" style="animation-delay:0.15s">
          <div class="stat-value">${s.progress.interviewSessions.length}</div>
          <div class="stat-label">🎤 Interviews</div>
        </div>
      </div>

      <!-- Level Progress + Target Role -->
      <div class="grid-2 mb-lg">
        <div class="card animate-slide-up" style="animation-delay:0.2s">
          <div class="card-title" style="margin-bottom:var(--space-md);">
            <span>⚡</span> Level ${level} — Career Explorer
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px;">
            <span>${xp} XP</span><span>${xpToNext} XP to Level ${level+1}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${xpProgress}%"></div>
          </div>
          <p class="text-xs text-muted mt-sm">Complete activities to earn XP and level up!</p>
        </div>
        <div class="card animate-slide-up" style="animation-delay:0.25s">
          <div class="card-title" style="margin-bottom:var(--space-md);"><span>🎯</span> Target Role</div>
          <div style="font-size:22px;font-weight:700;color:var(--primary-light);margin-bottom:4px;">${role}</div>
          <div class="chip chip-cyan">${s.user.experience || 'Beginner'}</div>
          <p class="text-xs text-muted mt-sm">
            Resume analyzed: ${resumeReady ? '✅ Yes' : '❌ Not yet — <a href="#" onclick="CareerMind.navigate(\'resume\')" style="color:var(--accent)">Analyze Now</a>'}
          </p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card mb-lg animate-slide-up" style="animation-delay:0.3s">
        <div class="card-header">
          <div class="card-title"><span>🚀</span> Quick Actions</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-sm);">
          ${[
            { icon:'📄', label:'Analyze Resume',   view:'resume',     color:'purple' },
            { icon:'🎤', label:'Mock Interview',   view:'interview',  color:'cyan'   },
            { icon:'🧪', label:'Take a Test',      view:'weeklytest', color:'green'  },
            { icon:'💬', label:'Ask AI Mentor',    view:'chat',       color:'amber'  },
            { icon:'📋', label:'Analyze JD',       view:'jdanalyzer', color:'blue'   },
            { icon:'📈', label:'View Progress',    view:'progress',   color:'red'    },
          ].map(a => `
            <button class="card" onclick="CareerMind.navigate('${a.view}')"
              style="text-align:left;cursor:pointer;padding:12px;border:none;background:var(--bg-card);border:1px solid var(--border);display:flex;align-items:center;gap:10px;border-radius:var(--radius-md);transition:var(--transition-fast);"
              onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
              <span style="font-size:22px">${a.icon}</span>
              <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${a.label}</span>
            </button>`).join('')}
        </div>
      </div>

      <!-- Today's Plan + Recent Activity -->
      <div class="grid-2">
        <div class="card animate-slide-up" style="animation-delay:0.35s">
          <div class="card-header">
            <div class="card-title"><span>📅</span> Today's Suggested Plan</div>
          </div>
          <div id="daily-plan-list">
            ${_getDailyPlan(s).map((item, i) => `
              <div style="display:flex;align-items:center;gap:var(--space-sm);padding:8px 0;border-bottom:1px solid var(--border);">
                <input type="checkbox" id="plan-${i}" style="accent-color:var(--primary);"
                  ${s.progress.dailyPlanDone?.includes(i) ? 'checked' : ''}
                  onchange="Dashboard.togglePlanItem(${i}, this.checked)"/>
                <label for="plan-${i}" style="font-size:13px;cursor:pointer;flex:1;">${item.emoji} ${item.text}</label>
                <span class="chip chip-cyan" style="font-size:10px">+${item.xp}XP</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="card animate-slide-up" style="animation-delay:0.4s">
          <div class="card-header">
            <div class="card-title"><span>🏅</span> Recent Badges</div>
          </div>
          ${s.progress.badges.length === 0
            ? `<div class="empty-state"><div class="empty-state-icon">🎖️</div><p>Complete activities to earn badges!</p></div>`
            : `<div style="display:flex;flex-wrap:wrap;gap:var(--space-sm);">${
                s.progress.badges.slice(-6).map(b =>
                  `<div style="text-align:center;padding:8px;background:var(--bg-elevated);border-radius:var(--radius-md);min-width:64px;">
                    <div style="font-size:24px">${b.emoji}</div>
                    <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${b.name}</div>
                  </div>`
                ).join('')}
              </div>`
          }
        </div>
      </div>`;
  }

  function _getDailyPlan(s) {
    const role = s.user.role;
    const plans = {
      sde:   [
        { emoji:'💻', text:'Solve 2 LeetCode problems',      xp:30 },
        { emoji:'📖', text:'Study one DSA concept',          xp:20 },
        { emoji:'🎤', text:'Do a mock interview session',    xp:40 },
        { emoji:'🧪', text:'Take the weekly quiz',           xp:50 },
        { emoji:'💬', text:'Ask AI Mentor a technical Q',   xp:10 },
      ],
      web:   [
        { emoji:'🛠️', text:'Build a small UI component',   xp:30 },
        { emoji:'📖', text:'Learn one CSS/JS concept',      xp:20 },
        { emoji:'📋', text:'Analyze a Frontend JD',         xp:25 },
        { emoji:'🧪', text:'Take the weekly quiz',          xp:50 },
        { emoji:'💬', text:'Ask AI about best practices',  xp:10 },
      ],
      data:  [
        { emoji:'📊', text:'Practice 5 SQL queries',        xp:30 },
        { emoji:'📖', text:'Study stats or visualization',  xp:20 },
        { emoji:'📋', text:'Analyze a Data Analyst JD',    xp:25 },
        { emoji:'🧪', text:'Take the weekly quiz',          xp:50 },
        { emoji:'💬', text:'Ask AI about a data concept',  xp:10 },
      ],
      cloud: [
        { emoji:'☁️', text:'Review a cloud service',        xp:30 },
        { emoji:'📖', text:'Study cert exam questions',     xp:20 },
        { emoji:'📋', text:'Analyze a Cloud Engineer JD',  xp:25 },
        { emoji:'🧪', text:'Take the weekly quiz',          xp:50 },
        { emoji:'💬', text:'Ask AI about cloud arch',      xp:10 },
      ],
      ai:    [
        { emoji:'🤖', text:'Implement a small ML model',   xp:40 },
        { emoji:'📖', text:'Read one AI paper summary',    xp:20 },
        { emoji:'📋', text:'Analyze an AI Engineer JD',   xp:25 },
        { emoji:'🧪', text:'Take the weekly quiz',         xp:50 },
        { emoji:'💬', text:'Ask AI about an ML concept',  xp:10 },
      ],
    };
    return plans[role] || plans.sde;
  }

  function togglePlanItem(index, done) {
    const s = AppState.state;
    if (!s.progress.dailyPlanDone) s.progress.dailyPlanDone = [];
    const today = new Date().toDateString();
    if (s.progress.dailyPlanDate !== today) {
      s.progress.dailyPlanDone = [];
      s.progress.dailyPlanDate = today;
    }
    if (done && !s.progress.dailyPlanDone.includes(index)) {
      s.progress.dailyPlanDone.push(index);
      const plan = _getDailyPlan(s)[index];
      AppState.addXP(plan.xp, plan.text);
    } else if (!done) {
      s.progress.dailyPlanDone = s.progress.dailyPlanDone.filter(i => i !== index);
    }
    AppState.save();
  }

  return { init, togglePlanItem };
})();
