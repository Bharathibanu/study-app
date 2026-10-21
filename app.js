/* Bharathi's Study Tracker: main app logic.
   Data lives in one object (S). It is saved on this device (localStorage)
   and, if Firebase is set up, synced to your account so phone and PC match. */
import * as cloud from './cloud.js';
import { installSsc } from './ssc.js';
import { MASTERCLASS_ADDITIONS, MASTERCLASS_TEST, masterclassIntro, masterclassResources, mergedExampleHTML, suggestedMethod, mentalPracticeQuestions } from './mental-masterclass.js';
import { multiplicationQuestions, trickVisual, sscMathHTML, modelExercise } from './maths-tricks.js';
import { clone, sameState, mergeStates, dailyFocusSummary, weeklySubjectReview, postponePlan, validateBackup, validStudyDate, validatePlanRows, lessonMinutes, setPlanLessonMinutes } from './ssc-core.js';

/* =============== Helpers =============== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const addD = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
const diff = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtD = (s) => { const d = parseD(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
const longD = (s) => { const d = parseD(s); return WD[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
const uid = () => Math.random().toString(36).slice(2, 10);
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const hrs = (min) => (min / 60).toFixed(1);
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } };
const ssDel = (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } };
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const SUBJECTS = ['Quant', 'Reasoning', 'English', 'General Studies', 'Other'];
const CATS = ['Food', 'Travel', 'Books', 'Recharge', 'Fees', 'Other'];

const ICON = {
  home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/></svg>',
  trend: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
  rev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>',
  rep: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/></svg>',
  study: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>',
  revlog: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h5"/></svg>',
  plan: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  tricks: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  money: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="3"/></svg>',
  mocks: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
  notes: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h10l4 4v14H5z"/><path d="M9 13h6M9 17h6M9 9h2"/></svg>',
  set: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>',
  canteen: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3"/></svg>',
  todo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 12l3 3 5-6"/></svg>',
  learn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/></svg>',
  diary: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h6M3 7h2M3 12h2M3 17h2"/></svg>',
  more: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  eye: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.7A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.2-1"/></svg>',
  theme: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>',
  out: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5V3h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  chk: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  flame: '<svg class="flame" width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4-3 5.5-3 9.5a3 3 0 0 0 6 0c0-1-.4-1.8-1-2.6 3 1.3 5 4 5 7.1A7 7 0 0 1 5 16c0-5 5-6.5 7-14z" fill="var(--accent)"/></svg>',
  alert: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.01"/></svg>',
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v5M12 18v.01"/></svg>'
};

const NAV = [
  { id: 'home', label: 'Home', prim: 1 },
  { id: 'trend', label: 'Trendline', prim: 1 },
  { id: 'rev', label: 'Quick Revision', short: 'Revise', prim: 1 },
  { id: 'rep', label: 'Reports', prim: 1 },
  { id: 'study', label: 'Study Timer' },
  { id: 'revlog', label: 'Revision Log' },
  { id: 'plan', label: 'SSC Plan' },
  { id: 'practice', label: 'Topic Practice' },
  { id: 'mistakes', label: 'Mistake Notebook' },
  { id: 'revisionQueue', label: 'Revision Queue' },
  { id: 'mockAnalysis', label: 'CGL Mock Analysis' },
  { id: 'pyq', label: '2024–2025 PYQ Bank' },
  { id: 'todo', label: 'To-Do' },
  { id: 'learn', label: 'Learning' },
  { id: 'diary', label: 'Diary' },
  { id: 'canteen', label: 'DHANAM Canteen' },
  { id: 'tricks', label: 'Maths Tricks' },
  { id: 'money', label: 'Money & Meetings' },
  { id: 'mocks', label: 'Mock Tests' },
  { id: 'notes', label: 'Notes & Vocabulary' },
  { id: 'set', label: 'Settings' }
];
const TITLES = { home: 'Home', trend: 'Trendline', rev: 'Quick Revision', rep: 'Reports', study: 'Study Timer', revlog: 'Revision Log', plan: 'SSC 200-Day Plan', tricks: 'SSC Maths Tricks', todo: 'To-Do', learn: 'Learning', diary: 'Personal Diary', canteen: 'DHANAM Canteen', money: 'Money & Meetings', mocks: 'Mock Tests', notes: 'Notes & Vocabulary', set: 'Settings', more: 'More' };

Object.assign(ICON, { practice: ICON.rev, mistakes: ICON.notes, revisionQueue: ICON.revlog, mockAnalysis: ICON.mocks, pyq: ICON.plan });
Object.assign(TITLES, { practice: 'SSC CGL Topic Practice', mistakes: 'Mistake Notebook', revisionQueue: 'Automatic Revision Queue', mockAnalysis: 'CGL Mock Analysis', pyq: '2024–2025 SSC PYQ Bank' });

/* =============== State =============== */
let deviceSaveProblem = '';
let S = null, KEY = 'sst_state_local', UID = null, saveT = null, CUR = 'home', welcomeNext = false;

const blank = () => ({
  v: 1, _u: 0, created: today(), name: '',
  settings: { target: 6, budget: 6000, exam: '', pomo: 25, brk: 5, why: '', day1: '' },
  plan: [], planFrom: '', tasks: [], logs: [], rev: [], exp: [], meet: [], qr: [], mist: [], mocks: [], notes: [], mastered: {},
  dailyFocus: {}, practice: [], mistakeBook: [], revisionHistory: [], mockAnalyses: [], masterclassDays: [],
  canteen: { prices: { tea: 12, snack: 10, lunch: 52 }, days: {} }, todos: [], books: [], learn: [], diary: []
});
function cleanSettings(value) {
  const settings=Object.assign(blank().settings,value || {}), defaults=blank().settings;
  for(const [key,min] of Object.entries({target:1,budget:0,pomo:5,brk:1}))if(!Number.isFinite(settings[key]) || settings[key]<min)settings[key]=defaults[key];
  return settings;
}
function saveDeviceCopy() {
  const saved=lsSet(KEY,JSON.stringify(S)), previous=deviceSaveProblem;
  deviceSaveProblem=saved?'':'This device could not save your changes. Keep the app open and export a backup. Free storage or allow site storage, then try saving again.';
  if(!saved && !previous)toast('Device save failed. Keep the app open and export a backup.');
  return saved;
}
function loadLocal() {
  let r = null;
  try { const raw = lsGet(KEY); r = raw ? JSON.parse(raw) : null; } catch (e) { r = null; }
  const b = blank();
  S = Object.assign(b, r || {});
  S.settings = cleanSettings(r?.settings);
}
function setSync(t) { const el = $('#sync'); if (el) el.textContent = t; }
const syncState = { base: null, legacyCandidate: null, dirty: false, saving: false, generation: 0, unsubscribe: null, conflict: null, problem: '', acknowledged: '' };
function applyAccount(value) {
  S = Object.assign(blank(), value || {});
  S.settings = cleanSettings(value?.settings);
  ssc.ensure(); saveDeviceCopy();
}
function persist() {
  S._u = Date.now();
  const deviceSaved=saveDeviceCopy();
  if(!deviceSaved)setSync('Device save failed · export backup');
  else if(!UID)setSync('This device only');
  if (UID && cloud.enabled) {
    syncState.dirty = true;
    setSync(syncState.conflict ? 'Conflict · changes saved locally' : navigator.onLine ? 'Saved locally · syncing…' : 'Saved locally · offline');
    clearTimeout(saveT); saveT = setTimeout(() => syncAccount(), 700);
  }
}
function syncFailure(error) {
  if (error?.code === 'sync/conflict') {
    syncState.conflict = { remote: error.remote, paths: error.conflicts };
    lsSet(KEY + '_conflict_device', JSON.stringify(S));
    lsSet(KEY + '_conflict_server', JSON.stringify(error.remote));
    setSync('Conflict · review copies');
  } else if (['sync/size','sync/corrupt','permission-denied'].includes(error?.code)) {
    syncState.problem = error.code === 'permission-denied' ? 'Firebase refused this save. Check sign-in and database rules; your device copy is retained.' : error.message;
    setSync('Save needs attention');
  } else { syncState.problem = ''; setSync('Saved locally · waiting for server'); }
  if (!$('#app').hidden && $('#modal').hidden) render();
}
async function syncAccount(force = false) {
  if (!UID || !cloud.enabled || syncState.saving || (syncState.conflict && !force) || !syncState.dirty) return;
  if (!navigator.onLine) { setSync('Saved locally · offline'); return; }
  const account = UID, generation = syncState.generation, sent = clone(S), base = clone(syncState.base);
  syncState.saving = true; setSync('Syncing with server…');
  try {
    const saved = await cloud.save(account, sent, base, force);
    if (account !== UID || generation !== syncState.generation) return;
    const remaining = mergeStates(sent,S,saved);
    syncState.base = saved; lsSet(KEY + '_server',JSON.stringify(saved));
    if (remaining.conflicts.length) {
      const error = new Error('Local data changed during save.'); error.code = 'sync/conflict'; error.remote = saved; error.conflicts = remaining.conflicts; throw error;
    }
    applyAccount(remaining.state); syncState.dirty = !sameState(S,saved);
    syncState.conflict = null; syncState.problem = '';
    syncState.acknowledged = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    setSync(syncState.dirty ? 'Saved locally · syncing…' : 'Synced · server confirmed');
    if (!$('#app').hidden && $('#modal').hidden) render();
  } catch (error) { if (account === UID && generation === syncState.generation) syncFailure(error); }
  finally {
    if (account === UID && generation === syncState.generation) {
      syncState.saving = false;
      if (syncState.dirty && !syncState.conflict && !syncState.problem) { clearTimeout(saveT); saveT = setTimeout(() => syncAccount(), 15000); }
    }
  }
}
function onRemote(data, fromCache = false) {
  if (syncState.saving || syncState.conflict) return;
  let remote = null;
  if (data) { try { remote = JSON.parse(data.data); } catch { syncState.problem = 'The cloud record cannot be read. Export your device backup before recovery.'; setSync('Save needs attention'); return; } }
  if (fromCache) { setSync(syncState.dirty ? 'Saved locally · awaiting server' : 'Cached data · awaiting server'); return; }
  if (!remote) { syncState.dirty = true; syncAccount(); return; }
  if (!syncState.base && sameState(syncState.legacyCandidate,remote)) { syncState.base = remote; lsSet(KEY + '_server',JSON.stringify(remote)); }
  if (sameState(S,remote)) {
    syncState.base = remote; lsSet(KEY + '_server',JSON.stringify(remote)); syncState.dirty = false;
    setSync('Synced · server confirmed'); return;
  }
  const merged = mergeStates(syncState.base,S,remote);
  if (merged.conflicts.length) { const error = new Error('Conflicting device copies.'); error.code = 'sync/conflict'; error.remote = remote; error.conflicts = merged.conflicts; syncFailure(error); return; }
  // Keep the previous baseline when local edits exist; the transaction performs the merge atomically.
  if (syncState.dirty || (syncState.base && !sameState(S,syncState.base))) { syncState.dirty = true; syncAccount(); return; }
  syncState.base = remote; lsSet(KEY + '_server',JSON.stringify(remote)); applyAccount(merged.state);
  syncState.dirty = !sameState(S,remote); dataChanged();
  if (syncState.dirty) syncAccount(); else setSync('Synced · server confirmed');
}
function syncBanner() {
  const deviceWarning=deviceSaveProblem?`<div class="sync-banner" role="alert"><p>${esc(deviceSaveProblem)}</p><button class="btn sm ghost" data-act="exportData">Export backup</button></div>`:'';
  if (!UID) return deviceWarning;
  if (syncState.conflict) return deviceWarning + `<div class="sync-banner" role="alert"><b>Two device copies need review</b><p>Both devices changed the same record. Automatic overwrite is paused. Export both copies before choosing which account copy to keep. This choice replaces the whole cloud/device account state.</p><div class="actions"><button class="btn sm ghost" data-act="syncExportDevice">Export this device copy</button><button class="btn sm ghost" data-act="syncExportServer">Export server copy</button><button class="btn sm" data-act="syncUseServer">Use server copy</button><button class="btn sm ghost" data-act="syncUseDevice">Keep device copy</button></div></div>`;
  if (syncState.problem) return deviceWarning + `<div class="sync-banner" role="alert"><p>${esc(syncState.problem)}</p><button class="btn sm" data-act="syncRetry">Retry save</button><button class="btn sm ghost" data-act="exportData">Export backup</button></div>`;
  return deviceWarning;
}
function dataChanged() { rollover(); genPlan(); if (!$('#app').hidden && $('#modal').hidden && CUR !== 'study') render(); }

/* =============== Data logic =============== */
function genPlan() {
  const durationsChanged=setPlanLessonMinutes(S,lessonMinutes(S),today());
  const t = today(), have = new Set(S.tasks.map((k) => k.pk).filter(Boolean));
  let n = 0;
  S.plan.forEach((r) => {
    if (r.date > t || (S.planFrom && r.date < S.planFrom)) return;
    const pk = r.date + '|' + r.subj + '|' + r.topic;
    if (have.has(pk)) return;
    have.add(pk);
    S.tasks.push({ id: 'plan:' + pk, pk, orig: r.date, date: r.date, subj: r.subj, topic: r.topic, plan: r.min, spent: 0, done: false, doneDate: null });
    n++;
  });
  if (n || durationsChanged) persist();
  return n;
}
// View preferences stay on this device; filtering never changes plan dates or progress.
const backlogView = { subject: '', age: '', group: 'age' };
const focusPrefs = () => { S.dailyFocus ||= {}; return S.dailyFocus[today()] ||= {pins: []}; };
function pinButton(id) {
  const pinned=(S.dailyFocus?.[today()]?.pins || []).includes(id);
  return `<button class="btn sm ghost" data-act="pinLesson" data-id="${esc(id)}" aria-pressed="${pinned}">${pinned?'Unpin':'Pin today'}</button>`;
}
const carryLabel = days => days === 0 ? 'Due today' : `Carried ${days} ${days === 1 ? 'day' : 'days'}`;
function backlogHTML(pending) {
  const subjects = [...new Set(pending.map(r => r.subj))].sort();
  const ages = [...new Set(pending.map(r => diff(r.date, today())))].sort((a,b) => b-a);
  const selected = pending.filter(r => (!backlogView.subject || r.subj === backlogView.subject) &&
    (backlogView.age === '' || diff(r.date, today()) === Number(backlogView.age)));
  const groups = new Map();
  selected.forEach(r => {
    const age = diff(r.date, today()), key = backlogView.group === 'subject' ? r.subj : age;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });
  const entries = [...groups].sort((a,b) => backlogView.group === 'subject' ? a[0].localeCompare(b[0]) : b[0]-a[0]);
  const options = (values, current, label) => values.map(v => `<option value="${esc(v)}"${String(v) === current ? ' selected' : ''}>${esc(label(v))}</option>`).join('');
  return `<section id="plan-backlog" aria-labelledby="backlog-title"><h4 id="backlog-title">Next work to finish</h4>
    <p class="quiet">Choose a subject or the number of calendar days carried from the original plan date. Oldest work comes first within each group. Over 3 days is critical.</p>
    <div class="backlog-filters">
      <div><label class="label" for="backlog-subject">Subject</label><select class="inp" id="backlog-subject" data-chg="backlogFilter" data-key="subject"><option value="">All subjects</option>${options(subjects, backlogView.subject, v=>v)}</select></div>
      <div><label class="label" for="backlog-age">Days carried</label><select class="inp" id="backlog-age" data-chg="backlogFilter" data-key="age"><option value="">All days</option>${options(ages, backlogView.age, carryLabel)}</select></div>
      <div><label class="label" for="backlog-group">Group by</label><select class="inp" id="backlog-group" data-chg="backlogFilter" data-key="group">${options(['age','subject'], backlogView.group, v=>v==='age'?'Days carried':'Subject')}</select></div>
    </div>
    <p class="quiet" role="status">${selected.length} of ${pending.length} pending lessons · ${sum(selected,r=>r.gap)} min left. Achievement totals above include all subjects.</p>
    ${entries.map(([key,rows])=>`<details class="backlog-group" open><summary>${esc(backlogView.group==='subject'?key:carryLabel(key))} <span class="quiet">· ${rows.length} lessons · ${sum(rows,r=>r.gap)} min left</span></summary>
      ${rows.map(r=>{const age=diff(r.date,today());return `<article class="backlog-row"><div><b>${esc(r.subj)} · ${esc(r.topic)}</b><small>Plan day ${esc(r.day)} · ${fmtD(r.date)} · ${r.gap} min left</small><span class="badge${age?' amber':''}">${carryLabel(age)}${age>3?' · Critical':''}</span></div>${r.task?`<div class="actions"><button class="btn sm ghost" data-act="partial" data-id="${esc(r.task.id)}">Log progress</button>${pinButton(r.task.id)}</div>`:''}</article>`;}).join('')}</details>`).join('') || '<p class="quiet">No pending lessons match these filters. Choose All subjects and All days to see the full list.</p>'}
    </section>`;
}
function dailyPlannerHTML() {
  const f = dailyFocusSummary(S,today()), week=weeklySubjectReview(S,today());
  const priorities = f.pins.map(r=>`<li><b>${esc(r.subj)} · ${esc(r.topic)}</b><small>${r.gap} min left</small><div class="actions">${pinButton(r.id)}<button class="btn sm" data-act="partial" data-id="${esc(r.id)}">Log progress</button></div></li>`).join('');
  return card('My three priorities today', `<p class="quiet">Pin up to three unfinished lessons using “Pin today” in the plan list or schedule. Pins are for this date and sync to your account.</p><ol class="priority-list">${priorities || '<li>No priorities pinned yet.</li>'}</ol>`, ' style="margin-bottom:14px"') +
    card('Daily catch-up target', `<p>${f.available===null?'Set your remaining study time for today.':`Remaining time set: <b>${f.available} min</b>. Today’s unfinished plan: <b>${f.todayMinutes} min</b>. Overdue plan: <b>${f.backlog} min</b>.`}</p><button class="btn sm ghost" data-act="catchupTime">Set remaining time</button>
    ${f.available===null?'':`<p role="status">Catch-up target: <b>${f.target} min</b>${f.shortfall?` · Today’s plan exceeds your remaining time by ${f.shortfall} min.`:'.'}</p><p class="quiet">Today’s plan gets time first; the remaining time goes to overdue lessons. Pinned overdue lessons come first, then oldest work. This is a suggestion; it does not move dates or record study time. Update remaining time as your day changes. Extra tasks and revision need their own time allowance.</p>
    <ul class="priority-list">${f.chunks.map(r=>`<li>${esc(r.subj)} · ${esc(r.topic)} <b>${r.minutes} min${r.minutes<r.gap?' (part of lesson)':''}</b></li>`).join('') || '<li>No catch-up work fits this time allowance.</li>'}</ul>`}`, ' style="margin-bottom:14px"') +
    card('Weekly subject review', `<p class="quiet">${fmtD(week.since)}–${fmtD(today())} (last 7 days). Study and questions use this period. Backlog shows all overdue plan lessons as of today. Accuracy uses attempted questions; speed uses timed attempts only.</p><div class="tablewrap"><table><thead><tr><th>Subject</th><th>Study</th><th>Backlog</th><th>Attempted</th><th>Accuracy</th><th>Seconds / question</th></tr></thead><tbody>${week.rows.map(r=>`<tr><td>${esc(r.subj)}</td><td>${r.minutes} min</td><td>${r.backlogTopics} lessons · ${r.backlogMinutes} min</td><td>${r.attempted}</td><td>${r.accuracy===null?'No attempts':r.accuracy.toFixed(1)+'%'}</td><td>${r.seconds===null?'Not timed':r.seconds.toFixed(1)}</td></tr>`).join('') || '<tr><td colspan="6">No study, question attempts or plan backlog yet.</td></tr>'}</tbody></table></div>`, ' style="margin-bottom:14px"');
}
function planTracking() {
  if (!S.plan.length) return card('Plan tracking', '<p class="quiet">Load your SSC plan to track achievement, gaps and warnings.</p>');
  const t = today(), byKey = new Map(S.tasks.filter(k => k.pk).map(k => [k.pk, k]));
  const rows = S.plan.filter(r => !S.planFrom || r.date >= S.planFrom).map(r => {
    const task = byKey.get(r.date + '|' + r.subj + '|' + r.topic);
    const achieved = Math.min(r.min, Math.max(0, task ? task.spent : 0));
    return { ...r, task, achieved, gap: Math.max(0, r.min - achieved) };
  });
  const due = rows.filter(r => r.date <= t), overdue = due.filter(r => r.date < t && r.gap > 0);
  const planned = sum(due, r => r.min), achieved = sum(due, r => r.achieved), gap = planned - achieved;
  const subjects = [...new Set(due.map(r => r.subj))];
  const pending = due.filter(r => r.gap > 0).sort((a,b) => a.date.localeCompare(b.date));
  return card('Achievement against my plan', `<div class="stats">
    <div class="stat"><span class="label">Planned to date</span><b>${hrs(planned)} h</b></div>
    <div class="stat"><span class="label">Achieved</span><b>${hrs(achieved)} h</b><small>${planned ? Math.round(achieved / planned * 100) : 0}% of due work</small></div>
    <div class="stat"><span class="label">Remaining gap</span><b>${hrs(gap)} h</b></div>
    <div class="stat"><span class="label">Overdue topics</span><b>${overdue.length}</b><small>${overdue.filter(r => diff(r.date,t)>3).length} critical (over 3 days)</small></div>
  </div><p class="quiet">Achievement counts minutes recorded against plan tasks, including manual completion. Extra study, revision drills and mock scores remain separate. Future work and skipped dates are excluded from the gap.</p>
  ${overdue.length ? `<p class="err" role="status">Warning: ${overdue.length} overdue topics; ${hrs(sum(overdue,r=>r.gap))} hours to catch up.</p>` : `<p class="quiet">${gap ? 'Today’s plan is still in progress.' : due.length ? 'All work due so far is achieved.' : 'Your plan has not started yet.'}</p>`}
  <div class="tablewrap"><table><thead><tr><th>Subject</th><th>Planned</th><th>Achieved</th><th>Gap</th></tr></thead><tbody>${subjects.map(subj=>{const group=due.filter(r=>r.subj===subj);return `<tr><td>${esc(subj)}</td><td>${hrs(sum(group,r=>r.min))} h</td><td>${hrs(sum(group,r=>r.achieved))} h</td><td>${hrs(sum(group,r=>r.gap))} h</td></tr>`;}).join('')}</tbody></table></div>
  ${backlogHTML(pending)}`, ' style="margin-bottom:14px"');
}
function rollover() {
  const t = today(); let ch = false;
  S.tasks.forEach((k) => { if (!k.done && k.date < t) { k.date = t; ch = true; } });
  if (ch) persist();
}
const carried = (k) => (k.done ? 0 : Math.max(0, diff(k.orig, today())));
function todayTasks() {
  const t = today();
  return S.tasks.filter((k) => (!k.done && k.date <= t) || (k.done && k.doneDate === t))
    .sort((a, b) => (a.done - b.done) || (carried(b) - carried(a)));
}
function critItems() {
  const items = S.tasks.filter((k) => !k.done && carried(k) > 3).map((k) => ({ type: 'task', k, days: carried(k) }));
  const m = qrMissed();
  if (m >= 2) items.push({ type: 'qr', days: m });
  return items.sort((a, b) => b.days - a.days);
}
function qrMissed() {
  const ds = new Set(S.qr.map((q) => q.date)); let n = 0, d = addD(today(), -1);
  while (d >= S.created && !ds.has(d) && n < 60) { n++; d = addD(d, -1); }
  return n;
}
const CITEMS = [['mt', 'Morning tea', 'tea'], ['at', 'Afternoon tea', 'tea'], ['sn', 'Snacks', 'snack'], ['ln', 'Lunch', 'lunch']];
let CD = null;
const cRec = (d) => S.canteen.days[d] || { mt: 0, at: 0, sn: 0, ln: 0 };
const cPrices = (d) => (S.canteen.days[d] && S.canteen.days[d].p) || S.canteen.prices;
const cTotal = (d) => { const r = cRec(d), p = cPrices(d); return ((r.mt || 0) + (r.at || 0)) * p.tea + (r.sn || 0) * p.snack + (r.ln || 0) * p.lunch; };
const monthCanteen = (key) => sum(Object.keys(S.canteen.days).filter((d) => d.startsWith(key)), cTotal);
const daySpend = (d) => sum(S.exp.filter((e) => e.date === d), (e) => e.amt) + cTotal(d);
const monthSpend = (key) => sum(S.exp.filter((e) => e.date.startsWith(key)), (e) => e.amt) + monthCanteen(key);
const minutesByDate = () => { const o = {}; S.logs.forEach((l) => { o[l.date] = (o[l.date] || 0) + l.min; }); return o; };
function streak() {
  const ds = new Set(S.logs.map((l) => l.date)); let t = today(); if (!ds.has(t)) t = addD(t, -1);
  let n = 0; while (ds.has(t)) { n++; t = addD(t, -1); } return n;
}
function bestStreak() {
  const ds = Array.from(new Set(S.logs.map((l) => l.date))).sort(); let best = 0, run = 0, prev = null;
  ds.forEach((d) => { run = prev && diff(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return best;
}
function gamify() {
  const totalMin = sum(S.logs, (l) => l.min), doneT = S.tasks.filter((k) => k.done).length;
  const perfect = S.qr.filter((q) => q.score >= 15).length;
  const xp = Math.floor(totalMin / 6) + doneT * 10 + S.qr.length * 5 + perfect * 20 + S.mocks.length * 15;
  const level = Math.floor(Math.sqrt(xp / 40)) + 1, base = 40 * (level - 1) * (level - 1), nxt = 40 * level * level;
  const badges = [
    ['7-day streak', bestStreak() >= 7], ['100 hours studied', totalMin >= 6000], ['Perfect 15 / 15', perfect > 0],
    ['5 mock tests', S.mocks.length >= 5], ['30 tasks finished', doneT >= 30], ['10 revision drills', S.qr.length >= 10]
  ];
  return { xp, level, pct: Math.round((xp - base) / (nxt - base) * 100), badges };
}
function setTaskDone(id, on) {
  const k = S.tasks.find((x) => x.id === id); if (!k) return;
  if (on) {
    const rem = k.plan - k.spent;
    if (rem > 0) S.logs.push({ id: uid(), date: today(), at: Date.now(), subj: k.subj, topic: k.topic, min: rem, focus: 0, task: k.id, auto: true });
    k.spent = k.plan; k.done = true; k.doneDate = today();
  } else {
    const rm = S.logs.filter((l) => l.task === k.id && l.auto);
    k.spent = Math.max(0, k.spent - sum(rm, (l) => l.min));
    S.logs = S.logs.filter((l) => !(l.task === k.id && l.auto));
    k.done = false; k.doneDate = null;
  }
  persist();
}

/* =============== UI primitives =============== */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['var(--accent)', 'var(--teal)', 'var(--c3)', 'var(--c4)', 'var(--good)'];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('span'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
    c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    c.style.animationDelay = Math.random() * .5 + 's'; c.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3800);
  }
}
let modalCb = null, modalFields = [];
function openForm(title, fields, submit, cb, opts) {
  modalCb = cb; modalFields = fields;
  $('#mtitle').textContent = title;
  $('#mbody').innerHTML = fields.map((f) => {
    const id = 'f_' + f.k, v = f.value == null ? '' : f.value; let inp;
    if (f.type === 'select') {
      inp = `<select id="${id}">${f.options.map((o) => { const a = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(a[0])}"${String(a[0]) === String(v) ? ' selected' : ''}>${esc(a[1])}</option>`; }).join('')}</select>`;
    } else if (f.type === 'textarea') {
      inp = `<textarea id="${id}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
    } else {
      inp = `<input id="${id}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.ph || '')}"${f.step ? ` step="${f.step}"` : ''}${f.type === 'number' ? ' inputmode="decimal"' : ''}>`;
    }
    return `<div class="field"><label class="label" for="${id}">${esc(f.label)}</label>${inp}</div>`;
  }).join('');
  $('#merr').textContent = '';
  $('#msubmit').textContent = submit || 'Save';
  $('#mfoot').hidden = false; $('#modal').hidden = false;
  const first = $('#mbody input,#mbody select,#mbody textarea'); if (first && !(opts && opts.noFocus)) setTimeout(() => { if(first.isConnected && !$('#modal').hidden && !$('#mbody').contains(document.activeElement))first.focus(); }, 60);
}
function openMenu(title, items) {
  modalCb = null; $('#mtitle').textContent = title; $('#mfoot').hidden = true; $('#merr').textContent = '';
  $('#mbody').innerHTML = `<div class="menu">${items.map((i) => `<button type="button" data-act="${i[0]}"${i[2] ? ` data-v="${i[2]}"` : ''}>${i[1]}</button>`).join('')}</div>`;
  $('#modal').hidden = false;
}
const closeModal = () => { $('#modal').hidden = true; modalCb = null; };
$('#mform').addEventListener('submit', (e) => {
  e.preventDefault(); if (!modalCb) return;
  const vals = {};
  for (const f of modalFields) {
    let v = $('#f_' + f.k).value.trim();
    if (f.req && !v) { $('#merr').textContent = 'Please fill in: ' + f.label; return; }
    if (f.type === 'number') { v = v === '' ? '' : Number(v); if (v !== '' && isNaN(v)) { $('#merr').textContent = f.label + ' must be a number.'; return; } if (f.min != null && v !== '' && v < f.min) { $('#merr').textContent = f.label + ' must be at least ' + f.min + '.'; return; } }
    vals[f.k] = v;
  }
  const cb = modalCb; closeModal(); cb(vals);
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  if (e.key === 'Enter' && e.target.id && e.target.id.endsWith('-in')) {
    e.preventDefault(); const box = e.target.id.slice(0, -3), Z = QZ[box];
    if (Z) { if (Z.checked) quizNext(box); else quizCheck(box, e.target.value); }
  }
});

