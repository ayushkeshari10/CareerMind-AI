/**
 * modules/resume.js — Resume Analyzer Module
 */
const Resume = (() => {
  let pdfWorkerSet = false;

  function init() {
    if (!pdfWorkerSet) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfWorkerSet = true;
    }
    const s = AppState.state;
    const el = document.getElementById('resume-content');

    el.innerHTML = `
      <div class="grid-2" style="gap:var(--space-lg)">
        <!-- Left: Input Panel -->
        <div>
          <div class="card mb-lg">
            <div class="card-header">
              <div class="card-title"><span>📤</span> Upload or Paste Resume</div>
            </div>
            <!-- Upload Zone -->
            <div class="upload-zone" id="resume-upload-zone"
              onclick="document.getElementById('resume-file-input').click()"
              ondragover="event.preventDefault();this.classList.add('dragging')"
              ondragleave="this.classList.remove('dragging')"
              ondrop="Resume.handleDrop(event)">
              <div class="upload-icon">📄</div>
              <div class="upload-title">Drop your PDF here</div>
              <div class="upload-sub">or click to browse · PDF, DOC, TXT</div>
            </div>
            <input type="file" id="resume-file-input" accept=".pdf,.txt,.doc,.docx" style="display:none"
              onchange="Resume.handleFileSelect(event)"/>

            <div class="divider-label">or paste text</div>

            <div class="form-group">
              <textarea id="resume-text-input" class="form-control" rows="10"
                placeholder="Paste your resume content here...">${s.resume.text || ''}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Target Role</label>
              <select id="resume-role-select" class="form-control">
                <option value="sde"   ${s.user.role==='sde'   ? 'selected':''}>Software Development Engineer (SDE)</option>
                <option value="web"   ${s.user.role==='web'   ? 'selected':''}>Web Developer (Frontend/Fullstack)</option>
                <option value="data"  ${s.user.role==='data'  ? 'selected':''}>Data Analyst</option>
                <option value="cloud" ${s.user.role==='cloud' ? 'selected':''}>Cloud Engineer</option>
                <option value="ai"    ${s.user.role==='ai'    ? 'selected':''}>AI / ML Engineer</option>
              </select>
            </div>
            <button class="btn btn-primary btn-block btn-lg" onclick="Resume.analyze()">
              🔍 Analyze My Resume
            </button>
          </div>
        </div>

        <!-- Right: Results Panel -->
        <div id="resume-results-panel">
          ${s.resume.analysis ? _renderResults(s.resume.analysis) : _emptyState()}
        </div>
      </div>`;
  }

  function _emptyState() {
    return `<div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <h3>Waiting for your resume</h3>
      <p>Upload or paste your resume and click Analyze to get your personalized AI feedback.</p>
    </div>`;
  }

  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    await _readFile(file);
  }

  async function handleDrop(event) {
    event.preventDefault();
    document.getElementById('resume-upload-zone').classList.remove('dragging');
    const file = event.dataTransfer.files[0];
    if (!file) return;
    await _readFile(file);
  }

  async function _readFile(file) {
    if (file.type === 'application/pdf') {
      CareerMind.toast('Reading PDF...', 'info', 2000);
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        document.getElementById('resume-text-input').value = text.trim();
        CareerMind.toast('PDF loaded successfully!', 'success');
      } catch (e) {
        CareerMind.toast('Could not read PDF. Please paste text manually.', 'error');
      }
    } else {
      const text = await file.text();
      document.getElementById('resume-text-input').value = text;
      CareerMind.toast('File loaded!', 'success');
    }
  }

  async function analyze() {
    const text = document.getElementById('resume-text-input').value.trim();
    const role = document.getElementById('resume-role-select').value;
    if (!text || text.length < 100) {
      CareerMind.toast('Please paste your resume content (at least 100 characters).', 'error');
      return;
    }

    const resultsPanel = document.getElementById('resume-results-panel');
    resultsPanel.innerHTML = CareerMind.loadingHTML('Analyzing your resume...');

    const roleNames = {
      sde:'Software Development Engineer', web:'Web Developer',
      data:'Data Analyst', cloud:'Cloud Engineer', ai:'AI/ML Engineer'
    };
    const roleName = roleNames[role] || role;

    const prompt = `You are an expert ATS resume reviewer and career coach. Analyze the following resume for a candidate targeting the role of "${roleName}".

RESUME TEXT:
${text.substring(0, 6000)}

Provide a comprehensive analysis as a JSON object with this EXACT structure:
{
  "atsScore": <number 0-100>,
  "grade": "<A+|A|B+|B|C+|C|D|F>",
  "summary": "<2-3 sentence overall assessment>",
  "currentSkills": ["skill1", "skill2", ...],
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendations": [
    {"title": "Action title", "detail": "Specific actionable detail"}
  ],
  "sectionScores": {
    "contact": <0-100>,
    "summary": <0-100>,
    "experience": <0-100>,
    "skills": <0-100>,
    "education": <0-100>,
    "projects": <0-100>
  },
  "keywordsFound": ["kw1", "kw2"],
  "keywordsMissing": ["kw1", "kw2"],
  "estimatedExperience": "<Entry|Junior|Mid|Senior>",
  "roleMatch": <0-100>
}`;

    try {
      const analysis = await Gemini.generateJSON(prompt);
      AppState.set('resume.text', text);
      AppState.set('resume.analysis', analysis);
      AppState.set('resume.analyzedAt', new Date().toISOString());
      AppState.set('resume.role', role);
      // Clear cached skillgap/roadmap since resume changed
      AppState.set('skillgap.data', null);
      AppState.set('roadmap.data', null);
      AppState.addXP(80, 'Resume analyzed');
      resultsPanel.innerHTML = _renderResults(analysis);
    } catch (e) {
      CareerMind.handleAIError(resultsPanel, e);
    }
  }

  function _renderResults(a) {
    if (!a) return _emptyState();
    const scoreColor = a.atsScore >= 75 ? 'success' : a.atsScore >= 50 ? 'warning' : 'danger';
    const gradeColor = { A:  'success', B: 'cyan', C: 'warning', D: 'danger', F: 'danger' }[a.grade?.[0]] || 'cyan';

    return `
      <div class="animate-fade-in">
        <!-- Score Header -->
        <div class="card card-glow mb-lg" style="text-align:center;background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.1))">
          <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-xl);flex-wrap:wrap;">
            <div>
              <div style="font-size:64px;font-weight:800;font-family:'Space Grotesk',sans-serif;color:var(--${scoreColor})">${a.atsScore}</div>
              <div style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">ATS Score</div>
            </div>
            <div>
              <div style="font-size:48px;font-weight:700;color:var(--${gradeColor});font-family:'Space Grotesk',sans-serif;">${a.grade || 'B'}</div>
              <div style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Overall Grade</div>
            </div>
            <div>
              <div style="font-size:48px;font-weight:700;color:var(--accent);font-family:'Space Grotesk',sans-serif;">${a.roleMatch || '--'}%</div>
              <div style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Role Match</div>
            </div>
          </div>
          <p style="margin-top:var(--space-md);color:var(--text-secondary);font-size:14px;">${a.summary || ''}</p>
        </div>

        <!-- Section Scores -->
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>📊</span> Section Scores</div>
          ${Object.entries(a.sectionScores || {}).map(([section, score]) => `
            <div class="skill-gap-item">
              <div class="skill-gap-header">
                <span class="skill-gap-name">${section.charAt(0).toUpperCase() + section.slice(1)}</span>
                <span class="skill-gap-pct">${score}/100</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${score >= 75 ? 'success' : score >= 50 ? '' : 'danger'}" style="width:${score}%"></div>
              </div>
            </div>`).join('')}
        </div>

        <!-- Strengths & Weaknesses -->
        <div class="grid-2 mb-lg">
          <div class="card">
            <div class="card-title mb-md" style="color:var(--success)"><span>✅</span> Strengths</div>
            ${(a.strengths || []).map(s => `
              <div style="display:flex;gap:8px;margin-bottom:8px;">
                <span style="color:var(--success);flex-shrink:0">•</span>
                <span style="font-size:13px;color:var(--text-secondary)">${s}</span>
              </div>`).join('')}
          </div>
          <div class="card">
            <div class="card-title mb-md" style="color:var(--danger)"><span>⚠️</span> Areas to Improve</div>
            ${(a.weaknesses || []).map(w => `
              <div style="display:flex;gap:8px;margin-bottom:8px;">
                <span style="color:var(--danger);flex-shrink:0">•</span>
                <span style="font-size:13px;color:var(--text-secondary)">${w}</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- Current Skills -->
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>💼</span> Detected Skills</div>
          <div class="tag-list">
            ${(a.currentSkills || []).map(s => `<span class="chip chip-purple">${s}</span>`).join('')}
          </div>
        </div>

        <!-- Missing Keywords -->
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>🔑</span> Keywords to Add</div>
          <div class="tag-list">
            ${(a.keywordsMissing || []).map(k => `<span class="chip chip-red">${k}</span>`).join('')}
          </div>
        </div>

        <!-- Recommendations -->
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>💡</span> Action Items</div>
          ${(a.recommendations || []).map((r, i) => `
            <div style="display:flex;gap:var(--space-md);padding:var(--space-md) 0;border-bottom:1px solid var(--border);">
              <div style="width:28px;height:28px;background:rgba(124,58,237,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--primary-light);flex-shrink:0;">${i+1}</div>
              <div>
                <div style="font-weight:600;font-size:14px;margin-bottom:2px;">${r.title}</div>
                <div style="font-size:13px;color:var(--text-secondary)">${r.detail}</div>
              </div>
            </div>`).join('')}
        </div>

        <!-- Next Steps -->
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap">
          <button class="btn btn-primary" onclick="CareerMind.navigate('skillgap')">🗺️ View Skill Gap →</button>
          <button class="btn btn-accent" onclick="CareerMind.navigate('roadmap')">📚 Get Roadmap →</button>
          <button class="btn btn-ghost" onclick="CareerMind.navigate('jdanalyzer')">📋 Match a Job →</button>
        </div>
      </div>`;
  }

  return { init, analyze, handleFileSelect, handleDrop };
})();
