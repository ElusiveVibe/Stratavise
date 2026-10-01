/* =========================================================
   Stratavise — Performance Appraisal System
   Fully client-side (localStorage) demo build.
   ========================================================= */

const DB_KEY = 'stratavise_db_v1';
const SESSION_KEY = 'stratavise_session_v1';
const THEME_KEY = 'stratavise_theme';

function uid(prefix) { return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9); }
function nowDate() { return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' }); }
function nowTime() { return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
function initials(name) { return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }

const DEPT_META = {
  HR: { label: 'HR Department', icon: '👥', color: 'from-emerald-500 to-teal-600' },
  Marketing: { label: 'Marketing Department', icon: '🏢', color: 'from-amber-500 to-orange-600' },
  Finance: { label: 'Finance Department', icon: '💲', color: 'from-sky-500 to-blue-600' }
};

/* ---------------------- Criteria / Rating scale / Rewards (official reference) ---------------------- */
const CRITERIA = [
  { id: 'c1', name: 'Quality of Work', weight: 25 },
  { id: 'c2', name: 'Productivity and Efficiency', weight: 20 },
  { id: 'c3', name: 'Teamwork and Collaboration', weight: 15 },
  { id: 'c4', name: 'Client/Internal Customer Service', weight: 15 },
  { id: 'c5', name: 'Initiative and Problem Solving', weight: 10 },
  { id: 'c6', name: 'Professional Behaviour and Ethics', weight: 10 },
  { id: 'c7', name: 'Attendance and Reliability', weight: 5 }
];

const RATING_LABELS = [
  { v: 5, label: '5 - Outstanding' },
  { v: 4, label: '4 - Very Good' },
  { v: 3, label: '3 - Good' },
  { v: 2, label: '2 - Satisfactory' },
  { v: 1, label: '1 - Needs Improvement' }
];

const RATING_SCALE = [
  { min: 97, max: 100, label: 'Exceptional Performance' },
  { min: 93, max: 96, label: 'Outstanding Performance' },
  { min: 89, max: 92, label: 'Exceeds Expectations' },
  { min: 85, max: 88, label: 'Highly Satisfactory' },
  { min: 80, max: 84, label: 'Satisfactory' },
  { min: 75, max: 79, label: 'Needs Improvement' },
  { min: 0, max: 74, label: 'Unsatisfactory' }
];

const REWARDS = [
  { level: 'Exceptional Performance', benefits: 'Performance Bonus, Additional Leave Credits, Promotion Priority, Leadership Training', desc: 'Consistently exceeds expectations and demonstrates outstanding contribution to company goals.' },
  { level: 'Outstanding Performance', benefits: 'Performance Bonus, Additional Leave Credits, Recognition Award', desc: 'Regularly exceeds expectations and delivers quality results.' },
  { level: 'Exceeds Expectations', benefits: 'Performance Incentive, Company-Paid Training, Recognition Certificate', desc: 'Performs above standards and contributes positively to team performance.' },
  { level: 'Highly Satisfactory', benefits: 'Training Assistance, Career Development Opportunities', desc: 'Meets all standards and shows potential for growth.' },
  { level: 'Satisfactory', benefits: 'Eligibility for Regular Company Benefits and Salary Review', desc: 'Consistently meets job requirements and expectations.' },
  { level: 'Needs Improvement', benefits: 'Coaching and Development Plan', desc: 'Improvement is needed in certain performance areas.' },
  { level: 'Unsatisfactory', benefits: 'Performance Improvement Plan (PIP) and Monthly Coaching', desc: 'Performance falls below company standards and requires immediate improvement.' }
];

function levelForScore(score) {
  const tier = RATING_SCALE.find(t => score >= t.min && score <= t.max) || RATING_SCALE[RATING_SCALE.length - 1];
  return tier.label;
}

function computeEvaluation(ratings) {
  // ratings: { criteriaId: 1-5 }
  const breakdown = CRITERIA.map(c => {
    const rating = ratings[c.id] || 0;
    const percentage = (rating / 5) * c.weight;
    return { ...c, rating, percentage };
  });
  const finalScore = Math.round(breakdown.reduce((sum, b) => sum + b.percentage, 0) * 10) / 10;
  return { breakdown, finalScore, level: levelForScore(finalScore) };
}

/* ---------------------- Seed data ---------------------- */
function seedDB() {
  const employees = [
    { id: 'u_sam', name: 'Sam Reyes', dept: 'HR', role: 'supervisor', jobTitle: 'HR Manager' },
    { id: 'u_shai', name: 'Shai Bautista', dept: 'HR', role: 'supervisor', jobTitle: 'HR Admin' },
    { id: 'u_celine', name: 'Celine Cruz', dept: 'HR', role: 'supervisor', jobTitle: 'HR Assistant Manager' },
    { id: 'u_kaizel', name: 'Kaizel Ramos', dept: 'HR', role: 'employee', jobTitle: 'HR Associate' },
    { id: 'u_kayzel', name: 'Kayzel Rivera', dept: 'HR', role: 'employee', jobTitle: 'HR Associate' },
    { id: 'u_kayzelle', name: 'Kayzelle Ramirez', dept: 'HR', role: 'employee', jobTitle: 'HR Assistant' },
    { id: 'u_kazel', name: 'Kazel Robles', dept: 'HR', role: 'employee', jobTitle: 'HR Staff' },

    { id: 'u_mark', name: 'Mark Dela Cruz', dept: 'Marketing', role: 'supervisor', jobTitle: 'Marketing Manager' },
    { id: 'u_angela', name: 'Angela Santos', dept: 'Marketing', role: 'employee', jobTitle: 'Marketing Associate' },
    { id: 'u_paulo', name: 'Paulo Mendoza', dept: 'Marketing', role: 'employee', jobTitle: 'Content Strategist' },
    { id: 'u_nina', name: 'Nina Torres', dept: 'Marketing', role: 'employee', jobTitle: 'Social Media Specialist' },

    { id: 'u_rafael', name: 'Rafael Gomez', dept: 'Finance', role: 'supervisor', jobTitle: 'Finance Manager' },
    { id: 'u_liza', name: 'Liza Fernandez', dept: 'Finance', role: 'employee', jobTitle: 'Accountant' },
    { id: 'u_miguel', name: 'Miguel Torres', dept: 'Finance', role: 'employee', jobTitle: 'Financial Analyst' },
    { id: 'u_diana', name: 'Diana Reyes', dept: 'Finance', role: 'employee', jobTitle: 'Bookkeeper' }
  ].map(u => ({ ...u, password: 'demo123', avatar: null }));

  return {
    users: employees,
    evaluations: [],
    feedback: []
  };
}

function getDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) { const seeded = seedDB(); localStorage.setItem(DB_KEY, JSON.stringify(seeded)); return seeded; }
    return JSON.parse(raw);
  } catch (e) {
    const seeded = seedDB(); localStorage.setItem(DB_KEY, JSON.stringify(seeded)); return seeded;
  }
}
function setDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

