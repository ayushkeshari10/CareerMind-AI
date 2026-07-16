/**
 * modules/roadmap.js — Learning Roadmap Module
 */
const Roadmap = (() => {
  function init() {
    const el = document.getElementById('roadmap-content');
    const s  = AppState.state;

    el.innerHTML = `
      <div class="card mb-lg">
        <div class="card-header">
          <div class="card-title"><span>⚙️</span> Roadmap Settings</div>
        </div>
        <div style="display:flex;gap:var(--space-md);flex-wrap:wrap;align-items:flex-end;">
          <div class="form-group" style="flex:1;min-width:180px;margin-bottom:0">
            <label class="form-label">Target Role</label>
            <select id="rm-role" class="form-control">
              <option value="sde"   ${s.user.role==='sde'   ?'selected':''}>Software Development Engineer</option>
              <option value="web"   ${s.user.role==='web'   ?'selected':''}>Web Developer</option>
              <option value="data"  ${s.user.role==='data'  ?'selected':''}>Data Analyst</option>
              <option value="cloud" ${s.user.role==='cloud' ?'selected':''}>Cloud Engineer</option>
              <option value="ai"    ${s.user.role==='ai'    ?'selected':''}>AI / ML Engineer</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:180px;margin-bottom:0">
            <label class="form-label">Time Available</label>
            <select id="rm-hours" class="form-control">
              <option value="1">~1 hour/day</option>
              <option value="2" selected>~2 hours/day</option>
              <option value="4">~4 hours/day</option>
              <option value="8">~8 hours/day (Fulltime)</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="Roadmap.generate()">
            🗺️ ${s.roadmap.data ? 'Regenerate' : 'Generate'} Roadmap
          </button>
        </div>
      </div>

      ${s.roadmap.data ? _renderProgress(s.roadmap.data, s.roadmap.completedItems || []) : ''}
      <div id="roadmap-results">
        ${s.roadmap.data ? _renderRoadmap(s.roadmap.data, s.roadmap.completedItems || []) : _emptyState()}
      </div>`;
  }

  function _emptyState() {
    return `<div class="empty-state">
      <div class="empty-state-icon">📚</div>
      <h3>No roadmap yet</h3>
      <p>Select your target role, set your available time, and click "Generate Roadmap".</p>
    </div>`;
  }

  function _renderProgress(data, completed) {
    const total = (data.phases || []).reduce((acc, p) => acc + (p.topics || []).length, 0);
    const done  = completed.length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    return `
      <div class="card mb-lg" style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.08))">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md);">
          <div class="card-title"><span>📊</span> Overall Progress</div>
          <span style="font-size:24px;font-weight:700;color:var(--primary-light)">${pct}%</span>
        </div>
        <div class="progress-bar" style="height:10px;">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div style="display:flex;gap:var(--space-lg);margin-top:var(--space-md);font-size:13px;color:var(--text-muted);">
          <span>✅ ${done} completed</span>
          <span>📌 ${total - done} remaining</span>
          <span>⏱️ ~${data.totalWeeks || '?'} weeks total</span>
        </div>
      </div>`;
  }

  async function generate() {
    const role  = document.getElementById('rm-role').value;
    const hours = document.getElementById('rm-hours').value;
    const s     = AppState.state;
    const el    = document.getElementById('roadmap-results');
    el.innerHTML = CareerMind.loadingHTML('Building your personalized roadmap...');

    const roleNames = { sde:'Software Development Engineer', web:'Web Developer', data:'Data Analyst', cloud:'Cloud Engineer', ai:'AI/ML Engineer' };
    const missingSkills = s.skillgap.data?.missingSkills?.join(', ') || 'Not specified';
    const currentSkills = s.resume.analysis?.currentSkills?.join(', ') || 'Not specified';

    const prompt = `Create a detailed learning roadmap for a ${s.user.experience || 'beginner'} targeting the role of "${roleNames[role]}" with ${hours} hours/day to study.

Current skills: ${currentSkills}
Skills to learn: ${missingSkills}

Return JSON with this structure:
{
  "totalWeeks": <number>,
  "phases": [
    {
      "phase": 1,
      "title": "Phase Title",
      "duration": "X weeks",
      "durationWeeks": <number>,
      "description": "What this phase covers",
      "topics": [
        {
          "id": "unique-id",
          "name": "Topic Name",
          "subtopics": ["subtopic1", "subtopic2"],
          "resources": [
            {"type": "Course|YouTube|Docs|Book|Practice", "name": "Resource Name", "url": "https://..."}
          ],
          "estimatedHours": <number>,
          "importance": "Critical|Important|Good-to-have"
        }
      ]
    }
  ],
  "certifications": [
    {"name": "Cert Name", "provider": "AWS/Google/etc", "priority": "High|Medium"}
  ],
  "milestones": ["milestone1", "milestone2"]
}

Create 3-5 phases with 3-5 topics each. Include real resource URLs.`;

    try {
      const data = await Gemini.generateJSON(prompt);
      AppState.set('roadmap.data', data);
      AppState.set('roadmap.completedItems', []);
      AppState.addXP(70, 'Learning roadmap generated');
      el.innerHTML = _renderRoadmap(data, []);
      // Re-render progress
      const progressEl = document.createElement('div');
      progressEl.innerHTML = _renderProgress(data, []);
      el.parentNode.insertBefore(progressEl.firstElementChild, el);
    } catch (e) {
      CareerMind.handleAIError(el, e);
    }
  }

  function _renderRoadmap(data, completed) {
    if (!data || !data.phases) return _emptyState();
    return `
      <div class="animate-fade-in">
        ${data.phases.map(phase => `
          <div class="card mb-lg">
            <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-md);padding-bottom:var(--space-md);border-bottom:1px solid var(--border);">
              <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;flex-shrink:0;">${phase.phase}</div>
              <div>
                <div style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;">${phase.title}</div>
                <div style="font-size:13px;color:var(--text-muted);">⏱️ ${phase.duration} · ${phase.description}</div>
              </div>
            </div>
            <div class="roadmap-timeline">
              ${(phase.topics || []).map(topic => {
                const isDone = completed.includes(topic.id);
                return `
                  <div class="roadmap-item ${isDone ? 'done' : ''}">
                    <div class="roadmap-item-header" onclick="Roadmap.toggleTopic('${topic.id}', '${phase.phase}')">
                      <div style="display:flex;align-items:center;gap:var(--space-sm);">
                        <input type="checkbox" ${isDone ? 'checked' : ''} onclick="event.stopPropagation();Roadmap.markComplete('${topic.id}', this.checked)"
                          style="accent-color:var(--primary);"/>
                        <div style="font-weight:600;font-size:15px;">${topic.name}</div>
                        <span class="chip chip-${topic.importance==='Critical'?'red':topic.importance==='Important'?'amber':'gray'}" style="font-size:10px">${topic.importance}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span class="chip chip-cyan">⏱️ ${topic.estimatedHours}h</span>
                        <span style="color:var(--text-muted)">▼</span>
                      </div>
                    </div>
                    <div class="roadmap-item-content" id="roadmap-topic-${topic.id}" style="display:none">
                      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:var(--space-sm);">
                        ${(topic.subtopics || []).map(st => `<span class="chip chip-gray">${st}</span>`).join('')}
                      </div>
                      <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">📌 Resources:</div>
                      <div style="display:flex;flex-direction:column;gap:6px;">
                        ${(topic.resources || []).map(r => `
                          <a href="${r.url}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-elevated);border-radius:var(--radius-sm);font-size:13px;text-decoration:none;color:var(--text-primary);transition:var(--transition-fast);"
                            onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-primary)'">
                            <span>${_resourceIcon(r.type)}</span>
                            <span style="flex:1">${r.name}</span>
                            <span class="chip chip-gray" style="font-size:10px">${r.type}</span>
                          </a>`).join('')}
                      </div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>`).join('')}

        ${data.certifications?.length ? `
          <div class="card mb-lg">
            <div class="card-title mb-md"><span>🏆</span> Recommended Certifications</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-sm);">
              ${data.certifications.map(c => `
                <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-md);">
                  <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${c.name}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">${c.provider}</div>
                  <span class="chip chip-${c.priority==='High'?'red':'amber'}">${c.priority} Priority</span>
                </div>`).join('')}
            </div>
          </div>` : ''}

        ${data.milestones?.length ? `
          <div class="card">
            <div class="card-title mb-md"><span>🎯</span> Key Milestones</div>
            <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
              ${data.milestones.map((m, i) => `
                <div style="display:flex;align-items:center;gap:var(--space-sm);">
                  <div style="width:28px;height:28px;border-radius:50%;background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--accent);flex-shrink:0;">${i+1}</div>
                  <span style="font-size:14px;">${m}</span>
                </div>`).join('')}
            </div>
          </div>` : ''}
      </div>`;
  }

  function toggleTopic(id, phase) {
    const el = document.getElementById(`roadmap-topic-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  function markComplete(id, done) {
    const completed = AppState.get('roadmap.completedItems') || [];
    if (done && !completed.includes(id)) {
      completed.push(id);
      AppState.addXP(20, 'Completed a roadmap topic');
    } else if (!done) {
      const idx = completed.indexOf(id);
      if (idx > -1) completed.splice(idx, 1);
    }
    AppState.set('roadmap.completedItems', completed);
  }

  function _resourceIcon(type) {
    const icons = { Course:'🎓', YouTube:'▶️', Docs:'📖', Book:'📚', Practice:'💻' };
    return icons[type] || '🔗';
  }

  return { init, generate, toggleTopic, markComplete };
})();
