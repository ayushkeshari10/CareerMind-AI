/**
 * modules/jdanalyzer.js — Job Description Analyzer Module
 */
const JDAnalyzer = (() => {
  function init() {
    const s  = AppState.state;
    const el = document.getElementById('jdanalyzer-content');

    el.innerHTML = `
      <div class="grid-2" style="gap:var(--space-lg);">
        <!-- Input Panel -->
        <div>
          <div class="card mb-lg">
            <div class="card-header">
              <div class="card-title"><span>📋</span> Paste Job Description</div>
            </div>
            <div class="form-group">
              <textarea id="jd-input" class="form-control" rows="14"
                placeholder="Paste the full job description here (title, requirements, responsibilities)..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Your Resume (for matching)</label>
              <textarea id="jd-resume-input" class="form-control" rows="4"
                placeholder="Paste your resume or leave blank to use analyzed resume...">${s.resume.text || ''}</textarea>
            </div>
            <button class="btn btn-primary btn-block btn-lg" onclick="JDAnalyzer.analyze()">
              🔍 Analyze Match
            </button>
            ${!s.resume.analysis ? `<p class="text-xs text-muted mt-sm">💡 <a href="#" onclick="CareerMind.navigate('resume')" style="color:var(--accent)">Analyze your resume first</a> for better matching.</p>` : ''}
          </div>
        </div>

        <!-- Results Panel -->
        <div id="jd-results">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3>Paste a job description</h3>
            <p>We'll analyze how well you match and give you tailoring tips to improve your chances.</p>
          </div>
        </div>
      </div>`;
  }

  async function analyze() {
    const jd = document.getElementById('jd-input').value.trim();
    const resumeText = document.getElementById('jd-resume-input').value.trim() ||
                       AppState.get('resume.text') || '';

    if (!jd || jd.length < 50) {
      CareerMind.toast('Please paste a job description (at least 50 characters).', 'error');
      return;
    }

    const resultsEl = document.getElementById('jd-results');
    resultsEl.innerHTML = CareerMind.loadingHTML('Analyzing your match...');

    const prompt = `You are an expert ATS and career consultant. Analyze the match between this resume and job description.

JOB DESCRIPTION:
${jd.substring(0, 3000)}

RESUME:
${resumeText.substring(0, 3000) || 'No resume provided — analyze the JD only.'}

Return JSON:
{
  "overallMatch": <0-100>,
  "matchGrade": "<Excellent|Strong|Good|Fair|Weak>",
  "company": "<company name if found>",
  "roleTitle": "<job title>",
  "keyRequirements": [
    {"skill": "name", "required": true|false, "matched": true|false, "weight": "High|Medium|Low"}
  ],
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "keywordsToAdd": ["keyword1", "keyword2"],
  "resumeTweaks": [
    {"section": "Skills|Experience|Summary", "suggestion": "Specific action to take"}
  ],
  "coverLetterTips": ["tip1", "tip2"],
  "salaryRange": "<estimated range based on role and location if mentioned>",
  "redFlags": ["potential concern about this job"],
  "greenFlags": ["positive aspects of this job posting"],
  "tailoredSummary": "<rewritten professional summary tailored to this JD>"
}`;

    try {
      const data = await Gemini.generateJSON(prompt);
      AppState.addXP(30, 'JD analyzed');
      resultsEl.innerHTML = _renderResults(data);
    } catch (e) {
      CareerMind.handleAIError(resultsEl, e);
    }
  }

  function _renderResults(d) {
    const matchColor = d.overallMatch >= 70 ? 'var(--success)' : d.overallMatch >= 50 ? 'var(--warning)' : 'var(--danger)';
    const gradeColor = { Excellent:'green', Strong:'cyan', Good:'amber', Fair:'amber', Weak:'red' }[d.matchGrade] || 'gray';

    return `
      <div class="animate-fade-in">
        <!-- Match Score -->
        <div class="card card-glow mb-lg" style="text-align:center;background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(6,182,212,0.08))">
          ${d.roleTitle ? `<div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">${d.company || 'Company'}</div>` : ''}
          ${d.roleTitle ? `<div style="font-size:18px;font-weight:700;margin-bottom:var(--space-md);">${d.roleTitle}</div>` : ''}
          <div style="font-size:72px;font-weight:800;font-family:'Space Grotesk',sans-serif;color:${matchColor};line-height:1;">${d.overallMatch}%</div>
          <div style="font-size:16px;font-weight:600;margin:8px 0;">Match Score</div>
          <span class="chip chip-${gradeColor}" style="font-size:14px;padding:6px 16px;">${d.matchGrade} Match</span>
          ${d.salaryRange ? `<div style="margin-top:var(--space-md);font-size:13px;color:var(--accent);">💰 Estimated: ${d.salaryRange}</div>` : ''}
        </div>

        <!-- Requirements Match -->
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>📊</span> Requirements Analysis</div>
          ${(d.keyRequirements || []).map(r => `
            <div style="display:flex;align-items:center;gap:var(--space-sm);padding:6px 0;border-bottom:1px solid var(--border);">
              <span style="font-size:16px">${r.matched ? '✅' : '❌'}</span>
              <span style="flex:1;font-size:13px;">${r.skill}</span>
              <span class="chip chip-${r.weight==='High'?'red':r.weight==='Medium'?'amber':'gray'}" style="font-size:10px">${r.weight}</span>
              ${!r.required ? `<span class="chip chip-gray" style="font-size:10px">Optional</span>` : ''}
            </div>`).join('')}
        </div>

        <!-- Matched & Missing -->
        <div class="grid-2 mb-lg">
          <div class="card">
            <div class="card-title mb-md" style="color:var(--success)"><span>✅</span> You Have</div>
            <div class="tag-list">${(d.matchedSkills || []).map(s => `<span class="chip chip-green">${s}</span>`).join('')}</div>
          </div>
          <div class="card">
            <div class="card-title mb-md" style="color:var(--danger)"><span>❌</span> You're Missing</div>
            <div class="tag-list">${(d.missingSkills || []).map(s => `<span class="chip chip-red">${s}</span>`).join('')}</div>
          </div>
        </div>

        <!-- Keywords to Add -->
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>🔑</span> Keywords to Add to Resume</div>
          <div class="tag-list">${(d.keywordsToAdd || []).map(k => `<span class="chip chip-amber">${k}</span>`).join('')}</div>
        </div>

        <!-- Resume Tweaks -->
        <div class="card mb-lg">
          <div class="card-title mb-md"><span>✏️</span> Resume Tweaks</div>
          ${(d.resumeTweaks || []).map((t, i) => `
            <div style="display:flex;gap:var(--space-md);padding:var(--space-sm) 0;border-bottom:1px solid var(--border);">
              <span class="chip chip-cyan" style="flex-shrink:0">${t.section}</span>
              <span style="font-size:13px;color:var(--text-secondary)">${t.suggestion}</span>
            </div>`).join('')}
        </div>

        <!-- Tailored Summary -->
        ${d.tailoredSummary ? `
          <div class="card mb-lg">
            <div class="card-title mb-md"><span>📝</span> Tailored Professional Summary</div>
            <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-md);font-size:14px;color:var(--text-secondary);line-height:1.7;font-style:italic;">
              "${d.tailoredSummary}"
            </div>
            <button class="btn btn-ghost btn-sm mt-sm" onclick="navigator.clipboard.writeText('${d.tailoredSummary.replace(/'/g,"\\'")}');CareerMind.toast('Copied!','success')">
              📋 Copy
            </button>
          </div>` : ''}

        <!-- Green & Red Flags -->
        <div class="grid-2 mb-lg">
          ${d.greenFlags?.length ? `<div class="card">
            <div class="card-title mb-md" style="color:var(--success)"><span>🟢</span> Green Flags</div>
            ${d.greenFlags.map(f => `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">✓ ${f}</div>`).join('')}
          </div>` : ''}
          ${d.redFlags?.length ? `<div class="card">
            <div class="card-title mb-md" style="color:var(--danger)"><span>🔴</span> Watch Out</div>
            ${d.redFlags.map(f => `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">⚠ ${f}</div>`).join('')}
          </div>` : ''}
        </div>

        <!-- Cover Letter Tips -->
        ${d.coverLetterTips?.length ? `
          <div class="card">
            <div class="card-title mb-md"><span>✉️</span> Cover Letter Tips</div>
            ${d.coverLetterTips.map((t, i) => `
              <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-sm);">
                <div style="width:24px;height:24px;border-radius:50%;background:rgba(6,182,212,0.15);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${i+1}</div>
                <span style="font-size:13px;color:var(--text-secondary)">${t}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  }

  return { init, analyze };
})();
