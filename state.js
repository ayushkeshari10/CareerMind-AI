/**
 * state.js — Firestore-Backed State Management
 *
 * Strategy: Local cache (fast UI) + Firestore sync (persistence + cross-device).
 * - All reads: local first, then Firestore on login
 * - All writes: local immediately + async Firestore save
 */
const AppState = (() => {
  const DEFAULT_STATE = {
    user:       { name: '', email: '', role: 'sde', customRole: '', experience: 'beginner', apiKey: '' },
    resume:     { text: '', analysis: null, analyzedAt: null, role: null },
    skillgap:   { data: null, generatedAt: null },
    roadmap:    { data: null, completedItems: [], generatedAt: null },
    projects:   { data: null, generatedAt: null },
    chat:       { history: [] },
    motivation: { lastQuote: null, lastQuoteDate: null },
    studyplan:  { weeklyPlan: null, goals: [] },
    progress:   {
      xp: 0, level: 1, streak: 0, lastActiveDate: '',
      badges: [], testsCompleted: [], interviewSessions: [], skillsLearned: []
    },
  };

  let _state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  let _uid   = null;
  let _saveTimeout = null;

  // ── Init: Load from Firestore when user logs in ──────────────
  async function initForUser(uid) {
    _uid = uid;
    console.log('⚡ Loading state from Firestore for uid:', uid);

    try {
      const [profile, resume, skillgap, roadmap, progress, studyplan, motivation] = await Promise.all([
        FirebaseDB.getProfile(uid),
        FirebaseDB.getResume(uid),
        FirebaseDB.getSkillGap(uid),
        FirebaseDB.getRoadmap(uid),
        FirebaseDB.getProgress(uid),
        FirebaseDB.getStudyPlan(uid),
        FirebaseDB.getMotivation(uid),
      ]);

      if (profile) {
        _state.user = {
          name: profile.name       || '',
          email: profile.email     || '',
          role: profile.role       || 'sde',
          customRole: profile.customRole || '',
          experience: profile.experience || 'beginner',
          apiKey: profile.apiKey   || '',
        };
      }
      if (resume  && Object.keys(resume).length)  _state.resume   = { ...DEFAULT_STATE.resume, ...resume };
      if (skillgap && Object.keys(skillgap).length) _state.skillgap = { ...DEFAULT_STATE.skillgap, ...skillgap };
      if (roadmap && Object.keys(roadmap).length) _state.roadmap  = { ...DEFAULT_STATE.roadmap, ...roadmap };
      if (progress && Object.keys(progress).length) _state.progress = { ...DEFAULT_STATE.progress, ...progress };
      if (studyplan && Object.keys(studyplan).length) _state.studyplan = { ...DEFAULT_STATE.studyplan, ...studyplan };
      if (motivation && Object.keys(motivation).length) _state.motivation = { ...DEFAULT_STATE.motivation, ...motivation };

      // Load chat from Firestore subcollection
      const chatMsgs = await FirebaseDB.getChatHistory(uid, 60);
      _state.chat.history = chatMsgs.map(m => ({ role: m.role, content: m.content }));

      // Update streak
      _updateStreak();

      console.log('✅ State loaded from Firestore');
    } catch (e) {
      console.warn('Firestore load failed, using defaults:', e.message);
    }

    return _state;
  }

  // ── Update streak on login ───────────────────────────────────
  function _updateStreak() {
    const today = new Date().toDateString();
    const last  = _state.progress.lastActiveDate;
    if (last === today) return; // Already counted today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toDateString();

    if (last === yStr) {
      _state.progress.streak = (_state.progress.streak || 0) + 1;
    } else if (!last) {
      _state.progress.streak = 1;
    } else {
      _state.progress.streak = 1; // Reset streak
    }
    _state.progress.lastActiveDate = today;
    _saveSection('progress');

    // Check streak badges
    const streak = _state.progress.streak;
    if (streak >= 3)  _awardBadge('streak_3',  '3-Day Streak',   '🔥');
    if (streak >= 7)  _awardBadge('streak_7',  'Week Warrior',   '💎');
    if (streak >= 30) _awardBadge('streak_30', 'Monthly Hero',   '🎖️');
  }

  // ── Core getter ─────────────────────────────────────────────
  const state = new Proxy(_state, {
    get(target, key) { return target[key]; }
  });

  function get(path) {
    const parts = path.split('.');
    let val = _state;
    for (const part of parts) val = val?.[part];
    return val;
  }

  // ── Core setter (local + async Firestore) ────────────────────
  function set(path, value) {
    const parts = path.split('.');
    let obj = _state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] === undefined) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;

    // Debounced Firestore save
    const section = parts[0];
    _debouncedSave(section);
  }

  // ── Debounced section save ───────────────────────────────────
  const _pendingSections = new Set();
  function _debouncedSave(section) {
    _pendingSections.add(section);
    clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
      _pendingSections.forEach(s => _saveSection(s));
      _pendingSections.clear();
    }, 800); // Wait 800ms before saving (batch saves)
  }

  async function _saveSection(section) {
    if (!_uid) return;
    try {
      switch (section) {
        case 'user':
          await FirebaseDB.saveProfile(_uid, {
            ..._state.user,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          if (typeof Gemini !== 'undefined') Gemini.setKey(_state.user.apiKey);
          break;
        case 'resume':    await FirebaseDB.saveResume(_uid, _state.resume);    break;
        case 'skillgap':  await FirebaseDB.saveSkillGap(_uid, _state.skillgap); break;
        case 'roadmap':   await FirebaseDB.saveRoadmap(_uid, _state.roadmap);   break;
        case 'progress':  await FirebaseDB.saveProgress(_uid, _state.progress); break;
        case 'studyplan': await FirebaseDB.saveStudyPlan(_uid, _state.studyplan); break;
        case 'motivation':await FirebaseDB.saveMotivation(_uid, _state.motivation); break;
        // chat is saved per-message via addChatMessage
      }
    } catch (e) {
      console.warn(`Firestore save (${section}) failed:`, e.message);
    }
  }

  // ── XP + Levels + Badges ────────────────────────────────────
  function addXP(amount, reason) {
    if (!amount) return;
    _state.progress.xp += amount;
    const newLevel = Math.floor(Math.sqrt(_state.progress.xp / 100)) + 1;
    if (newLevel > _state.progress.level) {
      _state.progress.level = newLevel;
      if (typeof CareerMind !== 'undefined') {
        CareerMind.toast(`🎉 Level Up! You're now Level ${newLevel}!`, 'success', 4000);
      }
    }
    // XP badges
    if (_state.progress.xp >= 100)  _awardBadge('xp_100',  'XP Rookie',    '⚡');
    if (_state.progress.xp >= 500)  _awardBadge('xp_500',  'XP Explorer',  '🌟');
    if (_state.progress.xp >= 1000) _awardBadge('xp_1000', 'XP Champion',  '🏆');
    _debouncedSave('progress');
  }

  function _awardBadge(id, name, emoji) {
    const badges = _state.progress.badges || [];
    if (!badges.find(b => b.id === id)) {
      badges.push({ id, name, emoji, earnedAt: new Date().toISOString() });
      _state.progress.badges = badges;
      if (typeof CareerMind !== 'undefined') {
        CareerMind.toast(`🏅 Badge Unlocked: ${emoji} ${name}!`, 'success', 3500);
      }
    }
  }

  // ── Chat: save per message to Firestore ─────────────────────
  async function addChatMessage(message) {
    _state.chat.history.push(message);
    if (_uid) {
      try {
        await FirebaseDB.saveChatMessage(_uid, message);
      } catch (e) { /* silent */ }
    }
  }

  async function clearChat() {
    _state.chat.history = [];
    if (_uid) {
      try { await FirebaseDB.clearChatHistory(_uid); } catch (e) { /* silent */ }
    }
  }

  // ── Interview + Test (Firestore collections) ─────────────────
  async function addInterviewSession(session) {
    const sessions = _state.progress.interviewSessions || [];
    sessions.push(session);
    _state.progress.interviewSessions = sessions;
    _debouncedSave('progress');
    if (_uid) {
      try { await FirebaseDB.saveInterviewSession(_uid, session); } catch (e) { /* silent */ }
    }
  }

  async function addTestResult(result) {
    const tests = _state.progress.testsCompleted || [];
    tests.push(result);
    _state.progress.testsCompleted = tests;
    _debouncedSave('progress');
    if (_uid) {
      try { await FirebaseDB.saveTestResult(_uid, result); } catch (e) { /* silent */ }
    }
  }

  // ── Clear local cache on logout ──────────────────────────────
  function clearLocal() {
    _state   = JSON.parse(JSON.stringify(DEFAULT_STATE));
    _uid     = null;
    clearTimeout(_saveTimeout);
    _pendingSections.clear();
  }

  // ── Helper: Role display name ────────────────────────────────
  function getRoleDisplay(role, customRole) {
    const names = {
      sde: 'Software Development Engineer', web: 'Web Developer',
      data: 'Data Analyst', cloud: 'Cloud Engineer', ai: 'AI/ML Engineer', custom: customRole
    };
    return names[role] || role;
  }

  return {
    get state()   { return _state; },
    get,
    set,
    addXP,
    addChatMessage,
    clearChat,
    addInterviewSession,
    addTestResult,
    clearLocal,
    getRoleDisplay,
    initForUser,
    get uid()    { return _uid; },
  };
})();