/* ---------------------- Session ---------------------- */
function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
function setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function currentUser() {
  const s = getSession(); if (!s) return null;
  return getDB().users.find(u => u.id === s.userId) || null;
}

/* ---------------------- Theme ---------------------- */
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
}

/* ---------------------- Router ---------------------- */
// Temp (non-persisted) wizard state for the 3-step sign-in flow
let _loginWizard = { dept: null, role: null };

function router() {
  const hash = location.hash || '#/login';
  const segs = hash.slice(1).split('/').filter(Boolean);
  const session = getSession();

  if (!session && segs[0] !== 'login') { location.hash = '#/login'; return; }
  if (session && segs[0] === 'login') { location.hash = '#/home'; return; }

  if (segs[0] === 'login') {
    if (segs[1] === 'position') return renderLoginPosition(segs[2]);
    if (segs[1] === 'credentials') return renderLoginCredentials(segs[2], segs[3]);
    return renderLoginDept();
  }
  if (segs[0] === 'home') return renderHome();
  if (segs[0] === 'incentives') return renderIncentives();
  if (segs[0] === 'evaluate' && segs[1]) return renderEvaluateForm(segs[1]);
  if (segs[0] === 'evaluate') return renderEvaluateChoose();
  if (segs[0] === 'progress') return renderProgressTracker();
  if (segs[0] === 'help') return renderHelpFeedback();
  if (segs[0] === 'settings') return renderSettings();
  if (segs[0] === 'leaderboard') return renderLeaderboard();
  if (segs[0] === 'completion') return renderCompletionTracker();

  return renderHome();
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => { getDB(); router(); });

/* ---------------------- Shared UI shell ---------------------- */
function appRoot() { return document.getElementById('app'); }

