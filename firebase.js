/**
 * firebase.js — Firebase Configuration & Initialization
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  HOW TO SET UP YOUR FIREBASE PROJECT (5 minutes, FREE)      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║ 1. Go to: https://console.firebase.google.com               ║
 * ║ 2. Click "Add project" → give it a name → Continue          ║
 * ║ 3. Disable Google Analytics (optional) → Create project     ║
 * ║ 4. In the project dashboard, click the </> (Web) icon       ║
 * ║ 5. Register your app → copy the firebaseConfig object below ║
 * ║ 6. Enable Authentication:                                   ║
 * ║    Sidebar → Authentication → Get Started                   ║
 * ║    Enable "Email/Password" and "Google"                     ║
 * ║ 7. Enable Firestore:                                        ║
 * ║    Sidebar → Firestore Database → Create database           ║
 * ║    Choose "Start in test mode" → pick your region           ║
 * ║ 8. Enable Storage:                                          ║
 * ║    Sidebar → Storage → Get Started → test mode              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * PASTE YOUR CONFIG BELOW (replace the placeholder values):
 */

// ── Initialize Firebase ──────────────────────────────────────
firebase.initializeApp(ENV.FIREBASE_CONFIG);

const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ── Firestore collection helpers ─────────────────────────────
const userDoc = (uid) => db.collection('users').doc(uid);
const resumeDoc = (uid) => userDoc(uid).collection('data').doc('resume');
const skillgapDoc = (uid) => userDoc(uid).collection('data').doc('skillgap');
const roadmapDoc = (uid) => userDoc(uid).collection('data').doc('roadmap');
const progressDoc = (uid) => userDoc(uid).collection('data').doc('progress');
const studyplanDoc = (uid) => userDoc(uid).collection('data').doc('studyplan');
const motivationDoc = (uid) => userDoc(uid).collection('data').doc('motivation');
const chatCol = (uid) => userDoc(uid).collection('chats');

const FirebaseDB = {
  // ── User Profile ─────────────────────────────────────────
  async saveProfile(uid, data) {
    await userDoc(uid).set(data, { merge: true });
  },
  async getProfile(uid) {
    const snap = await userDoc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  // ── Resume ───────────────────────────────────────────────
  async saveResume(uid, data) {
    await resumeDoc(uid).set(data, { merge: true });
  },
  async getResume(uid) {
    const snap = await resumeDoc(uid).get();
    return snap.exists ? snap.data() : {};
  },

  // ── Skill Gap ────────────────────────────────────────────
  async saveSkillGap(uid, data) {
    await skillgapDoc(uid).set(data, { merge: true });
  },
  async getSkillGap(uid) {
    const snap = await skillgapDoc(uid).get();
    return snap.exists ? snap.data() : {};
  },

  // ── Roadmap ──────────────────────────────────────────────
  async saveRoadmap(uid, data) {
    await roadmapDoc(uid).set(data, { merge: true });
  },
  async getRoadmap(uid) {
    const snap = await roadmapDoc(uid).get();
    return snap.exists ? snap.data() : {};
  },

  // ── Progress ─────────────────────────────────────────────
  async saveProgress(uid, data) {
    await progressDoc(uid).set(data, { merge: true });
  },
  async getProgress(uid) {
    const snap = await progressDoc(uid).get();
    return snap.exists ? snap.data() : {};
  },

  // ── Study Plan ───────────────────────────────────────────
  async saveStudyPlan(uid, data) {
    await studyplanDoc(uid).set(data, { merge: true });
  },
  async getStudyPlan(uid) {
    const snap = await studyplanDoc(uid).get();
    return snap.exists ? snap.data() : {};
  },

  // ── Motivation ───────────────────────────────────────────
  async saveMotivation(uid, data) {
    await motivationDoc(uid).set(data, { merge: true });
  },
  async getMotivation(uid) {
    const snap = await motivationDoc(uid).get();
    return snap.exists ? snap.data() : {};
  },

  // ── Chat History ─────────────────────────────────────────
  async saveChatMessage(uid, message) {
    await chatCol(uid).add({
      ...message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  },
  async getChatHistory(uid, limit = 50) {
    const snap = await chatCol(uid).orderBy('timestamp', 'asc').limitToLast(limit).get();
    return snap.docs.map(d => d.data());
  },
  async clearChatHistory(uid) {
    const snap = await chatCol(uid).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  },

  // ── Interview Sessions ───────────────────────────────────
  async saveInterviewSession(uid, session) {
    await db.collection('interviews').add({ uid, ...session, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  },
  async getInterviewSessions(uid) {
    const snap = await db.collection('interviews').where('uid', '==', uid).orderBy('createdAt', 'desc').limit(10).get();
    return snap.docs.map(d => d.data());
  },

  // ── Test Results ─────────────────────────────────────────
  async saveTestResult(uid, result) {
    await db.collection('tests').add({ uid, ...result, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  },
  async getTestResults(uid) {
    const snap = await db.collection('tests').where('uid', '==', uid).orderBy('createdAt', 'desc').limit(20).get();
    return snap.docs.map(d => d.data());
  },

  // ── Reset All Data ───────────────────────────────────────
  async resetUserData(uid) {
    const collections = ['users', 'resumes', 'skillgaps', 'roadmaps', 'progress', 'studyplans', 'motivation'];
    for (const col of collections) {
      try {
        await db.collection(col).doc(uid).delete();
      } catch (e) {
        console.error(`Failed to delete ${col} for ${uid}`, e);
      }
    }
    await this.clearChatHistory(uid);
    // Note: We don't delete interviews/tests sub-collections to save operations, 
    // or we can just leave them as historical data since they aren't loaded in the main state.
  }
};

console.log('🔥 Firebase initialized');
