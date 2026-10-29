/* =========================================================
   Stratavise — extras.js   (loaded AFTER app.js)
   - Notification bell (staff + admin)
   - Admin: Feedback, Account Requests, Announcements, Settings
   - Account request flow (terms + payment + admin approval)
   ========================================================= */

const INPUT_CLS = 'w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2';
const CARD_CLS = 'bg-white dark:bg-slate-800 rounded-xl card-shadow p-5';
const pad2 = n => String(n).padStart(2, '0');
const $id = id => document.getElementById(id);

/* ---------------------- Notification bell ---------------------- */
const NOTIF_ICONS = { eval: '📝', update: '🆕', feedback: '💬', request: '🧾', evalreminder: '⏰', announcement: '📣' };

function whoId() { const s = getSession(); return s ? (s.type === 'admin' ? s.adminId : s.userId) : null; }
function audienceNow() { const s = getSession(); return s && s.type === 'admin' ? 'admin' : 'staff'; }

function notifBellInner() {
  const who = whoId(), aud = audienceNow(), db = getDB();
  const list = notifsFor(db, aud, who).slice(0, 30);
  const isUnread = n => !(n.readBy || []).includes(who);
  const unread = list.filter(isUnread).length;
  const items = list.map(n => `
    <button onclick="openNotif('${n.id}')" class="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${isUnread(n) ? 'bg-emerald-50/70 dark:bg-emerald-900/20' : ''}">
      <span class="text-lg leading-none mt-0.5">${NOTIF_ICONS[n.type] || '🔔'}</span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold text-slate-800 dark:text-slate-100">${esc(n.title)}</span>
        <span class="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">${esc(n.done ? 'Notice sent to employees ✓' : (n.message || ''))}${n.actionLabel && !n.done ? ` <span class="font-semibold text-emerald-600 dark:text-emerald-400">[${esc(n.actionLabel)}]</span>` : ''}</span>
        <span class="block text-[10px] text-slate-400 mt-1">${timeAgo(n.ts)}</span>
      </span>
      ${isUnread(n) ? '<span class="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>' : ''}
    </button>`).join('') || '<p class="px-4 py-6 text-sm text-center text-slate-400">No notifications yet.</p>';
  return `
    <button onclick="toggleNotifPanel(event)" aria-label="Notifications" class="relative w-10 h-10 rounded-full bg-white dark:bg-slate-800 card-shadow flex items-center justify-center text-lg hover:ring-2 hover:ring-emerald-400">
      🔔${unread ? `<span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">${unread > 9 ? '9+' : unread}</span>` : ''}
    </button>
    <div id="notifPanel" class="hidden absolute right-0 mt-2 w-80 max-w-[85vw] bg-white dark:bg-slate-800 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 z-30 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <span class="font-semibold text-sm text-slate-700 dark:text-slate-200">Notifications</span>
        <button onclick="markAllNotifRead()" class="text-xs text-emerald-600 hover:underline">Mark all as read</button>
      </div>
      <div class="max-h-96 overflow-y-auto">${items}</div>
    </div>`;
}
function headerToolsHtml() {
  return `<div class="flex items-center gap-3">${syncBadgeHtml()}<div id="notifWrap" class="relative">${notifBellInner()}</div></div>`;
}
function refreshBell(keepOpen) {
  const w = $id('notifWrap'); if (!w) return;
  const p = $id('notifPanel');
  const wasOpen = p && !p.classList.contains('hidden');
  if (wasOpen && !keepOpen) return;
  w.innerHTML = notifBellInner();
  if (wasOpen) $id('notifPanel').classList.remove('hidden');
}
function toggleNotifPanel(e) {
  if (e) e.stopPropagation();
  const p = $id('notifPanel'); if (p) p.classList.toggle('hidden');
}
document.addEventListener('click', e => {
  const p = $id('notifPanel');
  if (p && !p.classList.contains('hidden') && !p.contains(e.target)) p.classList.add('hidden');
});
function openNotif(id) {
  const db = getDB(), who = whoId();
  const n = db.notifications.find(x => x.id === id); if (!n) return;
  if (!(n.readBy || []).includes(who)) { n.readBy = (n.readBy || []).concat(who); setDB(db); }
  if (n.link && location.hash !== n.link) location.hash = n.link; else router();
}
function markAllNotifRead() {
  const db = getDB(), who = whoId();
  notifsFor(db, audienceNow(), who).forEach(n => { if (!(n.readBy || []).includes(who)) n.readBy = (n.readBy || []).concat(who); });
  setDB(db); refreshBell(true);
}

/* ---------------------- Admin nav badges ---------------------- */
function adminNavBadge(key) {
  const db = getDB(), a = currentAdmin();
  let n = 0;
  if (key === 'requests') n = (db.accountRequests || []).filter(r => r.status === 'pending').length;
  if (key === 'feedback' && a) n = (db.feedback || []).filter(f => !(f.readBy || []).includes(a.id)).length;
  return n ? `<span class="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">${n}</span>` : '';
}

/* ---------------------- Evaluation-week banner (staff) ---------------------- */
function evalWindowBanner() {
  const w = getDB().evalWindow;
  if (!w || !w.start || !w.end) return '';
  if (Date.now() > w.end + 86400000) return '';
  const range = fmtWindow({ start: new Date(w.start), end: new Date(w.end) });
  return `<div class="mb-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 px-4 py-3 text-sm">📝 <strong>Evaluation week:</strong> ${esc(range)}</div>`;
}

/* ---------------------- ADMIN: Feedback ---------------------- */
let _fbMood = 'all', _fbDept = 'all';
const MOOD_META = {
  great: { e: '😊', l: 'Great', c: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  okay: { e: '😐', l: 'Okay', c: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  not_good: { e: '🙁', l: 'Not Good', c: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
};

function renderAdminFeedback() {
  const admin = currentAdmin(); if (!admin) return;
  const db = getDB();
  const all = (db.feedback || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const fresh = new Set(all.filter(f => !(f.readBy || []).includes(admin.id)).map(f => f.id));
  let touched = false;
  all.forEach(f => { if (fresh.has(f.id)) { f.readBy = (f.readBy || []).concat(admin.id); touched = true; } });
  db.notifications.forEach(n => {
    if (n.audience === 'admin' && n.type === 'feedback' && !(n.readBy || []).includes(admin.id)) { n.readBy = (n.readBy || []).concat(admin.id); touched = true; }
  });
  if (touched) setDB(db);

  const depts = getDepartments();
  const shown = all.filter(f => (_fbMood === 'all' || f.mood === _fbMood) && (_fbDept === 'all' || f.dept === _fbDept));
  const count = m => all.filter(f => f.mood === m).length;
  const moodMeta = m => MOOD_META[m] || { e: '💬', l: m || 'Feedback', c: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };

  const cards = shown.map(f => {
    const u = db.users.find(x => x.id === f.userId);
    const name = f.userName || (u && u.name) || 'Unknown user';
    const dept = f.dept || (u && u.dept);
    const mm = moodMeta(f.mood);
    return `
      <div class="${CARD_CLS} flex gap-3 !p-4">
        ${avatarHtml(u || { name }, 10)}
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold text-slate-800 dark:text-slate-100">${esc(name)}</span>
            ${fresh.has(f.id) ? '<span class="text-[10px] font-bold bg-red-500 text-white rounded-full px-2 py-0.5">NEW</span>' : ''}
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${mm.c}">${mm.e} ${esc(mm.l)}</span>
          </div>
          <p class="text-xs text-slate-400">${esc(dept ? deptLabel(dept) : '—')}${u ? ' &middot; ' + esc(u.jobTitle) : ''} &middot; ${esc(f.date || new Date(f.ts).toLocaleDateString())}</p>
          <p class="text-sm text-slate-700 dark:text-slate-200 mt-2 whitespace-pre-line">${f.comment ? esc(f.comment) : '<em class="text-slate-400">No comment added.</em>'}</p>
        </div>
        <button onclick="deleteFeedback('${f.id}')" title="Delete" class="text-slate-400 hover:text-red-500 self-start">🗑</button>
      </div>`;
  }).join('') || `<div class="${CARD_CLS} text-center text-slate-400 text-sm">No feedback yet.</div>`;

  adminShell('feedback', `
    <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">💬 Feedback</h1>
    <p class="text-sm text-slate-400 mb-5">Everything employees and supervisors send from Help &amp; Feedback.</p>
    <div class="grid grid-cols-3 gap-3 mb-5 max-w-lg">
      ${['great', 'okay', 'not_good'].map(m => `<div class="${CARD_CLS} !p-3 text-center"><p class="text-xl">${MOOD_META[m].e}</p><p class="text-lg font-bold text-slate-800 dark:text-slate-100">${count(m)}</p><p class="text-xs text-slate-400">${MOOD_META[m].l}</p></div>`).join('')}
    </div>
    <div class="flex flex-wrap gap-3 mb-4">
      <select onchange="_fbMood=this.value; renderAdminFeedback()" class="${INPUT_CLS} !w-auto">
        <option value="all">All moods</option>
        ${['great', 'okay', 'not_good'].map(m => `<option value="${m}" ${_fbMood === m ? 'selected' : ''}>${MOOD_META[m].e} ${MOOD_META[m].l}</option>`).join('')}
      </select>
      <select onchange="_fbDept=this.value; renderAdminFeedback()" class="${INPUT_CLS} !w-auto">
        <option value="all">All departments</option>
        ${depts.map(d => `<option value="${esc(d.key)}" ${_fbDept === d.key ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
      </select>
    </div>
    <div class="space-y-3 max-w-3xl">${cards}</div>
  `);
}
function deleteFeedback(id) {
  if (!confirm('Delete this feedback? This cannot be undone.')) return;
  const db = getDB(); db.feedback = db.feedback.filter(f => f.id !== id); setDB(db); renderAdminFeedback();
}

/* ---------------------- ADMIN: Account Requests ---------------------- */
let _reqTab = 'pending';

function renderAdminRequests() {
  const admin = currentAdmin(); if (!admin) return;
  const db = getDB();
  const reqs = (db.accountRequests || []).slice().sort((a, b) => b.ts - a.ts);
  const counts = { pending: 0, approved: 0, declined: 0 };
  reqs.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const tab = (k, l) => `<button onclick="_reqTab='${k}'; renderAdminRequests()" class="px-4 py-2 rounded-lg text-sm font-semibold ${_reqTab === k ? 'bg-slate-700 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 card-shadow'}">${l} (${counts[k] || 0})</button>`;

  const cards = reqs.filter(r => r.status === _reqTab).map(r => {
    const pending = r.status === 'pending';
    return `
      <div class="${CARD_CLS} !p-4">
        <div class="flex flex-wrap items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold">${esc(r.name.charAt(0).toUpperCase())}</div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-slate-800 dark:text-slate-100">${esc(r.name)}
              <span class="text-xs font-semibold ml-1 px-2 py-0.5 rounded-full ${r.role === 'supervisor' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}">${r.role === 'supervisor' ? 'Supervisor' : 'Employee'}</span>
            </p>
            <p class="text-xs text-slate-400">${esc(deptLabel(r.dept))} &middot; ${esc(r.jobTitle)} &middot; requested ${esc(r.date || '')} ${esc(r.time || '')} &middot; Ref <strong>${esc(r.id.slice(-6).toUpperCase())}</strong></p>
            <p class="text-xs mt-1 ${r.paid ? 'text-emerald-600' : 'text-amber-600'}">${r.paid ? '💳 Payment received' + (r.paymentNote ? ' — ' + esc(r.paymentNote) : '') : '⏳ Awaiting payment / coordination'}</p>
            ${r.status === 'declined' && r.reason ? `<p class="text-xs text-red-500 mt-1">Reason: ${esc(r.reason)}</p>` : ''}
          </div>
          <div class="flex flex-wrap gap-2">
            ${pending ? `
              <button onclick="toggleRequestPayment('${r.id}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${r.paid ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-amber-100 text-amber-700'}">${r.paid ? 'Undo payment' : '💳 Mark payment received'}</button>
              <button onclick="approveRequest('${r.id}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">✓ Approve &amp; create account</button>
              <button onclick="declineRequest('${r.id}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200">Decline</button>` :
              `<button onclick="deleteRequest('${r.id}')" class="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-500">Remove</button>`}
          </div>
        </div>
      </div>`;
  }).join('') || `<div class="${CARD_CLS} text-center text-slate-400 text-sm">Nothing here.</div>`;

  const s = db.settings || {};
  adminShell('requests', `
    <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">🧾 Account Requests</h1>
    <p class="text-sm text-slate-400 mb-5">New users must coordinate with the company and pay before you approve them. Approving adds them to Employees / Supervisors.</p>
    <div class="flex flex-wrap gap-2 mb-4">${tab('pending', 'Pending')}${tab('approved', 'Approved')}${tab('declined', 'Declined')}</div>
    <div class="space-y-3 max-w-4xl">${cards}</div>
    <details class="${CARD_CLS} mt-6 max-w-4xl">
      <summary class="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">⚙️ Terms &amp; payment instructions shown to new users</summary>
      <label class="block text-sm text-slate-500 dark:text-slate-300 mt-4 mb-1">Terms &amp; Conditions</label>
      <textarea id="setTerms" rows="8" class="${INPUT_CLS}">${esc(s.terms || DEFAULT_TERMS)}</textarea>
      <label class="block text-sm text-slate-500 dark:text-slate-300 mt-3 mb-1">Payment &amp; coordination instructions (amount, payment method, contact person)</label>
      <textarea id="setPayInfo" rows="4" class="${INPUT_CLS}">${esc(s.paymentInfo || DEFAULT_PAYMENT_INFO)}</textarea>
      <button onclick="saveRegistrationSettings()" class="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">Save</button>
    </details>
  `);
}
function saveRegistrationSettings() {
  const db = getDB();
  db.settings = Object.assign({}, db.settings, { terms: $id('setTerms').value.trim() || DEFAULT_TERMS, paymentInfo: $id('setPayInfo').value.trim() || DEFAULT_PAYMENT_INFO });
  setDB(db); toast('Saved');
}
function toggleRequestPayment(id) {
  const db = getDB(); const r = db.accountRequests.find(x => x.id === id); if (!r) return;
  if (r.paid) { r.paid = false; delete r.paidAt; delete r.paymentNote; }
  else {
    const note = prompt('Payment reference / note (optional):', '');
    if (note === null) return;
    r.paid = true; r.paidAt = Date.now(); r.paymentNote = note.trim();
  }
  setDB(db); renderAdminRequests();
}
function approveRequest(id) {
  const db = getDB(); const r = db.accountRequests.find(x => x.id === id); if (!r || r.status !== 'pending') return;
  if (!r.paid && !confirm('Payment is not marked as received yet. Approve anyway?')) return;
  if (!db.departments.some(d => d.key === r.dept)) { toast('That department no longer exists. Decline or recreate it first.', 'error'); return; }
  if (db.users.some(u => u.dept === r.dept && u.role === r.role && u.name.toLowerCase() === r.name.toLowerCase())) { toast('An account with this name already exists in that department/role.', 'error'); return; }
  db.users.push({ id: uid('u'), name: r.name, dept: r.dept, role: r.role, jobTitle: r.jobTitle, passSalt: r.passSalt, passHash: r.passHash, avatar: null });
  r.status = 'approved'; r.decidedAt = Date.now();
  delete r.passSalt; delete r.passHash;
  setDB(db); toast(r.name + ' was added to ' + (r.role === 'supervisor' ? 'Supervisors' : 'Employees') + '.'); renderAdminRequests();
}
function declineRequest(id) {
  const reason = prompt('Reason for declining (optional):', '');
  if (reason === null) return;
  const db = getDB(); const r = db.accountRequests.find(x => x.id === id); if (!r) return;
  r.status = 'declined'; r.reason = reason.trim(); r.decidedAt = Date.now();
  setDB(db); renderAdminRequests();
}
function deleteRequest(id) {
  if (!confirm('Remove this request from the list?')) return;
  const db = getDB(); db.accountRequests = db.accountRequests.filter(r => r.id !== id); setDB(db); renderAdminRequests();
}

/* ---------------------- ADMIN: Announcements ---------------------- */
function renderAdminAnnouncements() {
  const admin = currentAdmin(); if (!admin) return;
  const db = getDB();
  const w = nextEvalWindow();
  const toIn = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const sent = db.notifications.filter(n => n.audience === 'staff' && n.sentBy).sort((a, b) => b.ts - a.ts);
  const sentRows = sent.map(n => `
    <div class="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span class="text-lg">${NOTIF_ICONS[n.type] || '🔔'}</span>
      <div class="min-w-0 flex-1"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">${esc(n.title)}</p><p class="text-xs text-slate-400">${esc(n.message || '')} &middot; ${timeAgo(n.ts)}</p></div>
      <button onclick="deleteAnnouncement('${n.id}')" class="text-slate-400 hover:text-red-500 text-sm">🗑</button>
    </div>`).join('') || '<p class="text-sm text-slate-400">Nothing sent yet.</p>';

  adminShell('announcements', `
    <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">📣 Announcements</h1>
    <p class="text-sm text-slate-400 mb-5">Send notifications to every employee and supervisor. They appear in their 🔔 bell.</p>
    <div class="grid lg:grid-cols-2 gap-5 max-w-5xl">
      <div class="${CARD_CLS}">
        <h2 class="font-semibold text-slate-700 dark:text-slate-200 mb-3">📝 Evaluation notice</h2>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><label class="block text-xs text-slate-500 mb-1">Starts</label><input id="annStart" type="date" value="${toIn(w.start)}" class="${INPUT_CLS}" /></div>
          <div><label class="block text-xs text-slate-500 mb-1">Ends</label><input id="annEnd" type="date" value="${toIn(w.end)}" class="${INPUT_CLS}" /></div>
        </div>
        <label class="block text-xs text-slate-500 mb-1">Extra note (optional)</label>
        <input id="annNote" class="${INPUT_CLS} mb-3" placeholder="e.g. Please finish before Friday noon" />
        <p class="text-xs text-slate-400 mb-3">Employees will see: <em>“Time to evaluate! You have a week to evaluate from (${esc(fmtWindow(w))})”</em></p>
        <button onclick="sendEvalNotice()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">Send to all employees</button>
      </div>
      <div class="${CARD_CLS}">
        <h2 class="font-semibold text-slate-700 dark:text-slate-200 mb-3">🆕 General announcement</h2>
        <input id="annTitle" class="${INPUT_CLS} mb-2" placeholder="Title (e.g. A new update on the website was made.)" />
        <textarea id="annMsg" rows="3" class="${INPUT_CLS} mb-3" placeholder="Message (optional)"></textarea>
        <button onclick="sendGeneralAnnouncement()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">Send to all employees</button>
      </div>
    </div>
    <div class="${CARD_CLS} mt-5 max-w-5xl"><h2 class="font-semibold text-slate-700 dark:text-slate-200 mb-2">Sent</h2>${sentRows}</div>
  `);
}
function _parseDay(v) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); }
function sendEvalNotice() {
  const admin = currentAdmin(); if (!admin) return;
  const s = $id('annStart').value, e = $id('annEnd').value;
  if (!s || !e) { toast('Choose the start and end dates', 'error'); return; }
  const start = _parseDay(s), end = _parseDay(e);
  if (end < start) { toast('End date must be after the start date', 'error'); return; }
  const days = Math.round((end - start) / 86400000) + 1;
  const key = start.getFullYear() + '-' + pad2(start.getMonth() + 1);
  const note = $id('annNote').value.trim();
  const db = getDB();
  db.evalWindow = { key, start: start.getTime(), end: end.getTime(), announcedAt: Date.now() };
  pushNotif(db, {
    audience: 'staff', type: 'eval', sentBy: admin.id, link: '#/evaluate', title: 'Time to evaluate!',
    message: `You have ${days === 7 ? 'a week' : days + ' day(s)'} to evaluate from (${fmtWindow({ start, end })})` + (note ? ' — ' + note : '')
  });
  db.notifications.forEach(n => { if (n.type === 'evalreminder' && n.id === 'n_evalnotify_' + key) { n.done = true; n.readBy = Array.from(new Set((n.readBy || []).concat(admin.id))); } });
  setDB(db); toast('Evaluation notice sent'); renderAdminAnnouncements();
}
function sendGeneralAnnouncement() {
  const admin = currentAdmin(); if (!admin) return;
  const title = $id('annTitle').value.trim(), message = $id('annMsg').value.trim();
  if (!title) { toast('Add a title', 'error'); return; }
  const db = getDB();
  pushNotif(db, { audience: 'staff', type: 'announcement', sentBy: admin.id, title, message });
  setDB(db); toast('Announcement sent'); renderAdminAnnouncements();
}
function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement for everyone?')) return;
  const db = getDB(); db.notifications = db.notifications.filter(n => n.id !== id); setDB(db); renderAdminAnnouncements();
}

