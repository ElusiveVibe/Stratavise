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

**New employee?** Click "+ New Employee? Create an Account" on the department screen —
fill in name, department, position, and job title, and the account is created with
password **`demo123`** and you're signed straight in (no admin step needed).

## The roster (from your org chart + formal pictures)
| Name | Department | Job title | Role |
|---|---|---|---|
| Kayzelle D. Refamonte | Operations | Operations Manager | **Supervisor** |
| Sam Jean N. Satam | IT / MIS | Web Developer | **Supervisor** |
| Celine Q. Amolador | HR | HR Generalist | Employee |
| Hannah Cate B. Baliuag | Finance | Finance Officer | Employee |
| Joseph Benedict L. Gerero | IT / MIS | IT Support | Employee |
| Shaira B. Sauquillo | Sales | Sales Consultant | Employee |

Formal pictures live in `assets/avatars/`. Everyone in the team can evaluate everyone else
(the roster has about one person per department), and only supervisors see the Leaderboard
and Completion Tracker.

## What changed in this update (from the drive)
- **S logo** replaces the 📈 icon everywhere (`assets/logo-s.png`, favicon too).
- **Departments** are shown 3 per row on the sign-in screen.
- **Home** shows *Top Performers of September 2026* (gold / silver / bronze) with photo, score, level and message.
- **Evaluate** lists all members with formal pics; the form has the 20 questions (English + Filipino), the
  5 – Always (Palagi) … 1 – Never (Hindi Kailanman) scale, and a final comment box.
- **Performance and Rewards** (renamed) now has four tables with the intro sentences: criteria, rating scale,
  rewards and benefits, benefits description.
- **Progress Tracker**: Last Evaluation (table + radar chart + overall) and All-time Evaluation with
  Sept 25 2026, Jun 26 2026, Mar 27 2026, Dec 26 2025, Sept 26 2025.
- **Completion Tracker** shows Completed / Pending / Not Yet Started.

## Do the charts and data move when we evaluate?
Yes. Submitting an evaluation immediately updates: the evaluated person's **Progress Tracker** (new "last
evaluation" + a new all-time card), the **Leaderboard** and its pie chart, and the **Completion Tracker**
(Not Yet Started → Pending → Completed; it counts the current calendar month). The *Top Performers of
September 2026* on Home is a fixed announcement and does not change.

## What the Administrator can do
Everything, end to end:
- **Manage Employees** — add, edit, or delete any supervisor/employee in any department; reassign department, role, job title; reset passwords.
- **Criteria & Scoring** — add/edit/delete evaluation criteria, their weights (live check that they total 100%) and their questions (one per line, `English || Filipino`), edit the performance rating scale tiers, the rewards & benefits table, and the benefits description table.
- **Departments** — add, rename, or delete departments (icon + color), with a safety check so a department in use can't be deleted out from under its staff.
- **All Evaluations** — view and delete any evaluation submitted company-wide, filterable by department.

## How scoring works
Each criterion (editable by the admin) has a weight and several questions; every question is answered 1–5,
the criterion's rating is the average of its answers, and each criterion contributes `(rating/5) × weight` to a 0–100 final score, which maps to a
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
- `assets/` — logo and formal pictures
- `index.html` — shell: Tailwind (CDN, dark-mode enabled), Chart.js, SheetJS, jsPDF
- `app.js` — the whole app:
  - Staff sign-in (department → position → searchable name + password) and a separate Administrator sign-in
  - Home — welcome panel, Top Employees of the month, appraisal period summary
  - Performance and Rewards — criteria, rating scale, rewards & benefits, benefits description (read-only for staff, editable by the admin)
  - Evaluate — choose a colleague, rate every criterion, weighted final score + success confirmation
  - Progress Tracker — Last Evaluation (table + radar chart) and All-time Evaluation history
  - Leaderboard (supervisor) — ranked table + performance-level pie chart + Excel/PDF export
  - Completion Tracker (supervisor) — each supervisor's evaluation completion status
  - Help & Feedback — mood rating + comment, with history
  - Settings — profile picture upload, change password, light/dark mode toggle, logout
  - **Administrator** — Dashboard, Manage Employees, Criteria & Scoring, Departments, All Evaluations (full CRUD on everything above)

> Data now lives under a new storage key (`stratavise_db_v2`), so browsers that used the old version start fresh with this roster.

## Resetting the demo data
In the browser console on the site:
```js
localStorage.clear(); location.reload();
```
