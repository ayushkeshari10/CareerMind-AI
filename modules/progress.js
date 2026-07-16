/**
 * modules/progress.js — Progress Tracker Module
 */
const Progress = (() => {
  function init() {
    const s  = AppState.state;
    const el = document.getElementById('progress-content');
    const p  = s.progress;

    const xpToNextLevel = (p.level * p.level * 100);
    const xpProgress = Math.min(100, Math.round((p.xp / xpToNextLevel) * 100));
    const tests = p.testsCompleted || [];
    const interviews = p.interviewSessions || [];
    const avgTestScore = tests.length > 0 ? Math.round(tests.reduce((a, t) => a + (t.correct/t.total)*100, 0) / tests.length) : 0;
    const avgInterviewScore = interviews.length > 0 ? (interviews.reduce((a, i) => a + i.avgScore, 0) / interviews.length).toFixed(1) : 0;

    // Streak calendar
    const today = new Date();
    const calDays = 28; // 4 weeks

    el.innerHTML = `
      <!-- XP & Level Banner -->
      <div class="card card-glow mb-lg" style="background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(6,182,212,0.15));">
        <div style="display:flex;align-items:center;gap:var(--space-xl);flex-wrap:wrap;">
          <div style="text-align:center;">
            <div style="font-size:64px;font-weight:800;font-family:'Space Grotesk',sans-serif;color:var(--primary-light);">${p.level}</div>
            <div style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Level</div>
          </div>
          <div style="flex:1;min-width:200px;">
            <div style="font-size:22px;font-weight:700;font-family:'Space Grotesk',sans-serif;margin-bottom:4px;">${_getLevelTitle(p.level)}</div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px;">
              <span>${p.xp} XP</span><span>${xpToNextLevel} XP to Level ${p.level+1}</span>
            </div>
            <div class="progress-bar" style="height:12px;">
              <div class="progress-fill" style="width:${xpProgress}%"></div>
            </div>
            <div style="display:flex;gap:var(--space-lg);margin-top:var(--space-md);flex-wrap:wrap;">
              <div><div style="font-size:22px;font-weight:700;color:var(--warning)">${p.streak}</div><div style="font-size:11px;color:var(--text-muted)">Day Streak 🔥</div></div>
              <div><div style="font-size:22px;font-weight:700;color:var(--success)">${tests.length}</div><div style="font-size:11px;color:var(--text-muted)">Tests Done</div></div>
              <div><div style="font-size:22px;font-weight:700;color:var(--accent)">${interviews.length}</div><div style="font-size:11px;color:var(--text-muted)">Interviews</div></div>
              <div><div style="font-size:22px;font-weight:700;color:var(--info)">${(p.skillsLearned||[]).length}</div><div style="font-size:11px;color:var(--text-muted)">Skills Learned</div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Scores -->
      <div class="grid-3 mb-lg">
        <div class="card" style="text-align:center">
          <div style="font-size:36px;font-weight:700;color:var(--success)">${avgTestScore}%</div>
          <div style="font-size:13px;color:var(--text-muted)">Avg Test Score</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="font-size:36px;font-weight:700;color:var(--accent)">${avgInterviewScore}/10</div>
          <div style="font-size:13px;color:var(--text-muted)">Avg Interview Score</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="font-size:36px;font-weight:700;color:var(--warning)">${p.badges?.length || 0}</div>
          <div style="font-size:13px;color:var(--text-muted)">Badges Earned</div>
        </div>
      </div>

      <!-- Test Score Trend Chart -->
      ${tests.length >= 2 ? `
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>📊</span> Test Score Trend</div>
          <canvas id="score-trend-chart" height="120"></canvas>
          <script>
            (function() {
              const labels = ${JSON.stringify(tests.slice(-8).map((t,i) => `Test ${i+1}`))};
              const scores = ${JSON.stringify(tests.slice(-8).map(t => Math.round((t.correct/t.total)*100)))};
              const ctx = document.getElementById('score-trend-chart').getContext('2d');
              new Chart(ctx, {
                type: 'line',
                data: {
                  labels,
                  datasets: [{
                    label: 'Score %',
                    data: scores,
                    borderColor: 'rgba(124,58,237,0.8)',
                    backgroundColor: 'rgba(124,58,237,0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgba(124,58,237,1)',
                    pointRadius: 5
                  }]
                },
                options: {
                  responsive: true,
                  scales: {
                    y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } }
                  },
                  plugins: { legend: { labels: { color: '#94A3B8' } } }
                }
              });
            })();
          </script>
        </div>` : ''}

      <!-- Activity Heatmap (simple) -->
      <div class="card mb-lg">
        <div class="card-title mb-md"><span>📅</span> Activity (Last 4 Weeks)</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;max-width:350px;">
          ${Array.from({length: calDays}, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (calDays - 1 - i));
            const dateStr = d.toDateString();
            const isToday = dateStr === today.toDateString();
            const isActive = dateStr === s.progress.lastActiveDate;
            return `<div title="${d.toLocaleDateString()}" style="
              width:100%;aspect-ratio:1;border-radius:3px;
              background:${isToday ? 'var(--primary)' : isActive ? 'rgba(124,58,237,0.5)' : 'var(--bg-elevated)'};
              border:${isToday ? '1px solid var(--primary-light)' : '1px solid transparent'};
              transition:var(--transition-fast);"
              onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:var(--space-md);margin-top:8px;font-size:11px;color:var(--text-muted);">
          <span style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:2px;background:var(--primary)"></div> Today</span>
          <span style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:2px;background:rgba(124,58,237,0.5)"></div> Active</span>
        </div>
      </div>

      <!-- Badges -->
      <div class="card mb-lg">
        <div class="card-title mb-md"><span>🏅</span> Achievements</div>
        <div class="badge-grid">
          ${_allBadges().map(badge => {
            const earned = (p.badges || []).find(b => b.id === badge.id);
            return `<div class="badge-item ${earned ? '' : 'locked'}" title="${badge.name}${earned ? ' — Earned!' : ' — Not earned yet'}">
              <div class="badge-emoji">${badge.emoji}</div>
              <div class="badge-name">${badge.name}</div>
              ${earned ? `<div style="font-size:9px;color:var(--success);margin-top:2px;">Earned</div>` : '<div style="font-size:9px;color:var(--text-muted);margin-top:2px;">Locked</div>'}
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Test & Interview History -->
      ${tests.length > 0 ? `
        <div class="card">
          <div class="card-title mb-md"><span>📝</span> Recent Tests</div>
          ${tests.slice(-6).reverse().map(t => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
              <div>
                <div style="font-weight:500">${t.topic}</div>
                <div style="font-size:11px;color:var(--text-muted)">${new Date(t.date).toLocaleDateString()}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700;color:${(t.correct/t.total)>=0.7?'var(--success)':(t.correct/t.total)>=0.5?'var(--warning)':'var(--danger)'}">${t.correct}/${t.total}</div>
                <div style="font-size:11px;color:var(--text-muted)">${Math.round((t.correct/t.total)*100)}%</div>
              </div>
            </div>`).join('')}
        </div>` : ''}`;
  }

  function _getLevelTitle(level) {
    const titles = ['', 'Career Beginner', 'Skill Seeker', 'Job Aspirant', 'Code Explorer',
      'Tech Learner', 'Career Builder', 'Skill Developer', 'Interview Ready',
      'Industry Pro', 'Career Champion', 'Elite Engineer', 'Legendary Dev'];
    return titles[Math.min(level, titles.length - 1)] || 'Career Master';
  }

  function _allBadges() {
    return [
      { id:'first_login',  name:'First Step',     emoji:'🚀' },
      { id:'xp_100',       name:'XP Rookie',      emoji:'⚡' },
      { id:'xp_500',       name:'XP Explorer',    emoji:'🌟' },
      { id:'xp_1000',      name:'XP Champion',    emoji:'🏆' },
      { id:'streak_3',     name:'3-Day Streak',   emoji:'🔥' },
      { id:'streak_7',     name:'Week Warrior',   emoji:'💎' },
      { id:'streak_30',    name:'Monthly Hero',   emoji:'🎖️' },
      { id:'test_1',       name:'Test Taker',     emoji:'🧪' },
      { id:'test_5',       name:'Quiz Master',    emoji:'📝' },
      { id:'interview_1',  name:'Interviewer',    emoji:'🎤' },
      { id:'interview_5',  name:'Interview Pro',  emoji:'🎯' },
    ];
  }

  return { init };
})();
