# Stratavise — Performance Appraisal System

A fully working build of the Stratavise flow from your wireframes, now with a full
**Administrator** side on top of the Supervisor/Employee flow: department → position →
name/password sign-in for staff, or a dedicated Administrator login with complete
control over employees, criteria/scoring, departments, and every evaluation.

**Zero-backend build** — static site (no npm install, no build step), all data lives in
the browser's `localStorage`. Deploys to Vercel instantly with no config. Data won't sync
across devices — if you want shared, persistent data across your whole team, say the word
and I'll wire this up to a real database (Postgres via Vercel/Neon/Supabase); the UI won't
need to change much.

## Logging in

**Staff (Supervisor/Employee):** from the main sign-in screen, pick a department → pick
Supervisor or Employee → type a name (autocomplete will suggest matches) → password
**`demo123`** for everyone below.

**Administrator:** click "🔐 Sign in as Administrator" at the bottom of the department
screen. Username **`admin`**, password **`admin123`**.

## The real roster (from your org chart)
| Name | Department | Position | Role |
|---|---|---|---|
| Kayzelle D. Refamonte | Operations | Operations Manager | Supervisor |
| Celine Q. Amolador | HR | HR Generalist | Supervisor |
| Hannah Cate B. Baliuag | Finance | Financial Officer | Supervisor |
| Sam Jean N. Satam | IT / MIS | Web Developer | Supervisor |
| Joseph Benedict L. Gerero | IT / MIS | IT Support | Employee |
| Shaira B. Sauquillo | Sales | Sales Consultant | Supervisor |

The org chart named one person per department (so Leaderboard/Completion Tracker will
mostly only show activity in IT, where there's both a supervisor and an employee). Add
more teammates any time from **Admin → Manage Employees** — no code changes needed.

## What the Administrator can do
Everything, end to end:
- **Manage Employees** — add, edit, or delete any supervisor/employee in any department; reassign department, role, job title; reset passwords.
- **Criteria & Scoring** — add/edit/delete evaluation criteria and their weights (with a live check that they total 100%), edit the performance rating scale tiers, and edit the rewards & benefits table.
- **Departments** — add, rename, or delete departments (icon + color), with a safety check so a department in use can't be deleted out from under its staff.
- **All Evaluations** — view and delete any evaluation submitted company-wide, filterable by department.

## How scoring works
Each criterion (editable by the admin) has a weight; a supervisor rates each 1–5, and
each criterion contributes `(rating/5) × weight` to a 0–100 final score, which maps to a
performance level via the rating scale, and in turn to the rewards & benefits table —
all editable from the Administrator side instead of hardcoded.

## Run it locally
```bash
npx serve .
```
or just open `index.html` directly in a browser.

## Deploy to Vercel
**Option A — CLI**
```bash
npm i -g vercel
cd stratavise-app
vercel --prod
```

**Option B — GitHub + Vercel dashboard**
1. Push this folder to a GitHub repo.
2. Go to vercel.com/new, import the repo.
3. Framework preset: **Other** (it's static — no build command / output directory needed).
4. Deploy.

## What's included
- `index.html` — shell: Tailwind (CDN, dark-mode enabled), Chart.js, SheetJS, jsPDF
- `app.js` — the whole app:
  - Staff sign-in (department → position → searchable name + password) and a separate Administrator sign-in
  - Home — welcome panel, Top Employees of the month, appraisal period summary
  - Incentives Description — criteria weights, rating scale, rewards & benefits (read-only for staff, editable by the admin)
  - Evaluate — choose a colleague, rate every criterion, weighted final score + success confirmation
  - Progress Tracker — Last Evaluation (table + radar chart) and All-time Evaluation history
  - Leaderboard (supervisor) — ranked table + performance-level pie chart + Excel/PDF export
  - Completion Tracker (supervisor) — each supervisor's evaluation completion status
  - Help & Feedback — mood rating + comment, with history
  - Settings — profile picture upload, change password, light/dark mode toggle, logout
  - **Administrator** — Dashboard, Manage Employees, Criteria & Scoring, Departments, All Evaluations (full CRUD on everything above)

## Resetting the demo data
In the browser console on the site:
```js
localStorage.clear(); location.reload();
```