function toast(msg, type) {
  const el = document.createElement('div');
  const color = type === 'error' ? 'bg-red-600' : 'bg-emerald-600';
  el.className = `fixed top-4 right-4 z-50 ${color} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; }, 1800);
  setTimeout(() => { el.remove(); }, 2200);
}

function closeModal() { const m = document.getElementById('modalRoot'); if (m) m.innerHTML = ''; }

function avatarHtml(user, size) {
  size = size || 10;
  if (user && user.avatar) {
    return `<img src="${user.avatar}" class="w-${size} h-${size} rounded-full object-cover" />`;
  }
  return `<div class="w-${size} h-${size} rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 text-white flex items-center justify-center font-bold text-sm">${user ? initials(user.name) : '?'}</div>`;
}

function navItems(role) {
  const base = [
    { key: 'home', label: 'Home Page', icon: '🏠' },
    { key: 'incentives', label: 'Incentives Description', icon: '🎁' },
    { key: 'evaluate', label: 'Evaluate', icon: '📝' },
    { key: 'progress', label: 'Progress Tracker', icon: '📈' }
  ];
  if (role === 'supervisor') {
    base.push({ key: 'leaderboard', label: 'Leaderboard', icon: '🏆' });
    base.push({ key: 'completion', label: 'Completion Tracker', icon: '✅' });
  }
  base.push({ key: 'help', label: 'Help & Feedback', icon: '💬' });
  base.push({ key: 'settings', label: 'Settings', icon: '⚙️' });
  return base;
}

function sidebarShell(activeKey, innerHtml) {
  const user = currentUser();
  if (!user) { location.hash = '#/login'; return; }
  const items = navItems(user.role);

  appRoot().innerHTML = `
  <div class="min-h-screen flex bg-slate-100 dark:bg-slate-900 transition-colors">
    <aside class="w-60 shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        ${avatarHtml(user, 11)}
        <div class="min-w-0">
          <p class="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">${user.name}</p>
          <p class="text-xs text-slate-400 truncate">${user.dept} &middot; ${user.jobTitle}</p>
        </div>
      </div>
      <nav class="flex-1 py-2">
        ${items.map(it => `
          <a href="#/${it.key}" class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${activeKey === it.key ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-r-4 border-emerald-500' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}">
            <span>${it.icon}</span><span>${it.label}</span>
          </a>`).join('')}
      </nav>
      <div class="p-4 border-t border-slate-200 dark:border-slate-700">
        <button onclick="handleLogout()" class="text-sm text-red-500 hover:text-red-600 font-medium w-full text-left">⎋ Logout</button>
      </div>
    </aside>
    <main class="flex-1 min-w-0 p-6 overflow-x-hidden">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
          <span>📈</span><span>stratavise</span>
        </div>
      </div>
      ${innerHtml}
    </main>
  </div>
  <div id="modalRoot"></div>
  `;
}

function handleLogout() {
  clearSession();
  _loginWizard = { dept: null, role: null };
  location.hash = '#/login';
}

/* ---------------------- LOGIN: Step 1 - Choose Department ---------------------- */
function authShell(innerHtml) {
  appRoot().innerHTML = `
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 p-4">
    <div class="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
        <span>📈</span><span>sign in with stratavise</span>
      </div>
      <div class="p-8">${innerHtml}</div>
    </div>
  </div>`;
}

function renderLoginDept() {
  _loginWizard = { dept: null, role: null };
  const cards = Object.entries(DEPT_META).map(([key, meta]) => `
    <button onclick="location.hash='#/login/position/${key}'" class="flex flex-col items-center gap-3 border-2 border-slate-200 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-400 rounded-xl p-6 transition group">
      <div class="w-16 h-16 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-3xl">${meta.icon}</div>
      <span class="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">${meta.label}</span>
    </button>`).join('');

  authShell(`
    <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center mb-1">Choose your department</h1>
    <p class="text-slate-400 text-center mb-8">to continue to evaluate</p>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">${cards}</div>
  `);
}

/* ---------------------- LOGIN: Step 2 - Choose Position ---------------------- */
function renderLoginPosition(dept) {
  if (!DEPT_META[dept]) { location.hash = '#/login'; return; }
  _loginWizard.dept = dept;

  authShell(`
    <button onclick="location.hash='#/login'" class="text-sm text-slate-400 hover:text-slate-600 mb-4">&larr; Back</button>
    <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center mb-1">Choose your position</h1>
    <p class="text-slate-400 text-center mb-8">${DEPT_META[dept].label}</p>
    <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
      <button onclick="location.hash='#/login/credentials/${dept}/supervisor'" class="flex flex-col items-center gap-3 border-2 border-slate-200 dark:border-slate-600 hover:border-emerald-400 rounded-xl p-8 transition">
        <span class="text-3xl">🧑‍💼</span>
        <span class="font-semibold text-slate-700 dark:text-slate-200">Supervisor</span>
      </button>
      <button onclick="location.hash='#/login/credentials/${dept}/employee'" class="flex flex-col items-center gap-3 border-2 border-slate-200 dark:border-slate-600 hover:border-emerald-400 rounded-xl p-8 transition">
        <span class="text-3xl">🧑‍💻</span>
        <span class="font-semibold text-slate-700 dark:text-slate-200">Employee</span>
      </button>
    </div>
  `);
}

/* ---------------------- LOGIN: Step 3 - Name + Password ---------------------- */
function renderLoginCredentials(dept, role) {
  if (!DEPT_META[dept] || (role !== 'supervisor' && role !== 'employee')) { location.hash = '#/login'; return; }
  _loginWizard = { dept, role };
  const db = getDB();
  const candidates = db.users.filter(u => u.dept === dept && u.role === role);

  authShell(`
    <button onclick="location.hash='#/login/position/${dept}'" class="text-sm text-slate-400 hover:text-slate-600 mb-4">&larr; Back</button>
    <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-1">${DEPT_META[dept].label} — ${role === 'supervisor' ? 'Supervisor' : 'Employee'}</h1>
    <p class="text-slate-400 text-center text-sm mb-6">Before you sign in, make sure you are part of the evaluator list.</p>
    <div class="max-w-sm mx-auto">
      <label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Name</label>
      <div class="relative mb-4">
        <input id="loginNameInput" autocomplete="off" placeholder="Start typing your name..." class="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <span class="absolute right-3 top-2.5 text-slate-400">🔍</span>
        <div id="nameSuggestions" class="absolute z-10 w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg mt-1 shadow-lg hidden max-h-44 overflow-y-auto"></div>
      </div>
      <label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Password</label>
      <input id="loginPasswordInput" type="password" placeholder="Enter password" class="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 mb-2" />
      <p id="loginCredError" class="text-red-500 text-sm hidden mb-2">Name not found or password incorrect.</p>
      <button onclick="submitLogin('${dept}','${role}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition">Login</button>
      <div class="mt-5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 leading-relaxed">
        Demo accounts in this department/role (data lives in this browser only). Password for every seeded account: <strong>demo123</strong><br/>
        ${candidates.map(c => `&bull; ${c.name}`).join('<br/>') || '<em>No seeded accounts for this combination.</em>'}
      </div>
    </div>
  `);

  let selectedUserId = null;
  const input = document.getElementById('loginNameInput');
  const box = document.getElementById('nameSuggestions');

  input.addEventListener('input', () => {
    selectedUserId = null;
    const q = input.value.trim().toLowerCase();
    if (!q) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    const matches = candidates.filter(c => c.name.toLowerCase().includes(q));
    if (!matches.length) { box.innerHTML = `<div class="px-3 py-2 text-slate-400 text-sm">No matches</div>`; box.classList.remove('hidden'); return; }
    box.innerHTML = matches.map(m => `<div data-id="${m.id}" class="suggestionRow px-3 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/40 cursor-pointer text-slate-700 dark:text-slate-200">${m.name}</div>`).join('');
    box.classList.remove('hidden');
    box.querySelectorAll('.suggestionRow').forEach(row => {
      row.addEventListener('click', () => {
        const u = candidates.find(c => c.id === row.getAttribute('data-id'));
        input.value = u.name;
        selectedUserId = u.id;
        box.classList.add('hidden');
      });
    });
  });
  document.addEventListener('click', (e) => {
    if (!box.contains(e.target) && e.target !== input) box.classList.add('hidden');
  });

  window._pendingLoginLookup = () => selectedUserId;
}

function submitLogin(dept, role) {
  const name = document.getElementById('loginNameInput').value.trim();
  const password = document.getElementById('loginPasswordInput').value;
  const db = getDB();
  const user = db.users.find(u => u.dept === dept && u.role === role && u.name.toLowerCase() === name.toLowerCase());
  const err = document.getElementById('loginCredError');
  if (!user || user.password !== password) {
    err.classList.remove('hidden');
    return;
  }
  setSession({ userId: user.id });
  toast(`Welcome back, ${user.name.split(' ')[0]}!`);
  location.hash = '#/home';
}

/* ---------------------- HOME ---------------------- */
function latestEvalFor(db, employeeId) {
  const evs = db.evaluations.filter(e => e.employeeId === employeeId);
  if (!evs.length) return null;
  return evs.slice().sort((a, b) => b.ts - a.ts)[0];
}

function renderHome() {
  const user = currentUser(); if (!user) return;
  const db = getDB();
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Top employees: highest latest-eval score, company-wide
  const scored = db.users
    .filter(u => u.role === 'employee')
    .map(u => ({ user: u, ev: latestEvalFor(db, u.id) }))
    .filter(x => x.ev)
    .sort((a, b) => b.ev.finalScore - a.ev.finalScore)
    .slice(0, 3);

  const quotes = [
    '"Excellence is not a skill, it\u2019s an attitude." — keep showing up.',
    '"Small steps every day lead to big results."',
    '"Great teams are built one honest evaluation at a time."'
  ];
  const quote = quotes[new Date().getDate() % quotes.length];

  const topCards = scored.map(({ user: u, ev }) => `
    <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-4 flex flex-col items-center text-center">
      ${avatarHtml(u, 14)}
      <p class="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-2">${u.name}</p>
      <p class="text-xs text-slate-400">${u.dept} &middot; ${u.jobTitle}</p>
      <span class="mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">${ev.finalScore}% &middot; ${ev.level}</span>
    </div>`).join('') || `<p class="text-slate-400 text-sm col-span-full text-center py-6">No evaluations recorded yet this period.</p>`;

  sidebarShell('home', `
    <div class="grid lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5 mb-5">
          <h2 class="font-bold text-slate-800 dark:text-slate-100 mb-1">Welcome back, ${user.name.split(' ')[0]} 👋</h2>
          <p class="text-sm text-slate-400">${user.dept} Department &middot; ${user.jobTitle}</p>
        </div>
        <h3 class="font-semibold text-slate-600 dark:text-slate-300 text-sm mb-3">TOP EMPLOYEES FOR ${monthLabel.toUpperCase()}</h3>
        <div class="grid sm:grid-cols-3 gap-4 mb-5">${topCards}</div>
        <div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white">
          <p class="text-sm italic">${quote}</p>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5 h-fit">
        <h3 class="font-bold text-slate-800 dark:text-slate-100 mb-2">📋 Performance Appraisal</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">It is conducted for <strong class="text-slate-700 dark:text-slate-200">${monthLabel}</strong>, evaluating staff against the company's 7 core performance criteria — quality, productivity, teamwork, service, initiative, conduct, and attendance.</p>
        <button onclick="location.hash='#/incentives'" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-lg">See Incentives Description for more info</button>
        ${user.role === 'supervisor' ? `<button onclick="location.hash='#/evaluate'" class="w-full mt-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold py-2 rounded-lg">Go to Evaluate</button>` : ''}
      </div>
    </div>
  `);
}

/* ---------------------- INCENTIVES DESCRIPTION ---------------------- */
function renderIncentives() {
  const user = currentUser(); if (!user) return;

  const criteriaRows = CRITERIA.map(c => `<tr class="border-b last:border-0 border-slate-100 dark:border-slate-700"><td class="py-2 text-slate-700 dark:text-slate-200">${c.name}</td><td class="py-2 text-right font-semibold text-slate-700 dark:text-slate-200">${c.weight}%</td></tr>`).join('');
  const totalWeight = CRITERIA.reduce((a, c) => a + c.weight, 0);

  const scaleRows = RATING_SCALE.map(r => `<tr class="border-b last:border-0 border-slate-100 dark:border-slate-700"><td class="py-2 text-slate-700 dark:text-slate-200">${r.min}${r.max === 100 && r.min === 97 ? '-100' : '-' + r.max}</td><td class="py-2 text-slate-700 dark:text-slate-200">${r.label}</td></tr>`).join('');

  const rewardRows = REWARDS.map(r => `
    <tr class="border-b last:border-0 border-slate-100 dark:border-slate-700 align-top">
      <td class="py-3 pr-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">${r.level}</td>
      <td class="py-3 pr-3 text-slate-600 dark:text-slate-300">${r.benefits}</td>
      <td class="py-3 text-slate-500 dark:text-slate-400">${r.desc}</td>
    </tr>`).join('');

  sidebarShell('incentives', `
    <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-5">🎁 Incentives Description</h1>

    <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5 mb-5">
      <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-3">Performance Criteria</h3>
      <table class="w-full text-sm max-w-md">
        <thead><tr class="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700"><th class="py-2">Criteria</th><th class="py-2 text-right">Weight</th></tr></thead>
        <tbody>${criteriaRows}<tr><td class="py-2 font-bold text-slate-800 dark:text-slate-100">Total</td><td class="py-2 text-right font-bold text-slate-800 dark:text-slate-100">${totalWeight}%</td></tr></tbody>
      </table>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5 mb-5">
      <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-3">Performance Rating Scale</h3>
      <table class="w-full text-sm max-w-md">
        <thead><tr class="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700"><th class="py-2">Final Score</th><th class="py-2">Performance Level</th></tr></thead>
        <tbody>${scaleRows}</tbody>
      </table>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5 overflow-x-auto">
      <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-3">Rewards &amp; Benefits</h3>
      <table class="w-full text-sm min-w-[600px]">
        <thead><tr class="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700"><th class="py-2">Performance Level</th><th class="py-2">Benefits Granted</th><th class="py-2">Description</th></tr></thead>
        <tbody>${rewardRows}</tbody>
      </table>
    </div>
  `);
}

/* ---------------------- EVALUATE: Choose who ---------------------- */
let _evalSearch = '';

function renderEvaluateChoose() {
  const user = currentUser(); if (!user) return;
  const db = getDB();
  // Supervisors evaluate employees in their own department; employees can peer-evaluate colleagues in their dept
  const pool = db.users.filter(u => u.dept === user.dept && u.id !== user.id);
  const filtered = pool.filter(u => !_evalSearch || u.name.toLowerCase().includes(_evalSearch.toLowerCase()));

  const cards = filtered.map(u => `
    <button onclick="location.hash='#/evaluate/${u.id}'" class="text-left bg-white dark:bg-slate-800 rounded-xl card-shadow p-4 flex items-center gap-3 hover:ring-2 hover:ring-emerald-400 transition">
      ${avatarHtml(u, 12)}
      <div class="min-w-0">
        <p class="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">${u.name}</p>
        <p class="text-xs text-slate-400 truncate">${u.dept} &middot; ${u.jobTitle}</p>
      </div>
    </button>`).join('') || `<p class="text-slate-400 text-sm col-span-full text-center py-10">No one to evaluate here.</p>`;

  sidebarShell('evaluate', `
    <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Choose who to evaluate</h1>
    <div class="relative max-w-md mb-5">
      <input id="evalSearchInput" value="${_evalSearch}" placeholder="Search Bar" class="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 pr-9" />
      <span class="absolute right-3 top-2.5 text-slate-400">🔍</span>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>
  `);

  document.getElementById('evalSearchInput').addEventListener('input', (e) => {
    _evalSearch = e.target.value;
    renderEvaluateChoose();
  });
  document.getElementById('evalSearchInput').focus();
  document.getElementById('evalSearchInput').selectionStart = document.getElementById('evalSearchInput').value.length;
}

/* ---------------------- EVALUATE: Rating form ---------------------- */
function renderEvaluateForm(employeeId) {
  const user = currentUser(); if (!user) return;
  const db = getDB();
  const emp = db.users.find(u => u.id === employeeId);
  if (!emp) { location.hash = '#/evaluate'; return; }

  const sections = CRITERIA.map((c, idx) => `
    <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow mb-4 overflow-hidden">
      <div class="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3 font-semibold">${c.name} <span class="text-xs font-normal opacity-80">(${c.weight}% weight)</span></div>
      <div class="p-5">
        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">1. Employee is ${c.name.toLowerCase().includes('attendance') ? 'punctual and reliable' : c.name.toLowerCase().includes('teamwork') ? 'collaborative with the team' : c.name.toLowerCase().includes('initiative') ? 'proactive in solving problems' : c.name.toLowerCase().includes('professional') ? 'professional and ethical' : c.name.toLowerCase().includes('client') ? 'responsive to client/internal needs' : 'performing in this area'}...</p>
        <div class="space-y-1">
          ${RATING_LABELS.map(r => `
            <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer py-1">
              <input type="radio" name="rate_${c.id}" value="${r.v}" class="rateRadio accent-emerald-600" data-cid="${c.id}" />
              ${r.label}
            </label>`).join('')}
        </div>
      </div>
    </div>`).join('');

  sidebarShell('evaluate', `
    <button onclick="location.hash='#/evaluate'" class="text-sm text-slate-400 hover:text-slate-600 mb-4">&larr; Back</button>
    <div class="flex items-center gap-3 mb-5">
      ${avatarHtml(emp, 12)}
      <div>
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Evaluating ${emp.name}</h1>
        <p class="text-sm text-slate-400">${emp.dept} &middot; ${emp.jobTitle}</p>
      </div>
    </div>
    <div class="max-w-2xl">
      ${sections}
      <div class="flex justify-end gap-2 mt-4">
        <button onclick="location.hash='#/evaluate'" class="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
        <button onclick="submitEvaluation('${emp.id}')" class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Submit Evaluation</button>
      </div>
    </div>
  `);
}

function submitEvaluation(employeeId) {
  const radios = document.querySelectorAll('.rateRadio:checked');
  if (radios.length !== CRITERIA.length) {
    toast('Please rate every criterion before submitting', 'error');
    return;
  }
  const ratings = {};
  radios.forEach(r => { ratings[r.getAttribute('data-cid')] = Number(r.value); });

  const user = currentUser();
  const db = getDB();
  const { finalScore, level } = computeEvaluation(ratings);
  const record = {
    id: uid('ev'),
    employeeId,
    evaluatorId: user.id,
    ts: Date.now(),
    date: nowDate(),
    time: nowTime(),
    ratings,
    finalScore,
    level
  };
  db.evaluations.push(record);
  setDB(db);
  showEvalSuccessModal(record);
}

function showEvalSuccessModal(record) {
  document.getElementById('modalRoot').innerHTML = `
  <div class="fixed inset-0 modal-backdrop flex items-center justify-center z-40 p-4">
    <div class="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl text-center p-6">
      <div class="text-4xl mb-2">✅</div>
      <h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">Done Successfully!</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400">Date Completed: ${record.date}</p>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Time Completed: ${record.time}</p>
      <p class="text-sm mb-4"><span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold px-3 py-1 rounded-full">${record.finalScore}% &middot; ${record.level}</span></p>
      <button onclick="closeModal(); location.hash='#/evaluate'" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg">Back to Evaluate</button>
    </div>
  </div>`;
}

/* ---------------------- PROGRESS TRACKER ---------------------- */
let _progressTab = 'last';
let _radarChart = null;

function renderProgressTracker() {
  const user = currentUser(); if (!user) return;
  const db = getDB();
  const myEvals = db.evaluations.filter(e => e.employeeId === user.id).sort((a, b) => b.ts - a.ts);

  const tabs = `
    <div class="flex gap-2 mb-5">
      <button onclick="_progressTab='last'; renderProgressTracker()" class="px-4 py-2 rounded-lg text-sm font-semibold ${_progressTab === 'last' ? 'bg-slate-700 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}">Last Evaluation</button>
      <button onclick="_progressTab='all'; renderProgressTracker()" class="px-4 py-2 rounded-lg text-sm font-semibold ${_progressTab === 'all' ? 'bg-slate-700 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}">All-time Evaluation</button>
    </div>`;

  if (!myEvals.length) {
    sidebarShell('progress', `<h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">📈 Progress Tracker</h1>${tabs}<p class="text-slate-400 text-sm">No evaluations recorded yet.</p>`);
    return;
  }

  if (_progressTab === 'last') {
    const ev = myEvals[0];
    const rows = CRITERIA.map(c => `
      <tr class="border-b last:border-0 border-slate-100 dark:border-slate-700">
        <td class="py-2 text-slate-700 dark:text-slate-200">${c.name}</td>
        <td class="py-2 text-slate-700 dark:text-slate-200">${ev.ratings[c.id]}/5</td>
        <td class="py-2 text-slate-700 dark:text-slate-200">${Math.round(((ev.ratings[c.id] / 5) * c.weight) * 10) / 10}%</td>
      </tr>`).join('');

    sidebarShell('progress', `
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">📈 Progress Tracker</h1>
      ${tabs}
      <p class="text-sm text-slate-400 mb-3">Date: ${ev.date}</p>
      <div class="grid lg:grid-cols-2 gap-5">
        <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5">
          <table class="w-full text-sm mb-4">
            <thead><tr class="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700"><th class="py-2">Criteria</th><th class="py-2">Score</th><th class="py-2">Percentage</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-4 text-center">
            <span class="text-2xl font-bold text-emerald-700 dark:text-emerald-300">${ev.finalScore}%</span>
            <p class="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">${ev.level}</p>
          </div>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5">
          <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Performance Radar</h3>
          <canvas id="radarChartCanvas" height="260"></canvas>
        </div>
      </div>
    `);

    if (_radarChart) _radarChart.destroy();
    const ctx = document.getElementById('radarChartCanvas');
    _radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: CRITERIA.map(c => c.name),
        datasets: [{ label: 'Rating (out of 5)', data: CRITERIA.map(c => ev.ratings[c.id]), backgroundColor: 'rgba(16,185,129,0.25)', borderColor: '#10b981', pointBackgroundColor: '#10b981' }]
      },
      options: { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
    });
  } else {
    const historyCards = myEvals.map(ev => `
      <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-4">
        <p class="text-xs text-slate-400 mb-1">Date: ${ev.date}</p>
        <p class="text-2xl font-bold text-slate-800 dark:text-slate-100">${ev.finalScore}%</p>
        <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">${ev.level}</p>
        ${CRITERIA.map(c => `<p class="text-xs text-slate-500 dark:text-slate-400">${c.name.length > 20 ? c.name.slice(0, 20) + '…' : c.name} — ${Math.round(((ev.ratings[c.id] / 5) * c.weight) * 10) / 10}%</p>`).join('')}
      </div>`).join('');

    sidebarShell('progress', `
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">📈 Progress Tracker</h1>
      ${tabs}
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${historyCards}</div>
    `);
  }
}

