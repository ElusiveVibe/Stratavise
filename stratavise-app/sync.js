/* =========================================================
   Stratavise — sync.js   (loaded BEFORE app.js)
   1) Password hashing (no more plain-text passwords)
   2) Notification + evaluation-week helpers
   3) Cloud sync with the Vercel API (/api/db -> Upstash Redis)
      - Works offline / local-only if the API is not connected.
   ========================================================= */

const APP_VERSION = '2026.10.29';
const APP_UPDATE_MESSAGE = 'New: notification bar, account approval for new users, and your data now syncs across devices.';

const DEFAULT_TERMS = [
  '1. Access to Stratavise is granted by the company only after your request is reviewed and approved by the Administrator.',
  '2. Access requires payment of the fee set by the company. The amount, payment method and schedule will be given to you during coordination with the company.',
  '3. Your account becomes active only after the Administrator confirms your payment and approves your request.',
  '4. The information you submit (name, department, position and job title) must be accurate. The company may decline or deactivate accounts with incorrect information.',
  '5. Evaluation data you enter is stored on the company\'s system and can be viewed by the Administrator.',
  '6. By submitting this request you agree to these terms and to coordinate with the company.'
].join('\n');
const DEFAULT_PAYMENT_INFO = 'Please coordinate directly with the company to get the access fee amount and the payment method. Keep your reference code and proof of payment. Your account will be activated once the Administrator confirms your payment.';

/* ---------------------- 1) Password hashing ---------------------- */
const _SHA = (() => {
  const primes = [];
  for (let n = 2; primes.length < 64; n++) { if (primes.every(p => n % p)) primes.push(n); }
  const frac = x => Math.floor((x - Math.floor(x)) * 4294967296);
  return { K: primes.map(p => frac(Math.cbrt(p))), H: primes.slice(0, 8).map(p => frac(Math.sqrt(p))) };
})();
const _enc = new TextEncoder();

function sha256Hex(str) {
  const bytes = _enc.encode(str), l = bytes.length;
  const buf = new Uint8Array(((l + 9 + 63) >> 6) << 6);
  buf.set(bytes); buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(buf.length - 8, Math.floor((l * 8) / 4294967296));
  dv.setUint32(buf.length - 4, (l * 8) >>> 0);
  const h = _SHA.H.slice(), K = _SHA.K, w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  return h.map(x => x.toString(16).padStart(8, '0')).join('');
}

function hashPw(plain, salt) {
  let h = sha256Hex(salt + ':' + plain);
  for (let i = 0; i < 2000; i++) h = sha256Hex(h + salt + plain);
  return h;
}
function setPw(obj, plain, salt) {
  salt = salt || uid('s');
  obj.passSalt = salt;
  obj.passHash = hashPw(plain, salt);
  delete obj.password;
  return obj;
}
function checkPw(obj, plain) {
  if (!obj) return false;
  if (obj.passHash) return obj.passHash === hashPw(plain, obj.passSalt || '');
  return obj.password !== undefined && obj.password === plain; // legacy (migrated on load)
}

/* ---------------------- DB shape / migration ---------------------- */
function ensureShape(db) {
  let changed = false;
  ['users', 'admins', 'evaluations', 'feedback', 'accountRequests', 'notifications'].forEach(k => {
    if (!Array.isArray(db[k])) { db[k] = []; changed = true; }
  });
  if (!db.settings) { db.settings = { terms: DEFAULT_TERMS, paymentInfo: DEFAULT_PAYMENT_INFO }; changed = true; }
  if (!('evalWindow' in db)) { db.evalWindow = null; changed = true; }
  db.users.concat(db.admins).forEach(o => {
    if (o.password !== undefined && !o.passHash) { setPw(o, String(o.password), o.id); changed = true; }
  });
  return { db, changed };
}

/* ---------------------- 2) Notifications + eval week ---------------------- */
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pushNotif(db, n) {
  if (!Array.isArray(db.notifications)) db.notifications = [];
  if (n.id && db.notifications.some(x => x.id === n.id)) return false;
  db.notifications.push(Object.assign({ id: uid('n'), ts: Date.now(), readBy: [] }, n));
  if (db.notifications.length > 300) {
    db.notifications.sort((a, b) => b.ts - a.ts);
    db.notifications.length = 300;
  }
  return true;
}
function notifsFor(db, audience, whoId) {
  return (db.notifications || [])
    .filter(n => n.audience === audience && (!n.targetUserIds || n.targetUserIds.includes(whoId)))
    .sort((a, b) => b.ts - a.ts);
}
function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' day(s) ago';
  return new Date(ts).toLocaleDateString();
}