/* =============== Charts =============== */
function lineSVG(vals, labels, o) {
  const W = 640, H = 236, pl = 36, pr = 10, pt = 12, pb = 26, n = vals.length;
  const max = o.max, x = (i) => pl + i * (W - pl - pr) / Math.max(1, n - 1), y = (v) => pt + (1 - v / max) * (H - pt - pb);
  let g = '';
  for (let k = 0; k <= max; k += o.step) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(k)}" y2="${y(k)}" stroke="var(--line)"/><text x="${pl - 8}" y="${y(k) + 3}" text-anchor="end">${k}</text>`;
  const pts = vals.map((v, i) => x(i) + ',' + y(v)).join(' ');
  let trend = '';
  if (o.trend && n > 3) {
    let sx = 0, sy = 0, sxy = 0, sxx = 0; vals.forEach((v, i) => { sx += i; sy += v; sxy += i * v; sxx += i * i; });
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - m * sx) / n;
    trend = `<line x1="${x(0)}" y1="${y(Math.max(0, Math.min(max, b)))}" x2="${x(n - 1)}" y2="${y(Math.max(0, Math.min(max, b + m * (n - 1))))}" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>`;
  }
  const tg = o.target ? `<line x1="${pl}" x2="${W - pr}" y1="${y(o.target)}" y2="${y(o.target)}" stroke="var(--good)" stroke-dasharray="5 4"/><text x="${W - pr}" y="${y(o.target) - 5}" text-anchor="end" style="fill:var(--good)">${o.targetLabel || 'target'}</text>` : '';
  const dots = o.dotAbove ? vals.map((v, i) => v >= o.dotAbove ? `<circle cx="${x(i)}" cy="${y(v)}" r="3.4" fill="var(--good)"/>` : '').join('') : '';
  let xl = ''; labels.forEach((l, i) => { if (l) xl += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${l}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Line chart')}">${g}${tg}<polygon points="${pl},${y(0)} ${pts} ${x(n - 1)},${y(0)}" fill="var(--teal)" fill-opacity=".13"/><polyline points="${pts}" fill="none" stroke="var(--teal)" stroke-width="2.2" stroke-linejoin="round"/>${dots}${trend}<circle cx="${x(n - 1)}" cy="${y(vals[n - 1])}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>${xl}</svg>`;
}
function barsSVG(vals, labels, aria) {
  const W = 640, H = 170, pl = 8, pb = 22, n = vals.length, max = Math.max(1, ...vals), bw = (W - pl * 2) / n;
  let s = '';
  vals.forEach((v, i) => {
    const bh = v / max * (H - pb - 14), x = pl + i * bw;
    s += `<rect x="${x + 2}" y="${H - pb - bh}" width="${Math.max(2, bw - 4)}" height="${Math.max(bh, 1.5)}" rx="3" fill="${v ? 'var(--c2)' : 'var(--surface2)'}"/>`;
    if (labels[i]) s += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${labels[i]}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${s}</svg>`;
}
function donutSVG(parts) {
  const total = sum(parts, (p) => p[1]) || 1, r = 40, C = 2 * Math.PI * r; let off = 0;
  const cols = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--good)', 'var(--muted)'];
  const arcs = parts.map((p, i) => { const len = p[1] / total * C, s = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${cols[i % 6]}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off += len; return s; }).join('');
  const legend = parts.map((p, i) => `<span><i style="background:${cols[i % 6]}"></i>${esc(p[0])} <b class="mono">${inr(p[1])}</b></span>`).join('');
  return `<div class="donutwrap"><svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="Spending by category"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="18"/>${arcs}</svg><div class="legend" style="flex-direction:column;margin:0">${legend}</div></div>`;
}

/* =============== Navigation =============== */
function buildNav() {
  const prim = NAV.filter((n) => n.prim);
  $('#side').innerHTML = `<div class="brandmark"><img class="logo" src="icons/logo-192.png" alt="Study Tracker logo"><div class="bname">Study Tracker<small>SSC plan</small></div></div>` +
    NAV.map((n) => `<button class="nav${n.prim ? '' : ' sec'}" data-act="nav" data-v="${esc(n.id)}">${ICON[n.id]}<span>${esc(n.short || n.label)}</span></button>`).join('') +
    `<button class="nav moreb" data-act="nav" data-v="more">${ICON.more}<span>More</span></button>`;
  $('#themeBtn').innerHTML = ICON.theme; $('#outBtn').innerHTML = ICON.out; $('#eye').innerHTML = ICON.eye;
  return prim;
}
function routeState(view) {
  return { ...(history.state || {}), studyTracker: { view, section: view !== 'home' } };
}
function show(v, fromHistory = false) {
  if (!VIEWS[v]) v = 'home';
  if (!fromHistory && !$('#app').hidden) {
    if (v === 'home' && history.state?.studyTracker?.section) { history.back(); return; }
    if (v !== 'home') {
      if (history.state?.studyTracker?.section) history.replaceState(routeState(v),'');
      else { history.replaceState(routeState('home'),''); history.pushState(routeState(v),''); }
    } else history.replaceState(routeState('home'),'');
  }
  closeModal(); CUR = v; window.scrollTo(0, 0); render();
}
window.addEventListener('popstate', event => {
  if ($('#app').hidden || !S) return;
  // All section navigation shares one Home anchor. Back from any section reaches it.
  const view = event.state?.studyTracker?.view || 'home';
  show(view, true);
});
function render() {
  const secIds = NAV.filter((n) => !n.prim).map((n) => n.id);
  $$('.nav').forEach((b) => {
    const on = b.dataset.v === CUR || (b.dataset.v === 'more' && (CUR === 'more' || secIds.includes(CUR)));
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#vtitle').textContent = TITLES[CUR] || '';
  $('#backHome').hidden = CUR === 'home';
  const fn = VIEWS[CUR] || VIEWS.home;
  $('#view').innerHTML = `<div class="view">${syncBanner()}${CUR === 'home' ? planTracking() : ''}${CUR === 'home' ? dailyPlannerHTML() + ssc.dailyHTML() : ''}${fn()}</div>`;
  const after = AFTER[CUR]; if (after) after();
}
const AFTER = {};

/* =============== Views: Home =============== */
const QUOTES = [
  'Small hours, kept every day, beat big hours kept once.', 'Today\'s revision is next month\'s speed.',
  'Slow is fine. Skipping is what costs you.', 'One more set of 15. That is all this moment asks.',
  'You do not need motivation. You need the next ten minutes.', 'Accuracy first. Speed follows.',
  'Every mistake you write down is a mark you will not lose.', 'Consistency is the shortcut nobody likes.',
  'Finish what you carried over yesterday.', 'The exam rewards the one who revised, not the one who worried.',
  'Start with the hard subject while your mind is fresh.', 'Rest is part of the plan. Sleep counts as study.'
];
const card = (title, body, extra) => `<div class="card"${extra || ''}>${title ? `<h3>${title}</h3>` : ''}${body}</div>`;

const VIEWS = {};

VIEWS.home = function () {
  const t = today(), tk = todayTasks(), done = tk.filter((k) => k.done).length, pct = tk.length ? Math.round(done / tk.length * 100) : 0;
  const crit = critItems(), mins = sum(S.logs.filter((l) => l.date === t), (l) => l.min);
  const spent = daySpend(t), meets = S.meet.filter((m) => m.date === t).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const mkey = t.slice(0, 7), mspent = monthSpend(mkey), bud = +S.settings.budget || 0;
  const g = gamify(), st = streak(), missed = qrMissed();
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  let planHtml = `<div class="plan"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="label">200-day plan</span><button class="link" style="width:auto;padding:0;font-size:13px" data-act="nav" data-v="plan">Upload plan</button></div><div class="bar warnbar"><i style="width:0"></i></div></div>`;
  if (S.plan.length) {
    const total = Math.max(...S.plan.map((r) => r.day)), cur = Math.max(0, ...S.plan.filter((r) => r.date <= t).map((r) => r.day));
    planHtml = `<div class="plan"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="label">SSC plan</span><span class="mono" style="font-size:13px">Day ${cur} / ${total}</span></div><div class="bar warnbar"><i style="width:${Math.round(cur / total * 100)}%"></i></div></div>`;
  }
  const exam = S.settings.exam ? diff(t, S.settings.exam) : null;
  const examTxt = exam == null ? '' : exam >= 0 ? `<span class="quiet">${exam} days to exam</span>` : `<span class="quiet">Exam date passed</span>`;

  const critHtml = crit.length ? `<div class="card critical"><h3>${ICON.alert}Critical zone: needs attention</h3>${crit.map((c) => c.type === 'qr'
    ? `<div class="crit-item"><div><b>Quick Revision</b><br><span class="quiet">No drill for ${c.days} days in a row</span></div><div class="actions"><span class="badge">Missed ${c.days} days</span><button class="btn sm" data-act="nav" data-v="rev">Practise now</button></div></div>`
    : `<div class="crit-item"><div><b>${esc(c.k.subj)}</b><br><span class="quiet">${esc(c.k.topic)} · ${c.k.plan - c.k.spent} min left</span></div><div class="actions"><span class="badge">Pending for ${c.days} days</span><button class="btn sm" data-act="doneTask" data-id="${esc(c.k.id)}">Mark done</button><button class="btn sm ghost" data-act="resched" data-id="${esc(c.k.id)}">Reschedule</button></div></div>`).join('')}<p class="quiet" style="margin-top:8px">Anything carried forward for more than 3 days lands here.</p></div>` : '';
  const warn = missed === 1 ? `<div class="warnbanner">${ICON.warn}<div><b>You skipped Quick Revision yesterday.</b><br><span class="quiet">Two missed days move it to the Critical Zone. Do a 15-question set today to keep the streak.</span></div><button class="btn sm" data-act="nav" data-v="rev">Practise</button></div>` : '';

  const taskRows = tk.length ? tk.map((k) => {
    const c = carried(k), tag = !k.done && c ? `<span class="badge amber" style="margin-left:6px">${c === 1 ? 'Carried from yesterday' : 'Carried ' + c + ' days'}</span>` : '';
    const left = k.plan - k.spent, partial = !k.done && k.spent > 0 ? ` · ${left} min left` : '';
    return `<div class="trow"><label class="task"><input type="checkbox" data-chg="toggleTask" data-id="${esc(k.id)}"${k.done ? ' checked' : ''}><span class="tick">${ICON.chk}</span><span class="t"><b>${esc(k.subj)}${tag}</b><span>${esc(k.topic)}${partial}</span></span><span class="m">${esc(k.plan)} min</span></label>${k.done ? '' : pinButton(k.id)}${k.done ? '' : `<button class="mini" data-act="partial" data-id="${esc(k.id)}" title="Log part of this task" aria-label="Log part done">Part</button>`}<button class="mini" data-act="sscTopicPractice" data-topic="${esc(k.topic)}" data-subj="${esc(k.subj)}">Practice</button><button class="mini del" data-act="delTask" data-id="${esc(k.id)}" title="Remove" aria-label="Remove task">&times;</button></div>`;
  }).join('') : `<div class="empty"><b>Nothing planned for today</b>Add a task, or upload your 200-day plan so each day fills in by itself.<div class="actions" style="justify-content:center;margin-top:10px"><button class="btn sm" data-act="addTask">Add task</button><button class="btn sm ghost" data-act="nav" data-v="plan">Upload plan</button></div></div>`;

  const cT = cTotal(t);
  const exRows = S.exp.filter((e) => e.date === t).map((e) => `<div class="exp"><span>${esc(e.note || e.cat)} <span class="quiet">${esc(e.cat)}</span></span><span class="mono">${inr(e.amt)}</span></div>`).join('') + (cT ? `<div class="exp"><span>DHANAM Canteen <span class="quiet">tea, snacks, lunch</span></span><span class="mono">${inr(cT)}</span></div>` : '') || '<p class="quiet">No expenses added today.</p>';
  const mtRows = meets.map((m) => `<div class="exp"><span>${esc(m.title)}${m.who ? ` <span class="quiet">with ${esc(m.who)}</span>` : ''}</span><span class="mono">${esc(m.time || '')}</span></div>`).join('') || '<p class="quiet">No meetings today.</p>';

  return `<div class="grid" style="gap:14px">
  <div class="card hero"><div>
    <p class="label">${longD(t)}</p>
    <h3 style="font-size:clamp(26px,5vw,36px);margin:4px 0 10px">${greet}, ${esc(S.name || 'there')}</h3>
    <div class="streak">${ICON.flame}<div><b class="mono" style="font-size:20px">${st}</b> day streak<br><span class="quiet">Best: ${bestStreak()} days ${examTxt ? '· ' : ''}</span>${examTxt}</div></div>
    ${planHtml}
  </div>
  <div class="ringwrap"><svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="56" fill="none" stroke="var(--surface2)" stroke-width="12"/><circle id="ring" cx="66" cy="66" r="56" fill="none" stroke="var(--teal)" stroke-width="12" stroke-linecap="round" stroke-dasharray="351.86" stroke-dashoffset="351.86" data-pct="${pct}" style="transition:stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)"/></svg><div class="rc"><div><b>${pct}%</b><br><small>of today</small></div></div></div></div>
  <p class="quote">${esc(S.settings.why ? 'My why: ' + S.settings.why : QUOTES[(parseD(t).getDate() + parseD(t).getMonth()) % QUOTES.length])}</p>
  ${remBanner()}${warn}${critHtml}
  <div class="stats">
    <div class="stat"><span class="label">Studied today</span><b>${hrs(mins)} h</b><small>target ${S.settings.target} h</small></div>
    <div class="stat"><span class="label">Tasks done</span><b>${done} / ${tk.length}</b><small>${tk.length - done} left</small></div>
    <div class="stat"><span class="label">Spent today</span><b>${inr(spent)}</b><small>${bud ? Math.round(mspent / bud * 100) + '% of month' : 'set a budget'}</small></div>
    <div class="stat"><span class="label">Overdue</span><b style="color:${crit.length ? 'var(--bad)' : 'inherit'}">${crit.length}</b><small>in critical zone</small></div>
  </div>
  <div class="grid g2">
    ${card("Today's schedule", taskRows + `<div class="actions" style="margin-top:12px"><button class="btn sm" data-act="addTask">Add task</button><button class="btn sm ghost" data-act="nav" data-v="study">Start focus timer</button></div>`)}
    <div class="grid" style="gap:14px">
      ${card('Money today', exRows + `<div class="exp"><b>Total</b><b class="mono">${inr(spent)}</b></div>` + (bud ? `<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="label">Month budget</span><span class="mono" style="font-size:13px">${inr(mspent)} / ${inr(bud)}</span></div><div class="bar ${mspent > bud ? 'bad' : ''}"><i style="width:${Math.min(100, Math.round(mspent / bud * 100))}%"></i></div></div>` : ''))}
      ${card('Meetings today', mtRows)}
      ${todoCompact()}
      ${card('Level and badges', `<div class="xp"><div class="lv">${g.level}</div><div style="flex:1"><div class="label">Level · ${g.xp} XP</div><div class="bar" style="margin-top:6px"><i style="width:${g.pct}%"></i></div></div></div><div class="badgeRow">${g.badges.map((b) => `<div class="bdg ${b[1] ? 'on' : 'off'}"><b>${b[1] ? '&#9733;' : '&#9734;'}</b>${esc(b[0])}</div>`).join('')}</div>`)}
    </div>
  </div></div>`;
};
AFTER.home = () => { requestAnimationFrame(() => setTimeout(() => { const r = $('#ring'); if (r) r.style.strokeDashoffset = 351.86 * (1 - r.dataset.pct / 100); }, 40)); };

/* =============== Views: Study Timer =============== */
const T = { mode: 'focus', total: 0, endAt: 0, running: false, left: 0, elapsed: 0, last: 0, iv: null, subj: 'Quant', topic: '' };
const tTotal = () => (T.mode === 'focus' ? S.settings.pomo : S.settings.brk) * 60;
function tReset(mode) { clearInterval(T.iv); T.running = false; T.mode = mode || 'focus'; T.total = tTotal(); T.left = T.total; T.elapsed = 0; }
function tTick() {
  const now = Date.now(), dt = Math.round((now - T.last) / 1000);
  if (dt >= 1) { const used = Math.min(dt, T.left); T.last += dt * 1000; T.left -= used; if (T.mode === 'focus') T.elapsed += used; }
  tPaint();
  if (T.left <= 0) {
    clearInterval(T.iv); T.running = false; beep(); notify(T.mode === 'focus' ? 'Focus session finished. Take a break.' : 'Break over. Back to study.');
    if (T.mode === 'focus') { const m = Math.max(1, Math.round(T.elapsed / 60)); tReset('break'); T.running = false; saveSession(m); } else tReset('focus');
    if (CUR === 'study') render();
  }
}
function tPaint() {
  const r = $('#tring'), d = $('#tdisp'); if (!r || !d) return;
  const m = Math.floor(T.left / 60), s = T.left % 60; d.textContent = pad(m) + ':' + pad(s);
  r.style.strokeDashoffset = 565.5 * (1 - T.left / (T.total || 1));
}
function beep() {
  try { const ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 880; g.gain.setValueAtTime(.2, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .8); o.start(); o.stop(ac.currentTime + .8); } catch (e) { /* no sound */ }
}
function saveSession(min, pre) {
  openForm('Save study session', [
    { k: 'task', label: 'Count toward plan topic (optional)', type: 'select', options: [['', 'Extra study (not linked)'], ...S.tasks.filter(k => k.pk && !k.done).map(k => [k.id, k.subj + ': ' + k.topic])] },
    { k: 'subj', label: 'Subject', type: 'select', options: SUBJECTS, value: (pre && pre.subj) || T.subj },
    { k: 'topic', label: 'Topic', value: (pre && pre.topic) || T.topic, ph: 'e.g. Percentage', req: 1 },
    { k: 'min', label: 'Minutes', type: 'number', value: min, min: 1, req: 1 },
    { k: 'focus', label: 'How focused were you?', type: 'select', options: [[5, '5 · Fully focused'], [4, '4 · Good'], [3, '3 · Average'], [2, '2 · Distracted'], [1, '1 · Barely studied']], value: 4 }
  ], 'Save session', (v) => { const task = S.tasks.find(k => k.id === v.task && k.pk && !k.done);
    const credit = task ? Math.min(v.min, Math.max(0, task.plan - task.spent)) : 0;
    S.logs.push({ id: uid(), date: today(), at: Date.now(), subj: task ? task.subj : v.subj, topic: task ? task.topic : v.topic, min: v.min, focus: +v.focus, task: task ? task.id : null, credit });
    if (task) { task.spent += credit; if (task.spent >= task.plan) { task.done = true; task.doneDate = today(); } } persist(); toast('Session saved'); if (CUR === 'study' || CUR === 'home') render(); });
}
VIEWS.study = function () {
  if (!T.total) tReset('focus');
  const t = today(), logs = S.logs.filter((l) => l.date === t).sort((a, b) => b.at - a.at);
  return `<div class="grid g2">
  ${card(T.mode === 'focus' ? 'Focus timer' : 'Break time', `<div class="timer"><div class="ringwrap"><svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="90" fill="none" stroke="var(--surface2)" stroke-width="14"/><circle id="tring" cx="100" cy="100" r="90" fill="none" stroke="${T.mode === 'focus' ? 'var(--teal)' : 'var(--accent)'}" stroke-width="14" stroke-linecap="round" stroke-dasharray="565.5" stroke-dashoffset="0"/></svg><div class="rc"><div><b id="tdisp">25:00</b><br><small>${T.mode === 'focus' ? 'focus' : 'break'}</small></div></div></div>
  <div class="sel"><div><label class="label" for="tsubj">Subject</label><select class="inp" id="tsubj" data-chg="tField" data-f="subj">${SUBJECTS.map((s) => `<option${s === T.subj ? ' selected' : ''}>${s}</option>`).join('')}</select></div><div><label class="label" for="ttopic">Topic</label><input class="inp" id="ttopic" data-chg="tField" data-f="topic" value="${esc(T.topic)}" placeholder="What are you studying?"></div></div>
  <div class="actions"><button class="btn" data-act="tToggle">${T.running ? 'Pause' : 'Start'}</button><button class="btn ghost" data-act="tSave">Stop and save</button><button class="btn ghost" data-act="tResetBtn">Reset</button></div>
  <p class="quiet">Focus ${S.settings.pomo} min, break ${S.settings.brk} min. Change these in Settings.</p></div>`)}
  ${card("Today's sessions", `<div class="list">${logs.map((l) => `<div class="li"><div class="l"><b>${esc(l.subj)}</b> · ${esc(l.topic)}<small>${esc(l.min)} min${l.focus ? ' · focus ' + l.focus + '/5' : ''}</small></div><button class="mini del" data-act="delLog" data-id="${esc(l.id)}" aria-label="Delete session">&times;</button></div>`).join('') || '<div class="empty"><b>No sessions yet</b>Start the timer or add one by hand.</div>'}</div><div class="actions" style="margin-top:12px"><button class="btn sm ghost" data-act="addStudy">Add session by hand</button></div><p style="margin-top:12px"><b class="mono">${hrs(sum(logs, (l) => l.min))} h</b> <span class="quiet">studied today</span></p>`)}
  </div>`;
};
AFTER.study = () => { tPaint(); if (T.running && !T.iv) { T.last = Date.now(); T.iv = setInterval(tTick, 500); } };

/* =============== Views: Trendline =============== */
VIEWS.trend = function () {
  const t = today(), N = 36, days = Array.from({ length: N }, (_, i) => addD(t, i - N + 1)), by = minutesByDate();
  const h = days.map((d) => Math.round((by[d] || 0) / 6) / 10), full = h.slice(0, N - 1), tg = +S.settings.target || 6;
  const any = sum(full) > 0;
  const labs = days.map((d, i) => (i % 7 === 0 || i === N - 1 ? fmtD(d) : ''));
  const av = (a) => (a.length ? sum(a) / a.length : 0), last7 = full.slice(-7), prev7 = full.slice(-14, -7), dif = av(last7) - av(prev7);
  let bi = 0; full.forEach((v, i) => { if (v > full[bi]) bi = i; });
  const foc = full.filter((v) => v >= tg).length, low = full.filter((v) => v < tg / 2).length;
  const tr = !any ? ['', 'Log some study to see insights'] : dif > .3 ? ['b', 'Increasing: +' + dif.toFixed(1) + ' h/day vs last week'] : dif < -.3 ? ['r', 'Decreasing: ' + dif.toFixed(1) + ' h/day vs last week'] : ['a', 'Steady vs last week'];
  const chips = `<span class="chip"><i class="dot ${tr[0]}"></i>${tr[1]}</span>` + (any ? `<span class="chip"><i class="dot g"></i>${foc} focused days (${tg} h or more)</span><span class="chip"><i class="dot r"></i>${low} not focused days</span><span class="chip"><i class="dot a"></i>Best: ${fmtD(days[bi])}, ${full[bi]} h</span><span class="chip"><i class="dot"></i>Average ${av(full).toFixed(1)} h/day</span>` : '');
  const max = Math.max(8, Math.ceil(Math.max(...h) / 2) * 2);
  // heatmap: 6 weeks, Monday first
  const td = parseD(t), dow = (td.getDay() + 6) % 7, startMon = addD(t, -dow - 35); let heat = '';
  for (let r = 0; r < 7; r++) {
    heat += `<span class="wd">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][r]}</span>`;
    for (let c = 0; c < 6; c++) {
      const d = addD(startMon, c * 7 + r);
      if (d > t) { heat += '<span class="cell" style="opacity:.3"></span>'; continue; }
      const v = (by[d] || 0) / 60, lv = v === 0 ? 0 : v < tg / 2 ? 22 : v < tg * .85 ? 45 : v < tg ? 70 : 95;
      heat += `<span class="cell" title="${fmtD(d)}: ${v.toFixed(1)} h" style="background:${lv ? `color-mix(in srgb,var(--teal) ${lv}%,var(--surface2))` : 'var(--surface2)'}"></span>`;
    }
  }
  // today by hour
  const hm = {}; S.logs.filter((l) => l.date === t).forEach((l) => { const hh = new Date(l.at).getHours(); hm[hh] = (hm[hh] || 0) + l.min; });
  const hv = [], hl = []; for (let i = 5; i <= 23; i++) { hv.push(Math.min(60, hm[i] || 0)); hl.push(i % 3 === 0 ? (i % 12 || 12) + (i < 12 ? 'a' : 'p') : ''); }
  // subject split 30d
  const sp = {}; S.logs.filter((l) => l.date > addD(t, -30)).forEach((l) => { sp[l.subj] = (sp[l.subj] || 0) + l.min; });
  const spT = sum(Object.values(sp)) || 1, cols = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--muted)'];
  const spE = Object.entries(sp).sort((a, b) => b[1] - a[1]);
  const exv = days.slice(-30).map((d) => daySpend(d)), exl = days.slice(-30).map((d, i) => (i % 7 === 0 ? fmtD(d) : ''));
  return `<div class="chips">${chips}</div><div class="grid" style="gap:14px">
  ${card('Daily study hours, last 36 days', lineSVG(h, labs, { max, step: max > 8 ? 4 : 2, target: tg, targetLabel: 'target ' + tg + ' h', trend: true, dotAbove: tg, aria: 'Daily study hours with trendline' }) + `<div class="legend"><span><i style="background:var(--teal)"></i>Hours studied</span><span><i style="background:var(--accent)"></i>Trendline</span><span><i style="background:var(--good)"></i>Focused day</span></div>`)}
  <div class="grid g2">
    ${card('Study intensity', `<div class="heat">${heat}</div><p class="quiet" style="margin-top:12px">Columns are weeks, rows are weekdays. Darker means more hours.</p>`)}
    ${card('Today by hour', barsSVG(hv, hl, 'Minutes studied per hour today') + '<h3 style="margin:18px 0 10px">Time by subject, last 30 days</h3>' + (spE.length ? `<div class="split">${spE.map((e, i) => `<i style="width:${e[1] / spT * 100}%;background:${cols[i % 5]}"></i>`).join('')}</div><div class="legend">${spE.map((e, i) => `<span><i style="background:${cols[i % 5]}"></i>${esc(e[0])} <b class="mono">${Math.round(e[1] / spT * 100)}%</b></span>`).join('')}</div>` : '<p class="quiet">No sessions logged yet.</p>'))}
  </div>
  ${card('Daily spending, last 30 days', barsSVG(exv, exl, 'Daily spending'))}
  </div>`;
};

/* =============== Views: Quick Revision (drills) =============== */
const KINDS = [
  { k: 'sq', name: 'Squares', range: '1 to 100', big: 'n&sup2;' },
  { k: 'cu', name: 'Cubes', range: '1 to 100', big: 'n&sup3;' },
  { k: 'tb', name: 'Tables', range: 'Tables 12 to 30', big: 'a&times;b' },
  { k: 'pr', name: 'Prime numbers', range: '1 to 150', big: 'p' }
];
const RV = { kind: null, mode: 'learn', mcq: false, tableBase: '12', tableLimit: 20 }, QZ = {}; let FL = null;
const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
function gen(kind, n) {
  const out = [], seen = new Set();
  if (/^t[1-5]$/.test(kind)) return mentalPracticeQuestions(Number(kind.slice(1)),n);
  if (kind === 'tb') return multiplicationQuestions(RV.tableBase,RV.tableLimit,n);
  if (kind === 'pr') {
    const P = [], C = []; for (let i = 2; i <= 150; i++) (isPrime(i) ? P : C).push(i);
    const pool = []; let g = 0;
    while (pool.length < n && g++ < 800) { const arr = pool.length < Math.ceil(n / 2) ? P : C, v = arr[ri(0, arr.length - 1)]; if (!seen.has(v)) { seen.add(v); pool.push(v); } }
    return shuffle(pool).map((x) => ({ t: 'Is ' + x + ' a prime number?', a: isPrime(x) ? 'yes' : 'no', yn: true, show: isPrime(x) ? 'Yes, ' + x + ' is prime' : 'No, ' + x + ' is not prime' }));
  }
  let g = 0;
  while (out.length < n && g++ < 1000) {
    let q, r = Math.random(), x, y;
    switch (kind) {
      case 'sq': x = ri(2, 100); q = r < .7 ? { t: x + '² = ?', a: x * x } : { t: '√' + x * x + ' = ?', a: x }; break;
      case 'cu': x = ri(2, 100); q = r < .7 ? { t: x + '³ = ?', a: x * x * x } : { t: '∛' + x * x * x + ' = ?', a: x }; break;
      default: { const p = [12.5, 25, 37.5, 62.5, 75, 6.25][ri(0, 5)], b = ri(5, 60) * 16; q = { t: p + '% of ' + b + ' = ?', a: Math.round(b * p / 100) }; }
    }
    if (seen.has(q.t)) continue; seen.add(q.t); q.show = String(q.a); out.push(q);
  }
  return out;
}
function mcqOpts(a) {
  const s = new Set([a]); let g = 0;
  while (s.size < 4 && g++ < 60) { const d = [1, 2, 3, 5, 9, 10, 11, 20, 100][ri(0, 8)] * (Math.random() < .5 ? -1 : 1), v = a + d; if (v > 0) s.add(v); }
  return shuffle(Array.from(s));
}
function quizStart(box, kind, n, opts) {
  clearInterval((QZ[box] || {}).iv);
  const Z = QZ[box] = Object.assign({ kind, qs: gen(kind, n), i: 0, score: 0, wrong: [], t0: Date.now(), checked: false, done: false, mcq: false, onDone: null }, opts || {});
  Z.iv = setInterval(() => { const c = document.getElementById(box + '-clk'); if (!c || Z.done) { clearInterval(Z.iv); return; } const s = Math.round((Date.now() - Z.t0) / 1000); c.textContent = Math.floor(s / 60) + ':' + pad(s % 60); }, 1000);
  quizDraw(box);
}
function quizDraw(box) {
  const Z = QZ[box], el = document.getElementById(box); if (!Z || !el) return;
  const n = Z.qs.length;
  if (Z.i >= n) {
    if (!Z.done) { Z.done = true; Z.secs = Math.round((Date.now() - Z.t0) / 1000); if (Z.onDone) Z.onDone(Z); }
    const good = Z.score >= Math.ceil(n * .85);
    const w = Z.wrong.map((q) => `<span>${esc(q.t.replace(' = ?', '').replace(/^Is (\d+) a prime number\?$/, '$1'))} = ${esc(q.show.replace(/^(Yes|No), /, ''))}</span>`).join('');
    el.innerHTML = `<div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin:10px 0 16px"><div class="score">${Z.score}<span style="font-size:26px;color:var(--muted)"> / ${n}</span></div><div class="quiet">Time ${Math.floor(Z.secs / 60)}m ${Z.secs % 60}s · ${Math.round(Z.score / n * 100)}% accuracy</div></div>
    <div class="fb ${good ? 'ok' : 'no'}" style="${good ? '' : 'background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--warn)'}">${good ? 'Excellent work.' : 'Done. Review the answers below and try a new set.'}</div>
    ${Z.wrong.length ? `<h3 style="margin-top:18px;font-size:15px">${Z.noteMist ? 'Added to your mistakes notebook' : 'Missed'}</h3><div class="wrong">${w}</div>` : ''}
    <div class="actions" style="margin-top:18px"><button class="btn" data-act="qzAgain" data-box="${box}">${Z.mathTest ? 'Retry mental maths test' : Z.modelId ? 'Try this model again' : 'Try a new set'}</button></div>`;
    if (good && !Z.confettied) { Z.confettied = true; confetti(); }
    return;
  }
  const q = Z.qs[Z.i]; let input;
  if (Z.questionIndex !== Z.i) { Z.questionIndex = Z.i; Z.questionStarted = Date.now(); }
  if (q.yn) input = `<div class="ans"><button class="btn" data-act="qzAns" data-box="${box}" data-v="yes">Yes</button><button class="btn ghost" data-act="qzAns" data-box="${box}" data-v="no">No</button></div>`;
  else if (Z.mcq) { if (!q.opts) q.opts = mcqOpts(q.a); input = `<div class="ans mcq">${q.opts.map((o) => `<button class="btn ghost" data-act="qzAns" data-box="${box}" data-v="${o}">${o}</button>`).join('')}</div>`; }
  else input = `<div class="ans"><input id="${box}-in" type="text" inputmode="numeric" autocomplete="off" aria-label="Your answer"><button class="btn" data-act="qzCheck" data-box="${box}">Check answer</button></div>`;
  el.innerHTML = `<div style="display:flex;justify-content:space-between;margin-top:6px"><span class="label">Question ${Z.i + 1} of ${n}</span><span class="mono" style="font-size:13px">Score ${Z.score} · <span id="${box}-clk">0:00</span></span></div><div class="bar" style="margin-top:8px"><i style="width:${Z.i / n * 100}%"></i></div><div class="q">${esc(q.t)}</div>${input}<div id="${box}-fb"></div>`;
  Z.checked = false; const inp = document.getElementById(box + '-in'); if (inp) inp.focus();
}
function quizCheck(box, v) {
  const Z = QZ[box]; if (!Z || Z.checked) return; const q = Z.qs[Z.i];
  v = String(v).trim().toLowerCase(); if (!v) return;
  const ok = q.yn ? v === q.a : Number(v.replace(/[,\s]/g, '')) === q.a;
  Z.checked = true; Z.lastAnswer = v;
  if (!Z.answers) Z.answers = [];
  Z.answers[Z.i] = { value: v, ok, seconds: Math.max(1,Math.round((Date.now() - (Z.questionStarted || Z.t0))/1000)) }; if (ok) Z.score++; else Z.wrong.push(q);
  document.getElementById(box + '-fb').innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}">${ok ? 'Correct.' : 'Not quite. Answer: ' + esc(q.show)}</div>${q.explanation ? '<p class="quiet">'+esc(q.explanation)+'</p>' : ''}<div style="margin-top:12px"><button class="btn" id="${box}-nx" data-act="qzNext" data-box="${box}">${Z.i === Z.qs.length - 1 ? 'See score' : 'Next question'}</button></div>`;
  $$('#' + box + ' .ans button, #' + box + ' .ans input').forEach((b) => { b.disabled = true; });
  const nx = document.getElementById(box + '-nx'); if (nx) nx.focus();
}
function quizNext(box) { const Z = QZ[box]; if (!Z) return; Z.i++; quizDraw(box); }
function finishDrill(Z) {
  S.qr.push({ id: uid(), date: today(), kind: Z.kind, score: Z.score, sec: Z.secs, ...(Z.kind === 'tb' ? { tableBase: RV.tableBase, tableLimit: RV.tableLimit } : {}) });
  Z.wrong.forEach((q) => { if (!S.mist.some((m) => m.q === q.t)) S.mist.push({ id: uid(), date: today(), kind: Z.kind, q: q.t, a: q.show }); });
  Z.noteMist = true; persist();
  const c = $('#rcheck'); if (c) c.innerHTML = checklistHTML();
}
const checklistHTML = () => { const t = today(); return KINDS.map((o) => { const d = S.qr.some((q) => q.date === t && q.kind === o.k); return `<span class="chip"><i class="dot ${d ? 'g' : 'r'}"></i>${o.name}${d ? ' done' : ' pending'}</span>`; }).join(''); };
function revPanel() {
  if (!RV.kind) return '';
  const o = KINDS.find((x) => x.k === RV.kind);
  let head = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px"><h3 style="margin:0">${o.name}</h3><div class="seg" role="group">${['learn', 'practice', 'flash'].map((m) => `<button data-act="revMode" data-v="${m}" aria-pressed="${RV.mode === m}">${{ learn: 'Learn', practice: 'Practice', flash: 'Flashcards' }[m]}</button>`).join('')}</div></div>`;
  if (RV.kind === 'tb') head += `<div class="table-controls"><div><label class="label" for="tableBase">Choose multiplication table</label><select class="inp" id="tableBase" data-chg="tableChoice" data-key="tableBase">${Array.from({length:19},(_,i)=>i+12).map(n=>`<option value="${n}" ${String(RV.tableBase)===String(n)?'selected':''}>Table of ${n}</option>`).join('')}<option value="mixed" ${RV.tableBase==='mixed'?'selected':''}>Mixed: all tables 12–30</option></select></div><div><label class="label" for="tableLimit">Multipliers</label><select class="inp" id="tableLimit" data-chg="tableChoice" data-key="tableLimit"><option value="20" ${RV.tableLimit===20?'selected':''}>×1 to ×20</option><option value="50" ${RV.tableLimit===50?'selected':''}>×1 to ×50</option></select></div></div><p class="quiet">Practice and flashcards follow this selection. Changing it resets the current unsaved drill.</p>`;
  if (RV.mode === 'learn') {
    let cells = '';
    if (RV.kind === 'pr') for (let n = 2; n <= 150; n++) { if (isPrime(n)) cells += `<div class="pr">${n}</div>`; }
    else if (RV.kind === 'tb') { const bases = RV.tableBase === 'mixed' ? Array.from({length:19},(_,i)=>i+12) : [Number(RV.tableBase)]; for (const base of bases) for (let a = 1; a <= RV.tableLimit; a++) cells += `<div><span>${base}&times;${a}</span><b>${a * base}</b></div>`; }
    else for (let n = 1; n <= 100; n++) cells += `<div><span>${n}${RV.kind === 'sq' ? '&sup2;' : '&sup3;'}</span><b>${RV.kind === 'sq' ? n * n : n * n * n}</b></div>`;
    const note = RV.kind === 'tb' ? `Showing ${RV.tableBase === 'mixed' ? 'all tables 12–30' : 'the table of '+RV.tableBase}, multiplied by 1–${RV.tableLimit}.` : RV.kind === 'pr' ? '35 primes between 1 and 150.' : 'Scroll the chart, then switch to Practice.';
    return head + `<p class="quiet" style="margin:8px 0 12px">${note}</p><div class="refgrid ${RV.kind === 'tb' ? 'table-reference' : ''}">${cells}</div><div style="margin-top:14px"><button class="btn" data-act="revMode" data-v="practice">Start 15 questions</button></div>`;
  }
  if (RV.mode === 'flash') return head + `<div id="qzbox" style="margin-top:12px"></div>`;
  return head + `<div class="actions" style="margin:10px 0"><label class="check"><input type="checkbox" data-chg="mcq"${RV.mcq ? ' checked' : ''}>Multiple choice</label><button class="btn sm" data-act="qzStartRev">${QZ.qz ? 'New set' : 'Start 15 questions'}</button></div><div id="qz"></div>`;
}
function flashDraw() {
  const el = $('#qzbox'); if (!el || !FL) return; const q = FL.qs[FL.i];
  el.innerHTML = `<div class="label" style="margin-bottom:8px">Card ${FL.i + 1} of ${FL.qs.length}</div><button class="flash" data-act="flip" aria-live="polite"><span>${FL.show ? esc(q.show) : esc(q.t)}<small>${FL.show ? 'Answer' : 'Tap to reveal'}</small></span></button><div class="actions" style="margin-top:12px"><button class="btn" data-act="flashNext">${FL.i === FL.qs.length - 1 ? 'New cards' : 'Next card'}</button></div>`;
}
VIEWS.rev = function () {
  const mist = S.mist.slice(-12).reverse();
  return `${card("Today's checklist", `<div class="chips" id="rcheck" style="margin:0">${checklistHTML()}</div>${qrMissed() >= 1 ? `<p class="quiet" style="margin-top:10px">Missed days in a row before today: <b>${qrMissed()}</b></p>` : ''}`)}
  <div class="rgrid" style="margin-top:14px">${KINDS.map((o) => `<button class="rcard" data-act="revKind" data-v="${o.k}" aria-pressed="${RV.kind === o.k}"><span class="big">${o.big}</span><b>${o.name}</b><span class="quiet">${o.range} · 15 questions</span></button>`).join('')}<button class="rcard" data-act="nav" data-v="tricks"><span class="big">&times;</span><b>Maths tricks</b><span class="quiet">Diagrams, model questions and SSC methods</span></button></div>
  <div class="card" id="rpanel" style="margin-top:14px"${RV.kind ? '' : ' hidden'}>${revPanel()}</div>
  ${card('Mistakes notebook', mist.length ? `<div class="list">${mist.map((m) => `<div class="li"><div class="l"><b class="mono">${esc(m.q.replace(' = ?', ''))} = ${esc(m.a.replace(/^(Yes|No), /, ''))}</b><small>${fmtD(m.date)}</small></div><button class="mini del" data-act="delMist" data-id="${esc(m.id)}" aria-label="Remove">&times;</button></div>`).join('')}</div>` : '<p class="quiet">Wrong answers are saved here so you can revise them.</p>', ' style="margin-top:14px"')}`;
};
AFTER.rev = () => { if (RV.kind && RV.mode === 'practice' && QZ.qz) quizDraw('qz'); if (RV.kind && RV.mode === 'flash') { if (!FL || FL.kind !== RV.kind) flashNew(); flashDraw(); } };
function flashNew() { FL = { kind: RV.kind, qs: gen(RV.kind, 15), i: 0, show: false }; }

/* =============== Views: Revision log =============== */
const INTERVALS = [1, 3, 7, 15, 30];
function dueRevisions() {
  const first = {}; S.logs.forEach((l) => { const k = l.subj + '|' + l.topic.toLowerCase(); if (!first[k] || l.date < first[k].date) first[k] = { date: l.date, subj: l.subj, topic: l.topic }; });
  const t = today(), out = [];
  Object.keys(first).forEach((k) => {
    const f = first[k], n = S.rev.filter((r) => r.subj === f.subj && r.topic.toLowerCase() === f.topic.toLowerCase() && r.date > f.date).length;
    if (n < INTERVALS.length) { const due = addD(f.date, INTERVALS[n]); if (due <= t) out.push({ subj: f.subj, topic: f.topic, due, late: diff(due, t), step: INTERVALS[n] }); }
  });
  return out.sort((a, b) => b.late - a.late).slice(0, 12);
}
let revFilter = 'All';
VIEWS.revlog = function () {
  const due = dueRevisions(), rows = S.rev.filter((r) => revFilter === 'All' || r.subj === revFilter).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  const acc = {}; S.rev.forEach((r) => { if (r.q > 0) { const k = r.topic; acc[k] = acc[k] || { q: 0, c: 0 }; acc[k].q += r.q; acc[k].c += r.c; } });
  const weak = Object.entries(acc).filter((e) => e[1].q >= 10 && e[1].c / e[1].q < .6).map((e) => e[0]);
  return `<div class="grid g2">
  ${card('Due for revision', due.length ? `<div class="list">${due.map((d) => `<div class="li"><div class="l"><b>${esc(d.subj)}</b> · ${esc(d.topic)}<small>Day ${d.step} revision · ${d.late > 0 ? d.late + ' days late' : 'due today'}</small></div><button class="btn sm" data-act="addRev" data-subj="${esc(d.subj)}" data-topic="${esc(d.topic)}">Log</button></div>`).join('')}</div>` : '<div class="empty"><b>Nothing due</b>Topics you study come back after 1, 3, 7, 15 and 30 days.</div>')}
  ${card('Weak topics', weak.length ? `<div class="chips" style="margin:0">${weak.map((w) => `<span class="chip"><i class="dot r"></i>${esc(w)}</span>`).join('')}</div><p class="quiet" style="margin-top:8px">Accuracy below 60% over at least 10 questions.</p>` : '<p class="quiet">No weak topics yet. Log revisions with questions and correct answers to see them here.</p>')}
  </div>
  <div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px"><h3 style="margin:0">Revision log</h3><div class="actions"><select class="inp" style="width:auto" id="rf" data-chg="revFilter" aria-label="Filter by subject">${['All'].concat(SUBJECTS).map((s) => `<option${s === revFilter ? ' selected' : ''}>${s}</option>`).join('')}</select><button class="btn sm" data-act="addRev">Log revision</button></div></div>
  ${rows.length ? `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Subject</th><th>Topic</th><th>Time</th><th>Questions</th><th>Accuracy</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td class="n">${fmtD(r.date)}</td><td>${esc(r.subj)}</td><td>${esc(r.topic)}</td><td class="n">${esc(r.min)} min</td><td class="n">${esc(r.q)}</td><td class="n">${r.q ? Math.round(r.c / r.q * 100) + '%' : '-'}</td><td><button class="mini del" data-act="delRev" data-id="${esc(r.id)}" aria-label="Delete">&times;</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>No revisions logged</b>Log which day, which topic, how much time and how many questions.</div>'}</div>`;
};

/* =============== Views: Reports =============== */
let REP = { mode: 'day', date: null };
function dayRows(D) {
  const rows = [], t = today();
  S.tasks.filter((k) => k.orig === D).forEach((k) => {
    let st, cls;
    if (k.done) { st = k.doneDate === D ? 'Achieved' : 'Done ' + fmtD(k.doneDate); cls = 'green'; } else if (k.spent > 0) { st = 'Partial'; cls = 'amber'; } else { st = D === t ? 'Pending' : 'Missed'; cls = D === t ? 'amber' : 'red'; }
    rows.push({ subj: k.subj, topic: k.topic, plan: k.plan, ach: k.spent, st, cls, next: k.done ? 'none' : '+' + (k.plan - k.spent) + ' min' });
  });
  S.tasks.filter((k) => k.done && k.doneDate === D && k.orig < D).forEach((k) => rows.push({ subj: k.subj, topic: k.topic, plan: 0, ach: k.plan, st: 'Carried in ' + diff(k.orig, D) + 'd', cls: 'amber', next: 'none' }));
  const free = S.logs.filter((l) => l.date === D && !l.task);
  if (free.length) { const g = {}; free.forEach((l) => { const k = l.subj + '|' + l.topic; g[k] = g[k] || { subj: l.subj, topic: l.topic, m: 0 }; g[k].m += l.min; }); Object.values(g).forEach((x) => rows.push({ subj: x.subj, topic: x.topic, plan: 0, ach: x.m, st: 'Extra study', cls: 'green', next: 'none' })); }
  return rows;
}
VIEWS.rep = function () {
  const t = today(); if (!REP.date) REP.date = t;
  const dayBtns = Array.from({ length: 7 }, (_, i) => addD(t, -i)).map((d) => `<button data-act="repDate" data-v="${d}" aria-pressed="${REP.mode === 'day' && REP.date === d}">${WD[parseD(d).getDay()]} ${parseD(d).getDate()}<small>${d === t ? 'Today' : diff(d, t) === 1 ? 'Yesterday' : diff(d, t) + ' days ago'}</small></button>`).join('');
  const seg = `<div class="seg noprint" style="margin-bottom:14px">${[['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map((m) => `<button data-act="repMode" data-v="${m[0]}" aria-pressed="${REP.mode === m[0]}">${m[1]}</button>`).join('')}</div> <button class="btn sm ghost noprint" data-act="print" style="margin-left:8px;vertical-align:top">Print or save as PDF</button>`;
  if (REP.mode === 'day') {
    const D = REP.date, rows = dayRows(D), P = sum(rows, (r) => r.plan), A = sum(S.logs.filter((l) => l.date === D), (l) => l.min), C = sum(S.tasks.filter((k) => k.orig === D && !k.done), (k) => k.plan - k.spent), ex = daySpend(D);
    return `${seg}<div class="days">${dayBtns}</div>
    <div class="stats" style="margin-bottom:14px"><div class="stat"><span class="label">Planned</span><b>${hrs(P)} h</b></div><div class="stat"><span class="label">Studied</span><b>${hrs(A)} h</b><small>${P ? Math.round(Math.min(A, P * 2) / P * 100) + '% of plan' : 'no plan set'}</small></div><div class="stat"><span class="label">Carried forward</span><b>${C} min</b></div><div class="stat"><span class="label">Spent</span><b>${inr(ex)}</b></div></div>
    ${card('Timetable report: ' + longD(D), rows.length ? `<div class="tablewrap"><table><thead><tr><th>Subject</th><th>Topic</th><th>Planned</th><th>Achieved</th><th>Status</th><th>Next day</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${esc(r.subj)}</b></td><td>${esc(r.topic)}</td><td class="n">${r.plan} min</td><td class="n">${r.ach} min</td><td><span class="badge ${r.cls}">${esc(r.st)}</span></td><td class="n">${r.next}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>Nothing recorded for this day</b></div>')}`;
  }
  const n = REP.mode === 'week' ? 7 : 30, days = Array.from({ length: n }, (_, i) => addD(t, -i)), by = minutesByDate();
  const rows = days.map((d) => { const pl = S.tasks.filter((k) => k.orig === d), dn = pl.filter((k) => k.done).length; return { d, h: (by[d] || 0), pl: pl.length, dn, ex: daySpend(d) }; });
  const tot = sum(rows, (r) => r.h), sj = {}; S.logs.filter((l) => l.date > addD(t, -n)).forEach((l) => { sj[l.subj] = (sj[l.subj] || 0) + l.min; });
  const ent = Object.entries(sj).sort((a, b) => b[1] - a[1]), planned = sum(rows, (r) => r.pl), dn = sum(rows, (r) => r.dn);
  const summary = tot ? `${REP.mode === 'week' ? 'This week' : 'This month'} you studied ${hrs(tot)} hours${ent.length ? ', most on ' + ent[0][0] : ''}${ent.length > 1 ? ', least on ' + ent[ent.length - 1][0] : ''}. You finished ${dn} of ${planned} planned tasks${planned ? ' (' + Math.round(dn / planned * 100) + '%)' : ''}.` : 'No study logged in this period yet.';
  return `${seg}${card('Summary', `<p style="font-size:16px">${esc(summary)}</p>`)}
  <div class="card" style="margin-top:14px"><h3>Day by day</h3><div class="tablewrap"><table><thead><tr><th>Date</th><th>Studied</th><th>Tasks done</th><th>Spent</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="n">${WD[parseD(r.d).getDay()]} ${fmtD(r.d)}</td><td class="n">${hrs(r.h)} h</td><td class="n">${r.dn} / ${r.pl}</td><td class="n">${inr(r.ex)}</td></tr>`).join('')}</tbody></table></div></div>`;
};

/* =============== Views: SSC Plan =============== */
function parseDateStr(s) {
  s = String(s || '').trim(); let m;
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) return m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]);
  return '';
}
function splitLine(line) {
  const sep = line.includes('\t') ? '\t' : ','; const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (c === sep && !q) { out.push(cur.trim()); cur = ''; } else cur += c; }
  out.push(cur.trim()); return out;
}
function lessonTopics(topic) {
  // A comma followed by words or an ampersand starts a new topic group.
  return topic.split(/(?<=\d)\s*&\s*|,\s*(?=[A-Za-z])/).flatMap(part => {
    const match = part.trim().match(/^(.*?)\s+(\d+(?:\s*,\s*\d+)*)$/);
    if (!match) return part.trim() ? [part.trim()] : [];
    return [...new Set(match[2].split(',').map(n => match[1] + ' ' + n.trim()))];
  });
}
function splitPlanLessons() {
  const expanded = [], mappings = new Map();
  S.plan.forEach(row => {
    const topics = lessonTopics(row.topic);
    if (topics.length < 2) { expanded.push(row); return; }
    const key = row.date + '|' + row.subj + '|' + row.topic;
    const parent = S.tasks.find(k => k.pk === key);
    let remaining = parent ? parent.spent : 0;
    const children = topics.map((topic, i) => {
      const min = parent?.done ? Math.floor(row.min / topics.length) + (i < row.min % topics.length ? 1 : 0) : lessonMinutes(S);
      expanded.push({ ...row, topic, min });
      if (!parent) return null;
      const spent = Math.min(min, remaining); remaining -= spent;
      return { ...parent, id: uid(), pk: row.date + '|' + row.subj + '|' + topic, topic, plan: min, spent, done: spent >= min, doneDate: spent >= min ? parent.doneDate || today() : null };
    }).filter(Boolean);
    if (parent) mappings.set(parent.id, children);
  });
  if (!mappings.size && expanded.length === S.plan.length) return 0;
  S.plan = expanded;
  S.tasks = S.tasks.flatMap(task => mappings.get(task.id) || [task]);
  // Keep total study minutes and spread historical credit across the new tasks.
  const capacity = new Map([...mappings.values()].flat().map(k => [k.id, k.spent]));
  S.logs = S.logs.flatMap(log => {
    const children = mappings.get(log.task); if (!children) return [log];
    let remaining = log.min;
    const result = [];
    children.forEach(child => {
      const credit = Math.min(remaining, capacity.get(child.id));
      if (!credit) return;
      result.push({ ...log, id: uid(), task: child.id, topic: child.topic, min: credit, credit });
      capacity.set(child.id, capacity.get(child.id) - credit); remaining -= credit;
    });
    if (remaining) result.push({ ...log, id: uid(), task: null, min: remaining, credit: 0 });
    return result;
  });
  persist(); genPlan(); return expanded.length;
}
function importPlan(text, skipPast) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean); if (!lines.length) return 0;
  let start = 0; if (/day|subject|topic/i.test(lines[0]) && !/^\d/.test(lines[0])) start = 1;
  const rows = []; let day1 = S.settings.day1, auto = 0;
  for (let i = start; i < lines.length; i++) {
    const c = splitLine(lines[i]); if (c.length < 3) continue;
    const day = parseInt(c[0], 10); const date = parseDateStr(c[1]); const subj = c[2], topic = c[3] || c[2], h = parseFloat(c[4]);
    if (!subj) continue;
    if(c[0] && (!Number.isInteger(Number(c[0])) || Number(c[0])<1) || c[1] && (!date || !validStudyDate(date)) || c[4] && (!Number.isFinite(Number(c[4])) || Number(c[4])<=0)) throw new Error('Invalid day, date or study hours at CSV row '+(i+1)+'.');
    rows.push({ day: isNaN(day) ? ++auto : day, date, subj, topic, min: Math.round((isNaN(h) ? 1 : h) * 60) });
  }
  if (!rows.length) return 0;
  if (rows.some((r) => !r.date)) { if (!day1) day1 = today(); rows.forEach((r) => { if (!r.date) r.date = addD(day1, r.day - 1); }); S.settings.day1 = day1; }
  validatePlanRows(rows);
  S.plan = rows.sort((a, b) => a.date.localeCompare(b.date) || a.day - b.day);
  S.planFrom = skipPast ? today() : ''; splitPlanLessons(); persist(); genPlan(); return S.plan.length;
}
VIEWS.plan = function () {
  const t = today(), has = S.plan.length;
  const total = has ? Math.max(...S.plan.map((r) => r.day)) : 0, cur = has ? Math.max(0, ...S.plan.filter((r) => r.date <= t).map((r) => r.day)) : 0;
  const next = S.plan.filter((r) => r.date >= t).slice(0, 14);
  return `<div class="card" style="margin-bottom:14px"><h3>Time per plan topic</h3><label class="label" for="planLessonMinutes">Lesson duration</label><select class="inp" id="planLessonMinutes" data-chg="lessonDuration"><option value="60" ${lessonMinutes(S)===60?'selected':''}>60 minutes per topic</option><option value="45" ${lessonMinutes(S)===45?'selected':''}>45 minutes per topic</option></select><p class="quiet">Applies to every unfinished and future plan lesson, including each numbered lesson. Completed lessons and actual study logs keep their history. Daily planned hours, gaps and the daily catch-up target update to match.</p></div><div class="grid g2">
  ${card('Your plan', has ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="label">Progress</span><span class="mono">Day ${cur} / ${total}</span></div><div class="bar warnbar"><i style="width:${Math.round(cur / total * 100)}%"></i></div><p class="quiet" style="margin-top:10px">${S.plan.length} plan lines from ${fmtD(S.plan[0].date)} to ${fmtD(S.plan[S.plan.length - 1].date)}. Each day's lines appear in Today's schedule automatically.</p><div class="actions" style="margin-top:12px"><button class="btn sm" data-act="splitLessons">Separate numbered lessons</button><button class="btn sm ghost" data-act="skipToday">Skip today (push plan by 1 day)</button><button class="btn sm ghost" data-act="clearPlan">Remove plan</button></div>` : '<div class="empty"><b>No plan yet</b>Upload your 200-day strategy as a CSV file, or paste it on the right.</div>')}
  ${card('Upload or paste', `<p class="quiet" style="margin-bottom:10px">Columns: Day, Date, Subject, Topic, Planned Hours, Notes. Date is optional if you set Day 1 below. From Excel, use Save As CSV.</p>
  <div class="setrow"><label class="label" for="pfile">CSV file</label><input class="inp" type="file" id="pfile" accept=".csv,.txt,text/csv,text/plain" data-chg="planFile"></div>
  <div class="setrow"><label class="label" for="ptext">Or paste here</label><textarea class="inp" id="ptext" placeholder="1,2026-10-13,Quant,Percentage,2,Basics&#10;1,2026-10-13,Reasoning,Syllogism,1,"></textarea></div>
  <div class="setrow"><label class="label" for="pday1">Day 1 date (used when the file has no dates)</label><input class="inp" type="date" id="pday1" value="${esc(S.settings.day1 || t)}"></div>
  <label class="check" style="margin-bottom:12px"><input type="checkbox" id="pskip" checked>Skip days before today (do not create overdue tasks)</label>
  <p class="quiet">Your PDF timetable covers Days 1–190. Numbered lessons become separate tasks. Each numbered lesson gets the selected 45 or 60 minutes; group time is not divided between lessons. CSV hours are replaced by this setting for unfinished and future lessons. Days 191–200 were not included in the PDF.</p><div class="actions"><button class="btn" data-act="loadTimetable">Load my timetable</button><a class="btn ghost" href="my-timetable.csv" download>Download my timetable CSV</a></div><div class="actions"><button class="btn" data-act="planPaste">Import</button><button class="btn ghost" data-act="sampleCsv">Download sample CSV</button></div><div class="err" id="perr" style="color:var(--good)"></div>`)}
  </div>
  ${has ? card('Coming up', `<div class="tablewrap"><table><thead><tr><th>Day</th><th>Date</th><th>Subject</th><th>Topic</th><th>Hours</th></tr></thead><tbody>${next.map((r) => `<tr><td class="n">${esc(r.day)}</td><td class="n">${fmtD(r.date)}</td><td>${esc(r.subj)}</td><td>${esc(r.topic)}</td><td class="n">${(r.min / 60).toFixed(1)}</td></tr>`).join('')}</tbody></table></div>`, ' style="margin-top:14px"') : ''}`;
};

/* =============== Views: Tricks =============== */
const TRICKS = [
  { lv: 1, title: 'Basics', sub: 'Skip counting, ×2, ×4, ×5, ×10, ×11', items: [
    ['Double and double again', '×4 is double twice. 37 × 4: 37 → 74 → 148.'],
    ['×5 is ×10 then halve', '46 × 5: 460 ÷ 2 = 230.'],
    ['×11 for two digits', 'Write the first digit, add the two digits in the middle, write the last digit. 35 × 11 = 3 (3+5) 5 = 385. If the middle sum is 10 or more, carry 1 to the left: 78 × 11 = 7 (15) 8 → 858.']] },
  { lv: 2, title: 'Shortcuts', sub: '×9, ×99, ×25, ×125, double and halve', items: [
    ['×9 and ×99', '×9 = ×10 minus the number: 47 × 9 = 470 − 47 = 423. ×99 = ×100 minus the number: 36 × 99 = 3600 − 36 = 3564.'],
    ['×25, ×50, ×125', '×25 = ×100 ÷ 4: 36 × 25 = 3600 ÷ 4 = 900. ×50 = ×100 ÷ 2. ×125 = ×1000 ÷ 8: 48 × 125 = 48000 ÷ 8 = 6000.'],
    ['Double and halve', 'Double one number, halve the other. 14 × 15 = 7 × 30 = 210.']] },
  { lv: 3, title: 'Base method', sub: 'Squares ending in 5, near 100, (a+b)(a−b)', items: [
    ['Squares ending in 5', 'Take the tens digit n, multiply by n+1, then write 25. 75²: 7 × 8 = 56, so 5625.'],
    ['Numbers near 100', 'Find how far each number is below 100, cross-subtract, multiply the gaps. 97 × 94: gaps 3 and 6; 97 − 6 = 91; 3 × 6 = 18; answer 9118. Use the live demo on this page.'],
    ['Difference of squares', '(a+b)(a−b) = a² − b². 52 × 48 = 50² − 2² = 2500 − 4 = 2496.'],
    ['Expanding squares', '103² = 100² + 2×100×3 + 3² = 10000 + 600 + 9 = 10609.']] },
  { lv: 4, title: 'Vedic maths', sub: 'Criss-cross, Nikhilam, digit-sum checks', items: [
    ['Criss-cross (two digits)', 'For ab × cd: first column a×c, middle b×c + a×d, last b×d. 23 × 14: 2 | 8+3=11 | 12. Place values: 200 + 110 + 12 = 322.'],
    ['Three digits', 'The same idea with five columns: left-left, then two cross terms, then three cross terms, two cross terms, right-right. Add the columns with carries from the right.'],
    ['Check with digit sums', 'Add the digits until one digit is left. The digit sum of the product must equal the digit sum of the two digit sums multiplied. 23 × 14 = 322: (5 × 5 = 25 → 7) and 3+2+2 = 7. They match, but matching digit sums cannot prove correctness.']] },
  { lv: 5, title: 'SSC speed', sub: 'Approximation, simplification, percentage', items: [
    ['Near-round numbers', '49 × 51 = 50² − 1 = 2499. 998 × 1002 = 1000² − 4 = 999996.'],
    ['Percentages as fractions', '12.5% = 1/8, 16⅔% = 1/6, 33⅓% = 1/3 (16.67% and 33.33% are rounded approximations), 37.5% = 3/8, 62.5% = 5/8, 6.25% = 1/16. 37.5% of 640 = 3 × 80 = 240.'],
    ['Simplification order', 'Brackets, orders, division and multiplication left to right, then addition and subtraction. Spot identities before multiplying large numbers.']] }
];
for (const method of MASTERCLASS_ADDITIONS) TRICKS.find(level => level.lv === method.level).items.push([method.title,method.text]);
const masterclassLevelNames = ['Foundations', 'Special multipliers', 'Number patterns', 'Advanced multiplication', 'SSC speed training'];
const masterclassLevelDescriptions = ['Splitting, left-to-right, doubling and halving', 'Special multipliers from ×5 through ×1001', 'Near100/1000, squares and complementary units', 'Compensation, factorization, crosswise and chunking', 'Estimation, squares, fractions and method selection'];
TRICKS.forEach((level,i) => { level.title = masterclassLevelNames[i]; level.sub = masterclassLevelDescriptions[i]; });
const dr = (n) => (n % 9 === 0 ? 9 : n % 9);
VIEWS.tricks = function () {
  const m = TRICKS.filter((x) => S.mastered[x.lv]).length;
  return `${masterclassIntro(S.masterclassDays || [])}<div class="grid g2"><div class="card"><h3>Numbers near 100</h3><p class="quiet" style="margin-bottom:12px">Pick two numbers between 80 and 99 and watch the method run.</p>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input id="n1" class="num" type="text" inputmode="numeric" value="97" aria-label="First number"><span class="mono" style="font-size:22px">&times;</span><input id="n2" class="num" type="text" inputmode="numeric" value="94" aria-label="Second number"><button class="btn" data-act="runTrick">Show steps</button></div><div class="steps" id="steps"></div></div>
  <div class="card"><h3>Your progress</h3><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="label">Multiplication levels mastered</span><span class="mono">${m} / 5</span></div><div class="bar"><i style="width:${m * 20}%"></i></div><p class="quiet" style="margin-top:12px">Open a level, read the tricks, try the 5 practice questions, then tick Mastered.</p></div></div>
  <div style="margin-top:14px">${TRICKS.map((x) => `<details class="lv" data-level="${x.lv}"><summary><span class="lvnum">${x.lv}</span><span style="flex:1"><b>${x.title}</b><br><span class="quiet" style="font-weight:400">${x.sub}</span></span>${S.mastered[x.lv] ? '<span class="badge green">Mastered</span>' : ''}</summary><div class="body">${x.items.map((i) => `<div class="t"><b>${i[0]}</b>${i[1]}${trickVisual(i[0])}${mergedExampleHTML(i[0])}</div>`).join('')}<div id="tq${x.lv}"></div><div class="actions"><button class="btn sm" data-act="trickQuiz" data-v="${x.lv}">Try 5 questions</button><button class="btn sm ghost" data-act="mastered" data-v="${x.lv}">${S.mastered[x.lv] ? 'Unmark mastered' : 'Mark as mastered'}</button></div></div></details>`).join('')}</div>${masterclassResources(S.masterclassDays || [])}${sscMathHTML(S.mastered)}`;
};
AFTER.tricks = runTrick;
function runTrick() {
  const a1 = $('#n1'), box = $('#steps'); if (!a1 || !box) return;
  const x = Number(a1.value), y = Number($('#n2').value);
  if (!(Number.isInteger(x) && Number.isInteger(y) && x >= 80 && x <= 99 && y >= 80 && y <= 99)) { box.innerHTML = '<div class="step" style="--k:0;background:var(--bad-bg);color:var(--bad)"><div>Enter two whole numbers between 80 and 99.</div></div>'; return; }
  const a = 100 - x, b = 100 - y; let left = x - b, prod = a * b, right = prod, note = '';
  if (prod >= 100) { left += Math.floor(prod / 100); right = prod % 100; note = ' The product has 3 digits, so carry ' + Math.floor(prod / 100) + ' to the left part.'; }
  const res = left * 100 + right, S5 = [
    `<b>${x}</b> is <b>${a}</b> below 100 and <b>${y}</b> is <b>${b}</b> below 100.`,
    `Cross-subtract: <b>${x} &minus; ${b} = ${x - b}</b> (same as ${y} &minus; ${a} = ${y - a}). This is the left part.`,
    `Multiply the gaps: <b>${a} &times; ${b} = ${prod}</b>. This is the right part, kept to two digits.${note}`,
    `Join them: <b>${left}</b> | <b>${pad(right)}</b>`,
    `Check with digit sums: ${dr(x)} &times; ${dr(y)} gives digit sum ${dr(dr(x) * dr(y))}, and ${res} has digit sum ${dr(res)}. ${dr(dr(x) * dr(y)) === dr(res) ? 'They match. This is a useful check, not proof.' : 'They differ, recheck.'}`
  ];
  box.innerHTML = S5.map((s, i) => `<div class="step" style="--k:${i}"><i>${i + 1}</i><div>${s}</div></div>`).join('') + `<div class="step" style="--k:${S5.length};background:transparent;padding:4px 0"><div><span class="quiet">Answer</span><div class="answer">${x} &times; ${y} = ${res}</div></div></div>`;
}

/* =============== Views: Money & Meetings =============== */
VIEWS.money = function () {
  const t = today(), mkey = t.slice(0, 7), mo = S.exp.filter((e) => e.date.startsWith(mkey)).sort((a, b) => b.date.localeCompare(a.date)), tot = sum(mo, (e) => e.amt) + monthCanteen(mkey), bud = +S.settings.budget || 0;
  const cat = {}; mo.forEach((e) => { cat[e.cat] = (cat[e.cat] || 0) + e.amt; }); if (monthCanteen(mkey)) cat['DHANAM Canteen'] = monthCanteen(mkey);
  const meets = S.meet.filter((m) => m.date >= addD(t, -1)).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  return `<div class="grid g2">
  ${card('This month', `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="label">Spent</span><span class="mono">${inr(tot)}${bud ? ' / ' + inr(bud) : ''}</span></div>${bud ? `<div class="bar ${tot > bud ? 'bad' : ''}"><i style="width:${Math.min(100, Math.round(tot / bud * 100))}%"></i></div>${tot > bud ? '<p style="color:var(--bad);margin-top:8px;font-weight:600">Over budget by ' + inr(tot - bud) + '</p>' : ''}` : '<p class="quiet">Set a monthly budget in Settings.</p>'}<div style="margin-top:16px">${Object.keys(cat).length ? donutSVG(Object.entries(cat).sort((a, b) => b[1] - a[1])) : '<p class="quiet">No expenses this month.</p>'}</div><div class="actions" style="margin-top:14px"><button class="btn sm" data-act="addExp">Add expense</button></div>`)}
  ${card('Meetings', `<div class="list">${meets.map((m) => `<div class="li"><div class="l"><b>${esc(m.title)}</b>${m.who ? ' with ' + esc(m.who) : ''}<small>${fmtD(m.date)} ${esc(m.time || '')}${m.notes ? ' · ' + esc(m.notes) : ''}</small></div><div class="actions"><button class="mini" data-act="toggleMeet" data-id="${esc(m.id)}" aria-label="Toggle done">${m.done ? 'Done' : 'Mark'}</button><button class="mini del" data-act="delMeet" data-id="${esc(m.id)}" aria-label="Delete">&times;</button></div></div>`).join('') || '<div class="empty"><b>No meetings</b>Add your mentor sessions and doubt classes.</div>'}</div><div class="actions" style="margin-top:14px"><button class="btn sm" data-act="addMeet">Add meeting</button></div>`)}
  </div>
  <div class="card" style="margin-top:14px"><h3>Expenses this month</h3>${mo.length ? `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Mode</th><th>Amount</th><th></th></tr></thead><tbody>${mo.map((e) => `<tr><td class="n">${fmtD(e.date)}</td><td>${esc(e.cat)}</td><td>${esc(e.note || '')}</td><td>${esc(e.mode || '')}</td><td class="n">${inr(e.amt)}</td><td><button class="mini del" data-act="delExp" data-id="${esc(e.id)}" aria-label="Delete">&times;</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>No expenses yet</b></div>'}</div>`;
};

/* =============== Views: Mock tests =============== */
VIEWS.mocks = function () {
  const ms = S.mocks.slice().sort((a, b) => a.date.localeCompare(b.date)), pct = ms.map((m) => Math.round(m.score / m.max * 100));
  const chart = ms.length > 1 ? lineSVG(pct, ms.map((m, i) => (i % Math.ceil(ms.length / 6) === 0 || i === ms.length - 1 ? fmtD(m.date) : '')), { max: 100, step: 25, trend: true, aria: 'Mock test score percentage' }) : '<p class="quiet">Log at least two mock tests to see the trend.</p>';
  return `${card('CGL section analysis', '<p class="quiet">Track negative marks, skipped questions, section accuracy and weak topics.</p><button class="btn sm" data-act="nav" data-v="mockAnalysis">Open CGL Mock Analysis</button>')}${card('Score trend (percent)', chart + (ms.length ? `<p class="quiet" style="margin-top:8px">Best ${Math.max(...pct)}% · Latest ${pct[pct.length - 1]}% · Average ${Math.round(sum(pct) / pct.length)}%</p>` : ''))}
  <div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">Mock test log</h3><button class="btn sm" data-act="addMock">Log mock test</button></div>${ms.length ? `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Test</th><th>Score</th><th>Percent</th><th>Time</th><th>Notes</th><th></th></tr></thead><tbody>${ms.slice().reverse().map((m) => `<tr><td class="n">${fmtD(m.date)}</td><td>${esc(m.name)}</td><td class="n">${esc(m.score)} / ${esc(m.max)}</td><td class="n">${Math.round(m.score / m.max * 100)}%</td><td class="n">${m.mins ? m.mins + ' min' : '-'}</td><td>${esc(m.notes || '')}</td><td><button class="mini del" data-act="delMock" data-id="${esc(m.id)}" aria-label="Delete">&times;</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>No mock tests yet</b>Write what went wrong in the notes column. It becomes your revision list.</div>'}</div>`;
};

/* =============== Views: Notes, formulas, words =============== */
const WORDS = [
  ['Benevolent', 'Kind and generous'], ['Candid', 'Open and honest'], ['Diligent', 'Careful and hard-working'], ['Eloquent', 'Fluent and persuasive in speech'], ['Frugal', 'Careful with money'],
  ['Gregarious', 'Fond of company'], ['Hostile', 'Unfriendly, opposed'], ['Impartial', 'Treating all sides equally'], ['Jubilant', 'Feeling great joy'], ['Lucid', 'Clear and easy to understand'],
  ['Meticulous', 'Very careful about detail'], ['Nostalgia', 'Longing for the past'], ['Obsolete', 'No longer in use'], ['Pragmatic', 'Practical rather than theoretical'], ['Resilient', 'Able to recover quickly'],
  ['Scrupulous', 'Very honest and careful'], ['Tenacious', 'Holding firmly, not giving up'], ['Unanimous', 'Agreed by everyone'], ['Verbose', 'Using more words than needed'], ['Zealous', 'Full of eager enthusiasm']
];
VIEWS.notes = function () {
  const off = parseD(today()).getDate() % 2 * 10, words = WORDS.slice(off, off + 10);
  return `<div class="grid g2">
  ${card('Notes (current affairs and quick points)', `<div class="actions" style="margin-bottom:12px"><button class="btn sm" data-act="addNote">Add note</button></div><div class="list">${S.notes.slice().reverse().slice(0, 30).map((n) => `<div class="li"><div class="l"><b>${esc(n.tag || 'Note')}</b> <span class="quiet">${fmtD(n.date)}</span><div>${esc(n.text)}</div></div><button class="mini del" data-act="delNote" data-id="${esc(n.id)}" aria-label="Delete">&times;</button></div>`).join('') || '<div class="empty"><b>No notes yet</b>Add today\'s current affairs or a point you keep forgetting.</div>'}</div>`)}
  ${card('Ten words today', `<div class="list">${words.map((w) => `<div class="li"><div class="l"><b>${w[0]}</b><small>${w[1]}</small></div></div>`).join('')}</div>`)}
  </div>
`;
};

/* =============== Views: DHANAM Canteen =============== */
function cMonthHTML() {
  const d = CD, key = d.slice(0, 7), days = S.canteen.days;
  const ds = Object.keys(days).filter((x) => x.startsWith(key) && cTotal(x) > 0).sort();
  const tot = sum(ds, cTotal), cnt = { mt: 0, at: 0, sn: 0, ln: 0 };
  ds.forEach((x) => CITEMS.forEach((c) => { cnt[c[0]] += days[x][c[0]] || 0; }));
  const ym = key.split('-').map(Number), dim = new Date(ym[0], ym[1], 0).getDate(), t = today(), vals = [], labs = [];
  for (let i = 1; i <= dim; i++) { const dd = key + '-' + pad(i); vals.push(dd <= t ? cTotal(dd) : 0); labs.push(i % 5 === 1 ? String(i) : ''); }
  const avg = ds.length ? tot / ds.length : 0;
  return `<div class="stats" style="margin-bottom:14px"><div class="stat"><span class="label">Month total</span><b>${inr(tot)}</b><small>${MON[ym[1] - 1]} ${ym[0]}</small></div><div class="stat"><span class="label">Days eaten</span><b>${ds.length}</b><small>${inr(avg)} per day</small></div><div class="stat"><span class="label">Teas</span><b>${cnt.mt + cnt.at}</b><small>${inr((cnt.mt + cnt.at) * S.canteen.prices.tea)} at today's price</small></div><div class="stat"><span class="label">Lunches</span><b>${cnt.ln}</b><small>${cnt.sn} snacks</small></div></div>
  ${barsSVG(vals, labs, 'Canteen spending per day this month')}
  ${ds.length ? `<div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Date</th><th>Morning tea</th><th>Afternoon tea</th><th>Snacks</th><th>Lunch</th><th>Total</th></tr></thead><tbody>${ds.slice().reverse().map((x) => `<tr><td class="n">${WD[parseD(x).getDay()]} ${fmtD(x)}</td><td class="n">${days[x].mt || 0}</td><td class="n">${days[x].at || 0}</td><td class="n">${days[x].sn || 0}</td><td class="n">${days[x].ln || 0}</td><td class="n"><b>${inr(cTotal(x))}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="quiet" style="margin-top:10px">Nothing recorded this month yet.</p>'}`;
}
VIEWS.canteen = function () {
  const t = today(); if (!CD) CD = t;
  const d = CD, r = cRec(d), p = cPrices(d);
  const items = CITEMS.map((c) => `<div class="citem"><div><b>${c[1]}</b><br><span class="quiet">${inr(p[c[2]])} each</span></div><div class="stepper"><button class="mini" data-act="cMinus" data-k="${c[0]}" aria-label="One less ${c[1]}">&minus;</button><input class="cnum mono" id="c_${c[0]}" type="number" min="0" max="20" inputmode="numeric" value="${r[c[0]] || 0}" data-inp="canteen" data-chg="canteenFix" data-k="${c[0]}" aria-label="${c[1]} count"><button class="mini" data-act="cPlus" data-k="${c[0]}" aria-label="One more ${c[1]}">+</button></div><div class="camt mono" id="ca_${c[0]}">${inr((r[c[0]] || 0) * p[c[2]])}</div></div>`).join('');
  return `<div class="grid g2">
  <div class="card"><div class="actions noprint" style="margin-bottom:14px"><button class="btn sm ghost" data-act="cDate" data-v="-1">Previous day</button><input class="inp" style="width:auto" type="date" id="cdate" value="${d}" data-chg="cDatePick" aria-label="Choose date"><button class="btn sm ghost" data-act="cDate" data-v="1">Next day</button>${d !== t ? '<button class="btn sm" data-act="cDate" data-v="today">Today</button>' : ''}</div>
    <h3>DHANAM Canteen, ${longD(d)}</h3>${items}
    <div class="ctotal"><span class="label">Total for this day</span><b class="mono" id="ctotal">${inr(cTotal(d))}</b></div></div>
  <div class="card"><h3>Prices</h3><p class="quiet" style="margin-bottom:12px">Type how many you had. The amount is worked out for you. A price change applies from the day you are viewing onward; earlier days keep the price they had.</p>
    <div class="setgrid"><div class="setrow"><label class="label" for="pr_tea">Tea (&#8377;)</label><input class="inp" id="pr_tea" type="number" min="0" value="${S.canteen.prices.tea}" data-chg="cPrice" data-k="tea"></div><div class="setrow"><label class="label" for="pr_snack">Snack (&#8377;)</label><input class="inp" id="pr_snack" type="number" min="0" value="${S.canteen.prices.snack}" data-chg="cPrice" data-k="snack"></div><div class="setrow"><label class="label" for="pr_lunch">Lunch (&#8377;)</label><input class="inp" id="pr_lunch" type="number" min="0" value="${S.canteen.prices.lunch}" data-chg="cPrice" data-k="lunch"></div></div>
    <p class="quiet">Canteen spending is included in Home, Money and Reports totals.</p></div></div>
  <div class="card" style="margin-top:14px"><h3>This month</h3><div id="cmonth">${cMonthHTML()}</div></div>`;
};
function setC(k, v) {
  const d = CD || today(); v = Math.max(0, Math.min(20, Math.round(v) || 0));
  let r = S.canteen.days[d]; if (!r) { r = { mt: 0, at: 0, sn: 0, ln: 0, p: Object.assign({}, S.canteen.prices) }; S.canteen.days[d] = r; }
  r[k] = v; persist();
}
function refreshCanteen() {
  const d = CD || today(), r = cRec(d), p = cPrices(d);
  CITEMS.forEach((c) => { const a = $('#ca_' + c[0]); if (a) a.textContent = inr((r[c[0]] || 0) * p[c[2]]); const i = $('#c_' + c[0]); if (i && document.activeElement !== i) i.value = r[c[0]] || 0; });
  const tt = $('#ctotal'); if (tt) tt.textContent = inr(cTotal(d)); const m = $('#cmonth'); if (m) m.innerHTML = cMonthHTML();
}

/* =============== Views: To-Do cards =============== */
const PRI = { High: 0, Normal: 1, Low: 2 };
function todoSort(a, b) { const da = a.due || '9999-12-31', db = b.due || '9999-12-31'; return da.localeCompare(db) || (PRI[a.pri] - PRI[b.pri]) || a.created.localeCompare(b.created); }
function ageText(x) { const n = diff(x.created, today()); return n <= 0 ? 'Added today' : n === 1 ? 'Added yesterday' : 'Added ' + n + ' days ago'; }
function gapText(x) {
  const t = today();
  if (x.done) {
    const took = diff(x.created, x.doneDate || t), late = x.due ? diff(x.due, x.doneDate || t) : 0;
    return { txt: (took <= 0 ? 'Finished the same day' : 'Finished in ' + took + ' days') + (x.due ? (late > 0 ? ', ' + late + ' days late' : ', on time') : ''), short: late > 0 ? 'Late' : 'Done', cls: late > 0 ? 'amber' : 'green' };
  }
  if (!x.due) return { txt: 'No due date', short: 'No date', cls: '' };
  const n = diff(t, x.due);
  if (n < 0) return { txt: 'Overdue by ' + (-n) + (n === -1 ? ' day' : ' days'), short: 'Late ' + (-n) + ' d', cls: 'red' };
  if (n === 0) return { txt: 'Due today', short: 'Today', cls: 'amber' };
  return { txt: 'Due in ' + n + (n === 1 ? ' day' : ' days'), short: 'In ' + n + ' d', cls: n <= 2 ? 'amber' : 'green' };
}
function fmtDT(s) { const d = new Date(s); if (isNaN(d)) return ''; let h = d.getHours(); const ap = h < 12 ? 'am' : 'pm'; h = h % 12 || 12; return h + ':' + pad(d.getMinutes()) + ' ' + ap + ', ' + d.getDate() + ' ' + MON[d.getMonth()]; }
function remBanner() {
  const due = S.todos.filter((x) => !x.done && x.fired && !x.ack);
  if (!due.length) return '';
  return `<div class="grid" style="gap:10px;margin-bottom:14px">${due.map((x) => `<div class="warnbanner">${ICON.warn}<div style="flex:1;min-width:0"><b>Reminder: ${esc(x.title)}</b><br><span class="quiet">${fmtDT(x.remind)}${x.due ? ' · ' + gapText(x).txt : ''}</span></div><div class="actions"><button class="btn sm" data-act="doneTodo" data-id="${esc(x.id)}">Done</button><button class="btn sm ghost" data-act="snoozeTodo" data-id="${esc(x.id)}">Snooze 1 h</button><button class="btn sm ghost" data-act="ackTodo" data-id="${esc(x.id)}">Dismiss</button></div></div>`).join('')}</div>`;
}
function todoCompact() {
  const open = S.todos.filter((x) => !x.done).sort(todoSort).slice(0, 3);
  return `<div class="card"><h3>To-do</h3>${open.length ? `<div class="list">${open.map((x) => { const g = gapText(x); return `<div class="li"><div class="l"><b>${esc(x.title)}</b><small>${g.txt}</small></div><span class="badge ${g.cls}">${g.short}</span></div>`; }).join('')}</div>` : '<p class="quiet">Nothing open. Add a to-do with the + button.</p>'}<div class="actions" style="margin-top:12px"><button class="btn sm ghost" data-act="nav" data-v="todo">Open to-do list</button></div></div>`;
}
let TF = 'open';
VIEWS.todo = function () {
  const t = today(), open = S.todos.filter((x) => !x.done), over = open.filter((x) => x.due && x.due < t), dueT = open.filter((x) => x.due === t), done = S.todos.filter((x) => x.done);
  const took = done.map((x) => diff(x.created, x.doneDate || x.created)), avg = took.length ? sum(took) / took.length : null;
  const oldest = open.length ? Math.max(...open.map((x) => diff(x.created, t))) : 0;
  let list = TF === 'open' ? open.slice().sort(todoSort) : TF === 'done' ? done.slice().sort((a, b) => (b.doneDate || '').localeCompare(a.doneDate || '')) : S.todos.slice().sort((a, b) => (a.done - b.done) || todoSort(a, b));
  const cards = list.map((x) => {
    const g = gapText(x), over = !x.done && x.due && x.due < t;
    return `<div class="tcard${over ? ' over' : ''}${x.done ? ' done' : ''}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h4>${esc(x.title)}</h4>${x.pri !== 'Normal' ? `<span class="badge ${x.pri === 'High' ? 'red' : ''}">${esc(x.pri)}</span>` : ''}</div>${x.note ? `<div class="pre quiet">${esc(x.note)}</div>` : ''}
    <div class="chips" style="margin:0"><span class="badge ${g.cls}" style="padding:4px 10px">${g.txt}</span><span class="chip" style="padding:3px 10px">${x.done ? 'Added ' + fmtD(x.created) : ageText(x)}</span>${x.remind ? `<span class="chip" style="padding:3px 10px">${x.fired && !x.done ? 'Rang ' : 'Reminder '}${fmtDT(x.remind)}</span>` : ''}</div>
    <div class="actions" style="margin-top:auto"><button class="btn sm${x.done ? ' ghost' : ''}" data-act="doneTodo" data-id="${esc(x.id)}">${x.done ? 'Undo' : 'Done'}</button>${x.remind && !x.done ? `<button class="mini" data-act="snoozeTodo" data-id="${esc(x.id)}">+1 h</button>` : ''}<button class="mini" data-act="editTodo" data-id="${esc(x.id)}">Edit</button><button class="mini del" data-act="delTodo" data-id="${esc(x.id)}" aria-label="Delete">&times;</button></div></div>`;
  }).join('');
  return `${remBanner()}<div class="stats" style="margin-bottom:14px"><div class="stat"><span class="label">Open</span><b>${open.length}</b><small>${dueT.length} due today</small></div><div class="stat"><span class="label">Overdue</span><b style="color:${over.length ? 'var(--bad)' : 'inherit'}">${over.length}</b><small>${over.length ? 'longest ' + Math.max(...over.map((x) => diff(x.due, t))) + ' days late' : 'none late'}</small></div><div class="stat"><span class="label">Waiting longest</span><b>${oldest} d</b><small>oldest open card</small></div><div class="stat"><span class="label">Average to finish</span><b>${avg == null ? '-' : avg.toFixed(1) + ' d'}</b><small>${done.length} finished</small></div></div>
  <div class="actions" style="margin-bottom:14px"><div class="seg">${[['open', 'Open'], ['done', 'Done'], ['all', 'All']].map((f) => `<button data-act="tFilter" data-v="${f[0]}" aria-pressed="${TF === f[0]}">${f[1]}</button>`).join('')}</div><button class="btn sm" data-act="addTodo">Add to-do</button></div>
  ${cards ? `<div class="tgrid">${cards}</div>` : '<div class="empty"><b>No cards here</b>Add a to-do with a due date and a reminder. Each card shows how long it has been waiting and how far past its due date it is.</div>'}
  <p class="quiet" style="margin-top:14px">Reminders ring while the app is open on your phone or PC. Turn on notifications in Settings to see them as alerts too.</p>`;
};

/* =============== Views: Learning =============== */
const bookRead = (b) => Math.min(b.total, (b.start || 0) + sum(b.log || [], (x) => x.pages));
const pagesOn = (d) => sum(S.books, (b) => sum((b.log || []).filter((x) => x.date === d), (x) => x.pages));
const LQ = { learn: '', diary: '', tag: 'All', dfilter: 'all' };
VIEWS.learn = function () {
  const t = today(), wk = sum(Array.from({ length: 7 }, (_, i) => pagesOn(addD(t, -i)))), reading = S.books.filter((b) => bookRead(b) < b.total).length;
  const q = LQ.learn.toLowerCase(), tags = ['All'].concat(Array.from(new Set(S.learn.map((c) => c.tag).filter(Boolean))));
  let cards = S.learn.slice().sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  if (LQ.tag !== 'All') cards = cards.filter((c) => c.tag === LQ.tag);
  if (q) cards = cards.filter((c) => (c.title + ' ' + c.text + ' ' + (c.tag || '')).toLowerCase().includes(q));
  const books = S.books.map((b) => {
    const read = bookRead(b), pct = Math.round(read / b.total * 100), last7 = sum((b.log || []).filter((x) => x.date > addD(t, -7)), (x) => x.pages), pace = last7 / 7, lastLog = (b.log || []).slice().sort((x, y) => y.date.localeCompare(x.date))[0];
    return `<div class="bkc"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="min-width:0"><h4>${esc(b.title)}</h4><span class="quiet">${esc(b.author || 'Author not set')}</span></div><span class="badge ${read >= b.total ? 'green' : 'amber'}">${read >= b.total ? 'Finished' : pct + '%'}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div><div class="mono" style="font-size:13px">${read} / ${esc(b.total)} pages${pace > 0 && read < b.total ? ` <span class="quiet">· about ${Math.ceil((b.total - read) / pace)} days left at ${pace.toFixed(1)} pages a day</span>` : ''}</div>
    ${lastLog ? `<span class="quiet">Last: ${esc(lastLog.pages)} pages on ${fmtD(lastLog.date)}</span>` : '<span class="quiet">No pages logged yet</span>'}
    <div class="actions" style="margin-top:auto"><button class="btn sm" data-act="logBook" data-id="${esc(b.id)}">Log pages</button><button class="mini" data-act="editBook" data-id="${esc(b.id)}">Edit</button><button class="mini del" data-act="delBook" data-id="${esc(b.id)}" aria-label="Delete book">&times;</button></div></div>`;
  }).join('');
  return `<div class="stats" style="margin-bottom:14px"><div class="stat"><span class="label">Pages today</span><b>${pagesOn(t)}</b><small>${wk} this week</small></div><div class="stat"><span class="label">Books</span><b>${S.books.length}</b><small>${reading} in progress</small></div><div class="stat"><span class="label">Learning cards</span><b>${S.learn.length}</b><small>${S.learn.filter((c) => c.date === t).length} added today</small></div><div class="stat"><span class="label">Pages total</span><b>${sum(S.books, bookRead)}</b><small>across all books</small></div></div>
  <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"><h3 style="margin:0">Books</h3><button class="btn sm" data-act="addBook">Add book</button></div>${books ? `<div class="kgrid">${books}</div>` : '<div class="empty"><b>No books yet</b>Add a book with its total pages, then log the pages you cover each day.</div>'}</div>
  <div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"><h3 style="margin:0">What I learned</h3><button class="btn sm" data-act="addLearn">New learning card</button></div>
    <input class="inp srch" id="lq" placeholder="Search your cards" value="${esc(LQ.learn)}" data-inp="search" data-k="learn" aria-label="Search learning cards">
    ${tags.length > 2 ? `<div class="chips">${tags.map((g) => `<button class="chip" data-act="lTag" data-v="${esc(g)}" aria-pressed="${LQ.tag === g}" style="${LQ.tag === g ? 'background:var(--teal);color:var(--teal-ink);border-color:var(--teal)' : ''}">${esc(g)}</button>`).join('')}</div>` : ''}
    ${cards.length ? `<div class="kgrid">${cards.map((c) => { const bk = S.books.find((b) => b.id === c.book); return `<div class="kcard"><h4>${esc(c.title)}</h4><div class="pre">${esc(c.text)}</div><div class="chips" style="margin:0">${c.tag ? `<span class="chip" style="padding:3px 10px">${esc(c.tag)}</span>` : ''}${bk ? `<span class="chip" style="padding:3px 10px">${esc(bk.title)}</span>` : ''}<span class="quiet" style="font-size:12px;align-self:center">${fmtD(c.date)}</span></div><div class="actions" style="margin-top:auto"><button class="mini" data-act="editLearn" data-id="${esc(c.id)}">Edit</button><button class="mini del" data-act="delLearn" data-id="${esc(c.id)}" aria-label="Delete card">&times;</button></div></div>`; }).join('')}</div>` : '<div class="empty"><b>No cards yet</b>Type what you learned today, a rule, a fact or a word. Link it to a book if you like.</div>'}</div>`;
};

/* =============== Views: Diary =============== */
const MOODS = ['Great', 'Good', 'Okay', 'Low', 'Hard'];
VIEWS.diary = function () {
  const q = LQ.diary.toLowerCase();
  let es = S.diary.slice().sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  if (LQ.dfilter === 'star') es = es.filter((e) => e.star);
  if (q) es = es.filter((e) => ((e.title || '') + ' ' + e.text).toLowerCase().includes(q));
  const groups = {}, order = []; es.forEach((e) => { const k = e.date.slice(0, 7); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(e); });
  const body = order.map((k) => { const ym = k.split('-').map(Number); return `<h3 style="margin:18px 0 10px">${MON[ym[1] - 1]} ${ym[0]}</h3><div class="kgrid">${groups[k].map((e) => `<div class="dcard"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="label">${WD[parseD(e.date).getDay()]}, ${fmtD(e.date)}</span><div class="actions" style="gap:6px"><button class="mini" data-act="starDiary" data-id="${esc(e.id)}" aria-pressed="${!!e.star}" aria-label="Mark important" title="Important" style="${e.star ? 'color:var(--accent);border-color:var(--accent)' : ''}">${e.star ? '&#9733;' : '&#9734;'}</button></div></div>${e.title ? `<h4>${esc(e.title)}</h4>` : ''}<div class="pre">${esc(e.text)}</div><div class="chips" style="margin:0">${e.mood ? `<span class="chip" style="padding:3px 10px">${esc(e.mood)}</span>` : ''}${e.star ? '<span class="badge amber">Important</span>' : ''}</div><div class="actions" style="margin-top:auto"><button class="mini" data-act="editDiary" data-id="${esc(e.id)}">Edit</button><button class="mini del" data-act="delDiary" data-id="${esc(e.id)}" aria-label="Delete entry">&times;</button></div></div>`).join('')}</div>`; }).join('');
  return `<div class="card"><div class="actions" style="margin-bottom:12px"><button class="btn" data-act="addDiary">Write an entry</button><div class="seg">${[['all', 'All'], ['star', 'Important']].map((f) => `<button data-act="dFilter" data-v="${f[0]}" aria-pressed="${LQ.dfilter === f[0]}">${f[1]}</button>`).join('')}</div></div>
  <input class="inp" id="dq" placeholder="Search your diary" value="${esc(LQ.diary)}" data-inp="search" data-k="diary" aria-label="Search diary"></div>
  ${body || '<div class="empty" style="margin-top:14px"><b>Your diary is empty</b>Write about your day, a decision, or something you want to remember. Star the important ones.</div>'}
  <p class="quiet" style="margin-top:14px">Your diary is saved with the rest of your data${cloud.enabled ? ' and syncs to your private account.' : ' on this device. Use Settings, Export backup to keep a copy.'}</p>`;
};

/* =============== Views: Settings =============== */
VIEWS.set = function () {
  const s = S.settings, isDark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const inp = (k, label, type, extra) => `<div class="setrow"><label class="label" for="s_${k}">${label}</label><input class="inp" id="s_${k}" type="${type}" value="${esc(s[k])}" data-chg="setting" data-key="${k}"${extra || ''}></div>`;
  return `<div class="grid g2">
  ${card('Study goals', inp('target', 'Daily target (hours)', 'number', ' step="0.5" min="1"') + inp('exam', 'Exam date', 'date') + inp('pomo', 'Focus minutes', 'number', ' min="5"') + inp('brk', 'Break minutes', 'number', ' min="1"') + `<div class="setrow"><label class="label" for="s_why">My why (shown on Home)</label><input class="inp" id="s_why" value="${esc(s.why)}" data-chg="setting" data-key="why" placeholder="Why am I doing this?"></div>`)}
  ${card('Money and profile', inp('budget', 'Monthly budget (₹)', 'number', ' min="0"') + `<div class="setrow"><label class="label" for="s_name">Your name</label><input class="inp" id="s_name" value="${esc(S.name)}" data-chg="nameSet"></div><div class="actions"><button class="btn sm ghost" data-act="theme">Switch to ${isDark ? 'light' : 'dark'} theme</button><button class="btn sm ghost" data-act="notif">Turn on reminders</button></div>`)}
  </div>
  ${card('Your data', `<p class="quiet" style="margin-bottom:12px">${cloud.enabled ? 'Your data syncs to your account, so phone and PC match.' : 'Your data is saved on this device only. Use Export to keep a backup or to move it to another device.'}</p>
  <div class="actions"><button class="btn sm" data-act="exportData">Export backup</button><label class="btn sm ghost" style="cursor:pointer">Import backup<input type="file" accept=".json,application/json" id="impfile" data-chg="importData" hidden></label><button class="btn sm ghost" data-act="loadDemo">Load sample data</button><button class="btn sm ghost" data-act="clearDemo">Remove sample data</button><button class="btn sm ghost" data-act="resetAll" id="resetBtn">Erase everything</button></div>`, ' style="margin-top:14px"')}`;
};

/* =============== Sample data =============== */
function loadDemo() {
  clearDemo(true);
  const t = today(), R = rng(2401); if (S._demoCreated == null) S._demoCreated = S.created; S.created = addD(t, -36);
  const subs = SUBJECTS.slice(0, 4), tag = (o) => Object.assign(o, { demo: true });
  for (let i = 35; i >= 1; i--) {
    const d = addD(t, -i), wk = parseD(d).getDay(); let h = 3.3 + (35 - i) * 0.055 + (R() - .5) * 2.4 + (wk === 0 || wk === 6 ? .7 : 0);
    if (i === 26 || i === 25) h = 1.3; h = Math.max(.6, Math.min(8, h)); let rem = Math.round(h * 60), hh = 6;
    while (rem > 0) { const m = Math.min(rem, [45, 60, 90][Math.floor(R() * 3)]); S.logs.push(tag({ id: uid(), date: d, at: new Date(d + 'T' + pad(hh) + ':30:00').getTime(), subj: subs[Math.floor(R() * 4)], topic: ['Percentage', 'Syllogism', 'Error spotting', 'Polity', 'Time and Work', 'Series'][Math.floor(R() * 6)], min: m, focus: 1 + Math.floor(R() * 5) })); rem -= m; hh += 2; }
    if (i !== 1 && i < 20) S.qr.push(tag({ id: uid(), date: d, kind: KINDS[i % 4].k, score: 9 + Math.floor(R() * 7), sec: 200 + Math.floor(R() * 200) }));
    if (R() < .7) S.exp.push(tag({ id: uid(), date: d, amt: 40 + Math.floor(R() * 180), cat: CATS[Math.floor(R() * 6)], note: '', mode: 'UPI' }));
  }
  S.tasks.push(tag({ id: uid(), orig: addD(t, -5), date: t, subj: 'Quant', topic: 'Time and Work: pipes and cisterns', plan: 60, spent: 0, done: false }));
  S.tasks.push(tag({ id: uid(), orig: addD(t, -4), date: t, subj: 'English', topic: 'One-word substitution, set 3', plan: 30, spent: 0, done: false }));
  S.tasks.push(tag({ id: uid(), orig: addD(t, -1), date: t, subj: 'English', topic: 'Error spotting', plan: 45, spent: 0, done: false }));
  S.tasks.push(tag({ id: uid(), orig: t, date: t, subj: 'Quant', topic: 'Percentage: successive change', plan: 90, spent: 90, done: true, doneDate: t }));
  S.tasks.push(tag({ id: uid(), orig: t, date: t, subj: 'General Studies', topic: 'Polity: Fundamental Rights', plan: 45, spent: 0, done: false }));
  S.logs.push(tag({ id: uid(), date: t, at: Date.now(), subj: 'Quant', topic: 'Percentage: successive change', min: 90, focus: 0, task: S.tasks[S.tasks.length - 2].id, auto: true }));
  S.meet.push(tag({ id: uid(), date: t, time: '17:30', title: 'Doubt session', who: 'Mentor', done: false }));
  for (let i = 0; i < 12; i++) { const q = 10 + Math.floor(R() * 20); S.rev.push(tag({ id: uid(), date: addD(t, -i * 2), subj: subs[i % 4], topic: ['Percentage', 'Syllogism', 'Error spotting', 'Polity'][i % 4], min: 20 + Math.floor(R() * 30), q, c: Math.round(q * (.45 + R() * .5)) })); }
  [58, 64, 61, 72].forEach((p, i) => S.mocks.push(tag({ id: uid(), date: addD(t, -21 + i * 7), name: 'Full mock ' + (i + 1), score: p * 2, max: 200, mins: 60, notes: i === 3 ? 'Careless errors in reasoning' : '' })));
  for (let i = 0; i < 24; i++) { if (R() < .2) continue; const dd = addD(t, -i); S.canteen.days[dd] = { mt: R() < .85 ? 1 : 0, at: R() < .7 ? 1 : 0, sn: R() < .5 ? 1 : 0, ln: R() < .8 ? 1 : 0, p: Object.assign({}, S.canteen.prices), demo: true }; }
  S.todos.push(tag({ id: uid(), created: addD(t, -6), title: 'Submit scholarship form', note: 'Attach marksheet copy', pri: 'High', due: addD(t, -2), remind: '', fired: false, ack: false, done: false, doneDate: '' }));
  S.todos.push(tag({ id: uid(), created: addD(t, -3), title: 'Buy previous-year question papers', note: '', pri: 'Normal', due: addD(t, 2), remind: '', fired: false, ack: false, done: false, doneDate: '' }));
  S.todos.push(tag({ id: uid(), created: addD(t, -1), title: 'Call mentor about mock test', note: '', pri: 'Normal', due: t, remind: '', fired: false, ack: false, done: false, doneDate: '' }));
  S.todos.push(tag({ id: uid(), created: addD(t, -8), title: 'Print admit card checklist', note: '', pri: 'Low', due: addD(t, -5), remind: '', fired: false, ack: false, done: true, doneDate: addD(t, -4) }));
  const bk = { id: uid(), title: 'Quantitative Aptitude', author: 'R. S. Aggarwal', total: 780, start: 120, log: [{ date: addD(t, -3), pages: 14 }, { date: addD(t, -2), pages: 20 }, { date: addD(t, -1), pages: 12 }, { date: t, pages: 16 }], demo: true };
  const bk2 = { id: uid(), title: 'Indian Polity', author: 'M. Laxmikanth', total: 640, start: 0, log: [{ date: addD(t, -1), pages: 25 }], demo: true };
  S.books.push(bk, bk2);
  S.learn.push(tag({ id: uid(), date: t, at: Date.now(), title: 'Article 14', text: 'Equality before law and equal protection of the laws. Applies to all persons, not only citizens.', tag: 'Polity', book: bk2.id }));
  S.learn.push(tag({ id: uid(), date: addD(t, -1), at: Date.now() - 1e6, title: 'Successive percentage change', text: 'a% then b%: net change = a + b + ab/100. Example: +20% then -10% = +8%.', tag: 'Maths', book: bk.id }));
  S.diary.push(tag({ id: uid(), date: addD(t, -1), at: Date.now() - 2e6, title: 'A slow day, but I finished the plan', text: 'Felt tired in the afternoon. Took a short walk and finished the reasoning set. Remember: start with quant when the mind is fresh.', mood: 'Good', star: true }));
  S.diary.push(tag({ id: uid(), date: addD(t, -4), at: Date.now() - 4e6, title: '', text: 'Mock test was 72%. Careless mistakes in reasoning. Next week: two timed sets daily.', mood: 'Okay', star: false }));
  persist();
}
function clearDemo(silent) {
  ['tasks', 'logs', 'rev', 'exp', 'meet', 'qr', 'mist', 'mocks', 'notes', 'todos', 'books', 'learn', 'diary'].forEach((k) => { S[k] = S[k].filter((x) => !x.demo); });
  Object.keys(S.canteen.days).forEach((d) => { if (S.canteen.days[d].demo) delete S.canteen.days[d]; });
  if (!silent && S._demoCreated != null) { S.created = S._demoCreated; delete S._demoCreated; }
  persist(); if (!silent) { toast('Sample data removed'); render(); }
}

/* =============== Actions =============== */
function notify(msg) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then((r) => r.showNotification('Study Tracker', { body: msg, icon: 'icons/icon-192.png' })).catch(() => new Notification('Study Tracker', { body: msg }));
    else new Notification('Study Tracker', { body: msg });
  } catch (e) { /* ignore */ }
}
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function applyTheme() { const th = lsGet('sst_theme'); if (th) document.documentElement.dataset.theme = th; }
const ACT = {
  pinLesson: d => {
    const f=dailyFocusSummary(S,today()), prefs=focusPrefs();
    const pins=f.pins.map(p=>p.id);
    if(pins.includes(d.id)) prefs.pins=pins.filter(id=>id!==d.id);
    else {
      if(pins.length>=3){toast('Three priorities already pinned. Unpin one first.');return;}
      const task=S.tasks.find(t=>t.id===d.id);
      if(!task || task.done || task.spent>=task.plan){toast('This lesson is already finished.');return;}
      prefs.pins=[...pins,d.id];
    }
    persist();render();
  },
  catchupTime: () => openForm('Remaining study time today', [{k:'minutes',label:'Minutes still available today (after breaks and other commitments)',type:'number',min:0,req:1,value:dailyFocusSummary(S,today()).available ?? 60}], 'Set time', v => {
    if(!Number.isFinite(v.minutes) || v.minutes<0){toast('Enter zero or a positive number of minutes.');return;}
    focusPrefs().available=v.minutes;persist();render();
  }),
  nav: (d) => show(d.v),
  theme: () => { const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; lsSet('sst_theme', r.dataset.theme); if (CUR === 'set') render(); },
  logout: () => logout(),
  closeModal: () => closeModal(),
  fab: () => openMenu('Quick add', [['addTask', 'Task for today'], ['addTodo', 'To-do card'], ['addStudy', 'Study session'], ['addLearn', 'Learning card'], ['addDiary', 'Diary entry'], ['addExp', 'Expense'], ['addMeet', 'Meeting'], ['addNote', 'Note']]),
  addTask: () => { closeModal(); openForm('Add task', [{ k: 'subj', label: 'Subject', type: 'select', options: SUBJECTS }, { k: 'topic', label: 'Topic', req: 1, ph: 'What will you study?' }, { k: 'min', label: 'Minutes planned', type: 'number', value: 60, min: 5, req: 1 }], 'Add task', (v) => { S.tasks.push({ id: uid(), orig: today(), date: today(), subj: v.subj, topic: v.topic, plan: v.min, spent: 0, done: false, doneDate: null }); persist(); toast('Task added'); render(); }); },
  addStudy: () => { closeModal(); saveSession(30); },
  addExp: () => { closeModal(); openForm('Add expense', [{ k: 'amt', label: 'Amount (₹)', type: 'number', req: 1, min: 1 }, { k: 'cat', label: 'Category', type: 'select', options: CATS }, { k: 'mode', label: 'Paid by', type: 'select', options: ['UPI', 'Cash', 'Card'] }, { k: 'note', label: 'Note', ph: 'optional' }, { k: 'date', label: 'Date', type: 'date', value: today() }], 'Add expense', (v) => { S.exp.push({ id: uid(), date: v.date || today(), amt: v.amt, cat: v.cat, mode: v.mode, note: v.note }); persist(); toast('Expense added'); render(); }); },
  addMeet: () => { closeModal(); openForm('Add meeting', [{ k: 'title', label: 'Title', req: 1 }, { k: 'date', label: 'Date', type: 'date', value: today() }, { k: 'time', label: 'Time', type: 'time' }, { k: 'who', label: 'With whom' }, { k: 'notes', label: 'Notes' }], 'Add meeting', (v) => { S.meet.push({ id: uid(), date: v.date || today(), time: v.time, title: v.title, who: v.who, notes: v.notes, done: false }); persist(); toast('Meeting added'); render(); }); },
  addNote: () => { closeModal(); openForm('Add note', [{ k: 'tag', label: 'Tag', ph: 'Current affairs, Maths, English...' }, { k: 'text', label: 'Note', type: 'textarea', req: 1 }], 'Save note', (v) => { S.notes.push({ id: uid(), date: today(), tag: v.tag, text: v.text }); persist(); toast('Note saved'); if (CUR === 'notes') render(); }); },
  addRev: (d) => openForm('Log revision', [{ k: 'date', label: 'Date', type: 'date', value: today() }, { k: 'subj', label: 'Subject', type: 'select', options: SUBJECTS, value: d.subj || 'Quant' }, { k: 'topic', label: 'Topic', req: 1, value: d.topic || '' }, { k: 'min', label: 'Minutes spent', type: 'number', req: 1, min: 1, value: 30 }, { k: 'q', label: 'Questions practised', type: 'number', value: 0, min: 0 }, { k: 'c', label: 'Correct answers', type: 'number', value: 0, min: 0 }], 'Save', (v) => { S.rev.push({ id: uid(), date: v.date || today(), subj: v.subj, topic: v.topic, min: v.min, q: v.q || 0, c: Math.min(v.c || 0, v.q || 0) }); persist(); toast('Revision logged'); render(); }),
  addMock: () => openForm('Log mock test', [{ k: 'name', label: 'Test name', req: 1 }, { k: 'date', label: 'Date', type: 'date', value: today() }, { k: 'score', label: 'Score', type: 'number', req: 1, min: 0 }, { k: 'max', label: 'Maximum marks', type: 'number', value: 200, req: 1, min: 1 }, { k: 'mins', label: 'Minutes taken', type: 'number' }, { k: 'notes', label: 'What went wrong?', type: 'textarea' }], 'Save', (v) => { S.mocks.push({ id: uid(), name: v.name, date: v.date || today(), score: v.score, max: v.max, mins: v.mins || 0, notes: v.notes }); persist(); toast('Mock test saved'); render(); }),
  partial: (d) => { const k = S.tasks.find((x) => x.id === d.id); if (!k) return; openForm('How much did you finish?', [{ k: 'min', label: 'Minutes completed of ' + (k.plan - k.spent) + ' left', type: 'number', req: 1, min: 1, value: Math.round((k.plan - k.spent) / 2) }], 'Save', (v) => { const m = Math.min(v.min, k.plan - k.spent); S.logs.push({ id: uid(), date: today(), at: Date.now(), subj: k.subj, topic: k.topic, min: m, focus: 0, task: k.id }); k.spent += m; if (k.spent >= k.plan) { k.done = true; k.doneDate = today(); } persist(); toast(k.done ? 'Task finished' : (k.plan - k.spent) + ' min carried forward'); render(); }); },
  delTask: (d) => { S.tasks = S.tasks.filter((k) => k.id !== d.id); S.logs = S.logs.filter((l) => l.task !== d.id); persist(); render(); },
  doneTask: (d) => { setTaskDone(d.id, true); toast('Marked done'); render(); },
  resched: (d) => { const k = S.tasks.find((x) => x.id === d.id); if (k) { k.date = addD(today(), 1); persist(); toast('Moved to tomorrow'); render(); } },
  delLog: (d) => { const log = S.logs.find(l => l.id === d.id); const task = log && S.tasks.find(k => k.id === log.task); if (task) { task.spent = Math.max(0, task.spent - (log.credit == null ? log.min : log.credit)); if (task.spent < task.plan) { task.done = false; task.doneDate = null; } } S.logs = S.logs.filter((l) => l.id !== d.id); persist(); render(); },
  delExp: (d) => { S.exp = S.exp.filter((x) => x.id !== d.id); persist(); render(); },
  delMeet: (d) => { S.meet = S.meet.filter((x) => x.id !== d.id); persist(); render(); },
  toggleMeet: (d) => { const m = S.meet.find((x) => x.id === d.id); if (m) { m.done = !m.done; persist(); render(); } },
  delRev: (d) => { S.rev = S.rev.filter((x) => x.id !== d.id); persist(); render(); },
  delMock: (d) => { S.mocks = S.mocks.filter((x) => x.id !== d.id); persist(); render(); },
  delNote: (d) => { S.notes = S.notes.filter((x) => x.id !== d.id); persist(); render(); },
  delMist: (d) => { S.mist = S.mist.filter((x) => x.id !== d.id); persist(); render(); },
  tToggle: () => { if (T.running) { clearInterval(T.iv); T.iv = null; T.running = false; } else { T.running = true; T.last = Date.now(); T.iv = setInterval(tTick, 500); } render(); },
  tResetBtn: () => { tReset('focus'); render(); },
  tSave: () => { const m = Math.round(T.elapsed / 60); clearInterval(T.iv); T.iv = null; T.running = false; if (m < 1) { toast('Study at least a minute first'); tReset('focus'); render(); return; } const mm = m; tReset('focus'); saveSession(mm); },
  revKind: (d) => { RV.kind = d.v; RV.mode = 'learn'; delete QZ.qz; FL = null; render(); setTimeout(() => { const p = $('#rpanel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); },
  revMode: (d) => { RV.mode = d.v; if (d.v === 'flash') flashNew(); render(); if (d.v === 'practice' && !QZ.qz) ACT.qzStartRev(); },
  qzStartRev: () => { quizStart('qz', RV.kind, 15, { mcq: RV.mcq, onDone: finishDrill }); },
  qzCheck: (d) => { const i = document.getElementById(d.box + '-in'); quizCheck(d.box, i ? i.value : ''); },
  qzAns: (d) => quizCheck(d.box, d.v),
  qzNext: (d) => quizNext(d.box),
  qzAgain: (d) => { if (d.box === 'qz') ACT.qzStartRev(); else { const Z = QZ[d.box]; if (Z.mathTest) ACT.masterclassTest(); else if (Z.modelId) ACT.mathModelPractice({ id: Z.modelId }); else quizStart(d.box, Z.kind, 5, {onDone:Z.onDone}); } },
  flip: () => { FL.show = !FL.show; flashDraw(); },
  flashNext: () => { if (FL.i >= FL.qs.length - 1) flashNew(); else { FL.i++; FL.show = false; } flashDraw(); },
  repMode: (d) => { REP.mode = d.v; render(); },
  repDate: (d) => { REP.mode = 'day'; REP.date = d.v; render(); },
  print: () => window.print(),
  splitLessons: () => { const count = splitPlanLessons(); toast(count ? 'Numbered lessons separated; progress retained' : 'Lessons are already separate'); render(); },
  loadTimetable: async (d, button) => {
    if (S.plan.length && !sure(button, 'Replace existing plan?')) return;
    const day1 = $('#pday1').value || today(), skip = $('#pskip').checked;
    button.disabled = true;
    try {
      const response = await fetch('./my-timetable.csv');
      if (!response.ok) throw new Error('Timetable unavailable');
      const text = await response.text();
      S.settings.day1 = day1;
      const count = importPlan(text, skip);
      if (!count) throw new Error('Empty timetable');
      toast(count + ' timetable topics loaded'); render();
    } catch (e) {
      button.disabled = false;
      const error = $('#perr');
      if (error) { error.style.color = 'var(--bad)'; error.textContent = 'Could not load the timetable. Please retry when online.'; }
    }
  },
  planPaste: () => {
    const f = $('#pfile'), txt = $('#ptext').value; S.settings.day1 = $('#pday1').value || today();
    const go = (text) => { let n; try { n=importPlan(text, $('#pskip').checked); } catch(error) { $('#perr').style.color='var(--bad)'; $('#perr').textContent=error.message; return; } if (!n) { $('#perr').style.color = 'var(--bad)'; $('#perr').textContent = 'Could not read any rows. Each line needs at least Day, Date, Subject.'; return; } toast(n + ' plan lines imported'); render(); };
    if (txt.trim()) go(txt); else if (f && f.files && f.files[0]) { const r = new FileReader(); r.onload = () => go(String(r.result)); r.readAsText(f.files[0]); } else { $('#perr').style.color = 'var(--bad)'; $('#perr').textContent = 'Choose a CSV file or paste your plan first.'; }
  },
  sampleCsv: () => { const t = today(), rows = ['Day,Date,Subject,Topic,Planned Hours,Notes']; const T2 = [['Quant', 'Percentage basics', 2], ['Reasoning', 'Syllogism', 1.5], ['English', 'Error spotting', 1], ['General Studies', 'Polity: Preamble', 1], ['Quant', 'Profit and loss', 2], ['Reasoning', 'Blood relations', 1.5], ['English', 'Cloze test', 1]]; T2.forEach((r, i) => rows.push((i + 1) + ',' + addD(t, i) + ',' + r[0] + ',' + r[1] + ',' + r[2] + ',')); download('ssc-plan-sample.csv', rows.join('\n'), 'text/csv'); },
  skipToday: () => { postponePlan(S,today()); persist(); toast('Plan pushed by one day'); render(); },
  clearPlan: () => { S.plan = []; S.tasks = S.tasks.filter((k) => !(k.pk && !k.done && k.spent === 0)); persist(); render(); },
  runTrick: () => runTrick(),
  trickQuiz: (d) => { const kind = 't' + d.v; $('#tq' + d.v).innerHTML = '<div id="tqz' + d.v + '"></div>'; const box = 'tqz' + d.v; quizStart(box, kind, 5, {onDone: Z => recordMentalSession(Z,'Maths Tricks level '+d.v)}); },
  mastered: (d) => { S.mastered[d.v] = !S.mastered[d.v]; persist(); const open = $$('details.lv').map((x) => x.open); render(); $$('details.lv').forEach((x, i) => { x.open = open[i]; }); },
  exportData: () => { download('study-tracker-backup-' + today() + '.json', JSON.stringify(S, null, 2), 'application/json'); toast('Backup downloaded'); },
  loadDemo: () => { loadDemo(); toast('Sample data loaded'); render(); },
  clearDemo: () => clearDemo(),
  resetAll: (d, b) => { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to erase everything'; b.style.color = 'var(--bad)'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Erase everything'; b.style.color = ''; }, 4000); return; } const nm = S.name; S = blank(); S.name = nm; persist(); toast('All data erased'); show('home'); },
  notif: () => { if (!('Notification' in window)) { toast('This browser does not support reminders'); return; } Notification.requestPermission().then((p) => { toast(p === 'granted' ? 'Reminders are on' : 'Reminders were not allowed'); if (p === 'granted') notify('Reminders are on. You will see overdue and skipped-revision alerts when you open the app.'); }); }
};
function recordMentalSession(Z,source) {
  ssc.ensure();
  Z.qs.forEach((q,i)=>{ const attempt = Z.answers?.[i]; if (!attempt) return;
    const topic = q.topic || (q.operation === 'percentage' ? 'Percentage' : q.operation === 'fraction' ? 'Simplification' : 'Mental Multiplication');
    S.practice.push({id:uid(),date:today(),at:Date.now(),subj:'Quant',topic,kind:'original',attempted:1,correct:attempt.ok?1:0,skipped:0,seconds:attempt.seconds,source});
    if (!attempt.ok) {
      const prior = S.mistakeBook.find(m=>m.question===q.t && !m.archived);
      if (prior) { prior.yourAnswer = attempt.value; prior.at = Date.now(); prior.errorCount = (prior.errorCount || 1)+1; }
      else S.mistakeBook.push({id:uid(),date:today(),at:Date.now(),subj:'Quant',topic,question:q.t,yourAnswer:attempt.value,correctAnswer:q.show,method:q.explanation || 'Review the worked method in this level.',cause:'Unclassified',source:'Original mental maths model — not a PYQ',archived:false});
    }
  }); Z.noteMist = true; persist();
}
ACT.openTrickLevel = d => { const level = document.querySelector('details.lv[data-level="'+d.level+'"]'); if (level) { level.open = true; level.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); level.querySelector('summary').focus(); } };
ACT.revKindFromTricks = d => { show('rev'); ACT.revKind({v:d.kind}); };
ACT.suggestMathMethod = () => {
  const box = $('#method-result');
  try { const result = suggestedMethod(Number($('#method-x').value),Number($('#method-y').value)); box.innerHTML = `<p><b>${esc(result.method)}</b></p><p>${esc(result.reason)}</p><p>Exact product: <b>${result.answer}</b></p>`; }
  catch (e) { box.textContent = e.message; }
};
ACT.masterclassTest = () => {
  const target = $('#masterclass-test'); if (!target) return;
  target.innerHTML = '<p class="quiet">Ten model questions with a stopwatch, not a countdown. First question supplied in your text; nine additional questions are based on the worked methods. These are not official PYQs.</p><div id="masterquiz"></div>';
  const questions = MASTERCLASS_TEST.map(q => ({...q,opts:q.opts ? [...q.opts] : undefined,show:String(q.a)}));
  quizStart('masterquiz','mental-masterclass',10,{qs:questions,mcq:true,mathTest:true,onDone:Z=>recordMentalSession(Z,'Mental Maths Masterclass model test')});
  target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
};
ACT.mathModelPractice = d => {
  const question = modelExercise(d.id); if (!question) return;
  const target = document.getElementById('mathq-' + d.id); if (!target) return;
  const box = 'mathquiz-' + d.id; target.innerHTML = `<div id="${box}"></div>`;
  quizStart(box,'math-model',1,{qs:[question],modelId:d.id,onDone:Z=>{
    ssc.ensure(); S.practice.push({id:uid(),date:today(),at:Date.now(),subj:'Quant',topic:question.topic,kind:'original',attempted:1,correct:Z.score,skipped:0,seconds:Math.max(1,Z.secs),source:'SSC maths model question'});
    if (!Z.score) S.mistakeBook.push({id:uid(),date:today(),at:Date.now(),subj:'Quant',topic:question.topic,question:question.t,yourAnswer:Z.lastAnswer || '',correctAnswer:question.show,method:question.explanation,cause:'Unclassified',source:'Original maths model — not a PYQ',archived:false});
    persist();
  }});
};
const CHG = {
  lessonDuration: el => { const minutes=Number(el.value);if(![45,60].includes(minutes))return;S.settings.lessonMinutes=minutes;setPlanLessonMinutes(S,minutes,today());persist();render();toast('Unfinished plan topics now use '+minutes+' minutes each'); },
  backlogFilter: el => {
    if (!Object.hasOwn(backlogView, el.dataset.key)) return;
    backlogView[el.dataset.key] = el.value;
    const y = window.scrollY, id = el.id;
    render();
    document.getElementById(id)?.focus({preventScroll:true});
    window.scrollTo(0,y);
  },
  masterclassDay: el => { S.masterclassDays = Array.isArray(S.masterclassDays) ? S.masterclassDays : []; const id = 'day:'+el.dataset.day; S.masterclassDays = S.masterclassDays.filter(day=>day.id!==id); if (el.checked) S.masterclassDays.push({id,date:today(),at:Date.now()}); persist(); },
  tableChoice: el => { clearInterval(QZ.qz?.iv); delete QZ.qz; FL = null; RV[el.dataset.key] = el.dataset.key === 'tableLimit' ? Number(el.value) : el.value; lsSet('sst_tableBase',RV.tableBase); lsSet('sst_tableLimit',String(RV.tableLimit)); render(); if (RV.mode === 'practice') ACT.qzStartRev(); },
  toggleTask: (el) => { const complete = el.checked; setTaskDone(el.dataset.id, complete); render(); if (complete) toast('Lesson achieved — one step closer'); },
  tField: (el) => { T[el.dataset.f] = el.value; },
  mcq: (el) => { RV.mcq = el.checked; if (QZ.qz) QZ.qz.mcq = el.checked; },
  revFilter: (el) => { revFilter = el.value; render(); },
  setting: (el) => { const k = el.dataset.key; if(el.type === 'number' && (!Number.isFinite(Number(el.value)) || el.value.trim()==='' || el.min!=='' && Number(el.value)<Number(el.min))) { el.value=S.settings[k]; toast('Enter a valid value within the allowed range.'); return; } S.settings[k] = el.type === 'number' ? Number(el.value) : el.value; if (k === 'pomo' || k === 'brk') tReset('focus'); persist(); toast('Saved'); },
  nameSet: (el) => { S.name = el.value.trim(); persist(); toast('Saved'); },
  planFile: () => { /* read on Import */ },
  importData: (el) => {
    const f = el.files && el.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const o = validateBackup(JSON.parse(String(r.result))); S = Object.assign(blank(), o); S.settings = cleanSettings(o.settings); rollover(); genPlan(); persist(); toast('Backup restored'); show('home'); } catch (e) { toast('That file is not a valid backup'); } };
    r.readAsText(f);
  }
};
/* ---- Actions for canteen, to-do, learning and diary ---- */
const toLocalISO = (d) => ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
function sure(b, label) {
  if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.dataset.old = b.innerHTML; b.textContent = label || 'Sure?'; setTimeout(() => { b.dataset.sure = ''; b.innerHTML = b.dataset.old; }, 3000); return false; }
  return true;
}
function todoForm(x) {
  openForm(x ? 'Edit to-do' : 'Add to-do', [
    { k: 'title', label: 'What needs doing?', req: 1, value: x ? x.title : '' },
    { k: 'note', label: 'Note', type: 'textarea', value: x ? x.note : '' },
    { k: 'pri', label: 'Priority', type: 'select', options: ['High', 'Normal', 'Low'], value: x ? x.pri : 'Normal' },
    { k: 'due', label: 'Due date', type: 'date', value: x ? x.due : '' },
    { k: 'remind', label: 'Reminder (date and time)', type: 'datetime-local', value: x ? x.remind : '' }
  ], x ? 'Save' : 'Add to-do', (v) => {
    if (x) { const rc = x.remind !== v.remind; Object.assign(x, { title: v.title, note: v.note, pri: v.pri, due: v.due, remind: v.remind }); if (rc) { x.fired = false; x.ack = false; } }
    else S.todos.push({ id: uid(), created: today(), title: v.title, note: v.note, pri: v.pri, due: v.due, remind: v.remind, fired: false, ack: false, done: false, doneDate: '' });
    persist(); toast(x ? 'Saved' : 'To-do added'); checkReminders(); render();
  });
}
function bookForm(b) {
  openForm(b ? 'Edit book' : 'Add book', [
    { k: 'title', label: 'Book name', req: 1, value: b ? b.title : '' },
    { k: 'author', label: 'Author', value: b ? b.author : '' },
    { k: 'total', label: 'Total pages', type: 'number', req: 1, min: 1, value: b ? b.total : '' },
    { k: 'start', label: 'Pages already read before today', type: 'number', min: 0, value: b ? (b.start || 0) : 0 }
  ], b ? 'Save' : 'Add book', (v) => {
    if (b) Object.assign(b, { title: v.title, author: v.author, total: v.total, start: v.start || 0 });
    else S.books.push({ id: uid(), title: v.title, author: v.author, total: v.total, start: v.start || 0, log: [] });
    persist(); toast(b ? 'Saved' : 'Book added'); render();
  });
}
function learnForm(c) {
  openForm(c ? 'Edit learning card' : 'New learning card', [
    { k: 'title', label: 'Title', req: 1, value: c ? c.title : '', ph: 'e.g. Fundamental Rights, Article 14' },
    { k: 'text', label: 'What I learned', type: 'textarea', rows: 6, req: 1, value: c ? c.text : '' },
    { k: 'tag', label: 'Tag or subject', value: c ? c.tag : '', ph: 'Polity, Maths, English...' },
    { k: 'book', label: 'From book (optional)', type: 'select', options: [['', 'None']].concat(S.books.map((b) => [b.id, b.title])), value: c ? c.book || '' : '' }
  ], c ? 'Save' : 'Save card', (v) => {
    if (c) Object.assign(c, { title: v.title, text: v.text, tag: v.tag, book: v.book });
    else S.learn.push({ id: uid(), date: today(), at: Date.now(), title: v.title, text: v.text, tag: v.tag, book: v.book });
    persist(); toast('Card saved'); render();
  });
}
function diaryForm(e) {
  openForm(e ? 'Edit diary entry' : 'Diary entry', [
    { k: 'date', label: 'Date', type: 'date', value: e ? e.date : today() },
    { k: 'title', label: 'Title (optional)', value: e ? e.title : '' },
    { k: 'text', label: 'What happened, what matters', type: 'textarea', rows: 8, req: 1, value: e ? e.text : '' },
    { k: 'mood', label: 'How was the day?', type: 'select', options: [['', 'Skip']].concat(MOODS), value: e ? e.mood || '' : '' },
    { k: 'star', label: 'Mark as important?', type: 'select', options: [['0', 'No'], ['1', 'Yes, important']], value: e && e.star ? '1' : '0' }
  ], e ? 'Save' : 'Save entry', (v) => {
    if (e) Object.assign(e, { date: v.date || today(), title: v.title, text: v.text, mood: v.mood, star: v.star === '1' });
    else S.diary.push({ id: uid(), date: v.date || today(), at: Date.now(), title: v.title, text: v.text, mood: v.mood, star: v.star === '1' });
    persist(); toast('Diary entry saved'); render();
  });
}
const findBy = (arr, id) => arr.find((x) => x.id === id);
Object.assign(ACT, {
  cPlus: (d) => { setC(d.k, (cRec(CD || today())[d.k] || 0) + 1); refreshCanteen(); },
  cMinus: (d) => { setC(d.k, (cRec(CD || today())[d.k] || 0) - 1); refreshCanteen(); },
  cDate: (d) => { CD = d.v === 'today' ? today() : addD(CD || today(), +d.v); render(); },
  addTodo: () => { closeModal(); todoForm(null); },
  editTodo: (d) => { const x = findBy(S.todos, d.id); if (x) todoForm(x); },
  doneTodo: (d) => { const x = findBy(S.todos, d.id); if (!x) return; x.done = !x.done; x.doneDate = x.done ? today() : ''; if (x.done) x.ack = true; persist(); render(); },
  delTodo: (d, b) => { if (!sure(b, 'Sure?')) return; S.todos = S.todos.filter((x) => x.id !== d.id); persist(); render(); },
  snoozeTodo: (d) => { const x = findBy(S.todos, d.id); if (!x) return; x.remind = toLocalISO(new Date(Date.now() + 3600e3)); x.fired = false; x.ack = false; persist(); toast('Reminder set for ' + fmtDT(x.remind)); render(); },
  ackTodo: (d) => { const x = findBy(S.todos, d.id); if (x) { x.ack = true; persist(); render(); } },
  tFilter: (d) => { TF = d.v; render(); },
  addBook: () => bookForm(null),
  editBook: (d) => { const b = findBy(S.books, d.id); if (b) bookForm(b); },
  logBook: (d) => { const b = findBy(S.books, d.id); if (!b) return; openForm('Log pages: ' + b.title, [{ k: 'pages', label: 'Pages covered (' + (b.total - bookRead(b)) + ' left)', type: 'number', req: 1, min: 1, value: 10 }, { k: 'date', label: 'Date', type: 'date', value: today() }], 'Save', (v) => { b.log = b.log || []; b.log.push({ date: v.date || today(), pages: Math.min(v.pages, b.total - bookRead(b)) || v.pages }); persist(); toast(bookRead(b) >= b.total ? 'Book finished' : 'Pages logged'); render(); }); },
  delBook: (d, b) => { if (!sure(b)) return; S.books = S.books.filter((x) => x.id !== d.id); persist(); render(); },
  addLearn: () => { closeModal(); learnForm(null); },
  editLearn: (d) => { const c = findBy(S.learn, d.id); if (c) learnForm(c); },
  delLearn: (d, b) => { if (!sure(b)) return; S.learn = S.learn.filter((x) => x.id !== d.id); persist(); render(); },
  lTag: (d) => { LQ.tag = d.v; render(); },
  addDiary: () => { closeModal(); diaryForm(null); },
  editDiary: (d) => { const e = findBy(S.diary, d.id); if (e) diaryForm(e); },
  delDiary: (d, b) => { if (!sure(b)) return; S.diary = S.diary.filter((x) => x.id !== d.id); persist(); render(); },
  starDiary: (d) => { const e = findBy(S.diary, d.id); if (e) { e.star = !e.star; persist(); render(); } },
  dFilter: (d) => { LQ.dfilter = d.v; render(); }
});
Object.assign(CHG, {
  cDatePick: (el) => { if (el.value) { CD = el.value; render(); } },
  cPrice: (el) => { const v = Math.max(0, parseFloat(el.value) || 0); S.canteen.prices[el.dataset.k] = v; const r = S.canteen.days[CD || today()]; if (r) { r.p = Object.assign({}, r.p || {}, { [el.dataset.k]: v }); } persist(); toast('Price saved'); render(); },
  canteenFix: (el) => { el.value = cRec(CD || today())[el.dataset.k] || 0; }
});
const INP = {
  canteen: (el) => { setC(el.dataset.k, parseInt(el.value, 10) || 0); refreshCanteen(); },
  search: (el) => { LQ[el.dataset.k] = el.value; const id = el.id; render(); const i = document.getElementById(id); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
};
document.addEventListener('input', (e) => { const el = e.target.closest('[data-inp]'); if (el && INP[el.dataset.inp]) INP[el.dataset.inp](el); });

/* ---- Reminders: checked every 20 seconds while the app is open ---- */
let remIv = null;
function checkReminders() {
  if (!S) return;
  const now = Date.now(); let any = null;
  S.todos.forEach((x) => { if (!x.done && x.remind && !x.fired && new Date(x.remind).getTime() <= now) { x.fired = true; any = x; notify('Reminder: ' + x.title); } });
  if (any) { persist(); toast('Reminder: ' + any.title); if ((CUR === 'todo' || CUR === 'home') && $('#modal').hidden) render(); }
}
function startReminders() { clearInterval(remIv); checkReminders(); remIv = setInterval(checkReminders, 20000); }

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const fn = ACT[b.dataset.act]; if (!fn) return;
  if (b.closest('#modal') && b.dataset.act !== 'closeModal') closeModal();
  fn(b.dataset, b);
});
document.addEventListener('change', (e) => { const el = e.target.closest('[data-chg]'); if (el && CHG[el.dataset.chg]) CHG[el.dataset.chg](el); });
VIEWS.more = function () {
  return `<div class="menu">${NAV.filter((n) => !n.prim).map((n) => `<button data-act="nav" data-v="${esc(n.id)}">${ICON[n.id]}${esc(n.label)}</button>`).join('')}</div>`;
};

/* =============== Auth and boot =============== */
async function hashPw(pw, salt) {
  try { if (crypto && crypto.subtle) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw)); return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''); } } catch (e) { /* fall through */ }
  let h = 5381; const s = salt + ':' + pw; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'x' + h;
}
let signup = false;
function loginMode() {
  const local = !cloud.enabled, cred = lsGet('sst_cred');
  const create = local ? !cred : signup;
  $('#ltitle').textContent = create ? (local ? 'Create your login' : 'Create account') : 'Welcome back';
  $('#lsub').textContent = create ? (local ? 'Choose a user name and password for this device.' : 'Use your email and a password of 6 or more characters.') : 'Sign in to see today\'s plan.';
  $('#luL').textContent = local ? 'User name' : 'Email';
  $('#user').type = local ? 'text' : 'email';
  $('#fName').hidden = !(create && !local);
  $('#lbtn').textContent = create ? (local ? 'Create and sign in' : 'Create account') : 'Sign in';
  const tg = $('#ltoggle'); tg.hidden = local; tg.textContent = signup ? 'I already have an account' : 'Create account';
  $('#pass').autocomplete = create ? 'new-password' : 'current-password';
}
function loginErr(m) { $('#err').textContent = m; const c = $('#lform'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
$('#eye').addEventListener('click', function () { const p = $('#pass'), s = p.type === 'password'; p.type = s ? 'text' : 'password'; this.innerHTML = s ? ICON.eyeoff : ICON.eye; this.setAttribute('aria-label', s ? 'Hide password' : 'Show password'); });
$('#ltoggle').addEventListener('click', () => { signup = !signup; $('#err').textContent = ''; loginMode(); });
$('#lform').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#err').textContent = '';
  const u = $('#user').value.trim(), p = $('#pass').value, rem = $('#remember').checked;
  if (!u || !p) { loginErr('Enter your ' + (cloud.enabled ? 'email' : 'user name') + ' and password.'); return; }
  welcomeNext = true;
  if (!cloud.enabled) {
    let cred = null; try { cred = JSON.parse(lsGet('sst_cred') || 'null'); } catch (er) { cred = null; }
    if (!cred) {
      if (p.length < 4) { loginErr('Use at least 4 characters for the password.'); return; }
      const salt = uid(); cred = { u, salt, h: await hashPw(p, salt) }; lsSet('sst_cred', JSON.stringify(cred));
    } else if (cred.u.toLowerCase() !== u.toLowerCase() || cred.h !== await hashPw(p, cred.salt)) { loginErr('That user name or password does not match. Check them and try again.'); return; }
    if (rem) lsSet('sst_rem', '1'); else { lsDel('sst_rem'); ssSet('sst_ses', '1'); }
    startSession(cred.u, null);
  } else {
    try {
      if (signup) { const nm = $('#uname').value.trim(); if (p.length < 6) { loginErr('Firebase needs a password of at least 6 characters.'); return; } await cloud.signUp(u, p, rem); if (nm) lsSet('sst_pendingname', nm); } else await cloud.signIn(u, p, rem);
    } catch (er) {
      welcomeNext = false; const c = (er && er.code) || '';
      loginErr(/invalid|wrong|user-not-found|credential/.test(c) ? 'That email or password does not match. Check them and try again.' : /email-already/.test(c) ? 'That email already has an account. Sign in instead.' : /weak/.test(c) ? 'Choose a stronger password (6 or more characters).' : /network/.test(c) ? 'No internet connection. Try again when you are online.' : 'Could not sign in (' + (c || 'unknown error') + ').');
    }
  }
});
function startSession(name, uidv) {
  deviceSaveProblem = ''; UID = uidv; KEY = uidv ? 'sst_state_' + uidv : 'sst_state_local';
  clearTimeout(saveT); syncState.unsubscribe?.(); syncState.generation++; syncState.saving = false; syncState.conflict = null; syncState.problem = '';
  loadLocal(); syncState.legacyCandidate = clone(S); ssc.resetSession(); ssc.ensure();
  try { syncState.base = JSON.parse(lsGet(KEY + '_server') || 'null'); } catch { syncState.base = null; }
  syncState.dirty = syncState.base ? !sameState(S,syncState.base) : S._u > 0;
  if (!S.name) S.name = name || ''; const pn = lsGet('sst_pendingname'); if (pn && uidv) { S.name = pn; lsDel('sst_pendingname'); }
  rollover(); genPlan();
  if (uidv && cloud.enabled) { setSync('Checking server…'); const generation = syncState.generation; syncState.unsubscribe = cloud.subscribe(uidv, (data, pending, err, fromCache) => { if (UID !== uidv || generation !== syncState.generation) return; if (err) { syncState.problem = 'Could not read Firebase. Check sign-in and database rules; the local copy is retained.'; setSync('Cloud read needs attention'); if (!$('#app').hidden) render(); return; } if (pending) { setSync('Saved locally · awaiting server'); return; } onRemote(data, fromCache); }); }
  else setSync('This device only');
  if (welcomeNext) { welcomeNext = false; runWelcome(); } else enterApp();
}
function runWelcome() {
  $('#login').hidden = true; const w = $('#welcome'); w.hidden = false; w.classList.remove('out');
  const hr = new Date().getHours(); $('#greet').textContent = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const nm = S.name || 'Friend'; $('#wname').setAttribute('aria-label', nm);
  $('#wname').innerHTML = nm.split('').map((c, i) => `<span style="--i:${i}">${esc(c)}</span>`).join('');
  $('#wline').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span'); s.className = 'spark'; const a = Math.random() * 6.28, d = 120 + Math.random() * 180;
    s.style.left = '50%'; s.style.top = '46%'; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px'); s.style.animationDelay = (1.1 + Math.random() * .5) + 's'; s.style.opacity = '0'; w.appendChild(s);
  }
  setTimeout(() => w.classList.add('out'), 2900);
  setTimeout(() => { w.hidden = true; $$('.spark', w).forEach((n) => n.remove()); enterApp(); }, 3500);
}
function enterApp() {
  $('#login').hidden = true; $('#welcome').hidden = true; $('#app').hidden = false; buildNav(); const route = history.state?.studyTracker; if (!route) history.replaceState(routeState('home'),''); show(route?.section && VIEWS[route.view] ? route.view : 'home',true); remind(); startReminders();
}
function remind() {
  const c = critItems().length, m = qrMissed();
  if (c) notify(c + ' item' + (c > 1 ? 's' : '') + ' in the Critical Zone need attention.'); else if (m === 1) notify('You skipped Quick Revision yesterday. Do a set today to keep your streak.');
}
async function logout() {
  if (history.state?.studyTracker?.section) history.back();
  clearTimeout(saveT); syncState.unsubscribe?.(); syncState.unsubscribe = null; syncState.generation++; syncState.saving = false;
  lsDel('sst_rem'); ssDel('sst_ses'); clearInterval(T.iv); T.running = false; T.iv = null; clearInterval(remIv);
  if (cloud.enabled) { try { await cloud.signOut(); } catch (e) { /* ignore */ } }
  $('#app').hidden = true; $('#login').hidden = false; $('#pass').value = ''; signup = false; loginMode(); UID = null;
}
ACT.syncRetry = () => { syncState.problem = ''; syncState.dirty = true; syncAccount(); };
ACT.syncExportDevice = () => download('study-device-copy-' + today() + '.json',JSON.stringify(S,null,2),'application/json');
ACT.syncExportServer = () => download('study-server-copy-' + today() + '.json',JSON.stringify(syncState.conflict?.remote || syncState.base,null,2),'application/json');
ACT.syncUseServer = async () => {
  if (!confirm('Replace this device’s active records with a fresh server copy? Export the device copy first.')) return;
  const account = UID;
  try {
    const remote = await cloud.readServer(account); if (UID !== account) return;
    if (!remote) { toast('No server copy exists.'); return; }
    lsSet(KEY + '_conflict_device',JSON.stringify(S)); syncState.base = remote;
    lsSet(KEY + '_server',JSON.stringify(remote)); applyAccount(remote); syncState.dirty = false; syncState.conflict = null; syncState.problem = '';
    setSync('Synced · server confirmed'); dataChanged(); render();
  } catch { toast('Could not read a fresh server copy. Retry when online.'); }
};
ACT.syncUseDevice = () => {
  if (!confirm('Replace the whole cloud account with this device copy? Export both copies first. Other devices’ conflicting changes will be replaced.')) return;
  syncState.dirty = true; syncAccount(true);
};
window.addEventListener('online', () => { if (UID && syncState.dirty) syncAccount(); });
window.addEventListener('offline', () => { if (UID) setSync(syncState.dirty ? 'Saved locally · offline' : 'Offline · using device copy'); });
const ssc = installSsc({ state: () => S, persist, render, show, card, esc, today, uid, openForm, toast, ACT, CHG, VIEWS, download, current: () => CUR });