/* ---------------------- HELP & FEEDBACK ---------------------- */
let _selectedMood = null;

function renderHelpFeedback() {
  const user = currentUser(); if (!user) return;
  _selectedMood = null;

  sidebarShell('help', `
    <div class="max-w-lg">
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">How did we do?</h1>
      <p class="text-sm text-slate-400 mb-6">How was your support experience? We'll appreciate your honest feedback.</p>
      <div class="grid grid-cols-3 gap-3 mb-5">
        <button onclick="selectMood('great', this)" class="moodBtn flex flex-col items-center gap-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl p-5 hover:border-emerald-400 transition">
          <span class="text-3xl">😊</span><span class="text-sm font-medium text-slate-600 dark:text-slate-300">Great</span>
        </button>
        <button onclick="selectMood('okay', this)" class="moodBtn flex flex-col items-center gap-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl p-5 hover:border-amber-400 transition">
          <span class="text-3xl">😐</span><span class="text-sm font-medium text-slate-600 dark:text-slate-300">Okay</span>
        </button>
        <button onclick="selectMood('not_good', this)" class="moodBtn flex flex-col items-center gap-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl p-5 hover:border-red-400 transition">
          <span class="text-3xl">🙁</span><span class="text-sm font-medium text-slate-600 dark:text-slate-300">Not Good</span>
        </button>
      </div>
      <label class="block text-sm text-slate-500 dark:text-slate-300 mb-1">Would you like to add a comment?</label>
      <textarea id="feedbackComment" rows="3" class="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 mb-4"></textarea>
      <button onclick="sendFeedback()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg">Send</button>

      <div class="mt-8">
        <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Your past feedback</h3>
        <div id="feedbackHistory" class="space-y-2"></div>
      </div>
    </div>
  `);
  renderFeedbackHistory();
}

