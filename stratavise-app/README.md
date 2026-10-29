# Stratavise — Performance Appraisal System

A fully working build of the Stratavise flow from your wireframes, now with a full
**Administrator** side on top of the Supervisor/Employee flow: department → position →
name/password sign-in for staff, or a dedicated Administrator login with complete
control over employees, criteria/scoring, departments, and every evaluation.

**Static site + one small Vercel API.** No build step. Data is saved in the browser *and*
synced to a cloud database (Upstash Redis on Vercel) so every device sees the same data —
see **Cloud sync (Vercel)** below. If the database isn't connected, the app still works in
"Local only" mode (data stays in that browser).

## Logging in

**Staff (Supervisor/Employee):** pick a department → pick Supervisor or Employee → type a
name (autocomplete suggests matches) → password. The roster accounts below were created with
a starter password; change it from **Settings**, or let the Administrator reset it in
**Manage Employees**. Sign-in screens no longer show any demo credentials.

**Administrator:** "🔐 Sign in as Administrator" at the bottom of the department screen.
Change the starter admin password right away in **Admin → Settings** (a warning shows until you do).

**New user?** "+ New Employee? Request an Account" → fill in the form, create a password, read
and accept the **Terms & Conditions**. The account is **not** created yet: the user must
coordinate with the company and pay first. The Administrator sees a **New Account Request**
notification, marks the payment as received, then **Approves** (the person is added to
Employees/Supervisors) or **Declines**. New users can check progress with
"Check my account request status". The terms and payment instructions are editable in
**Admin → Account Requests → Terms & payment instructions**.

## The roster (from your org chart + formal pictures)
| Name | Department | Job title | Role |
|---|---|---|---|
| Kayzelle D. Refamonte | Operations | Operations Manager | **Supervisor** |
| Sam Jean N. Satam | IT / MIS | Web Developer | **Supervisor** |
| Celine Q. Amolador | HR | HR Generalist | Employee |
| Hannah Cate B. Baliuag | Finance | Finance Officer | Employee |
| Joseph Benedict L. Gerero | IT / MIS | IT Support | Employee |
| Shaira B. Sauquillo | Sales | Sales Consultant | Employee |

Formal pictures live in `assets/avatars/`. Everyone in the team can evaluate everyone else, and themselves (the roster has about one person per
department). Only supervisors (and the Administrator) see the Completion Tracker and the Leaderboard; the tracker lists every member, employees included.

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
- **Completion Tracker** shows Completed / Pending / Not Yet Started for **every member** (supervisors and employees).
- **Self-evaluation**: your own profile is the first card on Evaluate (tagged "You · Self-evaluation"). Self-evaluations are tagged *Self* in Progress Tracker and in the admin evaluation list, and count toward the Completion Tracker (6 evaluations per person: 5 colleagues + yourself).

## Do the charts and data move when we evaluate?
Yes. Submitting an evaluation immediately updates: the evaluated person's **Progress Tracker** (new "last
evaluation" + a new all-time card), the **Leaderboard** and its pie chart, and the **Completion Tracker**
(Not Yet Started → Pending → Completed; it counts the current calendar month). The *Top Performers* on Home is an announcement the Administrator edits (Admin → Top Performers); it does not change on its own.

## What the Administrator can do
Everything, end to end:
- **Manage Employees** — add, edit, or delete any supervisor/employee in any department; reassign department, role, job title; reset passwords.
- **Criteria & Scoring** — add/edit/delete evaluation criteria, their weights (live check that they total 100%) and their questions (one per line, `English || Filipino`), edit the performance rating scale tiers, the rewards & benefits table, and the benefits description table.
- **Departments** — add, rename, or delete departments (icon + color), with a safety check so a department in use can't be deleted out from under its staff.
- **All Evaluations** — view and delete any evaluation submitted company-wide, filterable by department. Evaluation detail also shows the evaluator's additional comments.
- **Top Performers** — choose who is featured on the Home page (Top 1–3), their score and their message, and the period title. "Fill from highest latest scores" picks the current top 3 for you.
- **Completion Tracker** and **Leaderboard** — the same views supervisors see (Completed / Pending / Not Yet Started, ranking with Excel/PDF export).
- **Employee photos** — upload or remove a formal picture for anyone from Manage Employees (auto square-cropped and shrunk).

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

