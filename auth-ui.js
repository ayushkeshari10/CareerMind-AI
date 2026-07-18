/* ══════════════════════════════════════════════
   AUTH UI CONTROLLER — Tab switching, forms
══════════════════════════════════════════════ */
const AuthUI = (() => {
  let currentTab = 'login';

  function switchTab(tab) {
    currentTab = tab;
    const loginForm  = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    const loginTab   = document.getElementById('auth-tab-login');
    const signupTab  = document.getElementById('auth-tab-signup');

    if (tab === 'login') {
      loginForm.style.display  = 'block';
      signupForm.style.display = 'none';
      loginTab.style.background  = 'var(--primary)';
      loginTab.style.color       = '#fff';
      signupTab.style.background = 'transparent';
      signupTab.style.color      = 'var(--text-muted)';
    } else {
      loginForm.style.display  = 'none';
      signupForm.style.display = 'block';
      signupTab.style.background = 'var(--primary)';
      signupTab.style.color      = '#fff';
      loginTab.style.background  = 'transparent';
      loginTab.style.color       = 'var(--text-muted)';
    }
    clearError();
  }

  function showError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
  }

  function clearError() {
    const el = document.getElementById('auth-error');
    el.style.display = 'none';
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading
      ? (btnId === 'login-btn' ? 'Signing in...' : btnId === 'signup-btn' ? 'Creating account...' : 'Loading...')
      : (btnId === 'login-btn' ? 'Sign In to CareerMind' : btnId === 'signup-btn' ? 'Create My Account 🚀' : 'Continue with Google');
  }

  async function login() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showError('Please fill in all fields.'); return; }
    setLoading('login-btn', true);
    clearError();
    try {
      await AuthService.signIn(email, password);
      // onAuthStateChanged in app.js will handle the redirect
    } catch (e) {
      setLoading('login-btn', false);
      showError(_friendlyError(e.code));
    }
  }

  async function signup() {
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const role     = document.getElementById('signup-role').value;
    const exp      = document.getElementById('signup-exp').value;
    if (!name || !email || !password) { showError('Please fill in all fields.'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
    setLoading('signup-btn', true);
    clearError();
    try {
      await AuthService.signUp(name, email, password, role, exp);
      // onAuthStateChanged will handle the redirect
    } catch (e) {
      console.error("Signup Error:", e);
      setLoading('signup-btn', false);
      showError(_friendlyError(e.code) + ' (See console)');
    }
  }

  async function googleSignIn() {
    const btn = document.getElementById('auth-google-btn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; }
    clearError();
    try {
      await AuthService.signInWithGoogle();
    } catch (e) {
      console.error("Google Sign-in Error:", e);
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      if (e.code !== 'auth/popup-closed-by-user') {
        showError(_friendlyError(e.code) + ' (See console)');
      }
    }
  }

  async function forgotPassword() {
    const email = document.getElementById('login-email').value.trim();
    if (!email) { showError('Enter your email first, then click Forgot password.'); return; }
    try {
      await AuthService.resetPassword(email);
      showError('✅ Password reset email sent! Check your inbox.');
      document.getElementById('auth-error').style.background = 'rgba(16,185,129,0.1)';
      document.getElementById('auth-error').style.borderColor = 'rgba(16,185,129,0.3)';
      document.getElementById('auth-error').style.color = 'var(--success)';
    } catch (e) {
      showError(_friendlyError(e.code));
    }
  }

  function _friendlyError(code) {
    const msgs = {
      'auth/user-not-found':       'No account found with this email.',
      'auth/wrong-password':       'Incorrect password. Try again.',
      'auth/email-already-in-use': 'This email is already registered. Sign in instead.',
      'auth/weak-password':        'Password must be at least 6 characters.',
      'auth/invalid-email':        'Invalid email address.',
      'auth/too-many-requests':    'Too many attempts. Try again later.',
      'auth/network-request-failed':'Network error. Check your connection.',
      'auth/popup-blocked':        'Popup blocked. Allow popups for this site.',
      'auth/invalid-credential':   'Invalid email or password.',
    };
    return msgs[code] || 'Something went wrong. Please try again.';
  }

  return { switchTab, login, signup, googleSignIn, forgotPassword };
})();

// Handle Enter key on auth forms
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen && authScreen.style.display !== 'none') {
      const loginForm = document.getElementById('auth-login-form');
      if (loginForm && loginForm.style.display !== 'none') AuthUI.login();
      else AuthUI.signup();
    }
  }
});
