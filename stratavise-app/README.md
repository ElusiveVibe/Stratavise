# Stratavise — Performance Appraisal System

A fully working build of the Stratavise flow from your wireframes: department → position →
name/password sign-in, home dashboard with top employees, incentives/criteria reference,
a full evaluation flow with weighted scoring, a progress tracker with a radar chart,
and a supervisor view with a leaderboard + completion tracker.

**Zero-backend build** — static site (no npm install, no build step), all data lives in
the browser's `localStorage`. Deploys to Vercel instantly with no config. Data won't sync
across devices — if you want shared, persistent data across your whole team, say the word
and I'll wire this up to a real database (Postgres via Vercel/Neon/Supabase); the UI won't
need to change much.

## How scoring works
Each of the 7 official criteria has a weight (Quality of Work 25%, Productivity &
Efficiency 20%, Teamwork & Collaboration 15%, Client/Internal Service 15%, Initiative &
Problem Solving 10%, Professional Behaviour & Ethics 10%, Attendance & Reliability 5%).
A supervisor rates each 1–5; each criterion contributes `(rating/5) × weight` to a 0–100
final score, which maps to a performance level (Exceptional → Unsatisfactory) per the
official rating scale, and in turn to the rewards & benefits table — exactly as in your
reference pages.

## Demo accounts
Every seeded account's password is **`demo123`**. Pick a department + position at login,
then type a name below (autocomplete will suggest matches):

| Department | Supervisors | Employees |
|---|---|---|
| **HR** | Sam Reyes, Shai Bautista, Celine Cruz | Kaizel Ramos, Kayzel Rivera, Kayzelle Ramirez, Kazel Robles |
| **Marketing** | Mark Dela Cruz | Angela Santos, Paulo Mendoza, Nina Torres |
| **Finance** | Rafael Gomez | Liza Fernandez, Miguel Torres, Diana Reyes |

Log in as a **Supervisor** to see Leaderboard + Completion Tracker, and to evaluate
employees in your department (Evaluate → pick someone → rate all 7 criteria → submit).
Then log in as one of their **Employees** to see the resulting score on the Home page,
Progress Tracker (with the radar chart), and Incentives Description.

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
  - 3-step sign-in: department → position (Supervisor/Employee) → searchable name + password
  - Home — welcome panel, Top Employees of the month, appraisal period summary
  - Incentives Description — criteria weights, rating scale, rewards & benefits (read-only reference)
  - Evaluate — choose a colleague, rate all 7 criteria, see a weighted final score + success confirmation
  - Progress Tracker — Last Evaluation (table + radar chart) and All-time Evaluation history
  - Leaderboard (supervisor) — ranked table + performance-level pie chart + Excel/PDF export
  - Completion Tracker (supervisor) — each supervisor's evaluation completion status (Completed/Pending/Not Yet Started)
  - Help & Feedback — mood rating + comment, with history
  - Settings — profile picture upload, change password, light/dark mode toggle, logout

## Resetting the demo data
In the browser console on the site:
```js
localStorage.clear(); location.reload();
```
