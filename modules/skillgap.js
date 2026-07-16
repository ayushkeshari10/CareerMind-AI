/**
 * modules/skillgap.js — Skill Gap Analysis Module
 */
const SkillGap = (() => {
  let radarChart = null;

  function init() {
    const el = document.getElementById('skillgap-content');
    const s  = AppState.state;

    el.innerHTML = `
      <div class="card mb-lg">
        <div class="card-header">
          <div class="card-title"><span>⚙️</span> Skill Gap Settings</div>
        </div>
        <div style="display:flex;gap:var(--space-md);flex-wrap:wrap;align-items:flex-end;">
          <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0">
            <label class="form-label">Target Role</label>
            <select id="sg-role" class="form-control">
              <option value="sde"   ${s.user.role==='sde'   ?'selected':''}>Software Development Engineer</option>
              <option value="web"   ${s.user.role==='web'   ?'selected':''}>Web Developer</option>
              <option value="data"  ${s.user.role==='data'  ?'selected':''}>Data Analyst</option>
              <option value="cloud" ${s.user.role==='cloud' ?'selected':''}>Cloud Engineer</option>
              <option value="ai"    ${s.user.role==='ai'    ?'selected':''}>AI / ML Engineer</option>
            </select>
          </div>
          ${s.resume.analysis ? 
            `<button class="btn btn-primary" onclick="SkillGap.generate(null, 'resume_only')">🔍 Analyze Skill Gap</button>` :
            `<button class="btn btn-primary" onclick="SkillGap.startAssessment('assessment_only')">📝 Take Quick Assessment</button>`
          }
        </div>
        ${!s.resume.analysis ? `<p class="text-sm text-warning mt-sm">💡 Tip: Your Skill Gap will be based on a quick self-assessment since no resume was found.</p>` : ''}
      </div>
      <div id="sg-assessment-container"></div>
      <div id="sg-results">
        ${s.skillgap.data ? _renderResults(s.skillgap.data) : _emptyState()}
      </div>`;
  }

  function _emptyState() {
    return `<div class="empty-state">
      <div class="empty-state-icon">🗺️</div>
      <h3>No analysis yet</h3>
      <p>Select your target role and click "Analyze Skill Gap" to get started.</p>
    </div>`;
  }

  let currentAssessmentQuestions = [];
  let currentAssessmentMode = 'assessment_only';
  let currentQuestionIndex = 0;
  let userAnswers = [];

  async function startAssessment(mode = 'assessment_only') {
    currentAssessmentMode = mode;
    currentQuestionIndex = 0;
    userAnswers = [];

    const role = document.getElementById('sg-role').value;
    const roleNames = { sde:'Software Development Engineer', web:'Web Developer', data:'Data Analyst', cloud:'Cloud Engineer', ai:'AI/ML Engineer' };
    const exp = AppState.state.user.experience || 'beginner';
    const goalRaw = AppState.state.user.goal || 'student';
    const goalDesc = {
      student: 'Student seeking their first job',
      unemployed: 'Actively looking for a job',
      upskill: 'Currently employed, looking to upskill and switch careers',
      grow: 'Currently employed, looking to grow in current role'
    }[goalRaw];
    
    const container = document.getElementById('sg-assessment-container');
    const resultsEl = document.getElementById('sg-results');
    resultsEl.innerHTML = ''; // Clear old results
    container.innerHTML = CareerMind.loadingHTML('Generating your self-assessment...');

    const prompt = `You are a career coach. Generate a quick 7-question multiple-choice technical self-assessment for a ${exp}-level ${roleNames[role]}.
    The user's current situation is: "${goalDesc}".
    The purpose is to gauge their current skills before doing a skill gap analysis tailored to their situation.

    Return exactly 7 questions in this JSON format:
    {
      "questions": [
        {
          "question": "Question text...",
          "options": ["Option A", "Option B", "Option C", "Option D"]
        }
      ]
    }`;

    try {
      const data = await Gemini.generateJSON(prompt);
      currentAssessmentQuestions = data.questions || [];
      _renderQuestion(0);
    } catch (e) {
      CareerMind.handleAIError(container, e);
    }
  }

  function _renderQuestion(index) {
    const container = document.getElementById('sg-assessment-container');
    const q = currentAssessmentQuestions[index];
    const total = currentAssessmentQuestions.length;
    
    const isLast = index === total - 1;
    const progressPct = ((index) / total) * 100;

    let html = `<div class="card mb-lg animate-slide-up">
      <div class="card-header">
        <div class="card-title"><span>📝</span> Self-Assessment (${index + 1} of ${total})</div>
      </div>
      <div class="progress-bar mb-md" style="height:4px;">
        <div class="progress-fill" style="width:${progressPct}%"></div>
      </div>
      
      <div class="question-block mt-sm">
        <h4 style="margin-bottom:12px;font-size:16px;color:var(--text-primary);">${index + 1}. ${q.question}</h4>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${q.options.map((opt, optIdx) => `
            <label style="display:flex;align-items:center;gap:10px;font-size:15px;cursor:pointer;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);transition:var(--transition-fast);"
                   onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
              <input type="radio" name="sg_q" value="${opt.replace(/"/g, '&quot;')}" style="accent-color:var(--primary);transform:scale(1.2);">
              ${opt}
            </label>
          `).join('')}
        </div>
      </div>

      <button class="btn btn-primary mt-lg" style="width:100%" onclick="SkillGap.nextQuestion()">
        ${isLast ? '🚀 Submit & Generate Skill Gap' : 'Next Question ➡️'}
      </button>
    </div>`;

    container.innerHTML = html;
  }

  function nextQuestion() {
    const selected = document.querySelector(`input[name="sg_q"]:checked`);
    if (!selected) {
      toast('Please select an answer before continuing.', 'error');
      return;
    }

    const q = currentAssessmentQuestions[currentQuestionIndex];
    userAnswers.push({
      question: q.question,
      answer: selected.value
    });

    if (currentQuestionIndex < currentAssessmentQuestions.length - 1) {
      currentQuestionIndex++;
      _renderQuestion(currentQuestionIndex);
    } else {
      // Finished
      const container = document.getElementById('sg-assessment-container');
      container.innerHTML = ''; // Hide assessment
      
      const summaryStr = userAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
      generate(summaryStr, currentAssessmentMode);
    }
  }

  async function generate(assessedSkills = null, mode = 'resume_only') {
    const role = document.getElementById('sg-role').value;
    const s = AppState.state;
    const resultsEl = document.getElementById('sg-results');
    resultsEl.innerHTML = CareerMind.loadingHTML('Mapping your skill gaps...');

    const roleNames = { sde:'Software Development Engineer', web:'Web Developer', data:'Data Analyst', cloud:'Cloud Engineer', ai:'AI/ML Engineer' };
    
    let currentSkills = 'Not provided';
    
    if (mode === 'resume_only') {
      currentSkills = "Resume skills: " + (s.resume.analysis?.currentSkills?.join(', ') || 'None');
    } else if (mode === 'ignore_resume' || mode === 'assessment_only') {
      currentSkills = "Self-assessment answers:\n" + assessedSkills;
    } else if (mode === 'combined') {
      currentSkills = "Resume skills: " + (s.resume.analysis?.currentSkills?.join(', ') || 'None') + "\n\nSelf-assessment answers:\n" + assessedSkills;
    }

    const exp = s.user.experience || 'beginner';
    const goalRaw = s.user.goal || 'student';
    const goalDesc = {
      student: 'Student seeking their first job',
      unemployed: 'Actively looking for a job',
      upskill: 'Currently employed, looking to upskill and switch careers',
      grow: 'Currently employed, looking to grow in current role'
    }[goalRaw];

    const prompt = `You are a career skills expert. Analyze the skill gap for a ${exp}-level candidate targeting the role of "${roleNames[role]}".
The user's current situation is: "${goalDesc}". Tailor your advice and priorities to someone in this specific situation (e.g. if they are employed and switching, focus on leveraging transferrable skills; if student, focus on fundamentals and projects).

Current skills info: ${currentSkills}

Return a JSON object with this structure:
{
  "requiredSkills": [
    {
      "name": "Skill Name",
      "category": "Core|Tools|Soft Skills|Domain",
      "importance": "Critical|Important|Nice-to-have",
      "currentLevel": <0-100 based on their skills>,
      "targetLevel": <60-90 typical target>
    }
  ],
  "missingSkills": ["skill1", "skill2"],
  "strongSkills": ["skill1", "skill2"],
  "overallReadiness": <0-100>,
  "estimatedMonthsToReady": <number>,
  "topPriorities": [
    {"skill": "name", "reason": "why it's top priority", "timeWeeks": <number>}
  ],
  "summary": "Brief assessment"
}

Include 8-12 skills total covering technical and soft skills.`;

    try {
      const data = await Gemini.generateJSON(prompt);
      AppState.set('skillgap.data', data);
      AppState.set('skillgap.generatedAt', new Date().toISOString());
      AppState.addXP(60, 'Skill gap analyzed');
      resultsEl.innerHTML = _renderResults(data);
    } catch (e) {
      CareerMind.handleAIError(resultsEl, e);
    }
  }

  function _renderResults(data) {
    if (!data) return _emptyState();
    const { requiredSkills = [], missingSkills = [], strongSkills = [], topPriorities = [] } = data;

    const radarLabels = requiredSkills.slice(0, 8).map(s => s.name);
    const currentData = requiredSkills.slice(0, 8).map(s => s.currentLevel);
    const targetData  = requiredSkills.slice(0, 8).map(s => s.targetLevel);

    const readinessColor = data.overallReadiness >= 70 ? 'var(--success)' : data.overallReadiness >= 40 ? 'var(--warning)' : 'var(--danger)';

    return `
      <div class="animate-fade-in">
        <!-- Readiness Banner -->
        <div class="card card-glow mb-lg" style="text-align:center;background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.08))">
          <div style="font-size:60px;font-weight:800;font-family:'Space Grotesk',sans-serif;color:${readinessColor}">${data.overallReadiness || 0}%</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Job Readiness Score</div>
          <p style="color:var(--text-secondary);font-size:14px;max-width:500px;margin:0 auto 16px;">${data.summary || ''}</p>
          <div style="display:flex;justify-content:center;gap:var(--space-lg);flex-wrap:wrap;">
            <div><div style="font-size:22px;font-weight:700;color:var(--accent)">${data.estimatedMonthsToReady || '?'}</div><div style="font-size:12px;color:var(--text-muted)">Months to Ready</div></div>
            <div><div style="font-size:22px;font-weight:700;color:var(--danger)">${missingSkills.length}</div><div style="font-size:12px;color:var(--text-muted)">Skills to Learn</div></div>
            <div><div style="font-size:22px;font-weight:700;color:var(--success)">${strongSkills.length}</div><div style="font-size:12px;color:var(--text-muted)">Strong Skills</div></div>
          </div>
        </div>

        <div class="grid-2 mb-lg">
          <!-- Radar Chart -->
          <div class="card">
            <div class="card-title mb-md"><span>📡</span> Skills Radar</div>
            <div class="chart-container">
              <canvas id="skill-radar-chart" width="350" height="350"></canvas>
            </div>
            <script>
              (function() {
                if (SkillGap._chart) { SkillGap._chart.destroy(); }
                const ctx = document.getElementById('skill-radar-chart').getContext('2d');
                SkillGap._chart = new Chart(ctx, {
                  type: 'radar',
                  data: {
                    labels: ${JSON.stringify(radarLabels)},
                    datasets: [
                      {
                        label: 'Current',
                        data: ${JSON.stringify(currentData)},
                        borderColor: 'rgba(124,58,237,0.8)',
                        backgroundColor: 'rgba(124,58,237,0.15)',
                        pointBackgroundColor: 'rgba(124,58,237,1)',
                        pointRadius: 4
                      },
                      {
                        label: 'Target',
                        data: ${JSON.stringify(targetData)},
                        borderColor: 'rgba(6,182,212,0.8)',
                        backgroundColor: 'rgba(6,182,212,0.08)',
                        pointBackgroundColor: 'rgba(6,182,212,1)',
                        pointRadius: 4,
                        borderDash: [5, 5]
                      }
                    ]
                  },
                  options: {
                    responsive: true,
                    scales: {
                      r: {
                        min: 0, max: 100,
                        grid: { color: 'rgba(255,255,255,0.08)' },
                        angleLines: { color: 'rgba(255,255,255,0.08)' },
                        pointLabels: { color: '#94A3B8', font: { size: 11 } },
                        ticks: { color: '#64748B', stepSize: 25, backdropColor: 'transparent' }
                      }
                    },
                    plugins: {
                      legend: { labels: { color: '#94A3B8' } }
                    }
                  }
                });
              })();
            </script>
          </div>

          <!-- Top Priority Skills -->
          <div class="card">
            <div class="card-title mb-md"><span>🎯</span> Top Priorities</div>
            ${topPriorities.map((p, i) => `
              <div style="padding:var(--space-md);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-sm);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <div style="font-weight:600;font-size:14px;">${i+1}. ${p.skill}</div>
                  <span class="chip chip-amber">${p.timeWeeks}w</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted)">${p.reason}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- All Skills Breakdown -->
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>📊</span> Skills Breakdown</div>
          ${requiredSkills.map(skill => {
            const gap = skill.targetLevel - skill.currentLevel;
            const importColor = { Critical:'red', Important:'amber', 'Nice-to-have':'green' }[skill.importance] || 'gray';
            return `
              <div class="skill-gap-item">
                <div class="skill-gap-header">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span class="skill-gap-name">${skill.name}</span>
                    <span class="chip chip-${importColor}" style="font-size:10px">${skill.importance}</span>
                    <span class="chip chip-gray" style="font-size:10px">${skill.category}</span>
                  </div>
                  <div style="text-align:right">
                    <span class="skill-gap-pct">${skill.currentLevel}% / ${skill.targetLevel}%</span>
                    ${gap > 0 ? `<div style="font-size:10px;color:var(--danger)">Gap: ${gap}%</div>` : `<div style="font-size:10px;color:var(--success)">✓ Ready</div>`}
                  </div>
                </div>
                <div class="progress-bar" style="height:8px;position:relative;">
                  <div class="progress-fill" style="width:${skill.currentLevel}%;background:${gap > 0 ? 'linear-gradient(90deg,var(--primary),var(--primary-light))' : 'linear-gradient(90deg,var(--success),#34D399)'}"></div>
                  <div style="position:absolute;top:0;left:${skill.targetLevel}%;width:2px;height:100%;background:rgba(6,182,212,0.8);"></div>
                </div>
              </div>`;
          }).join('')}
        </div>

        <!-- Missing vs Strong -->
        <div class="grid-2 mb-lg">
          <div class="card">
            <div class="card-title mb-md" style="color:var(--danger)"><span>❌</span> Skills to Learn</div>
            <div class="tag-list">${missingSkills.map(s => `<span class="chip chip-red">${s}</span>`).join('')}</div>
          </div>
          <div class="card">
            <div class="card-title mb-md" style="color:var(--success)"><span>✅</span> Your Strong Skills</div>
            <div class="tag-list">${strongSkills.map(s => `<span class="chip chip-green">${s}</span>`).join('')}</div>
          </div>
        </div>

        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap">
          <button class="btn btn-primary" onclick="CareerMind.navigate('roadmap')">📚 Get Learning Roadmap →</button>
          <button class="btn btn-ghost" onclick="CareerMind.navigate('projects')">📁 Suggested Projects →</button>
        </div>
      </div>`;
  }

  return {
    init,
    generate,
    startAssessment,
    nextQuestion
  };
})();