function selectMood(mood, btn) {
  _selectedMood = mood;
  document.querySelectorAll('.moodBtn').forEach(b => b.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/30'));
  btn.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/30');
}

function sendFeedback() {
  if (!_selectedMood) { toast('Please select how we did', 'error'); return; }
  const user = currentUser();
  const db = getDB();
  db.feedback.push({ id: uid('fb'), userId: user.id, mood: _selectedMood, comment: document.getElementById('feedbackComment').value.trim(), date: nowDate() });
  setDB(db);
  toast('Thank you for your feedback!');
  renderHelpFeedback();
}

function renderFeedbackHistory() {
  const user = currentUser();
  const db = getDB();
  const mine = db.feedback.filter(f => f.userId === user.id).slice().reverse();
  const moodEmoji = { great: '😊 Great', okay: '😐 Okay', not_good: '🙁 Not Good' };
  const el = document.getElementById('feedbackHistory');
  if (!el) return;
  el.innerHTML = mine.map(f => `
    <div class="bg-white dark:bg-slate-800 rounded-lg card-shadow p-3 text-sm">
      <span class="font-medium text-slate-700 dark:text-slate-200">${moodEmoji[f.mood]}</span>
      <span class="text-slate-400 text-xs"> &middot; ${f.date}</span>
      ${f.comment ? `<p class="text-slate-500 dark:text-slate-400 mt-1">${f.comment}</p>` : ''}
    </div>`).join('') || `<p class="text-slate-400 text-sm">No feedback submitted yet.</p>`;
}

/* ---------------------- SETTINGS ---------------------- */
function renderSettings() {
  const user = currentUser(); if (!user) return;
  const isDark = document.documentElement.classList.contains('dark');

  sidebarShell('settings', `
    <div class="max-w-md">
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-5">⚙️ Settings</h1>
      <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-6 text-center mb-5">
        <div class="flex justify-center mb-2">${avatarHtml(user, 20)}</div>
        <p class="font-semibold text-slate-800 dark:text-slate-100">${user.name}</p>
        <p class="text-xs text-slate-400 mb-4">${user.dept} &middot; ${user.jobTitle}</p>
        <label class="inline-block cursor-pointer text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium px-4 py-2 rounded-lg">
          Change Profile Picture
          <input type="file" id="avatarInput" accept="image/*" class="hidden" />
        </label>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5 mb-5">
        <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-3">Change Password</h3>
        <input id="newPassword" type="password" placeholder="New password" class="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 mb-2" />
        <input id="confirmPassword" type="password" placeholder="Confirm new password" class="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 mb-3" />
        <button onclick="changePassword()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">Update Password</button>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-5 mb-5 flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-slate-700 dark:text-slate-200">Light Mode / Dark Mode</h3>
          <p class="text-xs text-slate-400">Currently: ${isDark ? 'Dark' : 'Light'}</p>
        </div>
        <button onclick="toggleTheme(); renderSettings();" class="w-14 h-8 rounded-full ${isDark ? 'bg-emerald-600' : 'bg-slate-300'} relative transition">
          <span class="absolute top-1 ${isDark ? 'right-1' : 'left-1'} w-6 h-6 rounded-full bg-white shadow transition-all"></span>
        </button>
      </div>

      <button onclick="handleLogout()" class="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg">Logout</button>
    </div>
  `);

  document.getElementById('avatarInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const db = getDB();
      const u = db.users.find(x => x.id === user.id);
      u.avatar = reader.result;
      setDB(db);
      toast('Profile picture updated');
      renderSettings();
    };
    reader.readAsDataURL(file);
  });
}

