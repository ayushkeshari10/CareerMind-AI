/**
 * auth.js — Firebase Authentication Service
 * Handles: Email/Password signup+login, Google OAuth, logout, state changes
 */
const AuthService = (() => {

  // ── Sign Up with Email + Password ────────────────────────────
  async function signUp(name, email, password, role, experience) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const uid  = cred.user.uid;

    // Update display name
    await cred.user.updateProfile({ displayName: name });

    // Create user profile in Firestore
    await FirebaseDB.saveProfile(uid, {
      name, email, role,
      experience: experience || 'beginner',
      customRole: '',
      apiKey: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Initialize progress doc
    await FirebaseDB.saveProgress(uid, {
      xp: 0, level: 1, streak: 0,
      lastActiveDate: '',
      badges: [{ id: 'first_login', name: 'First Step', emoji: '🚀', earnedAt: new Date().toISOString() }],
      testsCompleted: [],
      interviewSessions: [],
      skillsLearned: [],
    });

    return cred.user;
  }

  // ── Sign In with Email + Password ────────────────────────────
  async function signIn(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  // ── Sign In with Google ──────────────────────────────────────
  async function signInWithGoogle() {
    const cred = await auth.signInWithPopup(googleProvider);
    const uid  = cred.user.uid;
    const isNew = cred.additionalUserInfo.isNewUser;

    if (isNew) {
      await FirebaseDB.saveProfile(uid, {
        name: cred.user.displayName || 'User',
        email: cred.user.email,
        role: 'sde',
        experience: 'beginner',
        customRole: '',
        apiKey: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await FirebaseDB.saveProgress(uid, {
        xp: 0, level: 1, streak: 0,
        lastActiveDate: '',
        badges: [{ id: 'first_login', name: 'First Step', emoji: '🚀', earnedAt: new Date().toISOString() }],
        testsCompleted: [], interviewSessions: [], skillsLearned: [],
      });
    }
    return cred.user;
  }

  // ── Sign Out ─────────────────────────────────────────────────
  async function signOut() {
    await auth.signOut();
    // Clear local state
    if (typeof AppState !== 'undefined') AppState.clearLocal();
    window.location.reload();
  }

  // ── Password Reset ───────────────────────────────────────────
  async function resetPassword(email) {
    await auth.sendPasswordResetEmail(email);
  }

  // ── Auth State Observer ──────────────────────────────────────
  function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  }

  // ── Get Current User ─────────────────────────────────────────
  function currentUser() {
    return auth.currentUser;
  }

  return { signUp, signIn, signInWithGoogle, signOut, resetPassword, onAuthStateChanged, currentUser };
})();