// Evaluation week = first Monday of the month through Sunday.
function evalWindowFor(year, month) {
  const d = new Date(year, month, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  const start = new Date(d), end = new Date(d);
  end.setDate(end.getDate() + 6);
  return { start, end, key: year + '-' + String(month + 1).padStart(2, '0') };
}
function nextEvalWindow(now) {
  now = now || new Date();
  let w = evalWindowFor(now.getFullYear(), now.getMonth());
  const endOfEnd = new Date(w.end.getFullYear(), w.end.getMonth(), w.end.getDate(), 23, 59, 59);
  if (now > endOfEnd) w = evalWindowFor(now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), (now.getMonth() + 1) % 12);
  return w;
}
function fmtWindow(w) {
  const s = w.start, e = w.end, p = n => String(n).padStart(2, '0');
  if (s.getFullYear() !== e.getFullYear()) return `${MONTH_NAMES[s.getMonth()]} ${p(s.getDate())}, ${s.getFullYear()} to ${MONTH_NAMES[e.getMonth()]} ${p(e.getDate())}, ${e.getFullYear()}`;
  if (s.getMonth() !== e.getMonth()) return `${MONTH_NAMES[s.getMonth()]} ${p(s.getDate())} to ${MONTH_NAMES[e.getMonth()]} ${p(e.getDate())}, ${e.getFullYear()}`;
  return `${MONTH_NAMES[s.getMonth()]} ${p(s.getDate())} to ${p(e.getDate())}, ${e.getFullYear()}`;
}

// Creates the automatic notifications (safe to call many times: ids are fixed).
function runAutoNotifs() {
  const db = getDB();
  let changed = pushNotif(db, { id: 'n_update_' + APP_VERSION, audience: 'staff', type: 'update', title: 'A new update on the website was made.', message: APP_UPDATE_MESSAGE });
  const s = getSession();
  if (s && s.type === 'admin') {
    const w = nextEvalWindow();
    const announced = db.evalWindow && db.evalWindow.key === w.key && db.evalWindow.announcedAt;
    if (!announced && Date.now() >= w.start.getTime() - 7 * 86400000) {
      changed = pushNotif(db, { id: 'n_evalnotify_' + w.key, audience: 'admin', type: 'evalreminder', title: 'Time to notify employees about their evaluation.', message: 'Evaluation week: ' + fmtWindow(w) + '.', actionLabel: 'Notify now', link: '#/admin/announcements' }) || changed;
    }
  }
  if (changed) setDB(db);
}

/* ---------------------- 3) Cloud sync ---------------------- */
const SYNC_META_KEY = 'stratavise_sync_v1';
const SYNC_BASE_KEY = 'stratavise_sync_base_v1';
const SYNC = { enabled: false, status: 'local', version: 0, base: null, dirty: false, rev: 0, hasMeta: false, busy: false, again: false, timer: null, poll: null, lastSync: null, msg: '' };

(function loadSyncMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(SYNC_META_KEY) || 'null');
    if (m) { SYNC.hasMeta = true; SYNC.version = m.version || 0; SYNC.dirty = !!m.dirty; SYNC.lastSync = m.lastSync || null; }
    const b = localStorage.getItem(SYNC_BASE_KEY);
    if (b) SYNC.base = JSON.parse(b);
  } catch (e) { /* ignore */ }
})();