function changePassword() {
  const p1 = document.getElementById('newPassword').value;
  const p2 = document.getElementById('confirmPassword').value;
  if (!p1 || p1.length < 4) { toast('Password must be at least 4 characters', 'error'); return; }
  if (p1 !== p2) { toast('Passwords do not match', 'error'); return; }
  const user = currentUser();
  const db = getDB();
  db.users.find(u => u.id === user.id).password = p1;
  setDB(db);
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  toast('Password updated');
}

/* ---------------------- LEADERBOARD (Supervisor) ---------------------- */
let _leaderboardPie = null;

function renderLeaderboard() {
  const user = currentUser(); if (!user) return;
  if (user.role !== 'supervisor') { location.hash = '#/home'; return; }
  const db = getDB();

  const ranked = db.users
    .filter(u => u.dept === user.dept && u.role === 'employee')
    .map(u => ({ user: u, ev: latestEvalFor(db, u.id) }))
    .filter(x => x.ev)
    .sort((a, b) => b.ev.finalScore - a.ev.finalScore);

  const rows = ranked.map((x, idx) => `
    <tr class="border-b last:border-0 border-slate-100 dark:border-slate-700">
      <td class="py-2 text-slate-700 dark:text-slate-200 font-semibold">${idx + 1}</td>
      <td class="py-2 text-slate-700 dark:text-slate-200">${x.user.name}</td>
      <td class="py-2 text-slate-500 dark:text-slate-400">${x.user.jobTitle}</td>
      <td class="py-2 text-slate-700 dark:text-slate-200">${(x.ev.finalScore / 20).toFixed(1)}/5</td>
      <td class="py-2 text-slate-700 dark:text-slate-200">${x.ev.finalScore}%</td>
      <td class="py-2"><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">${x.ev.level}</span></td>
    </tr>`).join('') || `<tr><td colspan="6" class="py-6 text-center text-slate-400">No evaluations yet in this department.</td></tr>`;

  // Distribution of performance levels
  const dist = {};
  RATING_SCALE.forEach(t => dist[t.label] = 0);
  ranked.forEach(x => { dist[x.ev.level] = (dist[x.ev.level] || 0) + 1; });
  const distLabels = Object.keys(dist).filter(k => dist[k] > 0);
  const distData = distLabels.map(k => dist[k]);

  sidebarShell('leaderboard', `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">🏆 Leaderboard — ${user.dept} Department</h1>
      <div class="flex gap-2">
        <button onclick="exportLeaderboardExcel()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-lg">⬇ Excel</button>
        <button onclick="exportLeaderboardPDF()" class="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-2 rounded-lg">⬇ PDF</button>
      </div>
    </div>
    <div class="grid lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl card-shadow p-4 overflow-x-auto">
        <table class="w-full text-sm min-w-[500px]">
          <thead><tr class="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <th class="py-2">Rank</th><th class="py-2">Name</th><th class="py-2">Position</th><th class="py-2">Score</th><th class="py-2">Percentage</th><th class="py-2">Performance Level</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-4">
        <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Performance Level Distribution</h3>
        <canvas id="leaderboardPie" height="220"></canvas>
      </div>
    </div>
  `);

  if (_leaderboardPie) _leaderboardPie.destroy();
  const ctx = document.getElementById('leaderboardPie');
  if (ctx) {
    _leaderboardPie = new Chart(ctx, {
      type: 'pie',
      data: { labels: distLabels, datasets: [{ data: distData, backgroundColor: ['#6ee7b7', '#7dd3fc', '#fde68a', '#fca5a5', '#c4b5fd', '#fdba74', '#f9a8d4'] }] },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
    });
  }
}

