/* Thin wrapper around Firebase (sign-in + one Firestore document per user).
   Firebase is loaded only when firebase-config.js has real values. */
import { firebaseConfig } from './firebase-config.js';

const V = '10.12.2';
const BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';

export const enabled = !!(firebaseConfig && firebaseConfig.apiKey &&
  !String(firebaseConfig.apiKey).startsWith('PASTE'));

let m = {}, app, auth, db;

export async function init() {
  if (!enabled) return false;
  const [a, au, fs] = await Promise.all([
    import(BASE + 'firebase-app.js'),
    import(BASE + 'firebase-auth.js'),
    import(BASE + 'firebase-firestore.js')
  ]);
  m = { a, au, fs };
  app = a.initializeApp(firebaseConfig);
  auth = au.getAuth(app);
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() });
  } catch (e) {
    db = fs.getFirestore(app);
  }
  return true;
}

export function onUser(cb) { return m.au.onAuthStateChanged(auth, cb); }

async function persistence(remember) {
  await m.au.setPersistence(auth, remember ? m.au.browserLocalPersistence : m.au.browserSessionPersistence);
}

export async function signIn(email, pw, remember) {
  await persistence(remember);
  return m.au.signInWithEmailAndPassword(auth, email, pw);
}

export async function signUp(email, pw, remember) {
  await persistence(remember);
  return m.au.createUserWithEmailAndPassword(auth, email, pw);
}

export function signOut() { return m.au.signOut(auth); }

export function subscribe(uid, cb) {
  return m.fs.onSnapshot(
    m.fs.doc(db, 'users', uid),
    (snap) => cb(snap.exists() ? snap.data() : null, snap.metadata.hasPendingWrites),
    () => cb(null, false, true)
  );
}

export function save(uid, obj) {
  return m.fs.setDoc(m.fs.doc(db, 'users', uid), { data: JSON.stringify(obj), updated: obj._u });
}