/* ---------------------- ADMIN: Settings ---------------------- */
function renderAdminSettings() {
  const admin = currentAdmin(); if (!admin) return;
  const dark = document.documentElement.classList.contains('dark');
  const si = syncStatusInfo();
  const defaultPw = checkPw(admin, 'admin123');
  adminShell('settings', `
    <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-5">⚙️ Settings</h1>
    ${defaultPw ? '<div class="mb-4 max-w-xl rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-4 py-3 text-sm">⚠️ You are still using the default admin password. Please change it below.</div>' : ''}
    <div class="max-w-xl space-y-5">
      <div class="${CARD_CLS}">
        <h2 class="font-semibold text-slate-700 dark:text-slate-200 mb-3">Profile</h2>
        <label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Display name</label>
        <input id="aSetName" value="${esc(admin.displayName)}" class="${INPUT_CLS} mb-2" />
        <label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Username (used to sign in)</label>
        <input id="aSetUser" value="${esc(admin.username)}" autocomplete="off" class="${INPUT_CLS} mb-3" />
        <button onclick="saveAdminProfile()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">Save profile</button>
      </div>
      <div class="${CARD_CLS}">
        <h2 class="font-semibold text-slate-700 dark:text-slate-200 mb-3">Change password</h2>
        <input id="aCurPw" type="password" autocomplete="current-password" placeholder="Current password" class="${INPUT_CLS} mb-2" />
        <input id="aNewPw" type="password" autocomplete="new-password" placeholder="New password (min. 6 characters)" class="${INPUT_CLS} mb-2" />
        <input id="aConfPw" type="password" autocomplete="new-password" placeholder="Confirm new password" class="${INPUT_CLS} mb-3" />
        <button onclick="changeAdminPassword()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">Update password</button>
      </div>
      <div class="${CARD_CLS} flex items-center justify-between">
        <div><h2 class="font-semibold text-slate-700 dark:text-slate-200">Appearance</h2><p class="text-xs text-slate-400">Currently ${dark ? 'dark' : 'light'} mode</p></div>
        <button onclick="toggleTheme(); renderAdminSettings()" class="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold">${dark ? '☀️ Light mode' : '🌙 Dark mode'}</button>
      </div>
      <div class="${CARD_CLS}">
        <h2 class="font-semibold text-slate-700 dark:text-slate-200 mb-1">Data &amp; sync</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">${si.icon} <strong>${si.text}</strong> — ${esc(si.tip)}</p>
        <div class="flex flex-wrap gap-2">
          <button onclick="syncNow()" class="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold">⟳ Sync now</button>
          <button onclick="downloadBackup()" class="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold">⬇ Download backup (JSON)</button>
        </div>
      </div>
      <button onclick="handleLogout()" class="px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm font-semibold">⎋ Logout</button>
    </div>
  `);
}
function saveAdminProfile() {
  const name = $id('aSetName').value.trim(), user = $id('aSetUser').value.trim();
  if (!name) { toast('Display name is required', 'error'); return; }
  if (user.length < 3 || /\s/.test(user)) { toast('Username must be at least 3 characters with no spaces', 'error'); return; }
  const db = getDB(), me = currentAdmin();
  if (db.admins.some(a => a.id !== me.id && a.username.toLowerCase() === user.toLowerCase())) { toast('That username is already taken', 'error'); return; }
  const a = db.admins.find(x => x.id === me.id);
  a.displayName = name; a.username = user;
  setDB(db); toast('Profile saved'); renderAdminSettings();
}
function changeAdminPassword() {
  const cur = $id('aCurPw').value, p1 = $id('aNewPw').value, p2 = $id('aConfPw').value;
  const db = getDB(), me = currentAdmin();
  const a = db.admins.find(x => x.id === me.id);
  if (!checkPw(a, cur)) { toast('Current password is incorrect', 'error'); return; }
  if (p1.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
  if (p1 !== p2) { toast('Passwords do not match', 'error'); return; }
  setPw(a, p1);
  setDB(db); toast('Password updated'); renderAdminSettings();
}
function downloadBackup() {
  const blob = new Blob([JSON.stringify(getDB(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `stratavise-backup-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------------------- Account request flow (public) ---------------------- */
function renderRegister() {
  const db = getDB(), depts = db.departments;
  const terms = (db.settings && db.settings.terms) || DEFAULT_TERMS;
  authShell(`
    <button onclick="location.hash='#/login'" class="text-sm text-slate-400 hover:text-emerald-600 mb-4">← Back to sign in</button>
    <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Request an Account</h2>
    <p class="text-slate-400 text-sm mb-4">New accounts need company approval and payment before they can sign in.</p>
    <div class="space-y-3">
      <div><label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Full Name</label><input id="regName" autocomplete="off" class="${INPUT_CLS}" placeholder="e.g. Juan Dela Cruz" /></div>
      <div class="grid sm:grid-cols-2 gap-3">
        <div><label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Department</label>
          <select id="regDept" class="${INPUT_CLS}">${depts.map(d => `<option value="${esc(d.key)}">${esc(d.label)}</option>`).join('')}</select></div>
        <div><label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Position</label>
          <select id="regRole" class="${INPUT_CLS}"><option value="employee">Employee</option><option value="supervisor">Supervisor</option></select></div>
      </div>
      <div><label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Job Title</label><input id="regJobTitle" class="${INPUT_CLS}" placeholder="e.g. HR Generalist" /></div>
      <div class="grid sm:grid-cols-2 gap-3">
        <div><label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Create Password</label><input id="regPassword" type="password" autocomplete="new-password" class="${INPUT_CLS}" placeholder="Min. 6 characters" /></div>
        <div><label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Confirm Password</label><input id="regPassword2" type="password" autocomplete="new-password" class="${INPUT_CLS}" /></div>
      </div>
      <div class="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-3 text-sm">
        💳 <strong>Payment &amp; coordination required.</strong> Your account is activated only after you coordinate with the company, settle the access fee, and the Administrator approves your request.
      </div>
      <div>
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">Terms &amp; Conditions</p>
        <div class="max-h-44 overflow-y-auto whitespace-pre-line text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3">${esc(terms)}</div>
      </div>
      <label class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><input id="regAgree" type="checkbox" class="mt-1" /> I have read and agree to the Terms &amp; Conditions, and I understand my account will be activated only after payment and admin approval.</label>
      <p id="regError" class="text-red-500 text-sm hidden"></p>
      <button onclick="submitRegister()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg">Submit Request</button>
    </div>
  `);
}
function submitRegister() {
  const v = id => $id(id).value;
  const name = v('regName').trim().replace(/\s+/g, ' '), dept = v('regDept'), role = v('regRole'), jobTitle = v('regJobTitle').trim();
  const pw = v('regPassword'), pw2 = v('regPassword2');
  const err = $id('regError');
  const fail = m => { err.textContent = m; err.classList.remove('hidden'); };
  if (!name || !jobTitle) return fail('Please fill in your name and job title.');
  if (pw.length < 6) return fail('Password must be at least 6 characters.');
  if (pw !== pw2) return fail('Passwords do not match.');
  if (!$id('regAgree').checked) return fail('You must agree to the Terms & Conditions.');
  const db = getDB(), low = name.toLowerCase();
  if (db.users.some(u => u.dept === dept && u.role === role && u.name.toLowerCase() === low)) return fail('An account with this name already exists in that department and position. Try signing in.');
  if (db.accountRequests.some(r => r.status === 'pending' && r.name.toLowerCase() === low && r.dept === dept)) return fail('You already have a pending request. Use "Check my account request status" on the sign-in page.');
  const req = { id: uid('rq'), name, dept, role, jobTitle, status: 'pending', paid: false, ts: Date.now(), date: nowDate(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  setPw(req, pw);
  db.accountRequests.push(req);
  pushNotif(db, { audience: 'admin', type: 'request', title: 'New Account Request', message: 'A new user is requesting admin approval to coordinate.', actionLabel: 'Review', link: '#/admin/requests' });
  setDB(db);
  renderRequestSubmitted(req);
}
function renderRequestSubmitted(req) {
  const db = getDB();
  const step = (n, t, d) => `<li class="flex gap-3"><span class="w-6 h-6 shrink-0 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">${n}</span><span class="text-sm text-slate-600 dark:text-slate-300"><strong>${t}</strong><br/>${d}</span></li>`;
  authShell(`
    <div class="text-center mb-4"><div class="text-4xl mb-2">💳</div>
      <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">Request submitted — payment required</h2>
      <p class="text-slate-400 text-sm">Reference code: <strong class="text-slate-700 dark:text-slate-200 tracking-wider">${esc(req.id.slice(-6).toUpperCase())}</strong></p></div>
    <ol class="space-y-3 mb-4">
      ${step(1, 'Coordinate with the company', 'Contact the company to get the access fee and payment details.')}
      ${step(2, 'Pay the access fee', 'Send your proof of payment and your reference code to the company.')}
      ${step(3, 'Wait for approval', 'Once the Administrator confirms your payment, your account is created and you can sign in.')}
    </ol>
    <div class="whitespace-pre-line text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-300 text-amber-800 dark:text-amber-200 rounded-lg p-3 mb-4">${esc((db.settings && db.settings.paymentInfo) || DEFAULT_PAYMENT_INFO)}</div>
    <div class="flex gap-2">
      <button onclick="location.hash='#/login'" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg">Back to sign in</button>
      <button onclick="location.hash='#/login/status'" class="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold py-2.5 rounded-lg">Check status</button>
    </div>
  `);
}
function renderRequestStatus() {
  authShell(`
    <button onclick="location.hash='#/login'" class="text-sm text-slate-400 hover:text-emerald-600 mb-4">← Back to sign in</button>
    <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Check Request Status</h2>
    <p class="text-slate-400 text-sm mb-4">Enter the name and password you used when you requested your account.</p>
    <input id="stName" autocomplete="off" placeholder="Full name" class="${INPUT_CLS} mb-2" />
    <input id="stPass" type="password" placeholder="Password" class="${INPUT_CLS} mb-3" />
    <button onclick="checkRequestStatus()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg">Check</button>
    <div id="stResult" class="mt-4 text-sm"></div>
  `);
  $id('stPass').addEventListener('keyup', e => { if (e.key === 'Enter') checkRequestStatus(); });
}
function checkRequestStatus() {
  const name = $id('stName').value.trim().toLowerCase(), pw = $id('stPass').value;
  const db = getDB(), out = $id('stResult');
  const box = (cls, html) => { out.innerHTML = `<div class="rounded-lg border p-3 ${cls}">${html}</div>`; };
  if (!name || !pw) return box('border-red-300 bg-red-50 text-red-700', 'Enter your name and password.');
  if (db.users.some(u => u.name.toLowerCase() === name && checkPw(u, pw))) return box('border-emerald-300 bg-emerald-50 text-emerald-800', '✅ <strong>Approved.</strong> Your account is active — go back and sign in.');
  const r = db.accountRequests.slice().reverse().find(x => x.name.toLowerCase() === name && checkPw(x, pw));
  if (!r) return box('border-red-300 bg-red-50 text-red-700', 'No request found with that name and password.');
  if (r.status === 'pending') return box('border-amber-300 bg-amber-50 text-amber-800', r.paid ? '⏳ <strong>Payment received.</strong> Waiting for the Administrator to approve your account.' : '💳 <strong>Awaiting payment.</strong> Please coordinate with the company and send your proof of payment. Reference: ' + esc(r.id.slice(-6).toUpperCase()));
  if (r.status === 'declined') return box('border-red-300 bg-red-50 text-red-700', '❌ <strong>Declined.</strong>' + (r.reason ? ' Reason: ' + esc(r.reason) : '') + ' Please contact the company.');
  box('border-slate-300 bg-slate-50 text-slate-700', 'Status: ' + esc(r.status));
}