function exportLeaderboardExcel() {
  const user = currentUser();
  const db = getDB();
  const ranked = db.users.filter(u => u.dept === user.dept && u.role === 'employee')
    .map(u => ({ user: u, ev: latestEvalFor(db, u.id) })).filter(x => x.ev)
    .sort((a, b) => b.ev.finalScore - a.ev.finalScore);
  const data = ranked.map((x, idx) => ({
    Rank: idx + 1, Name: x.user.name, Position: x.user.jobTitle,
    Score: (x.ev.finalScore / 20).toFixed(1) + '/5', Percentage: x.ev.finalScore + '%', 'Performance Level': x.ev.level
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard');
  XLSX.writeFile(wb, `leaderboard_${user.dept}.xlsx`);
}

function exportLeaderboardPDF() {
  const user = currentUser();
  const db = getDB();
  const ranked = db.users.filter(u => u.dept === user.dept && u.role === 'employee')
    .map(u => ({ user: u, ev: latestEvalFor(db, u.id) })).filter(x => x.ev)
    .sort((a, b) => b.ev.finalScore - a.ev.finalScore);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Leaderboard — ${user.dept} Department`, 14, 16);
  doc.autoTable({
    startY: 22,
    head: [['Rank', 'Name', 'Position', 'Score', 'Percentage', 'Performance Level']],
    body: ranked.map((x, idx) => [idx + 1, x.user.name, x.user.jobTitle, (x.ev.finalScore / 20).toFixed(1) + '/5', x.ev.finalScore + '%', x.ev.level])
  });
  doc.save(`leaderboard_${user.dept}.pdf`);
}

/* ---------------------- COMPLETION TRACKER (Supervisor) ---------------------- */
function renderCompletionTracker() {
  const user = currentUser(); if (!user) return;
  if (user.role !== 'supervisor') { location.hash = '#/home'; return; }
  const db = getDB();

  const supervisors = db.users.filter(u => u.dept === user.dept && u.role === 'supervisor');
  const employeeCount = db.users.filter(u => u.dept === user.dept && u.role === 'employee').length;

  const rows = supervisors.map(sup => {
    const evaluatedIds = new Set(db.evaluations.filter(e => e.evaluatorId === sup.id).map(e => e.employeeId));
    const count = evaluatedIds.size;
    let status, colorClass;
    if (count === 0) { status = 'Not Yet Started'; colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'; }
    else if (count >= employeeCount && employeeCount > 0) { status = 'Completed'; colorClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'; }
    else { status = 'Pending'; colorClass = 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'; }
    return `
      <tr class="border-b last:border-0 border-slate-100 dark:border-slate-700">
        <td class="py-2 text-slate-700 dark:text-slate-200">${sup.name}</td>
        <td class="py-2 text-slate-500 dark:text-slate-400">${sup.jobTitle}</td>
        <td class="py-2 text-slate-700 dark:text-slate-200">${count}/${employeeCount}</td>
        <td class="py-2"><span class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}">${status}</span></td>
      </tr>`;
  }).join('');

  sidebarShell('completion', `
    <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-5">✅ Completion Tracker — ${user.dept} Department</h1>
    <div class="bg-white dark:bg-slate-800 rounded-xl card-shadow p-4 overflow-x-auto">
      <table class="w-full text-sm min-w-[500px]">
        <thead><tr class="text-left text-slate-400 border-b border-slate-200 dark:border-slate-700">
          <th class="py-2">Name</th><th class="py-2">Position</th><th class="py-2">No. of Employees Evaluated</th><th class="py-2">Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}