function persistSyncMeta() {
  try { localStorage.setItem(SYNC_META_KEY, JSON.stringify({ version: SYNC.version, dirty: SYNC.dirty, lastSync: SYNC.lastSync })); } catch (e) { /* ignore */ }
  try { if (SYNC.base) localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(SYNC.base)); } catch (e) { /* storage full: base stays in memory only */ }
}
function writeLocalRaw(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
const clone = o => JSON.parse(JSON.stringify(o));

function markDirty() {
  SYNC.dirty = true; SYNC.rev++;
  if (SYNC.enabled) { persistSyncMeta(); schedulePush(); }
}
function schedulePush() { clearTimeout(SYNC.timer); SYNC.timer = setTimeout(syncPush, 500); }

/* ---- status badge ---- */
function syncStatusInfo() {
  switch (SYNC.status) {
    case 'syncing': return { icon: '⟳', text: 'Syncing…', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', tip: 'Saving your changes to the cloud.' };
    case 'synced': return { icon: '☁️', text: 'Synced', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', tip: 'All changes are saved to the cloud and shared across devices.' + (SYNC.lastSync ? ' Last sync: ' + new Date(SYNC.lastSync).toLocaleTimeString() : '') };
    case 'offline': return { icon: '⚠️', text: 'Offline', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', tip: 'No connection. Your changes are kept on this device and will sync automatically.' };
    case 'error': return { icon: '⚠️', text: 'Sync error', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', tip: SYNC.msg || 'Something went wrong while syncing. Click to retry.' };
    default: return { icon: '💾', text: 'Local only', cls: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300', tip: 'Data is saved in this browser only. Connect the Vercel database (see README) to sync across devices.' };
  }
}
function syncBadgeHtml() {
  const i = syncStatusInfo();
  return `<button id="syncBadge" onclick="syncNow()" title="${i.tip.replace(/"/g, '&quot;')}" class="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${i.cls}">${i.icon} ${i.text}</button>`;
}
function setSyncStatus(s, msg) {
  SYNC.status = s; SYNC.msg = msg || '';
  const el = document.getElementById('syncBadge');
  if (el) {
    const i = syncStatusInfo();
    el.className = 'hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ' + i.cls;
    el.textContent = i.icon + ' ' + i.text;
    el.title = i.tip;
  }
}

/* ---- API ---- */
async function syncFetch(method, query, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch('/api/db' + (query || ''), {
      method, cache: 'no-store', signal: ctrl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) { const e = new Error('API not found'); e.noApi = true; throw e; }
    const j = await r.json();
    j._status = r.status;
    return j;
  } finally { clearTimeout(t); }
}

function handleSyncError(e) {
  if (e && e.noApi && !SYNC.enabled) { setSyncStatus('local'); return; }
  if (e && (e.name === 'AbortError' || e instanceof TypeError || e.noApi)) setSyncStatus('offline');
  else setSyncStatus('error', (e && e.message) || 'Sync failed');
}

/* ---- merge (3-way, per record id) ---- */
function mergeList(b, l, r, key, sig, itemMerge) {
  const bm = new Map(b.map(x => [x[key], x])), lm = new Map(l.map(x => [x[key], x])), rm = new Map(r.map(x => [x[key], x]));
  const out = new Map(rm);
  const sigs = sig ? new Set(r.map(sig)) : null;
  lm.forEach((lv, k) => {
    const bv = bm.get(k);
    if (!bv) { // added locally
      if (rm.has(k)) { if (itemMerge) out.set(k, itemMerge(null, lv, rm.get(k))); }
      else if (!sigs || !sigs.has(sig(lv))) out.set(k, lv);
    } else if (JSON.stringify(bv) !== JSON.stringify(lv)) { // edited locally
      if (rm.has(k)) out.set(k, itemMerge ? itemMerge(bv, lv, rm.get(k)) : lv);
    }
  });
  bm.forEach((bv, k) => { if (!lm.has(k)) out.delete(k); }); // deleted locally
  return Array.from(out.values());
}
const _readMerge = (b, l, r) => Object.assign({}, r, {
  readBy: Array.from(new Set([].concat(l.readBy || [], r.readBy || []))),
  done: !!(l.done || r.done)
});
const _userSig = u => (u.dept + '|' + u.role + '|' + u.name).toLowerCase();
const _evalSig = e => e.employeeId + '|' + e.evaluatorId + '|' + e.ts;
const _LIST_SPECS = [
  ['users', 'id', _userSig], ['admins', 'id'], ['departments', 'key'], ['criteria', 'id'],
  ['ratingScale', 'id'], ['rewards', 'id'], ['benefits', 'id'], ['evaluations', 'id', _evalSig],
  ['feedback', 'id', null, _readMerge], ['accountRequests', 'id'], ['notifications', 'id', null, _readMerge]
];
function mergeDB(base, local, remote) {
  const out = Object.assign({}, remote);
  const b = base || {};
  _LIST_SPECS.forEach(([name, key, sig, im]) => {
    out[name] = mergeList(b[name] || [], local[name] || [], remote[name] || [], key, sig, im);
  });
  if (base) {
    ['topPerformers', 'settings', 'evalWindow', 'meta'].forEach(k => {
      if (JSON.stringify(local[k]) !== JSON.stringify(base[k])) out[k] = local[k];
    });
  }
  return out;
}
// First time this browser meets the cloud: keep the cloud's settings, but don't lose
// people / evaluations / feedback that only exist in this browser.
function firstSyncMerge(local, remote) {
  const out = clone(remote);
  [['users', 'id', _userSig], ['evaluations', 'id', _evalSig], ['feedback', 'id'], ['accountRequests', 'id']].forEach(([name, key, sig]) => {
    out[name] = mergeList([], local[name] || [], remote[name] || [], key, sig);
  });
  return out;
}

/* ---- push / pull ---- */
async function syncPush() {
  if (!SYNC.enabled) return;
  if (SYNC.busy) { SYNC.again = true; return; }
  SYNC.busy = true; setSyncStatus('syncing');
  let remoteChanged = false, ok = false;
  try {
    for (let attempt = 0; attempt < 5 && !ok; attempt++) {
      const local = getDB(), revSent = SYNC.rev;
      const r = await syncFetch('POST', '', { baseVersion: SYNC.version, db: local });
      if (r._status === 200 && r.ok) {
        SYNC.version = r.version; SYNC.base = clone(local);
        SYNC.dirty = SYNC.rev !== revSent;
        SYNC.lastSync = Date.now(); SYNC.hasMeta = true; persistSyncMeta();
        ok = true;
      } else if (r._status === 409 && r.conflict) {
        const merged = mergeDB(SYNC.base, getDB(), r.db);
        writeLocalRaw(merged);
        SYNC.version = r.version; SYNC.base = r.db; remoteChanged = true; persistSyncMeta();
      } else throw new Error(r.error || ('HTTP ' + r._status));
    }
    setSyncStatus(ok ? 'synced' : 'error', ok ? '' : 'Could not sync after several tries. Click to retry.');
  } catch (e) { handleSyncError(e); }
  finally { SYNC.busy = false; if (SYNC.again) { SYNC.again = false; schedulePush(); } }
  if (remoteChanged) afterRemoteChange();
}

function applyRemote(j) {
  if (j.unchanged || j.version === SYNC.version) return false;
  if (!SYNC.dirty || !SYNC.base) {
    if (SYNC.dirty) writeLocalRaw(firstSyncMerge(getDB(), j.db)); else writeLocalRaw(j.db);
  } else {
    writeLocalRaw(mergeDB(SYNC.base, getDB(), j.db));
  }
  SYNC.base = j.db; SYNC.version = j.version; persistSyncMeta();
  return true;
}

async function syncPull() {
  if (!SYNC.enabled || SYNC.busy) return;
  try {
    const j = await syncFetch('GET', '?since=' + SYNC.version);
    let changed = false;
    if (j.configured && !j.db && !j.unchanged) { // cloud was emptied -> restore it from this device
      SYNC.version = 0; SYNC.base = null; SYNC.dirty = true; persistSyncMeta(); schedulePush(); return;
    }
    if (!j.unchanged) changed = applyRemote(j);
    SYNC.lastSync = Date.now(); persistSyncMeta();
    setSyncStatus(SYNC.dirty ? 'syncing' : 'synced');
    if (SYNC.dirty) schedulePush();
    if (changed) afterRemoteChange();
  } catch (e) { handleSyncError(e); }
}

async function syncInit() {
  if (location.protocol === 'file:') { setSyncStatus('local'); return; }
  try {
    setSyncStatus('syncing');
    const j = await syncFetch('GET', '');
    if (!j.configured) { SYNC.enabled = false; setSyncStatus('local'); return; }
    SYNC.enabled = true;
    if (!j.db) { // cloud empty: this browser becomes the first source of data
      SYNC.version = 0; SYNC.base = null; SYNC.dirty = true;
      await syncPush();
    } else if (!SYNC.hasMeta) { // first time on this browser
      const merged = firstSyncMerge(getDB(), j.db);
      writeLocalRaw(merged);
      SYNC.version = j.version; SYNC.base = j.db; SYNC.hasMeta = true;
      SYNC.dirty = JSON.stringify(merged) !== JSON.stringify(j.db);
      persistSyncMeta();
      if (SYNC.dirty) await syncPush(); else setSyncStatus('synced');
      afterRemoteChange();
    } else {
      const changed = applyRemote(j);
      if (SYNC.dirty) await syncPush(); else setSyncStatus('synced');
      if (changed) afterRemoteChange();
    }
  } catch (e) { handleSyncError(e); }
  startPolling();
}

function startPolling() {
  if (SYNC.poll || !SYNC.enabled) return;
  SYNC.poll = setInterval(() => { if (!document.hidden) syncPull(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncPull(); });
  window.addEventListener('online', () => { syncPush(); syncPull(); });
  window.addEventListener('storage', e => { if (e.key === DB_KEY) afterRemoteChange(); });
}

async function syncNow() {
  if (!SYNC.enabled) { toast('Sync is not connected yet — data stays in this browser. See README (Vercel setup).', 'error'); return; }
  await syncPush(); await syncPull();
  if (SYNC.status === 'synced') toast('Synced ✓');
}

// Re-draw the current page after data arrived from another device — but never
// while the person is typing, filling the evaluation form, or has a dialog open.
function afterRemoteChange() {
  if (typeof refreshBell === 'function') refreshBell();
  const segs = (location.hash || '#/login').slice(1).split('/').filter(Boolean);
  if (!segs.length || segs[0] === 'login' || (segs[0] === 'evaluate' && segs[1])) return;
  const ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
  const modal = document.getElementById('modalRoot');
  if (modal && modal.innerHTML.trim()) return;
  const panel = document.getElementById('notifPanel');
  if (panel && !panel.classList.contains('hidden')) return;
  router();
}
