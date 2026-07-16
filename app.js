/**
 * app.js — Main App Orchestrator
 * Navigation, onboarding, settings, toasts, theme
 */

const CareerMind = (() => {
  // ── Module registry ──────────────────────────────────────
  const moduleMap = {
    dashboard:  () => Dashboard.init(),
    motivation: () => Motivation.init(),
    resume:     () => Resume.init(),
    skillgap:   () => SkillGap.init(),
    roadmap:    () => Roadmap.init(),
    jdanalyzer: () => JDAnalyzer.init(),
    projects:   () => Projects.init(),
    interview:  () => Interview.init(),
    weeklytest: () => WeeklyTest.init(),
    chat:       () => Chat.init(),
    studyplan:  () => StudyPlan.init(),
    progress:   () => Progress.init()
  };

  const viewTitles = {
    dashboard:  'Dashboard',
    motivation: 'Daily Motivation',
    resume:     'Resume Analyzer',
    skillgap:   'Skill Gap Analysis',
    roadmap:    'Learning Roadmap',
    jdanalyzer: 'JD Analyzer',
    projects:   'Project Recommendations',
    interview:  'Mock Interview Coach',
    weeklytest: 'Weekly Test',
    chat:       'AI Mentor Chat',
    studyplan:  'Study Planner',
    progress:   'My Progress'
  };

  let initializedViews = new Set();
  let currentView = 'dashboard';
  let sidebarCollapsed = false;

  // ── Navigation ───────────────────────────────────────────
  function navigate(viewId, pushHistory = true) {
    if (!viewTitles[viewId]) return;

    if (pushHistory) {
      window.history.pushState({ view: viewId }, '', `#${viewId}`);
    }

    // Hide current view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show new view
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');

    const navEl = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (navEl) navEl.classList.add('active');

    // Update topbar title
    document.getElementById('topbar-title').textContent = viewTitles[viewId];

    // Close mobile sidebar if open
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Scroll to top
    document.getElementById('view-container').scrollTop = 0;

    // Sync mobile bottom nav
    if (typeof MobileNav !== 'undefined') MobileNav.setActive(viewId);

    // Initialize module if first visit
    if (!initializedViews.has(viewId)) {
      initializedViews.add(viewId);
      try {
        moduleMap[viewId]?.();
      } catch (e) {
        console.error(`Error initializing ${viewId}:`, e);
      }
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar')?.classList.remove('mobile-open');
      document.getElementById('sidebar-backdrop')?.classList.remove('active');
    }

    currentView = viewId;
  }

  // ── Onboarding ───────────────────────────────────────────
  const onboarding = {
    async launch() {
      const name       = document.getElementById('ob-name').value.trim();
      const role       = document.getElementById('ob-role').value;
      const customRole = document.getElementById('ob-custom-role').value.trim();
      const exp        = document.getElementById('ob-exp').value;
      const goal       = document.getElementById('ob-goal').value;

      if (!name || !role) {
        toast('Please fill in your name and target role.', 'error');
        return;
      }

      const btn = document.getElementById('ob-launch-btn');
      btn.disabled = true;
      btn.textContent = '🚀 Launching...';

      // Save profile
      AppState.set('user.name', name);
      AppState.set('user.role', role);
      AppState.set('user.customRole', customRole);
      AppState.set('user.experience', exp);
      AppState.set('user.goal', goal);
      AppState.set('setupComplete', true);
      AppState.updateStreak();
      AppState.addXP(50, 'Welcome to CareerMind!');
      AppState.checkBadges();

      // Launch app
      document.getElementById('onboarding').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      _updateUserUI();
      navigate('dashboard');
      toast(`Welcome, ${name}! Your career journey starts now. 🚀`, 'success');
    }
  };

  function _showObStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`)?.classList.add('active');
  }

  // Custom role toggle
  function _initCustomRoleToggle() {
    const roleSelects = [
      { sel: 'ob-role', group: 'ob-custom-role-group' },
      { sel: 's-role',  group: 's-custom-role-group'  }
    ];
    for (const { sel, group } of roleSelects) {
      const el = document.getElementById(sel);
      if (el) {
        el.addEventListener('change', () => {
          const g = document.getElementById(group);
          if (g) g.style.display = el.value === 'custom' ? 'block' : 'none';
        });
      }
    }
  }

  // ── Theme ────────────────────────────────────────────────
  function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    AppState.set('theme', newTheme);
    document.getElementById('theme-toggle-btn').textContent = newTheme === 'dark' ? '🌙' : '☀️';
  }

  // ── Sidebar ──────────────────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (window.innerWidth <= 768) {
      // Mobile drawer behavior
      sidebar.classList.toggle('mobile-open');
      backdrop?.classList.toggle('active');
    } else {
      // Desktop collapse behavior
      const btn = document.getElementById('sidebar-toggle');
      sidebarCollapsed = !sidebarCollapsed;
      sidebar.classList.toggle('collapsed', sidebarCollapsed);
      if (btn) btn.textContent = sidebarCollapsed ? '›' : '‹';
    }
  }

  // ── Settings Modal ───────────────────────────────────────────
  function openSettings() {
    const s = AppState.state;
    const nameEl = document.getElementById('s-name');
    const roleEl = document.getElementById('s-role');
    const customEl = document.getElementById('s-custom-role');
    const expEl  = document.getElementById('s-exp');
    const goalEl = document.getElementById('s-goal');
    
    if (nameEl)   nameEl.value   = s.user.name   || '';
    if (roleEl)   roleEl.value   = s.user.role   || 'sde';
    if (customEl) customEl.value = s.user.customRole || '';
    if (expEl)    expEl.value    = s.user.experience || 'beginner';
    if (goalEl)   goalEl.value   = s.user.goal   || 'student';
    
    document.getElementById('settings-modal').classList.remove('hidden');
  }

  function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  }

  function saveSettings() {
    const name   = document.getElementById('s-name')?.value.trim();
    const role   = document.getElementById('s-role')?.value;
    const custom = document.getElementById('s-custom-role')?.value.trim();
    const exp    = document.getElementById('s-exp')?.value;
    const goal   = document.getElementById('s-goal')?.value;
    
    if (!name) { toast('Name cannot be empty.', 'error'); return; }
    
    AppState.set('user.name', name);
    AppState.set('user.role', role);
    AppState.set('user.customRole', custom);
    AppState.set('user.experience', exp);
    AppState.set('user.goal', goal);
    
    _updateUserUI();
    closeSettings();
    toast('Settings saved!', 'success');
  }

  // ── Modals & Actions ─────────────────────────────────────
  let confirmCallback = null;

  function confirmAction(title, message, confirmText, callback) {
    const modal = document.getElementById('custom-confirm-modal');
    if (!modal) return;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    const btn = document.getElementById('modal-confirm-btn');
    btn.textContent = confirmText;
    // Remove old listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', () => {
      if (callback) callback();
      closeModal();
    });
    
    modal.classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('custom-confirm-modal')?.classList.add('hidden');
  }

  function resetApp() {
    confirmAction('Reset App Data', 'Are you sure you want to delete ALL your progress? This cannot be undone.', 'Reset Data', () => {
      AppState.reset();
      location.reload();
    });
  }

  async function logout() {
    confirmAction('Log Out', 'Are you sure you want to log out of your account?', 'Log Out', async () => {
      try {
        await AuthService.signOut();
      } catch (e) {
        toast('Sign out failed. Please try again.', 'error');
      }
    });
  }

  // ── Topbar update ────────────────────────────────────────
  function updateTopbar() {
    const s = AppState.state;
    document.getElementById('topbar-streak').textContent = `🔥 ${s.progress.streak} day${s.progress.streak !== 1 ? 's' : ''}`;
    document.getElementById('topbar-xp').textContent     = `⚡ ${s.progress.xp} XP`;
  }

  function _updateUserUI() {
    const s = AppState.state;
    const name = s.user.name || 'User';
    const role = AppState.getRoleDisplay(s.user.role, s.user.customRole);

    const av = document.getElementById('sidebar-avatar');
    if (av) { av.textContent = name.charAt(0).toUpperCase(); }
    const sn = document.getElementById('sidebar-name');
    if (sn) sn.textContent = name;
    const sr = document.getElementById('sidebar-role');
    if (sr) sr.textContent = role;

    // Dashboard greeting
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const gEl = document.getElementById('dash-greeting');
    if (gEl) gEl.textContent = `${greet}, ${name}! 👋`;
  }

  // ── Toast Notifications ──────────────────────────────────
  function toast(message, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span>${message}`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ── AI Error Handler ─────────────────────────────────────
  function handleAIError(el, error) {
    el.innerHTML = `
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius-md);padding:var(--space-md);">
        <strong style="color:var(--danger);">⚠️ AI Error</strong>
        <p style="color:var(--text-secondary);font-size:13px;margin-top:4px;">${error.message}</p>
        ${error.message.includes('API key') || error.message.includes('key') ? `
          <p style="font-size:12px;color:var(--accent);margin-top:8px;">
            → <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent)">Get your free Gemini API key here</a>, then add it in <button onclick="CareerMind.openSettings()" style="color:var(--primary-light);text-decoration:underline;background:none;border:none;cursor:pointer;font-size:12px;">Settings ⚙️</button>
          </p>
        ` : '<p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Please try again.</p>'}
      </div>`;
  }

  // ── Loading HTML helpers ─────────────────────────────────
  function loadingHTML(text = 'AI is thinking...') {
    return `<div class="ai-loading">
      <div class="ai-loading-dots">
        <div class="ai-loading-dot"></div>
        <div class="ai-loading-dot"></div>
        <div class="ai-loading-dot"></div>
      </div>
      <p>${text}</p>
    </div>`;
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    _initCustomRoleToggle();

    // Apply saved theme (from localStorage for instant paint)
    const savedTheme = localStorage.getItem('careermind_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.textContent = savedTheme === 'light' ? '☀️' : '🌙';

    // Initialize lucide icons
    if (window.lucide) lucide.createIcons();

    // ── Browser History & Back Button ────────────────────────
    window.addEventListener('popstate', (e) => {
      const state = e.state;
      if (state && state.view) {
        // User navigated back to a previous section
        navigate(state.view, false);
      }
    });

    // Show loading screen while Firebase checks auth
    const loadingScreen = document.getElementById('loading-screen');
    const authScreen    = document.getElementById('auth-screen');
    const appEl         = document.getElementById('app');

    if (loadingScreen) loadingScreen.style.display = 'flex';
    if (authScreen)    authScreen.style.display = 'none';

    // ── Firebase Auth State Listener ──────────────────────────
    AuthService.onAuthStateChanged(async (user) => {
      if (loadingScreen) loadingScreen.style.display = 'none';

      if (user) {
        // ── LOGGED IN ──────────────────────────────────────
        if (authScreen) authScreen.style.display = 'none';

        // Load user data from Firestore
        try {
          await AppState.initForUser(user.uid);
        } catch (e) {
          console.warn('Failed to load from Firestore:', e);
        }

        // Show the app
        appEl.classList.remove('hidden');
        _updateUserUI();
        updateTopbar();

        // Handle URL Hash for Deep Linking and Browser History
        const hashView = window.location.hash.replace('#', '');
        const startView = viewTitles[hashView] ? hashView : 'dashboard';
        
        // Setup initial history state (replace) so back button exits when on first page
        const startUrl = startView === 'dashboard' ? window.location.pathname : `#${startView}`;
        window.history.replaceState({ view: startView }, '', startUrl);
        navigate(startView, false);
      } else {
        // ── NOT LOGGED IN ──────────────────────────────────
        appEl.classList.add('hidden');
        if (authScreen) authScreen.style.display = 'flex';
      }
    });
  }

  // Run init on DOM ready
  document.addEventListener('DOMContentLoaded', init);


  // Expose public API
  return {
    navigate,
    toggleTheme,
    toggleSidebar,
    openSettings,
    closeSettings,
    saveSettings,
    resetApp,
    logout,
    updateTopbar,
    toast,
    handleAIError,
    loadingHTML,
    confirmAction,
    closeModal,
    get currentView() { return currentView; }
  };
})();