## Cloud sync (Vercel) — so data is the same on every device
`api/db.js` is a Vercel Serverless Function that keeps the whole database as one JSON
document in **Upstash Redis**. The browser saves locally first, then syncs automatically
(on every change, when the tab regains focus, and every 30 s). Edits from different people
are merged per record, so two people evaluating at the same time don't overwrite each other.
The header shows ☁️ Synced / ⟳ Syncing / ⚠️ Offline / 💾 Local only.

**One-time setup**
1. Deploy this folder to Vercel (steps below).
2. Vercel dashboard → your project → **Storage** → **Create Database / Marketplace** → **Upstash Redis** (free plan is fine) → connect it to the project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically (`UPSTASH_REDIS_REST_*` also work).
3. **Redeploy** the project so the function can see the new variables.
4. Open `https://<your-site>/api/db` — it should show `{"configured":true,...}`.
5. Open the site **first on the device that has the data you want to keep** (the laptop). Its data is uploaded to the cloud; every other device then downloads it.

Good to know
- No database connected (or opened via `file://`) = Local only; nothing breaks.
- Each open tab checks for changes about every 30 s, which fits the Upstash free tier for a small team.
- Profile photos are stored inside the database (resized to 256 px). Fine for a small company; keep photos small if you have 100+ users.
- **Admin → Settings → Download backup (JSON)** saves a full copy of the data.
- To fully reset: delete the keys `stratavise:db` and `stratavise:version` in the Upstash console **and** run `localStorage.clear()` on every device (a device that still has data will otherwise re-upload it).
- Security note: passwords are now stored as salted hashes (never plain text), but `/api/db` itself is not login-protected, so don't put sensitive data in it. For real production use, the next step is server-side login (sessions) so the API only answers signed-in users.

## Notifications (🔔 bell, top right)
- **Employees & Supervisors:** "Time to evaluate! You have a week to evaluate from (November 02 to 08, 2026)" · "A new update on the website was made." · admin announcements.
- **Admin:** "Time to notify employees about their evaluation." (appears a week before the evaluation week — first Monday–Sunday of the month) · "Someone from the … Department has sent feedback. [Click to check]" · "New Account Request … [Review]".
- Admin sends the evaluation notice / general announcements in **Admin → Announcements**. The "website update" notice is automatic: change `APP_VERSION` (and `APP_UPDATE_MESSAGE`) in `sync.js` whenever you publish an update.

## What's included
- `assets/` — logo and formal pictures
- `index.html` — shell: Tailwind (CDN, dark-mode enabled), Chart.js, SheetJS, jsPDF
- `sync.js` — password hashing, notification helpers, cloud-sync engine
- `extras.js` — notification bell, Admin Feedback / Account Requests / Announcements / Settings, account-request flow
- `api/db.js` — Vercel function (Upstash Redis)
- `app.js` — the main app:
  - Staff sign-in (department → position → searchable name + password) and a separate Administrator sign-in
  - Home — welcome panel, Top Employees of the month, appraisal period summary
  - Performance and Rewards — criteria, rating scale, rewards & benefits, benefits description (read-only for staff, editable by the admin)
  - Evaluate — choose a colleague, rate every criterion, weighted final score + success confirmation
  - Progress Tracker — Last Evaluation (table + radar chart) and All-time Evaluation history
  - Leaderboard (supervisor) — ranked table + performance-level pie chart + Excel/PDF export
  - Completion Tracker (supervisor) — each member's evaluation completion status
  - Help & Feedback — mood rating + comment, with history
  - Settings — profile picture upload, change password, light/dark mode toggle, logout
  - **Administrator** — Dashboard, Manage Employees, Criteria & Scoring, Departments, All Evaluations, Top Performers, Completion Tracker, Leaderboard, **Account Requests, Feedback, Announcements, Settings**

## Resetting this browser's data
In the browser console on the site (see the sync note above if the cloud is connected):
```js
localStorage.clear(); location.reload();
```
