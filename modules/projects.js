/**
 * modules/projects.js — Project Recommendations Module
 */
const Projects = (() => {
  function init() {
    const s  = AppState.state;
    const el = document.getElementById('projects-content');

    el.innerHTML = `
      <div class="card mb-lg">
        <div class="card-header">
          <div class="card-title"><span>⚙️</span> Project Settings</div>
        </div>
        <div style="display:flex;gap:var(--space-md);flex-wrap:wrap;align-items:flex-end;">
          <div class="form-group" style="flex:1;min-width:180px;margin-bottom:0">
            <label class="form-label">Target Role</label>
            <select id="proj-role" class="form-control">
              <option value="sde"   ${s.user.role==='sde'   ?'selected':''}>Software Development Engineer</option>
              <option value="web"   ${s.user.role==='web'   ?'selected':''}>Web Developer</option>
              <option value="data"  ${s.user.role==='data'  ?'selected':''}>Data Analyst</option>
              <option value="cloud" ${s.user.role==='cloud' ?'selected':''}>Cloud Engineer</option>
              <option value="ai"    ${s.user.role==='ai'    ?'selected':''}>AI / ML Engineer</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:180px;margin-bottom:0">
            <label class="form-label">Complexity Level</label>
            <select id="proj-level" class="form-control">
              <option value="beginner">Beginner (Simple)</option>
              <option value="intermediate" selected>Intermediate (Impressive)</option>
              <option value="advanced">Advanced (Production-grade)</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="Projects.generate()">
            📁 ${s.projects.data ? 'Regenerate' : 'Generate'} Projects
          </button>
        </div>
      </div>
      <div id="projects-results">
        ${s.projects.data ? _renderProjects(s.projects.data) : _emptyState()}
      </div>`;
  }

  function _emptyState() {
    return `<div class="empty-state">
      <div class="empty-state-icon">📁</div>
      <h3>No projects yet</h3>
      <p>Click "Generate Projects" to get 5 portfolio projects tailored to your role — complete with tech stacks and GitHub-ready descriptions.</p>
    </div>`;
  }

  async function generate() {
    const role  = document.getElementById('proj-role').value;
    const level = document.getElementById('proj-level').value;
    const s     = AppState.state;
    const el    = document.getElementById('projects-results');
    el.innerHTML = CareerMind.loadingHTML('Generating your personalized projects...');

    const roleNames = { sde:'Software Development Engineer', web:'Web Developer', data:'Data Analyst', cloud:'Cloud Engineer', ai:'AI/ML Engineer' };
    const currentSkills = s.resume.analysis?.currentSkills?.join(', ') || 'Not specified';

    const prompt = `Generate 5 impressive ${level}-level portfolio projects for a ${roleNames[role]} role.

Candidate's current skills: ${currentSkills}

Make them unique, resume-worthy, and showcasing real-world problem solving.

Return JSON:
{
  "projects": [
    {
      "id": 1,
      "title": "Project Title",
      "tagline": "One-line impressive description",
      "description": "2-3 sentences about what this project does and why it's impressive",
      "problemSolved": "Real-world problem this solves",
      "techStack": ["Tech1", "Tech2", "Tech3"],
      "keyFeatures": ["feature1", "feature2", "feature3", "feature4"],
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimatedDays": <number>,
      "resumeImpact": "Why recruiters will love this",
      "githubReadme": "A GitHub README description (2-3 sentences)",
      "extensions": ["Optional extension 1", "Optional extension 2"],
      "category": "Web App|Data|ML|API|System|Tool|Mobile"
    }
  ]
}`;

    try {
      const data = await Gemini.generateJSON(prompt);
      AppState.set('projects.data', data);
      AppState.set('projects.generatedAt', new Date().toISOString());
      AppState.addXP(40, 'Projects generated');
      el.innerHTML = _renderProjects(data);
    } catch (e) {
      CareerMind.handleAIError(el, e);
    }
  }

  function _renderProjects(data) {
    if (!data?.projects?.length) return _emptyState();
    const colors = ['purple', 'cyan', 'green', 'amber', 'blue'];

    return `
      <div class="animate-fade-in">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--space-lg);">
          ${data.projects.map((p, i) => `
            <div class="project-card animate-slide-up" style="animation-delay:${i*0.08}s">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-sm);">
                <div class="project-number">Project ${p.id}</div>
                <div style="display:flex;gap:4px;">
                  <span class="chip chip-${colors[i % colors.length]}" style="font-size:10px">${p.category}</span>
                  <span class="chip chip-${p.difficulty==='Beginner'?'green':p.difficulty==='Intermediate'?'amber':'red'}" style="font-size:10px">${p.difficulty}</span>
                </div>
              </div>
              <div class="project-title">${p.title}</div>
              <div style="font-size:13px;color:var(--accent);font-weight:500;margin-bottom:var(--space-sm);font-style:italic">${p.tagline}</div>
              <div class="project-desc">${p.description}</div>

              <!-- Problem Solved -->
              <div style="background:rgba(16,185,129,0.08);border-left:3px solid var(--success);padding:8px 12px;border-radius:0 var(--radius-sm) var(--radius-sm) 0;margin-bottom:var(--space-md);">
                <div style="font-size:11px;font-weight:700;color:var(--success);text-transform:uppercase;margin-bottom:2px;">Solves</div>
                <div style="font-size:12px;color:var(--text-secondary)">${p.problemSolved}</div>
              </div>

              <!-- Tech Stack -->
              <div class="project-stack mb-md">
                ${(p.techStack || []).map(t => `<span class="chip chip-purple">${t}</span>`).join('')}
              </div>

              <!-- Key Features -->
              <div style="margin-bottom:var(--space-md);">
                <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Key Features</div>
                ${(p.keyFeatures || []).map(f => `
                  <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);margin-bottom:3px;">
                    <span style="color:var(--accent)">→</span>${f}
                  </div>`).join('')}
              </div>

              <!-- Footer -->
              <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:var(--space-sm);">
                <div style="font-size:12px;color:var(--text-muted)">⏱️ ~${p.estimatedDays} days</div>
                <button class="btn btn-ghost btn-sm" onclick="Projects.showDetails(${i})">Details →</button>
              </div>
            </div>`).join('')}
        </div>

        <!-- Full Details Modal Placeholder -->
        <div id="project-details-modal" class="hidden" style="margin-top:var(--space-xl)"></div>
      </div>`;
  }

  function showDetails(idx) {
    const data = AppState.get('projects.data');
    if (!data) return;
    const p = data.projects[idx];
    const el = document.getElementById('project-details-modal');
    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="card card-glow animate-slide-up">
        <div class="card-header">
          <div class="card-title"><span>📁</span> ${p.title}</div>
          <button class="icon-btn" onclick="document.getElementById('project-details-modal').classList.add('hidden')">✕</button>
        </div>

        <!-- GitHub README -->
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-md);margin-bottom:var(--space-md);">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">📄 GitHub README</div>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.7;">${p.githubReadme}</p>
          <button class="btn btn-ghost btn-sm mt-sm" onclick="navigator.clipboard.writeText('${(p.githubReadme||'').replace(/'/g,"\\'")}');CareerMind.toast('Copied!','success')">📋 Copy</button>
        </div>

        <!-- Resume Impact -->
        <div style="background:rgba(124,58,237,0.08);border-left:3px solid var(--primary);padding:var(--space-md);border-radius:0 var(--radius-md) var(--radius-md) 0;margin-bottom:var(--space-md);">
          <div style="font-size:12px;font-weight:700;color:var(--primary-light);text-transform:uppercase;margin-bottom:4px;">🚀 Resume Impact</div>
          <p style="font-size:13px;color:var(--text-secondary);">${p.resumeImpact}</p>
        </div>

        <!-- Extensions -->
        ${p.extensions?.length ? `
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">🔮 Extensions</div>
            ${p.extensions.map(e => `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">• ${e}</div>`).join('')}
          </div>` : ''}
      </div>`;
    el.scrollIntoView({ behavior: 'smooth' });
  }

  return { init, generate, showDetails };
})();
