/* Thin wrapper around Firebase (sign-in + one Firestore document per user).
   Firebase is loaded only when firebase-config.js has real values. */
import { firebaseConfig } from './firebase-config.js';
import { clone, mergeStates } from './ssc-core.js';

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
    m.fs.doc(db, 'users', uid), { includeMetadataChanges: true },
    snap => cb(snap.exists() ? snap.data() : null, snap.metadata.hasPendingWrites, false, snap.metadata.fromCache),
    () => cb(null, false, true, false)
  );
}

// Transactions read the current server document and retry if another device writes.
// Offline changes remain in app localStorage until a server transaction succeeds.
export async function save(uid, obj, base = null, force = false) {
  const local = clone(obj), reference = m.fs.doc(db, 'users', uid);
  return m.fs.runTransaction(db, async transaction => {
    const snap = await transaction.get(reference);
    let remote = null;
    if (snap.exists()) {
      try { remote = JSON.parse(snap.data().data); if (!remote || typeof remote !== 'object' || Array.isArray(remote) || !Array.isArray(remote.logs)) throw new Error('Invalid account schema'); }
      catch { const error = new Error('Stored data could not be read. No overwrite was performed.'); error.code = 'sync/corrupt'; throw error; }
    }
    const merged = force ? { state: local, conflicts: [] } : mergeStates(base,local,remote);
    if (merged.conflicts.length) {
      const error = new Error('Both devices changed the same data.');
      error.code = 'sync/conflict'; error.remote = remote; error.conflicts = merged.conflicts; throw error;
    }
    const saved = merged.state; saved._u = Math.max(Date.now(),saved._u || 0);
    const data = JSON.stringify(saved);
    if (new TextEncoder().encode(data).length > 950000) { const error = new Error('Account data is nearing Firestore’s document size limit. Export a backup and reduce old records.'); error.code = 'sync/size'; throw error; }
    transaction.set(reference, { data, updated: saved._u, serverUpdated: m.fs.serverTimestamp() });
    return saved;
  });
}

export async function readServer(uid) {
  const snap = await m.fs.getDocFromServer(m.fs.doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const state = JSON.parse(snap.data().data);
  if (!state || typeof state !== 'object' || !Array.isArray(state.logs)) throw new Error('Invalid account data');
  return state;
}