async function boot() {
  const savedTable = lsGet('sst_tableBase'), savedLimit = Number(lsGet('sst_tableLimit'));
  if (savedTable === 'mixed' || Number(savedTable) >= 12 && Number(savedTable) <= 30 && Number.isInteger(Number(savedTable))) RV.tableBase = savedTable;
  if ([20,50].includes(savedLimit)) RV.tableLimit = savedLimit;
  applyTheme(); $('#eye').innerHTML = ICON.eye;
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(() => {});
  loginMode();
  if (!cloud.enabled) {
    if (lsGet('sst_cred') && (lsGet('sst_rem') === '1' || ssGet('sst_ses') === '1')) { let c = null; try { c = JSON.parse(lsGet('sst_cred')); } catch (e) { c = null; } if (c) startSession(c.u, null); }
    return;
  }
  try {
    await cloud.init();
    cloud.onUser((user) => {
      if (user) { if (!UID) startSession((user.email || '').split('@')[0], user.uid); } else { if (UID) { clearTimeout(saveT); syncState.unsubscribe?.(); syncState.unsubscribe = null; syncState.generation++; syncState.saving = false; UID = null; } if (!$('#app').hidden) { $('#app').hidden = true; $('#login').hidden = false; } }
    });
  } catch (e) {
    $('#err').textContent = 'Could not load sign-in. Check your internet connection and refresh.';
  }
}
boot();