/* ══════════════════════════════════════
   MOBILE NAVIGATION CONTROLLER
══════════════════════════════════════ */
const MobileNav = (() => {
  // Map of view → which bottom nav item to highlight
  const navMap = {
    dashboard:  'dashboard',
    resume:     'resume',
    chat:       'chat',
    interview:  'interview',
    motivation: 'more',
    skillgap:   'more',
    roadmap:    'more',
    jdanalyzer:'more',
    weeklytest: 'more',
    projects:   'more',
    progress:   'more',
    studyplan:  'more',
  };

  const bottomNavItems = ['dashboard', 'resume', 'chat', 'interview', 'more'];

  function setActive(viewId) {
    // Determine which bottom nav tab to highlight
    const activeTab = navMap[viewId] || 'more';
    bottomNavItems.forEach(id => {
      const el = document.getElementById(`mnav-${id}`);
      if (el) el.classList.toggle('active', id === activeTab);
    });

    // Also update drawer items
    document.querySelectorAll('.mobile-drawer-item').forEach(item => {
      item.classList.remove('active');
    });
  }

  function toggleDrawer() {
    const drawer  = document.getElementById('mobile-more-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const isOpen  = drawer?.classList.contains('open');
    if (isOpen) {
      closeDrawer();
    } else {
      drawer?.classList.add('open');
      overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    document.getElementById('mobile-more-drawer')?.classList.remove('open');
    document.getElementById('drawer-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Swipe down to close drawer
  let startY = 0;
  document.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const endY = e.changedTouches[0].clientY;
    const diff = endY - startY;
    const drawer = document.getElementById('mobile-more-drawer');
    if (diff > 80 && drawer?.classList.contains('open')) {
      closeDrawer();
    }
  }, { passive: true });

  return { setActive, toggleDrawer, closeDrawer };
})();

